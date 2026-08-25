import re

file = 'src/pages/master/EntitlementHistoryPanel.tsx'
with open(file, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the specific pagination block
old_block = """          {filtered.length > 0 && (
            <div className="px-5 py-3 border-t border-border/40 bg-muted/5 flex items-center justify-between shrink-0">
              <span className="text-[10px] text-foreground">
                Showing <b className="text-foreground">{paginatedLogs.length}</b> of <b className="text-foreground">{filtered.length}</b> records
              </span>
              
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-medium mr-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline" size="sm" className="h-8 w-8 p-0"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline" size="sm" className="h-8 w-8 p-0"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}"""

new_block = """          {filtered.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-gray-100 dark:border-slate-800 gap-4 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
              <div className="flex items-center gap-4 text-[10px] font-bold text-foreground uppercase tracking-widest">
                <span>
                  TOTAL SHOWING {filtered.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1} TO {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} OF {filtered.length} ENTRIES
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline" size="sm" className="h-8 px-3 text-xs font-bold border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-foreground disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Prev
                </Button>
                <span className="text-[10px] font-bold text-foreground uppercase tracking-widest">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline" size="sm" className="h-8 px-3 text-xs font-bold border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-foreground disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}"""

if old_block in content:
    content = content.replace(old_block, new_block)
    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)
    print("EntitlementHistoryPanel.tsx pagination fixed!")
else:
    print("Could not find the exact old_block block in EntitlementHistoryPanel.tsx.")
