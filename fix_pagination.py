import os
import re

def process_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the pagination container. Usually it looks like:
    # <div className="... flex flex-col sm:flex-row items-center justify-between ...">
    # containing "SHOWING" or "Showing" and "entries" or "ENTRIES"
    
    # Let's just find the text that says "Showing {var1} to {var2} of {var3} entries"
    # and replace it with "TOTAL SHOWING {var1} TO {var2} OF {var3} ENTRIES"
    
    # We also need to uppercase the text and add the styling: text-[10px] font-bold text-foreground uppercase tracking-widest
    
    changed = False
    
    # Regex to match the showing text span/div
    # e.g. <div className="text-sm text-gray-500">Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filtered.length)} of {filtered.length} entries</div>
    # or <span>Showing {startIndex + 1} to {endIndex} of {total} entries</span>
    
    # First, let's standardize the text itself
    def repl_text(m):
        # m.group(0) is the whole match
        # m.group(1) is the before '{' (Showing )
        # m.group(2) is var1
        # m.group(3) is ' to '
        # m.group(4) is var2
        # m.group(5) is ' of '
        # m.group(6) is var3
        # m.group(7) is ' entries'
        
        # we want to return TOTAL SHOWING {var1} TO {var2} OF {var3} ENTRIES
        # while preserving whatever variables were there.
        var1 = m.group(2)
        var2 = m.group(4)
        var3 = m.group(6)
        
        # if the original already has "TOTAL SHOWING", don't duplicate it.
        prefix = m.group(1).upper()
        if "TOTAL" not in prefix:
            prefix = prefix.replace("SHOWING", "TOTAL SHOWING")
            if "TOTAL" not in prefix:
                prefix = "TOTAL SHOWING "
                
        return f"{prefix}{{{var1}}} TO {{{var2}}} OF {{{var3}}} ENTRIES"
        
    # Match pattern: (Showing |TOTAL SHOWING )\{([^}]+)\}( to )\{([^}]+)\}( of )\{([^}]+)\}( entries| ENTRIES)
    pattern = r'(?i)(TOTAL SHOWING\s+|SHOWING\s+)\{([^}]+)\}(\s+TO\s+|\s+to\s+)\{([^}]+)\}(\s+OF\s+|\s+of\s+)\{([^}]+)\}(\s+ENTRIES|\s+entries)'
    
    new_content, num_subs = re.subn(pattern, repl_text, content)
    
    if num_subs > 0:
        content = new_content
        changed = True

    # Now let's try to fix the container's styling.
    # The container of the text should have: className="text-[10px] font-bold text-foreground uppercase tracking-widest"
    # Usually it's in a <span className="...">TOTAL SHOWING...</span> or <div className="...">TOTAL SHOWING...</div>
    # Let's find the tag wrapping TOTAL SHOWING and enforce the className
    
    def repl_wrapper(m):
        tag = m.group(1) # e.g. <span
        classes_match = re.search(r'className="([^"]+)"', m.group(2))
        inner_content = m.group(3) # TOTAL SHOWING ... ENTRIES
        
        # Check if it has a wrapping div with "flex items-center gap-4 text-[10px]..."
        # Actually, let's just enforce the class on whatever tag it is (usually span or div)
        target_classes = "text-[10px] font-bold text-foreground uppercase tracking-widest"
        
        if classes_match:
            old_classes = classes_match.group(1)
            # Replace text-sm, text-gray-500, etc.
            new_classes = re.sub(r'text-\S+', '', old_classes)
            new_classes = re.sub(r'font-\S+', '', new_classes)
            new_classes = re.sub(r'uppercase\s?', '', new_classes)
            new_classes = re.sub(r'tracking-\S+', '', new_classes)
            new_classes = re.sub(r'\s+', ' ', new_classes).strip()
            
            final_classes = (new_classes + " " + target_classes).strip()
            
            new_tag = m.group(2).replace(f'className="{old_classes}"', f'className="{final_classes}"')
        else:
            new_tag = m.group(2) + f' className="{target_classes}"'
            
        return f"{tag}{new_tag}>{inner_content}"

    pattern_wrapper = r'(<(span|div|p))([^>]*>)\s*(TOTAL SHOWING\s+\{[^}]+\}\s+TO\s+\{[^}]+\}\s+OF\s+\{[^}]+\}\s+ENTRIES)\s*'
    
    new_content, num_subs = re.subn(pattern_wrapper, repl_wrapper, content)
    if num_subs > 0:
        content = new_content
        changed = True
        
    # Also, we should ensure the wrapper of this text + the "Show [ 10 ]" select is in a flex container that aligns them correctly.
    # Often they are siblings inside `<div className="flex flex-col sm:flex-row items-center justify-between ...">`
    # The requirement: "Left: TOTAL SHOWING 1 TO 15 OF 36 ENTRIES"
    # "Keep the pagination controls on the right side."
    # We will leave the structure largely as is, assuming flex-between pushes pagination controls to the right.

    if changed:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {file_path}")

for root, dirs, files in os.walk('src/pages'):
    for f in files:
        if f.endswith('.tsx'):
            process_file(os.path.join(root, f))
