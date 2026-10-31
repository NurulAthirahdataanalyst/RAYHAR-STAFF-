const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

function createMultiCompanyRouter(pgPool) {
  const router = express.Router();

  // Configure upload directory for company logos
  const logoUploadDir = path.join(__dirname, '..', 'uploads', 'company-logos');
  if (!fs.existsSync(logoUploadDir)) {
    fs.mkdirSync(logoUploadDir, { recursive: true });
  }

  // Ensure companies sequence is safely in sync with max(id)
  pgPool.query("SELECT setval('companies_id_seq', COALESCE((SELECT GREATEST(MAX(id), 1) FROM companies), 1), true)")
    .catch((err) => console.warn('Could not sync companies_id_seq:', err.message));

  // Ensure employee_company_history has start_date, end_date, and status columns
  pgPool.query(`
    ALTER TABLE employee_company_history ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Transferred';
    ALTER TABLE employee_company_history ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT CURRENT_DATE;
    ALTER TABLE employee_company_history ADD COLUMN IF NOT EXISTS end_date DATE;
  `).catch((err) => console.warn('Could not alter employee_company_history columns:', err.message));

  // Helper to normalize zone codes consistently ('Zone A' -> 'ZONE_A', 'Zone B' -> 'ZONE_B')
  function cleanString(val) {
    return typeof val === 'string' ? val.trim() : '';
  }

  function normalizeZoneCode(zone) {
    if (!zone || typeof zone !== 'string') return null;
    const trimmed = zone.trim();
    if (!trimmed || trimmed.toUpperCase() === 'ALL' || trimmed.toUpperCase() === 'NONE') return null;
    const upper = trimmed.toUpperCase().replace(/\s+/g, '_');
    if (upper === 'ZONE_A' || upper.startsWith('ZONE_A_')) return 'ZONE_A';
    if (upper === 'ZONE_B' || upper.startsWith('ZONE_B_')) return 'ZONE_B';
    return upper;
  }

  // Helper to parse branch_ids array from request body or DB row
  function parseBranchIds(branchIdsInput, branchIdFallback) {
    if (Array.isArray(branchIdsInput)) {
      return Array.from(
        new Set(
          branchIdsInput
            .map((c) => String(c || '').trim().toUpperCase())
            .filter((c) => c && c !== 'ALL')
        )
      ).sort();
    }
    if (typeof branchIdFallback === 'string' && branchIdFallback.trim() && branchIdFallback.trim().toUpperCase() !== 'ALL') {
      return Array.from(
        new Set(
          branchIdFallback
            .split(',')
            .map((c) => c.trim().toUpperCase())
            .filter((c) => c && c !== 'ALL')
        )
      ).sort();
    }
    return [];
  }

  // Sync a single branch's operating_zone into company work_schedules.branch_ids
  async function syncBranchToWorkSchedules(companyId, branchCode, operatingZone) {
    try {
      const cId = parseInt(companyId, 10) || 1;
      const cleanCode = String(branchCode || '').trim().toUpperCase();
      const normZone = normalizeZoneCode(operatingZone) || String(operatingZone || '').trim();
      if (!cleanCode) return;

      const schedRes = await pgPool.query('SELECT id, operating_zone, branch_ids, branch_id FROM work_schedules WHERE company_id = $1 ORDER BY id ASC', [cId]);
      for (const ws of schedRes.rows) {
        const wsZone = normalizeZoneCode(ws.operating_zone);
        const isMatch = (wsZone && normZone && wsZone === normZone) || (!wsZone && (normZone === 'STANDARD' || schedRes.rows.length === 1));
        let currentCodes = parseBranchIds(ws.branch_ids, ws.branch_id);
        if (isMatch) {
          if (!currentCodes.includes(cleanCode)) {
            currentCodes.push(cleanCode);
            currentCodes.sort();
            await pgPool.query(
              'UPDATE work_schedules SET branch_ids = $1::jsonb, branch_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
              [JSON.stringify(currentCodes), currentCodes.join(','), ws.id]
            );
          }
        } else {
          if (currentCodes.includes(cleanCode)) {
            currentCodes = currentCodes.filter((c) => c !== cleanCode);
            await pgPool.query(
              'UPDATE work_schedules SET branch_ids = $1::jsonb, branch_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
              [JSON.stringify(currentCodes), currentCodes.length > 0 ? currentCodes.join(',') : null, ws.id]
            );
          }
        }
      }
    } catch (e) {
      console.warn('Could not sync branch to work_schedules:', e.message);
    }
  }

  // Sync work_schedule's branch_ids to branches.operating_zone and remove from conflicting zone schedules
  async function syncScheduleBranchesToZone(companyId, scheduleId, operatingZone, branchIdsArray) {
    try {
      const cId = parseInt(companyId, 10) || 1;
      const sId = parseInt(scheduleId, 10);
      const normZone = normalizeZoneCode(operatingZone);
      if (!Array.isArray(branchIdsArray) || branchIdsArray.length === 0) return;

      if (normZone) {
        await pgPool.query(
          `UPDATE branches
           SET operating_zone = $1
           WHERE UPPER(code) = ANY($2::text[])
             AND (company_id = $3 OR ($3 = 1 AND company_id IS NULL))`,
          [normZone, branchIdsArray, cId]
        );
      }

      // Remove these branches from other zone schedules of the same company
      const otherScheds = await pgPool.query(
        'SELECT id, branch_ids, branch_id FROM work_schedules WHERE company_id = $1 AND id != $2',
        [cId, sId]
      );
      for (const other of otherScheds.rows) {
        const otherCodes = parseBranchIds(other.branch_ids, other.branch_id);
        const filtered = otherCodes.filter((c) => !branchIdsArray.includes(c));
        if (filtered.length !== otherCodes.length) {
          await pgPool.query(
            'UPDATE work_schedules SET branch_ids = $1::jsonb, branch_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
            [JSON.stringify(filtered), filtered.length > 0 ? filtered.join(',') : null, other.id]
          );
        }
      }
    } catch (e) {
      console.warn('Could not sync schedule branches to zone:', e.message);
    }
  }

  // Ensure work_schedules supports operating_zone, multiple branch_ids, and Zone A / Zone B for Main Company
  (async () => {
    try {
      await pgPool.query(`
        ALTER TABLE work_schedules DROP CONSTRAINT IF EXISTS work_schedules_branch_id_fkey;
        ALTER TABLE work_schedules ALTER COLUMN branch_id TYPE TEXT;
        ALTER TABLE work_schedules ADD COLUMN IF NOT EXISTS operating_zone VARCHAR(100);
        ALTER TABLE work_schedules ADD COLUMN IF NOT EXISTS branch_ids JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE work_schedules ADD COLUMN IF NOT EXISTS special_rules JSONB DEFAULT '[]'::jsonb;
      `);

      // Standardize branches.operating_zone values
      await pgPool.query(`
        UPDATE branches SET operating_zone = 'ZONE_A' WHERE UPPER(REPLACE(TRIM(COALESCE(operating_zone, '')), ' ', '_')) = 'ZONE_A';
        UPDATE branches SET operating_zone = 'ZONE_B' WHERE UPPER(REPLACE(TRIM(COALESCE(operating_zone, '')), ' ', '_')) = 'ZONE_B' OR operating_zone IS NULL OR TRIM(operating_zone) = '';
      `);

      // Get Zone A and Zone B branches for Main Company (id = 1)
      const bRes = await pgPool.query(`
        SELECT UPPER(code) AS code, operating_zone
        FROM branches
        WHERE company_id = 1 OR company_id IS NULL
        ORDER BY code ASC
      `);
      const zoneACodes = bRes.rows.filter((r) => r.operating_zone === 'ZONE_A').map((r) => r.code);
      const zoneBCodes = bRes.rows.filter((r) => r.operating_zone === 'ZONE_B').map((r) => r.code);

      // Check existing schedules for Main Company (id = 1)
      const mainScheds = await pgPool.query('SELECT * FROM work_schedules WHERE company_id = 1 ORDER BY id ASC');
      const hasZoneA = mainScheds.rows.some((r) => normalizeZoneCode(r.operating_zone) === 'ZONE_A');
      const hasZoneB = mainScheds.rows.some((r) => normalizeZoneCode(r.operating_zone) === 'ZONE_B');

      if (!hasZoneA) {
        let zoneASchedId = null;
        const genericSched = mainScheds.rows.find((r) => !r.operating_zone);
        if (genericSched) {
          zoneASchedId = genericSched.id;
          await pgPool.query(
            `UPDATE work_schedules
             SET schedule_name = 'Standard Office Hours (Zone A)',
                 operating_zone = 'ZONE_A',
                 branch_ids = $1::jsonb,
                 branch_id = $2,
                 special_rules = $3::jsonb,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $4`,
            [JSON.stringify(zoneACodes), zoneACodes.join(','), JSON.stringify(['first_thursday_full', 'first_saturday_closed']), zoneASchedId]
          );
        } else {
          const insA = await pgPool.query(
            `INSERT INTO work_schedules (company_id, schedule_name, operating_zone, branch_ids, branch_id, special_rules, effective_date, status)
             VALUES (1, 'Standard Office Hours (Zone A)', 'ZONE_A', $1::jsonb, $2, $3::jsonb, CURRENT_DATE, 'active')
             RETURNING id`,
            [JSON.stringify(zoneACodes), zoneACodes.join(','), JSON.stringify(['first_thursday_full', 'first_saturday_closed'])]
          );
          zoneASchedId = insA.rows[0].id;
        }

        // Seed Zone A 7-day timetable (Sat-Wed 08:30-17:30, Thu 08:30-13:00, Fri Off)
        await pgPool.query('DELETE FROM work_schedule_days WHERE schedule_id = $1', [zoneASchedId]);
        await pgPool.query(
          `INSERT INTO work_schedule_days (schedule_id, day_of_week, start_time, end_time, is_working_day) VALUES
            ($1, 'Monday', '08:30:00', '17:30:00', TRUE),
            ($1, 'Tuesday', '08:30:00', '17:30:00', TRUE),
            ($1, 'Wednesday', '08:30:00', '17:30:00', TRUE),
            ($1, 'Thursday', '08:30:00', '13:00:00', TRUE),
            ($1, 'Friday', NULL, NULL, FALSE),
            ($1, 'Saturday', '08:30:00', '17:30:00', TRUE),
            ($1, 'Sunday', '08:30:00', '17:30:00', TRUE)`,
          [zoneASchedId]
        );
        await pgPool.query('DELETE FROM break_schedules WHERE schedule_id = $1', [zoneASchedId]);
        await pgPool.query(
          `INSERT INTO break_schedules (schedule_id, break_name, break_type, start_time, end_time)
           VALUES ($1, 'Lunch Break', 'lunch', '13:00:00', '14:00:00')`,
          [zoneASchedId]
        );
      }

      if (!hasZoneB) {
        const insB = await pgPool.query(
          `INSERT INTO work_schedules (company_id, schedule_name, operating_zone, branch_ids, branch_id, special_rules, effective_date, status)
           VALUES (1, 'Standard Office Hours (Zone B)', 'ZONE_B', $1::jsonb, $2, $3::jsonb, CURRENT_DATE, 'active')
           RETURNING id`,
          [JSON.stringify(zoneBCodes), zoneBCodes.join(','), JSON.stringify(['first_saturday_closed'])]
        );
        const zoneBSchedId = insB.rows[0].id;

        // Seed Zone B 7-day timetable (Mon-Fri 08:30-17:30, Sat 08:30-13:00, Sun Off)
        await pgPool.query(
          `INSERT INTO work_schedule_days (schedule_id, day_of_week, start_time, end_time, is_working_day) VALUES
            ($1, 'Monday', '08:30:00', '17:30:00', TRUE),
            ($1, 'Tuesday', '08:30:00', '17:30:00', TRUE),
            ($1, 'Wednesday', '08:30:00', '17:30:00', TRUE),
            ($1, 'Thursday', '08:30:00', '17:30:00', TRUE),
            ($1, 'Friday', '08:30:00', '17:30:00', TRUE),
            ($1, 'Saturday', '08:30:00', '13:00:00', TRUE),
            ($1, 'Sunday', NULL, NULL, FALSE)`,
          [zoneBSchedId]
        );
        await pgPool.query(
          `INSERT INTO break_schedules (schedule_id, break_name, break_type, start_time, end_time)
           VALUES ($1, 'Lunch Break', 'lunch', '13:00:00', '14:00:00')`,
          [zoneBSchedId]
        );
      }

      // Ensure subsidiary companies also have baseline schedule
      const compRes = await pgPool.query('SELECT id FROM companies WHERE id != 1');
      for (const comp of compRes.rows) {
        const cSched = await pgPool.query('SELECT id FROM work_schedules WHERE company_id = $1', [comp.id]);
        if (cSched.rows.length === 0) {
          const ins = await pgPool.query(
            `INSERT INTO work_schedules (company_id, schedule_name, operating_zone, effective_date, status)
             VALUES ($1, 'Standard Office Hours', 'ZONE_B', CURRENT_DATE, 'active')
             RETURNING id`,
            [comp.id]
          );
          const sId = ins.rows[0].id;
          await pgPool.query(
            `INSERT INTO work_schedule_days (schedule_id, day_of_week, start_time, end_time, is_working_day) VALUES
              ($1, 'Monday', '08:30:00', '17:30:00', TRUE),
              ($1, 'Tuesday', '08:30:00', '17:30:00', TRUE),
              ($1, 'Wednesday', '08:30:00', '17:30:00', TRUE),
              ($1, 'Thursday', '08:30:00', '17:30:00', TRUE),
              ($1, 'Friday', '08:30:00', '17:30:00', TRUE),
              ($1, 'Saturday', NULL, NULL, FALSE),
              ($1, 'Sunday', NULL, NULL, FALSE)`,
            [sId]
          );
          await pgPool.query(
            `INSERT INTO break_schedules (schedule_id, break_name, break_type, start_time, end_time)
             VALUES ($1, 'Lunch Break', 'lunch', '12:30:00', '14:00:00')`,
            [sId]
          );
        }
      }
    } catch (err) {
      console.warn('Could not auto-seed work schedules with zones:', err.message);
    }
  })();

  // Initialize modules, company_modules, and role_permissions access_level
  pgPool.query(`
    CREATE TABLE IF NOT EXISTS modules (
      id SERIAL PRIMARY KEY,
      module_key VARCHAR(50) UNIQUE NOT NULL,
      module_name VARCHAR(100) NOT NULL,
      description TEXT,
      icon_name VARCHAR(50),
      sort_order INT DEFAULT 0,
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS company_modules (
      id SERIAL PRIMARY KEY,
      company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      module_key VARCHAR(50) NOT NULL REFERENCES modules(module_key) ON DELETE CASCADE,
      is_enabled BOOLEAN DEFAULT TRUE,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_by VARCHAR(100),
      CONSTRAINT uq_company_module UNIQUE (company_id, module_key)
    );

    ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS access_level VARCHAR(20) DEFAULT 'edit';
    ALTER TABLE company_modules ADD COLUMN IF NOT EXISTS enabled_permissions JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE company_modules ADD COLUMN IF NOT EXISTS permission_levels JSONB DEFAULT '{}'::jsonb;
  `).then(async () => {
    // Seed 12 modules
    const modules = [
      { key: 'dashboard', name: 'Dashboard', desc: 'Main executive overview and real-time operations', icon: 'LayoutDashboard', order: 1 },
      { key: 'calendar', name: 'Calendar', desc: 'Work calendar and company holidays schedule', icon: 'Calendar', order: 2 },
      { key: 'attendance', name: 'Attendance', desc: 'Personal clock-in, timesheets, and team attendance', icon: 'Clock', order: 3 },
      { key: 'leave_management', name: 'Leave Management', desc: 'Employee leave application and personal requests', icon: 'CalendarDays', order: 4 },
      { key: 'leave_admin', name: 'Leave Administration', desc: 'Leave approvals, company entitlement policies, and balances', icon: 'ClipboardList', order: 5 },
      { key: 'organization_entities', name: 'Organization & Entities', desc: 'Corporate entities, company modules, roles & RBAC, staff transfer, branches, and departments', icon: 'Building2', order: 6 },
      { key: 'employee_management', name: 'Employee Management', desc: 'Staff directory, departments, roles, and branch assignment', icon: 'Users', order: 7 },
      { key: 'outstation', name: 'Outstation', desc: 'Outstation requests, assignments, itinerary, and travel dashboard', icon: 'Plane', order: 8 },
      { key: 'analytics', name: 'Analytics', desc: 'Attendance, leave, and workforce insight analytics', icon: 'PieChart', order: 9 },
      { key: 'reports', name: 'Reports', desc: 'Exportable attendance, leave, and outstation formal reports', icon: 'FileSearch', order: 10 },
      { key: 'gps', name: 'GPS', desc: 'Live location tracker and staff route history', icon: 'MapPinned', order: 11 },
      { key: 'settings', name: 'Settings', desc: 'Corporate branding, branches, shifts, and IAM configurations', icon: 'Settings', order: 12 },
    ];

    // Seed Organization & Entities and Employee Analytics permissions in permissions table
    const orgPerms = [
      { key: 'analytics.employee', name: 'Analytics - Performance Insights (Own Data)', module: 'Analytics' },
      { key: 'organization.entities', name: 'Corporate Entities', module: 'Organization & Entities' },
      { key: 'organization.modules', name: 'Company Modules', module: 'Organization & Entities' },
      { key: 'organization.roles', name: 'Company Roles & RBAC', module: 'Organization & Entities' },
      { key: 'organization.transfer', name: 'Employee Transfer Wizard', module: 'Organization & Entities' },
      { key: 'organization.history', name: 'Transfer Career History', module: 'Organization & Entities' },
      { key: 'organization.branches', name: 'Branches & Geofence', module: 'Organization & Entities' },
      { key: 'organization.departments', name: 'Departments', module: 'Organization & Entities' },
    ];

    for (const p of orgPerms) {
      await pgPool.query(`
        INSERT INTO permissions (permission_key, display_name, module)
        VALUES ($1, $2, $3)
        ON CONFLICT (permission_key) DO UPDATE SET
          display_name = EXCLUDED.display_name,
          module = EXCLUDED.module;
      `, [p.key, p.name, p.module]).catch(() => {});
    }

    for (const m of modules) {
      await pgPool.query(`
        INSERT INTO modules (module_key, module_name, description, icon_name, sort_order, status)
        VALUES ($1, $2, $3, $4, $5, 'active')
        ON CONFLICT (module_key) DO UPDATE SET
          module_name = EXCLUDED.module_name,
          description = EXCLUDED.description,
          icon_name = EXCLUDED.icon_name,
          sort_order = EXCLUDED.sort_order;
      `, [m.key, m.name, m.desc, m.icon, m.order]);
    }

    // Auto-seed company_modules for any companies missing them
    await pgPool.query(`
      INSERT INTO company_modules (company_id, module_key, is_enabled)
      SELECT c.id, m.module_key, TRUE
      FROM companies c
      CROSS JOIN modules m
      ON CONFLICT (company_id, module_key) DO NOTHING;
    `);
  }).catch((err) => console.warn('Could not auto-seed modules or company_modules:', err.message));

  const logoStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, logoUploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const uniqueName = `company_${req.params.id || 'logo'}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;
      cb(null, uniqueName);
    }
  });

  const uploadLogo = multer({
    storage: logoStorage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter: (req, file, cb) => {
      const allowed = ['.png', '.jpg', '.jpeg', '.svg', '.webp'];
      const ext = path.extname(file.originalname).toLowerCase();
      if (allowed.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid image format. Allowed: PNG, JPG, JPEG, SVG, WebP'));
      }
    }
  });

  // Helper for audit logging
  async function logAudit(req, category, description, oldVals = null, newVals = null, companyId = null) {
    try {
      const rawOpName = req.headers['x-operator-name'] ? decodeURIComponent(req.headers['x-operator-name']) : null;
      const rawOpRole = req.headers['x-operator-role'] ? decodeURIComponent(req.headers['x-operator-role']) : null;
      const operatorId = req.user?.user_id || req.user?.id || req.headers['x-operator-id'] || req.body?.operatorId || 'system';
      const operatorName = req.user?.full_name || req.user?.name || rawOpName || req.body?.operatorName || 'HR Admin';
      const operatorRole = req.user?.role || rawOpRole || req.body?.operatorRole || 'hr_admin';
      const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
      const ua = req.headers['user-agent'] || '';

      await pgPool.query(`
        INSERT INTO audit_logs (operator_id, operator_name, operator_role, company_id, action_category, action_description, old_values, new_values, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);
      `, [operatorId, operatorName, operatorRole, companyId, category, description, oldVals ? JSON.stringify(oldVals) : null, newVals ? JSON.stringify(newVals) : null, ip, ua]);
    } catch (e) {
      console.warn('Audit log write error:', e.message);
    }
  }

  // ==========================================
  // 1. COMPANIES MANAGEMENT
  // ==========================================

  // GET all companies
  router.get('/companies', async (req, res) => {
    try {
      const result = await pgPool.query(`
        SELECT 
          c.*,
          p.company_name AS parent_company_name,
          (SELECT COUNT(*)::int FROM company_user_roles cur WHERE cur.company_id = c.id AND cur.status = 'active') AS active_employees_count,
          (SELECT COUNT(*)::int FROM branches b WHERE b.company_id = c.id) AS branches_count
        FROM companies c
        LEFT JOIN companies p ON c.parent_company_id = p.id
        ORDER BY c.id ASC;
      `);
      res.json({ success: true, companies: result.rows });
    } catch (err) {
      console.error('Error fetching companies:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET single company
  router.get('/companies/:id', async (req, res) => {
    try {
      const result = await pgPool.query(`
        SELECT c.*, p.company_name AS parent_company_name
        FROM companies c
        LEFT JOIN companies p ON c.parent_company_id = p.id
        WHERE c.id = $1;
      `, [req.params.id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Company not found' });
      }
      res.json({ success: true, company: result.rows[0] });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST create new company
  router.post('/companies', async (req, res) => {
    const client = await pgPool.connect();
    try {
      const {
        company_name,
        company_type = 'subsidiary',
        parent_company_id = null,
        company_address = '',
        email = '',
        status = 'active'
      } = req.body;

      const safeCompanyName = cleanString(company_name);
      if (!safeCompanyName) {
        client.release();
        return res.status(400).json({ success: false, error: 'Company name is required' });
      }

      await client.query('BEGIN');

      const insertResult = await client.query(`
        INSERT INTO companies (company_name, company_type, parent_company_id, company_address, email, status)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
      `, [safeCompanyName, cleanString(company_type) || 'subsidiary', parent_company_id || null, cleanString(company_address), cleanString(email), cleanString(status) || 'active']);

      const newCompany = insertResult.rows[0];

      // Automatically initialize baseline attendance and leave settings for this company
      await client.query(`
        INSERT INTO attendance_settings (company_id, late_threshold_minutes, early_checkout_minutes, min_working_hours, gps_required, geofence_enforcement)
        VALUES ($1, 10, 0, 8.00, TRUE, 'strict')
        ON CONFLICT (company_id) DO NOTHING;
      `, [newCompany.id]);

      await client.query(`
        INSERT INTO leave_settings (company_id, leave_type, default_entitlement_days, escalate_to_parent, mc_required)
        VALUES 
          ($1, 'Annual Leave', 14, TRUE, FALSE),
          ($1, 'Sick Leave', 14, TRUE, TRUE),
          ($1, 'Emergency Leave', 5, TRUE, FALSE)
        ON CONFLICT (company_id, leave_type) DO NOTHING;
      `, [newCompany.id]);

      // Automatically initialize baseline work schedule (Standard Office Hours 08:30 - 17:30)
      const schedInsert = await client.query(`
        INSERT INTO work_schedules (company_id, schedule_name, effective_date, status)
        VALUES ($1, 'Standard Office Hours', CURRENT_DATE, 'active')
        RETURNING id;
      `, [newCompany.id]);

      const newSchedId = schedInsert.rows[0]?.id;
      if (newSchedId) {
        await client.query(`
          INSERT INTO work_schedule_days (schedule_id, day_of_week, start_time, end_time, is_working_day) VALUES
            ($1, 'Monday', '08:30:00', '17:30:00', TRUE),
            ($1, 'Tuesday', '08:30:00', '17:30:00', TRUE),
            ($1, 'Wednesday', '08:30:00', '17:30:00', TRUE),
            ($1, 'Thursday', '08:30:00', '17:30:00', TRUE),
            ($1, 'Friday', '08:30:00', '17:30:00', TRUE),
            ($1, 'Saturday', NULL, NULL, FALSE),
            ($1, 'Sunday', NULL, NULL, FALSE)
        `, [newSchedId]);

        await client.query(`
          INSERT INTO break_schedules (schedule_id, break_name, break_type, start_time, end_time) VALUES
            ($1, 'Lunch Break', 'lunch', '12:30:00', '14:00:00')
        `, [newSchedId]);
      }

      // Automatically initialize company modules for the new company
      await client.query(`
        INSERT INTO company_modules (company_id, module_key, is_enabled)
        SELECT $1, module_key, TRUE
        FROM modules
        ON CONFLICT (company_id, module_key) DO NOTHING;
      `, [newCompany.id]);

      await client.query('COMMIT');

      await logAudit(req, 'COMPANY_CREATE', `Created company ${newCompany.company_name} (ID: ${newCompany.id})`, null, newCompany, newCompany.id);

      res.status(201).json({ success: true, company: newCompany });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('Error creating company:', err);
      if (err.code === '23505') {
        return res.status(400).json({ success: false, error: 'A company with this name already exists' });
      }
      res.status(500).json({ success: false, error: err.message });
    } finally {
      client.release();
    }
  });

  // PUT update company
  router.put('/companies/:id', async (req, res) => {
    try {
      const companyId = req.params.id;
      const {
        company_name,
        company_type,
        parent_company_id,
        company_address,
        email,
        status,
        logo_url
      } = req.body;

      const oldCompany = await pgPool.query('SELECT * FROM companies WHERE id = $1', [companyId]);
      if (oldCompany.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Company not found' });
      }

      const updateResult = await pgPool.query(`
        UPDATE companies
        SET 
          company_name = COALESCE($1, company_name),
          company_type = COALESCE($2, company_type),
          parent_company_id = $3,
          company_address = COALESCE($4, company_address),
          email = COALESCE($5, email),
          status = COALESCE($6, status),
          logo_url = COALESCE($7, logo_url),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $8
        RETURNING *;
      `, [
        typeof company_name === 'string' && company_name.trim() ? company_name.trim() : null,
        company_type,
        parent_company_id !== undefined ? parent_company_id : oldCompany.rows[0].parent_company_id,
        company_address,
        email,
        status,
        logo_url,
        companyId
      ]);

      const updated = updateResult.rows[0];

      // Cascade status changes to related company roles, branches, departments, and user roles
      if (status) {
        const cleanStatus = String(status).trim().toLowerCase();
        if (cleanStatus === 'inactive') {
          await pgPool.query(`UPDATE roles SET status = 'Inactive', updated_at = CURRENT_TIMESTAMP WHERE company_id = $1`, [companyId]).catch(e => console.warn('Could not deactivate company roles:', e.message));
          await pgPool.query(`UPDATE branches SET status = 'inactive' WHERE company_id = $1`, [companyId]).catch(e => console.warn('Could not deactivate company branches:', e.message));
          await pgPool.query(`UPDATE departments SET status = 'inactive' WHERE company_id = $1`, [companyId]).catch(e => console.warn('Could not deactivate company departments:', e.message));
          await pgPool.query(`UPDATE company_user_roles SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE company_id = $1`, [companyId]).catch(e => console.warn('Could not deactivate company user roles:', e.message));
          await pgPool.query(`UPDATE branch_geofence_settings SET is_active = false WHERE branch_code IN (SELECT code FROM branches WHERE company_id = $1)`, [companyId]).catch(e => console.warn('Could not deactivate company geofences:', e.message));
          await pgPool.query(`
            UPDATE profiles 
            SET status = 'Inactive', updated_at = CURRENT_TIMESTAMP 
            WHERE user_id IN (
              SELECT cur.user_id FROM company_user_roles cur WHERE cur.company_id = $1
            ) AND user_id NOT IN (
              SELECT cur2.user_id FROM company_user_roles cur2 WHERE cur2.company_id != $1 AND cur2.status = 'active'
            )
          `, [companyId]).catch(e => console.warn('Could not deactivate user profiles:', e.message));
        } else if (cleanStatus === 'active') {
          await pgPool.query(`UPDATE roles SET status = 'Active', updated_at = CURRENT_TIMESTAMP WHERE company_id = $1`, [companyId]).catch(e => console.warn('Could not activate company roles:', e.message));
          await pgPool.query(`UPDATE branches SET status = 'active' WHERE company_id = $1`, [companyId]).catch(e => console.warn('Could not activate company branches:', e.message));
          await pgPool.query(`UPDATE departments SET status = 'active' WHERE company_id = $1`, [companyId]).catch(e => console.warn('Could not activate company departments:', e.message));
          await pgPool.query(`UPDATE company_user_roles SET status = 'active', updated_at = CURRENT_TIMESTAMP WHERE company_id = $1`, [companyId]).catch(e => console.warn('Could not activate company user roles:', e.message));
          await pgPool.query(`UPDATE branch_geofence_settings SET is_active = true WHERE branch_code IN (SELECT code FROM branches WHERE company_id = $1)`, [companyId]).catch(e => console.warn('Could not activate company geofences:', e.message));
          await pgPool.query(`
            UPDATE profiles 
            SET status = 'Active', updated_at = CURRENT_TIMESTAMP 
            WHERE user_id IN (
              SELECT cur.user_id FROM company_user_roles cur WHERE cur.company_id = $1
            )
          `, [companyId]).catch(e => console.warn('Could not activate user profiles:', e.message));
        }
      }

      await logAudit(req, 'COMPANY_UPDATE', `Updated company details for ${updated.company_name}`, oldCompany.rows[0], updated, companyId);

      res.json({ success: true, company: updated });
    } catch (err) {
      console.error('Error updating company:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // DELETE permanently delete company (and all associated data)
  router.delete('/companies/:id', async (req, res) => {
    try {
      const companyId = parseInt(req.params.id, 10);
      if (isNaN(companyId)) {
        return res.status(400).json({ success: false, error: 'Invalid company ID' });
      }

      // Root parent holding company (id = 1) cannot be deleted
      if (companyId === 1) {
        return res.status(400).json({ success: false, error: 'The primary root holding company cannot be deleted.' });
      }

      const compCheck = await pgPool.query('SELECT * FROM companies WHERE id = $1', [companyId]);
      if (compCheck.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Company not found' });
      }
      const targetCompany = compCheck.rows[0];

      // 1. Delete geofence settings for branches of this company
      await pgPool.query(`
        DELETE FROM branch_geofence_settings 
        WHERE company_id = $1 OR branch_code IN (SELECT code FROM branches WHERE company_id = $1)
      `, [companyId]).catch(e => console.warn('Delete branch_geofence_settings warning:', e.message));

      // 2. Delete work schedules & approval workflows for this company
      await pgPool.query(`DELETE FROM work_schedules WHERE company_id = $1`, [companyId]).catch(e => console.warn('Delete work_schedules warning:', e.message));
      await pgPool.query(`DELETE FROM approval_workflow WHERE company_id = $1`, [companyId]).catch(e => console.warn('Delete approval_workflow warning:', e.message));
      await pgPool.query(`DELETE FROM company_modules WHERE company_id = $1`, [companyId]).catch(e => console.warn('Delete company_modules warning:', e.message));
      await pgPool.query(`DELETE FROM attendance_settings WHERE company_id = $1`, [companyId]).catch(e => console.warn('Delete attendance_settings warning:', e.message));
      await pgPool.query(`DELETE FROM leave_settings WHERE company_id = $1`, [companyId]).catch(e => console.warn('Delete leave_settings warning:', e.message));

      // 3. For users whose only assignment is this company, clean up their records
      const userList = await pgPool.query(`
        SELECT DISTINCT user_id FROM company_user_roles WHERE company_id = $1
      `, [companyId]);

      for (const u of userList.rows) {
        const uid = u.user_id;
        const otherCompRes = await pgPool.query(`
          SELECT COUNT(*)::int AS count FROM company_user_roles WHERE user_id = $1 AND company_id != $2
        `, [uid, companyId]);

        if (otherCompRes.rows[0].count === 0) {
          // User only belongs to this subcompany - permanently remove
          await pgPool.query(`DELETE FROM attendance WHERE user_id = $1`, [uid]).catch(() => {});
          await pgPool.query(`DELETE FROM leave_requests WHERE user_id = $1`, [uid]).catch(() => {});
          await pgPool.query(`DELETE FROM leave_balance_adjustments WHERE employee_id = $1`, [uid]).catch(() => {});
          await pgPool.query(`DELETE FROM user_role WHERE user_id = $1`, [uid]).catch(() => {});
          await pgPool.query(`DELETE FROM profiles WHERE user_id = $1`, [uid]).catch(() => {});
          await pgPool.query(`DELETE FROM users WHERE id = $1 OR user_id = $1`, [uid]).catch(() => {});
        }
      }

      // 4. Delete company user role records
      await pgPool.query(`DELETE FROM company_user_roles WHERE company_id = $1`, [companyId]).catch(e => console.warn('Delete company_user_roles warning:', e.message));

      // 5. Delete roles belonging to this company
      await pgPool.query(`DELETE FROM roles WHERE company_id = $1`, [companyId]).catch(e => console.warn('Delete roles warning:', e.message));

      // 6. Delete departments belonging to this company
      await pgPool.query(`DELETE FROM departments WHERE company_id = $1`, [companyId]).catch(e => console.warn('Delete departments warning:', e.message));

      // 7. Delete branches belonging to this company
      await pgPool.query(`DELETE FROM branches WHERE company_id = $1`, [companyId]).catch(e => console.warn('Delete branches warning:', e.message));

      // 8. Delete audit logs associated with this company
      await pgPool.query(`DELETE FROM audit_logs WHERE company_id = $1`, [companyId]).catch(e => console.warn('Delete audit_logs warning:', e.message));

      // 9. Finally delete the company itself
      await pgPool.query(`DELETE FROM companies WHERE id = $1`, [companyId]);

      await logAudit(req, 'COMPANY_DELETE', `Permanently deleted company ${targetCompany.company_name} (ID: ${companyId}) and associated data`, targetCompany, null, 1);

      res.json({ success: true, message: `Company ${targetCompany.company_name} permanently deleted.` });
    } catch (err) {
      console.error('Error deleting company:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Helper to upload company logo to Supabase Storage
  async function uploadLogoToSupabase(filePath, filename, mimeType) {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://xvpebtompjcjfvuzeumo.supabase.co';
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) return null;

    try {
      const fileContent = fs.readFileSync(filePath);
      const encodedFilename = filename.split('/').map(segment => encodeURIComponent(segment)).join('/');
      const https = require('https');
      const urlObj = new URL(`${supabaseUrl}/storage/v1/object/mc-attachments/${encodedFilename}`);
      
      return new Promise((resolve) => {
        const options = {
          hostname: urlObj.hostname,
          port: 443,
          path: urlObj.pathname,
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': mimeType || 'image/png',
            'Content-Length': fileContent.length,
            'x-upsert': 'true',
          }
        };

        const req = https.request(options, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            if (res.statusCode === 200 || res.statusCode === 201) {
              resolve(`${supabaseUrl}/storage/v1/object/public/mc-attachments/${encodedFilename}`);
            } else {
              console.error('Supabase logo upload error status:', res.statusCode, body);
              resolve(null);
            }
          });
        });

        req.on('error', (err) => {
          console.error('Supabase logo upload request error:', err);
          resolve(null);
        });

        req.write(fileContent);
        req.end();
      });
    } catch (err) {
      console.error('Supabase logo upload exception:', err);
      return null;
    }
  }

  // POST upload logo for company
  router.post('/companies/:id/logo', uploadLogo.single('logo'), async (req, res) => {
    try {
      const companyId = req.params.id;
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No logo image file uploaded' });
      }

      // Upload to Supabase Storage for persistent CDN URL across Vercel & Render
      const storagePath = `company-logos/${req.file.filename}`;
      const supabasePublicUrl = await uploadLogoToSupabase(req.file.path, storagePath, req.file.mimetype);

      const targetLogoUrl = supabasePublicUrl || `/uploads/company-logos/${req.file.filename}`;

      const updateResult = await pgPool.query(`
        UPDATE companies
        SET logo_url = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *;
      `, [targetLogoUrl, companyId]);

      if (updateResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Company not found' });
      }

      await logAudit(req, 'COMPANY_LOGO', `Uploaded new logo for ${updateResult.rows[0].company_name}`, null, { logo_url: targetLogoUrl }, companyId);

      res.json({ success: true, logo_url: targetLogoUrl, company: updateResult.rows[0] });
    } catch (err) {
      console.error('Error uploading company logo:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // DELETE reset logo
  router.delete('/companies/:id/logo', async (req, res) => {
    try {
      const companyId = req.params.id;
      const defaultLogo = companyId === '1' ? '/assets/rayhar-logo.png' : null;

      const updateResult = await pgPool.query(`
        UPDATE companies
        SET logo_url = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *;
      `, [defaultLogo, companyId]);

      res.json({ success: true, company: updateResult.rows[0] });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // 2. BRANCHES & MULTI-MODE GEOFENCING
  // ==========================================

  // GET branches by company
  router.get('/companies/:companyId/branches', async (req, res) => {
    try {
      const companyId = req.params.companyId;
      const branchesRes = await pgPool.query(`
        SELECT b.*,
          COALESCE(
            json_agg(
              json_build_object(
                'id', bgs.id,
                'mode', bgs.mode,
                'radius_meter', bgs.radius_meter,
                'active_from', bgs.active_from,
                'active_until', bgs.active_until,
                'is_active', bgs.is_active
              )
            ) FILTER (WHERE bgs.id IS NOT NULL), '[]'::json
          ) AS geofence_settings
        FROM branches b
        LEFT JOIN branch_geofence_settings bgs ON b.code = bgs.branch_code
        WHERE b.company_id = $1
        GROUP BY b.code, b.name, b.branch, b.location, b.operating_zone, b.latitude, b.longitude, b.radius, b.company_id
        ORDER BY b.name ASC;
      `, [companyId]);

      res.json({ success: true, branches: branchesRes.rows });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST create branch for company
  router.post('/companies/:companyId/branches', async (req, res) => {
    try {
      const companyId = req.params.companyId;
      const {
        code,
        name,
        location = '',
        operating_zone = 'ZONE_B',
        latitude,
        longitude,
        radius = 50
      } = req.body;

      const safeCode = cleanString(code);
      const safeName = cleanString(name);
      if (!safeCode || !safeName || latitude === undefined || longitude === undefined) {
        return res.status(400).json({ success: false, error: 'Code, Name, Latitude, and Longitude are required' });
      }

      const branchCode = safeCode.toUpperCase();
      const normZone = normalizeZoneCode(operating_zone) || 'ZONE_B';

      const insBranch = await pgPool.query(`
        INSERT INTO branches (code, branch, name, location, operating_zone, latitude, longitude, radius, company_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (code) DO UPDATE SET
          name = EXCLUDED.name,
          location = EXCLUDED.location,
          operating_zone = EXCLUDED.operating_zone,
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          radius = EXCLUDED.radius,
          company_id = EXCLUDED.company_id
        RETURNING *;
      `, [branchCode, safeName, safeName, cleanString(location), normZone, latitude, longitude, radius, companyId]);

      // Ensure normal geofence record exists
      await pgPool.query(`
        INSERT INTO branch_geofence_settings (branch_code, company_id, mode, radius_meter)
        VALUES ($1, $2, 'normal', $3)
        ON CONFLICT (branch_code, mode) DO UPDATE SET radius_meter = EXCLUDED.radius_meter;
      `, [branchCode, companyId, radius]);

      await syncBranchToWorkSchedules(companyId, branchCode, normZone);

      await logAudit(req, 'BRANCH_CREATE', `Created branch ${name} (${branchCode}) for company ${companyId}`, null, insBranch.rows[0], companyId);

      res.status(201).json({ success: true, branch: insBranch.rows[0] });
    } catch (err) {
      console.error('Error creating branch:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // PUT update branch and its geofence settings
  router.put('/branches/:code', async (req, res) => {
    try {
      const code = req.params.code.toUpperCase();
      const { name, location, operating_zone, latitude, longitude, radius, company_id } = req.body;
      const normZone = operating_zone ? normalizeZoneCode(operating_zone) : null;

      const updateRes = await pgPool.query(`
        UPDATE branches
        SET 
          name = COALESCE($1, name),
          branch = COALESCE($1, branch),
          location = COALESCE($2, location),
          operating_zone = COALESCE($3, operating_zone),
          latitude = COALESCE($4, latitude),
          longitude = COALESCE($5, longitude),
          radius = COALESCE($6, radius),
          company_id = COALESCE($7, company_id)
        WHERE UPPER(code) = $8
        RETURNING *;
      `, [name, location, normZone, latitude, longitude, radius, company_id, code]);

      if (updateRes.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Branch not found' });
      }

      const updatedBranch = updateRes.rows[0];

      if (radius !== undefined) {
        await pgPool.query(`
          INSERT INTO branch_geofence_settings (branch_code, company_id, mode, radius_meter)
          VALUES ($1, $2, 'normal', $3)
          ON CONFLICT (branch_code, mode) DO UPDATE SET radius_meter = EXCLUDED.radius_meter;
        `, [code, updatedBranch.company_id || 1, radius]);
      }

      if (updatedBranch.operating_zone) {
        await syncBranchToWorkSchedules(updatedBranch.company_id || 1, code, updatedBranch.operating_zone);
      }

      res.json({ success: true, branch: updatedBranch });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // DELETE branch
  router.delete('/branches/:code', async (req, res) => {
    try {
      const code = req.params.code.toUpperCase();
      const bRes = await pgPool.query('SELECT name, company_id FROM branches WHERE UPPER(code) = $1', [code]);
      if (bRes.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Branch not found' });
      }
      const branchName = bRes.rows[0].name || code;
      const companyId = bRes.rows[0].company_id || 1;

      // 1. Delete geofence settings
      await pgPool.query('DELETE FROM branch_geofence_settings WHERE UPPER(branch_code) = $1', [code]).catch(e => console.warn(e.message));

      // 2. Delete branch
      await pgPool.query('DELETE FROM branches WHERE UPPER(code) = $1', [code]);

      // 3. Remove from work schedules
      const schedRes = await pgPool.query('SELECT id, branch_ids, branch_id FROM work_schedules WHERE company_id = $1', [companyId]);
      for (const ws of schedRes.rows) {
        let currentCodes = parseBranchIds(ws.branch_ids, ws.branch_id);
        if (currentCodes.includes(code)) {
          currentCodes = currentCodes.filter(c => c !== code);
          await pgPool.query(
            'UPDATE work_schedules SET branch_ids = $1::jsonb, branch_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
            [JSON.stringify(currentCodes), currentCodes.length > 0 ? currentCodes.join(',') : null, ws.id]
          );
        }
      }

      await logAudit(req, 'BRANCH_DELETE', `Deleted branch ${branchName} (${code})`, null, null, companyId);

      res.json({ success: true, message: `Branch ${code} deleted successfully` });
    } catch (err) {
      console.error('Error deleting branch:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST update / add specific geofence mode (normal, night_shift, emergency, temporary)
  router.post('/branches/:code/geofence', async (req, res) => {
    try {
      const code = req.params.code.toUpperCase();
      const { mode, radius_meter, active_from, active_until, is_active = true } = req.body;

      const branchRes = await pgPool.query('SELECT company_id FROM branches WHERE UPPER(code) = $1', [code]);
      if (branchRes.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Branch not found' });
      }

      const companyId = branchRes.rows[0].company_id || 1;

      const insResult = await pgPool.query(`
        INSERT INTO branch_geofence_settings (branch_code, company_id, mode, radius_meter, active_from, active_until, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (branch_code, mode) DO UPDATE SET
          radius_meter = EXCLUDED.radius_meter,
          active_from = EXCLUDED.active_from,
          active_until = EXCLUDED.active_until,
          is_active = EXCLUDED.is_active
        RETURNING *;
      `, [code, companyId, mode, radius_meter, active_from || null, active_until || null, is_active]);

      // If updating 'normal' mode, also sync branches.radius for backward compatibility
      if (mode === 'normal') {
        await pgPool.query('UPDATE branches SET radius = $1 WHERE UPPER(code) = $2', [radius_meter, code]);
      }

      res.json({ success: true, geofence: insResult.rows[0] });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // COMPANY MODULE MANAGEMENT
  // ==========================================

  // GET all system modules with features
  router.get('/modules', async (req, res) => {
    try {
      const modulesRes = await pgPool.query(`
        SELECT 
          m.*,
          COALESCE(
            json_agg(
              json_build_object(
                'id', p.id,
                'permission_key', p.permission_key,
                'display_name', p.display_name,
                'module', p.module
              ) ORDER BY CASE WHEN p.permission_key = 'analytics.employee' THEN 0 ELSE p.id END ASC
            ) FILTER (WHERE p.id IS NOT NULL), '[]'::json
          ) AS permissions,
          COUNT(p.id)::int AS features_count
        FROM modules m
        LEFT JOIN permissions p ON LOWER(TRIM(p.module)) = LOWER(TRIM(m.module_name))
        GROUP BY m.id
        ORDER BY m.sort_order ASC, m.id ASC;
      `);
      res.json({ success: true, modules: modulesRes.rows });
    } catch (err) {
      console.error('Error fetching modules:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET company module settings
  router.get('/companies/:companyId/modules', async (req, res) => {
    try {
      const companyId = parseInt(req.params.companyId, 10);
      if (isNaN(companyId)) {
        return res.status(400).json({ success: false, error: 'Invalid company ID' });
      }

      // Ensure modules are seeded for this company
      await pgPool.query(`
        INSERT INTO company_modules (company_id, module_key, is_enabled)
        SELECT $1, module_key, TRUE FROM modules
        ON CONFLICT (company_id, module_key) DO NOTHING;
      `, [companyId]);

      const result = await pgPool.query(`
        SELECT 
          m.id AS module_id,
          m.module_key,
          m.module_name,
          m.description,
          m.icon_name,
          m.sort_order,
          COALESCE(cm.is_enabled, TRUE) AS is_enabled,
          COALESCE(cm.enabled_permissions, '[]'::jsonb) AS enabled_permissions,
          COALESCE(cm.permission_levels, '{}'::jsonb) AS permission_levels,
          cm.updated_at,
          cm.updated_by,
          COALESCE(
            json_agg(
              json_build_object(
                'id', p.id,
                'permission_key', p.permission_key,
                'display_name', p.display_name,
                'module', p.module
              ) ORDER BY CASE WHEN p.permission_key = 'analytics.employee' THEN 0 ELSE p.id END ASC
            ) FILTER (WHERE p.id IS NOT NULL), '[]'::json
          ) AS permissions,
          COUNT(p.id)::int AS features_count
        FROM modules m
        LEFT JOIN company_modules cm ON cm.module_key = m.module_key AND cm.company_id = $1
        LEFT JOIN permissions p ON LOWER(TRIM(p.module)) = LOWER(TRIM(m.module_name))
        GROUP BY m.id, m.module_key, m.module_name, m.description, m.icon_name, m.sort_order, cm.is_enabled, cm.enabled_permissions, cm.permission_levels, cm.updated_at, cm.updated_by
        ORDER BY m.sort_order ASC, m.id ASC;
      `, [companyId]);

      res.json({ 
        success: true, 
        company_id: companyId,
        modules: result.rows,
        enabled_module_keys: result.rows.filter(r => r.is_enabled).map(r => r.module_key)
      });
    } catch (err) {
      console.error('Error fetching company modules:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST update company module settings
  router.post('/companies/:companyId/modules', async (req, res) => {
    try {
      const companyId = parseInt(req.params.companyId, 10);
      if (isNaN(companyId)) {
        return res.status(400).json({ success: false, error: 'Invalid company ID' });
      }

      const { modules: moduleList, operator_name } = req.body;
      if (!Array.isArray(moduleList)) {
        return res.status(400).json({ success: false, error: 'Modules array is required' });
      }

      const updater = operator_name || req.user?.full_name || 'Admin Operator';

      for (const item of moduleList) {
        if (!item.module_key) continue;
        const isEnabled = item.is_enabled !== false;
        const enabledPerms = Array.isArray(item.enabled_permissions) ? JSON.stringify(item.enabled_permissions) : null;
        const permLevels = item.permission_levels && typeof item.permission_levels === 'object' ? JSON.stringify(item.permission_levels) : null;

        await pgPool.query(`
          INSERT INTO company_modules (company_id, module_key, is_enabled, enabled_permissions, permission_levels, updated_at, updated_by)
          VALUES ($1, $2, $3, COALESCE($4::jsonb, '[]'::jsonb), COALESCE($5::jsonb, '{}'::jsonb), CURRENT_TIMESTAMP, $6)
          ON CONFLICT (company_id, module_key)
          DO UPDATE SET 
            is_enabled = EXCLUDED.is_enabled,
            enabled_permissions = CASE WHEN $4::jsonb IS NOT NULL THEN $4::jsonb ELSE company_modules.enabled_permissions END,
            permission_levels = CASE WHEN $5::jsonb IS NOT NULL THEN $5::jsonb ELSE company_modules.permission_levels END,
            updated_at = CURRENT_TIMESTAMP,
            updated_by = EXCLUDED.updated_by;
        `, [companyId, item.module_key, isEnabled, enabledPerms, permLevels, updater]);
      }

      await logAudit(
        req, 
        'COMPANY_MODULE_UPDATE', 
        `Updated module configuration for company ID ${companyId}`, 
        null, 
        moduleList, 
        companyId
      );

      // Return refreshed list
      const refreshed = await pgPool.query(`
        SELECT 
          m.module_key,
          m.module_name,
          COALESCE(cm.is_enabled, TRUE) AS is_enabled
        FROM modules m
        LEFT JOIN company_modules cm ON cm.module_key = m.module_key AND cm.company_id = $1
        ORDER BY m.sort_order ASC;
      `, [companyId]);

      res.json({ 
        success: true, 
        message: 'Company module settings saved successfully', 
        modules: refreshed.rows,
        enabled_module_keys: refreshed.rows.filter(r => r.is_enabled).map(r => r.module_key)
      });
    } catch (err) {
      console.error('Error updating company modules:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // 3. ROLES & IAM
  // ==========================================

  // Helper to parse permissions and access levels
  function parsePermissionsWithLevels(permissions, permissionLevelsBody) {
    const map = new Map();
    if (Array.isArray(permissions)) {
      for (const item of permissions) {
        if (typeof item === 'string') {
          if (item.includes(':')) {
            const [k, lvl] = item.split(':');
            map.set(k.trim(), lvl.trim().toLowerCase() === 'view' ? 'view' : 'edit');
          } else {
            map.set(item.trim(), 'edit');
          }
        } else if (item && typeof item === 'object') {
          const k = item.permission_key || item.key;
          const lvl = item.access_level || item.level || 'edit';
          if (k) {
            map.set(String(k).trim(), String(lvl).toLowerCase() === 'view' ? 'view' : 'edit');
          }
        }
      }
    }
    if (permissionLevelsBody && typeof permissionLevelsBody === 'object') {
      for (const [k, lvl] of Object.entries(permissionLevelsBody)) {
        if (map.has(k)) {
          map.set(k, String(lvl).toLowerCase() === 'view' ? 'view' : 'edit');
        }
      }
    }
    return map;
  }

  // GET roles by company
  router.get('/companies/:companyId/roles', async (req, res) => {
    try {
      const companyId = req.params.companyId;
      const rolesRes = await pgPool.query(`
        SELECT 
          r.*,
          (SELECT COUNT(DISTINCT cur.user_id)::int FROM company_user_roles cur JOIN profiles p ON p.user_id = cur.user_id WHERE cur.role_id = r.id AND cur.status = 'active' AND LOWER(TRIM(COALESCE(p.status, 'active'))) = 'active' AND p.email NOT LIKE '%_deleted_%' AND p.user_id NOT LIKE '%_deleted_%') AS total_users,
          COALESCE(
            json_agg(p.permission_key) FILTER (WHERE p.permission_key IS NOT NULL), '[]'::json
          ) AS permission_keys,
          COALESCE(
            json_object_agg(p.permission_key, COALESCE(rp.access_level, 'edit')) FILTER (WHERE p.permission_key IS NOT NULL), '{}'::json
          ) AS permission_levels,
          COALESCE(
            json_agg(
              json_build_object(
                'id', p.id,
                'permission_key', p.permission_key,
                'access_level', COALESCE(rp.access_level, 'edit'),
                'display_name', p.display_name,
                'module', p.module
              ) ORDER BY p.module ASC, p.id ASC
            ) FILTER (WHERE p.id IS NOT NULL), '[]'::json
          ) AS permissions_detail
        FROM roles r
        LEFT JOIN role_permissions rp ON r.id = rp.role_id
        LEFT JOIN permissions p ON rp.permission_id = p.id
        WHERE r.company_id = $1
        GROUP BY r.id
        ORDER BY r.name ASC;
      `, [companyId]);

      res.json({ success: true, roles: rolesRes.rows });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET role templates (Presets)
  router.get('/role-templates', async (req, res) => {
    try {
      const templates = await pgPool.query('SELECT * FROM role_templates ORDER BY id ASC');
      res.json({ success: true, templates: templates.rows });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST create role for company
  router.post('/companies/:companyId/roles', async (req, res) => {
    try {
      const companyId = req.params.companyId;
      const {
        role_name,
        display_name,
        description = '',
        role_type = 'Employee Role',
        scope_type = 'Current Company Only',
        permissions = [],
        permission_levels = {}
      } = req.body;

      const safeRoleName = cleanString(role_name);
      if (!safeRoleName) {
        return res.status(400).json({ success: false, error: 'Role name is required' });
      }

      // Check if a role with this name already exists for this specific company
      const existing = await pgPool.query(
        "SELECT id, name FROM roles WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) AND COALESCE(company_id, 1) = COALESCE($2, 1)",
        [safeRoleName, companyId]
      );
      if (existing.rows.length > 0) {
        return res.status(400).json({ 
          success: false, 
          error: `A role named "${safeRoleName}" already exists for this company. Please choose a different name.` 
        });
      }

      const roleRes = await pgPool.query(`
        INSERT INTO roles (name, description, role_type, scope_type, company_id, is_system_role, status)
        VALUES ($1, $2, $3, $4, $5, FALSE, 'Active')
        RETURNING *;
      `, [safeRoleName, cleanString(description), role_type || 'Employee Role', scope_type || 'Current Company Only', companyId]);

      const newRole = roleRes.rows[0];

      // Assign permissions with granular access level ('view' | 'edit')
      const permMap = parsePermissionsWithLevels(permissions, permission_levels);
      for (const [permKey, accessLevel] of permMap.entries()) {
        const permIdRes = await pgPool.query('SELECT id FROM permissions WHERE permission_key = $1', [permKey]);
        if (permIdRes.rows.length > 0) {
          await pgPool.query(`
            INSERT INTO role_permissions (role_id, permission_id, access_level)
            VALUES ($1, $2, $3)
            ON CONFLICT (role_id, permission_id) 
            DO UPDATE SET access_level = EXCLUDED.access_level;
          `, [newRole.id, permIdRes.rows[0].id, accessLevel]);
        }
      }

      await logAudit(req, 'ROLE_CREATE', `Created role ${role_name} for company ${companyId}`, null, newRole, companyId);

      res.status(201).json({ success: true, role: newRole });
    } catch (err) {
      console.error('Error creating role:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // PUT update role
  router.put('/roles/:id', async (req, res) => {
    try {
      const roleId = req.params.id;
      const { name, description, role_type, scope_type, status, permissions, permission_levels = {} } = req.body;

      const safeName = cleanString(name);
      if (safeName) {
        const existing = await pgPool.query(
          "SELECT id FROM roles WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) AND COALESCE(company_id, 1) = (SELECT COALESCE(company_id, 1) FROM roles WHERE id = $2) AND id != $2",
          [safeName, roleId]
        );
        if (existing.rows.length > 0) {
          return res.status(400).json({ 
            success: false, 
            error: `A role named "${safeName}" already exists for this company.` 
          });
        }
      }

      const updateRes = await pgPool.query(`
        UPDATE roles
        SET 
          name = COALESCE($1, name),
          description = COALESCE($2, description),
          role_type = COALESCE($3, role_type),
          scope_type = COALESCE($4, scope_type),
          status = COALESCE($5, status),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $6
        RETURNING *;
      `, [name, description, role_type, scope_type, status, roleId]);

      if (updateRes.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Role not found' });
      }

      // Update permissions with granular access level if provided
      if (Array.isArray(permissions)) {
        await pgPool.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);
        const permMap = parsePermissionsWithLevels(permissions, permission_levels);
        for (const [permKey, accessLevel] of permMap.entries()) {
          const permIdRes = await pgPool.query('SELECT id FROM permissions WHERE permission_key = $1', [permKey]);
          if (permIdRes.rows.length > 0) {
            await pgPool.query(`
              INSERT INTO role_permissions (role_id, permission_id, access_level)
              VALUES ($1, $2, $3)
              ON CONFLICT (role_id, permission_id) 
              DO UPDATE SET access_level = EXCLUDED.access_level;
            `, [roleId, permIdRes.rows[0].id, accessLevel]);
          }
        }
      }

      res.json({ success: true, role: updateRes.rows[0] });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // DELETE role
  router.delete('/roles/:id', async (req, res) => {
    try {
      const roleId = req.params.id;
      const roleRes = await pgPool.query('SELECT * FROM roles WHERE id = $1', [roleId]);
      if (roleRes.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Role not found' });
      }
      const role = roleRes.rows[0];

      if (role.is_system_role) {
        return res.status(400).json({ success: false, error: 'System Roles are permanent system templates and cannot be deleted.' });
      }

      // Check if active users are assigned in company_user_roles or profiles
      const assigned = await pgPool.query("SELECT COUNT(*)::int as count FROM company_user_roles WHERE role_id = $1 AND status = 'active'", [roleId]);
      const profAssigned = await pgPool.query(
        `SELECT COUNT(*)::int as count FROM profiles 
         WHERE (role_id = $1 OR LOWER(role) = LOWER($2) OR LOWER(REPLACE(role, '_', ' ')) = LOWER($2)) 
           AND status != 'Deleted'`,
        [roleId, role.name]
      );
      const totalAssigned = Math.max(assigned.rows[0]?.count || 0, profAssigned.rows[0]?.count || 0);
      if (totalAssigned > 0) {
        return res.status(400).json({ success: false, error: `Cannot delete role '${role.name}': ${totalAssigned} active user(s) are currently assigned to it.` });
      }

      // Clean up any historical/inactive references before deleting role to avoid foreign key violations
      await pgPool.query("UPDATE user_role SET role = 'Employee', role_id = NULL WHERE role_id = $1 OR LOWER(role) = LOWER($2)", [roleId, role.name]);
      await pgPool.query("UPDATE profiles SET role = 'Employee', role_id = NULL WHERE role_id = $1", [roleId]);
      await pgPool.query('DELETE FROM company_user_roles WHERE role_id = $1', [roleId]);
      await pgPool.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);
      await pgPool.query('DELETE FROM approval_workflow WHERE approver_role_id = $1', [roleId]);
      await pgPool.query('DELETE FROM roles WHERE id = $1', [roleId]);

      res.json({ success: true, message: `Role '${role.name}' deleted successfully.` });
    } catch (err) {
      console.error('Error deleting role:', err);
      res.status(500).json({ success: false, error: err.message || 'Database error deleting role' });
    }
  });

  // ==========================================
  // 4. DEPARTMENTS BY COMPANY
  // ==========================================

  router.get('/companies/:companyId/departments', async (req, res) => {
    try {
      const companyId = req.params.companyId;
      const depts = await pgPool.query(`
        SELECT d.*,
          (SELECT COUNT(*)::int FROM company_user_roles cur WHERE cur.department_id = d.name AND cur.company_id = $1) AS employee_count
        FROM departments d
        WHERE d.company_id = $1 OR d.company_id IS NULL
        ORDER BY d.name ASC;
      `, [companyId]);
      res.json({ success: true, departments: depts.rows });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/companies/:companyId/departments', async (req, res) => {
    try {
      const companyId = req.params.companyId;
      const safeName = cleanString(req.body.name);
      const safeCode = cleanString(req.body.code);
      if (!safeName) {
        return res.status(400).json({ success: false, error: 'Department name is required' });
      }

      const ins = await pgPool.query(`
        INSERT INTO departments (name, code, company_id)
        VALUES ($1, $2, $3)
        RETURNING *;
      `, [safeName, safeCode ? safeCode.toUpperCase() : null, companyId]);

      res.status(201).json({ success: true, department: ins.rows[0] });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // 5. WORK SCHEDULES & TIMETABLES
  // ==========================================

  router.get('/companies/:companyId/work-schedules', async (req, res) => {
    try {
      const companyId = parseInt(req.params.companyId, 10) || 1;
      const [schedulesRes, branchesRes] = await Promise.all([
        pgPool.query(`
          SELECT 
            ws.*,
            COALESCE(
              json_agg(
                json_build_object(
                  'day_of_week', wsd.day_of_week,
                  'start_time', wsd.start_time,
                  'end_time', wsd.end_time,
                  'is_working_day', wsd.is_working_day
                ) ORDER BY 
                  CASE wsd.day_of_week
                    WHEN 'Monday' THEN 1
                    WHEN 'Tuesday' THEN 2
                    WHEN 'Wednesday' THEN 3
                    WHEN 'Thursday' THEN 4
                    WHEN 'Friday' THEN 5
                    WHEN 'Saturday' THEN 6
                    WHEN 'Sunday' THEN 7
                  END
              ) FILTER (WHERE wsd.id IS NOT NULL), '[]'::json
            ) AS days,
            COALESCE(
              (SELECT json_agg(bs.*) FROM break_schedules bs WHERE bs.schedule_id = ws.id), '[]'::json
            ) AS breaks
          FROM work_schedules ws
          LEFT JOIN work_schedule_days wsd ON ws.id = wsd.schedule_id
          WHERE ws.company_id = $1
          GROUP BY ws.id
          ORDER BY ws.id ASC;
        `, [companyId]),
        pgPool.query(
          `SELECT UPPER(code) AS code, operating_zone
           FROM branches
           WHERE company_id = $1 OR ($1 = 1 AND company_id IS NULL)
           ORDER BY code ASC`,
          [companyId]
        )
      ]);

      const normalizedSchedules = schedulesRes.rows.map((ws) => {
        const normZone = normalizeZoneCode(ws.operating_zone);
        let branchIds = parseBranchIds(ws.branch_ids, ws.branch_id);
        if (branchIds.length === 0 && normZone) {
          branchIds = branchesRes.rows
            .filter((b) => normalizeZoneCode(b.operating_zone) === normZone)
            .map((b) => b.code);
        }
        let specialRules = Array.isArray(ws.special_rules) ? ws.special_rules : [];
        if (specialRules.length === 0 && normZone === 'ZONE_A') {
          specialRules = ['first_thursday_full', 'first_saturday_closed'];
        } else if (specialRules.length === 0 && normZone === 'ZONE_B') {
          specialRules = ['first_saturday_closed'];
        }
        return {
          ...ws,
          operating_zone: normZone,
          branch_ids: branchIds,
          branch_id: branchIds.length > 0 ? branchIds.join(',') : null,
          special_rules: specialRules
        };
      });

      res.json({ success: true, schedules: normalizedSchedules });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/companies/:companyId/work-schedules', async (req, res) => {
    try {
      const companyId = req.params.companyId;
      const {
        schedule_name,
        operating_zone = null,
        department_id = null,
        branch_id = null,
        branch_ids = [],
        special_rules = [],
        effective_date = new Date().toISOString().split('T')[0],
        days = [],
        breaks = []
      } = req.body;

      const safeScheduleName = cleanString(schedule_name);
      if (!safeScheduleName) {
        return res.status(400).json({ success: false, error: 'Schedule name is required' });
      }

      const normZone = normalizeZoneCode(operating_zone);
      const parsedBranches = parseBranchIds(branch_ids, branch_id);
      const branchIdText = parsedBranches.length > 0 ? parsedBranches.join(',') : null;
      const cleanRules = Array.isArray(special_rules) ? special_rules : [];

      const schedRes = await pgPool.query(`
        INSERT INTO work_schedules (company_id, operating_zone, department_id, branch_id, branch_ids, special_rules, schedule_name, effective_date, status)
        VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, 'active')
        RETURNING *;
      `, [companyId, normZone, department_id, branchIdText, JSON.stringify(parsedBranches), JSON.stringify(cleanRules), safeScheduleName, effective_date]);

      const scheduleId = schedRes.rows[0].id;

      // Sync assigned branches to this schedule's zone
      if (parsedBranches.length > 0) {
        await syncScheduleBranchesToZone(companyId, scheduleId, normZone, parsedBranches);
      }

      // Insert days
      const standardDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      for (const d of standardDays) {
        const found = days.find(x => x.day_of_week === d) || { start_time: '08:30:00', end_time: '17:30:00', is_working_day: d !== 'Saturday' && d !== 'Sunday' };
        await pgPool.query(`
          INSERT INTO work_schedule_days (schedule_id, day_of_week, start_time, end_time, is_working_day)
          VALUES ($1, $2, $3, $4, $5);
        `, [scheduleId, d, found.start_time, found.end_time, found.is_working_day]);
      }

      // Insert breaks
      if (Array.isArray(breaks)) {
        for (const b of breaks) {
          if (b.start_time && b.end_time) {
            await pgPool.query(`
              INSERT INTO break_schedules (schedule_id, break_name, break_type, start_time, end_time)
              VALUES ($1, $2, $3, $4, $5);
            `, [scheduleId, b.break_name || 'Break', b.break_type || 'lunch', b.start_time, b.end_time]);
          }
        }
      }

      res.status(201).json({ success: true, schedule: schedRes.rows[0] });
    } catch (err) {
      console.error('Error creating work schedule:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // PUT update work schedule
  router.put('/companies/:companyId/work-schedules/:scheduleId', async (req, res) => {
    try {
      const { companyId, scheduleId } = req.params;
      const {
        schedule_name,
        operating_zone = null,
        department_id = null,
        branch_id = null,
        branch_ids = [],
        special_rules = [],
        days = [],
        breaks = []
      } = req.body;

      const safeScheduleName = cleanString(schedule_name);
      if (!safeScheduleName) {
        return res.status(400).json({ success: false, error: 'Schedule name is required' });
      }

      const normZone = normalizeZoneCode(operating_zone);
      const parsedBranches = parseBranchIds(branch_ids, branch_id);
      const branchIdText = parsedBranches.length > 0 ? parsedBranches.join(',') : null;
      const cleanRules = Array.isArray(special_rules) ? special_rules : [];

      const updateRes = await pgPool.query(`
        UPDATE work_schedules
        SET schedule_name = $1,
            operating_zone = $2,
            department_id = $3,
            branch_id = $4,
            branch_ids = $5::jsonb,
            special_rules = $6::jsonb,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $7 AND company_id = $8
        RETURNING *;
      `, [safeScheduleName, normZone, department_id, branchIdText, JSON.stringify(parsedBranches), JSON.stringify(cleanRules), scheduleId, companyId]);

      if (updateRes.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Work schedule not found' });
      }

      // Sync assigned branches to this schedule's zone
      if (parsedBranches.length > 0) {
        await syncScheduleBranchesToZone(companyId, scheduleId, normZone, parsedBranches);
      }

      // Re-insert days if provided
      if (Array.isArray(days) && days.length > 0) {
        await pgPool.query('DELETE FROM work_schedule_days WHERE schedule_id = $1', [scheduleId]);
        for (const d of days) {
          await pgPool.query(`
            INSERT INTO work_schedule_days (schedule_id, day_of_week, start_time, end_time, is_working_day)
            VALUES ($1, $2, $3, $4, $5);
          `, [scheduleId, d.day_of_week, d.start_time, d.end_time, d.is_working_day]);
        }
      }

      // Re-insert breaks if provided
      if (Array.isArray(breaks)) {
        await pgPool.query('DELETE FROM break_schedules WHERE schedule_id = $1', [scheduleId]);
        for (const b of breaks) {
          if (b.start_time && b.end_time) {
            await pgPool.query(`
              INSERT INTO break_schedules (schedule_id, break_name, break_type, start_time, end_time)
              VALUES ($1, $2, $3, $4, $5);
            `, [scheduleId, b.break_name || 'Break', b.break_type || 'lunch', b.start_time, b.end_time]);
          }
        }
      }

      res.json({ success: true, schedule: updateRes.rows[0] });
    } catch (err) {
      console.error('Error updating work schedule:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // DELETE work schedule
  router.delete('/companies/:companyId/work-schedules/:scheduleId', async (req, res) => {
    try {
      const { companyId, scheduleId } = req.params;
      await pgPool.query('DELETE FROM work_schedules WHERE id = $1 AND company_id = $2', [scheduleId, companyId]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // 6. ATTENDANCE & LEAVE SETTINGS & WORKFLOW
  // ==========================================

  // GET attendance settings
  router.get('/companies/:companyId/attendance-settings', async (req, res) => {
    try {
      const companyId = req.params.companyId;
      const result = await pgPool.query('SELECT * FROM attendance_settings WHERE company_id = $1', [companyId]);
      res.json({ success: true, settings: result.rows[0] || null });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST save attendance settings
  router.post('/companies/:companyId/attendance-settings', async (req, res) => {
    try {
      const companyId = req.params.companyId;
      const {
        late_threshold_minutes = 10,
        early_checkout_minutes = 0,
        min_working_hours = 8.0,
        overtime_enabled = false,
        gps_required = true,
        geofence_enforcement = 'strict',
        face_verification_required = false
      } = req.body;

      const result = await pgPool.query(`
        INSERT INTO attendance_settings (company_id, late_threshold_minutes, early_checkout_minutes, min_working_hours, overtime_enabled, gps_required, geofence_enforcement, face_verification_required)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (company_id) DO UPDATE SET
          late_threshold_minutes = EXCLUDED.late_threshold_minutes,
          early_checkout_minutes = EXCLUDED.early_checkout_minutes,
          min_working_hours = EXCLUDED.min_working_hours,
          overtime_enabled = EXCLUDED.overtime_enabled,
          gps_required = EXCLUDED.gps_required,
          geofence_enforcement = EXCLUDED.geofence_enforcement,
          face_verification_required = EXCLUDED.face_verification_required,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *;
      `, [companyId, late_threshold_minutes, early_checkout_minutes, min_working_hours, overtime_enabled, gps_required, geofence_enforcement, face_verification_required]);

      const updatedSettings = result.rows[0];

      // Insert audit and attendance policy history with effective date
      try {
        const schedRes = await pgPool.query(`
          SELECT MIN(wsd.start_time) as start_time
          FROM work_schedules ws
          JOIN work_schedule_days wsd ON ws.id = wsd.schedule_id
          WHERE ws.company_id = $1 AND ws.status = 'active' AND wsd.is_working_day = true AND wsd.start_time IS NOT NULL
        `, [companyId]);
        const startTimeStr = schedRes.rows[0]?.start_time ? String(schedRes.rows[0].start_time).slice(0, 5) : '08:30';
        const [sh, sm] = startTimeStr.split(':').map(Number);
        const startMins = (isNaN(sh) ? 8 : sh) * 60 + (isNaN(sm) ? 30 : sm);
        const safeGrace = Math.max(0, Number(late_threshold_minutes) || 0);
        const cutoffMins = startMins + safeGrace;
        const cutoffH = Math.floor(cutoffMins / 60) % 24;
        const cutoffM = cutoffMins % 60;
        const cutoffTimeStr = `${String(cutoffH).padStart(2, '0')}:${String(cutoffM).padStart(2, '0')}:00`;

        await pgPool.query(`
          INSERT INTO attendance_policy_history (company_id, late_threshold_minutes, start_time, cutoff_time, effective_date)
          VALUES ($1, $2, $3::time, $4::time, CURRENT_DATE)
        `, [companyId, safeGrace, `${startTimeStr}:00`, cutoffTimeStr]);
      } catch (histErr) {
        console.warn('Error recording attendance policy history:', histErr.message);
      }

      if (typeof global.refreshCompanyAttendanceSettings === 'function') {
        await global.refreshCompanyAttendanceSettings();
      }

      if (typeof global.broadcastPresenceUpdate === 'function') {
        global.broadcastPresenceUpdate({
          type: "config-change",
          timestamp: new Date().toISOString(),
          operatorName: req.body?.operatorName || "Admin",
          operatorRole: "admin",
          action: `Attendance Policy updated for company ${companyId} (Grace period: ${late_threshold_minutes}m)`
        });
      }

      await logAudit(req, 'ATTENDANCE_SETTINGS_UPDATE', `Updated attendance settings for company ${companyId}`, null, updatedSettings, companyId);

      res.json({ success: true, settings: updatedSettings });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Ensure approval_workflow supports branch_scope & routing_rule and auto-seed Rayhar Travels (company_id = 1) dual workflow
  async function ensureRayharLeaveWorkflowSeeded() {
    try {
      await pgPool.query(`
        ALTER TABLE approval_workflow ADD COLUMN IF NOT EXISTS branch_scope VARCHAR(50) NOT NULL DEFAULT 'ALL';
        ALTER TABLE approval_workflow ADD COLUMN IF NOT EXISTS routing_rule TEXT;
        ALTER TABLE approval_workflow DROP CONSTRAINT IF EXISTS approval_workflow_company_id_module_step_order_key;
      `);
      await pgPool.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'approval_workflow_company_module_scope_step_key'
          ) THEN
            ALTER TABLE approval_workflow
              ADD CONSTRAINT approval_workflow_company_module_scope_step_key
              UNIQUE (company_id, module, branch_scope, step_order);
          END IF;
        END $$;
      `);

      const existing = await pgPool.query(
        "SELECT COUNT(*)::int AS cnt FROM approval_workflow WHERE company_id = 1 AND module = 'leave'"
      );
      if ((existing.rows[0]?.cnt || 0) === 0) {
        const rolesRes = await pgPool.query('SELECT id, name FROM roles WHERE company_id = 1');
        const findRole = (name) => rolesRes.rows.find((r) => (r.name || '').toLowerCase() === name.toLowerCase())?.id;
        const hodId = findRole('Head of Department');
        const omId = findRole('Operation Manager');
        const blId = findRole('Branch Leader');
        const mdId = findRole('Managing Director');

        if (hodId && omId) {
          await pgPool.query(
            `INSERT INTO approval_workflow (company_id, module, branch_scope, step_order, approver_role_id, step_label, routing_rule, auto_escalate_hours)
             VALUES
               (1, 'leave', 'HQ', 1, $1, 'Department Review (HQ Department Only)', 'Follows employee department (Only HQ has departments)', 48),
               (1, 'leave', 'HQ', 2, $2, 'Highest Approval (Operation Manager)', 'Highest approval authority for Rayhar HQ leave requests', 48)
             ON CONFLICT (company_id, module, branch_scope, step_order) DO NOTHING`,
            [hodId, omId]
          );
        }

        if (blId && mdId) {
          await pgPool.query(
            `INSERT INTO approval_workflow (company_id, module, branch_scope, step_order, approver_role_id, step_label, routing_rule, auto_escalate_hours)
             VALUES
               (1, 'leave', 'OTHER_BRANCHES', 1, $1, 'Branch Endorsement (Own Branch Only)', 'Follows employee own branch only (Appears when HR creates/assigns Branch Leader for that branch)', 48),
               (1, 'leave', 'OTHER_BRANCHES', 2, $2, 'Highest Approval (Managing Director)', 'Highest approval authority for all other branches except HQ', 48)
             ON CONFLICT (company_id, module, branch_scope, step_order) DO NOTHING`,
            [blId, mdId]
          );
        }
      }

      // Auto-seed Rayhar Vacation (company_id = 3): Step 1: Administrative Assistant -> Step 2: General Manager
      const existingRv = await pgPool.query(
        "SELECT COUNT(*)::int AS cnt FROM approval_workflow WHERE company_id = 3 AND module = 'leave'"
      );
      if ((existingRv.rows[0]?.cnt || 0) === 0) {
        const rvRolesRes = await pgPool.query('SELECT id, name FROM roles WHERE company_id = 3');
        const findRvRole = (name) => rvRolesRes.rows.find((r) => (r.name || '').toLowerCase() === name.toLowerCase())?.id;
        const aaId = findRvRole('Administrative Assistant');
        const gmId = findRvRole('General Manager');
        if (aaId && gmId) {
          await pgPool.query(
            `INSERT INTO approval_workflow (company_id, module, branch_scope, step_order, approver_role_id, step_label, routing_rule, auto_escalate_hours)
             VALUES
               (3, 'leave', 'ALL', 1, $1, 'Department / Branch Review', '[Track: Workflow 1 • Rayhar Vacation Approval Workflow] Sequential approval stage', 48),
               (3, 'leave', 'ALL', 2, $2, 'Highest Approval (Final Sign-off)', '[Track: Workflow 1 • Rayhar Vacation Approval Workflow] Sequential approval stage', 48)
             ON CONFLICT (company_id, module, branch_scope, step_order) DO NOTHING`,
            [aaId, gmId]
          );
        }
      }
    } catch (e) {
      console.warn('Could not auto-seed Rayhar Travels dual leave workflow:', e.message);
    }
  }
  ensureRayharLeaveWorkflowSeeded();

  // GET leave settings & approval workflow
  router.get('/companies/:companyId/leave-settings', async (req, res) => {
    try {
      const companyId = parseInt(req.params.companyId, 10) || 1;
      if (companyId === 1) {
        await ensureRayharLeaveWorkflowSeeded();
      }

      const [leaveSettings, workflow] = await Promise.all([
        pgPool.query('SELECT * FROM leave_settings WHERE company_id = $1 ORDER BY id ASC', [companyId]),
        pgPool.query(`
          SELECT aw.*, r.name AS approver_role_name, r.role_type, r.scope_type
          FROM approval_workflow aw
          LEFT JOIN roles r ON aw.approver_role_id = r.id
          WHERE aw.company_id = $1 AND aw.module = 'leave'
          ORDER BY
            CASE
              WHEN aw.branch_scope = 'HQ' THEN 1
              WHEN aw.branch_scope = 'OTHER_BRANCHES' THEN 2
              ELSE 3
            END ASC,
            aw.step_order ASC;
        `, [companyId])
      ]);

      res.json({
        success: true,
        leave_types: leaveSettings.rows,
        approval_workflow: workflow.rows
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST save leave entitlement settings
  router.post('/companies/:companyId/leave-settings', async (req, res) => {
    try {
      const companyId = parseInt(req.params.companyId, 10) || 1;
      const {
        annual_days = 14,
        sick_days = 14,
        emergency_days = 5,
        replacement_days = 0,
        unpaid_days = 0,
        mc_required = true,
        escalate_to_parent = true
      } = req.body;

      await pgPool.query(
        `INSERT INTO leave_settings (company_id, leave_type, default_entitlement_days, escalate_to_parent, mc_required, updated_at)
         VALUES
           ($1, 'Annual Leave', $2, $7, FALSE, CURRENT_TIMESTAMP),
           ($1, 'Sick Leave', $3, $7, $8, CURRENT_TIMESTAMP),
           ($1, 'Emergency Leave', $4, $7, FALSE, CURRENT_TIMESTAMP),
           ($1, 'Replacement Leave', $5, $7, FALSE, CURRENT_TIMESTAMP),
           ($1, 'Unpaid Leave', $6, $7, FALSE, CURRENT_TIMESTAMP)
         ON CONFLICT (company_id, leave_type) DO UPDATE SET
           default_entitlement_days = EXCLUDED.default_entitlement_days,
           escalate_to_parent = EXCLUDED.escalate_to_parent,
           mc_required = EXCLUDED.mc_required,
           updated_at = CURRENT_TIMESTAMP`,
        [companyId, annual_days, sick_days, emergency_days, replacement_days, unpaid_days, escalate_to_parent, mc_required]
      );

      const updated = await pgPool.query('SELECT * FROM leave_settings WHERE company_id = $1 ORDER BY id ASC', [companyId]);
      await logAudit(req, 'LEAVE_SETTINGS_UPDATE', `Updated leave entitlement policies for company ${companyId}`, null, updated.rows, companyId);
      res.json({ success: true, leave_types: updated.rows });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST save approval workflow steps
  router.post('/companies/:companyId/approval-workflow', async (req, res) => {
    try {
      const companyId = parseInt(req.params.companyId, 10) || 1;
      const { steps = [] } = req.body;

      await pgPool.query('DELETE FROM approval_workflow WHERE company_id = $1 AND module = \'leave\'', [companyId]);

      const scopeCounters = {};
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        if (step.approver_role_id) {
          const scope = step.branch_scope || 'ALL';
          scopeCounters[scope] = (scopeCounters[scope] || 0) + 1;
          const stepOrder = step.step_order || scopeCounters[scope];
          await pgPool.query(`
            INSERT INTO approval_workflow (company_id, module, branch_scope, step_order, approver_role_id, step_label, routing_rule, auto_escalate_hours)
            VALUES ($1, 'leave', $2, $3, $4, $5, $6, $7)
            ON CONFLICT (company_id, module, branch_scope, step_order)
            DO UPDATE SET
              approver_role_id = EXCLUDED.approver_role_id,
              step_label = EXCLUDED.step_label,
              routing_rule = EXCLUDED.routing_rule,
              auto_escalate_hours = EXCLUDED.auto_escalate_hours;
          `, [
            companyId,
            scope,
            stepOrder,
            step.approver_role_id,
            step.step_label || `Step ${stepOrder}`,
            step.routing_rule || null,
            step.auto_escalate_hours || 48
          ]);
        }
      }

      await logAudit(req, 'LEAVE_WORKFLOW_UPDATE', `Updated leave approval workflow for company ${companyId}`, null, steps, companyId);

      // Align all active pending leave requests for this company to the latest saved workflow steps
      try {
        const latestWfRes = await pgPool.query(`
          SELECT aw.*, r.name AS role_name
          FROM approval_workflow aw
          LEFT JOIN roles r ON aw.approver_role_id = r.id
          WHERE aw.company_id = $1 AND aw.module = 'leave'
          ORDER BY aw.step_order ASC
        `, [companyId]);
        const savedSteps = latestWfRes.rows;

        if (savedSteps.length > 0) {
          const pendingReqsRes = await pgPool.query(`
            SELECT lr.leave_id, lr.status, p.branch,
              (SELECT COUNT(*)::int FROM leave_approvals la WHERE la.leave_id = lr.leave_id AND la.status = 'Approved') AS approved_count
            FROM leave_requests lr
            JOIN profiles p ON p.user_id = lr.user_id
            WHERE lr.status LIKE 'Pending%'
              AND (
                COALESCE(
                  (SELECT cur.company_id FROM company_user_roles cur WHERE cur.user_id = lr.user_id AND cur.status = 'active' ORDER BY cur.company_id DESC LIMIT 1),
                  CASE 
                    WHEN UPPER(p.branch) LIKE 'RV%' THEN 3
                    WHEN UPPER(p.branch) = 'RAYRENT' THEN 2 
                    ELSE 1 
                  END
                )::int = $1
              )
          `, [companyId]);

          for (const preq of pendingReqsRes.rows) {
            const cleanBranch = String(preq.branch || '').trim().toUpperCase();
            let matching = savedSteps.filter((s) => {
              const scope = String(s.branch_scope || '').trim().toUpperCase();
              const rule = String(s.routing_rule || '').toUpperCase();
              if (scope === 'ALL') return true;
              if (scope === cleanBranch) return true;
              if (scope.split(',').map((x) => x.trim()).includes(cleanBranch)) return true;
              if (rule.includes(cleanBranch)) return true;
              return false;
            });

            if (matching.length === 0) {
              if (cleanBranch === 'HQ') {
                matching = savedSteps.filter((s) => String(s.branch_scope || '').trim().toUpperCase() === 'HQ');
              } else {
                matching = savedSteps.filter((s) => String(s.branch_scope || '').trim().toUpperCase() === 'OTHER_BRANCHES');
              }
            }
            if (matching.length === 0) {
              matching = savedSteps.filter((s) => String(s.branch_scope || '').trim().toUpperCase() === 'ALL');
            }
            if (matching.length === 0) matching = savedSteps;

            matching.sort((a, b) => a.step_order - b.step_order);

            const approvedCount = preq.approved_count || 0;
            if (approvedCount < matching.length) {
              const targetStep = matching[approvedCount];
              const newStatus = `Pending ${targetStep.role_name || targetStep.step_label || 'Approver'}`;
              if (newStatus !== preq.status) {
                await pgPool.query('UPDATE leave_requests SET status = $1 WHERE leave_id = $2', [newStatus, preq.leave_id]);
              }
            } else if (matching.length > 0) {
              await pgPool.query('UPDATE leave_requests SET status = $1 WHERE leave_id = $2', ['Approved', preq.leave_id]);
            }
          }

          if (typeof global.broadcastPresenceUpdate === 'function') {
            global.broadcastPresenceUpdate({ type: 'refresh' });
            global.broadcastPresenceUpdate({ type: 'leave-status', companyId, refresh: true });
          }
        }
      } catch (alignErr) {
        console.warn('Real-time workflow alignment notice:', alignErr.message);
      }

      res.json({ success: true, message: 'Workflow saved successfully' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // 7. EMPLOYEE COMPANY ASSIGNMENT & TRANSFER
  // ==========================================

  // GET companies for a user
  router.get('/employees/:userId/companies', async (req, res) => {
    try {
      const userId = req.params.userId;
      const result = await pgPool.query(`
        SELECT 
          cur.*,
          c.company_name,
          c.company_type,
          c.logo_url,
          r.name AS role_name,
          r.role_type,
          r.scope_type,
          b.name AS branch_name
        FROM company_user_roles cur
        JOIN companies c ON cur.company_id = c.id
        LEFT JOIN roles r ON cur.role_id = r.id
        LEFT JOIN branches b ON cur.branch_id = b.code
        WHERE cur.user_id = $1 AND cur.status = 'active'
        ORDER BY cur.is_default DESC, c.id ASC;
      `, [userId]);

      res.json({ success: true, user_companies: result.rows });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST assign / update company workspace access for an employee (Dual / Multi-workspace assignment)
  router.post('/employees/assign-company', async (req, res) => {
    try {
      const {
        user_id,
        company_id,
        role_id,
        branch_id,
        department_id,
        status = 'active',
        is_default = false
      } = req.body;

      if (!user_id || !company_id) {
        return res.status(400).json({ success: false, error: 'User ID and Company ID are required' });
      }

      const userRes = await pgPool.query('SELECT user_id, full_name, role_id, branch, department FROM profiles WHERE user_id = $1', [user_id]);
      if (userRes.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Employee not found' });
      }
      const userObj = userRes.rows[0];

      let targetRoleId = role_id || userObj.role_id;
      if (!targetRoleId) {
        const defaultRole = await pgPool.query('SELECT id FROM roles WHERE company_id = $1 ORDER BY id ASC LIMIT 1', [company_id]);
        targetRoleId = defaultRole.rows[0]?.id || null;
      }

      // Check if user already has a record for this company
      const existing = await pgPool.query(
        'SELECT id FROM company_user_roles WHERE user_id = $1 AND company_id = $2',
        [user_id, company_id]
      );

      if (existing.rows.length > 0) {
        await pgPool.query(`
          UPDATE company_user_roles
          SET 
            role_id = COALESCE($1, role_id),
            branch_id = COALESCE($2, branch_id),
            department_id = COALESCE($3, department_id),
            status = $4,
            is_default = COALESCE($5, is_default),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $6;
        `, [targetRoleId, branch_id || null, department_id || null, status, is_default, existing.rows[0].id]);
      } else {
        await pgPool.query(`
          INSERT INTO company_user_roles (user_id, company_id, role_id, branch_id, department_id, status, is_default)
          VALUES ($1, $2, $3, $4, $5, $6, $7);
        `, [user_id, company_id, targetRoleId, branch_id || null, department_id || null, status, is_default]);
      }

      const compRes = await pgPool.query('SELECT company_name FROM companies WHERE id = $1', [company_id]);
      const compName = compRes.rows[0]?.company_name || `Company #${company_id}`;

      await logAudit(
        req, 
        'WORKSPACE_ASSIGNMENT', 
        `Updated workspace assignment for ${userObj.full_name} (${user_id}) in ${compName} (Status: ${status})`,
        null, 
        { company_id, status }, 
        company_id
      );

      res.json({ success: true, message: `Successfully updated workspace access for ${compName}` });
    } catch (err) {
      console.error('Error assigning company workspace:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST transfer employee to another company
  router.post('/employees/transfer-company', async (req, res) => {
    try {
      const {
        employee_id,
        new_company_id,
        new_role_id,
        new_branch_id,
        new_department_id,
        reason = 'Organizational Realignment'
      } = req.body;

      if (!employee_id || !new_company_id) {
        return res.status(400).json({ success: false, error: 'Employee and new company are required' });
      }

      // Get current profile
      const profRes = await pgPool.query(`
        SELECT p.*, r.name as current_role_name, c.company_name as current_company_name
        FROM profiles p
        LEFT JOIN roles r ON p.role_id = r.id
        LEFT JOIN company_user_roles cur ON cur.user_id = p.user_id AND cur.is_default = TRUE
        LEFT JOIN companies c ON cur.company_id = c.id
        WHERE p.user_id = $1;
      `, [employee_id]);

      if (profRes.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Employee not found' });
      }

      const emp = profRes.rows[0];
      const newCompRes = await pgPool.query('SELECT company_name FROM companies WHERE id = $1', [new_company_id]);
      const newCompanyName = newCompRes.rows[0]?.company_name || `Company #${new_company_id}`;

      const newRoleRes = new_role_id ? await pgPool.query('SELECT name FROM roles WHERE id = $1', [new_role_id]) : { rows: [] };
      const newRoleName = newRoleRes.rows[0]?.name || emp.role;

      const finalRoleId = new_role_id || emp.role_id;
      const finalRoleName = newRoleName;
      const finalBranch = new_branch_id || emp.branch;
      const finalDept = new_department_id || emp.department;

      // 1. Write immutable transfer history
      await pgPool.query(`
        INSERT INTO employee_company_history (
          employee_id, previous_company, new_company, previous_role, new_role,
          previous_branch, new_branch, previous_department, new_department, reason, approved_by,
          status, start_date, end_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'Transferred', CURRENT_DATE, CURRENT_DATE);
      `, [
        employee_id,
        emp.current_company_name || 'Rayhar Travels',
        newCompanyName,
        emp.current_role_name || emp.role,
        finalRoleName,
        emp.branch,
        finalBranch,
        emp.department,
        finalDept,
        reason,
        req.user?.user_id || 'system'
      ]);

      // 2. Set previous company_user_roles to inactive and non-default
      await pgPool.query(`
        UPDATE company_user_roles 
        SET is_default = FALSE, status = 'inactive', updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1 AND NOT (company_id = $2 AND role_id = $3);
      `, [employee_id, new_company_id, finalRoleId]);

      // 3. Upsert into company_user_roles for new company
      await pgPool.query(`
        INSERT INTO company_user_roles (user_id, company_id, role_id, branch_id, department_id, is_default, status, updated_at)
        VALUES ($1, $2, $3, $4, $5, TRUE, 'active', CURRENT_TIMESTAMP)
        ON CONFLICT (user_id, company_id, role_id) DO UPDATE SET
          branch_id = EXCLUDED.branch_id,
          department_id = EXCLUDED.department_id,
          is_default = TRUE,
          status = 'active',
          updated_at = CURRENT_TIMESTAMP;
      `, [employee_id, new_company_id, finalRoleId, finalBranch, finalDept]);

      // 4. Update profile pointer
      await pgPool.query(`
        UPDATE profiles
        SET 
          role_id = $1,
          role = $2,
          branch = COALESCE($3, branch),
          department = COALESCE($4, department),
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $5;
      `, [finalRoleId, finalRoleName, finalBranch, finalDept, employee_id]);

      // 5. Synchronize user_role table
      const urCheck = await pgPool.query('SELECT id FROM user_role WHERE user_id = $1', [employee_id]);
      if (urCheck.rows.length > 0) {
        await pgPool.query(`
          UPDATE user_role
          SET role = $1, role_id = $2, department = COALESCE($3, department)
          WHERE user_id = $4;
        `, [finalRoleName, finalRoleId, finalDept, employee_id]);
      } else {
        await pgPool.query(`
          INSERT INTO user_role (user_id, role, role_id, department)
          VALUES ($1, $2, $3, $4);
        `, [employee_id, finalRoleName, finalRoleId, finalDept]);
      }

      await logAudit(req, 'EMPLOYEE_TRANSFER', `Transferred employee ${emp.full_name} (${employee_id}) to ${newCompanyName}`, { company: emp.current_company_name }, { company: newCompanyName }, new_company_id);

      res.json({ success: true, message: `Employee transferred to ${newCompanyName} successfully` });
    } catch (err) {
      console.error('Error transferring employee:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET employee transfer history (single employee)
  router.get('/employees/:employeeId/company-history', async (req, res) => {
    try {
      const history = await pgPool.query(`
        SELECT * FROM employee_company_history
        WHERE employee_id = $1
        ORDER BY effective_date DESC, id DESC;
      `, [req.params.employeeId]);

      res.json({ success: true, history: history.rows });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET all employee transfer history
  router.get('/employee-company-history', async (req, res) => {
    try {
      const { limit = 200 } = req.query;
      const history = await pgPool.query(`
        SELECT ech.*, p.full_name as employee_name
        FROM employee_company_history ech
        LEFT JOIN profiles p ON ech.employee_id = p.user_id
        ORDER BY ech.created_at DESC, ech.id DESC
        LIMIT $1;
      `, [limit]);

      res.json({ success: true, history: history.rows });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Alias for backward compatibility
  router.get('/employees/all-company-history', async (req, res) => {
    try {
      const { limit = 200 } = req.query;
      const history = await pgPool.query(`
        SELECT ech.*, p.full_name as employee_name
        FROM employee_company_history ech
        LEFT JOIN profiles p ON ech.employee_id = p.user_id
        ORDER BY ech.created_at DESC, ech.id DESC
        LIMIT $1;
      `, [limit]);

      res.json({ success: true, history: history.rows });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // 8. AUDIT LOGS
  // ==========================================

  router.get('/audit-logs', async (req, res) => {
    try {
      // SECURITY (CWE-89): use fixed SQL text only; user input is passed exclusively as
      // validated, bound parameters.
      const rawCompanyId = req.query.company_id;
      const hasCompanyFilter = rawCompanyId !== undefined && rawCompanyId !== null && rawCompanyId !== '';
      const companyId = hasCompanyFilter ? parseInt(String(rawCompanyId), 10) : null;
      if (hasCompanyFilter && (!Number.isSafeInteger(companyId) || companyId <= 0)) {
        return res.status(400).json({ success: false, error: 'Invalid company_id' });
      }

      const parsedLimit = parseInt(String(req.query.limit ?? '100'), 10);
      const limit = Number.isSafeInteger(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 1000) : 100;

      const logs = hasCompanyFilter
        ? await pgPool.query(
            `SELECT al.*, c.company_name
             FROM audit_logs al
             LEFT JOIN companies c ON al.company_id = c.id
             WHERE al.company_id = $1
             ORDER BY al.created_at DESC
             LIMIT $2`,
            [companyId, limit]
          )
        : await pgPool.query(
            `SELECT al.*, c.company_name
             FROM audit_logs al
             LEFT JOIN companies c ON al.company_id = c.id
             ORDER BY al.created_at DESC
             LIMIT $1`,
            [limit]
          );
      res.json({ success: true, audit_logs: logs.rows });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/audit-logs', async (req, res) => {
    try {
      const { category, description, company_id, old_values, new_values } = req.body;
      if (!category || !description) {
        return res.status(400).json({ success: false, error: 'Category and description are required' });
      }
      await logAudit(req, category, description, old_values || null, new_values || null, company_id || null);
      res.json({ success: true, message: 'Audit entry recorded successfully' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}

module.exports = { createMultiCompanyRouter };
