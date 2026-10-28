const emailService = require('./emailService');
const pushService = require('./pushService');

let poolInstance = null;
let schemaReady = Promise.resolve();

/**
 * SQL expression resolving the company an employee (profiles alias `p`, branches alias `b`) belongs to.
 * Branch ownership wins (HQ staff -> main company, RAYRENT staff -> RayRent), then the user's
 * active company role, then a RAYRENT name fallback, then the main company.
 */
const SUBJECT_COMPANY_SQL = `(
  CASE WHEN b.code IS NOT NULL THEN COALESCE(b.company_id, 1)
       ELSE COALESCE(
         (SELECT cur.company_id FROM company_user_roles cur WHERE cur.user_id = p.user_id AND cur.status = 'active' ORDER BY cur.company_id DESC LIMIT 1),
         CASE WHEN UPPER(COALESCE(p.branch, '')) = 'RAYRENT' THEN 2 ELSE 1 END
       )
  END
)::int`;

/**
 * Adds notifications.company_id (if missing) and backfills existing team notifications so that
 * switching workspace only shows notifications about staff of the selected company.
 * Personal notifications keep company_id = NULL and are visible in every workspace.
 */
async function ensureNotificationCompanySchema() {
  await poolInstance.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS company_id INT`);
  await poolInstance.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user_company ON notifications (user_id, company_id)`);

  // 1. Leave-linked team notifications -> company of the leave applicant
  await poolInstance.query(
    `UPDATE notifications n
        SET company_id = sub.company_id
       FROM (
         SELECT lr.leave_id, lr.user_id AS applicant_id, ${SUBJECT_COMPANY_SQL} AS company_id
           FROM leave_requests lr
           JOIN profiles p ON p.user_id = lr.user_id
           LEFT JOIN branches b ON UPPER(b.code) = UPPER(p.branch)
       ) sub
      WHERE n.company_id IS NULL
        AND n.related_leave_id = sub.leave_id
        AND n.user_id <> sub.applicant_id`
  );

  // 2. Remaining team notifications -> match the employee name mentioned in title/message
  await poolInstance.query(
    `UPDATE notifications n
        SET company_id = (
          SELECT ${SUBJECT_COMPANY_SQL}
            FROM profiles p
            LEFT JOIN branches b ON UPPER(b.code) = UPPER(p.branch)
           WHERE LENGTH(COALESCE(p.full_name, '')) >= 6
             AND p.user_id <> n.user_id
             AND (UPPER(n.message) LIKE '%' || UPPER(p.full_name) || '%' OR UPPER(n.title) LIKE '%' || UPPER(p.full_name) || '%')
           ORDER BY LENGTH(p.full_name) DESC
           LIMIT 1
        )
      WHERE n.company_id IS NULL
        AND (n.scope = 'team' OR n.scope IS NULL)`
  );
}

function initNotificationService(pool) {
  poolInstance = pool;
  pushService.initPushService(pool);
  schemaReady = ensureNotificationCompanySchema().catch((err) => {
    console.error('Notification company schema migration failed:', err.message);
  });
}

/**
 * Resolve the company a team notification is about.
 * Order: explicit companyId -> subject employee -> related leave applicant -> employee name in text.
 */
async function resolveNotificationCompanyId({ companyId, subjectUserId, relatedLeaveId, recipientId, title, message }) {
  const explicit = parseInt(companyId, 10);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;

  try {
    if (subjectUserId) {
      const [rows] = await poolInstance.query(
        `SELECT ${SUBJECT_COMPANY_SQL} AS company_id FROM profiles p LEFT JOIN branches b ON UPPER(b.code) = UPPER(p.branch) WHERE p.user_id = ? LIMIT 1`,
        [subjectUserId]
      );
      if (rows && rows[0] && rows[0].company_id) return rows[0].company_id;
    }

    if (relatedLeaveId) {
      const [rows] = await poolInstance.query(
        `SELECT ${SUBJECT_COMPANY_SQL} AS company_id
           FROM leave_requests lr
           JOIN profiles p ON p.user_id = lr.user_id
           LEFT JOIN branches b ON UPPER(b.code) = UPPER(p.branch)
          WHERE lr.leave_id = ? LIMIT 1`,
        [relatedLeaveId]
      );
      if (rows && rows[0] && rows[0].company_id) return rows[0].company_id;
    }

    const text = `${title || ''} ${message || ''}`.toUpperCase();
    if (text.trim()) {
      const [rows] = await poolInstance.query(
        `SELECT ${SUBJECT_COMPANY_SQL} AS company_id
           FROM profiles p
           LEFT JOIN branches b ON UPPER(b.code) = UPPER(p.branch)
          WHERE LENGTH(COALESCE(p.full_name, '')) >= 6
            AND p.user_id <> ?
            AND ?::text LIKE '%' || UPPER(p.full_name) || '%'
          ORDER BY LENGTH(p.full_name) DESC
          LIMIT 1`,
        [recipientId || '', text]
      );
      if (rows && rows[0] && rows[0].company_id) return rows[0].company_id;
    }
  } catch (err) {
    console.error('resolveNotificationCompanyId error:', err.message);
  }
  return null;
}

function companyFilterClause(companyId) {
  const cid = parseInt(companyId, 10);
  if (!Number.isFinite(cid) || cid <= 0) return { sql: '', params: [] };
  return { sql: ` AND (company_id IS NULL OR company_id = ?)`, params: [cid] };
}

function sanitizeNotificationTitle(rawTitle) {
  if (!rawTitle || typeof rawTitle !== 'string') return '';

  // 1. Strip emojis and special symbols
  let cleaned = rawTitle
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .replace(/\*\*/g, '')
    .trim();

  // 2. If title is entirely in UPPERCASE (e.g. UPCOMING OUTSTATION ASSIGNMENT)
  // convert to Proper / Title Case (Upcoming Outstation Assignment)
  if (cleaned.length > 2 && cleaned === cleaned.toUpperCase() && /[A-Z]/.test(cleaned)) {
    cleaned = cleaned
      .toLowerCase()
      .split(' ')
      .map(word => {
        if (!word) return '';
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
  }

  return cleaned.trim();
}

/**
 * 1. createNotification
 * Inserts a single notification into notifications table and optionally sends email & push.
 */
async function createNotification({
  userId,
  title,
  message,
  type = 'system',
  relatedLeaveId = null,
  sendEmail = false,
  emailData = null,
  sendPush = true,
  pushData = null,
  scope = null,
  companyId = null,
  subjectUserId = null,
}) {
  if (!poolInstance) throw new Error('NotificationService not initialized with database pool.');
  if (!userId || !title || !message) {
    throw new Error('createNotification missing required fields: userId, title, message');
  }

  // Clean title: remove emojis / bells and ensure Proper Case
  title = sanitizeNotificationTitle(title);

  // If scope is explicitly provided, always respect it — do NOT override
  let finalScope = scope;
  if (!finalScope) {
    const isTeam = (
      type === 'leave_approval' || 
      (type === 'status_update' && title.includes(':')) || 
      title.startsWith('Leave Approved:') ||
      title.startsWith('Leave Rejected:') ||
      title.startsWith('New Leave Request') ||
      title.startsWith('Leave Request:') ||
      title.startsWith('Irregular Clock-In') || 
      title.startsWith('Leave Final Approval Required') ||
      title.startsWith('Leave Approval Required') ||
      title.startsWith('Leave Approval Progress:') ||
      title.toLowerCase().includes('anomaly') ||
      title.toLowerCase().includes('requires your approval') ||
      title.toLowerCase().includes('need your approval') ||
      message.includes("'s request for") ||
      message.includes("submitted a Leave Request") ||
      message.toLowerCase().includes("requires your approval") ||
      message.toLowerCase().includes("is currently waiting for")
    );
    finalScope = isTeam ? 'team' : 'personal';
  }

  // Team notifications are tagged with the company of the employee they are about, so each
  // workspace only shows its own staff. Personal notifications stay global (company_id NULL).
  await schemaReady;
  let finalCompanyId = null;
  if (finalScope === 'team') {
    finalCompanyId = await resolveNotificationCompanyId({
      companyId,
      subjectUserId,
      relatedLeaveId,
      recipientId: userId,
      title,
      message,
    });
  }

  const [result] = await poolInstance.query(
    `INSERT INTO notifications (user_id, title, message, type, is_read, related_leave_id, scope, company_id, created_at)
     VALUES (?, ?, ?, ?, FALSE, ?, ?, ?, NOW())`,
    [userId, title, message, type, relatedLeaveId || null, finalScope, finalCompanyId]
  );

  const insertedId = result?.insertId || (Array.isArray(result) && result[0]?.id) || (result?.rows && result.rows[0]?.id) || null;

  // Asynchronously dispatch Email if requested
  if (sendEmail && emailData) {
    (async () => {
      try {
        if (emailData.type === 'leave_request') {
          await emailService.sendLeaveRequestEmail(emailData);
        } else if (emailData.type === 'leave_approved') {
          await emailService.sendLeaveApprovedEmail(emailData);
        } else if (emailData.type === 'leave_rejected') {
          await emailService.sendLeaveRejectedEmail(emailData);
        } else if (emailData.to && emailData.subject && emailData.html) {
          await emailService.sendEmail(emailData);
        }
      } catch (err) {
        console.error(`Error sending email for notification ${insertedId}:`, err.message);
      }
    })();
  }

  // Asynchronously dispatch Browser Push via FCM
  if (sendPush) {
    (async () => {
      try {
        await pushService.sendPushNotification(userId, {
          title,
          body: message.replace(/[*_#]/g, ''), // Strip markdown for plain notification body
          data: pushData || { type, scope: finalScope, relatedLeaveId: relatedLeaveId ? String(relatedLeaveId) : '' },
        });
      } catch (err) {
        console.error(`Error sending push for notification ${insertedId}:`, err.message);
      }
    })();
  }

  return {
    id: insertedId,
    user_id: userId,
    title,
    message,
    type,
    scope: finalScope,
    is_read: false,
    related_leave_id: relatedLeaveId,
    created_at: new Date().toISOString(),
  };
}

/**
 * 2. createBulkNotification
 * Inserts multiple notifications (e.g. for company announcements, holiday alerts).
 */
async function createBulkNotification(notificationsList = []) {
  if (!poolInstance) throw new Error('NotificationService not initialized with database pool.');
  if (!Array.isArray(notificationsList) || notificationsList.length === 0) return [];

  const created = [];
  for (const notif of notificationsList) {
    try {
      const res = await createNotification(notif);
      created.push(res);
    } catch (e) {
      console.error(`Bulk notification failed for user ${notif.userId}:`, e.message);
    }
  }
  return created;
}

/**
 * 3. markAsRead
 */
async function markAsRead(notificationId, userId) {
  if (!poolInstance) throw new Error('NotificationService not initialized with database pool.');
  let query = `UPDATE notifications SET is_read = TRUE WHERE id = ?`;
  const params = [notificationId];

  if (userId) {
    query += ` AND user_id = ?`;
    params.push(userId);
  }

  await poolInstance.query(query, params);
  return { success: true };
}

const TEAM_SCOPE_CLAUSE = `(
  scope = 'team' OR (
  scope IS NULL AND (
    type = 'leave_approval' 
    OR title LIKE 'Leave Approved:%' 
    OR title LIKE 'Leave Rejected:%' 
    OR title LIKE 'New Leave Request%' 
    OR title LIKE 'Leave Request:%' 
    OR title LIKE '%Need Your Approval%' 
    OR title LIKE 'Irregular Clock-In%'
    OR title LIKE 'Leave Final Approval Required%'
    OR title LIKE 'Leave Approval Required%'
    OR title LIKE 'Leave Approval Progress:%'
    OR message LIKE '%''s request for%' 
    OR message LIKE '% request for % is now %'
    OR message LIKE '%submitted a Leave Request%'
    OR message LIKE '%is currently waiting for%'
  ))
)`;

const MY_SCOPE_CLAUSE = `(
  scope = 'personal' OR (
  scope IS NULL AND (
    type != 'leave_approval'
    AND title NOT LIKE 'Leave Approved:%'
    AND title NOT LIKE 'Leave Rejected:%'
    AND title NOT LIKE 'New Leave Request%'
    AND title NOT LIKE 'Leave Request:%'
    AND title NOT LIKE '%Need Your Approval%'
    AND title NOT LIKE 'Irregular Clock-In%'
    AND title NOT LIKE 'Leave Final Approval Required%'
    AND title NOT LIKE 'Leave Approval Required%'
    AND title NOT LIKE 'Leave Approval Progress:%'
    AND message NOT LIKE '%''s request for%'
    AND message NOT LIKE '% request for % is now %'
    AND message NOT LIKE '%submitted a Leave Request%'
    AND message NOT LIKE '%is currently waiting for%'
  ))
)`;

/**
 * 4. markAllAsRead
 */
async function markAllAsRead(userId, scope = null) {
  if (!poolInstance) throw new Error('NotificationService not initialized with database pool.');
  if (!userId) throw new Error('userId is required for markAllAsRead');

  let query = `UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE`;
  const params = [userId];

  if (scope === 'my' || scope === 'personal') {
    query += ` AND ${MY_SCOPE_CLAUSE}`;
  } else if (scope === 'team') {
    query += ` AND ${TEAM_SCOPE_CLAUSE}`;
  }

  await poolInstance.query(query, params);
  return { success: true };
}

/**
 * 5. getUnreadCount (optionally filtered by active company context)
 */
async function getUnreadCount(userId, companyId = null) {
  if (!poolInstance) throw new Error('NotificationService not initialized with database pool.');
  if (!userId) return { count: 0, total: 0, my: 0, team: 0 };

  await schemaReady;
  const cid = parseInt(companyId, 10);
  const hasCompany = Number.isFinite(cid) && cid > 0;

  let query = `
    SELECT 
       COUNT(*)::int as total,
       COUNT(*) FILTER (WHERE ${MY_SCOPE_CLAUSE})::int as my,
       COUNT(*) FILTER (WHERE ${TEAM_SCOPE_CLAUSE}${hasCompany ? ' AND (company_id IS NULL OR company_id = ?)' : ''})::int as team
     FROM notifications 
     WHERE user_id = ? AND is_read = FALSE
  `;
  const params = [];
  if (hasCompany) params.push(cid);
  params.push(userId);

  if (hasCompany) {
    query += ` AND (${MY_SCOPE_CLAUSE} OR (company_id IS NULL OR company_id = ?))`;
    params.push(cid);
  }

  const [rows] = await poolInstance.query(query, params);
  const my = rows[0]?.my || 0;
  const team = rows[0]?.team || 0;
  const total = my + team;
  return { count: total, total, my, team };
}

/**
 * 6. getNotifications (Paginated with filtering, scoping, and active company scoping)
 */
async function getNotifications(userId, { limit = 50, offset = 0, type = null, unreadOnly = false, scope = null, month = null, companyId = null } = {}) {
  if (!poolInstance) throw new Error('NotificationService not initialized with database pool.');
  if (!userId) return [];

  await schemaReady;
  const cid = parseInt(companyId, 10);
  const hasCompany = Number.isFinite(cid) && cid > 0;

  let query = `SELECT * FROM notifications WHERE user_id = ?`;
  const params = [userId];

  if (scope === 'my' || scope === 'personal') {
    query += ` AND ${MY_SCOPE_CLAUSE}`;
  } else if (scope === 'team') {
    query += ` AND ${TEAM_SCOPE_CLAUSE}`;
    if (hasCompany) {
      query += ` AND (company_id IS NULL OR company_id = ?)`;
      params.push(cid);
    }
  } else if (hasCompany) {
    query += ` AND (${MY_SCOPE_CLAUSE} OR (company_id IS NULL OR company_id = ?))`;
    params.push(cid);
  }

  if (unreadOnly) {
    query += ` AND is_read = FALSE`;
  }

  if (type && type !== 'all') {
    if (type === 'leave') {
      query += ` AND type IN ('leave', 'approval', 'leave_approval', 'status_update')`;
    } else if (type === 'assignment') {
      query += ` AND type IN ('assignment', 'outstation')`;
    } else {
      query += ` AND type = ?`;
      params.push(type);
    }
  }

  if (month && month !== 'all' && !month.endsWith('-all')) {
    // month is format YYYY-MM
    // PostgreSQL uses TO_CHAR for formatting dates
    query += ` AND TO_CHAR(created_at, 'YYYY-MM') = ?`;
    params.push(month);
  }

  query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const [rows] = await poolInstance.query(query, params);
  if (Array.isArray(rows)) {
    return rows.map(r => ({
      ...r,
      title: sanitizeNotificationTitle(r.title),
    }));
  }
  return rows || [];
}

/**
 * 7. deleteNotification
 */
async function deleteNotification(notificationId, userId) {
  if (!poolInstance) throw new Error('NotificationService not initialized with database pool.');
  let query = `DELETE FROM notifications WHERE id = ?`;
  const params = [notificationId];

  if (userId) {
    query += ` AND user_id = ?`;
    params.push(userId);
  }

  await poolInstance.query(query, params);
  return { success: true };
}

module.exports = {
  initNotificationService,
  createNotification,
  createBulkNotification,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  getNotifications,
  deleteNotification,
};

