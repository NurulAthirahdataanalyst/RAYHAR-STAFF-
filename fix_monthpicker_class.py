with open('src/pages/outstation/OutstationAnalytics.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('            <MonthPicker\n              monthYear={monthYearVal}\n              onSelectMonthYear={handleMonthYearChange}\n              className="h-10"\n            />', '            <MonthPicker\n              monthYear={monthYearVal}\n              onSelectMonthYear={handleMonthYearChange}\n            />')

with open('src/pages/outstation/OutstationAnalytics.tsx', 'w', encoding='utf-8') as f:
    f.write(content)