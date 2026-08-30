import codecs
import re

file_path = 'src/pages/LeaveAdmin.tsx'
with codecs.open(file_path, 'r', 'utf-8') as f:
    content = f.read()

# I want to remove order-l-4 
content = content.replace("border-l-4 ", "hover:-translate-y-1 hover:shadow-lg")

with codecs.open(file_path, 'w', 'utf-8') as f:
    f.write(content)
print("Updated LeaveAdmin.tsx")
