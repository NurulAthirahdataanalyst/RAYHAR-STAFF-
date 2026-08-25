import os
import re

def process_file(file_path):
    if not os.path.exists(file_path): return
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the line with TOTAL SHOWING
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if "TOTAL SHOWING" in line and "<Select>" not in line and "<span>Show</span>" not in line and "SelectContent" not in "".join(lines[i:i+20]):
            # Extract variables
            # E.g. TOTAL SHOWING {(page-1)*pageSize + 1}
            # Or TOTAL SHOWING {indexOfFirstItem + 1}
            # We just need to find what the state variable for pagination is
            
            # Find the state setter: usually setEntriesPerPage, setPageSize, setLimit, setItemsPerPage
            setter = "setPageSize"
            getter = "pageSize"
            page_setter = "setPage"
            if "setEntriesPerPage" in content:
                setter = "setEntriesPerPage"
                getter = "entriesPerPage"
                page_setter = "setCurrentPage"
            elif "setItemsPerPage" in content:
                setter = "setItemsPerPage"
                getter = "itemsPerPage"
                page_setter = "setCurrentPage"
            elif "setLimit" in content:
                setter = "setLimit"
                getter = "limit"
                page_setter = "setCurrentPage"
                
            # If the current file is reports, the page setter is setCurrentPage and pageSize is pageSize
            if "reports" in file_path:
                setter = "setPageSize"
                getter = "pageSize"
                page_setter = "setCurrentPage"

            print(f"Modifying {file_path} - setter={setter}, getter={getter}")
            
            # The line usually looks like:
            # <span>TOTAL SHOWING ... ENTRIES</span>
            # or
            # <div ...><span>TOTAL SHOWING ... ENTRIES</span></div>
            # We want to replace the span with the span + the dropdown
            
            # Let's just find the span containing TOTAL SHOWING
            match = re.search(r'(<span[^>]*>TOTAL SHOWING.*?ENTRIES</span>)', line)
            if not match:
                # maybe no span?
                match = re.search(r'(TOTAL SHOWING.*?ENTRIES)', line)
                if match:
                    span_content = "<span>" + match.group(1) + "</span>"
                else:
                    continue
            else:
                span_content = match.group(1)

            dropdown = f'''
                <div className="flex items-center gap-2">
                  <span>Show</span>
                  <Select 
                    value={{{getter}.toString()}} 
                    onValueChange={{(val) => {{ {setter}(Number(val)); {page_setter}(1); }}}}
                  >
                    <SelectTrigger className="h-7 text-[10px] font-bold rounded border-border w-[60px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
            '''
            
            # replace in line
            if "<span" in match.group(0):
                new_line = line.replace(match.group(0), f"{match.group(0)}{dropdown}")
            else:
                new_line = line.replace(match.group(0), f"<span>{match.group(0)}</span>{dropdown}")
            
            # If the new_line doesn't have a wrapping div for the flex container, we might need one.
            # Usually it's inside `<div className="... gap-4 ...">`
            # Let's just do a simple replace
            lines[i] = new_line

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write("\n".join(lines))

files_to_check = [
    r"c:\Users\HP\ATTENDANCE_SYSTEM\src\pages\Attendance.tsx",
    r"c:\Users\HP\ATTENDANCE_SYSTEM\src\pages\hr-analytics\AttendanceDashboard.tsx",
    r"c:\Users\HP\ATTENDANCE_SYSTEM\src\pages\LeaveAdmin.tsx",
    r"c:\Users\HP\ATTENDANCE_SYSTEM\src\pages\master\EntitlementHistoryPanel.tsx",
    r"c:\Users\HP\ATTENDANCE_SYSTEM\src\pages\outstation\OutstationDashboard.tsx",
    r"c:\Users\HP\ATTENDANCE_SYSTEM\src\pages\reports\AttendanceReports.tsx",
    r"c:\Users\HP\ATTENDANCE_SYSTEM\src\pages\reports\LeaveReports.tsx",
    r"c:\Users\HP\ATTENDANCE_SYSTEM\src\pages\TeamAttendance.tsx"
]

for f in files_to_check:
    process_file(f)

# Also fix the existing ones to have 10, 25, 50, 100
existing = [
    r"c:\Users\HP\ATTENDANCE_SYSTEM\src\pages\EmployeeAnalytics.tsx",
    r"c:\Users\HP\ATTENDANCE_SYSTEM\src\pages\Employees.tsx",
    r"c:\Users\HP\ATTENDANCE_SYSTEM\src\pages\master\LeaveEntitlementManagement.tsx",
    r"c:\Users\HP\ATTENDANCE_SYSTEM\src\pages\outstation\OutstationAssignment.tsx"
]

for f in existing:
    if not os.path.exists(f): continue
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # replace SelectContent
    new_content = re.sub(
        r"<SelectContent>.*?</SelectContent>",
        r'''<SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>''',
        content,
        flags=re.DOTALL
    )
    with open(f, 'w', encoding='utf-8') as file:
        file.write(new_content)
