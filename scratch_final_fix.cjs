const fs = require('fs');
const { execSync } = require('child_process');

try {
  // 1. Fix server.js DB initialization
  let serverCode = fs.readFileSync('backend/server.js', 'utf8');
  const target = `await connection.query("ALTER TABLE profiles DROP COLUMN IF EXISTS reset_token_expires");`;
  const replacement = `await connection.query("ALTER TABLE profiles DROP COLUMN IF EXISTS reset_token_expires");
      await connection.query("ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS phone VARCHAR(50)");
      await connection.query("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(50)");`;

  if (serverCode.includes(target) && !serverCode.includes('ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS phone VARCHAR(50)");')) {
    serverCode = serverCode.replace(target, replacement);
    fs.writeFileSync('backend/server.js', serverCode);
    console.log('Successfully updated server.js with DB startup fixes.');
  }

  // 2. Commit and Push
  console.log('Adding files to git...');
  execSync('git add backend/server.js src/pages/CompanyLeaveCalendar.tsx', { stdio: 'inherit' });
  console.log('Committing...');
  execSync('git commit -m "fix: resolve syntax errors and add missing phone column startup logic"', { stdio: 'inherit' });
  console.log('Pushing...');
  execSync('git push origin main', { stdio: 'inherit' });
  console.log('All done! Changes are on GitHub.');
} catch (e) {
  console.error('Error during execution:', e.message);
}
