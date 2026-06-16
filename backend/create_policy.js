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
      console.log('Insert Policy already exists.');
    } else {
      console.error('Error creating insert policy:', err);
    }
  }

  try {
    await pool.query(`
      CREATE POLICY "Allow public select" ON storage.objects
        FOR SELECT TO public
        USING (bucket_id = 'mc-attachments');
    `);
    console.log('Select Policy created!');
  } catch (err) {
    if (err.message.includes('already exists')) {
      console.log('Select Policy already exists.');
    } else {
      console.error('Error creating select policy:', err);
    }
  }

  pool.end();
}
run();
