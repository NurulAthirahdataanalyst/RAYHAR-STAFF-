const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://postgres.xvpebtompjcjfvuzeumo:RayharTravel2026@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres' });
pool.query('SELECT user_id, full_name, status FROM profiles WHERE full_name ILIKE \'%NURAIN SYAKIRAH%\'').then(res => console.log(res.rows)).catch(console.error).finally(() => pool.end());
