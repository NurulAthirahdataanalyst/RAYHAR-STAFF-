with open('src/pages/master/LeaveEntitlementManagement.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Replace the "Search Employee" input with the combobox
old_search_block = """            <div className="space-y-1.5">
              <Label className="text-sm font-bold">Search Employee</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-foreground" />
                <Input placeholder="Enter ID or Name..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 bg-white dark:bg-card h-10 text-sm" />
              </div>
            </div>"""

new_search_block = """            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-sm font-bold">Search Name or ID</Label>
              <Popover open={empSearchOpen} onOpenChange={setEmpSearchOpen}>
                <PopoverTrigger asChild>
                  <div className="relative w-full cursor-pointer">
                    <div className="pl-3 pr-8 h-10 border border-border/60 bg-white dark:bg-card rounded-md flex items-center gap-1 overflow-hidden text-sm">
                      {selectedEmployees.length > 0 ? (
                        <span className="font-bold text-[#7B0099] truncate">{selectedEmployees.length} employee{selectedEmployees.length > 1 ? 's' : ''} selected</span>
                      ) : (
                        <span className="text-muted-foreground">{search || "Search employees..."}</span>
                      )}
                    </div>
                    {(search || selectedEmployees.length > 0) && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSearch(''); setSelectedEmployees([]); setEmpSearchText(''); }} 
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground z-10 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-[340px] p-0 shadow-xl" align="start">
                  <div className="p-3 border-b border-border/50">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-foreground/50" />
                      <Input
                        placeholder="Search employees..."
                        value={empSearchText}
                        onChange={(e) => {
                            setEmpSearchText(e.target.value);
                            setSearch(e.target.value);
                        }}
                        className="pl-8 h-10 text-sm"
                        autoFocus
                      />
                    </div>
                    {selectedEmployees.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {selectedEmployees.map(id => {
                          const emp = employees.find(e => e.user_id === id);
                          return emp ? (
                            <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#7B0099]/10 text-[#7B0099] text-[10px] font-bold">
                              {emp.full_name}
                              <button onClick={() => setSelectedEmployees(prev => prev.filter(x => x !== id))} className="hover:text-red-500">
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </span>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                  <div className="max-h-[260px] overflow-y-auto p-1">
                    {(() => {
                      const empListRaw = employees
                        .filter(e => {
                          const bMatch = selectedBranch === "All" || e.branch === selectedBranch;
                          const dMatch = selectedDept === "All" || e.department === selectedDept;
                          const tMatch = !empSearchText || e.full_name?.toLowerCase().includes(empSearchText.toLowerCase()) || (e.user_id || '').toLowerCase().includes(empSearchText.toLowerCase());
                          return bMatch && dMatch && tMatch;
                        });
                      
                      const allSelected = empListRaw.length > 0 && empListRaw.every(e => selectedEmployees.includes(e.user_id));

                      const sortedEmpList = [...empListRaw].sort((a, b) => {
                        const aChecked = selectedEmployees.includes(a.user_id) ? 0 : 1;
                        const bChecked = selectedEmployees.includes(b.user_id) ? 0 : 1;
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
                                  setSelectedEmployees(prev => prev.filter(id => !idsToRemove.includes(id)));
                                } else {
                                  const idsToAdd = empListRaw.map(e => e.user_id).filter(id => !selectedEmployees.includes(id));
                                  setSelectedEmployees(prev => [...prev, ...idsToAdd]);
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
                            const isChecked = selectedEmployees.includes(emp.user_id);
                            return (
                              <div
                                key={emp.user_id}
                                onClick={() => {
                                  setSelectedEmployees(prev =>
                                    prev.includes(emp.user_id) ? prev.filter(x => x !== emp.user_id) : [...prev, emp.user_id]
                                  );
                                }}
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${isChecked ? 'bg-[#7B0099]/5' : 'hover:bg-muted/50'}`}
                              >
                                <label className="relative cursor-pointer" style={{width:18,height:18}} onClick={(e) => e.preventDefault()}>
                                  <input type="checkbox" checked={isChecked} readOnly className="sr-only peer" />
                                  <svg viewBox="0 0 18 18" width="18" height="18" className="relative z-10" style={{fill:'none',strokeLinecap:'round',strokeLinejoin:'round',stroke: isChecked ? '#7B0099' : '#c8ccd4',strokeWidth:1.5,transition:'all 0.2s ease'}}>
                                    <path d="M1,9 L1,3.5 C1,2 2,1 3.5,1 L14.5,1 C16,1 17,2 17,3.5 L17,14.5 C17,16 16,17 14.5,17 L3.5,17 C2,17 1,16 1,14.5 L1,9 Z"
                                      style={{strokeDasharray:60, strokeDashoffset: isChecked ? 60 : 0, transition:'all 0.3s linear'}} />
                                    <polyline points="1 9 7 14 15 4"
                                      style={{strokeDasharray:22, strokeDashoffset: isChecked ? 42 : 66, transition: isChecked ? 'all 0.2s linear 0.15s' : 'all 0.2s linear'}} />
                                  </svg>
                                </label>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-xs font-bold truncate ${isChecked ? 'text-[#7B0099]' : 'text-foreground'}`}>{emp.full_name}</p>
                                  <p className="text-[10px] text-muted-foreground truncate">{emp.user_id} · {emp.branch || ''}</p>
                                </div>
                                {isChecked && <span className="text-[10px] font-bold text-[#7B0099] bg-[#7B0099]/10 px-2 py-0.5 rounded-full">Selected</span>}
                              </div>
                            );
                          })}
                        </>
                      );
                    })()}
                  </div>
                  {selectedEmployees.length > 0 && (
                    <div className="border-t border-border/50 p-2 flex justify-between items-center">
                      <span className="text-[10px] font-bold text-[#7B0099]">{selectedEmployees.length} selected</span>
                      <Button size="sm" variant="ghost" className="text-[10px] h-6 text-red-500 hover:text-red-600" onClick={() => setSelectedEmployees([])}>Clear All</Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>"""

if old_search_block in text:
    text = text.replace(old_search_block, new_search_block)
else:
    print("Could not find search block")

# 2. Update Carry Forward Filter grid from grid-cols-5 to grid-cols-4 or whatever to match Annual Leave.
# Wait, Annual Leave is grid-cols-1 sm:grid-cols-4 and the search is md:col-span-2.
# Let's check Carry Forward Employee Selection Grid:
old_grid_block = """          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">"""
new_grid_block = """          <div className="grid grid-cols-1 sm:grid-cols-5 md:grid-cols-5 lg:grid-cols-5 gap-4">""" 
# Wait, if we use md:col-span-2 for search, it takes 2 columns out of 5. The others (Dept, Branch, EmpType) take 3 columns.
# That adds up to 5! So `sm:grid-cols-5` is perfectly fine! No need to change the grid.

# 3. Remove checkbox from table header
old_table_header = """              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="w-[50px] text-center">
                    <input
                      type="checkbox"
                      checked={currentItems.length > 0 && currentItems.every(emp => selectedEmployees.includes(emp.user_id))}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="cursor-pointer rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </TableHead>"""

new_table_header = """              <TableHeader className="bg-muted/30">
                <TableRow>"""

if old_table_header in text:
    text = text.replace(old_table_header, new_table_header)
else:
    print("Could not find table header")

# 4. Remove checkbox from table body
old_table_body = """                {currentItems.map((emp) => {
                  const unused = getUnusedDays(emp.user_id);
                  const eligible = Math.min(unused, maxCarry);
                  const forfeit = unused > eligible ? unused - eligible : 0;
                  const isChecked = selectedEmployees.includes(emp.user_id);

                  return (
                    <TableRow key={emp.user_id} className={`hover:bg-muted/30 ${isChecked ? 'bg-emerald-500/5' : ''}`}>
                      <TableCell className="text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => handleSelectEmployee(emp.user_id, e.target.checked)}
                          className="cursor-pointer rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        />
                      </TableCell>"""

new_table_body = """                {currentItems.map((emp) => {
                  const unused = getUnusedDays(emp.user_id);
                  const eligible = Math.min(unused, maxCarry);
                  const forfeit = unused > eligible ? unused - eligible : 0;
                  const isChecked = selectedEmployees.includes(emp.user_id);

                  return (
                    <TableRow key={emp.user_id} className={`hover:bg-muted/30 ${isChecked ? 'bg-[#7B0099]/5' : ''}`}>"""

if old_table_body in text:
    text = text.replace(old_table_body, new_table_body)
else:
    print("Could not find table body")

with open('src/pages/master/LeaveEntitlementManagement.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Done")
