import codecs
import re

with codecs.open('src/pages/outstation/OutstationAnalytics.tsx', 'r', 'utf-8') as f:
    content = f.read()

content = content.replace('Across entire year', 'Across {selectedYear}')

with codecs.open('src/pages/outstation/OutstationAnalytics.tsx', 'w', 'utf-8') as f:
    f.write(content)
