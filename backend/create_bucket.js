const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.lhgfzerdekwxppzjngyg:625231040236%40Nyn@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres', ssl: { rejectUnauthorized: false } });

async function run() {
  try {
    await pool.query(`INSERT INTO storage.buckets (id, name, public, file_size_limit) VALUES ('mc-attachments', 'mc-attachments', true, 52428800) ON CONFLICT (id) DO UPDATE SET public = true`);
    console.log('Bucket mc-attachments successfully created/updated in DB!');
  } catch (err) {
    console.error('Error creating bucket:', err);
  } finally {
    pool.end();
  }
}
run();
