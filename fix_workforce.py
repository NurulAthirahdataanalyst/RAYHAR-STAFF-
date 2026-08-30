import codecs
import re

with codecs.open('backend/server.js', 'r', 'utf-8') as f:
    content = f.read()

# Replace getWorkforceCalendarData placeholders
def fix_workforce(content):
    content = content.replace('leaveWhere = AND p.branch = {params.length + 1};', 'leaveWhere = AND p.branch = ?;')
    content = content.replace('outstationWhere = WHERE oa.branch = {params.length};', 'outstationWhere = WHERE oa.branch = ?;')
    content = content.replace('leaveWhere = AND p.department = {params.length + 1};', 'leaveWhere = AND p.department = ?;')
    content = content.replace('outstationWhere = WHERE oa.department = {params.length};', 'outstationWhere = WHERE oa.department = ?;')
    return content

content = fix_workforce(content)

with codecs.open('backend/server.js', 'w', 'utf-8') as f:
    f.write(content)
print("Fixed Workforce Calendar SQL Placeholders!")
