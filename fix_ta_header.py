import os

path = r"src\pages\TeamAttendance.tsx"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

header_start = content.find('<CardHeader className="flex flex-col gap-4 bg-white dark:bg-card">')
header_end = content.find('</CardHeader>', header_start) + len('</CardHeader>')

new_header = """<CardHeader className="flex flex-col gap-4 bg-white dark:bg-card">
            {/* Row 1: Title and Export Button */}
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg whitespace-nowrap text-slate-800 dark:text-slate-100 font-black">
                {dateViewMode === 'DAY' ? "Today's Attendance Log" : "Monthly Attendance Log"}
              </CardTitle>
              
              <ExportDropdown 
                onExportCSV={() => exportToCSV(filteredList, 'Team_Attendance')} 
                onExportPDF={() => window.print()} 
              />
            </div>

            {/* Row 2: DAY/MONTH toggle and Filters */}
            <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 w-full">
              {/* Left side: DAY / MONTH Toggle */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-900/50 rounded-lg p-1 border border-slate-300 dark:border-slate-700">
                <button 
                  onClick={() => setDateViewMode('DAY')}
                  className={`h-7 px-4 text-[11px] font-bold tracking-widest rounded-md transition-all ${dateViewMode === 'DAY' ? 'bg-[#7B0099] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                >
                  DAY
                </button>
                <button 
                  onClick={() => setDateViewMode('MONTH')}
                  className={`h-7 px-4 text-[11px] font-bold tracking-widest rounded-md transition-all ${dateViewMode === 'MONTH' ? 'bg-[#7B0099] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                >
                  MONTH
                </button>
              </div>

              {/* Right side: Filters */}
              <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-end">
                {/* Date Filter */}
                <div className="relative">
                  {dateViewMode === "DAY" ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="appearance-none flex items-center justify-center px-4 py-2 bg-white dark:bg-card border border-border text-foreground text-[11px] font-black rounded-md shadow-sm outline-none cursor-pointer uppercase tracking-widest h-[34px] gap-2 hover:border-[#7B0099] hover:ring-1 hover:ring-[#7B0099] transition-all">
                          {new Date(selectedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()} <CalendarDays className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-1" align="start">
                        <CalendarWidget
                          mode="single"
                          selected={new Date(selectedDate)}
                          onSelect={(d) => {
                            if (d) setSelectedDate(new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0]);
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <MonthPicker
                      monthYear={`${new Date(selectedDate).getFullYear()}-${String(new Date(selectedDate).getMonth() + 1).padStart(2, '0')}`}
                      onSelectMonthYear={(val) => {
                        setSelectedDate(`${val}-01`);
                      }}
                      className="appearance-none flex items-center justify-between min-w-[120px] px-4 py-2 bg-white dark:bg-card border border-border text-foreground text-[11px] font-black rounded-md shadow-sm outline-none focus:border-[#7B0099] focus:ring-1 focus:ring-[#7B0099] uppercase tracking-widest h-[34px]"
                    />
                  )}
                </div>

                {/* Status Toggle */}
                <div className="flex items-center bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-800 rounded-md p-1 shadow-sm overflow-x-auto">
                  {["ALL", "ON TIME", "LATE", "ABSENT"].map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors whitespace-nowrap ${statusFilter === status ? 'bg-white dark:bg-card text-foreground shadow-sm ring-1 ring-[#7B0099]' : 'text-gray-500 hover:text-gray-900 dark:text-gray-100'}`}
                    >
                      {status}
                    </button>
                  ))}
                </div>

                {/* Search */}
                <div className="relative flex items-center">
                  <Search className="w-4 h-4 absolute left-3 text-muted-foreground" />
                  <Input
                    placeholder="Search Employee..."
                    className="pl-9 h-[34px] w-[200px] text-xs bg-white dark:bg-card"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardHeader>"""

content = content[:header_start] + new_header + content[header_end:]

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated TeamAttendance.tsx header")
