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

  // Ensure all companies have baseline work schedules and active hours
  pgPool.query(`
    DO $$
    DECLARE
      c RECORD;
      sched_id INT;
    BEGIN
      FOR c IN SELECT id FROM companies LOOP
        IF NOT EXISTS (SELECT 1 FROM work_schedules WHERE company_id = c.id) THEN
          INSERT INTO work_schedules (company_id, schedule_name, effective_date, status)
          VALUES (c.id, 'Standard Office Hours', CURRENT_DATE, 'active')
          RETURNING id INTO sched_id;

          INSERT INTO work_schedule_days (schedule_id, day_of_week, start_time, end_time, is_working_day) VALUES
            (sched_id, 'Monday', '08:30:00', '17:30:00', TRUE),
            (sched_id, 'Tuesday', '08:30:00', '17:30:00', TRUE),
            (sched_id, 'Wednesday', '08:30:00', '17:30:00', TRUE),
            (sched_id, 'Thursday', '08:30:00', '17:30:00', TRUE),
            (sched_id, 'Friday', '08:30:00', '17:30:00', TRUE),
            (sched_id, 'Saturday', NULL, NULL, FALSE),
            (sched_id, 'Sunday', NULL, NULL, FALSE);

          INSERT INTO break_schedules (schedule_id, break_name, break_type, start_time, end_time) VALUES
            (sched_id, 'Lunch Break', 'lunch', '12:30:00', '14:00:00');
        END IF;
      END LOOP;
    END $$;
  `).catch((err) => console.warn('Could not auto-seed work schedules:', err.message));

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
      const operatorId = req.user?.user_id || req.user?.id || 'system';
      const operatorName = req.user?.full_name || req.user?.name || req.body?.operatorName || 'Admin Operator';
      const operatorRole = req.user?.role || req.body?.operatorRole || 'hr_admin';
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
    try {
      const {
        company_name,
        company_type = 'subsidiary',
        parent_company_id = null,
        company_address = '',
        email = '',
        status = 'active'
      } = req.body;

      if (!company_name || !company_name.trim()) {
        return res.status(400).json({ success: false, error: 'Company name is required' });
      }

      const insertResult = await pgPool.query(`
        INSERT INTO companies (company_name, company_type, parent_company_id, company_address, email, status)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
      `, [company_name.trim(), company_type, parent_company_id || null, company_address, email, status]);

      const newCompany = insertResult.rows[0];

      // Automatically initialize baseline attendance and leave settings for this company
      await pgPool.query(`
        INSERT INTO attendance_settings (company_id, late_threshold_minutes, early_checkout_minutes, min_working_hours, gps_required, geofence_enforcement)
        VALUES ($1, 10, 0, 8.00, TRUE, 'strict')
        ON CONFLICT (company_id) DO NOTHING;
      `, [newCompany.id]);

      await pgPool.query(`
        INSERT INTO leave_settings (company_id, leave_type, default_entitlement_days, escalate_to_parent, mc_required)
        VALUES 
          ($1, 'Annual Leave', 14, TRUE, FALSE),
          ($1, 'Sick Leave', 14, TRUE, TRUE),
          ($1, 'Emergency Leave', 5, TRUE, FALSE)
        ON CONFLICT (company_id, leave_type) DO NOTHING;
      `, [newCompany.id]);

      // Automatically initialize baseline work schedule (Standard Office Hours 08:30 - 17:30)
      const schedInsert = await pgPool.query(`
        INSERT INTO work_schedules (company_id, schedule_name, effective_date, status)
        VALUES ($1, 'Standard Office Hours', CURRENT_DATE, 'active')
        RETURNING id;
      `, [newCompany.id]);

      const newSchedId = schedInsert.rows[0]?.id;
      if (newSchedId) {
        await pgPool.query(`
          INSERT INTO work_schedule_days (schedule_id, day_of_week, start_time, end_time, is_working_day) VALUES
            ($1, 'Monday', '08:30:00', '17:30:00', TRUE),
            ($1, 'Tuesday', '08:30:00', '17:30:00', TRUE),
            ($1, 'Wednesday', '08:30:00', '17:30:00', TRUE),
            ($1, 'Thursday', '08:30:00', '17:30:00', TRUE),
            ($1, 'Friday', '08:30:00', '17:30:00', TRUE),
            ($1, 'Saturday', NULL, NULL, FALSE),
            ($1, 'Sunday', NULL, NULL, FALSE);

          INSERT INTO break_schedules (schedule_id, break_name, break_type, start_time, end_time) VALUES
            ($1, 'Lunch Break', 'lunch', '12:30:00', '14:00:00');
        `, [newSchedId]);
      }

      await logAudit(req, 'COMPANY_CREATE', `Created company ${newCompany.company_name} (ID: ${newCompany.id})`, null, newCompany, newCompany.id);

      res.status(201).json({ success: true, company: newCompany });
    } catch (err) {
      console.error('Error creating company:', err);
      if (err.code === '23505') {
        return res.status(400).json({ success: false, error: 'A company with this name already exists' });
      }
      res.status(500).json({ success: false, error: err.message });
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
        company_name ? company_name.trim() : null,
        company_type,
        parent_company_id !== undefined ? parent_company_id : oldCompany.rows[0].parent_company_id,
        company_address,
        email,
        status,
        logo_url,
        companyId
      ]);

      const updated = updateResult.rows[0];
      await logAudit(req, 'COMPANY_UPDATE', `Updated company details for ${updated.company_name}`, oldCompany.rows[0], updated, companyId);

      res.json({ success: true, company: updated });
    } catch (err) {
      console.error('Error updating company:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST upload logo for company
  router.post('/companies/:id/logo', uploadLogo.single('logo'), async (req, res) => {
    try {
      const companyId = req.params.id;
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No logo image file uploaded' });
      }

      const relativeUrl = `/uploads/company-logos/${req.file.filename}`;

      const updateResult = await pgPool.query(`
        UPDATE companies
        SET logo_url = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *;
      `, [relativeUrl, companyId]);

      if (updateResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Company not found' });
      }

      await logAudit(req, 'COMPANY_LOGO', `Uploaded new logo for ${updateResult.rows[0].company_name}`, null, { logo_url: relativeUrl }, companyId);

      res.json({ success: true, logo_url: relativeUrl, company: updateResult.rows[0] });
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
        operating_zone = 'Zone B',
        latitude,
        longitude,
        radius = 50
      } = req.body;

      if (!code || !name || latitude === undefined || longitude === undefined) {
        return res.status(400).json({ success: false, error: 'Code, Name, Latitude, and Longitude are required' });
      }

      const branchCode = code.trim().toUpperCase();

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
      `, [branchCode, name.trim(), name.trim(), location, operating_zone, latitude, longitude, radius, companyId]);

      // Ensure normal geofence record exists
      await pgPool.query(`
        INSERT INTO branch_geofence_settings (branch_code, company_id, mode, radius_meter)
        VALUES ($1, $2, 'normal', $3)
        ON CONFLICT (branch_code, mode) DO UPDATE SET radius_meter = EXCLUDED.radius_meter;
      `, [branchCode, companyId, radius]);

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
      `, [name, location, operating_zone, latitude, longitude, radius, company_id, code]);

      if (updateRes.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Branch not found' });
      }

      if (radius !== undefined) {
        await pgPool.query(`
          INSERT INTO branch_geofence_settings (branch_code, company_id, mode, radius_meter)
          VALUES ($1, $2, 'normal', $3)
          ON CONFLICT (branch_code, mode) DO UPDATE SET radius_meter = EXCLUDED.radius_meter;
        `, [code, updateRes.rows[0].company_id || 1, radius]);
      }

      res.json({ success: true, branch: updateRes.rows[0] });
    } catch (err) {
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
  // 3. ROLES & IAM
  // ==========================================

  // GET roles by company
  router.get('/companies/:companyId/roles', async (req, res) => {
    try {
      const companyId = req.params.companyId;
      const rolesRes = await pgPool.query(`
        SELECT 
          r.*,
          (SELECT COUNT(*)::int FROM company_user_roles cur WHERE cur.role_id = r.id AND cur.status = 'active') AS total_users,
          COALESCE(
            json_agg(p.permission_key) FILTER (WHERE p.permission_key IS NOT NULL), '[]'::json
          ) AS permission_keys
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
        permissions = []
      } = req.body;

      if (!role_name || !role_name.trim()) {
        return res.status(400).json({ success: false, error: 'Role name is required' });
      }

      const roleRes = await pgPool.query(`
        INSERT INTO roles (name, description, role_type, scope_type, company_id, is_system_role, status)
        VALUES ($1, $2, $3, $4, $5, FALSE, 'Active')
        RETURNING *;
      `, [role_name.trim(), description, role_type, scope_type, companyId]);

      const newRole = roleRes.rows[0];

      // Assign permissions if array passed
      if (Array.isArray(permissions) && permissions.length > 0) {
        for (const permKey of permissions) {
          const permIdRes = await pgPool.query('SELECT id FROM permissions WHERE permission_key = $1', [permKey]);
          if (permIdRes.rows.length > 0) {
            await pgPool.query(`
              INSERT INTO role_permissions (role_id, permission_id)
              VALUES ($1, $2)
              ON CONFLICT (role_id, permission_id) DO NOTHING;
            `, [newRole.id, permIdRes.rows[0].id]);
          }
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
      const { name, description, role_type, scope_type, status, permissions } = req.body;

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

      // Update permissions if provided
      if (Array.isArray(permissions)) {
        await pgPool.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);
        for (const permKey of permissions) {
          const permIdRes = await pgPool.query('SELECT id FROM permissions WHERE permission_key = $1', [permKey]);
          if (permIdRes.rows.length > 0) {
            await pgPool.query(`
              INSERT INTO role_permissions (role_id, permission_id)
              VALUES ($1, $2)
              ON CONFLICT (role_id, permission_id) DO NOTHING;
            `, [roleId, permIdRes.rows[0].id]);
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
      const { name, code } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, error: 'Department name is required' });
      }

      const ins = await pgPool.query(`
        INSERT INTO departments (name, code, company_id)
        VALUES ($1, $2, $3)
        RETURNING *;
      `, [name.trim(), code ? code.trim().toUpperCase() : null, companyId]);

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
      const companyId = req.params.companyId;
      const schedules = await pgPool.query(`
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
      `, [companyId]);

      res.json({ success: true, schedules: schedules.rows });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/companies/:companyId/work-schedules', async (req, res) => {
    try {
      const companyId = req.params.companyId;
      const {
        schedule_name,
        department_id = null,
        branch_id = null,
        effective_date = new Date().toISOString().split('T')[0],
        days = [],
        breaks = []
      } = req.body;

      if (!schedule_name) {
        return res.status(400).json({ success: false, error: 'Schedule name is required' });
      }

      const schedRes = await pgPool.query(`
        INSERT INTO work_schedules (company_id, department_id, branch_id, schedule_name, effective_date, status)
        VALUES ($1, $2, $3, $4, $5, 'active')
        RETURNING *;
      `, [companyId, department_id, branch_id, schedule_name.trim(), effective_date]);

      const scheduleId = schedRes.rows[0].id;

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
        department_id = null,
        branch_id = null,
        days = [],
        breaks = []
      } = req.body;

      if (!schedule_name) {
        return res.status(400).json({ success: false, error: 'Schedule name is required' });
      }

      const updateRes = await pgPool.query(`
        UPDATE work_schedules
        SET schedule_name = $1, department_id = $2, branch_id = $3, updated_at = CURRENT_TIMESTAMP
        WHERE id = $4 AND company_id = $5
        RETURNING *;
      `, [schedule_name.trim(), department_id, branch_id, scheduleId, companyId]);

      if (updateRes.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Work schedule not found' });
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

      await logAudit(req, 'ATTENDANCE_SETTINGS_UPDATE', `Updated attendance settings for company ${companyId}`, null, result.rows[0], companyId);

      res.json({ success: true, settings: result.rows[0] });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET leave settings & approval workflow
  router.get('/companies/:companyId/leave-settings', async (req, res) => {
    try {
      const companyId = req.params.companyId;
      const leaveSettings = await pgPool.query('SELECT * FROM leave_settings WHERE company_id = $1 ORDER BY id ASC', [companyId]);
      const workflow = await pgPool.query(`
        SELECT aw.*, r.name AS approver_role_name
        FROM approval_workflow aw
        LEFT JOIN roles r ON aw.approver_role_id = r.id
        WHERE aw.company_id = $1 AND aw.module = 'leave'
        ORDER BY aw.step_order ASC;
      `, [companyId]);

      res.json({
        success: true,
        leave_types: leaveSettings.rows,
        approval_workflow: workflow.rows
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST save approval workflow steps
  router.post('/companies/:companyId/approval-workflow', async (req, res) => {
    try {
      const companyId = req.params.companyId;
      const { steps = [] } = req.body;

      await pgPool.query('DELETE FROM approval_workflow WHERE company_id = $1 AND module = \'leave\'', [companyId]);

      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        if (step.approver_role_id) {
          await pgPool.query(`
            INSERT INTO approval_workflow (company_id, module, step_order, approver_role_id, step_label, auto_escalate_hours)
            VALUES ($1, 'leave', $2, $3, $4, $5);
          `, [companyId, i + 1, step.approver_role_id, step.step_label || `Step ${i + 1}`, step.auto_escalate_hours || 48]);
        }
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
      const { company_id, limit = 100 } = req.query;
      let query = `
        SELECT al.*, c.company_name
        FROM audit_logs al
        LEFT JOIN companies c ON al.company_id = c.id
      `;
      const params = [];

      if (company_id) {
        query += ' WHERE al.company_id = $1';
        params.push(company_id);
      }

      query += ` ORDER BY al.created_at DESC LIMIT $${params.length + 1}`;
      params.push(limit);

      const logs = await pgPool.query(query, params);
      res.json({ success: true, audit_logs: logs.rows });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}

module.exports = { createMultiCompanyRouter };
