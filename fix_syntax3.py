import codecs

with codecs.open('src/pages/GPSLocationTracker.tsx', 'r', 'utf-8') as f:
    lines = f.readlines()

for i in range(len(lines)):
    if '})()}' in lines[i]:
        lines[i] = "                    })()\n                  )}\n"

with codecs.open('src/pages/GPSLocationTracker.tsx', 'w', 'utf-8') as f:
    f.writelines(lines)
