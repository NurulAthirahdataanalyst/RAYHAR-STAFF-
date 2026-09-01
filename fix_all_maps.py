import re
import glob

def make_safe(match):
    inner = match.group(1)
    # If inner is something like `data.employees`, we replace it with `(Array.isArray(data.employees) ? data.employees : [])`
    # But if inner contains function calls or complex logic, we have to be careful not to duplicate side effects.
    # Luckily, all the variables are simple properties or variables.
    return f"(Array.isArray({inner}) ? {inner} : []).map"

# Also handle `((X || [])).map`
def make_safe_double(match):
    inner = match.group(1)
    return f"(Array.isArray({inner}) ? {inner} : []).map"

files = glob.glob('src/**/*.tsx', recursive=True)
for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace ((X || [])).map
    content = re.sub(r'\(\(([a-zA-Z0-9_?.\[\]\(\)]+)\s*\|\|\s*\[\]\)\)\.map', make_safe_double, content)
    
    # Replace (X || []).map
    content = re.sub(r'\(([a-zA-Z0-9_?.\[\]\(\)]+)\s*\|\|\s*\[\]\)\.map', make_safe, content)
    
    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)

print("Replaced all unsafe maps with Array.isArray checks!")
