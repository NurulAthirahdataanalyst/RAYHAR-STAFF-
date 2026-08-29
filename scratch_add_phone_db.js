const fs = require('fs');
let code = fs.readFileSync('backend/server.js', 'utf8');

const target = `      await connection.query("ALTER TABLE profiles DROP COLUMN IF EXISTS reset_token_expires");`;
const replacement = `      await connection.query("ALTER TABLE profiles DROP COLUMN IF EXISTS reset_token_expires");
      await connection.query("ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS phone VARCHAR(50)");
      await connection.query("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(50)");`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('backend/server.js', code);
  console.log('Database init updated');
} else {
  console.log('Target block not found in server.js');
}
