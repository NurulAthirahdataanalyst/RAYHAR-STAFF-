import os

def insert_back_button(file_path, back_path, back_text):
    if not os.path.exists(file_path):
        print(f"File {file_path} does not exist.")
        return

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # check if already has back button
    if "Back to" in content and "ArrowLeft" in content:
        print(f"File {file_path} already has a back button.")
        return

    # find where to insert
    # Usually right after <div className="space-y-6"> or similar main container wrapper
    # Let's just look for the first <div className="space-y-6 p-4 md:p-6 pb-20"> or similar
    
    # Or find the main title like <h1 className="..." or <h2 className="..."
    import re
    # We will search for a place to put the back button.
    # Usually above the main Title.
    
    match = re.search(r'(<div[^>]*>)?\s*(<div[^>]*>)?\s*<h1[^>]*>', content)
    if not match:
        # fallback
        match = re.search(r'(<div[^>]*>)?\s*(<div[^>]*>)?\s*<h2[^>]*>', content)

    if match:
        start_idx = match.start()
        
        # Ensure ArrowLeft is imported
        if "ArrowLeft" not in content:
            if "lucide-react" in content:
                content = re.sub(r'(import \{[^}]*)( \}[^\n]*"lucide-react";)', r'\1, ArrowLeft\2', content)
            else:
                content = "import { ArrowLeft } from 'lucide-react';\n" + content
                
        # Ensure useNavigate is imported if not
        if "useNavigate" not in content:
            if "react-router-dom" in content:
                content = re.sub(r'(import \{[^}]*)( \}[^\n]*"react-router-dom";)', r'\1, useNavigate\2', content)
            else:
                content = "import { useNavigate } from 'react-router-dom';\n" + content

        # Check if navigate is defined
        if "const navigate = useNavigate();" not in content:
            # inject inside the component
            # Find the component declaration
            comp_match = re.search(r'export default function \w+\([^)]*\) \{', content)
            if comp_match:
                content = content[:comp_match.end()] + "\n  const navigate = useNavigate();\n" + content[comp_match.end():]
        
        # The back button JSX
        back_btn = f"""
      <Button
        variant="ghost"
        className="mb-1 gap-2 px-0 text-foreground hover:bg-transparent hover:text-[#7B0099] transition-colors touch-target"
        onClick={{() => navigate("{back_path}")}}
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="text-[10px] font-black uppercase tracking-widest">
          {back_text}
        </span>
      </Button>
"""
        # Inject the back button before the h1/h2
        content = content[:start_idx] + back_btn + content[start_idx:]
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Added back button to {file_path}")
    else:
        print(f"Could not find title in {file_path}")


# 1. OutstationCalendar.tsx
insert_back_button('src/pages/outstation/OutstationCalendar.tsx', '/outstation', 'Back to Outstation Dashboard')

# 2. LeaveFormView.tsx
insert_back_button('src/pages/LeaveFormView.tsx', '/leave', 'Back to Leave Overview')

# 3. OutstationAssignment.tsx
insert_back_button('src/pages/outstation/OutstationAssignment.tsx', '/outstation', 'Back to Outstation Dashboard')

# 4. Employees.tsx
insert_back_button('src/pages/Employees.tsx', '/master', 'Back to Master Hub Control')

# 5. Role.tsx
insert_back_button('src/pages/master/Role.tsx', '/master', 'Back to Master Hub Control')

# 6. Department.tsx
insert_back_button('src/pages/master/Department.tsx', '/master', 'Back to Master Hub Control')
