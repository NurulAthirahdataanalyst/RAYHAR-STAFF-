import codecs

lines = []
with codecs.open('src/pages/hr-analytics/WorkforceCalendar.tsx', 'r', 'utf-8') as f:
    lines = f.readlines()

new_lines = []
for i, line in enumerate(lines):
    if line.strip() == '{sortedKeys.map(key => {' and lines[i-1].strip() == '<>':
        new_lines.append('''                            {(() => {
                              const isElevated = role === "branch_leader" || role === "hod" || role === "head_of_department";
                              
                              if (isElevated) {
                                const presentCount = summary["Present (On Time)"]?.count || 0;
                                const lateCount = summary["Present (Late)"]?.count || 0;
                                
                                return (
                                  <>
                                    {evts.filter(e => e.type !== "Present (On Time)" && e.type !== "Present (Late)" && e.type !== "Rest/Wknd").map((e, i) => {
                                      const c = getEventColor(e);
                                      if (e.source === "company_leave") {
                                        return (
                                          <div key={elevated-\} className={px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 \ \ border \ mb-0.5}>
                                            <span className="truncate">{e.name || "Company Leave"}</span>
                                          </div>
                                        );
                                      }
                                      
                                      const shortName = e.employee ? e.employee.split(' ').slice(0,2).join(' ') : 'Unknown';
                                      const label = e.source === "outstation" ? "Outstation" : (e.type === "Absent" ? "Absent" : "Leave");
                                      
                                      return (
                                        <div key={elevated-\} className={lex flex-col text-[9px] px-1.5 py-0.5 rounded \ \ border \ mb-0.5 leading-tight}>
                                          <span className="font-bold truncate">{shortName}</span>
                                          <span className="opacity-80 truncate text-[8px]">{label}</span>
                                        </div>
                                      );
                                    })}
                                    
                                    {presentCount > 0 && (
                                      <div className={px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center justify-between gap-1 \ \ border \ mb-0.5}>
                                        <div className="flex items-center gap-1.5 truncate">
                                          <div className={w-1 h-1 rounded-full \} />
                                          <span className="truncate">Present</span>
                                        </div>
                                        <span className="font-bold ml-1">{presentCount}</span>
                                      </div>
                                    )}
                                    {lateCount > 0 && (
                                      <div className={px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center justify-between gap-1 \ \ border \ mb-0.5}>
                                        <div className="flex items-center gap-1.5 truncate">
                                          <div className={w-1 h-1 rounded-full \} />
                                          <span className="truncate">Late</span>
                                        </div>
                                        <span className="font-bold ml-1">{lateCount}</span>
                                      </div>
                                    )}
                                  </>
                                );
                              }
                              return sortedKeys.map(key => {
''')
    elif line.strip() == '})}' and 'evts.length === 0' in lines[i+1]:
        new_lines.append('                              });\n')
        new_lines.append('                            })()}\n')
    else:
        new_lines.append(line)

with codecs.open('src/pages/hr-analytics/WorkforceCalendar.tsx', 'w', 'utf-8') as f:
    f.writelines(new_lines)
print('Done!')
