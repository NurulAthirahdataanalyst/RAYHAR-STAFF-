import codecs
import re

with codecs.open('src/pages/outstation/OutstationDashboard.tsx', 'r', 'utf-8') as f:
    content = f.read()

# No Active Outstations Title
target1 = r'text-\[16px\] font-bold text-foreground dark:text-gray-100 mb-1">No Active Outstations'
replace1 = r'text-sm font-bold text-muted-foreground mb-1">No Active Outstations'
content = re.sub(target1, replace1, content)

# No Active Outstations Subtitle
target2 = r'text-\[13px\] text-foreground dark:text-foreground max-w-sm mb-6">Everyone is currently at their assigned workplace. There are no ongoing travels.'
replace2 = r'text-[12px] text-muted-foreground max-w-sm mb-6">Everyone is currently at their assigned workplace. There are no ongoing travels.'
content = re.sub(target2, replace2, content)

# No Upcoming Outstations Title
target3 = r'text-\[16px\] font-bold text-foreground dark:text-gray-100 mb-1">No Upcoming Outstations'
replace3 = r'text-sm font-bold text-muted-foreground mb-1">No Upcoming Outstations'
content = re.sub(target3, replace3, content)

# No Upcoming Outstations Subtitle
target4 = r'text-\[13px\] text-foreground dark:text-foreground max-w-sm mb-6">There are no scheduled travels.'
replace4 = r'text-[12px] text-muted-foreground max-w-sm mb-6">There are no scheduled travels.'
content = re.sub(target4, replace4, content)

# No upcoming departures
target5 = r'text-\[12px\] text-foreground dark:text-foreground">No upcoming departures'
replace5 = r'text-[12px] text-muted-foreground">No upcoming departures'
content = re.sub(target5, replace5, content)

# No returns expected today
target6 = r'text-\[12px\] text-foreground dark:text-foreground">No returns expected today'
replace6 = r'text-[12px] text-muted-foreground">No returns expected today'
content = re.sub(target6, replace6, content)

with codecs.open('src/pages/outstation/OutstationDashboard.tsx', 'w', 'utf-8') as f:
    f.write(content)

print("Updated text classes")
