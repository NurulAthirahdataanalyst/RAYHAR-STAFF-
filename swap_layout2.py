import re

with open("src/pages/master/LeaveEntitlementManagement.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Let's find the start of the grid:
grid_start_idx = content.find('<div className="grid grid-cols-1 xl:grid-cols-3 gap-4">')

# Let's find the Activity KPI Panel start
activity_start_idx = content.find('{/* Leave Entitlement Activity KPI Panel */}')

# Let's find the end of the Activity KPI Panel (which is before `</>`)
# We can just look for the first `<>` and `</>` to understand the boundaries, or just `</>`
fragment_end_idx = content.find('</>', activity_start_idx)

if grid_start_idx != -1 and activity_start_idx != -1 and fragment_end_idx != -1:
    grid_block = content[grid_start_idx:activity_start_idx].strip()
    activity_block = content[activity_start_idx:fragment_end_idx].strip()
    
    # Let's check if grid_block is fully contained
    
    swapped = activity_block + "\n\n          " + grid_block + "\n\n        "
    
    # replace original region
    content = content[:grid_start_idx] + swapped + content[fragment_end_idx:]
    
    with open("src/pages/master/LeaveEntitlementManagement.tsx", "w", encoding="utf-8") as f:
        f.write(content)
    print("Swapped using indices")
else:
    print("Indices not found")
