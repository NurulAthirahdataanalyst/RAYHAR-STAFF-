import re

file = 'src/pages/master/Overview.tsx'
with open(file, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Departments Directory
content = content.replace(
    '<CardHeader className="pb-4 border-b border-border/40 flex flex-row items-center justify-between">\n                    <div className="flex items-center gap-3">\n                      <div className="p-2 bg-blue-500/10 text-blue-600 rounded-xl">',
    '<CardHeader className="pb-4 border-b border-border/40 flex flex-row items-center justify-between bg-blue-600/10 dark:bg-blue-600/20">\n                    <div className="flex items-center gap-3">\n                      <div className="p-2 bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl">'
)

# 2. System User Directory
content = content.replace(
    '<CardHeader className="pb-4 border-b border-border/40 flex flex-row items-center justify-between">\n                    <div className="flex items-center gap-3">\n                      <div className="p-2 bg-purple-500/10 text-purple-600 rounded-xl">',
    '<CardHeader className="pb-4 border-b border-border/40 flex flex-row items-center justify-between bg-[#7B0099]/10 dark:bg-[#7B0099]/20">\n                    <div className="flex items-center gap-3">\n                      <div className="p-2 bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-xl">'
)

# 3. Branches Directory
content = content.replace(
    '<CardHeader className="pb-4 border-b border-border/40 flex flex-row items-center justify-between">\n                    <div className="flex items-center gap-3">\n                      <div className="p-2 bg-pink-500/10 text-pink-600 rounded-xl">',
    '<CardHeader className="pb-4 border-b border-border/40 flex flex-row items-center justify-between bg-pink-600/10 dark:bg-pink-600/20">\n                    <div className="flex items-center gap-3">\n                      <div className="p-2 bg-pink-500/20 text-pink-600 dark:text-pink-400 rounded-xl">'
)

# 4. Attendance Assignment
content = content.replace(
    '<CardHeader className="pb-4 border-b border-border/40 flex flex-row items-start sm:items-center justify-between gap-2">\n                    <div className="flex items-center gap-3">\n                      <div className="p-2 bg-[#ffff00]/20 text-amber-600 dark:text-[#ffff00] rounded-xl shrink-0">',
    '<CardHeader className="pb-4 border-b border-border/40 flex flex-row items-start sm:items-center justify-between gap-2 bg-[#fff200]/10 dark:bg-[#fff200]/20">\n                    <div className="flex items-center gap-3">\n                      <div className="p-2 bg-[#ffff00]/30 text-amber-700 dark:text-[#ffff00] rounded-xl shrink-0">'
)

with open(file, 'w', encoding='utf-8') as f:
    f.write(content)
