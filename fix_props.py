import os

view_path = r"c:\Users\HP\ATTENDANCE_SYSTEM\src\pages\EmployeeAnalyticsView.tsx"
with open(view_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "const [leaveRequests, setLeaveRequests] = useState<any[]>(propLeaveRequests);",
    "const leaveRequests = propLeaveRequests;"
)

with open(view_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Props fixed")
