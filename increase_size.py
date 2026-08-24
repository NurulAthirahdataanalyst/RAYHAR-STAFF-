import re

with open('src/pages/master/LeaveEntitlementManagement.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Make boxes bigger across the file
content = content.replace('h-9 text-xs', 'h-10 text-sm')
content = content.replace('h-9 px-3', 'h-10 px-3')
content = re.sub(r'className="text-xs font-bold( flex items-center)?"', r'className="text-sm font-bold\1"', content)
content = content.replace('<SelectTrigger className="bg-white dark:bg-card">', '<SelectTrigger className="bg-white dark:bg-card h-10 text-sm">')
content = content.replace('<Input placeholder="Enter ID or Name..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 bg-white dark:bg-card h-9 text-xs" />', '<Input placeholder="Enter ID or Name..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 bg-white dark:bg-card h-10 text-sm" />')

with open('src/pages/master/LeaveEntitlementManagement.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
