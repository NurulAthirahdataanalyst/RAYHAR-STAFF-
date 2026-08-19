import re

path = "src/pages/Employees.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace <TableRow className="bg-slate-50/50 dark:bg-slate-900/50">
# With <TableRow className="bg-[#7B0099] hover:bg-[#7B0099]">
content = re.sub(
    r'<TableRow className="bg-slate-50/50 dark:bg-slate-900/50">(\s*<TableHead className="font-bold )text-slate-500( text-xs">Temporary Branch</TableHead>\s*<TableHead className="font-bold )text-slate-500( text-xs">Period</TableHead>\s*<TableHead className="font-bold )text-slate-500( text-xs">Status</TableHead>\s*</TableRow>)',
    r'<TableRow className="bg-[#7B0099] hover:bg-[#7B0099]">\1text-white\2text-white\3text-white\4',
    content
)

# Replace <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm"> for the temporary_branch tab to have a soft yellow background.
content = re.sub(
    r'<TabsContent value="temporary_branch" className="mt-0">\s*<div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">',
    r'<TabsContent value="temporary_branch" className="mt-0">\n                    <div className="bg-[#FFFDF0] dark:bg-slate-800 p-6 rounded-2xl border border-yellow-200 dark:border-slate-700 shadow-sm">',
    content
)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
