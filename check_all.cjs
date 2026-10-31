const esbuild = require('esbuild');
const fs = require('fs');

const files = [
  'src/components/shared/StaffProfileDialog.tsx',
  'src/lib/entitlementHistory.ts',
  'src/modules/multi-company/modules/SettingsHub/tabs/TabPersonnelEntity.tsx',
  'src/pages/Employees.tsx',
  'src/pages/Profile.tsx',
  'src/pages/master/EntitlementActivityCard.tsx'
];

let failed = false;
for (const f of files) {
  try {
    const code = fs.readFileSync(f, 'utf8');
    esbuild.transformSync(code, { loader: f.endsWith('.ts') ? 'ts' : 'tsx' });
    console.log(`[PASS] ${f}`);
  } catch (err) {
    console.error(`[FAIL] ${f}:`, err.message);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log('ALL MODIFIED FILES PASS ESBUILD SYNTAX CHECK.');
