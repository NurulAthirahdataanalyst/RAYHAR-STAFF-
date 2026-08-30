import codecs
import re

file_path = 'src/pages/Dashboard.tsx'
with codecs.open(file_path, 'r', 'utf-8') as f:
    content = f.read()

content = content.replace(
    '<h1 className="text-responsive-2xl font-black tracking-tight text-foreground truncate">',
    '<h1 className="text-responsive-2xl font-bold tracking-tight text-foreground truncate" style={{ fontFamily: "\'Montserrat\', sans-serif" }}>'
)

content = content.replace(
    '<p className="text-foreground font-medium mt-1 flex items-center gap-2 text-responsive-sm">',
    '<p className="text-foreground font-medium mt-1 flex items-center gap-2 text-responsive-sm" style={{ fontFamily: "\'Montserrat\', sans-serif" }}>'
)

with codecs.open(file_path, 'w', 'utf-8') as f:
    f.write(content)
print('Updated Dashboard.tsx')
