with open('backend/server.js', 'r', encoding='utf-8') as f:
    text = f.read()

old_query_part = """          FROM leave_approvals la
          LEFT JOIN profiles p2 ON p2.user_id = la.approver_id
          WHERE la.leave_id = lr.leave_id
        ) as approval_history
      FROM leave_requests lr"""

new_query_part = """          FROM leave_approvals la
          LEFT JOIN profiles p2 ON p2.user_id = la.approver_id
          WHERE la.leave_id = lr.leave_id
        ) as approval_history,
        (
          CASE 
            WHEN lr.status = 'Pending Branch Leader' THEN (SELECT UPPER(full_name) FROM profiles p2 WHERE p2.role IN ('Branch Leader', 'branch_leader') AND p2.branch = p.branch AND p2.status = 'Active' LIMIT 1)
            WHEN lr.status = 'Pending HOD' THEN (SELECT UPPER(full_name) FROM profiles p2 WHERE p2.role IN ('Head of Department', 'HOD', 'head_of_department') AND p2.department = p.department AND p2.branch = p.branch AND p2.status = 'Active' LIMIT 1)
            WHEN lr.status = 'Pending Operation Manager' THEN (SELECT UPPER(full_name) FROM profiles p2 WHERE p2.role IN ('Operation Manager', 'Operations Manager', 'Operation', 'Operations', 'operation_manager') AND p2.status = 'Active' LIMIT 1)
            WHEN lr.status = 'Pending MD' THEN (SELECT UPPER(full_name) FROM profiles p2 WHERE p2.role IN ('Managing Director', 'MD', 'managing_director') AND p2.status = 'Active' LIMIT 1)
            WHEN lr.status = 'Pending HR' THEN (SELECT UPPER(full_name) FROM profiles p2 WHERE p2.role IN ('HR Admin', 'hr_admin', 'HR') AND p2.status = 'Active' LIMIT 1)
            ELSE NULL
          END
        ) AS pending_approver_name
      FROM leave_requests lr"""

if old_query_part in text:
    text = text.replace(old_query_part, new_query_part)
    with open('backend/server.js', 'w', encoding='utf-8') as f:
        f.write(text)
    print("Replaced query!")
else:
    print("Could not find query part")
