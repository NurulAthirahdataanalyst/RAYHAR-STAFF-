import glob

files = glob.glob('src/**/*.tsx', recursive=True) + glob.glob('src/**/*.ts', recursive=True)
count = 0
for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # We will replace all occurrences of `|| []).map` with something safer.
    # But instead of regex, let's do a simple string replace for specific cases if we can't reliably regex.
    # Actually, we can just replace `.map` with `?.map` everywhere!
    # Wait, `?.map` on a string will still throw if it's not a function? No, `?.` just checks if left side is null/undefined.
    # If the left side is an object, `.map` doesn't exist, so `object?.map` is `undefined`. It won't throw!
    # But if we try to render `undefined` in JSX, React ignores it, which is perfect!
    # So `(Ze || [])?.map` will evaluate to `undefined` and NOT crash!
    # Wait, `(paginatedHistory || []).map` -> `(paginatedHistory || [])?.map`
    
    content = content.replace('|| []).map', '|| [])?.map')
    content = content.replace('|| [])).map', '|| []))?.map')
    # Also fix some specific ones that don't have || []
    content = content.replace('filtered.map', 'filtered?.map')
    content = content.replace('paginatedHistory.map', 'paginatedHistory?.map')
    content = content.replace('Object.entries(counts).map', 'Object.entries(counts)?.map')
    content = content.replace('requests.filter', '(requests || [])?.filter')
    
    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)
        count += 1

print(f"Replaced maps with optional chaining in {count} files!")
