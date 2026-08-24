import re
import os

def insert_back_btn(filepath, route, label):
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return
        
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check if navigate import exists
    if not re.search(r'import\s+\{.*useNavigate.*\}\s+from\s+["\']react-router-dom["\']', content):
        content = re.sub(r'(import React.*?\n)', r'\1import { useNavigate } from "react-router-dom";\n', content)
        
    if not re.search(r'ArrowLeft', content):
        content = re.sub(r'(import \{.*?)\}\s+from\s+["\']lucide-react["\']', r'\1, ArrowLeft } from "lucide-react"', content)
        
    if not re.search(r'const navigate\s*=\s*useNavigate', content):
        content = re.sub(r'(export default function .*?\(.*?\) \{)', r'\1\n  const navigate = useNavigate();\n', content)
        content = re.sub(r'(export function .*?\(.*?\) \{)', r'\1\n  const navigate = useNavigate();\n', content)
        
    button_html = f'''
        <div className="mb-4">
          <Button
            variant="ghost"
            size="sm"
            className="mb-1 gap-2 px-0 text-foreground hover:bg-transparent hover:text-[#7B0099] transition-colors touch-target"
            onClick={{() => navigate("{route}")}}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">
              {label}
            </span>
          </Button>
        </div>
'''
    if 'Back to' not in content and label not in content:
        # Try to insert after the main container div
        content = re.sub(r'(return \(\s*<div[^>]*animate-in fade-in[^>]*>)', r'\1\n' + button_html, content)
        
        # If it doesn't match the fade-in, try to match the first div inside return (
        if button_html not in content:
             content = re.sub(r'(return \(\s*<div[^>]*>)', r'\1\n' + button_html, content, count=1)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

# 1. OutstationCalendar -> My Outstation
insert_back_btn('src/pages/outstation/OutstationCalendar.tsx', '/outstation/my', 'Back to My Outstation')
# 2. LeaveFormView -> Leave Overview
insert_back_btn('src/pages/LeaveFormView.tsx', '/leave', 'Back to Leave Overview')
# 3. OutstationAssignment -> Outstation Dashboard
insert_back_btn('src/pages/outstation/OutstationAssignment.tsx', '/outstation', 'Back to Outstation Dashboard')
# 4. Employees -> Employee Management
insert_back_btn('src/pages/Employees.tsx', '/master', 'Back to Employee Management')
# 5. Role -> Employee Management
insert_back_btn('src/pages/master/Role.tsx', '/master', 'Back to Employee Management')
# 6. Department -> Employee Management
insert_back_btn('src/pages/master/Department.tsx', '/master', 'Back to Employee Management')

print("Done")
