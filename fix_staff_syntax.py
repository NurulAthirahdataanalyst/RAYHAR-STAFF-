import codecs
import re

with codecs.open('src/components/shared/StaffProfileDialog.tsx', 'r', 'utf-8') as f:
    content = f.read()

content = content.replace("                              })}", "                              })\n                            })()}")

with codecs.open('src/components/shared/StaffProfileDialog.tsx', 'w', 'utf-8') as f:
    f.write(content)
