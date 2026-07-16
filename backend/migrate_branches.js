const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Adding operating_zone column...');
    await pool.query("ALTER TABLE branches ADD COLUMN operating_zone VARCHAR(50) DEFAULT 'ZONE_B';").catch(e => {
      if (e.code !== '42701') throw e; // 42701 is duplicate column in postgres
      console.log('operating_zone column already exists.');
    });

    const zoneABranches = [
      'Rayhar HQ', 'Kemaman', 'Cheneh', 'Kuala Berang', 'Dungun', 
      'Kuala Terengganu', 'Jertih', 'Kota Bharu', 'Alor Setar', 'TGG', 'KBR', 'AOR'
    ];

    console.log('Updating branches to ZONE_A...');
    for (const name of zoneABranches) {
      const res = await pool.query("UPDATE branches SET operating_zone = 'ZONE_A' WHERE name ILIKE $1 OR code = $2", [`%${name}%`, name]);
      console.log(`Updated ${res.rowCount} branches for ${name}`);
    }

    console.log('Updating all other branches to ZONE_B...');
    const resB = await pool.query("UPDATE branches SET operating_zone = 'ZONE_B' WHERE operating_zone IS NULL OR operating_zone = ''");
    console.log(`Updated ${resB.rowCount} branches to ZONE_B`);

    console.log('Migration complete!');
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

runMigration();
