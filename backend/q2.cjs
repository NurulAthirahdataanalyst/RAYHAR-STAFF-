const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.xvpebtompjcjfvuzeumo:RayharTravel2026@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres' });
pool.query('SELECT * FROM notifications WHERE user_id = \'E009\' ORDER BY created_at DESC LIMIT 5').then(res => { console.log(res.rows); process.exit(0); });
