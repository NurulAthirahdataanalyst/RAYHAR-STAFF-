const { execSync } = require('child_process');
try {
  console.log('Adding files...');
  execSync('git add src/pages/CompanyLeaveCalendar.tsx backend/server.js', { stdio: 'inherit' });
  console.log('Committing...');
  execSync('git commit -m "fix: resolve syntax errors in CompanyLeaveCalendar and server.js, and add phone column to db init"', { stdio: 'inherit' });
  console.log('Pushing...');
  execSync('git push origin main', { stdio: 'inherit' });
  console.log('Done.');
} catch (e) {
  console.error('Error:', e.message);
}
