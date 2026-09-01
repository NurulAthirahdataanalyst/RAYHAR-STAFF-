with open('src/pages/master/LeaveEntitlementManagement.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

old_empList_start = """                      <div className="max-h-[260px] overflow-y-auto p-1">
                        {(() => {
                          const empList = employees
                            .filter(e => {
                              const bMatch = selectedBranch === "All" || e.branch === selectedBranch;
                              const dMatch = selectedDept === "All" || e.department === selectedDept;
                              const tMatch = !empSearchText || e.full_name?.toLowerCase().includes(empSearchText.toLowerCase()) || (e.user_id || '').toLowerCase().includes(empSearchText.toLowerCase());
                              return bMatch && dMatch && tMatch;
                            })
                            .sort((a, b) => {
                              const aChecked = checkedEmployees.includes(a.user_id) ? 0 : 1;
                              const bChecked = checkedEmployees.includes(b.user_id) ? 0 : 1;
                              if (aChecked !== bChecked) return aChecked - bChecked;
                              return (a.full_name || '').localeCompare(b.full_name || '');
                            });
                          return empList.map(emp => {
                            const isChecked = checkedEmployees.includes(emp.user_id);
                            return (
                              <div"""

new_empList_start = """                      <div className="max-h-[260px] overflow-y-auto p-1">
                        {(() => {
                          const empListRaw = employees
                            .filter(e => {
                              const bMatch = selectedBranch === "All" || e.branch === selectedBranch;
                              const dMatch = selectedDept === "All" || e.department === selectedDept;
                              const tMatch = !empSearchText || e.full_name?.toLowerCase().includes(empSearchText.toLowerCase()) || (e.user_id || '').toLowerCase().includes(empSearchText.toLowerCase());
                              return bMatch && dMatch && tMatch;
                            });
                          
                          const allSelected = empListRaw.length > 0 && empListRaw.every(e => checkedEmployees.includes(e.user_id));

                          const sortedEmpList = [...empListRaw].sort((a, b) => {
                            const aChecked = checkedEmployees.includes(a.user_id) ? 0 : 1;
                            const bChecked = checkedEmployees.includes(b.user_id) ? 0 : 1;
                            if (aChecked !== bChecked) return aChecked - bChecked;
                            return (a.full_name || '').localeCompare(b.full_name || '');
                          });

                          return (
                            <>
                              {empListRaw.length > 0 && (
                                <div
                                  onClick={() => {
                                    if (allSelected) {
                                      const idsToRemove = empListRaw.map(e => e.user_id);
                                      setCheckedEmployees(prev => prev.filter(id => !idsToRemove.includes(id)));
                                    } else {
                                      const idsToAdd = empListRaw.map(e => e.user_id).filter(id => !checkedEmployees.includes(id));
                                      setCheckedEmployees(prev => [...prev, ...idsToAdd]);
                                    }
                                  }}
                                  className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors border-b border-border/50 mb-1 ${allSelected ? 'bg-[#7B0099]/5' : 'hover:bg-muted/50'}`}
                                >
                                  <label className="relative cursor-pointer" style={{width:18,height:18}} onClick={(e) => e.preventDefault()}>
                                    <input type="checkbox" checked={allSelected} readOnly className="sr-only peer" />
                                    <svg viewBox="0 0 18 18" width="18" height="18" className="relative z-10" style={{fill:'none',strokeLinecap:'round',strokeLinejoin:'round',stroke: allSelected ? '#7B0099' : '#c8ccd4',strokeWidth:1.5,transition:'all 0.2s ease'}}>
                                      <path d="M1,9 L1,3.5 C1,2 2,1 3.5,1 L14.5,1 C16,1 17,2 17,3.5 L17,14.5 C17,16 16,17 14.5,17 L3.5,17 C2,17 1,16 1,14.5 L1,9 Z"
                                        style={{strokeDasharray:60, strokeDashoffset: allSelected ? 60 : 0, transition:'all 0.3s linear'}} />
                                      <polyline points="1 9 7 14 15 4"
                                        style={{strokeDasharray:22, strokeDashoffset: allSelected ? 42 : 66, transition: allSelected ? 'all 0.2s linear 0.15s' : 'all 0.2s linear'}} />
                                    </svg>
                                  </label>
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-xs font-bold truncate ${allSelected ? 'text-[#7B0099]' : 'text-foreground'}`}>ALL EMPLOYEE</p>
                                  </div>
                                </div>
                              )}
                              {sortedEmpList.map(emp => {
                                const isChecked = checkedEmployees.includes(emp.user_id);
                                return (
                                  <div"""

if old_empList_start in text:
    text = text.replace(old_empList_start, new_empList_start)
    
    old_list_end = """                            );
                          });
                        })()}"""
    new_list_end = """                            );
                              })}
                            </>
                          );
                        })()}"""
    if old_list_end in text:
        text = text.replace(old_list_end, new_list_end)
        with open('src/pages/master/LeaveEntitlementManagement.tsx', 'w', encoding='utf-8') as f:
            f.write(text)
        print("Fixed Annual Leave Allocation combobox!")
    else:
        print("End part not found")
else:
    print("Start part not found")
