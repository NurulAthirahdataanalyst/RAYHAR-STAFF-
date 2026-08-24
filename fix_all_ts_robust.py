import re
import os

def replace_in_file(path, pattern, repl, count=0, flags=0):
    if not os.path.exists(path): return
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    new_content = re.sub(pattern, repl, content, count=count, flags=flags)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)

# NotificationBell
replace_in_file('src/components/NotificationBell.tsx', r'\(d\) => \{', r'(d: any) => {')
replace_in_file('src/components/NotificationBell.tsx', r'let tempNotifs = \[\];', r'let tempNotifs: any[] = [];')

# Toaster
replace_in_file('src/components/ui/toaster.tsx', r'toasts\.map\(function \(\{ id, title, description, action, \.\.\.props \}', r'toasts.map(function ({ id, title, description, action, ...props }: any')

# Branches (Duplicate X import)
replace_in_file('src/pages/Branches.tsx', r'X,\s*X', r'X')

# Calendar
replace_in_file('src/pages/Calendar.tsx', r'import \{.*\} from "lucide-react";?', lambda m: m.group(0).replace('import {', 'import { toast,'))
replace_in_file('src/pages/Calendar.tsx', r'color\.hex', r'color')

# Dashboard
replace_in_file('src/pages/Dashboard.tsx', r'hasRecords:\s*boolean;', r'hasRecords: boolean; restDayToday?: boolean;')

# AttendanceDashboard
replace_in_file('src/pages/hr-analytics/AttendanceDashboard.tsx', r'export\s+interface\s+AttendanceRecord\s*\{', r'export interface AttendanceRecord {\n  temp_branch?: string;\n  status?: string;')
replace_in_file('src/pages/hr-analytics/AttendanceDashboard.tsx', r'bg:\s*string;', r'bg: string;\n  footer?: string;')

# LeaveFormView
replace_in_file('src/pages/LeaveFormView.tsx', r'selectedForm\.approvalHistory\.map', r'selectedForm.approvalHistory?.map')
replace_in_file('src/pages/LeaveFormView.tsx', r'selectedForm\.name', r'selectedForm.employee_name')
replace_in_file('src/pages/LeaveFormView.tsx', r'selectedForm\.employeeId', r'selectedForm.employee_id')

# LeaveOverview (Duplicate ApprovalStatusTracker)
replace_in_file('src/pages/LeaveOverview.tsx', r'import\s+ApprovalStatusTracker\s+from\s+"[^"]+";\n', r'')
replace_in_file('src/pages/LeaveOverview.tsx', r'tracker_type:\s*l\.type', r'tracker_type: l.type || ""')

# MyOutstation
replace_in_file('src/pages/outstation/MyOutstation.tsx', r'import\s+\{\s*(MapPin|Calendar)', r'import { Users, \1')

print("All applied")
