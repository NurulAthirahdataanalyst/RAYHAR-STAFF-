"""
Deep comprehensive fix: Find and fix ALL potential .map(), .filter(), .forEach() calls
that could fail when data is not an array (string, object, null, etc from API).

Specifically targets:
1. (x || []).map/filter/forEach 
2. x.map/filter/forEach where x comes from API data
3. (x?.y || []).map/filter/forEach
"""
import re
import os

files_changed = []

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    count = 0
    
    # Fix: (someVar.property || []).map/filter/forEach
    pattern1 = r'\((\w+(?:\.\w+)+)\s*\|\|\s*\[\]\)\.(map|filter|forEach|reduce|find|some|every|flatMap|flat)\('
    def replace1(m):
        nonlocal count
        varname = m.group(1)
        method = m.group(2)
        count += 1
        return f'(Array.isArray({varname}) ? {varname} : []).{method}('
    content = re.sub(pattern1, replace1, content)
    
    # Fix: (simpleVar || []).map/filter/forEach
    pattern2 = r'\((\w+)\s*\|\|\s*\[\]\)\.(map|filter|forEach|reduce|find|some|every|flatMap|flat)\('
    def replace2(m):
        nonlocal count
        varname = m.group(1)
        method = m.group(2)
        count += 1
        return f'(Array.isArray({varname}) ? {varname} : []).{method}('
    content = re.sub(pattern2, replace2, content)
    
    # Fix: (a?.b || []).map/filter/forEach
    pattern3 = r'\((\w+(?:\?\.\w+)+)\s*\|\|\s*\[\]\)\.(map|filter|forEach|reduce|find|some|every|flatMap|flat)\('
    def replace3(m):
        nonlocal count
        varname = m.group(1)
        method = m.group(2)
        count += 1
        return f'(Array.isArray({varname}) ? {varname} : []).{method}('
    content = re.sub(pattern3, replace3, content)
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        files_changed.append(f"{filepath}: {count} fixes")
        return count
    return 0

total = 0
for root, dirs, files in os.walk('src'):
    dirs[:] = [d for d in dirs if d != 'node_modules']
    for fname in files:
        if fname.endswith('.tsx') or fname.endswith('.ts'):
            fpath = os.path.join(root, fname)
            total += fix_file(fpath)

print(f"\nFiles changed:")
for f in files_changed:
    print(f" - {f}")
print(f"\nTotal patterns fixed: {total}")
