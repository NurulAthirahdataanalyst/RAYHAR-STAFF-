const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config({path: './.env'});
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';").then(res => { console.log(res.rows); process.exit(0); }).catch(e => console.log(e));
