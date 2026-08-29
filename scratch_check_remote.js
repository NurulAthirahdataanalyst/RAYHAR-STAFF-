import { execSync } from 'child_process';
try {
  console.log('Fetching origin...');
  execSync('git fetch origin', { stdio: 'inherit' });
  console.log('Local status:');
  execSync('git status', { stdio: 'inherit' });
  console.log('Checking remote CompanyLeaveCalendar.tsx syntax:');
  const code = execSync('git show origin/main:src/pages/CompanyLeaveCalendar.tsx').toString();
  if (code.includes('import { useState, useEffect } from "react";') && code.indexOf('import { useState, useEffect }') > 500) {
      console.log('WARNING: Remote has the errant import syntax!');
  } else {
      console.log('Remote CompanyLeaveCalendar.tsx is clean.');
  }
  const serverCode = execSync('git show origin/main:backend/server.js').toString();
  if (serverCode.includes('doc.moveTo(40, curY).lineTo(572, curY).strokeColor("#cccccc").lineWidth(1).stroke();0).strokeColor("#cccccc").lineWidth(1).stroke();')) {
      console.log('WARNING: Remote server.js has the syntax error!');
  } else {
      console.log('Remote server.js is clean.');
  }
} catch (e) {
  console.error('Error:', e.message);
}
