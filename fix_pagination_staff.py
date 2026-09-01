import codecs
import re

with codecs.open('src/components/shared/StaffProfileDialog.tsx', 'r', 'utf-8') as f:
    content = f.read()

# Add state
state_target = r"const \[loadingHistory, setLoadingHistory\] = useState\(false\);"
state_replacement = r"const [loadingHistory, setLoadingHistory] = useState(false);\n  const [historyPage, setHistoryPage] = useState(1);\n  const historyItemsPerPage = 10;"
content = re.sub(state_target, state_replacement, content)

# Reset page when setting history
open_target = r"setLocationHistory\(histData\.history \|\| \[\]\);"
open_replacement = r"setLocationHistory(histData.history || []);\n        setHistoryPage(1);"
content = re.sub(open_target, open_replacement, content)

# Paginated history logic before map
map_target = r"\{locationHistory\.map\(\(h: any, idx: number\) => \{"
map_replacement = r"""{(() => {
                              const totalHistoryPages = Math.ceil(locationHistory.length / historyItemsPerPage);
                              const startIndex = (historyPage - 1) * historyItemsPerPage;
                              const paginatedHistory = locationHistory.slice(startIndex, startIndex + historyItemsPerPage);
                              return paginatedHistory.map((h: any, idx: number) => {"""
content = re.sub(map_target, map_replacement, content)

# Map closing brace
close_target = r"\}\)\}\n\s*</tbody>\n\s*</table>\n\s*</div>\n\s*\)\}"
close_replacement = r"""  })
                            })()}
                            </tbody>
                          </table>
                          
                          {/* Pagination Controls */}
                          {locationHistory.length > 0 && (
                            <div className="flex items-center justify-between mt-4 p-2">
                              <span className="text-xs text-muted-foreground">
                                Showing {((historyPage - 1) * historyItemsPerPage) + 1} to {Math.min(historyPage * historyItemsPerPage, locationHistory.length)} of {locationHistory.length} records
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
                                  {Array.from({ length: Math.ceil(locationHistory.length / historyItemsPerPage) }, (_, i) => i + 1).map(pageNum => (
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
                                  onClick={() => setHistoryPage(prev => Math.min(prev + 1, Math.ceil(locationHistory.length / historyItemsPerPage)))}
                                  disabled={historyPage === Math.ceil(locationHistory.length / historyItemsPerPage) || Math.ceil(locationHistory.length / historyItemsPerPage) === 0}
                                >
                                  {">"}
                                </Button>
                              </div>
                            </div>
                          )}
                          
                        </div>
                      )}"""
content = re.sub(close_target, close_replacement, content)

with codecs.open('src/components/shared/StaffProfileDialog.tsx', 'w', 'utf-8') as f:
    f.write(content)
print("Updated StaffProfileDialog")
