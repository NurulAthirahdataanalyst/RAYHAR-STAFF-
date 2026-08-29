import { execSync } from 'child_process';
try {
  console.log('Adding files...');
  execSync('git add src/pages/LeaveFormView.tsx backend/server.js', { stdio: 'inherit' });
  console.log('Committing...');
  execSync('git commit -m "feat: show NO. TELEFON next to SEBAB / TUJUAN in leave request details and PDF"', { stdio: 'inherit' });
  console.log('Pushing...');
  execSync('git push origin main', { stdio: 'inherit' });
  console.log('Done.');
} catch (e) {
  console.error('Error:', e.message);
}
