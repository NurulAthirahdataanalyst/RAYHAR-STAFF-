import codecs

with codecs.open('src/pages/GPSLocationTracker.tsx', 'r', 'utf-8') as f:
    lines = f.readlines()

for i in range(len(lines)):
    if '})()' in lines[i] and '</TableBody>' in lines[i+1]:
        lines[i] = "                    })()} \n"
        break

with codecs.open('src/pages/GPSLocationTracker.tsx', 'w', 'utf-8') as f:
    f.writelines(lines)
