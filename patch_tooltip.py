import re

file_path = r'C:\Users\HP\ATTENDANCE_SYSTEM\src\pages\hr-analytics\WorkforceInsights.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

old_tooltip = "<RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }} />"

new_tooltip = """<RechartsTooltip 
                          cursor={{ fill: 'transparent' }} 
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }} 
                          labelFormatter={(label) => {
                            const daysMap: Record<string, number> = {
                              'Sat': 0, 'Sun': 1, 'Mon': 2, 'Tue': 3, 'Wed': 4, 'Thu': 5, 'Fri': 6
                            };
                            const dayOffset = daysMap[label as string] ?? 0;
                            const date = addDays(trendWeekStart, dayOffset);
                            return `${String(label).toUpperCase()}, ${format(date, 'dd MMM yyyy')}`;
                          }}
                        />"""

content = content.replace(old_tooltip, new_tooltip)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched successfully")
