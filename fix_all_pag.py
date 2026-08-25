import os
import re
import glob

pattern = r'(<div className="flex items-center gap-4 text-\[10px\] font-bold text-foreground uppercase tracking-widest">)\s*(<span>)\s*(TOTAL SHOWING[^\<]*)\s*(</span>)\s*(<div className="flex (?:items-center )?gap-(?:1\.5|2|4)">)'
replacement = r'<div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-gray-100 dark:border-slate-800 gap-4 bg-slate-50/50 dark:bg-slate-900/50">\n                \1\n                  \2\n                    \3\n                  \4\n                </div>\n                \5'

files_fixed = 0
for filepath in glob.glob('src/**/*.tsx', recursive=True):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content, count = re.subn(pattern, replacement, content)
    if count > 0:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Fixed {filepath} ({count} replacements)")
        files_fixed += 1

print(f"Total files fixed: {files_fixed}")
