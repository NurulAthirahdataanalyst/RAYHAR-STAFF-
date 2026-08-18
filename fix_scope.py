import os

path = r"src\pages\TeamAttendance.tsx"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# The incorrect block:
bad_block = """    if (loading) {
      
  // Pagination logic
  const totalPages = Math.ceil(filteredList.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const paginatedList = filteredList.slice(startIndex, startIndex + entriesPerPage);

  return (
        <div className="min-h-screen flex items-center justify-center bg-background">"""

good_block = """    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">"""

content = content.replace(bad_block, good_block)

# Insert the pagination logic in the correct place: right before `return (\n      <div className="min-h-screen bg-background space-y-6 animate-in fade-in duration-500 pb-8">`
pagination_logic = """
  // Pagination logic
  const totalPages = Math.ceil(filteredList.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const paginatedList = filteredList.slice(startIndex, startIndex + entriesPerPage);

  return (
      <div className="min-h-screen bg-background space-y-6 animate-in fade-in duration-500 pb-8">"""

target = '    return (\n      <div className="min-h-screen bg-background space-y-6 animate-in fade-in duration-500 pb-8">'
content = content.replace(target, pagination_logic)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed scope")
