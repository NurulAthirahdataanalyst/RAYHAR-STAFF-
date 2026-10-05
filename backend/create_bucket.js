require('dotenv').config({ path: '../.env' });
const { Pool } = require('pg');

const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres.xvpebtompjcjfvuzeumo:RayharTravel2026@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres';

const pool = new Pool({ 
  connectionString: databaseUrl, 
  ssl: { rejectUnauthorized: false } 
});

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
