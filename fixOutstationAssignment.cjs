const fs = require('fs');

const file = 'src/pages/outstation/OutstationAssignment.tsx';
let code = fs.readFileSync(file, 'utf8');

const paMatch = code.match(/<PageActions>([\s\S]*?)<\/PageActions>/);
if (paMatch) {
  const paContent = paMatch[1];
  const filtersMatch = paContent.match(/<div className="flex items-center gap-3 flex-wrap">([\s\S]*?)<\/div>\s*<Button/);
  
  if (filtersMatch) {
    const filters = filtersMatch[1];
    const buttonMatch = paContent.match(/(<Button[\s\S]*?<\/Button>)/);
    
    if (buttonMatch) {
      code = code.replace(paMatch[0], `<PageActions>\n        ${buttonMatch[1]}\n      </PageActions>`);
      
      const chMatch = code.match(/<CardHeader.*?>\s*<CardTitle[\s\S]*?<\/CardTitle>\s*<\/CardHeader>/);
      if (chMatch) {
        let oldHeader = chMatch[0];
        let chNew = oldHeader.replace(/<CardHeader.*?>/, '<CardHeader className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-slate-800">');
        chNew = chNew.replace('</CardHeader>', `  <div className="flex items-center gap-3 flex-wrap">\n          ${filters}\n        </div>\n      </CardHeader>`);
        
        code = code.replace(oldHeader, chNew);
        fs.writeFileSync(file, code);
        console.log('Fixed OutstationAssignment!');
      } else {
        console.log('CardHeader not found');
      }
    } else {
        console.log('Button not found');
    }
  } else {
      console.log('Filters not found');
  }
} else {
    console.log('PageActions not found');
}
