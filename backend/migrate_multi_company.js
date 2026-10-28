const { Pool } = require('./node_modules/pg');
require('./node_modules/dotenv').config({ path: './.env' });
const { getDbSslConfig } = require('./utils/dbSsl');

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL,
    ssl: getDbSslConfig()
  });

  try {
    console.log('--- Starting Multi-Company Database Migration ---');

    // 1. COMPANIES TABLE
    await pool.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id SERIAL PRIMARY KEY,
        parent_company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
        company_name VARCHAR(255) NOT NULL UNIQUE,
        company_type VARCHAR(50) NOT NULL CHECK (company_type IN ('main', 'subsidiary')),
        company_address TEXT NOT NULL,
        email VARCHAR(255) NOT NULL,
        logo_url TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ companies table ready');

    // Seed Rayhar Travels as Main Company (id = 1) if not exists
    const mainCheck = await pool.query(`SELECT id FROM companies WHERE id = 1 OR company_name = 'Rayhar Travels';`);
    if (mainCheck.rows.length === 0) {
      await pool.query(`
        INSERT INTO companies (id, parent_company_id, company_name, company_type, company_address, email, logo_url, status)
        OVERRIDING SYSTEM VALUE
        VALUES (1, NULL, 'Rayhar Travels', 'main', 'No. 1, Jalan Terengganu, 20100 Kuala Terengganu, Terengganu', 'hr@rayhar.com', '/assets/rayhar-logo.png', 'active');
      `);
      console.log('✓ Seeded Rayhar Travels as Main Company (id = 1)');
    } else {
      console.log('✓ Rayhar Travels already registered in companies');
    }

    // 2. ALTER BRANCHES (add company_id if not present)
    await pool.query(`
      ALTER TABLE branches ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL;
    `);
    await pool.query(`
      UPDATE branches SET company_id = 1 WHERE company_id IS NULL;
    `);
    console.log('✓ branches table linked to company_id (defaulted to 1)');

    // 3. BRANCH GEOFENCE SETTINGS
    await pool.query(`
      CREATE TABLE IF NOT EXISTS branch_geofence_settings (
        id SERIAL PRIMARY KEY,
        branch_code VARCHAR(50) NOT NULL,
        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        mode VARCHAR(50) NOT NULL DEFAULT 'normal' CHECK (mode IN ('normal', 'night_shift', 'temporary', 'emergency')),
        radius_meter INTEGER NOT NULL DEFAULT 50,
        active_from TIME WITHOUT TIME ZONE,
        active_until TIME WITHOUT TIME ZONE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(branch_code, mode)
      );
    `);
    console.log('✓ branch_geofence_settings table ready');

    // Populate default normal geofence (50m) for existing branches
    const allBranches = await pool.query(`SELECT code, company_id, radius FROM branches`);
    for (const b of allBranches.rows) {
      const radiusVal = b.radius || 50;
      await pool.query(`
        INSERT INTO branch_geofence_settings (branch_code, company_id, mode, radius_meter)
        VALUES ($1, $2, 'normal', $3)
        ON CONFLICT (branch_code, mode) DO UPDATE SET radius_meter = EXCLUDED.radius_meter;
      `, [b.code, b.company_id || 1, radiusVal]);
    }
    console.log('✓ branch_geofence_settings baseline records synchronized');

    // 4. ALTER DEPARTMENTS (add company_id)
    await pool.query(`
      ALTER TABLE departments ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL;
    `);
    await pool.query(`
      UPDATE departments SET company_id = 1 WHERE company_id IS NULL;
    `);
    console.log('✓ departments linked to company_id (defaulted to 1)');

    // 5. ALTER ROLES (add company_id, role_type, scope_type)
    await pool.query(`
      ALTER TABLE roles ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;
      ALTER TABLE roles ADD COLUMN IF NOT EXISTS role_type VARCHAR(50) DEFAULT 'Operational Role';
      ALTER TABLE roles ADD COLUMN IF NOT EXISTS scope_type VARCHAR(50) DEFAULT 'Current Company Only';
    `);
    await pool.query(`
      UPDATE roles SET company_id = 1 WHERE company_id IS NULL;
    `);
    // Tag system roles appropriately
    await pool.query(`
      UPDATE roles SET 
        role_type = 'Management Role', 
        scope_type = 'Parent Group Access' 
      WHERE LOWER(name) IN ('managing director', 'operation manager', 'hr admin');

      UPDATE roles SET 
        role_type = 'Department Role', 
        scope_type = 'Current Company Only' 
      WHERE LOWER(name) = 'head of department';

      UPDATE roles SET 
        role_type = 'Employee Role', 
        scope_type = 'Current Company Only' 
      WHERE LOWER(name) = 'employee';
    `);
    console.log('✓ roles table enhanced with company_id, role_type & scope_type');

    // 6. ROLE TEMPLATES
    await pool.query(`
      CREATE TABLE IF NOT EXISTS role_templates (
        id SERIAL PRIMARY KEY,
        template_name VARCHAR(100) NOT NULL UNIQUE,
        display_name VARCHAR(150) NOT NULL,
        description TEXT,
        role_type VARCHAR(50) DEFAULT 'Operational Role',
        default_permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Seed initial templates
    await pool.query(`
      INSERT INTO role_templates (template_name, display_name, description, role_type, default_permissions)
      VALUES 
        ('Standard Employee', 'Standard Employee', 'Basic operational check-in and leave application', 'Employee Role', '["attendance.view_own", "leave.apply_own", "profile.view_own"]'::jsonb),
        ('Supervisor', 'Operational Supervisor', 'Monitors branch team attendance and endorses leave requests', 'Operational Role', '["attendance.view_branch", "leave.endorse", "reports.view_branch"]'::jsonb),
        ('HR Executive', 'HR Executive', 'Manages personnel and reviews leave and attendance records', 'Department Role', '["employees.manage", "attendance.view_all", "leave.manage", "reports.export"]'::jsonb),
        ('Manager', 'Branch / Department Manager', 'Approves leave and reviews branch workforce metrics', 'Management Role', '["attendance.view_all", "leave.approve", "reports.view_all", "branch.manage"]'::jsonb)
      ON CONFLICT (template_name) DO NOTHING;
    `);
    console.log('✓ role_templates table created and seeded');

    // 7. COMPANY USER ROLES (Multi-role constraint)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS company_user_roles (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
        role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
        branch_id VARCHAR(100) REFERENCES branches(code) ON DELETE SET NULL,
        department_id VARCHAR(100),
        position VARCHAR(150),
        assigned_date DATE DEFAULT CURRENT_DATE,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, company_id, role_id)
      );
    `);
    console.log('✓ company_user_roles table ready');

    // Backfill existing profiles into company_user_roles
    const existingProfiles = await pool.query(`SELECT user_id, role_id, branch, department FROM profiles;`);
    for (const p of existingProfiles.rows) {
      if (p.role_id) {
        await pool.query(`
          INSERT INTO company_user_roles (user_id, company_id, role_id, branch_id, department_id, is_default)
          VALUES ($1, 1, $2, $3, $4, TRUE)
          ON CONFLICT (user_id, company_id, role_id) DO NOTHING;
        `, [p.user_id, p.role_id, p.branch, p.department]);
      }
    }
    console.log('✓ Backfilled existing staff into company_user_roles for Rayhar Travels (id = 1)');

    // 8. EMPLOYEE COMPANY HISTORY
    await pool.query(`
      CREATE TABLE IF NOT EXISTS employee_company_history (
        id SERIAL PRIMARY KEY,
        employee_id VARCHAR(255) NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
        previous_company VARCHAR(255) NOT NULL,
        new_company VARCHAR(255) NOT NULL,
        previous_role VARCHAR(150),
        new_role VARCHAR(150),
        previous_branch VARCHAR(100),
        new_branch VARCHAR(100),
        previous_department VARCHAR(100),
        new_department VARCHAR(100),
        effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
        reason TEXT NOT NULL,
        approved_by VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ employee_company_history table ready');

    // 9. RELATIONAL APPROVAL WORKFLOW
    await pool.query(`
      CREATE TABLE IF NOT EXISTS approval_workflow (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        module VARCHAR(50) NOT NULL DEFAULT 'leave' CHECK (module IN ('leave', 'attendance_correction', 'outstation', 'overtime')),
        step_order INTEGER NOT NULL CHECK (step_order >= 1),
        approver_role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        step_label VARCHAR(100) NOT NULL,
        auto_escalate_hours INTEGER DEFAULT 48,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(company_id, module, step_order)
      );
    `);
    console.log('✓ approval_workflow table ready');

    // 10. WORK SCHEDULES & BREAKS
    await pool.query(`
      CREATE TABLE IF NOT EXISTS work_schedules (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        department_id VARCHAR(100),
        branch_id VARCHAR(100) REFERENCES branches(code) ON DELETE SET NULL,
        schedule_name VARCHAR(150) NOT NULL,
        effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS work_schedule_days (
        id SERIAL PRIMARY KEY,
        schedule_id INTEGER NOT NULL REFERENCES work_schedules(id) ON DELETE CASCADE,
        day_of_week VARCHAR(15) NOT NULL CHECK (day_of_week IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
        start_time TIME WITHOUT TIME ZONE,
        end_time TIME WITHOUT TIME ZONE,
        is_working_day BOOLEAN NOT NULL DEFAULT TRUE,
        UNIQUE(schedule_id, day_of_week)
      );

      CREATE TABLE IF NOT EXISTS break_schedules (
        id SERIAL PRIMARY KEY,
        schedule_id INTEGER NOT NULL REFERENCES work_schedules(id) ON DELETE CASCADE,
        break_name VARCHAR(100) NOT NULL,
        break_type VARCHAR(50) DEFAULT 'lunch' CHECK (break_type IN ('lunch', 'prayer', 'custom')),
        start_time TIME WITHOUT TIME ZONE NOT NULL,
        end_time TIME WITHOUT TIME ZONE NOT NULL
      );

      CREATE TABLE IF NOT EXISTS employee_work_schedule (
        id SERIAL PRIMARY KEY,
        employee_id VARCHAR(255) NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
        schedule_id INTEGER NOT NULL REFERENCES work_schedules(id) ON DELETE RESTRICT,
        effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
        assigned_by VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ work_schedules, work_schedule_days, break_schedules, employee_work_schedule tables ready');

    // Seed Default Schedule for Rayhar Travels
    const schedCheck = await pool.query(`SELECT id FROM work_schedules WHERE company_id = 1 AND schedule_name = 'Standard Office Hours';`);
    let scheduleId;
    if (schedCheck.rows.length === 0) {
      const insSched = await pool.query(`
        INSERT INTO work_schedules (company_id, schedule_name, effective_date, status)
        VALUES (1, 'Standard Office Hours', CURRENT_DATE, 'active')
        RETURNING id;
      `);
      scheduleId = insSched.rows[0].id;

      const days = [
        { day: 'Monday', start: '08:30:00', end: '17:30:00', working: true },
        { day: 'Tuesday', start: '08:30:00', end: '17:30:00', working: true },
        { day: 'Wednesday', start: '08:30:00', end: '17:30:00', working: true },
        { day: 'Thursday', start: '08:30:00', end: '17:30:00', working: true },
        { day: 'Friday', start: '08:30:00', end: '17:30:00', working: true },
        { day: 'Saturday', start: null, end: null, working: false },
        { day: 'Sunday', start: null, end: null, working: false }
      ];

      for (const d of days) {
        await pool.query(`
          INSERT INTO work_schedule_days (schedule_id, day_of_week, start_time, end_time, is_working_day)
          VALUES ($1, $2, $3, $4, $5);
        `, [scheduleId, d.day, d.start, d.end, d.working]);
      }

      await pool.query(`
        INSERT INTO break_schedules (schedule_id, break_name, break_type, start_time, end_time)
        VALUES ($1, 'Lunch Break', 'lunch', '12:30:00', '14:00:00');
      `, [scheduleId]);
      console.log('✓ Seeded Standard Office Hours (8:30-17:30) for Rayhar Travels');
    }

    // 11. ATTENDANCE SETTINGS
    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance_settings (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
        late_threshold_minutes INTEGER DEFAULT 10,
        early_checkout_minutes INTEGER DEFAULT 0,
        min_working_hours NUMERIC(4,2) DEFAULT 8.00,
        overtime_enabled BOOLEAN DEFAULT FALSE,
        gps_required BOOLEAN DEFAULT TRUE,
        geofence_enforcement VARCHAR(50) DEFAULT 'strict' CHECK (geofence_enforcement IN ('strict', 'relaxed', 'disabled')),
        face_verification_required BOOLEAN DEFAULT FALSE,
        calculation_rule_version INTEGER DEFAULT 1,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await pool.query(`
      INSERT INTO attendance_settings (company_id, late_threshold_minutes, early_checkout_minutes, min_working_hours, gps_required, geofence_enforcement)
      VALUES (1, 10, 0, 8.00, TRUE, 'strict')
      ON CONFLICT (company_id) DO NOTHING;
    `);
    console.log('✓ attendance_settings table ready & seeded for Rayhar Travels');

    // 12. LEAVE SETTINGS
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leave_settings (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        leave_type VARCHAR(50) NOT NULL,
        default_entitlement_days INTEGER NOT NULL DEFAULT 14,
        escalate_to_parent BOOLEAN DEFAULT TRUE,
        mc_required BOOLEAN DEFAULT TRUE,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(company_id, leave_type)
      );
    `);
    await pool.query(`
      INSERT INTO leave_settings (company_id, leave_type, default_entitlement_days, escalate_to_parent, mc_required)
      VALUES 
        (1, 'Annual Leave', 14, TRUE, FALSE),
        (1, 'Sick Leave', 14, TRUE, TRUE),
        (1, 'Emergency Leave', 5, TRUE, FALSE),
        (1, 'Replacement Leave', 0, TRUE, FALSE),
        (1, 'Company Leave', 0, TRUE, FALSE)
      ON CONFLICT (company_id, leave_type) DO NOTHING;
    `);
    console.log('✓ leave_settings table ready & seeded for Rayhar Travels');

    // 13. IMMUTABLE ENTERPRISE AUDIT LOGS
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        operator_id VARCHAR(255),
        operator_name VARCHAR(255) NOT NULL,
        operator_role VARCHAR(100),
        company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
        action_category VARCHAR(100) NOT NULL,
        action_description TEXT NOT NULL,
        old_values JSONB,
        new_values JSONB,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ audit_logs table ready');

    console.log('--- Multi-Company Database Migration Successfully Finished! ---');
  } catch (err) {
    console.error('Migration Error:', err);
    throw err;
  } finally {
    await pool.end();
  }
}

runMigration().catch(err => {
  console.error(err);
  process.exit(1);
});
