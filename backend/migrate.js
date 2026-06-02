const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:[625231040236@Nyn]@db.lhgfzerdekwxppzjngyg.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  try {
    console.log("Creating personal_notes table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS personal_notes (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(100) NOT NULL,
        date DATE NOT NULL,
        note_text TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'note',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE
      );
    `);
    
    // Add an index on user_id and date for faster lookups
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_personal_notes_user_date ON personal_notes(user_id, date);
    `);
    
    console.log("Migration completed successfully.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    pool.end();
  }
}

migrate();
