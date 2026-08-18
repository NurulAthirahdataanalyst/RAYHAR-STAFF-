import os
import re

files_to_check = [
    r"src\pages\Attendance.tsx",
    r"src\pages\Employees.tsx",
    r"src\pages\Reports.tsx",
    r"src\pages\TeamAttendance.tsx",
    r"src\pages\hr-analytics\WorkforceInsights.tsx",
]

def process_file(filepath):
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return
        
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add import if not exists
    if 'MonthPicker' not in content:
        # Find last import
        imports_end = content.rfind('import ')
        if imports_end != -1:
            line_end = content.find('\n', imports_end)
            content = content[:line_end+1] + 'import { MonthPicker } from "@/components/shared/MonthPicker";\n' + content[line_end+1:]

    # 2. Replace `<input type="month" value={...} onChange={...} className={...} />`
    # We will use regex to find the block
    import re
    # We need to match:
    # <input
    #   type="month"
    #   value={`${year}-${month}`}
    #   onChange={(e) => { ... }}
    #   className="..."
    # />
    # This is tricky with regex, let's just do targeted string replacements.

    pass

for fp in files_to_check:
    process_file(fp)

