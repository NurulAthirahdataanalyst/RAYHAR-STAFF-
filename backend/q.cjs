const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.xvpebtompjcjfvuzeumo:RayharTravel2026@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres' });
pool.query('SELECT user_id, full_name, email FROM profiles WHERE full_name ILIKE \'%AMIRUL%\'').then(res => { console.log(res.rows); process.exit(0); });
