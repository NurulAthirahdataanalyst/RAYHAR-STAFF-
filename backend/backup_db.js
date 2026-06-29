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

const tablesToBackup = [
  'branches',
  'roles',
  'profiles',
  'departments',
  'user_role',
  'attendances',
  'leave_requests',
  'leave_approvals',
  'personal_notes',
  'system_settings',
  'hod_history',
  'notifications'
];

async function runBackup() {
  const backupsDir = path.join(__dirname, 'backups', 'db');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFilename = `db_backup_${timestamp}.json`;
  const backupFilePath = path.join(backupsDir, backupFilename);

  console.log("⚡ Starting database backup...");
  const backupData = {
    timestamp: new Date().toISOString(),
    database: 'supabase_postgres',
    data: {}
  };

  const client = await pool.connect();
  try {
    for (const table of tablesToBackup) {
      console.log(`- Fetching table: ${table}...`);
      try {
        // Check if table exists first
        const checkTable = await client.query(
          "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1)",
          [table]
        );
        
        if (checkTable.rows[0].exists) {
          const res = await client.query(`SELECT * FROM "${table}"`);
          backupData.data[table] = res.rows;
          console.log(`  ✅ Done. Retrieved ${res.rows.length} rows.`);
        } else {
          console.log(`  ⚠️ Table "${table}" does not exist in the database. Skipping.`);
        }
      } catch (err) {
        console.error(`  ❌ Error backing up table "${table}":`, err.message);
      }
    }

    // Write to file
    fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), 'utf-8');
    console.log(`\n🎉 Backup successfully saved to:\n📂 ${backupFilePath}\n`);
  } catch (err) {
    console.error("❌ Backup process failed:", err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

runBackup();
