import React, { useState, useEffect, useMemo } from "react";
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { API_BASE_URL } from "@/config/api";
import { MonthPicker } from "@/components/shared/MonthPicker";
import { 
  ArrowLeft, 
  Search, 
  Users, 
  CalendarCheck, 
  Clock, 
  Scale, 
  FileText, 
  Download, 
  Printer, 
  RotateCcw,
  User,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ArrowUpDown,
  X
} from "lucide-react";

interface EmployeeBalance {
  user_id: string;
  name: string;
  branch: string;
  department: string;
  position: string;
  annual: { entitlement: number; taken: number; pending: number; remaining: number };
  medical: { entitlement: number; taken: number; pending: number; remaining: number };
  unpaid: { entitlement: number; taken: number; pending: number; remaining: number };
  replacement: { entitlement: number; taken: number; pending: number; remaining: number };
  totalEntitlement: number;
  totalTaken: number;
  totalBalance: number;
  status: 'AVAILABLE' | 'LOW BALANCE' | 'FULLY USED' | 'NO ENTITLEMENT';
}

interface SummaryData {
  totalEmployees: number;
  totalEntitlement: number;
  totalTaken: number;
  totalBalance: number;
}

export function WorkforceLeaveBalancePanel({ onCancel }: { onCancel: () => void }) {
  const { role, userBranch, userDepartment } = useRole();
  const [employees, setEmployees] = useState<EmployeeBalance[]>([]);
  const [summary, setSummary] = useState<SummaryData>({
    totalEmployees: 0,
    totalEntitlement: 0,
    totalTaken: 0,
    totalBalance: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [empSearchOpen, setEmpSearchOpen] = useState(false);
  const [empSearchText, setEmpSearchText] = useState("");
  const [checkedEmployees, setCheckedEmployees] = useState<string[]>([]);

  const [selectedBranch, setSelectedBranch] = useState("All");
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  
  const currentYearStr = new Date().getFullYear().toString();
  const [selectedMonthYear, setSelectedMonthYear] = useState(`${currentYearStr}-all`);
  
  const [selectedLeaveType, setSelectedLeaveType] = useState("All");
  const [sortBy, setSortBy] = useState<"name_asc" | "balance_asc" | "balance_desc">("name_asc");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);

  // Modal detail
  const [selectedEmpDetail, setSelectedEmpDetail] = useState<EmployeeBalance | null>(null);

  const rawRole = (role || "").toLowerCase();
  const isAllAccessRole = [
    "hr admin", "hr_admin", "hr", "admin",
    "managing director", "managing_director", "md",
    "operation manager", "operation_manager",
    "finance manager", "finance_manager"
  ].includes(rawRole);

  const fetchLeaveBalances = async () => {
    setLoading(true);
    try {
      const isFilteredBranch = isAllAccessRole ? selectedBranch : (userBranch || selectedBranch);
      const isFilteredDept = isAllAccessRole ? selectedDepartment : (userDepartment || selectedDepartment);

      const params = new URLSearchParams({
        role: role || "",
        branch: isFilteredBranch || "All",
        department: isFilteredDept || "All",
        monthYear: selectedMonthYear,
        search: search
      });

      const res = await fetch(`${API_BASE_URL}/api/reports/workforce-leave-balance?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setSummary(data.summary || { totalEmployees: 0, totalEntitlement: 0, totalTaken: 0, totalBalance: 0 });
        setEmployees(data.employees || []);
      }
    } catch (err) {
      console.error("Error fetching workforce leave balance:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveBalances();

    // SSE Real-time Updates
    const es = new EventSource(`${API_BASE_URL}/api/workforce-insights/live-feed`);
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data && data.type !== 'ping') {
          fetchLeaveBalances();
        }
      } catch (err) {}
    };

    const handleBroadcast = () => fetchLeaveBalances();
    window.addEventListener("entitlementHistoryUpdated", handleBroadcast);
    window.addEventListener("rayhar_leave_refresh", handleBroadcast);

    return () => {
      es.close();
      window.removeEventListener("entitlementHistoryUpdated", handleBroadcast);
      window.removeEventListener("rayhar_leave_refresh", handleBroadcast);
    };
  }, [role, selectedBranch, selectedDepartment, selectedMonthYear, search]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, checkedEmployees, selectedBranch, selectedDepartment, selectedMonthYear, selectedLeaveType, sortBy]);

  // Unique options for filters
  const uniqueBranches = useMemo(() => {
    const set = new Set(employees.map(e => e.branch).filter(b => b && b !== '—'));
    return Array.from(set).sort();
  }, [employees]);

  const uniqueDepartments = useMemo(() => {
    const set = new Set(employees.map(e => e.department).filter(d => d && d !== '—'));
    return Array.from(set).sort();
  }, [employees]);

  // Client-side filtering & sorting
  const processedEmployees = useMemo(() => {
    let result = [...employees];

    // Checked Employees or Search Input Filter
    if (checkedEmployees.length > 0) {
      result = result.filter(e => checkedEmployees.includes(e.user_id));
    } else if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.user_id.toLowerCase().includes(q)
      );
    }

    if (selectedLeaveType !== "All") {
      result = result.filter(e => {
        if (selectedLeaveType === "Annual Leave") return e.annual.entitlement > 0;
        if (selectedLeaveType === "Medical Leave") return e.medical.entitlement > 0;
        if (selectedLeaveType === "Unpaid Leave") return e.unpaid.taken > 0;
        if (selectedLeaveType === "Replacement Leave") return e.replacement.entitlement > 0;
        return true;
      });
    }

    if (sortBy === "balance_asc") {
      result.sort((a, b) => a.totalBalance - b.totalBalance);
    } else if (sortBy === "balance_desc") {
      result.sort((a, b) => b.totalBalance - a.totalBalance);
    } else {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [employees, checkedEmployees, search, selectedLeaveType, sortBy]);

  // Pagination Calculations
  const totalPages = Math.max(1, Math.ceil(processedEmployees.length / entriesPerPage));
  const indexOfFirstItem = (currentPage - 1) * entriesPerPage;
  const indexOfLastItem = currentPage * entriesPerPage;
  const paginatedEmployees = useMemo(() => {
    return processedEmployees.slice(indexOfFirstItem, indexOfLastItem);
  }, [processedEmployees, indexOfFirstItem, indexOfLastItem]);

  const resetFilters = () => {
    setSearch("");
    setEmpSearchText("");
    setCheckedEmployees([]);
    setSelectedBranch("All");
    setSelectedDepartment("All");
    setSelectedMonthYear(`${currentYearStr}-all`);
    setSelectedLeaveType("All");
    setSortBy("name_asc");
    setCurrentPage(1);
    setEntriesPerPage(10);
  };

  // Export handlers
  const exportCSV = (filename: string) => {
    const headers = ["Employee ID", "Employee Name", "Branch", "Department", "Position", "Annual Remaining", "Annual Entitlement", "Medical Remaining", "Medical Entitlement", "Unpaid Days Taken", "Replacement Remaining", "Replacement Earned", "Total Remaining Balance", "Status"];
    const rows = processedEmployees.map(e => [
      `"${e.user_id}"`,
      `"${e.name}"`,
      `"${e.branch}"`,
      `"${e.department}"`,
      `"${e.position}"`,
      e.annual.remaining,
      e.annual.entitlement,
      e.medical.remaining,
      e.medical.entitlement,
      e.unpaid.taken,
      e.replacement.remaining,
      e.replacement.entitlement,
      e.totalBalance,
      `"${e.status}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-black tracking-wider uppercase"><ShieldCheck className="w-3 h-3 mr-1" />AVAILABLE</Badge>;
      case 'LOW BALANCE':
        return <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-black tracking-wider uppercase"><AlertTriangle className="w-3 h-3 mr-1" />LOW BALANCE</Badge>;
      case 'FULLY USED':
        return <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-[10px] font-black tracking-wider uppercase"><XCircle className="w-3 h-3 mr-1" />FULLY USED</Badge>;
      default:
        return <Badge className="bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30 text-[10px] font-black tracking-wider uppercase"><HelpCircle className="w-3 h-3 mr-1" />NO ENTITLEMENT</Badge>;
    }
  };

  return (
    <div className="animate-in slide-in-from-right-4 duration-300 h-full flex flex-col max-h-[85vh] space-y-4">
      {/* Header Card */}
      <Card className="border-border/60 shadow-xl overflow-hidden bg-card/77 backdrop-blur-sm shrink-0">
        <CardHeader className="pb-4 border-b border-border/50 bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <Button variant="ghost" size="icon" onClick={onCancel} className="mt-1 h-8 w-8 text-foreground hover:bg-muted/50 rounded-full">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <CardTitle className="flex items-center gap-2 text-xl font-black">
                  <Scale className="w-5 h-5 text-[#942392]" />
                  Workforce Leave Balance
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  Centralized view of every staff member's current leave entitlement and remaining balance.
                </CardDescription>
              </div>
            </div>

            {/* Export buttons */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 font-bold" onClick={() => exportCSV(`Workforce_Leave_Balance_${selectedMonthYear}.csv`)}>
                <FileText className="w-3.5 h-3.5" /> CSV
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 font-bold" onClick={() => exportCSV(`Workforce_Leave_Balance_${selectedMonthYear}.xls`)}>
                <Download className="w-3.5 h-3.5" /> Excel
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 font-bold" onClick={() => window.print()}>
                <Printer className="w-3.5 h-3.5" /> PDF
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
        <Card className="border-border/60 bg-card/77 backdrop-blur-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-[#942392] flex items-center justify-center font-bold shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Employees</p>
            <p className="text-2xl font-black text-foreground mt-0.5">{summary.totalEmployees.toLocaleString()}</p>
          </div>
        </Card>

        <Card className="border-border/60 bg-card/77 backdrop-blur-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold shrink-0">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Entitlement</p>
            <p className="text-2xl font-black text-foreground mt-0.5">{summary.totalEntitlement.toLocaleString()} Days</p>
          </div>
        </Card>

        <Card className="border-border/60 bg-card/77 backdrop-blur-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Leave Taken</p>
            <p className="text-2xl font-black text-foreground mt-0.5">{summary.totalTaken.toLocaleString()} Days</p>
          </div>
        </Card>

        <Card className="border-border/60 bg-card/77 backdrop-blur-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold shrink-0">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Leave Balance</p>
            <p className="text-2xl font-black text-foreground mt-0.5">{summary.totalBalance.toLocaleString()} Days</p>
          </div>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border-border/60 shadow-xl overflow-hidden bg-card/77 backdrop-blur-sm flex-1 flex flex-col min-h-0">
        {/* Filters Bar */}
        <div className="p-4 border-b border-border/40 bg-muted/10 flex flex-wrap items-center gap-3 shrink-0">
          {/* Employee Popover Search (Matching Employee Directory) */}
          <Popover open={empSearchOpen} onOpenChange={setEmpSearchOpen}>
            <PopoverTrigger asChild>
              <div 
                className="relative flex-1 min-w-[220px] max-w-xs cursor-pointer"
                onClick={() => setEmpSearchOpen(true)}
              >
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10 pointer-events-none" />
                
                <Input
                  placeholder={checkedEmployees.length > 0 ? `${checkedEmployees.length} employee${checkedEmployees.length > 1 ? 's' : ''} selected` : "Search employees..."}
                  value={empSearchText}
                  onFocus={() => setEmpSearchOpen(true)}
                  onClick={() => setEmpSearchOpen(true)}
                  onChange={(e) => {
                    setEmpSearchText(e.target.value);
                    setSearch(e.target.value);
                    if (!empSearchOpen) setEmpSearchOpen(true);
                  }}
                  className={`pl-9 pr-8 h-9 border bg-background/50 rounded-xl font-semibold text-xs focus-visible:ring-1 focus-visible:ring-[#942392]/50 w-full transition-all ${
                    checkedEmployees.length > 0 ? 'border-[#942392]/50 text-[#942392] placeholder:text-[#942392]/80 placeholder:font-bold' : 'border-border/60'
                  }`}
                />
                {(search || checkedEmployees.length > 0) && (
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setSearch(''); 
                      setCheckedEmployees([]); 
                      setEmpSearchText(''); 
                    }} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground z-10 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-[340px] p-0 shadow-xl" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
              {checkedEmployees.length > 0 && (
                <div className="p-3 border-b border-border/50 bg-muted/20">
                  <div className="flex flex-wrap gap-1.5">
                    {checkedEmployees.map(id => {
                      const emp = employees.find(e => e.user_id === id);
                      return emp ? (
                        <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#942392]/10 text-[#942392] text-[10px] font-bold">
                          {emp.name}
                          <button onClick={() => setCheckedEmployees(prev => prev.filter(x => x !== id))} className="hover:text-red-500">
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
              <div className="max-h-[260px] overflow-y-auto p-1 custom-scrollbar">
                {(() => {
                  const empList = employees
                    .filter(e => {
                      const tMatch = !empSearchText || e.name.toLowerCase().includes(empSearchText.toLowerCase()) || e.user_id.toLowerCase().includes(empSearchText.toLowerCase());
                      return tMatch;
                    })
                    .sort((a, b) => {
                      const aChecked = checkedEmployees.includes(a.user_id) ? 0 : 1;
                      const bChecked = checkedEmployees.includes(b.user_id) ? 0 : 1;
                      if (aChecked !== bChecked) return aChecked - bChecked;
                      return a.name.localeCompare(b.name);
                    });

                  if (empList.length === 0) {
                    return (
                      <div className="p-4 text-center text-xs text-muted-foreground italic">
                        No employees found.
                      </div>
                    );
                  }

                  return empList.map(emp => {
                    const empId = emp.user_id;
                    const isChecked = checkedEmployees.includes(empId);
                    return (
                      <div
                        key={empId}
                        onClick={() => {
                          setCheckedEmployees(prev =>
                            prev.includes(empId) ? prev.filter(x => x !== empId) : [...prev, empId]
                          );
                        }}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${isChecked ? 'bg-[#942392]/5' : 'hover:bg-muted/50'}`}
                      >
                        <label className="relative cursor-pointer" style={{ width: 18, height: 18 }} onClick={(e) => e.preventDefault()}>
                          <input type="checkbox" checked={isChecked} readOnly className="sr-only peer" />
                          <svg viewBox="0 0 18 18" width="18" height="18" className="relative z-10" style={{ fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round', stroke: isChecked ? '#942392' : '#c8ccd4', strokeWidth: 1.5, transition: 'all 0.2s ease' }}>
                            <path d="M1,9 L1,3.5 C1,2 2,1 3.5,1 L14.5,1 C16,1 17,2 17,3.5 L17,14.5 C17,16 16,17 14.5,17 L3.5,17 C2,17 1,16 1,14.5 L1,9 Z"
                              style={{ strokeDasharray: 60, strokeDashoffset: isChecked ? 60 : 0, transition: 'all 0.3s linear' }} />
                            <polyline points="1 9 7 14 15 4"
                              style={{ strokeDasharray: 22, strokeDashoffset: isChecked ? 42 : 66, transition: isChecked ? 'all 0.2s linear 0.15s' : 'all 0.2s linear' }} />
                          </svg>
                        </label>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-bold truncate ${isChecked ? 'text-[#942392]' : 'text-foreground'}`}>{emp.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{emp.user_id} · {emp.branch}</p>
                        </div>
                        {isChecked && <span className="text-[10px] font-bold text-[#942392] bg-[#942392]/10 px-2 py-0.5 rounded-full">Selected</span>}
                      </div>
                    );
                  });
                })()}
              </div>
            </PopoverContent>
          </Popover>

          {/* Branch filter */}
          {(isAllAccessRole || uniqueBranches.length > 1) && (
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="w-[140px] h-9 text-xs font-bold bg-background/50 border-border/60">
                <SelectValue placeholder="Branch: All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All" className="text-xs font-bold">All Branches</SelectItem>
                {uniqueBranches.map(b => (
                  <SelectItem key={b} value={b} className="text-xs font-bold">{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Department filter */}
          {(isAllAccessRole || uniqueDepartments.length > 1) && (
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-[150px] h-9 text-xs font-bold bg-background/50 border-border/60">
                <SelectValue placeholder="Department: All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All" className="text-xs font-bold">All Departments</SelectItem>
                {uniqueDepartments.map(d => (
                  <SelectItem key={d} value={d} className="text-xs font-bold">{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Month / Year Picker */}
          <MonthPicker
            monthYear={selectedMonthYear}
            onSelectMonthYear={setSelectedMonthYear}
            className="h-9 text-xs font-black uppercase bg-background/50 border-border/60 min-w-[140px]"
          />

          {/* Leave Type filter */}
          <Select value={selectedLeaveType} onValueChange={setSelectedLeaveType}>
            <SelectTrigger className="w-[150px] h-9 text-xs font-bold bg-background/50 border-border/60">
              <SelectValue placeholder="Leave Type: All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All" className="text-xs font-bold">All Leave Types</SelectItem>
              <SelectItem value="Annual Leave" className="text-xs font-bold">Annual Leave</SelectItem>
              <SelectItem value="Medical Leave" className="text-xs font-bold">Medical Leave</SelectItem>
              <SelectItem value="Unpaid Leave" className="text-xs font-bold">Unpaid Leave</SelectItem>
              <SelectItem value="Replacement Leave" className="text-xs font-bold">Replacement Leave</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort By */}
          <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
            <SelectTrigger className="w-[160px] h-9 text-xs font-bold bg-background/50 border-border/60">
              <ArrowUpDown className="w-3.5 h-3.5 mr-1" />
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name_asc" className="text-xs font-bold">Name (A-Z)</SelectItem>
              <SelectItem value="balance_asc" className="text-xs font-bold">Lowest Balance</SelectItem>
              <SelectItem value="balance_desc" className="text-xs font-bold">Highest Balance</SelectItem>
            </SelectContent>
          </Select>

          {/* Reset Filters */}
          <Button variant="ghost" size="sm" onClick={resetFilters} className="h-9 px-2 text-xs font-bold text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30">
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Reset
          </Button>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto custom-scrollbar relative">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#942392]" />
              <p className="text-xs font-bold">Loading workforce leave balances...</p>
            </div>
          ) : processedEmployees.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground italic text-xs font-medium">
              No employee leave records found matching your filters.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-20 shadow-sm">
                <tr className="border-b border-border/60">
                  <th className="p-3 pl-4 bg-slate-100 dark:bg-slate-900 text-[10px] uppercase font-black tracking-wider text-black dark:text-white">Employee</th>
                  <th className="p-3 bg-slate-100 dark:bg-slate-900 text-[10px] uppercase font-black tracking-wider text-black dark:text-white">Branch</th>
                  <th className="p-3 bg-slate-100 dark:bg-slate-900 text-[10px] uppercase font-black tracking-wider text-black dark:text-white">Department</th>
                  <th className="p-3 text-center bg-slate-100 dark:bg-slate-900 text-[10px] uppercase font-black tracking-wider text-black dark:text-white">Annual Leave</th>
                  <th className="p-3 text-center bg-slate-100 dark:bg-slate-900 text-[10px] uppercase font-black tracking-wider text-black dark:text-white">Medical Leave</th>
                  <th className="p-3 text-center bg-slate-100 dark:bg-slate-900 text-[10px] uppercase font-black tracking-wider text-black dark:text-white">Unpaid Leave</th>
                  <th className="p-3 text-center bg-slate-100 dark:bg-slate-900 text-[10px] uppercase font-black tracking-wider text-black dark:text-white">Replacement Leave</th>
                  <th className="p-3 text-center font-black bg-slate-100 dark:bg-slate-900 text-[10px] uppercase tracking-wider text-black dark:text-white">Total Balance</th>
                  <th className="p-3 text-center pr-4 bg-slate-100 dark:bg-slate-900 text-[10px] uppercase font-black tracking-wider text-black dark:text-white">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {paginatedEmployees.map(emp => (
                  <tr key={emp.user_id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 pl-4">
                      <button
                        onClick={() => setSelectedEmpDetail(emp)}
                        className="group text-left font-bold text-[#942392] hover:text-[#6c166a] flex items-center gap-1.5 transition-colors"
                      >
                        <span className="font-bold text-[#942392] hover:text-[#6c166a]">{emp.name}</span>
                        <ChevronRight className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity shrink-0" />
                      </button>
                      <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{emp.user_id}</p>
                    </td>

                    <td className="p-3 font-semibold">
                      <Badge variant="outline" className="text-[10px] font-bold border-border/60 bg-muted/30">{emp.branch}</Badge>
                    </td>

                    <td className="p-3 font-medium text-foreground">{emp.department}</td>

                    <td className="p-3 text-center">
                      <span className="font-black text-foreground">{emp.annual.remaining}</span>
                      <span className="text-[10px] text-muted-foreground"> / {emp.annual.entitlement}d</span>
                    </td>

                    <td className="p-3 text-center">
                      <span className="font-black text-foreground">{emp.medical.remaining}</span>
                      <span className="text-[10px] text-muted-foreground"> / {emp.medical.entitlement}d</span>
                    </td>

                    <td className="p-3 text-center">
                      <span className="font-black text-foreground">{emp.unpaid.taken}</span>
                      <span className="text-[10px] text-muted-foreground"> days taken</span>
                    </td>

                    <td className="p-3 text-center">
                      <span className="font-black text-foreground">{emp.replacement.remaining}</span>
                      <span className="text-[10px] text-muted-foreground"> / {emp.replacement.entitlement}d</span>
                    </td>

                    <td className="p-3 text-center font-black">
                      <span className="px-2.5 py-1 rounded-full bg-[#942392]/10 text-[#942392] text-xs font-black">
                        {emp.totalBalance} Days
                      </span>
                    </td>

                    <td className="p-3 text-center pr-4">
                      {getStatusBadge(emp.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Controls */}
        {!loading && processedEmployees.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-border/40 bg-muted/10 gap-4 shrink-0">
            <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold text-foreground uppercase tracking-widest">
              <span>
                TOTAL SHOWING {indexOfFirstItem + 1} TO {Math.min(indexOfLastItem, processedEmployees.length)} OF {processedEmployees.length} ENTRIES
              </span>
              <div className="flex items-center gap-2">
                <span>SHOW</span>
                <Select 
                  value={entriesPerPage.toString()} 
                  onValueChange={(val) => { 
                    setEntriesPerPage(Number(val)); 
                    setCurrentPage(1); 
                  }}
                >
                  <SelectTrigger className="h-7 text-[10px] font-bold rounded border-border/60 w-[65px] bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="h-7 px-2 text-[10px] font-bold rounded bg-background/50 border-border/60"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>

              <div className="flex items-center gap-1 overflow-x-auto max-w-[180px] sm:max-w-none scrollbar-hide">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`h-7 w-7 p-0 text-[10px] font-bold rounded ${
                      currentPage === pageNum 
                        ? 'bg-[#942392] text-white border-[#942392] hover:bg-[#6c166a]' 
                        : 'text-foreground bg-background/50 border-border/60'
                    }`}
                  >
                    {pageNum}
                  </Button>
                ))}
              </div>

              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="h-7 px-2 text-[10px] font-bold rounded bg-background/50 border-border/60"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Staff Leave Balance Detail Modal */}
      <Dialog open={!!selectedEmpDetail} onOpenChange={(open) => !open && setSelectedEmpDetail(null)}>
        <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden rounded-2xl border-border/60 shadow-2xl">
          <DialogHeader className="p-5 bg-[#942392] text-white">
            <DialogTitle className="text-lg font-black text-white flex items-center gap-2">
              <User className="w-5 h-5" />
              {selectedEmpDetail?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-white/80 mt-1">
              Branch: <strong>{selectedEmpDetail?.branch}</strong> • Department: <strong>{selectedEmpDetail?.department}</strong> • Position: <strong>{selectedEmpDetail?.position}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="p-5 space-y-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Detailed Leave Entitlement Breakdown ({selectedMonthYear})</p>

            <table className="w-full text-left text-xs border-collapse">
              <thead className="border-b border-border/60 text-[10px] uppercase font-black tracking-wider text-black dark:text-white">
                <tr>
                  <th className="p-2.5 pl-3 bg-slate-100 dark:bg-slate-900">Leave Type</th>
                  <th className="p-2.5 text-center bg-slate-100 dark:bg-slate-900">Entitlement</th>
                  <th className="p-2.5 text-center bg-slate-100 dark:bg-slate-900">Taken</th>
                  <th className="p-2.5 text-center bg-slate-100 dark:bg-slate-900">Pending</th>
                  <th className="p-2.5 text-center font-black pr-3 bg-slate-100 dark:bg-slate-900">Remaining</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                <tr>
                  <td className="p-2.5 pl-3 font-bold">Annual Leave</td>
                  <td className="p-2.5 text-center font-semibold">{selectedEmpDetail?.annual.entitlement}</td>
                  <td className="p-2.5 text-center text-rose-600 font-semibold">{selectedEmpDetail?.annual.taken}</td>
                  <td className="p-2.5 text-center text-amber-600 font-semibold">{selectedEmpDetail?.annual.pending}</td>
                  <td className="p-2.5 text-center font-black text-emerald-600 pr-3">{selectedEmpDetail?.annual.remaining}</td>
                </tr>

                <tr>
                  <td className="p-2.5 pl-3 font-bold">Medical Leave</td>
                  <td className="p-2.5 text-center font-semibold">{selectedEmpDetail?.medical.entitlement}</td>
                  <td className="p-2.5 text-center text-rose-600 font-semibold">{selectedEmpDetail?.medical.taken}</td>
                  <td className="p-2.5 text-center text-amber-600 font-semibold">{selectedEmpDetail?.medical.pending}</td>
                  <td className="p-2.5 text-center font-black text-emerald-600 pr-3">{selectedEmpDetail?.medical.remaining}</td>
                </tr>

                <tr>
                  <td className="p-2.5 pl-3 font-bold">Unpaid Leave (Cuti Tanpa Gaji)</td>
                  <td className="p-2.5 text-center font-semibold">—</td>
                  <td className="p-2.5 text-center text-rose-600 font-semibold">{selectedEmpDetail?.unpaid.taken}</td>
                  <td className="p-2.5 text-center text-amber-600 font-semibold">{selectedEmpDetail?.unpaid.pending}</td>
                  <td className="p-2.5 text-center font-black text-muted-foreground pr-3">—</td>
                </tr>

                <tr>
                  <td className="p-2.5 pl-3 font-bold flex items-center gap-1">
                    Replacement Leave
                    <span className="text-[9px] text-muted-foreground font-normal">(Earned)</span>
                  </td>
                  <td className="p-2.5 text-center font-semibold">{selectedEmpDetail?.replacement.entitlement}</td>
                  <td className="p-2.5 text-center text-rose-600 font-semibold">{selectedEmpDetail?.replacement.taken}</td>
                  <td className="p-2.5 text-center text-amber-600 font-semibold">{selectedEmpDetail?.replacement.pending}</td>
                  <td className="p-2.5 text-center font-black text-emerald-600 pr-3">{selectedEmpDetail?.replacement.remaining}</td>
                </tr>
              </tbody>
              <tfoot className="border-t-2 border-border/60 bg-muted/20 font-black">
                <tr>
                  <td className="p-2.5 pl-3">Total Balance</td>
                  <td className="p-2.5 text-center">{selectedEmpDetail?.totalEntitlement}</td>
                  <td className="p-2.5 text-center text-rose-600">{selectedEmpDetail?.totalTaken}</td>
                  <td className="p-2.5 text-center text-amber-600">
                    {(selectedEmpDetail?.annual.pending || 0) + (selectedEmpDetail?.medical.pending || 0) + (selectedEmpDetail?.unpaid.pending || 0) + (selectedEmpDetail?.replacement.pending || 0)}
                  </td>
                  <td className="p-2.5 text-center text-[#942392] text-sm pr-3">{selectedEmpDetail?.totalBalance} Days</td>
                </tr>
              </tfoot>
            </table>

            <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/30 rounded-xl p-3 text-[11px] text-purple-700 dark:text-purple-300">
              💡 <strong>Note:</strong> Replacement Leave comes strictly from earned RL credits and does NOT reduce Annual Leave entitlement.
            </div>
          </div>

          <DialogFooter className="p-4 bg-muted/10 border-t border-border/40">
            <Button variant="outline" onClick={() => setSelectedEmpDetail(null)} className="font-bold text-xs">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
