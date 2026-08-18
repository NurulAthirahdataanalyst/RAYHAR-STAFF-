import os

path = r"src\pages\hr-analytics\WorkforceInsights.tsx"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old_primary = """        {/* PRIMARY SECTION */}
        <div>
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Primary</h2>"""

new_primary = """        {/* PRIMARY SECTION */}
        <div>"""

content = content.replace(old_primary, new_primary)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Removed Primary word")
