const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx')) {
      results.push(file);
    }
  });
  return results;
}

let modifiedFiles = 0;

const files = [...walk('src/pages'), ...walk('src/components')];
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content;
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    if (line.includes('rounded-full')) {
      const hasPadding = /px-\d|py-\d|p-\d/.test(line);
      const hasIconSize = /w-[1-9] h-[1-9]|w-1[0-6] h-1[0-6]|w-20 h-20|w-28 h-28|w-36 h-36|w-full h-full/.test(line);
      const isInput = /<input/i.test(line);
      const isButton = /<button/i.test(line) || /className=.*button/i.test(line);
      const isBadge = /<Badge/i.test(line) || /badgeVariants/.test(line) || /bg-.*\/10.*text-.*/.test(line);
      const isCardLayoutTabs = /flex.*bg-muted\/40.*p-1/.test(line) || /bg-muted\/50.*border-border.*text-\[/.test(line);
      
      // Specifically target things that have padding and text, which means they are pills
      if ((hasPadding && !hasIconSize) || isInput || isButton || isBadge || isCardLayoutTabs) {
        // Double check it's not a circular icon wrapper
        if (!line.includes('rounded-full bg-muted flex items-center justify-center mx-auto') && !line.includes('rounded-full flex flex-col items-center justify-center')) {
          newContent = newContent.replace(line, line.replace(/rounded-full/g, 'rounded-md'));
        }
      }
    }
  });

  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    modifiedFiles++;
    console.log("Updated: " + file);
  }
});

console.log("Total files updated: " + modifiedFiles);
