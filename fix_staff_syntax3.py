import codecs

with codecs.open('src/components/shared/StaffProfileDialog.tsx', 'r', 'utf-8') as f:
    lines = f.readlines()

for i in range(len(lines)):
    if '})()}' in lines[i] and '</tbody>' in lines[i+1]:
        lines[i] = "                              })\n                            })()}\n"
        break

with codecs.open('src/components/shared/StaffProfileDialog.tsx', 'w', 'utf-8') as f:
    f.writelines(lines)
