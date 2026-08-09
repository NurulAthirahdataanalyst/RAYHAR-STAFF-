const { pool } = require './backend/server.js';
pool.query("SELECT ur.role, p.full_name FROM user_role ur JOIN profiles p ON p.user_id = ur.user_id WHERE p.full_name LIKE '%AMIRUL DANISH%' LIMIT 1").then(res => {
  console.log(res[0]);
  process.exit();
}).catch(err => {
  console.error(err);
  process.exit(1);
});
