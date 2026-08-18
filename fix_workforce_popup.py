import os

path = r"src\pages\hr-analytics\WorkforceInsights.tsx"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add the import
import_stmt = "import { StaffProfileDialog } from '@/components/shared/StaffProfileDialog';\n"
if "StaffProfileDialog" not in content:
    idx = content.find("import {")
    content = content[:idx] + import_stmt + content[idx:]

# Add state
state_stmt = """
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
"""
if "selectedStaffId" not in content:
    idx = content.find("const [searchQuery, setSearchQuery] = useState")
    content = content[:idx] + state_stmt + content[idx:]

# Replace EmployeesRequiringAttentionCard to pass onClick
old_card = '<EmployeesRequiringAttentionCard data={data.performance?.attentionEmployees || []} variant="grid" />'
new_card = '<EmployeesRequiringAttentionCard data={data.performance?.attentionEmployees || []} variant="grid" onEmployeeClick={(id) => setSelectedStaffId(id)} />'
content = content.replace(old_card, new_card)

# Add the Dialog at the end
dialog_stmt = """
      <StaffProfileDialog 
        employeeId={selectedStaffId} 
        isOpen={!!selectedStaffId} 
        onClose={() => setSelectedStaffId(null)} 
      />
    </div>
  );
"""
content = content.replace('    </div>\n  );\n', dialog_stmt)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated WorkforceInsights.tsx")
