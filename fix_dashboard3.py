import re

with open('src/pages/Dashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

match = re.search(r'\{\/\*\s*1\.\s*Today\'s Status \(Admin View - simplified\)\s*\*\/\}\s*<Card \s*className={`rounded-2xl', content)
if match:
    new_content = content[:match.start()] + "{/* 1. Today's Status (Admin View - simplified) */}\n            <Card \n              onClick={() => navigate(\"/attendance\")}\n              className={`rounded-2xl" + content[match.end():]
    with open('src/pages/Dashboard.tsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Added via regex!")
else:
    print("Not found via regex")
