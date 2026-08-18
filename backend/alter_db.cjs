const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/rayhar_db' });

async function run() {
  try {
    await pool.query('ALTER TABLE attendances ADD COLUMN distance_meters DECIMAL(10,2)');
    console.log('Added distance_meters to attendances');
  } catch (e) {
    if (e.message.includes('already exists')) {
      console.log('distance_meters already exists');
    } else {
      console.error(e);
    }
  } finally {
    pool.end();
  }
}
run();
