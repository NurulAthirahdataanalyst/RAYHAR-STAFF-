# -*- coding: utf-8 -*-
import codecs

with codecs.open('src/pages/outstation/MyOutstation.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

imports_to_add = """
import { MonthPicker } from "@/components/shared/MonthPicker";
import { YearPopover } from "@/components/shared/YearPopover";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
"""

if 'MonthPicker' not in content:
    content = content.replace('import { API_BASE_URL }', imports_to_add.strip() + '\nimport { API_BASE_URL }')

states_to_add = """
  const [viewMode, setViewMode] = useState<"month"|"year">("month");
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [search, setSearch] = useState("");
"""

if 'viewMode' not in content:
    content = content.replace('const [tab, setTab] = useState<"Upcoming"|"Active"|"Completed"|"Cancelled">("Upcoming");', 
                              'const [tab, setTab] = useState<"Upcoming"|"Active"|"Completed"|"Cancelled">("Upcoming");\n' + states_to_add)

old_filtered = """
  const counts = {
    Upcoming: assignments.filter(a => a.status === "Upcoming").length,
    Active: assignments.filter(a => a.status === "Active").length,
    Completed: assignments.filter(a => a.status === "Completed").length,
    Cancelled: assignments.filter(a => a.status === "Cancelled").length,
  };

  const filtered = assignments.filter(a => a.status === tab).sort((a,b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
"""

new_filtered = """
  const filteredByDateAndSearch = assignments.filter(a => {
    // Search
    if (search && !(a.destination || "").toLowerCase().includes(search.toLowerCase()) && !(a.project || "").toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    // Date
    if (a.start_date) {
      const d = new Date(a.start_date);
      if (viewMode === "year") {
        if (d.getFullYear().toString() !== selectedYear) return false;
      } else {
        if (d.getFullYear().toString() !== selectedYear || (d.getMonth() + 1).toString() !== selectedMonth) return false;
      }
    }
    return true;
  });

  const counts = {
    Upcoming: filteredByDateAndSearch.filter(a => a.status === "Upcoming").length,
    Active: filteredByDateAndSearch.filter(a => a.status === "Active").length,
    Completed: filteredByDateAndSearch.filter(a => a.status === "Completed").length,
    Cancelled: filteredByDateAndSearch.filter(a => a.status === "Cancelled").length,
  };

  const filtered = filteredByDateAndSearch.filter(a => a.status === tab).sort((a,b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
"""

content = content.replace(old_filtered, new_filtered)

idx_empty = content.find('{/* No assignments */}')
idx_status_tabs = content.find('{/* Status Tabs */}')
if idx_empty != -1 and idx_status_tabs != -1:
    content = content[:idx_empty] + content[idx_status_tabs:]

bottom_new = """
      {/* Table Card */}
      <Card className="border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-card">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                {(["Upcoming", "Active", "Completed", "Cancelled"] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setTab(s)}
                    className={`relative px-4 py-2 text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-colors ${
                      tab === s 
                        ? "text-[#7B0099]" 
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {s}
                      <span className={`flex items-center justify-center h-5 px-1.5 rounded-full text-[9px] ${
                        tab === s 
                          ? "bg-[#7B0099] text-white" 
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {counts[s]}
                      </span>
                    </div>
                    {tab === s && (
                      <div className="absolute bottom-[-17px] left-0 right-0 h-0.5 bg-[#7B0099]" />
                    )}
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <ExportDropdown onExportCSV={() => exportToCSV(filtered, `My_Outstations_${tab}`)} />
              </div>
            </div>

            {/* Filters Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Search destination..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9 text-xs border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50 focus-visible:ring-[#7B0099] uppercase font-bold tracking-wider"
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center bg-slate-100 dark:bg-slate-900/50 rounded-lg p-1 border border-slate-300 dark:border-slate-700">
                  <button 
                    className={`h-7 px-3 text-[10px] font-black tracking-widest rounded-md transition-all ${viewMode === 'month' ? 'bg-white dark:bg-slate-800 text-[#7B0099] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    onClick={() => setViewMode('month')}
                  >
                    MONTH
                  </button>
                  <button 
                    className={`h-7 px-3 text-[10px] font-black tracking-widest rounded-md transition-all ${viewMode === 'year' ? 'bg-white dark:bg-slate-800 text-[#7B0099] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    onClick={() => setViewMode('year')}
                  >
                    YEAR
                  </button>
                </div>
                
                {viewMode === "month" ? (
                  <MonthPicker
                    monthYear={`${selectedYear}-${selectedMonth.padStart(2, '0')}`}
                    onSelectMonthYear={(val) => {
                      const [y, m] = val.split('-');
                      setSelectedYear(y);
                      setSelectedMonth(parseInt(m).toString());
                    }}
                    className="h-9 px-3 text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-slate-100 bg-white dark:bg-card border border-slate-200 dark:border-slate-700 rounded-md shadow-sm min-w-[120px]"
                  />
                ) : (
                  <YearPopover year={selectedYear} onSelectYear={setSelectedYear} className="h-9 px-3 text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-slate-100 bg-white dark:bg-card border border-slate-200 dark:border-slate-700 rounded-md shadow-sm min-w-[100px]" />
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="py-20 flex justify-center"><Loader2 className="animate-spin w-8 h-8 text-[#7B0099]" /></div>
          ) : filtered.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400 border border-dashed border-gray-200 dark:border-slate-800 mx-4 my-4 rounded-xl">
              <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800/50 mb-3 border border-slate-200 dark:border-slate-700">
                <Plane className="w-6 h-6 text-slate-400 opacity-50" />
              </div>
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">NO {tab} OUTSTATIONS</p>
              <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-wider">No assignments found for the selected criteria</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-slate-800">
              {filtered.map(a => (
                <div key={a.id} className="p-4 hover:bg-gray-50 dark:hover:bg-slate-900/50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-black text-gray-800 dark:text-gray-100 text-[13px] uppercase">
                          &#9992;&#65039; {a.project || a.purpose || a.meeting_title ? `${a.project || a.purpose || a.meeting_title} - ` : ""}{a.destination}
                        </span>
                        {a.client_company && <span className="text-[10px] font-bold text-gray-400">&bull; {a.client_company}</span>}
                      </div>
                      <div className="flex flex-wrap gap-3 sm:ml-5 items-center">
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 font-bold">{fmtDate(a.start_date)} &mdash; {fmtDate(a.end_date)}</span>
                        <span className="text-[11px] font-black text-pink-600 sm:ml-2">{diffDays(a.start_date, a.end_date)} day(s)</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
                      {statusBadge(a.status)}
                      <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">by {a.assigned_by_name || "HR"}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
"""

idx_status_tabs = content.find('{/* Status Tabs */}')
if idx_status_tabs != -1:
    content = content[:idx_status_tabs] + bottom_new + '\n    </div>\n  );\n}'

with codecs.open('src/pages/outstation/MyOutstation.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Rewrite successful")
