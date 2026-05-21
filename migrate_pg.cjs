const fs = require('fs');

let content = fs.readFileSync('backend/server.js', 'utf8');

// 1. Change mysql2 to pg and create a wrapper pool
content = content.replace(
  `const mysql = require("mysql2/promise");`,
  `const { Pool } = require("pg");`
);

content = content.replace(
  `const pool = mysql.createPool(dbConfig);`,
  `
// PostgreSQL wrapper pool to mimic mysql2/promise interface
const pgPool = new Pool(dbConfig);
const pool = {
  pool: pgPool, // for pool.pool.on
  getConnection: async () => {
    const client = await pgPool.connect();
    return {
      query: async (sql, params) => {
        return pool.query(sql, params); // just proxy to pool to share replacement logic
      },
      release: () => client.release(),
      beginTransaction: () => client.query('BEGIN'),
      commit: () => client.query('COMMIT'),
      rollback: () => client.query('ROLLBACK'),
    };
  },
  query: async (sql, params) => {
    if (params && params.length > 0) {
      let i = 1;
      sql = sql.replace(/\\?/g, () => \`$\${i++}\`);
    }
    // Handle returning insert id automatically if it's an INSERT query without RETURNING
    let isInsert = /^\\s*INSERT\\s+/i.test(sql);
    if (isInsert && !/RETURNING/i.test(sql)) {
      // Very naive: just append returning * for insert operations to mimic insertId 
      // It is better to use RETURNING id or whatever the primary key is, but returning * is safer generically.
      sql = sql + " RETURNING *";
    }
    try {
      const res = await pgPool.query(sql, params);
      let resultObj = res.rows || [];
      if (isInsert && res.rows && res.rows.length > 0) {
        // Find the id or something representing insertId
        const firstRow = res.rows[0];
        const maybeId = firstRow.id || firstRow.leave_id || Object.values(firstRow)[0];
        resultObj = { insertId: maybeId };
      } else if (!Array.isArray(resultObj)) {
        resultObj = [];
      }
      return [resultObj, res.fields]; // returning [rows, fields] like mysql2
    } catch(err) {
      throw err;
    }
  }
};
`
);

// 2. Fix timezone specific stuff
content = content.replace(
  `connection.query("SET time_zone = '+08:00'");`,
  `connection.query("SET TIME ZONE 'Asia/Kuala_Lumpur'");`
);
content = content.replace(
  `pool.pool.on('connection', (connection) => {`,
  `pgPool.on('connect', (connection) => {`
);

// 3. MySQL functions to PG
content = content.replace(/DAY\(CURDATE\(\)\)/g, "EXTRACT(DAY FROM CURRENT_DATE)");
content = content.replace(/YEAR\(CURDATE\(\)\)/g, "EXTRACT(YEAR FROM CURRENT_DATE)");
content = content.replace(/MONTH\(CURDATE\(\)\)/g, "EXTRACT(MONTH FROM CURRENT_DATE)");
content = content.replace(/CURDATE\(\)/g, "CURRENT_DATE");

// JSON stuff
content = content.replace(/JSON_ARRAYAGG\(/g, "json_agg(");
content = content.replace(/JSON_OBJECT\(/g, "json_build_object(");

fs.writeFileSync('backend/server.js', content);
console.log("Migration script complete");
