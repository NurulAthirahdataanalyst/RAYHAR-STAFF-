import codecs
import re

with codecs.open('backend/server.js', 'r', 'utf-8') as f:
    content = f.read()

# Replace combined logic
target = r"const combined = \[\.\.\.clockOutPoints, \.\.\.clockInPoints\];"
replacement = r"const combined = [...clockOutPoints, ...clockInPoints, ...taggedLogs.map(t => ({...t, is_update: true}))];"
content = re.sub(target, replacement, content)

with codecs.open('backend/server.js', 'w', 'utf-8') as f:
    f.write(content)
print("Updated backend/server.js")
