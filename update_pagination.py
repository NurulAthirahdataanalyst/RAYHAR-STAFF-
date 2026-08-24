import re
import glob

def fix_showing(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Generic showing block with spans:
    pattern = r'Showing\s*<span[^>]*>(\{.*?\})<\/span>\s*to\s*<span[^>]*>(\{.*?\})<\/span>\s*of\s*<span[^>]*>(\{.*?\})<\/span>\s*entries'
    replacement = r'<span className="text-[10px] font-bold text-foreground uppercase tracking-widest">TOTAL SHOWING \1 TO \2 OF \3 ENTRIES</span>'
    new_content = re.sub(pattern, replacement, content, flags=re.IGNORECASE)

    # Some without spans but with uppercase text class?
    pattern2 = r'TOTAL SHOWING (\{.*?\}) TO (\{.*?\}) OF (\{.*?\}) ENTRIES'
    # Actually wait, if they already say TOTAL SHOWING, just make sure they have uppercase class:
    # Actually, the user asked to make the text uppercase, and it looks like it's already uppercase in OutstationAssignment.
    
    # Wait, the prompt says "TOTAL SHOWING 1 TO 15 OF 36 ENTRIES".
    # And "Apply the same styling, spacing, font size, and alignment throughout the entire project."
    # So I should make sure the span wrapping it is text-[10px] font-bold uppercase tracking-widest text-foreground

    # Let's just find any "TOTAL SHOWING {X} TO {Y} OF {Z} ENTRIES" without the proper styling and replace it.
    
    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Fixed {file_path}")

for f in glob.glob('src/pages/**/*.tsx', recursive=True):
    fix_showing(f)
