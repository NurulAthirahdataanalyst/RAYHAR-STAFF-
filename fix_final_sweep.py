"""
FINAL comprehensive sweep - find ALL remaining patterns that can cause .map() TypeError:
1. (x || []).map/filter/forEach  
2. x.map( where x could be non-array (chained from API data)
3. ?.prop.map( without Array.isArray guard

This also triggers a new Vercel build to bust the browser cache.
"""
import re
import os

files_changed = []

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    count = 0
    
    # Fix all (x || []).method patterns - any method name
    patterns = [
        # (simpleVar || []).method(
        (r'\((\w+)\s*\|\|\s*\[\]\)\.(map|filter|forEach|reduce|find|findIndex|some|every|flatMap|flat|includes|join|slice|sort|reverse|length)\b', 
         lambda m: f'(Array.isArray({m.group(1)}) ? {m.group(1)} : []).{m.group(2)}'),
        # (obj.prop || []).method(
        (r'\((\w+\.\w+(?:\.\w+)*)\s*\|\|\s*\[\]\)\.(map|filter|forEach|reduce|find|findIndex|some|every|flatMap|flat|includes|join|slice|sort|reverse)\b',
         lambda m: f'(Array.isArray({m.group(1)}) ? {m.group(1)} : []).{m.group(2)}'),
        # (a?.b || []).method(
        (r'\((\w+\?\.\w+(?:\?\.\w+)*)\s*\|\|\s*\[\]\)\.(map|filter|forEach|reduce|find|findIndex|some|every|flatMap|flat|includes|join|slice|sort|reverse)\b',
         lambda m: f'(Array.isArray({m.group(1)}) ? {m.group(1)} : []).{m.group(2)}'),
        # (a || b || []).map( - multi-fallback
        (r'\((\w+(?:\s*\|\|\s*\w+)+)\s*\|\|\s*\[\]\)\.(map|filter|forEach|reduce|find|findIndex|some|every|flatMap)\b',
         lambda m: f'(Array.isArray({m.group(1)}) ? ({m.group(1)}) : []).{m.group(2)}'),
        # (a?.x || b?.x || []).map(
        (r'\((\w+\?\.\w+(?:\s*\|\|\s*\w+\?\.\w+)+)\s*\|\|\s*\[\]\)\.(map|filter|forEach|reduce|find|some|every)\b',
         lambda m: f'(Array.isArray({m.group(1)}) ? ({m.group(1)}) : []).{m.group(2)}'),
    ]
    
    for pattern, replacement in patterns:
        def make_repl(repl):
            def do_repl(m):
                nonlocal count
                result = repl(m)
                if result != m.group(0):
                    count += 1
                return result
            return do_repl
        content = re.sub(pattern, make_repl(replacement), content)
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        files_changed.append(f"{filepath}: {count} fixes")
        return count
    return 0

total = 0
for root, dirs, files in os.walk('src'):
    dirs[:] = [d for d in dirs if d not in ('node_modules', '.git')]
    for fname in files:
        if fname.endswith('.tsx') or fname.endswith('.ts'):
            fpath = os.path.join(root, fname)
            total += fix_file(fpath)

print("Files changed:")
for f in files_changed:
    print(f"  {f}")
print(f"\nTotal: {total} patterns fixed")
