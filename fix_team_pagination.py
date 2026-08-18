import os

path = r"src\pages\TeamAttendance.tsx"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add states
states_str = """
  const [entriesPerPage, setEntriesPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, selectedDate, dateViewMode, entriesPerPage]);
"""
if "setEntriesPerPage" not in content:
    idx = content.find('const [statusFilter, setStatusFilter] = useState("ALL");')
    content = content[:idx] + 'const [statusFilter, setStatusFilter] = useState("ALL");\n' + states_str + content[idx+len('const [statusFilter, setStatusFilter] = useState("ALL");'):]

# Find the search input to place the SHOW dropdown next to it
# Wait, it's currently:
# {/* Search */}
# <div className="relative flex items-center">
#   <Search className="w-4 h-4 absolute left-3 text-muted-foreground" />
#   <Input ... />
# </div>

old_search = """                {/* Search */}
                <div className="relative flex items-center">
                  <Search className="w-4 h-4 absolute left-3 text-muted-foreground" />
                  <Input
                    placeholder="Search Employee..."
                    className="pl-9 h-[34px] w-[200px] text-xs bg-white dark:bg-card"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>"""

new_search = """                {/* Search & Pagination */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Show</span>
                    <Select value={entriesPerPage.toString()} onValueChange={(val) => setEntriesPerPage(Number(val))}>
                      <SelectTrigger className="w-[70px] h-[34px] bg-white dark:bg-card border-2 border-[#7B0099] rounded-xl text-black dark:text-white font-bold text-xs focus:ring-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="75">75</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="relative flex items-center">
                    <Search className="w-4 h-4 absolute left-3 text-muted-foreground" />
                    <Input
                      placeholder="Search Employee..."
                      className="pl-9 h-[34px] w-[200px] text-xs bg-white dark:bg-card"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>"""

if "SelectTrigger" not in content:
    # Need to add Select imports if not present
    if "import { Select" not in content:
        import_stmt = 'import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";\n'
        idx = content.find('import { Button }')
        content = content[:idx] + import_stmt + content[idx:]
    
    content = content.replace(old_search, new_search)

# Now, implement paginatedList
pagination_logic = """
  // Pagination logic
  const totalPages = Math.ceil(filteredList.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const paginatedList = filteredList.slice(startIndex, startIndex + entriesPerPage);
"""
# find the place right before the return statement inside the component
# In TeamAttendance.tsx, `filteredList` is calculated right before `return (`
idx = content.find('return (')
content = content[:idx] + pagination_logic + '\n  ' + content[idx:]

# Replace `filteredList.map` with `paginatedList.map` and `filteredList.length` with `paginatedList.length` inside the table
table_content = content[content.find('<TableBody>'):content.find('</TableBody>')]
new_table_content = table_content.replace('filteredList', 'paginatedList')
content = content.replace(table_content, new_table_content)

# Add pagination controls at the bottom of the table
pagination_controls = """
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-2 py-4 border-t border-border">
                  <div className="text-sm text-muted-foreground">
                    Showing <span className="font-medium text-foreground">{startIndex + 1}</span> to <span className="font-medium text-foreground">{Math.min(startIndex + entriesPerPage, filteredList.length)}</span> of <span className="font-medium text-foreground">{filteredList.length}</span> entries
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="h-8 px-3 text-xs font-bold"
                    >
                      Previous
                    </Button>
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className={`h-8 w-8 p-0 text-xs font-bold ${currentPage === pageNum ? 'bg-primary text-primary-foreground' : ''}`}
                        >
                          {pageNum}
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="h-8 px-3 text-xs font-bold"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
"""
content = content.replace('</Table>\n              </div>', '</Table>\n              </div>' + pagination_controls)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Added pagination to TeamAttendance.tsx")
