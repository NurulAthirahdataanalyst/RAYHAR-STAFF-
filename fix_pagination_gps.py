import codecs
import re

with codecs.open('src/pages/GPSLocationTracker.tsx', 'r', 'utf-8') as f:
    content = f.read()

# Add state
state_target = r"const \[historyLoading, setHistoryLoading\] = useState\(false\);"
state_replacement = r"const [historyLoading, setHistoryLoading] = useState(false);\n    const [historyPage, setHistoryPage] = useState(1);\n    const historyItemsPerPage = 10;"
content = re.sub(state_target, state_replacement, content)

# Reset page in openHistory
open_target = r"setHistory\(sorted\);"
open_replacement = r"setHistory(sorted);\n          setHistoryPage(1);"
content = re.sub(open_target, open_replacement, content)

# Paginated history logic before map
map_target = r"history\.map\(\(h, i\) => \{"
map_replacement = r"""(() => {
                      const totalHistoryPages = Math.ceil(history.length / historyItemsPerPage);
                      const startIndex = (historyPage - 1) * historyItemsPerPage;
                      const paginatedHistory = history.slice(startIndex, startIndex + historyItemsPerPage);
                      return paginatedHistory.map((h, i) => {"""
content = re.sub(map_target, map_replacement, content)

# Map closing brace
close_target = r"\}\)\n\s*\)\}\n\s*</TableBody>"
close_replacement = r"""})
                    })()}
                  </TableBody>"""
content = re.sub(close_target, close_replacement, content)

# Pagination UI after Table
table_close = r"</Table>\n\s*</div>"
pagination_ui = r"""</Table>
              </div>
              
              {/* Pagination Controls */}
              {history.length > 0 && (
                <div className="flex items-center justify-between p-4 border-t bg-muted/20">
                  <span className="text-xs text-muted-foreground">
                    Showing {((historyPage - 1) * historyItemsPerPage) + 1} to {Math.min(historyPage * historyItemsPerPage, history.length)} of {history.length} records
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-[10px] font-bold rounded"
                      onClick={() => setHistoryPage(prev => Math.max(prev - 1, 1))}
                      disabled={historyPage === 1}
                    >
                      {"<"}
                    </Button>
                    <div className="flex items-center gap-1 overflow-x-auto max-w-[150px] scrollbar-hide">
                      {Array.from({ length: Math.ceil(history.length / historyItemsPerPage) }, (_, i) => i + 1).map(pageNum => (
                        <Button
                          key={pageNum}
                          variant={historyPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setHistoryPage(pageNum)}
                          className={h-7 w-7 p-0 text-[10px] font-bold rounded }
                        >
                          {pageNum}
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-[10px] font-bold rounded"
                      onClick={() => setHistoryPage(prev => Math.min(prev + 1, Math.ceil(history.length / historyItemsPerPage)))}
                      disabled={historyPage === Math.ceil(history.length / historyItemsPerPage) || Math.ceil(history.length / historyItemsPerPage) === 0}
                    >
                      {">"}
                    </Button>
                  </div>
                </div>
              )}
            </div>"""
content = re.sub(table_close, pagination_ui, content)

with codecs.open('src/pages/GPSLocationTracker.tsx', 'w', 'utf-8') as f:
    f.write(content)
print("Updated GPSLocationTracker")
