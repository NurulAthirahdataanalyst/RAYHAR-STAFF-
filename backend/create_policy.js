const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.lhgfzerdekwxppzjngyg:625231040236%40Nyn@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres', ssl: { rejectUnauthorized: false } });

async function run() {
  try {
    await pool.query(`
      CREATE POLICY "Allow anon insert" ON storage.objects
        FOR INSERT TO public
        WITH CHECK (bucket_id = 'mc-attachments');
    `);
    console.log('Insert Policy created!');
  } catch (err) {
    if (err.message.includes('already exists')) {
      console.log('Policy already exists.');
    } else {
      console.error('Error creating policy:', err);
    }
  } finally {
    pool.end();
  }
}
run();
