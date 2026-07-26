import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search, Filter, Download, X, ArrowLeft, History,
  FileText, Printer, ChevronDown, ChevronUp, Eye,
  ClipboardList, Users, BarChart3, Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { getHistoryLogs, EntitlementHistoryLog } from "@/lib/entitlementHistory";
import { getBadge, formatRelativeDate, ACTION_BADGE } from "./EntitlementActivityCard";

// ─── Date range helpers ───────────────────────────────────────────────────────
type DateRange = 'all' | 'today' | 'yesterday' | '7days' | 'thismonth' | 'lastmonth' | 'thisyear' | 'custom';

function inRange(dateStr: string, range: DateRange, customFrom?: string, customTo?: string): boolean {
  const d = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (range) {
    case 'today':     return d >= today;
    case 'yesterday': { const y = new Date(today); y.setDate(y.getDate()-1); return d >= y && d < today; }
    case '7days':     { const w = new Date(today); w.setDate(w.getDate()-7); return d >= w; }
    case 'thismonth': return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    case 'lastmonth': {
      const lm = new Date(now.getFullYear(), now.getMonth()-1, 1);
      return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
    }
    case 'thisyear':  return d.getFullYear() === now.getFullYear();
    case 'custom':
      if (customFrom && d < new Date(customFrom + 'T00:00:00')) return false;
      if (customTo   && d > new Date(customTo   + 'T23:59:59')) return false;
      return true;
    default: return true;
  }
}

// ─── Export helpers ───────────────────────────────────────────────────────────
function exportCSV(logs: EntitlementHistoryLog[], filename: string) {
  const headers = ['History ID','Reference ID','Date','Time','Employee','Employee ID','Branch','Department','Leave Type','Action','Action Type','Prev Balance','Adjustment','New Balance','Reason','Performed By','Role'];
  const rows = logs.map(l => [
    l.history_id, l.reference_id, l.date, l.time,
    l.employee_name, l.employee_id, l.branch, l.department,
    l.leave_type, l.action, l.action_type,
    l.previous_balance, l.adjustment, l.new_balance,
    `"${l.reason.replace(/"/g,'""')}"`, l.performed_by, l.performed_role,
  ]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
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
    h1{font-size:22px;font-weight:900;color:#7B0099;margin:0}
    h2{font-size:12px;color:#64748b;font-weight:600;margin:2px 0 24px;text-transform:uppercase;letter-spacing:1px}
    .meta{display:flex;gap:24px;margin-bottom:20px;padding:12px 16px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0}
    .meta span{font-size:11px} .meta b{color:#475569}
    table{width:100%;border-collapse:collapse}
    th{background:#7B0099;color:#fff;padding:8px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.5px}
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
  <button onclick="window.print()" style="margin-top:20px;padding:8px 20px;background:#7B0099;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:700">PRINT</button>
  </body></html>`);
  w.document.close();
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────
function DetailDrawer({ log, onClose }: { log: EntitlementHistoryLog; onClose: () => void }) {
  const badge = getBadge(log.action_type);
  const isPositive = log.adjustment >= 0;
  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-40" onClick={onClose} />
      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white dark:bg-card shadow-2xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Drawer header */}
        <div className="flex items-center justify-between p-5 border-b border-border/50 bg-muted/30">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Leave Entitlement Record</p>
            <p className="text-xs font-black text-foreground mt-0.5">{log.history_id}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Action badge */}
          <div className="flex items-center gap-2">
            <span className={`text-xs font-black px-2.5 py-1 rounded-lg border ${badge.bg} ${badge.text} ${badge.border}`}>
              {badge.label}
            </span>
            <span className={`text-sm font-black ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
              {isPositive ? '+' : ''}{log.adjustment} Days
            </span>
          </div>

          {/* Balance flow */}
          <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-border/50">
            <div className="text-center flex-1">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase">Previous</p>
              <p className="text-xl font-black text-slate-700">{log.previous_balance}</p>
              <p className="text-[9px] text-muted-foreground">Days</p>
            </div>
            <div className="text-center px-2">
              <p className={`text-lg font-black ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                {isPositive ? '+' : ''}{log.adjustment}
              </p>
            </div>
            <div className="text-center flex-1">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase">New Balance</p>
              <p className="text-xl font-black text-foreground">{log.new_balance}</p>
              <p className="text-[9px] text-muted-foreground">Days</p>
            </div>
          </div>

          {/* Details grid */}
          {[
            { label: 'History ID',     value: log.history_id },
            { label: 'Reference ID',   value: log.reference_id },
            { label: 'Employee',       value: log.employee_name },
            { label: 'Employee ID',    value: log.employee_id || '—' },
            { label: 'Branch',         value: log.branch || '—' },
            { label: 'Department',     value: log.department || '—' },
            { label: 'Leave Type',     value: log.leave_type },
            { label: 'Action Type',    value: log.action_type },
            { label: 'Reason',         value: log.reason || '—' },
            { label: 'Remarks',        value: log.remarks || '—' },
            { label: 'Performed By',   value: log.performed_by },
            { label: 'Role',           value: log.performed_role || '—' },
            { label: 'Source Module',  value: log.source_module || '—' },
            { label: 'Date',           value: `${log.date}  ${log.time}` },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col gap-0.5 border-b border-border/30 pb-3">
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{label}</p>
              <p className="text-sm font-semibold text-foreground break-all">{value}</p>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-border/50 bg-muted/10 text-[10px] text-muted-foreground text-center">
          ⚠ This audit record is immutable and cannot be edited or deleted.
        </div>
      </div>
    </>
  );
}

// ─── Timeline group helpers ───────────────────────────────────────────────────
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

// ─── Main Component ───────────────────────────────────────────────────────────
export default function EntitlementHistoryPanel({ onCancel }: { onCancel: () => void }) {
  const [logs, setLogs]           = useState<EntitlementHistoryLog[]>([]);
  const [search, setSearch]       = useState('');
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo]   = useState('');
  const [filterEmployee, setFilterEmployee] = useState('all');
  const [filterBranch, setBranch]     = useState('all');
  const [filterDept, setDept]         = useState('all');
  const [filterLeave, setLeave]       = useState('all');
  const [filterAction, setAction]     = useState('all');
  const [filterBy, setFilterBy]       = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState<EntitlementHistoryLog | null>(null);
  const [drawerOpen, setDrawerOpen]   = useState(false);

  const reload = useCallback(() => setLogs(getHistoryLogs()), []);
  useEffect(() => {
    reload();
    window.addEventListener('entitlementHistoryUpdated', reload);
    return () => window.removeEventListener('entitlementHistoryUpdated', reload);
  }, [reload]);

  // Unique values for filter dropdowns
  const employees  = useMemo(() => [...new Set(logs.map(l => l.employee_name).filter(Boolean))].sort(), [logs]);
  const branches   = useMemo(() => [...new Set(logs.map(l => l.branch).filter(Boolean))].sort(), [logs]);
  const depts      = useMemo(() => [...new Set(logs.map(l => l.department).filter(Boolean))].sort(), [logs]);
  const leaveTypes = useMemo(() => [...new Set(logs.map(l => l.leave_type).filter(Boolean))].sort(), [logs]);
  const actionTypes = Object.keys(ACTION_BADGE);
  const performers = useMemo(() => [...new Set(logs.map(l => l.performed_by).filter(Boolean))].sort(), [logs]);

  // Filtered logs
  const filtered = useMemo(() => {
    return logs.filter(l => {
      if (!inRange(l.date, dateRange, customFrom, customTo)) return false;
      if (filterEmployee !== 'all' && l.employee_name !== filterEmployee) return false;
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
          l.action.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [logs, search, dateRange, customFrom, customTo, filterEmployee, filterBranch, filterDept, filterLeave, filterAction, filterBy]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  // Stats
  const today = new Date().toISOString().split('T')[0];
  const thisMonth = `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}`;
  const todayCount    = filtered.filter(l => l.date === today).length;
  const monthCount    = filtered.filter(l => l.date.startsWith(thisMonth)).length;
  const empAffected   = new Set(filtered.map(l => l.employee_id || l.employee_name)).size;

  const openDrawer = (log: EntitlementHistoryLog) => { setSelectedLog(log); setDrawerOpen(true); };

  // Date range label map
  const rangeLabelMap: Record<DateRange, string> = {
    all: 'All Time', today: 'Today', yesterday: 'Yesterday',
    '7days': 'Last 7 Days', thismonth: 'This Month', lastmonth: 'Last Month',
    thisyear: 'This Year', custom: 'Custom Range',
  };

  return (
    <>
      <Card className="border-border/60 bg-card/75 shadow-lg">
        {/* Header */}
        <CardHeader className="flex flex-col sm:flex-row sm:items-center gap-3 border-b pb-4 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Button variant="ghost" size="icon" onClick={onCancel}
              className="h-8 w-8 rounded-full hover:bg-slate-500/10 hover:text-slate-600 shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="w-9 h-9 rounded-xl bg-[#7B0099]/10 flex items-center justify-center shrink-0">
              <History className="w-5 h-5 text-[#7B0099]" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base sm:text-lg font-black text-foreground">Leave Balance History</CardTitle>
              <CardDescription className="text-xs">Complete audit trail of all leave entitlement changes.</CardDescription>
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
        </CardHeader>

        <CardContent className="p-0">
          {/* Search + Filter toggle bar */}
          <div className="p-4 border-b border-border/40 bg-muted/5 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by employee, reason, history ID, or reference ID..."
                value={search} onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs bg-white dark:bg-card"
              />
              {search && (
                <button onClick={() => setSearch('')}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Select value={dateRange} onValueChange={v => setDateRange(v as DateRange)}>
                <SelectTrigger className="w-[140px] h-9 text-xs bg-white dark:bg-card">
                  <SelectValue />
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
              <Button variant="outline" size="sm" className={`h-9 text-xs gap-1.5 ${showFilters ? 'bg-[#7B0099]/5 border-[#7B0099]/40 text-[#7B0099]' : ''}`}
                onClick={() => setShowFilters(!showFilters)}>
                <Filter className="w-3.5 h-3.5" />
                Filters
                {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </Button>
            </div>
          </div>

          {/* Custom date range */}
          {dateRange === 'custom' && (
            <div className="px-4 py-3 border-b border-border/40 bg-blue-50/30 flex items-center gap-3 flex-wrap">
              <Label className="text-xs font-bold text-muted-foreground">From</Label>
              <Input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                className="h-8 text-xs w-36 bg-white" />
              <Label className="text-xs font-bold text-muted-foreground">To</Label>
              <Input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                className="h-8 text-xs w-36 bg-white" />
            </div>
          )}

          {/* Advanced filters panel */}
          {showFilters && (
            <div className="px-4 py-3 border-b border-border/40 bg-muted/10 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
              {[
                { label: 'Employee', value: filterEmployee, set: setFilterEmployee, options: employees },
                { label: 'Branch',   value: filterBranch,   set: setBranch,         options: branches  },
                { label: 'Department', value: filterDept,   set: setDept,           options: depts     },
                { label: 'Leave Type', value: filterLeave,  set: setLeave,          options: leaveTypes },
                { label: 'Action Type', value: filterAction, set: setAction,        options: actionTypes },
                { label: 'Performed By', value: filterBy,   set: setFilterBy,       options: performers },
              ].map(f => (
                <div key={f.label} className="space-y-1">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{f.label}</Label>
                  <Select value={f.value} onValueChange={f.set}>
                    <SelectTrigger className="h-8 text-xs bg-white dark:bg-card">
                      <SelectValue placeholder={`All ${f.label}s`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All {f.label}s</SelectItem>
                      {f.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border/30 border-b border-border/40">
            {[
              { icon: ClipboardList, label: 'Total Records',      val: filtered.length,  color: 'text-slate-700'  },
              { icon: Calendar,      label: "Today's Changes",    val: todayCount,        color: 'text-blue-600'   },
              { icon: BarChart3,     label: 'This Month',         val: monthCount,        color: 'text-[#7B0099]'  },
              { icon: Users,         label: 'Employees Affected', val: empAffected,       color: 'text-emerald-600'},
            ].map(s => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="flex items-center gap-3 p-3 bg-white dark:bg-card">
                  <Icon className={`w-4 h-4 ${s.color} shrink-0`} />
                  <div>
                    <p className={`text-lg font-black leading-none ${s.color}`}>{s.val}</p>
                    <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{s.label}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Timeline */}
          <div className="overflow-y-auto max-h-[560px]">
            {grouped.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <History className="w-10 h-10 opacity-20 mb-3" />
                <p className="text-sm font-medium">No records found.</p>
                <p className="text-xs mt-1">Try changing filters or search terms.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/20">
                {grouped.map(({ dateLabel, entries }) => (
                  <div key={dateLabel}>
                    {/* Date separator */}
                    <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-2 bg-muted/80 backdrop-blur-sm border-b border-border/30">
                      <div className="h-px flex-1 bg-border/50" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap">
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
                          className="flex items-start gap-4 px-5 py-3.5 hover:bg-muted/20 cursor-pointer transition-colors group"
                          onClick={() => openDrawer(log)}
                        >
                          {/* Left: time + dot */}
                          <div className="flex flex-col items-center gap-1 w-16 shrink-0">
                            <span className="text-[10px] text-muted-foreground font-mono leading-none">{log.time || '--:--'}</span>
                            <div className={`w-2.5 h-2.5 rounded-full border-2 border-white ${badge.dot} shadow-sm`} />
                          </div>

                          {/* Center: content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 mb-1">
                              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md border ${badge.bg} ${badge.text} ${badge.border}`}>
                                {badge.label}
                              </span>
                              <span className="text-sm font-bold text-foreground">{log.employee_name}</span>
                              <span className="text-xs text-muted-foreground">{log.leave_type}</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground line-clamp-1">
                              {log.reason || log.action}
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-[10px] text-muted-foreground/70">By {log.performed_by}</span>
                              <span className="text-[10px] text-muted-foreground/50">{log.history_id}</span>
                            </div>
                          </div>

                          {/* Right: amount + view */}
                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <span className={`text-sm font-black ${isPos ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {isPos ? '+' : ''}{log.adjustment} Days
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {log.previous_balance} → {log.new_balance}
                            </span>
                            <Eye className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-[#7B0099] transition-colors" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {filtered.length > 0 && (
            <div className="px-5 py-3 border-t border-border/40 bg-muted/5 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Showing <b className="text-foreground">{filtered.length}</b> of <b className="text-foreground">{logs.length}</b> records</span>
              <span className="italic">⚠ Audit records are read-only and cannot be modified.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail drawer */}
      {drawerOpen && selectedLog && (
        <DetailDrawer log={selectedLog} onClose={() => setDrawerOpen(false)} />
      )}
    </>
  );
}
