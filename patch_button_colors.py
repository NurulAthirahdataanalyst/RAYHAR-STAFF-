import re

file_path = r'C:\Users\HP\ATTENDANCE_SYSTEM\src\pages\hr-analytics\WorkforceInsights.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

old_logic = 'className="h-8 text-xs font-semibold px-3 mr-2 bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100 hover:text-pink-800 dark:bg-pink-900/20 dark:text-pink-400 dark:border-pink-800/50"'
new_logic = 'className="h-8 text-xs font-black px-4 mr-2 bg-[#7B0099] text-[#FFD700] hover:bg-[#5c0073] hover:text-[#FFE55C] border-none shadow-md"'

if old_logic in content:
    content = content.replace(old_logic, new_logic)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched successfully")
else:
    print("Could not find old logic")
