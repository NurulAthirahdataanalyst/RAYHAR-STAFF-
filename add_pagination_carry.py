import re

def process_form(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find CarryForwardLeaveForm
    # We need to add state variables for pagination:
    pagination_state = """
    const [currentPage, setCurrentPage] = useState(1);
    const [entriesPerPage, setEntriesPerPage] = useState(10);
"""
    # Right after const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
    content = content.replace('const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);', 'const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);' + pagination_state)

    # We need to calculate paginated filtered:
    paginated_calc = """
    const indexOfLastItem = currentPage * entriesPerPage;
    const indexOfFirstItem = indexOfLastItem - entriesPerPage;
    const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filtered.length / entriesPerPage);
"""
    # Insert it right before uniqueBranches
    content = content.replace('const uniqueBranches = ["All", ...new Set(', paginated_calc + '\n    const uniqueBranches = ["All", ...new Set(')
    
    # We also need to change checked logic for handleSelectAll:
    content = content.replace('checked={filtered.length > 0 && selectedEmployees.length === filtered.length}', 'checked={currentItems.length > 0 && currentItems.every(emp => selectedEmployees.includes(emp.user_id))}')
    # and handleSelectAll itself shouldn't just map all filtered if they only see current page?
    # Usually "Select All" on a paginated list either selects all pages or current page. Let's select current page.
    new_handleSelectAll = """
    const handleSelectAll = (checked: boolean) => {
      if (checked) {
        const toAdd = currentItems.map(e => e.user_id).filter(id => !selectedEmployees.includes(id));
        setSelectedEmployees([...selectedEmployees, ...toAdd]);
      } else {
        const toRemove = currentItems.map(e => e.user_id);
        setSelectedEmployees(selectedEmployees.filter(id => !toRemove.includes(id)));
      }
    };
"""
    content = re.sub(r'const handleSelectAll = \(checked: boolean\) => \{[\s\S]*?\};\n', new_handleSelectAll, content)
    
    # Now replace {filtered.map((emp) => { with {currentItems.map((emp) => {
    # wait, first make sure we only match inside CarryForwardLeaveForm
    # Actually `filtered.map` is used inside `<TableBody>` in CarryForwardLeaveForm.
    # Let's just do a specific replacement.
    content = content.replace('{filtered.map((emp) => {', '{currentItems.map((emp) => {')

    # Add the pagination controls after the table:
    pagination_controls = """
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-gray-100 dark:border-slate-800 gap-4 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-4 text-[10px] font-bold text-foreground uppercase tracking-widest">
              <span>
                TOTAL SHOWING {indexOfFirstItem + 1} TO {Math.min(indexOfLastItem, filtered.length)} OF {filtered.length} ENTRIES
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span>Show</span>
              <Select value={entriesPerPage.toString()} onValueChange={(val) => { setEntriesPerPage(Number(val)); setCurrentPage(1); }}>
                <SelectTrigger className="h-7 text-[10px] font-bold rounded border-gray-200 dark:border-slate-700 w-[60px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1 ml-2">
                <Button variant="outline" size="icon" className="h-7 w-7 rounded border-gray-200 dark:border-slate-700" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
                <div className="flex items-center gap-1 px-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1).map((p, i, arr) => (
                    <React.Fragment key={p}>
                      {i > 0 && arr[i - 1] !== p - 1 && <span className="text-muted-foreground px-1">...</span>}
                      <Button variant={currentPage === p ? "default" : "outline"} size="icon" className={`h-7 w-7 rounded ${currentPage === p ? 'bg-[#7B0099] hover:bg-[#7B0099]/90 text-white' : 'border-gray-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`} onClick={() => setCurrentPage(p)}>
                        <span className="text-[10px] font-bold">{p}</span>
                      </Button>
                    </React.Fragment>
                  ))}
                </div>
                <Button variant="outline" size="icon" className="h-7 w-7 rounded border-gray-200 dark:border-slate-700" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
"""
    # Replace the `</div>` after `</Table>` with `</div>` + pagination controls
    # Specifically:
    # </Table>
    #       </div>
    #     </div>
    # Let's do:
    content = content.replace('</Table>\n          </div>\n        </div>', '</Table>\n          </div>\n' + pagination_controls + '        </div>')

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

process_form('src/pages/master/LeaveEntitlementManagement.tsx')
