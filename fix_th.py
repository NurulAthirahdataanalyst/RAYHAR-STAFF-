import re
import glob

def clean_th(content):
    def replace_th(match):
        inner = match.group(1)
        # Remove font sizes
        inner = re.sub(r'\btext-(xs|sm|base|lg|xl|2xl|3xl|\[\d+px\])\b', '', inner)
        # Remove text colors (except white)
        inner = re.sub(r'\btext-(slate|gray|zinc|neutral|stone|indigo|black|white|muted-foreground)-?[0-9]*\b', '', inner)
        inner = re.sub(r'\bdark:text-(slate|gray|zinc|neutral|stone|indigo|white)-[0-9]+\b', '', inner)
        inner = re.sub(r'\btext-\[#?[a-zA-Z0-9]+\]\b', '', inner)
        # Remove font weights
        inner = re.sub(r'\bfont-(semibold|bold|medium|light|normal|black|extrabold)\b', '', inner)
        # Remove uppercase and tracking
        inner = re.sub(r'\buppercase\b', '', inner)
        inner = re.sub(r'\btracking-(wider|widest|tight)\b', '', inner)
        inner = re.sub(r'\bwhitespace-nowrap\b', '', inner)
        
        # Clean up multiple spaces
        inner = re.sub(r'\s+', ' ', inner).strip()
        
        added_classes = "text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest whitespace-nowrap"
        
        if inner:
            return f'<th className="{inner} {added_classes}">'
        else:
            return f'<th className="{added_classes}">'

    # Match <th className="... ">
    return re.sub(r'<th\s+className="([^"]+)">', replace_th, content)

for filepath in glob.glob('src/**/*.tsx', recursive=True):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = clean_th(content)
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")
