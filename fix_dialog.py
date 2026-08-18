import os

path = r"src\components\shared\StaffProfileDialog.tsx"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the API import
content = content.replace("from '../config/api'", "from '@/config/api'")
content = content.replace('from "../config/api"', 'from "@/config/api"')

# Fix isModalOpen used before declaration
# We need to move the injected effect AFTER `const [isModalOpen, setIsModalOpen] = useState(false);`
# But let's just replace `isModalOpen` inside the effect with `isOpen`?
# No, we need `setIsModalOpen(true)`!
# Let's find the effect block and move it.

effect_block = """  useEffect(() => {
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
  }, [isModalOpen]);"""

if effect_block in content:
    content = content.replace(effect_block, "")
    # Insert it right after `const [analytics, setAnalytics] = useState<any>(null);`
    target = 'const [analytics, setAnalytics] = useState<any>(null);'
    idx = content.find(target)
    if idx != -1:
        content = content[:idx+len(target)] + "\n" + effect_block + content[idx+len(target):]

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed dialog")
