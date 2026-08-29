import { execSync } from 'child_process';
try {
  console.log('Adding files...');
  execSync('git add src/pages/CompanyLeaveCalendar.tsx', { stdio: 'inherit' });
  console.log('Committing...');
  execSync('git commit -m "fix: resolve esbuild import syntax error in CompanyLeaveCalendar"', { stdio: 'inherit' });
  console.log('Pushing...');
  execSync('git push origin main', { stdio: 'inherit' });
  console.log('Done.');
} catch (e) {
  console.error('Error:', e.message);
}
