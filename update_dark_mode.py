import codecs

with codecs.open('src/pages/Employees.tsx', 'r', 'utf-8') as f:
    content = f.read()

content = content.replace('bg-slate-100 border-transparent focus:bg-white', 'bg-slate-100 dark:bg-slate-800/50 border-transparent focus:bg-white dark:focus:bg-slate-800')
content = content.replace('bg-slate-100 border-transparent focus:bg-white pr-10', 'bg-slate-100 dark:bg-slate-800/50 border-transparent focus:bg-white dark:focus:bg-slate-800 pr-10')

with codecs.open('src/pages/Employees.tsx', 'w', 'utf-8') as f:
    f.write(content)
