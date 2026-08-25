import { useRole } from "@/contexts/RoleContext";
import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/config/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Download, Search, FileText, CalendarDays , X} from 'lucide-react';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExportDropdown } from "@/components/shared/ExportDropdown";
import PageActions from "@/components/layout/PageActions";
import { YearPopover } from "@/components/shared/YearPopover";
import { MonthPicker } from "@/components/shared/MonthPicker";

const formatDate = (value: string) => (value ? value.slice(0, 10) : "");

export default function LeaveReports() {
  const { role, userBranch, userDepartment } = useRole();
  const [loading, setLoading] = useState(true);
  const [leaveData, setLeaveData] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  
  // View Toggle State
  const [viewType, setViewType] = useState<"day" | "month" | "year">("month");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  const months = [
    { value: "1", label: "January" }, { value: "2", label: "February" }, { value: "3", label: "March" },
    { value: "4", label: "April" }, { value: "5", label: "May" }, { value: "6", label: "June" },
    { value: "7", label: "July" }, { value: "8", label: "August" }, { value: "9", label: "September" },
    { value: "10", label: "October" }, { value: "11", label: "November" }, { value: "12", label: "December" }
  ];

  const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());

  useEffect(() => {
    fetchData();
  }, [role, userBranch, userDepartment, viewType, date, selectedMonth, selectedYear]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        role: role || "",
        branch: userBranch || "",
        department: userDepartment || "",
      });

      if (viewType === "day") {
        params.append("date", date);
      } else if (viewType === "month") {
        params.append("month", selectedMonth);
        params.append("year", selectedYear);
      } else if (viewType === "year") {
        params.append("year", selectedYear);
      }

      const res = await fetch(`${API_BASE_URL}/api/leave-requests?${params}`);
      const data = await res.json();
      if (data.success) {
        let filtered = data.leaveRequests || [];
        if (viewType === "month") {
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
        }
        setLeaveData(filtered);
      } else {
        setLeaveData([]);
      }
    } catch (error) {
      console.error("Error fetching leave report:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredList = leaveData.filter(e => 
    (e.full_name || e.user_id)?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.user_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.branch?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pageCount = Math.max(1, Math.ceil(filteredList.length / pageSize));
  const pagedList = filteredList.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, viewType, date, selectedMonth, selectedYear, pageSize]);

  const handleExportCSV = () => {
    const headers = ["Employee", "Branch", "Leave Type", "Start Date", "End Date", "Days", "Status"];
    const rows = filteredList.map(a => [
      `"${(a.full_name || a.user_id || '').replace(/"/g, '""')}"`,
      `"${(a.branch || 'HQ').replace(/"/g, '""')}"`,
      `"${(a.leave_type || '').replace(/"/g, '""')}"`,
      `"${(formatDate(a.start_date) || '').replace(/"/g, '""')}"`,
      `"${(formatDate(a.end_date) || '').replace(/"/g, '""')}"`,
      a.days,
      `"${(a.status || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "\ufeff" + [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", viewType === "day" ? `leave_report_${date}.csv` : viewType === "month" ? `leave_report_${months.find(m => m.value === selectedMonth)?.label}_${selectedYear}.csv` : `leave_report_${selectedYear}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-6">

        {/* Filter Toolbar Line directly under main header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
          {/* LEFT: DAY | MONTH | YEAR View Toggle Bar */}
          <div className="flex items-center gap-4 sm:gap-6 border-b border-gray-200 dark:border-slate-800 w-full sm:w-auto">
            <button
              onClick={() => setViewType("day")}
              className={`text-[11px] font-black uppercase tracking-widest pb-3 -mb-[1px] transition-colors border-b-[3px] ${
                viewType === "day"
                  ? "text-[#7B0099] border-[#7B0099]"
                  : "text-foreground hover:text-yellow-500 border-transparent hover:border-yellow-500"
              }`}
            >
              DAY
            </button>
            <button
              onClick={() => setViewType("month")}
              className={`text-[11px] font-black uppercase tracking-widest pb-3 -mb-[1px] transition-colors border-b-[3px] ${
                viewType === "month"
                  ? "text-[#7B0099] border-[#7B0099]"
                  : "text-foreground hover:text-yellow-500 border-transparent hover:border-yellow-500"
              }`}
            >
              MONTH
            </button>
            <button
              onClick={() => setViewType("year")}
              className={`text-[11px] font-black uppercase tracking-widest pb-3 -mb-[1px] transition-colors border-b-[3px] ${
                viewType === "year"
                  ? "text-[#7B0099] border-[#7B0099]"
                  : "text-foreground hover:text-yellow-500 border-transparent hover:border-yellow-500"
              }`}
            >
              YEAR
            </button>
          </div>

          {/* RIGHT: Active Filter Controls (Date/Month Picker, Export Button) */}
          <div className="flex flex-wrap gap-2 items-center sm:justify-end">
            {viewType === "day" ? (
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="appearance-none flex items-center justify-between px-4 py-2 bg-white dark:bg-card border border-slate-300 dark:border-slate-700 text-foreground text-[11px] font-black rounded-md shadow-sm outline-none cursor-pointer uppercase tracking-widest h-10 min-w-[140px]"
              />
            ) : viewType === "month" ? (
              <MonthPicker
                monthYear={`${selectedYear}-${String(selectedMonth).padStart(2, '0')}`}
                onSelectMonthYear={(val) => {
                  const [yyyy, mm] = val.split('-');
                  setSelectedYear(yyyy);
                  setSelectedMonth(parseInt(mm).toString());
                }}
                className="appearance-none flex items-center justify-between px-4 py-2 bg-white dark:bg-card border border-slate-300 dark:border-slate-700 text-foreground text-[11px] font-black rounded-md shadow-sm outline-none cursor-pointer uppercase tracking-widest h-10 min-w-[140px]"
              />
            ) : (
              <YearPopover year={selectedYear} onSelectYear={setSelectedYear} className="flex items-center justify-between h-10 px-4 text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-slate-100 bg-white dark:bg-card border border-slate-300 dark:border-slate-700 rounded-md shadow-sm min-w-[140px]" />
            )}
            <ExportDropdown onExportCSV={handleExportCSV} />
          </div>
        </div>
<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="border-border shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Total Requests</p>
                <h3 className="text-3xl font-bold mt-1">{filteredList.length}</h3>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <CalendarDays className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Approved</p>
                <h3 className="text-3xl font-bold mt-1 text-green-600 dark:text-green-400">
                  {filteredList.filter(a => a.status === 'Approved').length}
                </h3>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <CalendarDays className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Total Leave Days</p>
                <h3 className="text-3xl font-bold mt-1 text-orange-600 dark:text-orange-400">
                  {filteredList.filter(a => a.status === 'Approved').reduce((acc, curr) => acc + Number(curr.days || 0), 0)}
                </h3>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-lg">Leave Utilisation Log</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-foreground" />
              <Input
                placeholder="Search name, ID, or branch..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground z-10 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
            </div>
            </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Leave Type</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-foreground">
                          No leave records found for this {viewType}.
                        </TableCell>
                      </TableRow>
                    ) : (
                      pagedList.map((req, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">
                            {req.full_name || req.user_id}
                          </TableCell>
                          <TableCell>{req.branch || "HQ"}</TableCell>
                          <TableCell>{req.leave_type}</TableCell>
                          <TableCell>{formatDate(req.start_date)}</TableCell>
                          <TableCell>{formatDate(req.end_date)}</TableCell>
                          <TableCell>{req.days}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full \${
                              req.status === 'Approved' ? 'bg-green-100 text-green-700' :
                              req.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {req.status}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>

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
}


