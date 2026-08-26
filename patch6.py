import re

file_path = 'src/components/shared/EmployeesRequiringAttentionCard.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add imports
if 'useEffect' not in content:
    content = content.replace("import React from 'react';", "import React, { useState, useEffect } from 'react';")
else:
    if 'useState' not in content:
        content = content.replace("import React, {", "import React, { useState,")

if 'API_BASE_URL' not in content:
    content = content.replace("import { Card } from '@/components/ui/card';", "import { Card } from '@/components/ui/card';\nimport { API_BASE_URL } from '@/config/api';")

# Add the fetching logic inside the component
fetch_logic = """
  const [allLeaves, setAllLeaves] = useState<any[]>([]);

  useEffect(() => {
    if (!data || data.length === 0) return;
    fetch(${API_BASE_URL}/api/leave-requests)
      .then(res => res.json())
      .then(json => {
        if (json.success) setAllLeaves(json.leaveRequests || []);
      })
      .catch(console.error);
  }, [data]);

  const getLeaveBreakdown = (empId: string) => {
    const breakdown = { AL: 0, UL: 0, RL: 0, MC: 0 };
    if (!allLeaves.length) return breakdown;

    const empLeaves = allLeaves.filter((l: any) => l.user_id === empId && l.status !== "Rejected" && l.status !== "Cancelled");
    
    empLeaves.forEach((l: any) => {
       const type = l.leave_type || l.type || "";
       const days = parseFloat(l.days) || 0;
       if (type.includes("Annual") || type.includes("Emergency")) breakdown.AL += days;
       else if (type.includes("Unpaid")) breakdown.UL += days;
       else if (type.includes("Replacement") || type.includes("Cuti Ganti")) breakdown.RL += days;
       else if (type.includes("Medical") || type.includes("Sick") || type.includes("MC")) breakdown.MC += days;
    });
    return breakdown;
  };
"""

content = content.replace("export const EmployeesRequiringAttentionCard = ({ data = [], variant = 'grid', onEmployeeClick }: { data?: EmployeeAttentionData[], variant?: 'compact' | 'grid', onEmployeeClick?: (id: string) => void }) => {", 
"export const EmployeesRequiringAttentionCard = ({ data = [], variant = 'grid', onEmployeeClick }: { data?: EmployeeAttentionData[], variant?: 'compact' | 'grid', onEmployeeClick?: (id: string) => void }) => {" + fetch_logic)

# Replace the branch area to include the tags in both compact and grid views
# For grid view:
grid_find = """
                    <div className="flex items-center gap-1.5 text-foreground text-xs font-medium pl-[22px]">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-foreground" />
                      <span className="truncate">{emp.branch}</span>
                    </div>
                  </div>
"""

tags_html = """
                    <div className="flex items-center gap-1.5 text-foreground text-xs font-medium pl-[22px]">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-foreground" />
                      <span className="truncate">{emp.branch}</span>
                    </div>
                    
                    {/* LEAVE TAGS */}
                    <div className="flex items-center gap-1.5 pl-[22px] mt-2 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-200" title="Annual Leave">AL {getLeaveBreakdown(emp.id).AL}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-50 text-orange-600 border border-orange-200" title="Unpaid Leave">UL {getLeaveBreakdown(emp.id).UL}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-600 border border-purple-200" title="Replacement Leave">RL {getLeaveBreakdown(emp.id).RL}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-600 border border-red-200" title="Medical Leave">MC {getLeaveBreakdown(emp.id).MC}</span>
                    </div>
                  </div>
"""

content = content.replace(grid_find, tags_html)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched EmployeesRequiringAttentionCard.tsx")
