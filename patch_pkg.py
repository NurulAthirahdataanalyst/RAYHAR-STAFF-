import json

with open('package.json', 'r', encoding='utf-8') as f:
    pkg = json.load(f)

pkg['scripts']['build'] = "NODE_OPTIONS='--max-old-space-size=4096' vite build"

with open('package.json', 'w', encoding='utf-8') as f:
    json.dump(pkg, f, indent=2)
print("Updated package.json build script")
