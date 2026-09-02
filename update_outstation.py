with open('src/pages/outstation/OutstationAnalytics.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

handle_func = """
  const handleMonthYearChange = (val: string) => {
    if (val.endsWith("-all")) {
      setSelectedYear(val.split("-")[0]);
      setSelectedMonth("all");
    } else {
      const [y, m] = val.split("-");
      setSelectedYear(y);
      setSelectedMonth((parseInt(m, 10) - 1).toString());
    }
  };
  
  const monthYearVal = selectedMonth === "all" ? ${selectedYear}-all : ${selectedYear}-;

  return (
"""
content = content.replace("  return (\n    <div className=\"space-y-6 animate-in fade-in duration-500 pb-12\">", handle_func + "    <div className=\"space-y-6 animate-in fade-in duration-500 pb-12\">")

page_actions_old = """      <PageActions>
        <Button onClick={() => void fetchData()} className="h-11 px-5 w-full sm:w-auto">
          <RefreshCw className="w-3.5 h-3.5 mr-2" /> Refresh
        </Button>
      </PageActions>"""

page_actions_new = """      <PageActions>
        <div className="flex items-center gap-3">
          <MonthPicker
            monthYear={monthYearVal}
            onSelectMonthYear={handleMonthYearChange}
            className="h-10"
          />
          <Button onClick={() => void fetchData()} className="h-10 px-5 w-full sm:w-auto">
            <RefreshCw className="w-3.5 h-3.5 mr-2" /> Refresh
          </Button>
        </div>
      </PageActions>"""

content = content.replace(page_actions_old, page_actions_new)

select_dropdown_old = """              {/* Month Filter Selector */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-foreground" />
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="h-9 px-3 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-foreground dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#942392] cursor-pointer shadow-xs"
                >
                  <option value="all">All Months (Jan - Dec)</option>
                  {MONTH_NAMES.map((m, i) => (
                    <option key={i} value={i.toString()}>{m}</option>
                  ))}
                </select>
              </div>"""

content = content.replace(select_dropdown_old, "")

with open('src/pages/outstation/OutstationAnalytics.tsx', 'w', encoding='utf-8') as f:
    f.write(content)