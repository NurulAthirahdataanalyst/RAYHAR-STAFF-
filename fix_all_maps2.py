import re
import glob

def make_safe(match):
    inner = match.group(1)
    return f"(Array.isArray({inner}) ? {inner} : []).map"

files = glob.glob('src/**/*.tsx', recursive=True) + glob.glob('src/**/*.ts', recursive=True)
count = 0
for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # Simple variables only!
    content = re.sub(r'\(\(\s*([a-zA-Z0-9_?.\[\]]+)\s*\|\|\s*\[\]\s*\)\)\.map', make_safe, content)
    content = re.sub(r'\(\s*([a-zA-Z0-9_?.\[\]]+)\s*\|\|\s*\[\]\s*\)\.map', make_safe, content)
    
    # Special cases in StaffProfileDialog where paginatedHistory and others might be a string
    content = content.replace("const paginatedHistory = locationHistory.slice(startIndex, startIndex + historyItemsPerPage);", "const paginatedHistory = Array.isArray(locationHistory) ? locationHistory.slice(startIndex, startIndex + historyItemsPerPage) : [];")
    content = content.replace("const locationHistory = selectedEmployee?.locationHistory || [];", "const locationHistory = Array.isArray(selectedEmployee?.locationHistory) ? selectedEmployee.locationHistory : [];")
    
    if content != original:
        with open(file, 'w', encoding='utf-8') as f:
            f.write(content)
        count += 1

print(f"Replaced maps with Array.isArray checks in {count} files!")
