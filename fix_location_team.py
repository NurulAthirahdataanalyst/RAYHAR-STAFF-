import codecs
import re

with codecs.open('src/pages/TeamAttendance.tsx', 'r', 'utf-8') as f:
    content = f.read()

# Replace On-site
content = content.replace(
    '''<span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></span>
                                On-site
                              </span>''',
    '''<span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></span>
                                On-site {h.is_update ? "- UPDATED" : ""}
                              </span>'''
)

with codecs.open('src/pages/TeamAttendance.tsx', 'w', 'utf-8') as f:
    f.write(content)

print("Updated TeamAttendance")
