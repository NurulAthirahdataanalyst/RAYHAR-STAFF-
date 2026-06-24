const fs = require('fs');
const path = require('path');
const glob = require('glob'); // Need glob or simple recursion

function getAllFiles(dirPath, arrayOfFiles) {
  let files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];
  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      if (file.endsWith('.tsx')) {
        arrayOfFiles.push(path.join(__dirname, dirPath, "/", file));
      }
    }
  });
  return arrayOfFiles;
}

const files = getAllFiles('src/pages');

let modifiedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // 1. Add import if not present
  if (content.includes('Export') && !content.includes('ExportDropdown')) {
    
    // We only want to process files that have handleExportCSV, handleExportPDF, or handleExport
    const hasExportCSV = content.match(/handleExportCSV/);
    const hasExportPDF = content.match(/handleExportPDF/);
    const hasExport = content.match(/handleExport/);
    
    if (hasExportCSV || hasExportPDF || hasExport) {
      
      // Attendance.tsx style dropdown
      const dropdownRegex1 = /<DropdownMenu>[\s\S]*?<DropdownMenuTrigger[\s\S]*?<span>Export<\/span>[\s\S]*?<\/DropdownMenu>/g;
      
      // LeaveAnalytics.tsx style dropdown
      const dropdownRegex2 = /<DropdownMenu>[\s\S]*?Export[\s\S]*?<\/DropdownMenu>/g;

      // Button style 1
      const buttonRegex1 = /<Button[^>]*onClick=\{handleExportCSV\}[^>]*>[\s\S]*?Export CSV[\s\S]*?<\/Button>/g;
      
      // Button style 2 (just export)
      const buttonRegex2 = /<Button[^>]*onClick=\{handleExport\}[^>]*>[\s\S]*?Export[\s\S]*?<\/Button>/g;

      // Determine the props to pass
      let props = [];
      if (hasExportCSV) props.push('onExportCSV={handleExportCSV}');
      else if (content.match(/const handleExport =/)) props.push('onExportCSV={handleExport}'); // sometimes handleExport is for CSV
      
      if (hasExportPDF) props.push('onExportPDF={handleExportPDF}');
      
      const propsStr = props.join(' ');
      const replacement = `<ExportDropdown ${propsStr} />`;

      let replaced = false;

      if (dropdownRegex1.test(content)) {
        content = content.replace(dropdownRegex1, replacement);
        replaced = true;
      } else if (buttonRegex1.test(content)) {
        content = content.replace(buttonRegex1, replacement);
        replaced = true;
      } else if (buttonRegex2.test(content)) {
        content = content.replace(buttonRegex2, replacement);
        replaced = true;
      } else {
        // try looking for a more general button with "Export" inside
        const generalButtonRegex = /<button[^>]*>[\s\S]*?Export[\s\S]*?<\/button>/g;
        if (generalButtonRegex.test(content)) {
          // If it matches exactly what we expect (e.g., Attendance.tsx if the regex missed)
        }
      }

      // If we replaced something, add the import
      if (content !== originalContent) {
        const importStatement = `import { ExportDropdown } from "@/components/shared/ExportDropdown";\n`;
        // Insert after last import
        const lastImportIndex = content.lastIndexOf('import ');
        const nextNewlineIndex = content.indexOf('\n', lastImportIndex);
        content = content.slice(0, nextNewlineIndex + 1) + importStatement + content.slice(nextNewlineIndex + 1);
        
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Updated ${file}`);
        modifiedCount++;
      }
    }
  }
});

console.log(`Modified ${modifiedCount} files.`);
