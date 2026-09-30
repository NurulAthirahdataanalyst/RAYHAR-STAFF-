import os

files = [
    'src/pages/hr-analytics/WorkforceInsights.tsx',
    'src/pages/hr-analytics/AttendanceDashboard.tsx',
    'src/pages/LeaveAnalytics.tsx'
]

for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        d = file.read()
    
    em_dash = '\u2014'
    bullet = '\u2022'
    ellipsis = '\u2026'

    d = d.replace('\u0393\u00C7\u00F6', em_dash)
    d = d.replace('\u251C\u00F3\u0393\u00E9\u00BC\u0393\u00C7\u00A5', em_dash)
    d = d.replace('\u00E2\u20AC\u201D', em_dash)
    d = d.replace('\u0393\u00C7\u00F3', bullet)
    d = d.replace('\u0393\u00C7\u00AA', ellipsis)
    
    with open(f, 'w', encoding='utf-8', newline='\n') as file:
        file.write(d)
    print(f"Fixed {f}")
