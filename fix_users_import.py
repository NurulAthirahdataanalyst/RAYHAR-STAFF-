import re

with open('src/pages/outstation/MyOutstation.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('import { Search } from "lucide-react";', 'import { Search, Users } from "lucide-react";')

with open('src/pages/outstation/MyOutstation.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Added Users to lucide-react imports")
