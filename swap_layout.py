import re

with open("src/pages/master/LeaveEntitlementManagement.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Pattern for the grid block
grid_pattern = r'(\s*<div className="grid grid-cols-1 xl:grid-cols-3 gap-4">.*?</Card>\s*</div>\s*)'
grid_match = re.search(grid_pattern, content, re.DOTALL)

# Pattern for the activity panel
activity_pattern = r'(\s*\{/\* Leave Entitlement Activity KPI Panel \*/\}\s*<EntitlementActivityCard[^>]*/>\s*)'
activity_match = re.search(activity_pattern, content)

if grid_match and activity_match:
    grid_block = grid_match.group(1)
    activity_block = activity_match.group(1)
    
    # We want to swap them
    # Because grid_block is before activity_block:
    
    new_content = content.replace(grid_block, activity_block)
    new_content = new_content.replace(activity_block, grid_block, 1) # This isn't quite right since we replaced grid_block with activity_block
    
    # Better logic:
    # First, locate the entire chunk:
    chunk_pattern = grid_pattern + activity_pattern
    chunk_match = re.search(chunk_pattern, content, re.DOTALL)
    if chunk_match:
        swapped_chunk = activity_block + "\n" + grid_block
        content = content.replace(chunk_match.group(0), swapped_chunk)
        with open("src/pages/master/LeaveEntitlementManagement.tsx", "w", encoding="utf-8") as f:
            f.write(content)
        print("Swapped successfully")
    else:
        print("Chunk pattern not found")
else:
    print("Could not find both blocks")

