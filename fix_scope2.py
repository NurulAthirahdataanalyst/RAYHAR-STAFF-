import os
import re

path = r"src\pages\TeamAttendance.tsx"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# First, let's remove the pagination logic from the loading block.
# We can use regex to find and remove it.

pattern_to_remove = r"(\s*// Pagination logic\s*const totalPages = Math\.ceil\(filteredList\.length / entriesPerPage\);\s*const startIndex = \(currentPage - 1\) \* entriesPerPage;\s*const paginatedList = filteredList\.slice\(startIndex, startIndex \+ entriesPerPage\);)"

# Find all occurrences
matches = re.findall(pattern_to_remove, content)
print(f"Found {len(matches)} occurrences to remove")

# Replace all of them
content = re.sub(pattern_to_remove, "", content)

# Now insert it ONCE right before the final return
pagination_logic = """
  // Pagination logic
  const totalPages = Math.ceil(filteredList.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const paginatedList = filteredList.slice(startIndex, startIndex + entriesPerPage);
"""

target = '    return (\n      <div className="min-h-screen bg-background space-y-6 animate-in fade-in duration-500 pb-8">'
if target in content:
    content = content.replace(target, pagination_logic + '\n' + target)
else:
    print("WARNING: Could not find target return statement to inject pagination logic.")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed scope properly")
