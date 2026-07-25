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
  
  const paMatch = content.match(/<PageActions>([\s\S]*?)<\/PageActions>/);
  if (!paMatch) return;
  
  const paContent = paMatch[1];
  
  const innerDivMatch = paContent.match(/<div className="flex[^>]*>([\s\S]*?)<\/div>\s*$/);
  if (!innerDivMatch) return;
  
  let innerContent = innerDivMatch[1];
  
  const primaryButtonRegex = /<Button[^>]*>[\s\S]*?(?:New Assignment|Apply for Leave|Apply Leave|Add Leave|Create|New Request|Add Holiday|Create Account)[\s\S]*?<\/Button>/g;
  const primaryButtons = [];
  let remainingControls = innerContent;
  
  let match;
  while ((match = primaryButtonRegex.exec(innerContent)) !== null) {
    primaryButtons.push(match[0]);
    remainingControls = remainingControls.replace(match[0], '');
  }
  
  const primaryLinkRegex = /<Link[^>]*>\s*<Button[^>]*>[\s\S]*?(?:New Assignment|Apply for Leave|Apply Leave|Add Leave|Create|New Request|Add Holiday|Create Account)[\s\S]*?<\/Button>\s*<\/Link>/g;
  while ((match = primaryLinkRegex.exec(remainingControls)) !== null) {
    primaryButtons.push(match[0]);
    remainingControls = remainingControls.replace(match[0], '');
  }
  
  remainingControls = remainingControls.trim();
  
  let newPaContent = '';
  if (primaryButtons.length > 0) {
    newPaContent = `\n      <PageActions>\n        <div className="flex items-center gap-3">\n          ${primaryButtons.join('\n          ')}\n        </div>\n      </PageActions>\n`;
  } else {
    newPaContent = ''; 
  }
  
  content = content.replace(paMatch[0], newPaContent);
  
  if (remainingControls.length > 10) {
    const chRegex = /(<CardHeader[^>]*>)/;
    const chMatch = content.match(chRegex);
    
    if (chMatch) {
      const fullChRegex = /(<CardHeader[^>]*>)([\s\S]*?)(<\/CardHeader>)/;
      const fullChMatch = content.match(fullChRegex);
      
      if (fullChMatch) {
        let oldHeader = fullChMatch[1];
        let newHeader = oldHeader;
        if (!newHeader.includes('flex-row')) {
          newHeader = newHeader.replace('className="', 'className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 ');
        }
        
        const fullOld = fullChMatch[0];
        const newFull = `${newHeader}${fullChMatch[2]}  <div className="flex items-center gap-3 flex-wrap">\n          ${remainingControls}\n        </div>\n${fullChMatch[3]}`;
        content = content.replace(fullOld, newFull);
      }
    }
  }
  
  fs.writeFileSync(file, content);
  filesChanged++;
});

console.log(`Updated ${filesChanged} files`);
