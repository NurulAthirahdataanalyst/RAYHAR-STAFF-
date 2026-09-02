import re

with open('src/components/common/TablePagination.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'className="h-7 w-7 p-0 rounded-md border-gray-200 dark:border-slate-800 bg-white dark:bg-card text-foreground disabled:opacity-40"',
    'className="h-7 w-7 p-0 rounded-md border-gray-200 dark:border-slate-800 bg-white dark:bg-card text-foreground hover:bg-[#942392] hover:text-white hover:border-[#942392] focus:bg-[#942392] focus:text-white disabled:opacity-40 transition-colors"'
)

with open('src/components/common/TablePagination.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Done")
