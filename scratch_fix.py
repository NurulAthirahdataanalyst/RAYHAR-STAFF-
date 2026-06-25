import re

path = r'C:\Users\HP\ATTENDANCE_SYSTEM\src\pages\LeaveAnalytics.tsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace classes
content = re.sub(
    r'border-none shadow-\[0_15px_40px_rgba\(0,0,0,0\.04\)\] dark:shadow-\[0_15px_40px_rgba\(0,0,0,0\.25\)\] bg-card/80 backdrop-blur-md rounded-\[32px\]',
    'border border-gray-200/80 bg-white rounded-xl shadow-sm',
    content
)

content = re.sub(
    r'pb-0 border-b border-border/40',
    'pb-0 border-b border-gray-100 bg-white',
    content
)

# Extract blocks
pie_match = re.search(r'\{/\* Pie Chart \*/\}\s*<Card[\s\S]*?</Card>', content)
bar_match = re.search(r'\{/\* Approved vs Rejected per Leave Type Bar Chart \*/\}\s*<Card[\s\S]*?</Card>', content)
balance_match = re.search(r'\{/\* Leave Balance Usage \*/\}\s*<Card[\s\S]*?</Card>', content)
trend_match = re.search(r'\{/\* Approvals trend chart \*/\}\s*<Card[\s\S]*?</Card>', content)

if pie_match and bar_match and balance_match and trend_match:
    pie = pie_match.group(0).replace('lg:col-span-2 ', '')
    bar = bar_match.group(0).replace('lg:col-span-3 ', '')
    balance = balance_match.group(0).replace('lg:col-span-2 ', '')
    trend = trend_match.group(0).replace('lg:col-span-3 ', '')
    
    new_grid = f"""      {{/* ── Main Charts Grid ── */}}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        {{/* Left Column */}}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {pie}

          {balance}
        </div>

        {{/* Right Column */}}
        <div className="lg:col-span-3 flex flex-col gap-6">
          {bar}

          {trend}
        </div>
      </div>"""
    
    pattern = r'\{/\* ── Row 2: Pie Chart \+ Approval Status ── \*/\}\s*<div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">[\s\S]*?</Card>\s*</div>\s*\{/\* ── Row 3: Leave Balance Usage \+ Monthly Trend ── \*/\}\s*<div className="grid grid-cols-1 lg:grid-cols-5 gap-3 items-start">[\s\S]*?</Card>\s*</div>'
    content = re.sub(pattern, new_grid, content)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Success")
else:
    print("Failed to match blocks")
