import re

with open('src/pages/master/Role.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add import
if 'useRole' not in content:
    content = content.replace(
        'import { API_BASE_URL } from "@/config/api";',
        'import { API_BASE_URL } from "@/config/api";\nimport { useRole } from "@/contexts/RoleContext";'
    )

# Add useRole call
if 'const { role } = useRole();' not in content:
    content = content.replace(
        'const navigate = useNavigate();',
        'const navigate = useNavigate();\n  const { role } = useRole();'
    )

with open('src/pages/master/Role.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Done")
