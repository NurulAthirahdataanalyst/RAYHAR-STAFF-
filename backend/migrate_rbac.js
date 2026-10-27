const { Pool } = require("pg");
require("dotenv").config({ path: __dirname + "/.env" });

const connectionString = process.env.DATABASE_URL;
const dbConfig = {
  host: process.env.DB_HOST || process.env.MYSQLHOST,
  user: process.env.DB_USER || process.env.MYSQLUSER,
  password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD,
  database: process.env.DB_NAME || process.env.MYSQLDATABASE,
  port: Number(process.env.DB_PORT || process.env.MYSQLPORT || 5432),
  ssl: { rejectUnauthorized: false }
};

const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false }, max: 10 })
  : new Pool(dbConfig);

const PERMISSION_DEFINITIONS = [
  // Dashboard
  { module: "Dashboard", permission_key: "dashboard.view", display_name: "Dashboard" },
  
  // Calendar
  { module: "Calendar", permission_key: "calendar.work", display_name: "Work Calendar" },
  { module: "Calendar", permission_key: "calendar.company_leave", display_name: "Company Leave Calendar" },
  
  // Attendance
  { module: "Attendance", permission_key: "attendance.my", display_name: "My Attendance" },
  { module: "Attendance", permission_key: "attendance.team", display_name: "Team Attendance" },
  
  // Leave Management
  { module: "Leave Management", permission_key: "leave.apply", display_name: "Leave Application" },
  { module: "Leave Management", permission_key: "leave.my_requests", display_name: "My Leave Requests" },
  
  // Leave Administration
  { module: "Leave Administration", permission_key: "leave.approval", display_name: "Leave Approval" },
  { module: "Leave Administration", permission_key: "leave.team_requests", display_name: "Team Leave Requests" },
  { module: "Leave Administration", permission_key: "leave.calendar", display_name: "Leave Calendar" },
  { module: "Leave Administration", permission_key: "leave.entitlement", display_name: "Leave Entitlement Management" },
  
  // Employee Management
  { module: "Employee Management", permission_key: "employee.directory", display_name: "Employee Directory" },
  { module: "Employee Management", permission_key: "employee.department", display_name: "Department" },
  { module: "Employee Management", permission_key: "employee.role", display_name: "Role Management" },
  { module: "Employee Management", permission_key: "employee.branch", display_name: "Branch Management" },
  { module: "Employee Management", permission_key: "employee.temporary_assignment", display_name: "Temporary Assignment" },
  
  // Outstation
  { module: "Outstation", permission_key: "outstation.my", display_name: "My Outstation" },
  { module: "Outstation", permission_key: "outstation.my_calendar", display_name: "My Outstation Calendar" },
  { module: "Outstation", permission_key: "outstation.dashboard", display_name: "Outstation Dashboard" },
  { module: "Outstation", permission_key: "outstation.assignment", display_name: "Outstation Assignment" },
  { module: "Outstation", permission_key: "outstation.analytics", display_name: "Outstation Analytics" },
  { module: "Outstation", permission_key: "outstation.calendar", display_name: "Outstation Calendar" },
  
  // Analytics
  { module: "Analytics", permission_key: "analytics.employee", display_name: "Performance Insights" },
  { module: "Analytics", permission_key: "analytics.attendance", display_name: "Attendance Dashboard" },
  { module: "Analytics", permission_key: "analytics.leave", display_name: "Leave Analytics" },
  { module: "Analytics", permission_key: "analytics.workforce", display_name: "Workforce Insights" },
  { module: "Analytics", permission_key: "analytics.workforce_calendar", display_name: "Workforce Calendar" },
  
  // Reports
  { module: "Reports", permission_key: "report.attendance", display_name: "Attendance Reports" },
  { module: "Reports", permission_key: "report.leave", display_name: "Leave Reports" },
  { module: "Reports", permission_key: "report.outstation", display_name: "Outstation Reports" },
  { module: "Reports", permission_key: "report.department", display_name: "Department & Branch Report" },
  
  // GPS
  { module: "GPS", permission_key: "gps.tracker", display_name: "GPS Location Tracker" },
  { module: "GPS", permission_key: "gps.live_tracker", display_name: "Live Tracker" },
  { module: "GPS", permission_key: "gps.location_history", display_name: "Location History" },
  
  // Settings
  { module: "Settings", permission_key: "settings.manage", display_name: "Settings" }
];

const SYSTEM_ROLES = [
  {
    name: "Employee",
    description: "Standard employee access with self-service attendance, leave applications, outstation requests, and personal records.",
    legacyNames: ["employee"],
    permissions: [
      "dashboard.view",
      "calendar.work",
      "calendar.company_leave",
      "attendance.my",
      "leave.apply",
      "leave.my_requests",
      "outstation.my",
      "outstation.my_calendar",
      "report.attendance",
      "report.leave",
      "report.outstation",
      "report.department",
      "gps.tracker",
      "gps.location_history"
    ]
  },
  {
    name: "Head of Department",
    description: "Departmental management role with team attendance monitoring, leave approvals, outstation assignments, and analytics.",
    legacyNames: ["head_of_department", "hod"],
    permissions: [
      // Everything employee has:
      "dashboard.view",
      "calendar.work",
      "calendar.company_leave",
      "attendance.my",
      "attendance.team",
      "leave.apply",
      "leave.my_requests",
      "leave.approval",
      "leave.team_requests",
      "leave.calendar",
      "employee.directory",
      "employee.temporary_assignment",
      "outstation.my",
      "outstation.my_calendar",
      "outstation.dashboard",
      "outstation.assignment",
      "outstation.analytics",
      "outstation.calendar",
      "analytics.attendance",
      "analytics.leave",
      "analytics.workforce",
      "analytics.workforce_calendar",
      "report.attendance",
      "report.leave",
      "report.outstation",
      "report.department",
      "gps.tracker",
      "gps.live_tracker",
      "gps.location_history"
    ]
  },
  {
    name: "Branch Leader",
    description: "Branch administration with team oversight, leave approvals, attendance tracking, and branch-level reporting.",
    legacyNames: ["branch_leader"],
    permissions: [
      // Same as Head of Department
      "dashboard.view",
      "calendar.work",
      "calendar.company_leave",
      "attendance.my",
      "attendance.team",
      "leave.apply",
      "leave.my_requests",
      "leave.approval",
      "leave.team_requests",
      "leave.calendar",
      "employee.directory",
      "employee.temporary_assignment",
      "outstation.my",
      "outstation.my_calendar",
      "outstation.dashboard",
      "outstation.assignment",
      "outstation.analytics",
      "outstation.calendar",
      "analytics.attendance",
      "analytics.leave",
      "analytics.workforce",
      "analytics.workforce_calendar",
      "report.attendance",
      "report.leave",
      "report.outstation",
      "report.department",
      "gps.tracker",
      "gps.live_tracker",
      "gps.location_history"
    ]
  },
  {
    name: "HR Admin",
    description: "Full enterprise administrative control over employees, custom roles, departments, branches, leaves, and system configurations.",
    legacyNames: ["hr_admin", "admin", "hr"],
    // Full administrative permissions (All permissions)
    permissions: PERMISSION_DEFINITIONS.map(p => p.permission_key)
  },
  {
    name: "Operation Manager",
    description: "High-level operational leadership overseeing organizational workflow, approvals, workforce insights, and field operations.",
    legacyNames: ["operation_manager", "finance_manager", "finance manager", "operation manager"],
    permissions: [
      "dashboard.view",
      "calendar.work",
      "calendar.company_leave",
      "attendance.my",
      "attendance.team",
      "leave.apply",
      "leave.my_requests",
      "leave.approval",
      "leave.team_requests",
      "leave.calendar",
      "leave.entitlement",
      "employee.directory",
      "employee.department",
      "employee.role",
      "employee.branch",
      "employee.temporary_assignment",
      "outstation.my",
      "outstation.my_calendar",
      "outstation.dashboard",
      "outstation.assignment",
      "outstation.analytics",
      "outstation.calendar",
      "analytics.attendance",
      "analytics.leave",
      "analytics.workforce",
      "analytics.workforce_calendar",
      "report.attendance",
      "report.leave",
      "report.outstation",
      "report.department",
      "gps.tracker",
      "gps.live_tracker"
    ]
  },
  {
    name: "Managing Director",
    description: "Executive leadership oversight across company-wide attendance, workforce analytics, high-level approvals, and organizational reports.",
    legacyNames: ["managing_director", "md"],
    permissions: [
      "dashboard.view",
      "calendar.work",
      "calendar.company_leave",
      "attendance.my",
      "attendance.team",
      "leave.apply",
      "leave.my_requests",
      "leave.approval",
      "leave.team_requests",
      "leave.calendar",
      "leave.entitlement",
      "employee.directory",
      "employee.department",
      "employee.role",
      "employee.branch",
      "employee.temporary_assignment",
      "outstation.my",
      "outstation.my_calendar",
      "outstation.dashboard",
      "outstation.assignment",
      "outstation.analytics",
      "outstation.calendar",
      "analytics.attendance",
      "analytics.leave",
      "analytics.workforce",
      "analytics.workforce_calendar",
      "report.attendance",
      "report.leave",
      "report.outstation",
      "report.department",
      "gps.tracker",
      "gps.live_tracker"
    ]
  }
];

async function migrateRBAC() {
  const client = await pool.connect();
  try {
    console.log("Starting RBAC Database Migration...");
    await client.query("BEGIN");

    // 1. Ensure columns exist on roles table
    await client.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        is_system_role BOOLEAN DEFAULT FALSE,
        status VARCHAR(50) DEFAULT 'Active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`ALTER TABLE roles ADD COLUMN IF NOT EXISTS description TEXT;`);
    await client.query(`ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_system_role BOOLEAN DEFAULT FALSE;`);
    await client.query(`ALTER TABLE roles ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active';`);
    await client.query(`ALTER TABLE roles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;`);

    // 2. Add role_id to profiles and user_role
    await client.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES roles(id) ON DELETE SET NULL;`);
    await client.query(`ALTER TABLE user_role ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES roles(id) ON DELETE SET NULL;`);

    // 3. Create permissions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id SERIAL PRIMARY KEY,
        module VARCHAR(100) NOT NULL,
        permission_key VARCHAR(100) NOT NULL UNIQUE,
        display_name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Create role_permissions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (role_id, permission_id)
      );
    `);

    // 5. Seed / update permissions
    console.log("Seeding permissions...");
    const permMap = new Map(); // permission_key -> id
    for (const perm of PERMISSION_DEFINITIONS) {
      const res = await client.query(
        `INSERT INTO permissions (module, permission_key, display_name)
         VALUES ($1, $2, $3)
         ON CONFLICT (permission_key) DO UPDATE 
         SET module = EXCLUDED.module, display_name = EXCLUDED.display_name
         RETURNING id, permission_key`,
        [perm.module, perm.permission_key, perm.display_name]
      );
      permMap.set(res.rows[0].permission_key, res.rows[0].id);
    }
    console.log(`Seeded ${permMap.size} permissions.`);

    // 6. Ensure the 6 System Roles exist and have is_system_role = true
    console.log("Configuring System Roles...");
    const roleIdMap = new Map(); // role_name -> id

    for (const sysRole of SYSTEM_ROLES) {
      // Find existing role by name or any of its legacy names
      const findRes = await client.query(
        `SELECT id, name FROM roles WHERE LOWER(name) = LOWER($1) OR name = ANY($2::text[]) LIMIT 1`,
        [sysRole.name, sysRole.legacyNames]
      );

      let roleId;
      if (findRes.rows.length > 0) {
        roleId = findRes.rows[0].id;
        await client.query(
          `UPDATE roles 
           SET name = $1, description = $2, is_system_role = TRUE, status = 'Active', updated_at = NOW() 
           WHERE id = $3`,
          [sysRole.name, sysRole.description, roleId]
        );
      } else {
        const insertRes = await client.query(
          `INSERT INTO roles (name, description, is_system_role, status)
           VALUES ($1, $2, TRUE, 'Active')
           RETURNING id`,
          [sysRole.name, sysRole.description]
        );
        roleId = insertRes.rows[0].id;
      }
      roleIdMap.set(sysRole.name, roleId);

      // Clean existing permissions for this system role and re-assign default
      await client.query(`DELETE FROM role_permissions WHERE role_id = $1`, [roleId]);
      for (const pKey of sysRole.permissions) {
        const permId = permMap.get(pKey);
        if (permId) {
          await client.query(
            `INSERT INTO role_permissions (role_id, permission_id)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [roleId, permId]
          );
        }
      }
      console.log(`System role "${sysRole.name}" configured with ${sysRole.permissions.length} permissions.`);
    }

    // 7. Backfill role_id in profiles and user_role
    console.log("Backfilling role_id for existing users...");
    for (const sysRole of SYSTEM_ROLES) {
      const roleId = roleIdMap.get(sysRole.name);
      const nameVariants = [sysRole.name.toLowerCase(), ...sysRole.legacyNames.map(n => n.toLowerCase())];

      // Update profiles
      await client.query(
        `UPDATE profiles 
         SET role_id = $1 
         WHERE role_id IS NULL AND LOWER(role) = ANY($2::text[])`,
        [roleId, nameVariants]
      );

      // Update user_role
      await client.query(
        `UPDATE user_role 
         SET role_id = $1 
         WHERE role_id IS NULL AND LOWER(role) = ANY($2::text[])`,
        [roleId, nameVariants]
      );
    }

    // Fallback: any profiles still missing role_id default to Employee role_id
    const empRoleId = roleIdMap.get("Employee");
    if (empRoleId) {
      await client.query(`UPDATE profiles SET role_id = $1 WHERE role_id IS NULL`, [empRoleId]);
      await client.query(`UPDATE user_role SET role_id = $1 WHERE role_id IS NULL`, [empRoleId]);
    }

    await client.query("COMMIT");
    console.log("✅ RBAC Database Migration Completed Successfully!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Migration failed, rolled back:", err);
    throw err;
  } finally {
    client.release();
    pool.end();
  }
}

migrateRBAC().catch(err => {
  console.error("Migration fatal error:", err);
  process.exit(1);
});
