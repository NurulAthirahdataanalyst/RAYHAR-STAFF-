import re

file_path = "c:\\Users\\HP\\ATTENDANCE_SYSTEM\\src\\pages\\Branches.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add useAuth import if it doesn't exist
if "import { useAuth }" not in content:
    content = content.replace('import { useNavigate } from "react-router-dom";', 'import { useNavigate } from "react-router-dom";\nimport { useAuth } from "@/contexts/AuthContext";')

# 2. Add useAuth hook inside Branches component
if "const { user } = useAuth();" not in content:
    content = content.replace("export default function Branches() {\n  const navigate = useNavigate();", "export default function Branches() {\n  const navigate = useNavigate();\n  const { user } = useAuth();")

# 3. Move the Edit Branch button.
# Old location: next to selectedBranch.code badge
old_button_location = """                  <Badge
                    variant="outline"
                    className="font-mono text-[10px] sm:text-xs bg-muted/30 border-border/60 px-3 py-1"
                  >
                    {selectedBranch.code}
                  </Badge>
                  <Button variant="outline" size="sm" onClick={openEditModal} className="h-8 text-xs font-bold ml-2">Edit Branch</Button>
                </div>"""

new_button_location = """                  <Badge
                    variant="outline"
                    className="font-mono text-[10px] sm:text-xs bg-muted/30 border-border/60 px-3 py-1"
                  >
                    {selectedBranch.code}
                  </Badge>
                </div>"""
content = content.replace(old_button_location, new_button_location)

# New location: beside the information of working days.
# Look for "Operating Hours"
old_operating_hours = """              {selectedBranch.operating_zone && (
                <div className="flex-shrink-0 bg-white dark:bg-card border-2 border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-md self-start">
                  <p className="mb-2"><span className="text-[10px] font-bold text-foreground uppercase tracking-wider">Operating Hours ({selectedBranch.operating_zone === 'ZONE_A' ? 'Zone A' : 'Zone B'})</span></p>"""

new_operating_hours = """              {selectedBranch.operating_zone && (
                <div className="flex-shrink-0 bg-white dark:bg-card border-2 border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-md self-start relative">
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <p><span className="text-[10px] font-bold text-foreground uppercase tracking-wider">Operating Hours ({selectedBranch.operating_zone === 'ZONE_A' ? 'Zone A' : 'Zone B'})</span></p>
                    {user?.role === 'hr_admin' && (
                      <Button variant="outline" size="sm" onClick={openEditModal} className="h-7 text-[10px] font-bold">Edit Branch</Button>
                    )}
                  </div>"""

content = content.replace(old_operating_hours, new_operating_hours)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated Branches.tsx")
