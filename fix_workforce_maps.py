"""
Final targeted fix for the remaining risky .map patterns in WorkforceInsights
"""

with open('src/pages/hr-analytics/WorkforceInsights.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

original = content

# Fix 1: (activeAndUpcomingAssignments || []).slice(0, 5).map
old1 = '{(activeAndUpcomingAssignments || []).slice(0, 5).map((a, i) => {'
new1 = '{(Array.isArray(activeAndUpcomingAssignments) ? activeAndUpcomingAssignments : []).slice(0, 5).map((a, i) => {'
content = content.replace(old1, new1)

# Fix 2: (outstationSummary?.popularRoutes || data.outstationAnalytics?.popularRoutes || []).map
old2 = ') : (outstationSummary?.popularRoutes || data.outstationAnalytics?.popularRoutes || []).map((r: any, i: number) => {'
new2 = ') : (Array.isArray(outstationSummary?.popularRoutes || data.outstationAnalytics?.popularRoutes) ? (outstationSummary?.popularRoutes || data.outstationAnalytics?.popularRoutes) : []).map((r: any, i: number) => {'
content = content.replace(old2, new2)

# Fix 3: (liveHrAlerts || hrAlerts || []).map
old3 = '{(liveHrAlerts || hrAlerts || []).map((alert: any, i: number) => {'
new3 = '{(Array.isArray(liveHrAlerts) ? liveHrAlerts : Array.isArray(hrAlerts) ? hrAlerts : []).map((alert: any, i: number) => {'
content = content.replace(old3, new3)

changed = content != original
if changed:
    with open('src/pages/hr-analytics/WorkforceInsights.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed WorkforceInsights.tsx")
else:
    print("No changes needed (patterns may have already been fixed by fix_all_maps4.py)")
