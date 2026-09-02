import re

with open('backend/server.js', 'r', encoding='utf-8') as f:
    content = f.read()

match = re.search(r'app\.get\("/api/reports/workforce-insights", async \(req, res\) => \{(.*?)\n  \}\);\n', content, re.DOTALL)
if match:
    route_code = match.group(1)
    with open('workforce_route.js', 'w', encoding='utf-8') as f:
        f.write(route_code)
        