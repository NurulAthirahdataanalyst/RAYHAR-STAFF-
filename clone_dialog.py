import os

path = r"src\pages\Employees.tsx"
out_path = r"src\components\shared\StaffProfileDialog.tsx"

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the component signature
old_sig = "export default function Employees() {"
new_sig = """export function StaffProfileDialog({ 
  employeeId, 
  isOpen, 
  onClose 
}: { 
  employeeId: string | null; 
  isOpen: boolean; 
  onClose: () => void; 
}) {"""

content = content.replace(old_sig, new_sig)

# We need to fetch the employee data when employeeId changes
# Employees.tsx already has: const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
# We can just fetch it!
inject_effect = """
  useEffect(() => {
    if (isOpen && employeeId) {
      // Fetch employee basic info
      fetch(`${API_BASE_URL}/api/employees`)
        .then(r => r.json())
        .then(data => {
           if(data.success) {
              const emp = data.employees.find((e: any) => e.user_id === employeeId || e.id === employeeId);
              if(emp) {
                 setSelectedEmployee(emp);
                 setIsModalOpen(true);
              }
           }
        });
    } else {
      setIsModalOpen(false);
      setSelectedEmployee(null);
    }
  }, [employeeId, isOpen]);

  // Sync internal modal state with onClose
  useEffect(() => {
    if (!isModalOpen && isOpen) {
      onClose();
    }
  }, [isModalOpen]);
"""

# Insert it after `const [employeeLeaves, setEmployeeLeaves] = useState<any[]>([]);`
insert_pos = content.find('const [employeeLeaves, setEmployeeLeaves] = useState<any[]>([]);')
if insert_pos != -1:
    insert_pos += len('const [employeeLeaves, setEmployeeLeaves] = useState<any[]>([]);')
    content = content[:insert_pos] + inject_effect + content[insert_pos:]


# Remove everything in the return statement before the Dialog!
return_start = content.find('return (')
if return_start != -1:
    dialog_start = content.find('{/* Employee Details Modal */}', return_start)
    if dialog_start != -1:
        # We need to keep the wrapper or just return a Fragment
        new_return = "return (\n    <>\n      " + content[dialog_start:]
        # Wait, the end of the file has `</div>\n  );\n}\n`
        # We need to change the final `</div>` to `</>`
        content = content[:return_start] + new_return
        
        last_div = content.rfind('</div>')
        if last_div != -1:
            content = content[:last_div] + '</>' + content[last_div+6:]

with open(out_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Created StaffProfileDialog.tsx")
