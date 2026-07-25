const fs = require('fs');
const path = require('path');

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];
  files.forEach((file) => {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else if (file.endsWith('.tsx')) {
      arrayOfFiles.push(path.join(dirPath, file));
    }
  });
  return arrayOfFiles;
}

const files = getAllFiles('src/pages');

let filesChanged = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Match `<PageHeader ... />` across multiple lines
  const pageHeaderRegex = /<PageHeader[\s\S]*?\/>/g;
  
  if (pageHeaderRegex.test(content)) {
    content = content.replace(pageHeaderRegex, '');
    
    // Also remove the import if it exists
    const importRegex = /import\s+PageHeader\s+from\s+['"]@\/components\/layout\/PageHeader['"];?\n?/g;
    content = content.replace(importRegex, '');
    
    fs.writeFileSync(file, content);
    filesChanged++;
  }
});

console.log(`Removed PageHeader from ${filesChanged} files`);
