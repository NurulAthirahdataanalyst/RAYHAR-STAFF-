import codecs
import re

with codecs.open('src/pages/hr-analytics/WorkforceCalendar.tsx', 'r', 'utf-8') as f:
    content = f.read()

pattern = re.compile(r'const sortedKeys = Object\.keys\(summary\)\.sort[^{]*\{[^{]*\{.*?return \(\s*<>\s*\{sortedKeys\.map.*?\}\)\s*\}\)\s*\}', re.DOTALL)

new_block = '''{(() => {
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
                                      <div className={px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 \ \ border \ mb-0.5}>
                                        <span className="truncate">{presentCount} Present</span>
                                      </div>
                                    )}
                                    {lateCount > 0 && (
                                      <div className={px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 \ \ border \ mb-0.5}>
                                        <span className="truncate">{lateCount} Late</span>
                                      </div>
                                    )}
                                  </>
                                );
                              }

                              const sortedKeys = Object.keys(summary).sort((a, b) => {
                                 const pA = getEventPriority({ source: summary[a].c.label === "Company Leave" ? "company_leave" : summary[a].c.label === "Outstation" ? "outstation" : "leave" } as any);
                                 const pB = getEventPriority({ source: summary[b].c.label === "Company Leave" ? "company_leave" : summary[b].c.label === "Outstation" ? "outstation" : "leave" } as any);
                                 return pA - pB;
                              });

                              return (
                                <>
                                  {sortedKeys.map(key => {
                                    const { count, c } = summary[key];
                                    const displayLabel = key === "Present (On Time)" ? "Present" : key === "Present (Late)" ? "Late" : key;
                                    
                                    if (key === "Company Leave") {
                                      return (
                                        <div key={key} className={px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 \ \ border \ mb-0.5}>
                                           <span className="truncate">{evts.find(e => e.source === "company_leave")?.name || "Company Leave"}</span>
                                        </div>
                                      );
                                    }

                                    return (
                                      <div key={key} className={lex items-center justify-between text-[10px] px-1.5 py-0.5 rounded \ \ border \ mb-0.5}>
                                        <div className="flex items-center gap-1.5 truncate">
                                          <div className={w-1 h-1 rounded-full \} />
                                          <span className="truncate">{displayLabel}</span>
                                        </div>
                                        <span className="font-bold ml-1">{count}</span>
                                      </div>
                                    );
                                  })}
                                </>
                              );
                            })()}'''

matches = pattern.findall(content)
if len(matches) > 0:
    content = content.replace(matches[0], new_block)
    with codecs.open('src/pages/hr-analytics/WorkforceCalendar.tsx', 'w', 'utf-8') as f:
        f.write(content)
    print("Replaced successfully with regex!")
else:
    print("Could not find match with regex!")
