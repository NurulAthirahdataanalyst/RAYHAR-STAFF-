"""
Global fix: Replace ALL .map() calls that could fail on non-arrays.
This script uses regex to find patterns like:
  (someVar || []).map(  -> already fixed
  someVar.map(          -> if someVar could be non-array

We'll specifically target the files having issues.
"""
import re
import os

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # Pattern 1: (x || []).map( -> this was supposed to be fixed but might have been missed
    # Pattern 2: ?.map( optional chaining -> these are OK
    # Pattern 3: data.something.map( -> risky
    
    # Specifically fix: (Ze || []).map(  which is the error in the stack trace
    # This is a minification artifact - the actual source pattern is (something || []).map
    
    # Fix remaining (X || []).map patterns that weren't already fixed
    count = 0
    
    # Match: (identifier || []).map
    pattern = r'\((\w+(?:\.\w+)*)\s*\|\|\s*\[\]\)\.map\('
    def replace_or_map(m):
        nonlocal count
        varname = m.group(1)
        count += 1
        return f'(Array.isArray({varname}) ? {varname} : []).map('
    
    content = re.sub(pattern, replace_or_map, content)
    
    # Match: (...() || []).map( - function calls
    pattern2 = r'\(([^()]+\(\))\s*\|\|\s*\[\]\)\.map\('
    def replace_fn_or_map(m):
        nonlocal count
        varname = m.group(1)
        count += 1
        return f'(Array.isArray({varname}) ? {varname} : []).map('
    
    content = re.sub(pattern2, replace_fn_or_map, content)
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed {count} patterns in {filepath}")
        return count
    return 0

# Process all tsx files
total = 0
for root, dirs, files in os.walk('src'):
    # Skip node_modules
    dirs[:] = [d for d in dirs if d != 'node_modules']
    for fname in files:
        if fname.endswith('.tsx') or fname.endswith('.ts'):
            fpath = os.path.join(root, fname)
            total += fix_file(fpath)

print(f"\nTotal patterns fixed: {total}")
