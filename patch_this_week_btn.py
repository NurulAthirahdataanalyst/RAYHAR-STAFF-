import re

file_path = r'C:\Users\HP\ATTENDANCE_SYSTEM\src\pages\hr-analytics\WorkforceInsights.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'(\{\/\* Weekly Navigator \*\/.*?<div className="flex items-center gap-1 sm:gap-2 self-end sm:self-auto">\s*)(<Button variant="ghost")'

replacement = r"""\1{trendWeekStart.getTime() !== startOfWeek(new Date(), { weekStartsOn: 6 }).getTime() && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTrendWeekStart(startOfWeek(new Date(), { weekStartsOn: 6 }))}
                        className="h-8 text-xs font-semibold px-3 mr-2 bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100 hover:text-pink-800 dark:bg-pink-900/20 dark:text-pink-400 dark:border-pink-800/50"
                      >
                        This Week
                      </Button>
                    )}
                    \2"""

content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched successfully")
