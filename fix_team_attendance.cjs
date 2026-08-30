const fs = require('fs');

let path = 'src/pages/TeamAttendance.tsx';
let content = fs.readFileSync(path, 'utf8');

// First reset them to a standard form so we can replace them properly
content = content.replace(/<Card className="border border-gray-200 dark:border-slate-800\/80 shadow-sm border-l-4 border-l-\[\#7B0099\]">/g, '<Card className="border-border shadow-sm">');

// Then apply the correct colors
let occurrences = 0;
content = content.replace(/<Card className="border-border shadow-sm">/g, (match) => {
  occurrences++;
  let colorClass = "";
  if (occurrences === 1) colorClass = "border-l-[#7B0099]";
  else if (occurrences === 2) colorClass = "border-l-green-500";
  else if (occurrences === 3) colorClass = "border-l-amber-500";
  else if (occurrences === 4) colorClass = "border-l-red-500";
  else return match; // Leave the table card as is!
  
  return `<Card className="border border-gray-200 dark:border-slate-800/80 shadow-sm border-l-4 ${colorClass}">`;
});

fs.writeFileSync(path, content);
console.log("Fixed TeamAttendance.tsx");
