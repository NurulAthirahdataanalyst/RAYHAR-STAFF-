import os

def wrap_button_in_file(filepath, btn_text):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # We will search for the Button block
    # It might be tricky, so let's use a regex or string replacement.
    import re
    # Match the Button tags containing the specific text
    pattern = r'(<Button[^>]*>.*?'+ btn_text + r'.*?</Button>)'
    
    match = re.search(pattern, content, flags=re.DOTALL)
    if match:
        button_code = match.group(1)
        # Check if already wrapped
        if f'{{role === "hr_admin" && (\n            {button_code}\n          )}}' not in content:
            new_button_code = f'{{role === "hr_admin" && (\n            {button_code}\n          )}}'
            content = content.replace(button_code, new_button_code)
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Updated {filepath}")
        else:
            print(f"Already updated {filepath}")
    else:
        print(f"Could not find {btn_text} in {filepath}")

wrap_button_in_file('src/pages/master/Department.tsx', 'Add New Department')
wrap_button_in_file('src/pages/master/Role.tsx', 'Add Roles')
