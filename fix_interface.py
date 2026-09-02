import re

with open('src/components/shared/MonthPicker.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('  className?: string;\n}', '  className?: string;\n  hideAllYear?: boolean;\n}')

with open('src/components/shared/MonthPicker.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Done")
