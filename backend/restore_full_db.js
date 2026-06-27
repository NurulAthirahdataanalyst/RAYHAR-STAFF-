const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("❌ Error: DATABASE_URL is not defined in the .env file.");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

const createTablesSQL = `
-- Drop existing tables to ensure clean schema rebuild
DROP TABLE IF EXISTS notifications, hod_history, leave_approvals, personal_notes, leave_requests, attendances, user_role, user_roles, departments, profiles, system_settings CASCADE;

-- 1. system_settings
CREATE TABLE system_settings (
  setting_key VARCHAR(50) PRIMARY KEY,
  setting_value VARCHAR(255)
);

-- 2. departments
CREATE TABLE departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. profiles
CREATE TABLE profiles (
  user_id VARCHAR(100) PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'Active',
  branch VARCHAR(100),
  phone VARCHAR(50),
  role VARCHAR(50) DEFAULT 'employee',
  department VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. user_role
CREATE TABLE user_role (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  department VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. attendances
CREATE TABLE attendances (
  attendance_id SERIAL PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  clock_in TIMESTAMP WITH TIME ZONE NOT NULL,
  clock_out TIMESTAMP WITH TIME ZONE,
  late_minutes INTEGER DEFAULT 0,
  date DATE,
  status VARCHAR(50) DEFAULT 'ON TIME'
);

-- 6. leave_requests
CREATE TABLE leave_requests (
  leave_id SERIAL PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  leave_type VARCHAR(100) NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  days INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'Pending',
  approver_id VARCHAR(100),
  approver_note TEXT,
  waris_nama VARCHAR(255),
  waris_phone VARCHAR(50),
  waris_alamat TEXT,
  waris_hubungan VARCHAR(100),
  cuti_ganti_tarikh VARCHAR(255),
  cuti_ganti_hari VARCHAR(255),
  cuti_ganti_jam VARCHAR(255),
  cuti_tanpa_gaji_phone VARCHAR(50),
  cuti_tanpa_gaji_signature TEXT,
  mc_file_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  reason TEXT,
  approver_role VARCHAR(100)
);

-- 7. leave_approvals
CREATE TABLE leave_approvals (
  id SERIAL PRIMARY KEY,
  leave_id INTEGER NOT NULL REFERENCES leave_requests(leave_id) ON DELETE CASCADE,
  approver_id VARCHAR(100) NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  approver_role VARCHAR(100),
  status VARCHAR(50) NOT NULL,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. personal_notes
CREATE TABLE personal_notes (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  date DATE NOT NULL,
  note_text TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'note',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. hod_history
CREATE TABLE hod_history (
  id SERIAL PRIMARY KEY,
  department VARCHAR(100) NOT NULL,
  previous_hod_id VARCHAR(100),
  new_hod_id VARCHAR(100) NOT NULL,
  changed_by_id VARCHAR(100),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. notifications
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50),
  is_read BOOLEAN DEFAULT FALSE,
  related_leave_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
`;

const tablesInOrder = [
  'system_settings',
  'departments',
  'profiles',
  'user_role',
  'attendances',
  'leave_requests',
  'personal_notes',
  'leave_approvals',
  'hod_history',
  'notifications'
];

async function runRestore() {
  const backupsDir = path.join(__dirname, 'backups', 'db');
  if (!fs.existsSync(backupsDir)) {
    console.error("❌ Error: No backups directory found.");
    process.exit(1);
  }

  const files = fs.readdirSync(backupsDir)
    .filter(f => f.startsWith('db_backup_') && f.endsWith('.json'))
    .sort();

  if (files.length === 0) {
    console.error("❌ Error: No backup files found.");
    process.exit(1);
  }

  const backupFile = path.join(backupsDir, files[files.length - 1]);
  console.log(`ℹ️ Reading backup from: ${files[files.length - 1]}`);

  let backupData;
  try {
    backupData = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));
  } catch (err) {
    console.error("❌ Failed to parse backup JSON file:", err.message);
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    console.log("⚡ Rebuilding schema (dropping and creating tables)...");
    await client.query(createSQL(client)); // we will execute the query block
    
    // We run the queries inside a transaction
    await client.query('BEGIN');
    
    // Split the createSQL and run them sequentially
    const statements = createTablesSQL.split(';').map(s => s.trim()).filter(s => s.length > 0);
    for (const stmt of statements) {
      await client.query(stmt);
    }
    console.log("✅ Schema rebuilt successfully.");

    // Now seed the data
    const validUserIds = new Set();
    const validLeaveIds = new Set();

    for (const table of tablesInOrder) {
      let rows = backupData.data[table];
      if (!rows || rows.length === 0) {
        console.log(`- Table ${table}: No data to restore.`);
        continue;
      }

      // Collect validation IDs
      if (table === 'profiles') {
        rows.forEach(r => validUserIds.add(r.user_id));
      }

      // Filter orphaned records
      if (['user_role', 'attendances', 'leave_requests', 'personal_notes', 'notifications'].includes(table)) {
        rows = rows.filter(r => {
          if (!validUserIds.has(r.user_id)) {
            console.log(`  ⚠️ Skipping orphaned row in ${table}: user_id "${r.user_id}" not found in profiles.`);
            return false;
          }
          return true;
        });
      }

      if (table === 'leave_requests') {
        rows.forEach(r => validLeaveIds.add(r.leave_id));
      }

      if (table === 'leave_approvals') {
        rows = rows.filter(r => {
          if (!validLeaveIds.has(r.leave_id)) {
            console.log(`  ⚠️ Skipping orphaned row in leave_approvals: leave_id "${r.leave_id}" not found in leave_requests.`);
            return false;
          }
          if (!validUserIds.has(r.approver_id)) {
            console.log(`  ⚠️ Skipping orphaned row in leave_approvals: approver_id "${r.approver_id}" not found in profiles.`);
            return false;
          }
          return true;
        });
      }

      if (rows.length === 0) {
        console.log(`- Table ${table}: No valid data to restore after filtering.`);
        continue;
      }

      console.log(`- Restoring table: ${table} (${rows.length} rows)...`);
      
      const columns = Object.keys(rows[0]);
      const colNames = columns.map(c => `"${c}"`).join(', ');

      const batchSize = Math.floor(60000 / columns.length);
      for (let i = 0; i < rows.length; i += batchSize) {
        const batchRows = rows.slice(i, i + batchSize);
        const valuesPlaceholders = [];
        const flatValues = [];
        let paramCounter = 1;

        for (const row of batchRows) {
          const rowPlaceholders = [];
          for (const col of columns) {
            rowPlaceholders.push(`$${paramCounter++}`);
            flatValues.push(row[col]);
          }
          valuesPlaceholders.push(`(${rowPlaceholders.join(', ')})`);
        }

        const sql = `INSERT INTO "${table}" (${colNames}) VALUES ${valuesPlaceholders.join(', ')}`;
        await client.query(sql, flatValues);
      }
      console.log(`  ✅ Done.`);
    }

    await client.query('COMMIT');
    console.log(`\n🎉 Database schema recreated and data successfully restored!\n`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("❌ Database restore process failed. Transaction rolled back.");
    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}

function createSQL(client) {
  return "SELECT 1";
}

runRestore();
