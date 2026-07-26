const fs = require('fs');
let content = fs.readFileSync('src/pages/hr-analytics/WorkforceInsights.tsx', 'utf8');

// 1. Remove the opening ternary
content = content.replace(
  '{viewMode === \'day\' ? (\n          <>\n        {/* Redesigned Top Section: 5-column layout */}\n        <div className="mb-4">',
  '{/* Redesigned Top Section: 5-column layout */}\n        <div className="mb-4">'
);

// 2. Add the opening ternary AFTER the top section
content = content.replace(
  '<div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-6">',
  '{viewMode === \'day\' ? (\n          <>\n      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-6">'
);

// 3. Remove the duplicate filters from the Regional Attendance Map card
// We will replace the whole chunk starting from SelectContent to ExportDropdown
let chunkToRemove = `                  <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                    <SelectTrigger className="w-[120px] h-7 text-[10px] font-bold border border-slate-300 dark:border-slate-700 bg-white dark:bg-card shadow-none focus:ring-0">
                      <SelectValue placeholder="All Regions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All Regions" className="text-[10px] font-bold">All Regions</SelectItem>
                      {regionOrder.map(r => <SelectItem key={r} value={r} className="text-[10px] font-bold">{r}</SelectItem>)}
                    </SelectContent>
                  </Select>`;
let fullTarget = chunkToRemove + `
                  <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-3">
              <div className="relative">
                {viewMode === "day" ? (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="appearance-none flex items-center justify-center px-4 py-2 bg-muted/50 border border-border text-foreground text-[11px] font-black rounded-md shadow-sm outline-none cursor-pointer uppercase tracking-widest h-10 gap-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                        {displayDate} <CalendarDays className="w-4 h-4 text-slate-600 dark:text-slate-400" />
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
                ) : (
                  <input
                    type="month"
                    value={\`\${year}-\${month}\`}
                    onChange={(e) => {
                      if (e.target.value) {
                        const [newYear, newMonth] = e.target.value.split('-');
                        setYear(newYear);
                        setMonth(newMonth);
                      }
                    }}
                    className="appearance-none flex items-center justify-center px-4 py-2 bg-muted/50 border border-border text-foreground text-[11px] font-black rounded-md shadow-sm outline-none cursor-pointer uppercase tracking-widest h-10"
                  />
                )}
              </div>

              <div className="flex items-center bg-slate-50 dark:bg-slate-900/50 rounded-lg p-1 border border-slate-300 dark:border-slate-700">
                <button 
                  className={\`h-8 px-5 text-[11px] font-bold tracking-widest rounded-md transition-all \${viewMode === 'day' ? 'bg-[#7B0099] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}\`}
                  onClick={() => setViewMode('day')}
                >
                  DAY
                </button>
                <button 
                  className={\`h-8 px-5 text-[11px] font-bold tracking-widest rounded-md transition-all \${viewMode === 'month' ? 'bg-[#7B0099] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}\`}
                  onClick={() => setViewMode('month')}
                >
                  MONTH
                </button>
              </div>
            </div>
            <ExportDropdown 
              onExportCSV={() => exportToCSV(data.departmentMetrics || [], 'Workforce_Insights')} 
              onExportPDF={() => window.print()} 
            />
        </div>`;

content = content.replace(fullTarget, chunkToRemove);
fs.writeFileSync('src/pages/hr-analytics/WorkforceInsights.tsx', content);
console.log('Fixed file');
