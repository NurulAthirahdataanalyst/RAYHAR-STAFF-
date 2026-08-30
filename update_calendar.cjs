const fs = require('fs');

let fileContent = fs.readFileSync('src/pages/hr-analytics/WorkforceCalendar.tsx', 'utf8');

// 1. Update the filter for Absent and add Rest/Weekend logic
const absentFilterOriginal = 'const absent = uniqueAtt.filter(a => a.status === "Absent");';
const replacementAbsent = `
          const isWeekend = (dateObj, branchId) => {
            if (!branchId) return dateObj.getDay() === 0 || dateObj.getDay() === 6;
            const branchUpper = String(branchId).toUpperCase();
            const isFriSat = ['JHB', 'JOHOR BAHRU', 'BPT', 'BATU PAHAT', 'JB - JOHOR BHARU', 'JB', 'KBR', 'KOTA BHARU', 'KTG', 'KUALA TERENGGANU', 'ASR', 'ALOR SETAR', 'SPJ', 'SUNGAI PETANI', 'SOUTHERN'].some(b => branchUpper.includes(b));
            const day = dateObj.getDay();
            return isFriSat ? (day === 5 || day === 6) : (day === 0 || day === 6);
          };
          const rawAbsent = uniqueAtt.filter(a => a.status === "Absent");
          const absent = rawAbsent.filter(a => !isWeekend(selectedDay, a.branch));
          const restDays = rawAbsent.filter(a => isWeekend(selectedDay, a.branch));
`;
fileContent = fileContent.replace(absentFilterOriginal, replacementAbsent);

// 2. Update the grid layout for Summary stats
const summaryGridOriginal = `<div className="grid grid-cols-3 gap-2 sm:gap-3">
                        <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-3 flex flex-col items-start dark:bg-emerald-950/30">
                          <span className="text-[9px] sm:text-[10px] font-black uppercase text-emerald-700">Present (On Time)</span>
                          <span className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">{presentOnTime.length}</span>
                        </div>
                        <div className="border border-amber-200 bg-amber-50 rounded-xl p-3 flex flex-col items-start dark:bg-amber-950/30">
                          <span className="text-[9px] sm:text-[10px] font-black uppercase text-amber-700">Present (Late)</span>
                          <span className="text-xl sm:text-2xl font-black text-amber-600 mt-1">{presentLate.length}</span>
                        </div>
                        <div className="border border-red-200 bg-red-50 rounded-xl p-3 flex flex-col items-start dark:bg-red-950/30">
                          <span className="text-[9px] sm:text-[10px] font-black uppercase text-red-700">Absent</span>
                          <span className="text-xl sm:text-2xl font-black text-red-600 mt-1">{absent.length}</span>
                        </div>
                      </div>`;
const summaryGridReplacement = `<div className={\`grid \${restDays.length > 0 ? 'grid-cols-4' : 'grid-cols-3'} gap-2 sm:gap-3\`}>
                        <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-3 flex flex-col items-start dark:bg-emerald-950/30">
                          <span className="text-[9px] sm:text-[10px] font-black uppercase text-emerald-700">Present (On Time)</span>
                          <span className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">{presentOnTime.length}</span>
                        </div>
                        <div className="border border-amber-200 bg-amber-50 rounded-xl p-3 flex flex-col items-start dark:bg-amber-950/30">
                          <span className="text-[9px] sm:text-[10px] font-black uppercase text-amber-700">Present (Late)</span>
                          <span className="text-xl sm:text-2xl font-black text-amber-600 mt-1">{presentLate.length}</span>
                        </div>
                        <div className="border border-red-200 bg-red-50 rounded-xl p-3 flex flex-col items-start dark:bg-red-950/30">
                          <span className="text-[9px] sm:text-[10px] font-black uppercase text-red-700">Absent</span>
                          <span className="text-xl sm:text-2xl font-black text-red-600 mt-1">{absent.length}</span>
                        </div>
                        {restDays.length > 0 && (
                          <div className="border border-slate-200 bg-slate-50 rounded-xl p-3 flex flex-col items-start dark:bg-slate-900/30">
                            <span className="text-[9px] sm:text-[10px] font-black uppercase text-slate-700">Rest Day</span>
                            <span className="text-xl sm:text-2xl font-black text-slate-600 mt-1">{restDays.length}</span>
                          </div>
                        )}
                      </div>`;
fileContent = fileContent.replace(summaryGridOriginal, summaryGridReplacement);

// 3. Update Font Colors
fileContent = fileContent.replace(/text-slate-500 mb-2 border-b/g, 'text-black dark:text-white mb-2 border-b');
fileContent = fileContent.replace(/text-gray-400">Clock In/g, 'text-black dark:text-white">Clock In');
fileContent = fileContent.replace(/text-gray-400">Clock Out/g, 'text-black dark:text-white">Clock Out');

// 4. Inject Rest Days List Section (Find the Absent list rendering and place it after)
const absentListBlock = `                      {absent.length > 0 && (
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-black dark:text-white mb-2 border-b pb-1">
                            Absent ({absent.length})
                          </div>
                          <div className="space-y-2">
                            {absent.map(a => (
                              <div key={a.user_id} className="border border-gray-100 rounded-lg p-3 shadow-sm bg-white dark:bg-slate-900 dark:border-slate-800">
                                <div className="flex justify-between items-start">
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold uppercase truncate">{a.full_name} {a.branch ? \`(\${a.branch})\` : ''}</span>
                                    <div className="flex items-center gap-1.5 mt-1">
                                      <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                      <span className="text-[10px] font-black uppercase text-red-600">Absent</span>
                                    </div>
                                  </div>
                                  <div className="flex gap-4 text-right">
                                    <div className="flex flex-col items-center opacity-50">
                                      <span className="text-[9px] font-black uppercase text-black dark:text-white">Clock In</span>
                                      <span className="text-xs font-mono mt-0.5">-</span>
                                    </div>
                                    <div className="flex flex-col items-center opacity-50">
                                      <span className="text-[9px] font-black uppercase text-black dark:text-white">Clock Out</span>
                                      <span className="text-xs font-mono mt-0.5">-</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}`;

const restDayListBlock = `                      {restDays.length > 0 && (
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-black dark:text-white mb-2 border-b pb-1">
                            Rest Day / Weekend ({restDays.length})
                          </div>
                          <div className="space-y-2">
                            {restDays.map(a => (
                              <div key={a.user_id} className="border border-gray-100 rounded-lg p-3 shadow-sm bg-white dark:bg-slate-900 dark:border-slate-800">
                                <div className="flex justify-between items-start">
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold uppercase truncate">{a.full_name} {a.branch ? \`(\${a.branch})\` : ''}</span>
                                    <div className="flex items-center gap-1.5 mt-1">
                                      <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                                      <span className="text-[10px] font-black uppercase text-slate-600">Rest Day</span>
                                    </div>
                                  </div>
                                  <div className="flex gap-4 text-right">
                                    <div className="flex flex-col items-center opacity-50">
                                      <span className="text-[9px] font-black uppercase text-black dark:text-white">Clock In</span>
                                      <span className="text-xs font-mono mt-0.5">-</span>
                                    </div>
                                    <div className="flex flex-col items-center opacity-50">
                                      <span className="text-[9px] font-black uppercase text-black dark:text-white">Clock Out</span>
                                      <span className="text-xs font-mono mt-0.5">-</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}`;

if (fileContent.includes(absentListBlock)) {
    fileContent = fileContent.replace(absentListBlock, absentListBlock + '\n\n' + restDayListBlock);
} else {
    // Fallback if the block string matching fails due to whitespace
    console.log("Could not find absent block for exact replacement. Using regex injection.");
    const absentRegex = /\{absent\.length > 0 && \([\s\S]*?Absent \(\{absent\.length\}\)[\s\S]*?\}\)\}\s*<\/div>\s*<\/div>\s*\)\}/;
    const match = fileContent.match(absentRegex);
    if (match) {
        fileContent = fileContent.replace(match[0], match[0] + '\n\n' + restDayListBlock);
    } else {
        console.log("Regex also failed to find absent block.");
    }
}

fs.writeFileSync('src/pages/hr-analytics/WorkforceCalendar.tsx', fileContent);
console.log('Update complete.');
