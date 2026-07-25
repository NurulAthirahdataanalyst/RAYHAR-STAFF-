const fs = require('fs');

try {
  let db = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');
  if (db.includes('<PageActions>') && !db.includes('</PageActions>')) {
    db = db.replace('</PopoverContent>\n          </Popover>\n        </div>', '</PopoverContent>\n          </Popover>\n        </div>\n      </PageActions>');
  }
  db = db.replace(/<PageActions>\s*<div className=\"flex items-center gap-2/g, '<PageActions>\n        <div className=\"flex items-center gap-2');
  fs.writeFileSync('src/pages/Dashboard.tsx', db);
  console.log('Fixed Dashboard.tsx');
} catch (e) {
  console.error(e);
}

try {
  let mo = fs.readFileSync('src/pages/outstation/MyOutstation.tsx', 'utf8');
  mo = mo.replace('</div>\n          </CardHeader>', '</CardHeader>');
  fs.writeFileSync('src/pages/outstation/MyOutstation.tsx', mo);
  console.log('Fixed MyOutstation.tsx');
} catch (e) {
  console.error(e);
}

try {
  let ta = fs.readFileSync('src/pages/TeamAttendance.tsx', 'utf8');
  fs.writeFileSync('src/pages/TeamAttendance.tsx', ta);
  console.log('Fixed TeamAttendance.tsx');
} catch (e) {
  console.error(e);
}
