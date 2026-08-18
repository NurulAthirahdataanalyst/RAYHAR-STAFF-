import os

path = r"src\pages\TeamAttendance.tsx"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

pagination_logic = """
  // Pagination logic
  const totalPages = Math.ceil(filteredList.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const paginatedList = filteredList.slice(startIndex, startIndex + entriesPerPage);
"""

target = '    return (\n      <div className="min-h-screen bg-background space-y-6 animate-in fade-in duration-500 pb-8">'
content = content.replace(target, pagination_logic + '\n' + target)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Injected pagination logic")
