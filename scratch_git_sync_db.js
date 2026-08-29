import { execSync } from 'child_process';
try {
  console.log('Adding files...');
  execSync('git add backend/server.js', { stdio: 'inherit' });
  console.log('Committing...');
  execSync('git commit -m "fix: add phone column to db startup to prevent select errors"', { stdio: 'inherit' });
  console.log('Pushing...');
  execSync('git push origin main', { stdio: 'inherit' });
  console.log('Done.');
} catch (e) {
  console.error('Error:', e.message);
}
