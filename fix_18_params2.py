import re

with open('backend/server.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace any number of pairs more than 8
# We know it's around line 6046
# Find the exact array
match = re.search(r'\[userId,\s*queryDate,\s*userId,\s*queryDate[^\]]+\]', content)
if match:
    old_array = match.group(0)
    print("Found:", old_array)
    # We want exactly 8 pairs:
    new_array = "[userId, queryDate, userId, queryDate, userId, queryDate, userId, queryDate, userId, queryDate, userId, queryDate, userId, queryDate, userId, queryDate]"
    content = content.replace(old_array, new_array)
    with open('backend/server.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed!")
else:
    print("Not found")
