import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search, Filter, Download, X, ArrowLeft, History,
  FileText, Printer, ChevronDown, ChevronUp, Eye,
  ClipboardList, Users, BarChart3, Calendar, RotateCcw,
  Check, ChevronLeft, ChevronRight, ChevronsUpDown
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { getHistoryLogs, EntitlementHistoryLog } from "@/lib/entitlementHistory";
import { EntitlementDetailModal } from "./EntitlementDetailModal";
import { getBadge, formatRelativeDate, ACTION_BADGE } from "./EntitlementActivityCard";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarWidget } from "@/components/ui/calendar";
import { CalendarDays } from "lucide-react";
import { format } from "date-fns";

// ——— Date range helpers ———
type DateRange = 'all' | 'today' | 'yesterday' | '7days' | 'thismonth' | 'lastmonth' | 'thisyear' | 'custom';

function inRange(dateStr: string, range: DateRange, customFrom: string, customTo: string): boolean {
  if (range === 'all') return true;
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  if (range === 'today') return d.getTime() === today.getTime();
  if (range === 'yesterday') return d.getTime() === today.getTime() - 86400000;
  if (range === '7days') return d.getTime() >= today.getTime() - 7 * 86400000;
  if (range === 'thismonth') return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();
  if (range === 'lastmonth') {
    const lm = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    return d.getFullYear() === lm.getFullYear() && d.getMonth() === lm.getMonth();
  }
  if (range === 'thisyear') return d.getFullYear() === today.getFullYear();
  if (range === 'custom') {
    if (customFrom && new Date(customFrom).getTime() > d.getTime()) return false;
    if (customTo && new Date(customTo).getTime() < d.getTime()) return false;
    return true;
  }
  return true;
}

function CustomDatePicker({ value, onChange, placeholder, className }: { value: string; onChange: (v: string) => void; placeholder: string; className?: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={`justify-between text-left font-bold text-xs uppercase border-border/60 bg-white dark:bg-card ${!value && "text-muted-foreground"} ${className}`}>
          <div className="flex items-center gap-2 overflow-hidden min-w-0">
            <CalendarDays className="h-4 w-4 shrink-0 text-[#942392]" />
            <span className="truncate">
              {value ? format(new Date(value), "d MMMM yyyy").toUpperCase() : placeholder}
            </span>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <CalendarWidget mode="single" selected={value ? new Date(value) : undefined} onSelect={(d) => onChange(d ? format(d, 'yyyy-MM-dd') : '')} initialFocus />
      </PopoverContent>
    </Popover>
  );
}

// ——— Export helpers ———
function exportCSV(logs: EntitlementHistoryLog[], filename: string) {
  const headers = ['History ID', 'Date', 'Time', 'Employee Name', 'Employee ID', 'Action Type', 'Leave Type', 'Adjustment', 'Previous Balance', 'New Balance', 'Performed By', 'Reason'];
  const rows = logs.map(l => [
    l.history_id, l.date, l.time, `"${l.employee_name}"`, l.employee_id || '', l.action_type, l.leave_type, l.adjustment, l.previous_balance, l.new_balance, `"${l.performed_by}"`, `"${l.reason || ''}"`
  ]);
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function exportPDF(logs: EntitlementHistoryLog[], title: string) {
  const w = window.open('', '_blank');
  if (!w) return;
  const rows = logs.map(l => `
    <tr>
      <td>${l.date}</td>
      <td><b>${l.employee_name}</b><br/><span style="font-size:10px;color:#64748b">${l.employee_id}</span></td>
      <td><span class="badge badge-${l.action_type.toLowerCase().replace(/ /g,'-')}">${l.action_type}</span></td>
      <td>${l.leave_type}</td>
      <td class="${l.adjustment >= 0 ? 'pos' : 'neg'}">${l.adjustment >= 0 ? '+' : ''}${l.adjustment}</td>
      <td>${l.previous_balance} → ${l.new_balance}</td>
      <td>${l.performed_by}</td>
      <td style="font-size:10px;color:#64748b">${l.reason}</td>
    </tr>`).join('');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${title}</title>
  <style>
    body{font-family:'Segoe UI',sans-serif;color:#1e293b;padding:32px;font-size:12px}
    h1{font-size:22px;font-weight:900;color:#942392;margin:0}
    h2{font-size:12px;color:#64748b;font-weight:600;margin:2px 0 24px;text-transform:uppercase;letter-spacing:1px}
    .meta{display:flex;gap:24px;margin-bottom:20px;padding:12px 16px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0}
    .meta span{font-size:11px} .meta b{color:#475569}
    table{width:100%;border-collapse:collapse}
    th{background:transparent;color:#000;border-bottom:2px solid #000;padding:8px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.5px;font-weight:900}
    td{padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:11px;vertical-align:top}
    tr:nth-child(even) td{background:#f8fafc}
    .pos{color:#059669;font-weight:900} .neg{color:#dc2626;font-weight:900}
    .badge{padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700;white-space:nowrap}
    @media print{button{display:none}}
  </style></head><body>
  <h1>RAYHAR GROUP</h1><h2>Leave Entitlement Audit History</h2>
  <div class="meta">
    <span><b>Report:</b> ${title}</span>
    <span><b>Total Records:</b> ${logs.length}</span>
    <span><b>Generated:</b> ${new Date().toLocaleString('en-MY')}</span>
  </div>
  <table><thead><tr>
    <th>Date</th><th>Employee</th><th>Action</th><th>Leave Type</th>
    <th>Adjustment</th><th>Balance</th><th>Performed By</th><th>Reason</th>
  </tr></thead><tbody>${rows}</tbody></table>
  <button onclick="window.print()" style="margin-top:20px;padding:8px 20px;background:#942392;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:700">PRINT</button>
  </body></html>`);
  w.document.close();
}

// ——— Timeline group helpers ———
function groupByDate(logs: EntitlementHistoryLog[]): Array<{ dateLabel: string; dateStr: string; entries: EntitlementHistoryLog[] }> {
  const map: Record<string, EntitlementHistoryLog[]> = {};
  logs.forEach(l => { if (!map[l.date]) map[l.date] = []; map[l.date].push(l); });
  const today = new Date().toISOString().split('T')[0];
  const yest  = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  return Object.entries(map)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, entries]) => {
      let label = date;
      if (date === today)  label = 'Today';
      else if (date === yest) label = 'Yesterday';
      else {
        const d = new Date(date + 'T00:00:00');
        label = `${d.getDate()} ${d.toLocaleString('en-MY', { month: 'long' })} ${d.getFullYear()}`;
      }
      return { dateLabel: label, dateStr: date, entries };
    });
}

// ——— Main Component ———

const ITEMS_PER_PAGE = 20;

export default function EntitlementHistoryPanel({ onCancel }: { onCancel: () => void }) {
  const [logs, setLogs]           = useState<EntitlementHistoryLog[]>([]);
  const [search, setSearch]       = useState('');
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo]   = useState('');
  const [filterEmployee, setFilterEmployee] = useState<string[]>([]);
  const [filterBranch, setBranch]     = useState('all');
  const [filterDept, setDept]         = useState('all');
  const [filterLeave, setLeave]       = useState('all');
  const [filterAction, setAction]     = useState('all');
  const [filterBy, setFilterBy]       = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState<EntitlementHistoryLog | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const reload = useCallback(() => setLogs(getHistoryLogs()), []);
  useEffect(() => {
    reload();
    window.addEventListener('entitlementHistoryUpdated', reload);
    return () => window.removeEventListener('entitlementHistoryUpdated', reload);
  }, [reload]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, dateRange, customFrom, customTo, filterEmployee, filterBranch, filterDept, filterLeave, filterAction, filterBy]);

  // Unique values for filter dropdowns
  const allEmployees = useMemo(() => [...new Set(logs.map(l => l.employee_name).filter(Boolean))].sort(), [logs]);
  const branches   = useMemo(() => [...new Set(logs.map(l => l.branch).filter(Boolean))].sort(), [logs]);
  const depts      = useMemo(() => [...new Set(logs.map(l => l.department).filter(Boolean))].sort(), [logs]);
  const leaveTypes = useMemo(() => [...new Set(logs.map(l => l.leave_type).filter(Boolean))].sort(), [logs]);
  const actionTypes = Object.keys(ACTION_BADGE);
  const performers = useMemo(() => [...new Set(logs.map(l => l.performed_by).filter(Boolean))].sort(), [logs]);

  // Sort employees so checked are on top
  const sortedEmployees = useMemo(() => {
    return [...allEmployees].sort((a, b) => {
      const aSel = filterEmployee.includes(a);
      const bSel = filterEmployee.includes(b);
      if (aSel && !bSel) return -1;
      if (!aSel && bSel) return 1;
      return a.localeCompare(b);
    });
  }, [allEmployees, filterEmployee]);

  // Filtered logs
  const filtered = useMemo(() => {
    return logs.filter(l => {
      if (!inRange(l.date, dateRange, customFrom, customTo)) return false;
      if (filterEmployee.length > 0 && !filterEmployee.includes(l.employee_name)) return false;
      if (filterBranch   !== 'all' && l.branch        !== filterBranch)   return false;
      if (filterDept     !== 'all' && l.department    !== filterDept)     return false;
      if (filterLeave    !== 'all' && l.leave_type    !== filterLeave)    return false;
      if (filterAction   !== 'all' && l.action_type   !== filterAction)   return false;
      if (filterBy       !== 'all' && l.performed_by  !== filterBy)       return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          l.employee_name.toLowerCase().includes(q) ||
          l.reason.toLowerCase().includes(q) ||
          l.history_id.toLowerCase().includes(q) ||
          l.reference_id.toLowerCase().includes(q) ||
          l.action_type.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [logs, search, dateRange, customFrom, customTo, filterEmployee, filterBranch, filterDept, filterLeave, filterAction, filterBy]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedLogs = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const grouped = useMemo(() => groupByDate(paginatedLogs), [paginatedLogs]);

  // Stats
  const today = new Date().toISOString().split('T')[0];
  const thisMonth = `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}`;
  const todayCount    = filtered.filter(l => l.date === today).length;
  const monthCount    = filtered.filter(l => l.date.startsWith(thisMonth)).length;
  const empAffected   = new Set(filtered.map(l => l.employee_id || l.employee_name)).size;

  const openDrawer = (log: EntitlementHistoryLog) => { setSelectedLog(log); };

  // Date range label map
  const rangeLabelMap: Record<DateRange, string> = {
    all: 'All Time', today: 'Today', yesterday: 'Yesterday', '7days': 'Last 7 Days',
    thismonth: 'This Month', lastmonth: 'Last Month', thisyear: 'This Year', custom: 'Custom Range'
  };

  const handleResetFilters = () => {
    setSearch('');
    setDateRange('all');
    setCustomFrom('');
    setCustomTo('');
    setFilterEmployee([]);
    setBranch('all');
    setDept('all');
    setLeave('all');
    setAction('all');
    setFilterBy('all');
  };

  const toggleEmployee = (emp: string) => {
    setFilterEmployee(prev => prev.includes(emp) ? prev.filter(e => e !== emp) : [...prev, emp]);
  };

  return (
    <div className="animate-in slide-in-from-right-4 duration-300 h-full flex flex-col max-h-[85vh]">
      <Card className="flex-1 flex flex-col border-border/60 shadow-xl overflow-hidden bg-card/77 backdrop-blur-sm">
        <CardHeader className="pb-4 border-b border-border/50 bg-muted/20 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <Button variant="ghost" size="icon" onClick={onCancel} className="mt-1 h-8 w-8 text-foreground hover:bg-muted/50 rounded-full">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <CardTitle className="flex items-center gap-2 text-xl font-black">
                  <History className="w-5 h-5 text-[#942392]" />
                  Leave Activity History
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  Complete audit trail of all leave entitlement changes.
                </CardDescription>
              </div>
            </div>

            {/* Export buttons */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5"
                onClick={() => exportCSV(filtered, `Leave_Entitlement_Audit_${today}.csv`)}>
                <FileText className="w-3.5 h-3.5" /> CSV
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5"
                onClick={() => exportCSV(filtered, `Leave_Entitlement_Audit_${today}.xls`)}>
                <Download className="w-3.5 h-3.5" /> Excel
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5"
                onClick={() => exportPDF(filtered, `Leave Entitlement Audit — ${rangeLabelMap[dateRange]}`)}>
                <Printer className="w-3.5 h-3.5" /> PDF
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 flex-1 flex flex-col min-h-0">
          {/* Search + Filter toggle bar */}
          <div className="p-4 border-b border-border/40 bg-muted/5 flex flex-col sm:flex-row gap-3 shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by employee, reason, history ID, or reference ID..."
                value={search} onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-8 h-9 text-xs bg-white dark:bg-card border-border/70 placeholder:text-muted-foreground dark:placeholder:text-slate-400 font-medium"
              />
              {search && (
                <button onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <Select value={dateRange} onValueChange={(v: DateRange) => setDateRange(v)}>
                <SelectTrigger className="w-[160px] h-9 text-xs bg-white dark:bg-card">
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="7days">Last 7 Days</SelectItem>
                  <SelectItem value="thismonth">This Month</SelectItem>
                  <SelectItem value="lastmonth">Last Month</SelectItem>
                  <SelectItem value="thisyear">This Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" size="sm" className={`h-9 text-xs gap-1.5 ${showFilters ? 'bg-[#942392]/5 border-[#942392]/40 text-[#942392]' : ''}`}
                onClick={() => setShowFilters(!showFilters)}>
                <Filter className="w-3.5 h-3.5" />
                Filters
                {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </Button>
              
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/20"
                onClick={handleResetFilters} title="Reset all filters">
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Custom date range */}
          {dateRange === 'custom' && (
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-b border-border/40 flex items-center justify-end gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <Label className="text-xs font-bold text-foreground">From</Label>
                <CustomDatePicker value={customFrom} onChange={setCustomFrom} placeholder="FROM DATE" className="w-[190px] h-9" />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs font-bold text-foreground">To</Label>
                <CustomDatePicker value={customTo} onChange={setCustomTo} placeholder="TO DATE" className="w-[190px] h-9" />
              </div>
            </div>
          )}

          {/* Advanced filters panel */}
          {showFilters && (
            <div className="px-4 py-3 border-b border-border/40 bg-muted/10 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 shrink-0">
              {/* Custom Employee Filter */}
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase tracking-wider text-foreground">Employee</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full h-8 px-3 text-xs justify-between font-normal bg-white dark:bg-card">
                      <span className="truncate">
                        {filterEmployee.length === 0 ? 'All Employees' : `${filterEmployee.length} Selected`}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[240px] p-0" align="start">
                    <div className="max-h-[300px] overflow-y-auto p-1 divide-y divide-border/20">
                      {sortedEmployees.map(emp => {
                        const isChecked = filterEmployee.includes(emp);
                        return (
                          <label key={emp} className="flex items-center gap-3 px-2 py-2 hover:bg-muted/50 cursor-pointer group">
                            <input
                              type="checkbox"
                              className="hidden peer"
                              checked={isChecked}
                              onChange={() => toggleEmployee(emp)}
                            />
                            {/* Custom animated checkbox */}
                            <div className="relative w-[18px] h-[18px] -translate-y-px 
                               peer-checked:[&>svg]:stroke-[#942392] 
                               peer-checked:[&>svg>path]:[stroke-dashoffset:60] 
                               peer-checked:[&>svg>polyline]:[stroke-dashoffset:42] 
                               peer-checked:[&>svg>path]:transition-all peer-checked:[&>svg>polyline]:transition-all 
                               peer-checked:[&>svg>path]:duration-300 peer-checked:[&>svg>polyline]:duration-200 peer-checked:[&>svg>polyline]:delay-150">
                              <div className="absolute top-[-15px] left-[-15px] w-[48px] h-[48px] rounded-full bg-slate-900/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                              <svg width="18px" height="18px" viewBox="0 0 18 18" className="relative z-10 fill-none stroke-[#c8ccd4] stroke-[1.5] transition-all duration-200 group-hover:stroke-[#942392] [stroke-linecap:round] [stroke-linejoin:round]">
                                <path d="M1,9 L1,3.5 C1,2 2,1 3.5,1 L14.5,1 C16,1 17,2 17,3.5 L17,14.5 C17,16 16,17 14.5,17 L3.5,17 C2,17 1,16 1,14.5 L1,9 Z" className="[stroke-dasharray:60] [stroke-dashoffset:0]"></path>
                                <polyline points="1 9 7 14 15 4" className="[stroke-dasharray:22] [stroke-dashoffset:66]"></polyline>
                              </svg>
                            </div>
                            <span className="text-xs font-medium text-foreground truncate">{emp}</span>
                          </label>
                        );
                      })}
                      {sortedEmployees.length === 0 && (
                        <p className="text-xs text-muted-foreground p-3 text-center">No employees found.</p>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Standard Filters */}
              {[
                { label: 'Branch',   value: filterBranch,   set: setBranch,         options: branches  },
                { label: 'Department', value: filterDept,   set: setDept,           options: depts     },
                { label: 'Leave Type', value: filterLeave,  set: setLeave,          options: leaveTypes },
                { label: 'Action Type', value: filterAction, set: setAction,        options: actionTypes },
                { label: 'Performed By', value: filterBy,   set: setFilterBy,       options: performers },
              ].map(f => (
                <div key={f.label} className="space-y-1">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-foreground">{f.label}</Label>
                  <Select value={f.value} onValueChange={f.set}>
                    <SelectTrigger className="h-8 text-xs bg-white dark:bg-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All {f.label === 'Branch' ? 'Branches' : f.label === 'Department' ? 'Departments' : f.label + 's'}</SelectItem>
                      {f.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border/30 border-b border-border/40 shrink-0">
            {[
              { icon: ClipboardList, label: 'Total Records',      val: filtered.length,  color: 'text-slate-700'  },
              { icon: Calendar,      label: "Today's Changes",    val: todayCount,        color: 'text-blue-600'   },
              { icon: BarChart3,     label: 'This Month',         val: monthCount,        color: 'text-[#942392]'  },
              { icon: Users,         label: 'Employees Affected', val: empAffected,       color: 'text-emerald-600'},
            ].map(s => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="flex flex-col items-center justify-center p-3 bg-card">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Icon className={`w-3.5 h-3.5 ${s.color}`} />
                    <span className="text-[10px] font-black uppercase tracking-wider text-foreground">{s.label}</span>
                  </div>
                  <p className={`text-2xl font-black ${s.color} leading-none`}>{s.val}</p>
                </div>
              );
            })}
          </div>

          <div className="overflow-y-auto flex-1 min-h-0">
            {grouped.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-foreground">
                <History className="w-10 h-10 opacity-20 mb-3" />
                <p className="text-sm font-medium">No records found.</p>
                <p className="text-xs mt-1">Try changing filters or search terms.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/20">
                {grouped.map(({ dateLabel, entries }) => (
                  <div key={dateLabel}>
                    {/* Date separator */}
                    <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-2 bg-muted/95 backdrop-blur-sm border-b border-border/30">
                      <div className="h-px flex-1 bg-border/50" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-foreground whitespace-nowrap">
                        {dateLabel}
                      </span>
                      <div className="h-px flex-1 bg-border/50" />
                    </div>

                    {/* Entries */}
                    {entries.map((log, i) => {
                      const badge = getBadge(log.action_type);
                      const isPos = log.adjustment >= 0;
                      return (
                        <div
                          key={log.history_id || i}
                          className="flex items-start gap-4 px-5 py-3.5 hover:bg-muted/30 cursor-pointer transition-colors group"
                          onClick={() => openDrawer(log)}
                        >
                          <div className="w-16 shrink-0 pt-0.5 text-right flex flex-col gap-1 items-end">
                            <span className="text-xs font-bold text-foreground">
                              {log.time}
                            </span>
                            <div className={`w-2 h-2 rounded-full ${badge.dot}`} />
                          </div>
                          
                          <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                            <div className="flex-1 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${badge.bg} ${badge.text} ${badge.border}`}>
                                  {badge.label}
                                </span>
                                <span className="text-sm font-black text-foreground">{log.employee_name}</span>
                                <span className="text-[10px] text-foreground">{log.leave_type}</span>
                              </div>
                              <div className="text-[10px] text-foreground flex items-center gap-2">
                                {log.reason && (
                                  <span className="truncate max-w-[200px]">Reason: {log.reason}</span>
                                )}
                              </div>
                              <p className="text-[10px] text-foreground/70">
                                By {log.performed_by}
                                <span className="mx-1">•</span>
                                {log.history_id}
                              </p>
                            </div>

                            <div className="shrink-0 text-right">
                              <p className={`text-sm font-black ${isPos ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {isPos ? '+' : ''}{log.adjustment} Days
                              </p>
                              <p className="text-[10px] font-medium text-foreground mt-0.5">
                                {log.previous_balance} → {log.new_balance}
                              </p>
                              <div className="flex justify-end mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer with Pagination */}
          {filtered.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-gray-100 dark:border-slate-800 gap-4 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
              <div className="flex items-center gap-4 text-[10px] font-bold text-foreground uppercase tracking-widest">
                <span>TOTAL SHOWING {(currentPage - 1) * itemsPerPage + 1} TO {Math.min(currentPage * itemsPerPage, filtered.length)} OF {filtered.length} ENTRIES</span>
                <div className="flex items-center gap-2">
                  <span>Show</span>
                  <Select value={itemsPerPage.toString()} onValueChange={(val) => { setItemsPerPage(Number(val)); setCurrentPage(1); }}>
                    <SelectTrigger className="h-7 text-[10px] font-bold rounded border-border w-[60px]">
                      <SelectValue placeholder={itemsPerPage.toString()}>{itemsPerPage}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
          )}
        </CardContent>
      </Card>

      {selectedLog && (
        <EntitlementDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </div>
  );
}
