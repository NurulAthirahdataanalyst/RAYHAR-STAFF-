require('dotenv').config({ path: '../.env' });
const { Pool } = require('pg');

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("Error: DATABASE_URL is not set in the environment.");
  process.exit(1);
}

const pool = new Pool({ 
  connectionString: databaseUrl, 
  ssl: { rejectUnauthorized: false } 
});

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
      CREATE POLICY "Allow anon update" ON storage.objects
        FOR UPDATE TO public
        USING (bucket_id = 'mc-attachments')
        WITH CHECK (bucket_id = 'mc-attachments');
    `);
    console.log('Update Policy created!');
  } catch (err) {
    if (err.message.includes('already exists')) {
      console.log('Update Policy already exists.');
    } else {
      console.error('Error creating update policy:', err);
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
