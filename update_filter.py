with open(r'c:\Users\HP\ATTENDANCE_SYSTEM\backend\server.js', 'r', encoding='utf-8') as f:
    text = f.read()

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
