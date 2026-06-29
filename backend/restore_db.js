const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("❌ Error: DATABASE_URL is not defined in the backend .env file.");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

// Reverse order of dependencies to delete tables safely
const tablesInReverse = [
  'notifications',
  'hod_history',
  'leave_approvals',
  'personal_notes',
  'leave_requests',
  'attendances',
  'user_role',
  'departments',
  'profiles',
  'system_settings',
  'branches',
  'roles'
];

// Correct order of dependencies to insert tables safely
const tablesInOrder = [
  'branches',
  'roles',
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
  let backupFile = process.argv[2];

  if (!backupFile) {
    // Find the latest backup file in backups/db/
    if (!fs.existsSync(backupsDir)) {
      console.error("❌ Error: No backups directory found at 'backend/backups/db/'. Run backup first.");
      process.exit(1);
    }

    const files = fs.readdirSync(backupsDir)
      .filter(f => f.startsWith('db_backup_') && f.endsWith('.json'))
      .sort();

    if (files.length === 0) {
      console.error("❌ Error: No database backup files found in 'backend/backups/db/'.");
      process.exit(1);
    }

    backupFile = path.join(backupsDir, files[files.length - 1]);
    console.log(`ℹ️ No backup file specified. Using the latest: ${files[files.length - 1]}`);
  } else {
    // Check if the user passed relative or absolute path
    if (!path.isAbsolute(backupFile)) {
      backupFile = path.join(process.cwd(), backupFile);
    }
  }

  if (!fs.existsSync(backupFile)) {
    console.error(`❌ Error: Backup file not found at: ${backupFile}`);
    process.exit(1);
  }

  console.log(`⚡ Reading backup from:\n📂 ${backupFile}`);
  let backupData;
  try {
    backupData = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));
  } catch (err) {
    console.error("❌ Failed to parse backup JSON file:", err.message);
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    console.log("\n⚠️ WARNING: This will clear existing tables in the database before restoring. Proceeding...");
    
    await client.query('BEGIN');

    // 1. Clear tables in reverse dependency order
    for (const table of tablesInReverse) {
      // Check if table exists
      const checkTable = await client.query(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1)",
        [table]
      );
      if (checkTable.rows[0].exists) {
        console.log(`- Clearing table: ${table}...`);
        await client.query(`DELETE FROM "${table}"`);
      }
    }

    // 2. Insert data in forward dependency order
    for (const table of tablesInOrder) {
      const rows = backupData.data[table];
      if (!rows || rows.length === 0) {
        console.log(`- Table ${table}: No data to restore.`);
        continue;
      }

      console.log(`- Restoring table: ${table} (${rows.length} rows)...`);
      
      // Get all columns from the first row
      const columns = Object.keys(rows[0]);
      const colNames = columns.map(c => `"${c}"`).join(', ');

      // Insert in batches of 500 rows to avoid parameter count limit
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
    console.log(`\n🎉 Database successfully restored from backup!\n`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("❌ Database restore process failed. Transaction rolled back.");
    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}

runRestore();
