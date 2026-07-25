import os

# Fix server.js
server_path = r"c:\Users\HP\ATTENDANCE_SYSTEM\backend\server.js"
with open(server_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. fix dashboard-stats annual_adjustment
content = content.replace(
    "leave_type IN ('Annual Leave', 'Annual & Emergency Leave', 'Annual/Emergency Leave', 'Cuti Tahunan')",
    "UPPER(leave_type) IN ('ANNUAL LEAVE', 'ANNUAL & EMERGENCY LEAVE', 'ANNUAL/EMERGENCY LEAVE', 'CUTI TAHUNAN')"
)

# 2. fix dashboard-stats used_days annual
content = content.replace(
    "leave_type IN ('Cuti Tahunan', 'Annual Leave', 'Annual/Emergency Leave', 'Annual & Emergency Leave', 'Kecemasan', 'Emergency')",
    "UPPER(leave_type) IN ('CUTI TAHUNAN', 'ANNUAL LEAVE', 'ANNUAL/EMERGENCY LEAVE', 'ANNUAL & EMERGENCY LEAVE', 'KECEMASAN', 'EMERGENCY')"
)

# 3. fix dashboard-stats used_days replacement
content = content.replace(
    "leave_type IN ('Replacement Leave', 'Cuti Ganti')",
    "UPPER(leave_type) IN ('REPLACEMENT LEAVE', 'CUTI GANTI')"
)

# 4. fix user-details total_adjustment
content = content.replace(
    'const [adjRows] = await pool.query("SELECT COALESCE(SUM(adjustment_days), 0) AS total_adjustment FROM leave_balance_adjustments WHERE employee_id = ?", [userId]);',
    'const [adjRows] = await pool.query("SELECT COALESCE(SUM(adjustment_days), 0) AS total_adjustment FROM leave_balance_adjustments WHERE employee_id = ? AND UPPER(leave_type) IN (\'ANNUAL LEAVE\', \'ANNUAL & EMERGENCY LEAVE\', \'ANNUAL/EMERGENCY LEAVE\', \'CUTI TAHUNAN\')", [userId]);'
)

with open(server_path, 'w', encoding='utf-8') as f:
    f.write(content)


# Fix EmployeeAnalyticsView.tsx
view_path = r"c:\Users\HP\ATTENDANCE_SYSTEM\src\pages\EmployeeAnalyticsView.tsx"
with open(view_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "return type === 'CUTI TAHUNAN' || type === 'ANNUAL/EMERGENCY LEAVE' || type === 'ANNUAL & EMERGENCY LEAVE';",
    "return type === 'CUTI TAHUNAN' || type === 'ANNUAL LEAVE' || type === 'ANNUAL/EMERGENCY LEAVE' || type === 'ANNUAL & EMERGENCY LEAVE';"
)

content = content.replace(
    "return ['CUTI TAHUNAN', 'ANNUAL/EMERGENCY LEAVE', 'ANNUAL & EMERGENCY LEAVE', 'CUTI SAKIT', 'SICK LEAVE', 'KECEMASAN', 'EMERGENCY'].includes(type);",
    "return ['CUTI TAHUNAN', 'ANNUAL LEAVE', 'ANNUAL/EMERGENCY LEAVE', 'ANNUAL & EMERGENCY LEAVE', 'CUTI SAKIT', 'SICK LEAVE', 'KECEMASAN', 'EMERGENCY'].includes(type);"
)

with open(view_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixes applied.")
