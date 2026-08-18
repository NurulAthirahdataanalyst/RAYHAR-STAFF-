import os

path = r"src\pages\hr-analytics\WorkforceInsights.tsx"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# We need to swap the relative div (calendar) with the flex div (DAY/MONTH toggle)
old_block = """          <PageActions>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="relative">
                  {viewMode === "day" ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="appearance-none flex items-center justify-between px-4 py-2 bg-white dark:bg-card border border-slate-300 dark:border-slate-700 text-foreground text-[11px] font-black rounded-md shadow-sm outline-none cursor-pointer uppercase tracking-widest h-10 gap-3 hover:border-slate-400 min-w-[140px]">
                          <span>{displayDate}</span>
                          <CalendarIcon className="w-4 h-4 text-slate-500" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-1" align="end">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={handleDateSelect}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  ) : viewMode === "month" ? (
                    <MonthPicker
                      monthYear={`${year}-${month.padStart(2, '0')}`}
                      onSelectMonthYear={(val) => {
                        const [yyyy, mm] = val.split('-');
                        setYear(yyyy);
                        setMonth(mm);
                      }}
                      className="appearance-none flex items-center justify-between px-4 py-2 bg-white dark:bg-card border border-slate-300 dark:border-slate-700 text-foreground text-[11px] font-black rounded-md shadow-sm outline-none cursor-pointer uppercase tracking-widest h-10 min-w-[140px]"
                    />
                  ) : (
                    <YearPopover year={year} onSelectYear={setYear} />
                  )}
                </div>

                <div className="flex items-center bg-slate-100 dark:bg-slate-900/50 rounded-lg p-1 border border-slate-300 dark:border-slate-700">
                  <button 
                    className={`h-7 px-4 text-[11px] font-black tracking-widest rounded-md transition-all ${viewMode === 'day' ? 'bg-[#FFFE00] text-[#7B0099] ring-1 ring-[#7B0099] shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                    onClick={() => setViewMode('day')}
                  >
                    DAY
                  </button>
                  <button 
                    className={`h-7 px-4 text-[11px] font-black tracking-widest rounded-md transition-all ${viewMode === 'month' ? 'bg-[#FFFE00] text-[#7B0099] ring-1 ring-[#7B0099] shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                    onClick={() => setViewMode('month')}
                  >
                    MONTH
                  </button>
                  <button 
                    className={`h-7 px-4 text-[11px] font-black tracking-widest rounded-md transition-all ${viewMode === 'year' ? 'bg-[#FFFE00] text-[#7B0099] ring-1 ring-[#7B0099] shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                    onClick={() => setViewMode('year')}
                  >
                    YEAR
                  </button>
                </div>
              </div>"""

new_block = """          <PageActions>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1 w-full sm:w-auto">
                <div className="flex items-center gap-4 sm:gap-6 border-b border-gray-200 dark:border-slate-800 w-full sm:w-auto">
                  <button 
                    className={`text-[11px] font-black uppercase tracking-widest pb-3 -mb-[1px] transition-colors border-b-[3px] ${viewMode === 'day' ? 'text-[#7B0099] border-[#7B0099]' : 'text-gray-500 hover:text-yellow-500 border-transparent hover:border-yellow-500'}`}
                    onClick={() => setViewMode('day')}
                  >
                    DAY
                  </button>
                  <button 
                    className={`text-[11px] font-black uppercase tracking-widest pb-3 -mb-[1px] transition-colors border-b-[3px] ${viewMode === 'month' ? 'text-[#7B0099] border-[#7B0099]' : 'text-gray-500 hover:text-yellow-500 border-transparent hover:border-yellow-500'}`}
                    onClick={() => setViewMode('month')}
                  >
                    MONTH
                  </button>
                  <button 
                    className={`text-[11px] font-black uppercase tracking-widest pb-3 -mb-[1px] transition-colors border-b-[3px] ${viewMode === 'year' ? 'text-[#7B0099] border-[#7B0099]' : 'text-gray-500 hover:text-yellow-500 border-transparent hover:border-yellow-500'}`}
                    onClick={() => setViewMode('year')}
                  >
                    YEAR
                  </button>
                </div>

                <div className="relative">
                  {viewMode === "day" ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="appearance-none flex items-center justify-between px-4 py-2 bg-white dark:bg-card border border-slate-300 dark:border-slate-700 text-foreground text-[11px] font-black rounded-md shadow-sm outline-none cursor-pointer uppercase tracking-widest h-10 gap-3 hover:border-slate-400 min-w-[140px]">
                          <span>{displayDate}</span>
                          <CalendarIcon className="w-4 h-4 text-slate-500" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-1" align="end">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={handleDateSelect}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  ) : viewMode === "month" ? (
                    <MonthPicker
                      monthYear={`${year}-${month.padStart(2, '0')}`}
                      onSelectMonthYear={(val) => {
                        const [yyyy, mm] = val.split('-');
                        setYear(yyyy);
                        setMonth(mm);
                      }}
                      className="flex items-center justify-between px-4 py-2 bg-white dark:bg-card border border-slate-300 dark:border-slate-700 text-foreground text-[11px] font-black rounded-md shadow-sm outline-none cursor-pointer uppercase tracking-widest h-10 min-w-[140px]"
                    />
                  ) : (
                    <YearPopover year={year} onSelectYear={setYear} />
                  )}
                </div>
              </div>"""

content = content.replace(old_block, new_block)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Swapped toggle and calendar, changed style")
