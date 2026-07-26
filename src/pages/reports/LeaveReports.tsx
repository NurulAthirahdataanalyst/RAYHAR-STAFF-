import { useRole } from "@/contexts/RoleContext";
import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/config/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Download, Search, FileText, CalendarDays } from "lucide-react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExportDropdown } from "@/components/shared/ExportDropdown";
import PageActions from "@/components/layout/PageActions";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";

function YearPopover({ year, onSelectYear, className }: { year: string; onSelectYear: (y: string) => void; className?: string }) {
  const [open, setOpen] = useState(false);
  const currentYear = new Date().getFullYear();
  const activeYearNum = parseInt(year) || currentYear;
  const [baseDecade, setBaseDecade] = useState(Math.floor(activeYearNum / 10) * 10);

  useEffect(() => {
    if (open) {
      setBaseDecade(Math.floor(activeYearNum / 10) * 10);
    }
  }, [open, year]);

  const yearsList = Array.from({ length: 12 }, (_, i) => baseDecade - 1 + i);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={className || "appearance-none flex items-center justify-between px-4 py-2 bg-white dark:bg-card border border-border text-foreground text-[11px] font-black rounded-md shadow-sm outline-none cursor-pointer uppercase tracking-widest h-10 gap-2 hover:border-[#7B0099]/40"}
        >
          <span className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-[#7B0099]" />
            {year ? `${year}` : `${currentYear}`}
          </span>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl bg-white dark:bg-card z-50" align="end">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setBaseDecade(prev => prev - 10)}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-600 dark:text-slate-400"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
            {baseDecade} – {baseDecade + 9}
          </span>
          <button
            type="button"
            onClick={() => setBaseDecade(prev => prev + 10)}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-600 dark:text-slate-400"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {yearsList.map(y => {
            const isSelected = y.toString() === year;
            const isCurrent = y === currentYear;
            return (
              <button
                key={y}
                type="button"
                onClick={() => {
                  onSelectYear(y.toString());
                  setOpen(false);
                }}
                className={`py-2 px-1 text-xs font-bold rounded-lg transition-all text-center ${
                  isSelected
                    ? "bg-[#7B0099] text-white shadow-sm"
                    : isCurrent
                    ? "border border-[#7B0099] text-[#7B0099] hover:bg-purple-50 dark:hover:bg-purple-950/40"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}
              >
                {y}
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => {
              onSelectYear("");
              setOpen(false);
            }}
            className="text-slate-400 hover:text-slate-600 text-[11px] font-semibold"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => {
              const cy = new Date().getFullYear().toString();
              onSelectYear(cy);
              setBaseDecade(Math.floor(parseInt(cy) / 10) * 10);
              setOpen(false);
            }}
            className="text-[#0091ff] hover:underline text-[11px] font-bold"
          >
            This year
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

const formatDate = (value: string) => (value ? value.slice(0, 10) : "");

export default function LeaveReports() {
  const { role, userBranch, userDepartment } = useRole();
  const [loading, setLoading] = useState(true);
  const [leaveData, setLeaveData] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
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
      } else {
        params.append("month", selectedMonth);
        params.append("year", selectedYear);
      }

      const res = await fetch(`${API_BASE_URL}/api/leave-requests?${params}`);
      const data = await res.json();
      if (data.success) {
        setLeaveData(data.leaveRequests);
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
    link.setAttribute("download", viewType === "day" ? `leave_report_${date}.csv` : `leave_report_${months.find(m => m.value === selectedMonth)?.label}_${selectedYear}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-background">
      <PageActions>

          
          {/* DAY / MONTH / YEAR Toggle */}
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setViewType("day")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                viewType === "day"
                  ? "bg-[#FFFE00] text-[#7B0099] ring-1 ring-[#7B0099] shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              DAY
            </button>
            <button
              onClick={() => setViewType("month")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                viewType === "month"
                  ? "bg-[#FFFE00] text-[#7B0099] ring-1 ring-[#7B0099] shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              MONTH
            </button>
            <button
              onClick={() => setViewType("year")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                viewType === "year"
                  ? "bg-[#FFFE00] text-[#7B0099] ring-1 ring-[#7B0099] shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              YEAR
            </button>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {viewType === "day" ? (
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="appearance-none flex items-center justify-center px-4 py-2 bg-muted/50 border border-border text-foreground text-[11px] font-black rounded-md shadow-sm outline-none cursor-pointer uppercase tracking-widest bg-white dark:bg-card h-10"
              />
            ) : viewType === "month" ? (
              <input
                type="month"
                value={`${selectedYear}-${String(selectedMonth).padStart(2, '0')}`}
                onChange={(e) => {
                  if (e.target.value) {
                    const [yyyy, mm] = e.target.value.split('-');
                    setSelectedYear(yyyy);
                    setSelectedMonth(parseInt(mm).toString());
                  }
                }}
                className="appearance-none flex items-center justify-center px-4 py-2 bg-muted/50 border border-border text-foreground text-[11px] font-black rounded-md shadow-sm outline-none cursor-pointer uppercase tracking-widest bg-white dark:bg-card h-10"
              />
            ) : (
              <YearPopover year={selectedYear} onSelectYear={setSelectedYear} />
            )}
            <ExportDropdown onExportCSV={handleExportCSV} />
          </div>
        
</PageActions>

<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="border-border shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
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
                <p className="text-sm font-medium text-muted-foreground">Approved</p>
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
                <p className="text-sm font-medium text-muted-foreground">Total Leave Days</p>
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
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, ID, or branch..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
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
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No leave records found for this {viewType}.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredList.map((req, idx) => (
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
        </Card>

      </div>
    </div>
  );
}
