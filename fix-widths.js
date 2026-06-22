const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.resolve(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('src/pages');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content;
  
  // Replace large max-widths with max-w-7xl
  newContent = newContent.replace(/max-w-\[1500px\]/g, 'max-w-7xl');
  newContent = newContent.replace(/max-w-\[1400px\]/g, 'max-w-7xl');
  newContent = newContent.replace(/max-w-screen-2xl/g, 'max-w-7xl');
  newContent = newContent.replace(/max-w-screen-xl/g, 'max-w-7xl');
  
  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    console.log('Modified', file);
  }
});
