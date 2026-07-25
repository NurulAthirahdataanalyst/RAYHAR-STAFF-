const fs = require('fs');

try {
  let db = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');
  db = db.replace('        </div>\n      </div>\n\n      {showEmptyState ? (', '        </div>\n      </PageActions>\n\n      {showEmptyState ? (');
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
