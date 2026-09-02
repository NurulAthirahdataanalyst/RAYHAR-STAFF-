import re

with open('backend/server.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Let's find the analytics endpoint
match = re.search(r'app\.get\("/api/employees/:userId/analytics"(.*?)\}\);', content, re.DOTALL)
if match:
    print("Found analytics endpoint!")