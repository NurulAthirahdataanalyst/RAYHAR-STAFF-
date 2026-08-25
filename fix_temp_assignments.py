import re
import os

with open('src/pages/TemporaryAssignments.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add primary_branch to interface
content = content.replace(
    'temp_branch: string;',
    'temp_branch: string;\n  primary_branch?: string;'
)

# Extract userBranch and userDepartment
content = content.replace(
    'const { role } = useRole();',
    'const { role, userBranch, userDepartment } = useRole();'
)

# Apply filtering logic
old_filter = '''  const filteredAssignments = assignments.filter((a) => {
    const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase()) || 
                          a.temp_branch.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || a.computedStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });'''

new_filter = '''  const filteredAssignments = assignments.filter((a) => {
    const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase()) || 
                          a.temp_branch.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || a.computedStatus === statusFilter;
    
    let matchesRole = true;
    if (role === "branch_leader") {
      matchesRole = a.primary_branch === userBranch;
    } else if (role === "head_of_department") {
      matchesRole = a.department === userDepartment;
    }
    
    return matchesSearch && matchesStatus && matchesRole;
  });'''

content = content.replace(old_filter, new_filter)

# Use filteredAssignments for counts
content = content.replace(
    '''  const activeCount = assignments.filter(a => a.computedStatus === 'Active').length;
  const upcomingCount = assignments.filter(a => a.computedStatus === 'Upcoming').length;
  const completedCount = assignments.filter(a => a.computedStatus === 'Completed').length;''',
    '''  const activeCount = filteredAssignments.filter(a => a.computedStatus === 'Active').length;
  const upcomingCount = filteredAssignments.filter(a => a.computedStatus === 'Upcoming').length;
  const completedCount = filteredAssignments.filter(a => a.computedStatus === 'Completed').length;'''
)

# Hide assign button for non-HR
content = content.replace(
    '<Button onClick={() => setShowAssignModal(true)} className="bg-[#7B0099] hover:bg-[#6A0080] text-white whitespace-nowrap">',
    '{isHRAdmin && <Button onClick={() => setShowAssignModal(true)} className="bg-[#7B0099] hover:bg-[#6A0080] text-white whitespace-nowrap">'
)
content = content.replace(
    '          </Button>\n        </div>\n      </div>',
    '          </Button>}\n        </div>\n      </div>'
)

# In the table, hide actions column for non-HR
old_th = '<TableHead className="font-bold text-slate-900 dark:text-slate-100 text-center">ACTIONS</TableHead>'
new_th = '{isHRAdmin && <TableHead className="font-bold text-slate-900 dark:text-slate-100 text-center">ACTIONS</TableHead>}'
content = content.replace(old_th, new_th)

old_td = '''<TableCell className="px-5 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button variant="ghost" size="sm" onClick={(e) => handleEditClick(e, a)}>Edit</Button>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50" onClick={(e) => { e.stopPropagation(); setDeletingAssignment(a); setShowDeleteModal(true); }}>Delete</Button>
                    </div>
                  </TableCell>'''
new_td = '''{isHRAdmin && <TableCell className="px-5 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button variant="ghost" size="sm" onClick={(e) => handleEditClick(e, a)}>Edit</Button>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50" onClick={(e) => { e.stopPropagation(); setDeletingAssignment(a); setShowDeleteModal(true); }}>Delete</Button>
                    </div>
                  </TableCell>}'''
content = content.replace(old_td, new_td)

with open('src/pages/TemporaryAssignments.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated TemporaryAssignments.tsx")
