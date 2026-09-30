import os
import re

files = [
    'src/pages/hr-analytics/WorkforceInsights.tsx',
    'src/pages/hr-analytics/AttendanceDashboard.tsx',
    'src/pages/LeaveAnalytics.tsx'
]

for f in files:
    with open(f, 'rb') as file:
        raw_data = file.read()
    
    # decode as utf-8
    try:
        d = raw_data.decode('utf-8')
    except:
        print("Failed to decode", f)
        continue

    # the literal string 'ΓÇö' was written into the file as UTF-8.
    # In python, that string is '\u0393\u00C7\u00F6'
    
    # EM DASH: —
    em_dash = '\u2014'
    
    # BULLET: •
    bullet = '\u2022'
    
    # ELLIPSIS: …
    ellipsis = '\u2026'

    d = d.replace('\u0393\u00C7\u00F6', em_dash) # ΓÇö
    d = d.replace('\u251C\u00F3\u0393\u00E9\u00BC\u0393\u00C7\u00A5', em_dash) # ├óΓé¼ΓÇ¥
    d = d.replace('\u00E2\u20AC\u201D', em_dash) # â€”
    
    d = d.replace('\u0393\u00C7\u00F3', bullet) # ΓÇó
    d = d.replace('\u0393\u00C7\u00AA', ellipsis) # ΓÇª
    
    with open(f, 'w', encoding='utf-8') as file:
        file.write(d)
    print(f"Fixed {f}")
