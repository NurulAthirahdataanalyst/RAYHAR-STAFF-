with open('src/pages/GPSLocationTracker.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

old_fetch = """      let queryParams = "";
      if (userRole === "branch_leader" && userBranch) {
        queryParams = `?role=branch_leader&branch=${encodeURIComponent(userBranch)}`;
      } else if (userRole === "head_of_department" && userDepartment) {
        queryParams = `?role=head_of_department&department=${encodeURIComponent(userDepartment)}`;
      }"""

new_fetch = """      let queryParams = "";
      const userRole = role || user?.role || "";
      const userBranch = user?.branch || "";
      const userDepartment = user?.department || "";
      
      if (userRole === "branch_leader" && userBranch) {
        queryParams = `?role=branch_leader&branch=${encodeURIComponent(userBranch)}`;
      } else if (userRole === "head_of_department" && userDepartment) {
        queryParams = `?role=head_of_department&department=${encodeURIComponent(userDepartment)}`;
      }"""

if old_fetch in text:
    text = text.replace(old_fetch, new_fetch)
    with open('src/pages/GPSLocationTracker.tsx', 'w', encoding='utf-8') as f:
        f.write(text)
    print("Fixed variables")
