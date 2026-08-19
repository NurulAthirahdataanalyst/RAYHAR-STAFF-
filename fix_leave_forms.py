import re

with open("src/pages/LeaveFormView.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Remove the old tabs
old_tabs_pattern = r'<div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-between mt-2 mb-4">\s*<div className="flex gap-1 overflow-x-auto w-full sm:w-auto">.*?</div>\s*</div>\s*</div>'
content = re.sub(old_tabs_pattern, '', content, flags=re.DOTALL)

# Let's try replacing it using string replacement, because regex with DOTALL is risky.
