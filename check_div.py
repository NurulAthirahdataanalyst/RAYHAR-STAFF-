import re

with open(r"c:\Users\HP\ATTENDANCE_SYSTEM\src\pages\Calendar.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

def trace_divs():
    stack = []
    for i, line in enumerate(lines):
        if i < 471 or i > 1090:
            continue
        
        # we can have multiple div tags on one line
        parts = re.split(r'(<(?:div)(?:\s+[^>]*)?>|</(?:div)>)', line)
        for part in parts:
            if part.startswith('<div'):
                stack.append((i+1, part))
                print(f"[{i+1}] PUSH, len={len(stack)}")
            elif part.startswith('</div'):
                if stack:
                    popped = stack.pop()
                    print(f"[{i+1}] POP (was {popped[0]}), len={len(stack)}")
                else:
                    print(f"[{i+1}] UNMATCHED POP!")
                    
    print("REMAINING:")
    for item in stack:
        print(item)

trace_divs()
