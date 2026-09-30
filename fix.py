import os

files = [
    'src/pages/hr-analytics/WorkforceInsights.tsx',
    'src/pages/hr-analytics/AttendanceDashboard.tsx',
    'src/pages/LeaveAnalytics.tsx'
]

for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        d = file.read()
    
    # E2 80 94 -> em dash (—)
    d = d.replace('ΓÇö', '—')
    d = d.replace('├óΓé¼ΓÇ¥', '—')
    d = d.replace('â€”', '—')
    
    # E2 80 A2 -> bullet (•)
    d = d.replace('ΓÇó', '•')
    
    # E2 80 A6 -> ellipsis (…)
    d = d.replace('ΓÇª', '…')
    
    with open(f, 'w', encoding='utf-8') as file:
        file.write(d)
    print(f"Fixed {f}")
