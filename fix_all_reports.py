import re

# ===================================================
# 1. Fix AttendanceReports.tsx pagination
# ===================================================
att_file = 'src/pages/reports/AttendanceReports.tsx'
with open(att_file, 'r', encoding='utf-8') as f:
    att = f.read()

# Fix the "Showing X of Y records" pagination to the standard format
old_pagination = """              <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                <span>Showing</span>
                <span className="font-semibold">{pagedList.length}</span>
                <span>of</span>
                <span className="font-semibold">{filteredList.length}</span>
                <span>records</span>
              </div>"""

new_pagination = """              <div className="flex items-center gap-4 text-[10px] font-bold text-foreground uppercase tracking-widest">
                <span>
                  TOTAL SHOWING {filteredList.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} TO {Math.min(currentPage * pageSize, filteredList.length)} OF {filteredList.length} ENTRIES
                </span>
              </div>"""

if old_pagination in att:
    att = att.replace(old_pagination, new_pagination)
    print("AttendanceReports.tsx: pagination text fixed")
else:
    print("AttendanceReports.tsx: pagination text NOT FOUND - searching for partial match...")
    # Try to find what's there
    idx = att.find('<span>Showing</span>')
    if idx >= 0:
        print(f"Found at index {idx}:\n{att[idx-200:idx+200]}")
    else:
        print("Pattern not found at all")

# Also fix the "Page X of Y" display in the controls to match standard
old_page_info = '<span>Page {currentPage} of {pageCount}</span>'
new_page_info = '<span className="text-[10px] font-bold uppercase tracking-widest text-foreground">{currentPage} / {pageCount}</span>'
if old_page_info in att:
    att = att.replace(old_page_info, new_page_info)
    print("AttendanceReports.tsx: page info fixed")

# Also fix the header row - Date column should appear for ALL non-day views (not just month)
old_date_header = '{viewType === "month" && <TableHead className="w-[100px]">Date</TableHead>}'
new_date_header = '{viewType !== "day" && <TableHead className="w-[100px]">Date</TableHead>}'
if old_date_header in att:
    att = att.replace(old_date_header, new_date_header)
    print("AttendanceReports.tsx: date header fixed for all non-day views")

with open(att_file, 'w', encoding='utf-8') as f:
    f.write(att)
print("AttendanceReports.tsx saved\n")

# ===================================================
# 2. Fix LeaveReports.tsx - add pagination, fix month filter
# ===================================================
leave_file = 'src/pages/reports/LeaveReports.tsx'
with open(leave_file, 'r', encoding='utf-8') as f:
    leave = f.read()

# Fix the month filter - the issue is that `new Date(r.start_date)` will parse a date string as UTC
# and then getMonth() in the local timezone might be off by 1 day.
# Fix: parse the month directly from the date string instead of using Date constructor
old_month_filter = """        if (viewType === "month") {
            const m = parseInt(selectedMonth);
            const y = parseInt(selectedYear);
            filtered = filtered.filter((r: any) => {
                if (!r.start_date) return true;
                const d = new Date(r.start_date);
                return (d.getMonth() + 1 === m) && (d.getFullYear() === y);
            });
        }"""

new_month_filter = """        if (viewType === "month") {
            const m = parseInt(selectedMonth);
            const y = parseInt(selectedYear);
            filtered = filtered.filter((r: any) => {
                if (!r.start_date) return true;
                // Parse date parts directly from the string to avoid timezone issues
                const dateStr = r.start_date.slice(0, 10); // "YYYY-MM-DD"
                const [dYear, dMonth] = dateStr.split('-').map(Number);
                return dMonth === m && dYear === y;
            });
        } else if (viewType === "year") {
            const y = parseInt(selectedYear);
            filtered = filtered.filter((r: any) => {
                if (!r.start_date) return true;
                const dateStr = r.start_date.slice(0, 10);
                const [dYear] = dateStr.split('-').map(Number);
                return dYear === y;
            });
        }"""

if old_month_filter in leave:
    leave = leave.replace(old_month_filter, new_month_filter)
    print("LeaveReports.tsx: month filter fixed")
else:
    print("LeaveReports.tsx: month filter NOT found exactly, trying alternative...")
    # check if there's a similar block
    if 'viewType === "month"' in leave and 'getMonth()' in leave:
        print("Found related code - please check manually")

# Add pagination state (insert after useState for searchQuery)
old_states = '  const [searchQuery, setSearchQuery] = useState("");\n  \n  // View Toggle State'
new_states = '''  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  
  // View Toggle State'''
if old_states in leave:
    leave = leave.replace(old_states, new_states)
    print("LeaveReports.tsx: pagination state added")

# Reset page on filter changes - add after filteredList declaration
old_filtered = '''  const filteredList = leaveData.filter(e => 
    (e.full_name || e.user_id)?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.user_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.branch?.toLowerCase().includes(searchQuery.toLowerCase())
  );'''
new_filtered = '''  const filteredList = leaveData.filter(e => 
    (e.full_name || e.user_id)?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.user_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.branch?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pageCount = Math.max(1, Math.ceil(filteredList.length / pageSize));
  const pagedList = filteredList.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, viewType, date, selectedMonth, selectedYear, pageSize]);'''

if old_filtered in leave:
    leave = leave.replace(old_filtered, new_filtered)
    print("LeaveReports.tsx: pagedList computed")

# Replace filteredList.map with pagedList.map in the table body
old_table_map = '                    ) : (\n                      filteredList.map((req, idx) => ('
new_table_map = '                    ) : (\n                      pagedList.map((req, idx) => ('
if old_table_map in leave:
    leave = leave.replace(old_table_map, new_table_map)
    print("LeaveReports.tsx: table now uses pagedList")

# Add pagination controls after </CardContent>
old_end = '''          </CardContent>
        </Card>

      </div>
    </div>
  );
}'''
new_end = '''          </CardContent>

          {!loading && filteredList.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-gray-100 dark:border-slate-800 gap-4 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-4 text-[10px] font-bold text-foreground uppercase tracking-widest">
                <span>
                  TOTAL SHOWING {filteredList.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} TO {Math.min(currentPage * pageSize, filteredList.length)} OF {filteredList.length} ENTRIES
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-foreground">Show</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="h-8 px-2 text-xs font-bold border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-foreground"
                >
                  {[10, 15, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="h-8 px-3 text-xs font-bold border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-foreground disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Prev
                </button>
                <span className="text-[10px] font-bold text-foreground uppercase">{currentPage} / {pageCount}</span>
                <button
                  disabled={currentPage === pageCount}
                  onClick={() => setCurrentPage(p => Math.min(pageCount, p + 1))}
                  className="h-8 px-3 text-xs font-bold border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-foreground disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </Card>

      </div>
    </div>
  );
}'''

if old_end in leave:
    leave = leave.replace(old_end, new_end)
    print("LeaveReports.tsx: pagination controls added")
else:
    print("LeaveReports.tsx: end pattern not found exactly")
    # Try a simpler match
    if '        </Card>\n\n      </div>\n    </div>\n  );\n}' in leave:
        print("Found simpler pattern")

with open(leave_file, 'w', encoding='utf-8') as f:
    f.write(leave)
print("LeaveReports.tsx saved\n")

print("All fixes applied!")
