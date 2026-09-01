import re

with open('backend/server.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace 9 pairs with 8 pairs in the myAttendanceRows query
pattern = r"\[userId, queryDate, userId, queryDate, userId, queryDate, userId, queryDate, userId, queryDate, userId, queryDate, userId, queryDate, userId, queryDate, userId, queryDate\]"
replacement = r"[userId, queryDate, userId, queryDate, userId, queryDate, userId, queryDate, userId, queryDate, userId, queryDate, userId, queryDate, userId, queryDate]"

if pattern in content:
    content = content.replace(pattern, replacement)
    with open('backend/server.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed 18 parameters to 16 parameters in myAttendanceRows")
else:
    print("Pattern not found!")
