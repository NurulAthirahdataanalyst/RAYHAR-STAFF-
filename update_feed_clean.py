with open(r'c:\Users\HP\ATTENDANCE_SYSTEM\backend\server.js', 'r', encoding='utf-8') as f:
    text = f.read()

layer1_replacement = """          CASE lr.status
            WHEN 'Pending Branch Leader' THEN CONCAT('submitted a Leave Request and Need Approval By ', COALESCE((SELECT CONCAT(UPPER(full_name), ' (BRANCH LEADER • ', COALESCE(branch, 'HQ'), ')') FROM profiles WHERE role='Branch Leader' AND branch=(SELECT branch FROM profiles WHERE user_id=lr.user_id) LIMIT 1), 'Branch Leader'))
            WHEN 'Pending HOD' THEN CONCAT('submitted a Leave Request and Need Approval By ', COALESCE((SELECT CONCAT(UPPER(full_name), ' (HOD • ', COALESCE(department, ''), ' • ', COALESCE(branch, 'HQ'), ')') FROM profiles WHERE role IN ('Head of Department', 'HOD') AND department=(SELECT department FROM profiles WHERE user_id=lr.user_id) AND branch=(SELECT branch FROM profiles WHERE user_id=lr.user_id) LIMIT 1), 'HOD'))
            WHEN 'Pending Operation Manager' THEN CONCAT('submitted a Leave Request and Need Approval By ', COALESCE((SELECT CONCAT(UPPER(full_name), ' (OPERATION MANAGER)') FROM profiles WHERE role IN ('Operation Manager', 'Operations Manager', 'Operation', 'Operations') LIMIT 1), 'Operation Manager'))
            WHEN 'Pending Finance' THEN CONCAT('submitted a Leave Request and Need Approval By ', COALESCE((SELECT CONCAT(UPPER(full_name), ' (FINANCE MANAGER)') FROM profiles WHERE role IN ('Finance Manager', 'Finance') LIMIT 1), 'Finance Manager'))
            WHEN 'Pending MD' THEN CONCAT('submitted a Leave Request and Need Approval By ', COALESCE((SELECT CONCAT(UPPER(full_name), ' (MANAGING DIRECTOR)') FROM profiles WHERE role IN ('Managing Director', 'MD') LIMIT 1), 'Managing Director'))
            ELSE 'submitted a Leave Request'
          END AS action,"""

layer2_replacement = """            CASE lr.status
              WHEN 'Pending Branch Leader' THEN CONCAT('submitted a Leave Request and Need Approval By ', COALESCE((SELECT CONCAT(UPPER(full_name), ' (BRANCH LEADER • ', COALESCE(branch, 'HQ'), ')') FROM profiles WHERE role='Branch Leader' AND branch=emp.branch LIMIT 1), 'Branch Leader'))
              WHEN 'Pending HOD' THEN CONCAT('submitted a Leave Request and Need Approval By ', COALESCE((SELECT CONCAT(UPPER(full_name), ' (HOD • ', COALESCE(department, ''), ' • ', COALESCE(branch, 'HQ'), ')') FROM profiles WHERE role IN ('Head of Department', 'HOD') AND department=emp.department AND branch=emp.branch LIMIT 1), 'HOD'))
              WHEN 'Pending Operation Manager' THEN CONCAT('submitted a Leave Request and Need Approval By ', COALESCE((SELECT CONCAT(UPPER(full_name), ' (OPERATION MANAGER)') FROM profiles WHERE role IN ('Operation Manager', 'Operations Manager', 'Operation', 'Operations') LIMIT 1), 'Operation Manager'))
              WHEN 'Pending Finance' THEN CONCAT('submitted a Leave Request and Need Approval By ', COALESCE((SELECT CONCAT(UPPER(full_name), ' (FINANCE MANAGER)') FROM profiles WHERE role IN ('Finance Manager', 'Finance') LIMIT 1), 'Finance Manager'))
              WHEN 'Pending MD' THEN CONCAT('submitted a Leave Request and Need Approval By ', COALESCE((SELECT CONCAT(UPPER(full_name), ' (MANAGING DIRECTOR)') FROM profiles WHERE role IN ('Managing Director', 'MD') LIMIT 1), 'Managing Director'))
              ELSE 'submitted a Leave Request'
            END AS action,"""

import re

old_layer1 = r"""          CASE lr\.status
            WHEN 'Pending HOD' THEN 'submitted a Leave Request and Need Your Approval'
            WHEN 'Pending Operation Manager' THEN 'submitted a Leave Request and Need Your Approval'
            WHEN 'Pending Finance' THEN 'submitted a Leave Request and Need Your Approval'
            WHEN 'Pending MD' THEN 'submitted a Leave Request and Need Your Approval'
            WHEN 'Pending Branch Leader' THEN 'submitted a Leave Request and Need Your Approval'
            ELSE 'submitted a Leave Request'
          END AS action,"""

old_layer2 = r"""            CASE lr\.status
              WHEN 'Pending HOD' THEN 'submitted a Leave Request and Need Your Approval'
              WHEN 'Pending Operation Manager' THEN 'submitted a Leave Request and Need Your Approval'
              WHEN 'Pending Finance' THEN 'submitted a Leave Request and Need Your Approval'
              WHEN 'Pending MD' THEN 'submitted a Leave Request and Need Your Approval'
              WHEN 'Pending Branch Leader' THEN 'submitted a Leave Request and Need Your Approval'
              ELSE 'submitted a Leave Request'
            END AS action,"""

# First, fix the actor in Layer 2
text = text.replace("emp.full_name AS actor,", "CONCAT(emp.full_name, ' (', COALESCE(emp.branch, 'HQ'), ')') AS actor,")

text = re.sub(old_layer1, layer1_replacement, text)
text = re.sub(old_layer2, layer2_replacement, text)

# Also update the team filter
old_filter = '''      if (role === "branch_leader" && branch) {
        teamFilter = "AND p.branch = ?";
        teamParams = [branch];
      } else if (role === "head_of_department" && department) {
        teamFilter = "AND p.department = ?";
        teamParams = [department];
      }'''

new_filter = '''      if (role === "branch_leader" || role === "head_of_department") {
        if (branch && department) {
          teamFilter = "AND p.branch = ? AND p.department = ?";
          teamParams = [branch, department];
        } else if (branch) {
          teamFilter = "AND p.branch = ?";
          teamParams = [branch];
        } else if (department) {
          teamFilter = "AND p.department = ?";
          teamParams = [department];
        }
      }'''

text = text.replace(old_filter, new_filter)

with open(r'c:\Users\HP\ATTENDANCE_SYSTEM\backend\server.js', 'w', encoding='utf-8') as f:
    f.write(text)
