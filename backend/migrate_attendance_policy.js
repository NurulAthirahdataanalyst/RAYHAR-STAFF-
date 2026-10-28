const { Pool } = require('pg');
require('dotenv').config({ path: 'backend/.env' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  try {
    console.log('--- Migrating attendance_policy_history ---');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance_policy_history (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        late_threshold_minutes INTEGER NOT NULL,
        start_time TIME DEFAULT '08:30:00',
        cutoff_time TIME NOT NULL,
        effective_date DATE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ attendance_policy_history table verified.');

    // Seed initial history from attendance_settings if empty
    const { rows: historyRows } = await pool.query('SELECT COUNT(*) as count FROM attendance_policy_history');
    if (parseInt(historyRows[0].count) === 0) {
      await pool.query(`
        INSERT INTO attendance_policy_history (company_id, late_threshold_minutes, start_time, cutoff_time, effective_date)
        SELECT 
          s.company_id,
          s.late_threshold_minutes,
          '08:30:00'::time,
          ('08:30:00'::time + (s.late_threshold_minutes || ' minutes')::interval)::time,
          COALESCE(s.updated_at::date, CURRENT_DATE)
        FROM attendance_settings s
      `);
      console.log('✓ Seeded initial attendance_policy_history from attendance_settings.');
    }

    // Ensure Rayhar Travels (id=1) is configured to 30 mins late threshold
    await pool.query('UPDATE attendance_settings SET late_threshold_minutes = 30, updated_at = CURRENT_TIMESTAMP WHERE company_id = 1');
    await pool.query(`
      INSERT INTO attendance_policy_history (company_id, late_threshold_minutes, start_time, cutoff_time, effective_date)
      VALUES (1, 30, '08:30:00'::time, '09:00:00'::time, CURRENT_DATE)
    `);
    console.log('✓ Rayhar Travels (company 1) updated to 30 mins grace (09:00:00 cutoff)');

    const { rows: allHist } = await pool.query('SELECT * FROM attendance_policy_history ORDER BY id ASC');
    console.log('All attendance_policy_history:', allHist);

  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await pool.end();
  }
}

migrate();
