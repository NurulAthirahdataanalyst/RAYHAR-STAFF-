import re
import glob

def clean_classnames(content):
    def replace_tablehead(match):
        inner = match.group(1)
        # Remove font sizes
        inner = re.sub(r'\btext-(xs|sm|base|lg|xl|2xl|3xl|\[\d+px\])\b', '', inner)
        # Remove text colors (except text-white which was explicitly requested for purple backgrounds)
        inner = re.sub(r'\btext-(slate|gray|zinc|neutral|stone|indigo|blue|foreground|muted-foreground|muted)-?[0-9]*\b', '', inner)
        inner = re.sub(r'\bdark:text-(slate|gray|zinc|neutral|stone|indigo|blue|foreground|muted-foreground|muted)-?[0-9]*\b', '', inner)
        inner = re.sub(r'\btext-\[#?[a-zA-Z0-9]+\]\b', '', inner)
        # Remove font weights
        inner = re.sub(r'\bfont-(semibold|bold|medium|light|normal|black|extrabold)\b', '', inner)
        # Remove uppercase and tracking
        inner = re.sub(r'\buppercase\b', '', inner)
        inner = re.sub(r'\btracking-(wider|widest|tight)\b', '', inner)
        inner = re.sub(r'\bwhitespace-nowrap\b', '', inner)
        
        # Clean up multiple spaces
        inner = re.sub(r'\s+', ' ', inner).strip()
        
        if inner:
            return f'<TableHead className="{inner}">'
        else:
            return '<TableHead>'

    return re.sub(r'<TableHead className="([^"]+)">', replace_tablehead, content)

for filepath in glob.glob('src/**/*.tsx', recursive=True):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = clean_classnames(content)
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")
