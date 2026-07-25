import re

file_path = r'C:\Users\HP\ATTENDANCE_SYSTEM\src\pages\hr-analytics\WorkforceInsights.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

old_logic = 'className="h-8 text-xs font-black px-4 mr-2 bg-[#7B0099] text-[#FFD700] hover:bg-[#5c0073] hover:text-[#FFE55C] border-none shadow-md"'
new_logic = 'className="h-8 text-xs font-black px-4 mr-2 bg-[#FFD700] text-[#7B0099] border-2 border-[#7B0099] hover:bg-[#FFE55C] shadow-md"'

if old_logic in content:
    content = content.replace(old_logic, new_logic)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched successfully")
else:
    print("Could not find old logic")
