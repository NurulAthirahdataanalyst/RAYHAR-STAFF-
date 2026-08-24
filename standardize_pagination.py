import re
import glob

def standardize_pagination(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Step 1: Ensure the span wrapping "TOTAL SHOWING..." is standard
    # Look for anything like TOTAL SHOWING ... ENTRIES
    # Replace its wrapper with standard div
    
    # Let's find: <span className="...">TOTAL SHOWING ... ENTRIES</span>
    # Or <span>TOTAL SHOWING ... ENTRIES</span>
    
    # We can match: <div ...> \s* <span> \s* TOTAL SHOWING ... ENTRIES \s* </span>
    
    pattern1 = r'<div className=\"[^\"]*\">\s*<span[^>]*>\s*(TOTAL SHOWING[^\<]*ENTRIES)\s*<\/span>'
    replacement1 = r'<div className="flex items-center gap-4 text-[10px] font-bold text-foreground uppercase tracking-widest">\n                    <span>\n                      \1\n                    </span>'
    new_content = re.sub(pattern1, replacement1, content, flags=re.IGNORECASE)

    # Some might not have a span: <span ...>TOTAL SHOWING...</span>
    pattern2 = r'<span className=\"[^\"]*\">\s*(TOTAL SHOWING[^\<]*ENTRIES)\s*<\/span>'
    replacement2 = r'<div className="flex items-center gap-4 text-[10px] font-bold text-foreground uppercase tracking-widest">\n                    <span>\n                      \1\n                    </span>\n                  </div>'
    new_content = re.sub(pattern2, replacement2, new_content, flags=re.IGNORECASE)

    # Standardize the outer container
    # <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-gray-100 dark:border-slate-800 gap-4 bg-slate-50/50 dark:bg-slate-900/50">
    pattern3 = r'<div className=\"flex flex-col sm:flex-row items-center justify-between[^\"]*\">\s*(<div className=\"flex items-center gap-4 text-\[10px\] font-bold text-foreground uppercase tracking-widest\">)'
    replacement3 = r'<div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-gray-100 dark:border-slate-800 gap-4 bg-slate-50/50 dark:bg-slate-900/50">\n                  \1'
    new_content = re.sub(pattern3, replacement3, new_content, flags=re.IGNORECASE)

    # What if the outer container is different? e.g. <div className="flex items-center justify-between ...">
    pattern4 = r'<div className=\"flex items-center justify-between[^\"]*\">\s*(<div className=\"flex items-center gap-4 text-\[10px\] font-bold text-foreground uppercase tracking-widest\">)'
    replacement4 = r'<div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-gray-100 dark:border-slate-800 gap-4 bg-slate-50/50 dark:bg-slate-900/50">\n                  \1'
    new_content = re.sub(pattern4, replacement4, new_content, flags=re.IGNORECASE)

    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f'Fixed container in {file_path}')

for f in glob.glob('src/pages/**/*.tsx', recursive=True):
    standardize_pagination(f)
