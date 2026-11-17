const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PROOF_UPLOAD_DIR = path.resolve(__dirname, '..', 'uploads', 'attendance_proofs');

let expiryJobRunning = false;
let cleanupJobRunning = false;

function ensureProofUploadDir() {
  if (!fs.existsSync(PROOF_UPLOAD_DIR)) {
    fs.mkdirSync(PROOF_UPLOAD_DIR, { recursive: true });
  }
}

async function ensureAttendanceVerificationSchema(pgPool) {
  if (!pgPool) return;
  ensureProofUploadDir();

  // 1. Extend attendance_settings for subsidiary-only photo verification & retention policies
  await pgPool.query(`
    ALTER TABLE attendance_settings
      ADD COLUMN IF NOT EXISTS verification_rule VARCHAR(32) DEFAULT 'geofence',
      ADD COLUMN IF NOT EXISTS approval_expiry_mode VARCHAR(32) DEFAULT 'days',
      ADD COLUMN IF NOT EXISTS approval_expiry_days INTEGER DEFAULT 3,
      ADD COLUMN IF NOT EXISTS photo_retention_days INTEGER DEFAULT 30;
  `);

  // Force main company to geofence-only if any row exists
  await pgPool.query(`
    UPDATE attendance_settings s
       SET verification_rule = 'geofence'
      FROM companies c
     WHERE s.company_id = c.id
       AND LOWER(COALESCE(c.company_type, 'main')) <> 'subsidiary'
       AND COALESCE(s.verification_rule, 'geofence') <> 'geofence';
  `).catch(() => {});

  // 2. Extend attendances for photo verification, expiry, override, and soft-delete retention
  await pgPool.query(`
    ALTER TABLE attendances
      ADD COLUMN IF NOT EXISTS company_id INTEGER,
      ADD COLUMN IF NOT EXISTS verification_status VARCHAR(40) DEFAULT 'Approved',
      ADD COLUMN IF NOT EXISTS clock_in_verification_status VARCHAR(40) DEFAULT 'Approved',
      ADD COLUMN IF NOT EXISTS clock_out_verification_status VARCHAR(40),
      ADD COLUMN IF NOT EXISTS clock_in_photo_url TEXT,
      ADD COLUMN IF NOT EXISTS clock_out_photo_url TEXT,
      ADD COLUMN IF NOT EXISTS clock_in_device_info TEXT,
      ADD COLUMN IF NOT EXISTS clock_out_device_info TEXT,
      ADD COLUMN IF NOT EXISTS clock_in_photo_deleted BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS clock_out_photo_deleted BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS approval_expires_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS photo_retention_until TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(100),
      ADD COLUMN IF NOT EXISTS reviewed_by_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS review_remarks TEXT,
      ADD COLUMN IF NOT EXISTS expired_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS expired_by VARCHAR(100),
      ADD COLUMN IF NOT EXISTS expiry_reason TEXT,
      ADD COLUMN IF NOT EXISTS original_status_before_override VARCHAR(60),
      ADD COLUMN IF NOT EXISTS override_by VARCHAR(100),
      ADD COLUMN IF NOT EXISTS override_by_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS override_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS override_reason TEXT;
  `);

  await pgPool.query(`
    CREATE INDEX IF NOT EXISTS idx_attendances_verif_expiry
      ON attendances (verification_status, approval_expires_at)
      WHERE verification_status = 'Pending Verification';
  `);
  await pgPool.query(`
    CREATE INDEX IF NOT EXISTS idx_attendances_photo_retention
      ON attendances (photo_retention_until)
      WHERE (clock_in_photo_deleted = FALSE OR clock_out_photo_deleted = FALSE);
  `);

  // 3. Audit Log table
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS attendance_audit_logs (
      id SERIAL PRIMARY KEY,
      attendance_id INTEGER NOT NULL,
      employee_id VARCHAR(100) NOT NULL,
      company_id INTEGER,
      action VARCHAR(80) NOT NULL,
      actor_id VARCHAR(100) NOT NULL,
      actor_name VARCHAR(255),
      remarks TEXT,
      metadata JSONB,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await pgPool.query(`
    CREATE INDEX IF NOT EXISTS idx_attendance_audit_att_id
      ON attendance_audit_logs (attendance_id, created_at ASC);
  `);
}

function computeHaversineMeters(lat1, lon1, lat2, lon2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371e3;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Resolves the employee's company and effective verification policy.
 * Main Company ALWAYS returns verification_rule = 'geofence' and isSubsidiary = false.
 */
async function getEffectiveCompanyPolicy(pgPool, userId, fallbackCompanyId = null) {
  const res = await pgPool.query(
    `
    SELECT
      p.user_id,
      p.full_name,
      p.branch,
      COALESCE(cur.company_id, b.company_id, $2::int, 1)::int AS company_id,
      COALESCE(c.company_type, 'main') AS company_type,
      COALESCE(c.company_name, 'Rayhar Travels') AS company_name,
      c.logo_url,
      s.verification_rule,
      s.approval_expiry_mode,
      s.approval_expiry_days,
      s.photo_retention_days,
      s.gps_required,
      s.geofence_enforcement
    FROM profiles p
    LEFT JOIN branches b ON UPPER(b.code) = UPPER(p.branch)
    LEFT JOIN LATERAL (
      SELECT cur1.company_id
        FROM company_user_roles cur1
       WHERE cur1.user_id = p.user_id AND cur1.status = 'active'
       ORDER BY cur1.is_default DESC, cur1.company_id DESC
       LIMIT 1
    ) cur ON TRUE
    LEFT JOIN companies c ON c.id = COALESCE(cur.company_id, b.company_id, $2::int, 1)
    LEFT JOIN attendance_settings s ON s.company_id = c.id
    WHERE p.user_id = $1
    LIMIT 1
    `,
    [userId, fallbackCompanyId ? Number(fallbackCompanyId) : null]
  );

  const row = res.rows?.[0];
  if (!row) {
    return {
      company_id: Number(fallbackCompanyId) || 1,
      company_type: 'main',
      company_name: 'Rayhar Travels',
      logo_url: null,
      isSubsidiary: false,
      verification_rule: 'geofence',
      approval_expiry_mode: 'days',
      approval_expiry_days: 3,
      photo_retention_days: 30,
    };
  }

  const isSubsidiary = String(row.company_type || '').toLowerCase() === 'subsidiary';
  // Enforce strict Main Company isolation: Main Company NEVER uses photo verification
  const rawRule = String(row.verification_rule || 'geofence');
  const allowedRules = ['geofence', 'geofence_photo', 'live_photo'];
  const verification_rule = isSubsidiary && allowedRules.includes(rawRule) ? rawRule : 'geofence';

  return {
    user_id: row.user_id,
    full_name: row.full_name,
    branch: row.branch,
    company_id: Number(row.company_id) || 1,
    company_type: isSubsidiary ? 'subsidiary' : 'main',
    company_name: row.company_name,
    logo_url: row.logo_url || null,
    isSubsidiary,
    verification_rule,
    approval_expiry_mode: row.approval_expiry_mode === 'after_working_hours' ? 'after_working_hours' : 'days',
    approval_expiry_days: Math.max(1, Math.min(30, Number(row.approval_expiry_days) || 3)),
    photo_retention_days: Math.max(1, Math.min(365, Number(row.photo_retention_days) || 30)),
  };
}

async function verifyBranchGeofence(pgPool, branchCode, latitude, longitude) {
  if (!branchCode || latitude == null || longitude == null) {
    return { ok: false, reason: 'Branch coordinates or GPS location missing.' };
  }
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { ok: false, reason: 'Invalid GPS coordinates provided.' };
  }

  const bRes = await pgPool.query(
    `SELECT code, name, latitude, longitude, COALESCE(radius, 50) AS radius
       FROM branches
      WHERE UPPER(code) = UPPER($1) OR UPPER(name) = UPPER($1)
      LIMIT 1`,
    [String(branchCode).trim()]
  );
  const b = bRes.rows?.[0];
  if (!b || b.latitude == null || b.longitude == null) {
    return { ok: false, reason: 'Your branch location coordinates are not configured in the system. Please contact HR.' };
  }
  const bLat = Number(b.latitude);
  const bLng = Number(b.longitude);
  const radius = Number(b.radius) || 50;
  if (!Number.isFinite(bLat) || !Number.isFinite(bLng)) {
    return { ok: false, reason: 'Your branch location coordinates are invalid. Please contact HR.' };
  }

  const dist = computeHaversineMeters(lat, lng, bLat, bLng);
  if (dist > radius) {
    return {
      ok: false,
      outside: true,
      distance: dist,
      reason: 'You are outside your assigned branch radius. Please move inside the branch area and try again.',
    };
  }
  return { ok: true, distance: dist, branch: b };
}

function saveProofPhotoFromDataUrl(dataUrl, userId, punchType = 'in') {
  ensureProofUploadDir();
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
    throw new Error('Live camera photo is required.');
  }
  const match = dataUrl.match(/^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/i);
  if (!match) {
    throw new Error('Invalid photo format. Only JPEG, PNG, or WebP live captures are accepted.');
  }
  const ext = match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase();
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length === 0 || buffer.length > 2 * 1024 * 1024) {
    throw new Error('Captured photo size is invalid or exceeds 2 MB.');
  }

  const safeUser = String(userId || 'staff').replace(/[^a-zA-Z0-9_-]/g, '');
  const stamp = Date.now();
  const rand = crypto.randomBytes(4).toString('hex');
  const filename = `${safeUser}_${punchType}_${stamp}_${rand}.${ext}`;
  const fullPath = path.join(PROOF_UPLOAD_DIR, filename);
  if (!fullPath.startsWith(PROOF_UPLOAD_DIR + path.sep)) {
    throw new Error('Invalid upload path.');
  }
  fs.writeFileSync(fullPath, buffer);
  return `/uploads/attendance_proofs/${filename}`;
}

async function computeApprovalExpiryTimestamp(pgPool, companyId, mode, days) {
  if (mode === 'after_working_hours') {
    // Determine today's MYT weekday & shift end time
    const nowKl = new Date(Date.now() + 8 * 60 * 60 * 1000);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayDayName = dayNames[nowKl.getUTCDay()];
    const dateStr = nowKl.toISOString().split('T')[0];

    let endTimeStr = '17:30:00';
    try {
      const schedRes = await pgPool.query(
        `SELECT MAX(wsd.end_time) AS end_time
           FROM work_schedules ws
           JOIN work_schedule_days wsd ON ws.id = wsd.schedule_id
          WHERE ws.company_id = $1
            AND ws.status = 'active'
            AND wsd.day_of_week = $2
            AND wsd.is_working_day = TRUE
            AND wsd.end_time IS NOT NULL`,
        [companyId, todayDayName]
      );
      if (schedRes.rows?.[0]?.end_time) {
        endTimeStr = String(schedRes.rows[0].end_time).slice(0, 8);
        if (endTimeStr.length === 5) endTimeStr += ':00';
      }
    } catch (_) {}

    const shiftEndUtc = new Date(`${dateStr}T${endTimeStr}+08:00`);
    // If submitted after shift end (e.g. late clock-out), give until 23:59:59 MYT of that day
    if (shiftEndUtc.getTime() <= Date.now()) {
      return new Date(`${dateStr}T23:59:59+08:00`);
    }
    return shiftEndUtc;
  }

  const safeDays = Math.max(1, Math.min(30, Number(days) || 3));
  return new Date(Date.now() + safeDays * 24 * 60 * 60 * 1000);
}

function computePhotoRetentionTimestamp(retentionDays) {
  const safeDays = Math.max(1, Math.min(365, Number(retentionDays) || 30));
  return new Date(Date.now() + safeDays * 24 * 60 * 60 * 1000);
}

async function insertAuditLog(clientOrPool, { attendanceId, employeeId, companyId = null, action, actorId, actorName = null, remarks = null, metadata = null }) {
  await clientOrPool.query(
    `INSERT INTO attendance_audit_logs (attendance_id, employee_id, company_id, action, actor_id, actor_name, remarks, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      attendanceId,
      String(employeeId),
      companyId ? Number(companyId) : null,
      action,
      String(actorId),
      actorName || String(actorId),
      remarks || null,
      metadata ? JSON.stringify(metadata) : null,
    ]
  );
}

/**
 * Evaluates final Attendance Status and Verification Status for a day's clock row(s)
 * according to the Clock-In x Clock-Out Verification Matrix.
 */
function resolveVerificationSummary(row, baseDailyStatus) {
  if (!row) {
    return { verificationStatus: 'Approved', attendanceStatus: baseDailyStatus };
  }
  const inV = row.clock_in_verification_status || row.verification_status || 'Approved';
  const outV = row.clock_out_verification_status || (row.clock_out ? (row.verification_status || 'Approved') : null);
  const overall = row.verification_status || 'Approved';

  if (overall === 'Overridden' || inV === 'Overridden' || outV === 'Overridden') {
    return { verificationStatus: 'Overridden', attendanceStatus: 'Present (Override)' };
  }
  if (overall === 'Expired' || inV === 'Expired' || outV === 'Expired') {
    return { verificationStatus: 'Expired', attendanceStatus: 'Absent (Expired)' };
  }
  if (overall === 'Rejected' || inV === 'Rejected' || outV === 'Rejected') {
    return { verificationStatus: 'Rejected', attendanceStatus: 'Absent (Rejected)' };
  }
  if (overall === 'Pending Verification' || inV === 'Pending Verification' || outV === 'Pending Verification') {
    return { verificationStatus: 'Pending Verification', attendanceStatus: 'Pending Verification' };
  }
  return { verificationStatus: 'Approved', attendanceStatus: baseDailyStatus };
}

/**
 * Job 1: Automatic Expiry of Pending Verification attendances.
 * Marks expired Pending records as Expired + Absent (Expired), keeps photos for retention window,
 * records audit log, and notifies employees.
 */
async function runAttendanceExpiryJob(pgPool, notificationService) {
  if (!pgPool || expiryJobRunning) return { processed: 0, skipped: true };
  expiryJobRunning = true;
  const client = await pgPool.connect();
  let expiredRows = [];
  try {
    await client.query('BEGIN');
    const res = await client.query(`
      WITH targets AS (
        SELECT attendance_id
          FROM attendances
         WHERE verification_status = 'Pending Verification'
           AND approval_expires_at IS NOT NULL
           AND approval_expires_at < NOW()
         FOR UPDATE SKIP LOCKED
      )
      UPDATE attendances a
         SET verification_status = 'Expired',
             clock_in_verification_status = CASE WHEN a.clock_in_verification_status = 'Pending Verification' THEN 'Expired' ELSE a.clock_in_verification_status END,
             clock_out_verification_status = CASE WHEN a.clock_out_verification_status = 'Pending Verification' THEN 'Expired' ELSE a.clock_out_verification_status END,
             expired_at = NOW(),
             expired_by = 'System',
             expiry_reason = 'HR did not verify within the configured approval window.'
        FROM targets t
       WHERE a.attendance_id = t.attendance_id
      RETURNING a.attendance_id, a.user_id, a.company_id, a.clock_in;
    `);
    expiredRows = res.rows || [];

    for (const row of expiredRows) {
      await insertAuditLog(client, {
        attendanceId: row.attendance_id,
        employeeId: row.user_id,
        companyId: row.company_id,
        action: 'Attendance Expired Automatically',
        actorId: 'System',
        actorName: 'System Scheduler',
        remarks: 'HR did not verify within the configured approval window. Status set to Absent (Expired).',
      });
    }

    await client.query('COMMIT');
    if (expiredRows.length > 0) {
      console.log(`⏰ [Attendance Expiry Job] Expired ${expiredRows.length} pending attendance record(s).`);
    }
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('❌ [Attendance Expiry Job] Failed:', err.message);
  } finally {
    client.release();
    expiryJobRunning = false;
  }

  // Send notifications outside DB transaction
  if (notificationService && expiredRows.length > 0) {
    for (const row of expiredRows) {
      notificationService
        .createNotification({
          userId: row.user_id,
          title: 'Attendance Expired Automatically',
          message: 'Your attendance submission expired without HR verification and is marked Absent (Expired). HR can manually override it if needed.',
          type: 'attendance',
          scope: 'personal',
          sendPush: true,
        })
        .catch((e) => console.error('Expiry notification error:', e.message));
    }
  }
  return { processed: expiredRows.length };
}

/**
 * Job 2: Photo Retention Soft-Delete Cleanup.
 * Deletes physical image files from disk after photo_retention_until passes,
 * marks photo_deleted = TRUE while preserving all metadata and audit logs.
 */
async function runPhotoRetentionCleanupJob(pgPool) {
  if (!pgPool || cleanupJobRunning) return { cleaned: 0, skipped: true };
  cleanupJobRunning = true;
  const client = await pgPool.connect();
  let cleanedCount = 0;
  try {
    await client.query('BEGIN');
    const res = await client.query(`
      WITH targets AS (
        SELECT attendance_id
          FROM attendances
         WHERE photo_retention_until IS NOT NULL
           AND photo_retention_until < NOW()
           AND (
             (clock_in_photo_url IS NOT NULL AND COALESCE(clock_in_photo_deleted, FALSE) = FALSE)
             OR (clock_out_photo_url IS NOT NULL AND COALESCE(clock_out_photo_deleted, FALSE) = FALSE)
           )
         FOR UPDATE SKIP LOCKED
      )
      UPDATE attendances a
         SET clock_in_photo_deleted = CASE WHEN a.clock_in_photo_url IS NOT NULL THEN TRUE ELSE a.clock_in_photo_deleted END,
             clock_out_photo_deleted = CASE WHEN a.clock_out_photo_url IS NOT NULL THEN TRUE ELSE a.clock_out_photo_deleted END
        FROM targets t
       WHERE a.attendance_id = t.attendance_id
      RETURNING a.attendance_id, a.user_id, a.company_id, a.clock_in_photo_url, a.clock_out_photo_url;
    `);
    const rows = res.rows || [];

    for (const row of rows) {
      for (const relUrl of [row.clock_in_photo_url, row.clock_out_photo_url]) {
        if (relUrl && String(relUrl).startsWith('/uploads/attendance_proofs/')) {
          const filename = path.basename(relUrl);
          const fullPath = path.join(PROOF_UPLOAD_DIR, filename);
          if (fullPath.startsWith(PROOF_UPLOAD_DIR + path.sep) && fs.existsSync(fullPath)) {
            await fs.promises.unlink(fullPath).catch(() => {});
          }
        }
      }

      await insertAuditLog(client, {
        attendanceId: row.attendance_id,
        employeeId: row.user_id,
        companyId: row.company_id,
        action: 'Attendance Photo Deleted',
        actorId: 'System',
        actorName: 'System Scheduler',
        remarks: 'Attendance photo soft-deleted after retention period; metadata and audit logs preserved.',
      });
      cleanedCount++;
    }

    await client.query('COMMIT');
    if (cleanedCount > 0) {
      console.log(`🧹 [Photo Retention Job] Soft-deleted photos for ${cleanedCount} attendance record(s).`);
    }
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('❌ [Photo Retention Job] Failed:', err.message);
  } finally {
    client.release();
    cleanupJobRunning = false;
  }
  return { cleaned: cleanedCount };
}

module.exports = {
  PROOF_UPLOAD_DIR,
  ensureAttendanceVerificationSchema,
  computeHaversineMeters,
  getEffectiveCompanyPolicy,
  verifyBranchGeofence,
  saveProofPhotoFromDataUrl,
  computeApprovalExpiryTimestamp,
  computePhotoRetentionTimestamp,
  insertAuditLog,
  resolveVerificationSummary,
  runAttendanceExpiryJob,
  runPhotoRetentionCleanupJob,
};
