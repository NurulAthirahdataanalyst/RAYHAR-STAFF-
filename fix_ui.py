import re

with open('src/pages/Reports.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_ui = '''                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-foreground uppercase tracking-widest">Period</label>
                            <MonthPicker
                              monthYear={selectedMonth === 'all' ? \\-all\ : \\-\\}
                              onSelectMonthYear={(val) => {
                                const [y, m] = val.split('-');
                                setSelectedYear(y);
                                setSelectedMonth(m);
                              }}
                              className="w-full h-11 px-3 flex items-center justify-between text-xs font-black uppercase tracking-widest rounded-xl border border-border bg-background/30 text-foreground outline-none cursor-pointer hover:border-[#942392]/40 focus:ring-1 focus:ring-[#942392]"
                            />
                          </div>'''

new_ui = '''                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-[9px] font-black text-foreground uppercase tracking-widest">Period</label>
                              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 rounded-lg p-0.5">
                                <button onClick={() => { setPeriodMode("year"); setSelectedMonth("all"); }} className={px-2 py-1 rounded-md text-[9px] font-black tracking-widest uppercase transition-colors }>Year</button>
                                <button onClick={() => { setPeriodMode("month"); setSelectedMonth((new Date().getMonth() + 1).toString()); }} className={px-2 py-1 rounded-md text-[9px] font-black tracking-widest uppercase transition-colors }>Month</button>
                              </div>
                            </div>
                            {periodMode === 'year' ? (
                              <YearPopover
                                year={selectedYear}
                                onSelectYear={(y) => { setSelectedYear(y); setSelectedMonth("all"); }}
                                className="w-full h-11 px-3 flex items-center justify-between text-xs font-black uppercase tracking-widest rounded-xl border border-border bg-background/30 text-foreground outline-none cursor-pointer hover:border-[#942392]/40 focus:ring-1 focus:ring-[#942392]"
                              />
                            ) : (
                              <MonthPicker
                                hideAllYear={true}
                                monthYear={selectedMonth === 'all' ? \\-\\ : \\-\\}
                                onSelectMonthYear={(val) => {
                                  const [y, m] = val.split('-');
                                  setSelectedYear(y);
                                  setSelectedMonth(m);
                                }}
                                className="w-full h-11 px-3 flex items-center justify-between text-xs font-black uppercase tracking-widest rounded-xl border border-border bg-background/30 text-foreground outline-none cursor-pointer hover:border-[#942392]/40 focus:ring-1 focus:ring-[#942392]"
                              />
                            )}
                          </div>'''

content = content.replace(old_ui, new_ui)

with open('src/pages/Reports.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Done")
