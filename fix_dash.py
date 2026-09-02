import re

with open('src/pages/outstation/OutstationDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = '''              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-9 w-9 border-gray-200 dark:border-slate-800 text-foreground dark:text-gray-300 rounded-[8px]">
                  <Filter className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-9 w-9 border-gray-200 dark:border-slate-800 text-foreground dark:text-gray-300 rounded-[8px]">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>'''

content = content.replace(target, '')

with open('src/pages/outstation/OutstationDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Done")
