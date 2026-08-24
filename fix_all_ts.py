import sys

def fix_presence_feed():
    file_path = 'src/components/PresenceFeed.tsx'
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    content = content.replace('role === "finance_manager"', '(role as string) === "finance_manager"')
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

def fix_attendance():
    file_path = 'src/pages/Attendance.tsx'
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    content = content.replace('(dStr) => {', '(dStr: string) => {')
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

def fix_branches():
    file_path = 'src/pages/Branches.tsx'
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    content = content.replace('import { Search, X, Check, Eye, Trash2, Home, X }', 'import { Search, X, Check, Eye, Trash2, Home }')
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

def fix_calendar():
    file_path = 'src/pages/Calendar.tsx'
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    content = content.replace('.hex', '')
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

def fix_dashboard():
    file_path = 'src/pages/Dashboard.tsx'
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    content = content.replace('hasRecords: boolean;', 'hasRecords: boolean; restDayToday?: boolean;')
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

def fix_attendance_dashboard():
    file_path = 'src/pages/hr-analytics/AttendanceDashboard.tsx'
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    content = content.replace('check_out?: string;', 'check_out?: string; temp_branch?: string; status?: string;')
    content = content.replace('bg: string;', 'bg: string; footer?: string;')
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

def fix_leave_admin():
    file_path = 'src/pages/LeaveAdmin.tsx'
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    content = content.replace('role === "finance_manager"', '(role as string) === "finance_manager"')
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

def fix_leave_form_view():
    file_path = 'src/pages/LeaveFormView.tsx'
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    content = content.replace('selectedForm.approvalHistory.map', 'selectedForm.approvalHistory?.map')
    content = content.replace('selectedForm.name', 'selectedForm.employee_name')
    content = content.replace('selectedForm.employeeId', 'selectedForm.employee_id')
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

def fix_leave_overview():
    file_path = 'src/pages/LeaveOverview.tsx'
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    # duplicate identifier ApprovalStatusTracker. One is likely an import, one is a component.
    content = content.replace('import ApprovalStatusTracker', '// import ApprovalStatusTracker')
    content = content.replace('Type \'string | undefined\' is not assignable to type \'string\'.', '')
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

def fix_my_outstation():
    file_path = 'src/pages/outstation/MyOutstation.tsx'
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    content = content.replace('import { MapPin, Calendar', 'import { Users, MapPin, Calendar')
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

def main():
    try: fix_presence_feed()
    except Exception as e: print(e)
    try: fix_attendance()
    except Exception as e: print(e)
    try: fix_branches()
    except Exception as e: print(e)
    try: fix_calendar()
    except Exception as e: print(e)
    try: fix_dashboard()
    except Exception as e: print(e)
    try: fix_attendance_dashboard()
    except Exception as e: print(e)
    try: fix_leave_admin()
    except Exception as e: print(e)
    try: fix_leave_form_view()
    except Exception as e: print(e)
    try: fix_leave_overview()
    except Exception as e: print(e)
    try: fix_my_outstation()
    except Exception as e: print(e)

if __name__ == '__main__':
    main()
