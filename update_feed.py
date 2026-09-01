with open(r'c:\Users\HP\ATTENDANCE_SYSTEM\backend\server.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

layer1_replacement = """          CASE lr.status
            WHEN 'Pending Branch Leader' THEN CONCAT('submitted a Leave Request and Need Approval By ', COALESCE((SELECT CONCAT(UPPER(full_name), ' (BRANCH LEADER • ', COALESCE(branch, 'HQ'), ')') FROM profiles WHERE role='Branch Leader' AND branch=(SELECT branch FROM profiles WHERE user_id=lr.user_id) LIMIT 1), 'Branch Leader'))
            WHEN 'Pending HOD' THEN CONCAT('submitted a Leave Request and Need Approval By ', COALESCE((SELECT CONCAT(UPPER(full_name), ' (HOD • ', COALESCE(department, ''), ' • ', COALESCE(branch, 'HQ'), ')') FROM profiles WHERE role IN ('Head of Department', 'HOD') AND department=(SELECT department FROM profiles WHERE user_id=lr.user_id) AND branch=(SELECT branch FROM profiles WHERE user_id=lr.user_id) LIMIT 1), 'HOD'))
            WHEN 'Pending Operation Manager' THEN CONCAT('submitted a Leave Request and Need Approval By ', COALESCE((SELECT CONCAT(UPPER(full_name), ' (OPERATION MANAGER)') FROM profiles WHERE role IN ('Operation Manager', 'Operations Manager') LIMIT 1), 'Operation Manager'))
            WHEN 'Pending Finance' THEN CONCAT('submitted a Leave Request and Need Approval By ', COALESCE((SELECT CONCAT(UPPER(full_name), ' (FINANCE MANAGER)') FROM profiles WHERE role IN ('Finance Manager', 'Finance') LIMIT 1), 'Finance Manager'))
            WHEN 'Pending MD' THEN CONCAT('submitted a Leave Request and Need Approval By ', COALESCE((SELECT CONCAT(UPPER(full_name), ' (MANAGING DIRECTOR)') FROM profiles WHERE role IN ('Managing Director', 'MD') LIMIT 1), 'Managing Director'))
            ELSE 'submitted a Leave Request'
          END AS action,
"""

layer2_action = """            CASE lr.status
              WHEN 'Pending Branch Leader' THEN CONCAT('submitted a Leave Request and Need Approval By ', COALESCE((SELECT CONCAT(UPPER(full_name), ' (BRANCH LEADER • ', COALESCE(branch, 'HQ'), ')') FROM profiles WHERE role='Branch Leader' AND branch=emp.branch LIMIT 1), 'Branch Leader'))
              WHEN 'Pending HOD' THEN CONCAT('submitted a Leave Request and Need Approval By ', COALESCE((SELECT CONCAT(UPPER(full_name), ' (HOD • ', COALESCE(department, ''), ' • ', COALESCE(branch, 'HQ'), ')') FROM profiles WHERE role IN ('Head of Department', 'HOD') AND department=emp.department AND branch=emp.branch LIMIT 1), 'HOD'))
              WHEN 'Pending Operation Manager' THEN CONCAT('submitted a Leave Request and Need Approval By ', COALESCE((SELECT CONCAT(UPPER(full_name), ' (OPERATION MANAGER)') FROM profiles WHERE role IN ('Operation Manager', 'Operations Manager') LIMIT 1), 'Operation Manager'))
              WHEN 'Pending Finance' THEN CONCAT('submitted a Leave Request and Need Approval By ', COALESCE((SELECT CONCAT(UPPER(full_name), ' (FINANCE MANAGER)') FROM profiles WHERE role IN ('Finance Manager', 'Finance') LIMIT 1), 'Finance Manager'))
              WHEN 'Pending MD' THEN CONCAT('submitted a Leave Request and Need Approval By ', COALESCE((SELECT CONCAT(UPPER(full_name), ' (MANAGING DIRECTOR)') FROM profiles WHERE role IN ('Managing Director', 'MD') LIMIT 1), 'Managing Director'))
              ELSE 'submitted a Leave Request'
            END AS action,
"""

in_layer1 = False
in_layer2 = False
skip_action = False

for i, line in enumerate(lines):
    if "SELECT 'leave' AS type, 'You' AS actor," in line:
        in_layer1 = True
    elif "-- Leave submissions (Pending states)" in line:
        in_layer2 = True
    
    if in_layer1 and "CASE lr.status" in line:
        lines[i] = layer1_replacement
        skip_action = True
    elif in_layer2 and "CASE lr.status" in line:
        lines[i] = layer2_action
        skip_action = True
        
    if skip_action and "END AS action," in line:
        lines[i] = ""
        skip_action = False
        if in_layer1:
            in_layer1 = False
        elif in_layer2:
            in_layer2 = False
    elif skip_action:
        lines[i] = ""

    # Fix actor in Layer 2
    if in_layer2 and "emp.full_name AS actor," in line:
        lines[i] = "            CONCAT(emp.full_name, ' (', COALESCE(emp.branch, 'HQ'), ')') AS actor,\n"

with open(r'c:\Users\HP\ATTENDANCE_SYSTEM\backend\server.js', 'w', encoding='utf-8') as f:
    f.writelines(lines)
