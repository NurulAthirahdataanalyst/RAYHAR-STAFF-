const { Pool } = require('pg');
const dotenv = require('dotenv');

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

async function fixSequences() {
  const client = await pool.connect();
  try {
    console.log("⚡ Syncing PostgreSQL primary key sequences...");
    
    const queries = [
      "SELECT setval('departments_id_seq', COALESCE((SELECT MAX(id) FROM departments), 0) + 1, false)",
      "SELECT setval('user_role_id_seq', COALESCE((SELECT MAX(id) FROM user_role), 0) + 1, false)",
      "SELECT setval('attendances_attendance_id_seq', COALESCE((SELECT MAX(attendance_id) FROM attendances), 0) + 1, false)",
      "SELECT setval('leave_requests_leave_id_seq', COALESCE((SELECT MAX(leave_id) FROM leave_requests), 0) + 1, false)",
      "SELECT setval('leave_approvals_id_seq', COALESCE((SELECT MAX(id) FROM leave_approvals), 0) + 1, false)",
      "SELECT setval('personal_notes_id_seq', COALESCE((SELECT MAX(id) FROM personal_notes), 0) + 1, false)",
      "SELECT setval('hod_history_id_seq', COALESCE((SELECT MAX(id) FROM hod_history), 0) + 1, false)",
      "SELECT setval('notifications_id_seq', COALESCE((SELECT MAX(id) FROM notifications), 0) + 1, false)"
    ];

    for (const q of queries) {
      await client.query(q);
    }
    
    console.log("🎉 All sequence generators successfully synchronized!");
  } catch (err) {
    console.error("❌ Failed to synchronize sequences:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

fixSequences();
