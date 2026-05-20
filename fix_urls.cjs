const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const files = execSync('git grep -l railway src/').toString().trim().split('\n');

files.forEach(file => {
  if (!file || file === 'src/config/api.ts') return;
  let content = fs.readFileSync(file, 'utf8');

  // Find relative path to config/api.ts based on file location
  // e.g. src/pages/Dashboard.tsx -> ../config/api
  // src/components/layout/AppLayout.tsx -> ../../config/api
  const depth = file.split('/').length - 2;
  const relativePrefix = depth > 0 ? '../'.repeat(depth) : './';
  const importStatement = `import { API_BASE_URL } from "${relativePrefix}config/api";`;

  if (!content.includes('API_BASE_URL')) {
    const lines = content.split('\n');
    let lastImport = -1;
    lines.forEach((line, i) => {
      if (line.startsWith('import ')) lastImport = i;
    });
    lines.splice(lastImport + 1, 0, importStatement);
    content = lines.join('\n');
  }

  // Replace occurrences in template literals (already inside backticks)
  content = content.replace(/https:\/\/rayhar-staff-production\.up\.railway\.app/g, '${API_BASE_URL}');
  
  // Replace string literals: "https://rayhar..." or 'https://rayhar...' -> `${API_BASE_URL}...`
  content = content.replace(/["']\$\{API_BASE_URL\}(.*?)["']/g, '`${API_BASE_URL}$1`');
  
  fs.writeFileSync(file, content);
});
