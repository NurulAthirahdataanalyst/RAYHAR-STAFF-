const fs = require('fs');
const filePath = 'src/pages/hr-analytics/WorkforceInsights.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Remove lines 1484-1493 (the right-side buttons div in Leave Trend card)
const toRemove = `                 <div className="flex items-center gap-3">
                   {sickLeaveSpike && (
                     <span className="flex items-center gap-1.5 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded-md animate-pulse">
                       <AlertTriangle className="w-3 h-3" /> Sick Leave Spike Detected!
                     </span>
                   )}
                   <button className="text-xs font-bold text-[#7B0099] hover:text-purple-700 transition-colors flex items-center gap-1 bg-purple-50 px-2.5 py-1.5 rounded-md">
                     New VW <ChevronRight className="w-3 h-3" />
                   </button>
                 </div>`;

if (content.includes(toRemove)) {
  content = content.replace(toRemove, '');
  fs.writeFileSync(filePath, content);
  console.log('SUCCESS: Removed sick spike alert and New VW button');
} else {
  // Try with \r\n
  const toRemoveCRLF = toRemove.replace(/\n/g, '\r\n');
  if (content.includes(toRemoveCRLF)) {
    content = content.replace(toRemoveCRLF, '');
    fs.writeFileSync(filePath, content);
    console.log('SUCCESS (CRLF): Removed sick spike alert and New VW button');
  } else {
    console.log('NOT FOUND - check indentation');
    // Print surrounding area for debug
    const idx = content.indexOf('sickLeaveSpike');
    console.log('Context around sickLeaveSpike:', JSON.stringify(content.substring(idx - 50, idx + 200)));
  }
}
