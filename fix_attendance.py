import re

with open('src/pages/Attendance.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Make sure to find the exact pattern
content = re.sub(
    r'<div className="text-sm text-foreground">Showing \{\(page-1\)\*pageSize \+ 1\} - \{Math\.min\(page\*pageSize, \s*totalRows\)\} of \{totalRows\}</div>',
    r'''<div className="flex items-center gap-4 text-[10px] font-bold text-foreground uppercase tracking-widest">
                <span>TOTAL SHOWING {(page-1)*pageSize + 1} TO {Math.min(page*pageSize, totalRows)} OF {totalRows} ENTRIES</span>
                <div className="flex items-center gap-2">
                  <span>Show</span>
                  <Select value={pageSize.toString()} onValueChange={(val) => { setPageSize(Number(val)); setPage(1); }}>
                    <SelectTrigger className="h-7 text-[10px] font-bold rounded border-gray-200 dark:border-slate-700 w-[60px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>''',
    content
)

content = re.sub(
    r'<div className="flex items-center gap-2">\s*<button[^>]*>Prev</button>\s*<div className="text-sm font-bold">\{page\} / \{totalPages\}</div>\s*<button[^>]*>Next</button>\s*</div>',
    r'''<div className="flex items-center gap-1">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="h-7 px-2 text-[10px] font-bold rounded"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <div className="flex items-center gap-1 overflow-x-auto max-w-[150px] sm:max-w-none scrollbar-hide">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                    <Button
                      key={pageNum}
                      variant={page === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPage(pageNum)}
                      className={`h-7 w-7 p-0 text-[10px] font-bold rounded ${page === pageNum ? 'bg-pink-500 text-white border-pink-500 hover:bg-pink-600' : 'text-foreground'}`}
                    >
                      {pageNum}
                    </Button>
                  ))}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="h-7 px-2 text-[10px] font-bold rounded"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>''',
    content
)

content = content.replace('{totalRows > pageSize && (', '{totalRows > 0 && (')

# Check imports
if 'SelectContent' not in content:
    content = content.replace('import { Button } from "@/components/ui/button";', 'import { Button } from "@/components/ui/button";\nimport { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";')

if 'ChevronLeft' not in content:
    content = content.replace('import { Download, Search, RefreshCw', 'import { ChevronLeft, ChevronRight, Download, Search, RefreshCw')

with open('src/pages/Attendance.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated Attendance.tsx")
