const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function migrate() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        code VARCHAR(50) NOT NULL UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('departments table created.');
    
    const countRes = await pool.query('SELECT COUNT(*) FROM departments');
    if (parseInt(countRes.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO departments (id, name, code) VALUES 
        (1, 'Customer Service', 'CS'),
        (2, 'Haji Umrah (BHU)', 'BHU'),
        (3, 'Marketing & Media', 'MKT'),
        (4, 'Otb & Design', 'OTB'),
        (5, 'IT Department', 'IT'),
        (6, 'Reservation & Visa', 'RV'),
        (7, 'Account', 'ACC')
        ON CONFLICT DO NOTHING;
      `);
      console.log('departments seeded.');
      
      await pool.query("SELECT setval('departments_id_seq', (SELECT MAX(id) FROM departments));");
      console.log('sequence updated.');
    } else {
      console.log('departments already populated.');
    }
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
migrate();
