import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarWidget } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import PageActions from "@/components/layout/PageActions";
import { MonthPicker } from "@/components/shared/MonthPicker";
import { DatePickerInput } from "@/components/shared/DatePickerInput";
import { TableScrollTopButton } from "@/components/shared/TableScrollTopButton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  Plane, Plus, Filter, Loader2, MapPin, Edit2, XCircle, Trash2,
  Users, Search, Calendar, CheckCircle2, X, ChevronLeft, ChevronRight, CalendarDays, ArrowLeft
} from "lucide-react";
import { API_BASE_URL } from "../../config/api";

const OUTSTATION_ROLES = ["hr_admin", "managing_director", "operation_manager", "finance_manager", "branch_leader", "head_of_department"];
const PINK = "#942392]";

const BRANCHES = ["HQ","KMM","TGG","CNH","KBG","DGN","JTH","KBR","RMP","MZM","TWU","AOR","BTM","KKS","SHA","BBB","KUL","IPH","MJG","MLK","SNS","JB","BTP"];

function formatName(fullName: string) {
  if (!fullName) return "—";
  return fullName.split(/ BIN | BINTI /i)[0];
}

function fmtDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-MY", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
}

function statusBadge(status: string) {
  switch (status) {
    case "Active":    return <Badge className="bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-500/30 font-bold text-[10px] whitespace-nowrap">🟣 Active</Badge>;
    case "Upcoming":  return <Badge className="bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 font-bold text-[10px] whitespace-nowrap">🟡 Upcoming</Badge>;
    case "Completed": return <Badge className="bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 font-bold text-[10px] whitespace-nowrap">🔵 Completed</Badge>;
    case "Cancelled": return <Badge className="bg-gray-100 dark:bg-gray-500/20 text-foreground dark:text-gray-300 border border-gray-200 dark:border-slate-800 dark:border-gray-500/30 font-bold text-[10px] whitespace-nowrap">⬜ Cancelled</Badge>;
    default:          return <Badge variant="outline" className="whitespace-nowrap">{status}</Badge>;
  }
}

function calcTotalDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(0, diff);
}

type Employee = {
  user_id: string;
  full_name: string;
  branch: string;
  department: string;
  position?: string;
};

type Assignment = {
  id: number;
  user_id: string;
  full_name: string;
  branch: string;
  department: string;
  destination: string;
  client_company?: string;
  purpose?: string;
  project?: string;
  meeting_title?: string;
  start_date: string;
  end_date: string;
  total_days?: number;
  status: string;
  assigned_by?: string;
  assigned_by_name?: string;
};

const emptyForm = {
  destination: "",
  client_company: "",
  purpose: "",
  project: "",
  meeting_title: "",
  start_date: "",
  end_date: "",
  start_time: "",
  end_time: "",
};

export default function OutstationAssignment() {
  const { role, userBranch, userDepartment, userId, userName, loading: roleLoading } = useRole();
  const navigate = useNavigate();
  const location = useLocation();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewFormAssignment, setViewFormAssignment] = useState<any>(null);
  const [editTarget, setEditTarget] = useState<Assignment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Multi-select employees
  const [selectedEmps, setSelectedEmps] = useState<Employee[]>([]);
  const [empSearch, setEmpSearch] = useState("");

  // Form state
  const [form, setForm] = useState(emptyForm);

  // Filters
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterSearch, setFilterSearch] = useState("");
  const currentDate = new Date();
  const [searchParams] = useSearchParams();
  const initialMonth = searchParams.get('month');
  const initialYear = searchParams.get('year');
  const [filterMonthYear, setFilterMonthYear] = useState(
    initialMonth && initialYear ? `${initialYear}-${initialMonth}` : `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`
  );

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const tableRef = useRef<HTMLTableElement>(null);

  useEffect(() => {
    if (!roleLoading && !OUTSTATION_ROLES.includes(role)) navigate("/");
  }, [role, roleLoading, navigate]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const scopeParams = new URLSearchParams({ role, branch: userBranch || "", department: userDepartment || "" });
      const [assRes, empRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/outstation?${scopeParams}`),
        fetch(`${API_BASE_URL}/api/employees?role=${encodeURIComponent(role)}&branch=${encodeURIComponent(userBranch || "")}&department=${encodeURIComponent(userDepartment || "")}`),
      ]);
      const [assData, empData] = await Promise.all([assRes.json(), empRes.json()]);
      if (assData.success) setAssignments(assData.data || assData.assignments || []);
      if (empData.success) setEmployees(empData.data || empData.employees || []);
    } catch (err) {
      console.error("OutstationAssignment fetch error:", err);
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, [role, userBranch, userDepartment]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Filtered employee list for multi-select dropdown
  const filteredEmps = useMemo(() => {
    const q = empSearch.toLowerCase();
    return employees.filter(e =>
      (e.full_name || "").toLowerCase().includes(q) ||
      (e.branch || "").toLowerCase().includes(q) ||
      (e.department || "").toLowerCase().includes(q)
    ).slice(0, 30);
  }, [employees, empSearch]);

  // Filtered assignments
  const filtered = useMemo(() => {
    return assignments.filter(a => {
      // Month & Year logic
      if (a.start_date && filterMonthYear) {
        const [fYear, fMonth] = filterMonthYear.split('-');
        const d = new Date(a.start_date);
        if (fMonth === 'all') {
          if (d.getFullYear().toString() !== fYear) return false;
        } else {
          if (d.getFullYear().toString() !== fYear || (d.getMonth() + 1).toString().padStart(2, '0') !== fMonth) {
            return false;
          }
        }
      }

      if (filterStatus !== "All" && a.status !== filterStatus) return false;
      if (filterSearch) {
        const q = filterSearch.toLowerCase();
        if (!(a.full_name || "").toLowerCase().includes(q) && !(a.destination || "").toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [assignments, filterStatus, filterSearch, filterMonthYear]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / entriesPerPage) || 1;
  const indexOfLastItem = currentPage * entriesPerPage;
  const indexOfFirstItem = indexOfLastItem - entriesPerPage;
  const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, filterSearch, filterMonthYear, entriesPerPage]);

  const openNew = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setSelectedEmps([]);
    setEmpSearch("");
    setDrawerOpen(true);
  };

  useEffect(() => {
    if (location.state?.openNew) {
      // Clear state to avoid reopening on refresh
      navigate(location.pathname, { replace: true, state: {} });
      // Slight delay to ensure the UI is ready
      setTimeout(() => openNew(), 50);
    }
  }, [location.state, location.pathname, navigate]);

  const openEdit = (a: Assignment) => {
    setEditTarget(a);
    setForm({
      destination: a.destination || "",
      client_company: a.client_company || "",
      purpose: a.purpose || "",
      project: a.project || "",
      meeting_title: a.meeting_title || "",
      start_date: a.start_date?.slice(0, 10) || "",
      end_date: a.end_date?.slice(0, 10) || "",
      start_time: "",
      end_time: "",
    });
    setSelectedEmps([]);
    setDrawerOpen(true);
  };

  const toggleEmp = (emp: Employee) => {
    setSelectedEmps(prev => {
      const exists = prev.find(e => e.user_id === emp.user_id);
      if (exists) return prev.filter(e => e.user_id !== emp.user_id);
      return [...prev, emp];
    });
  };

  const handleSubmit = async () => {
    if (!editTarget && selectedEmps.length === 0) { toast.error("Select at least one employee"); return; }
    if (!form.destination) { toast.error("Destination is required"); return; }
    if (!form.start_date || !form.end_date) { toast.error("Start and end dates are required"); return; }

    setSubmitting(true);
    try {
      if (editTarget) {
        const res = await fetch(`${API_BASE_URL}/api/outstation/${editTarget.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, total_days: calcTotalDays(form.start_date, form.end_date) }),
        });
        const data = await res.json();
        if (data.success) { toast.success("Assignment updated!"); } else { toast.error(data.error || "Update failed"); }
      } else {
        const res = await fetch(`${API_BASE_URL}/api/outstation`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_ids: selectedEmps.map(e => ({ user_id: e.user_id, full_name: e.full_name, branch: e.branch, department: e.department, position: e.position })),
            ...form,
            total_days: calcTotalDays(form.start_date, form.end_date),
            assigned_by: userId,
            assigned_by_name: userName,
            assigned_by_role: role,
          }),
        });
        const data = await res.json();
        if (data.success) {
          toast.success(data.message || `${selectedEmps.length} outstation assignment(s) created!`);
        } else {
          toast.error(data.error || "Failed to create");
        }
      }
      setDrawerOpen(false);
      void fetchData();
    } catch (err) {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm("Cancel this outstation assignment?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/outstation/${id}/cancel`, { method: "PUT" });
      const data = await res.json();
      if (data.success) { toast.success("Assignment cancelled"); void fetchData(); }
      else toast.error(data.error || "Failed to cancel");
    } catch { toast.error("Network error"); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/outstation/${deleteTarget}?userId=${encodeURIComponent(userId || "")}`, { 
        method: "DELETE" 
      });
      const data = await res.json();
      if (data.success) { 
        toast.success("Assignment deleted"); 
        setDeleteDialogOpen(false);
        setDeleteTarget(null);
        void fetchData(); 
      } else { 
        toast.error(data.message || data.error || "Failed to delete"); 
      }
    } catch { 
      toast.error("Network error"); 
    } finally {
      setDeleting(false);
    }
  };

  if (roleLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin w-7 h-7 text-pink-500" /></div>;

  const totalDays = calcTotalDays(form.start_date, form.end_date);

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-8">

      {/* Filter Bar and Back Button */}
      <PageActions>
        <div className="flex w-full items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 px-0 text-foreground hover:bg-transparent hover:text-[#942392] transition-colors touch-target"
            onClick={() => navigate("/outstation")}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">
              Back to Outstation Dashboard
            </span>
          </Button>
          
          <Button 
            className="h-10 px-5 text-[14px] font-semibold text-white shadow-sm bg-[#942392] hover:bg-[#3b0764] w-full sm:w-auto shrink-0" 
            onClick={openNew}
          >
            <Plane className="w-4 h-4 mr-2" /> New Assignment
          </Button>
        </div>
      </PageActions>

      {/* Table */}
      <Card className="border border-slate-100 dark:border-slate-700 bg-white dark:bg-card shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] rounded-[24px] overflow-hidden">
        <CardHeader className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-slate-800">
          <CardTitle className="text-sm font-black uppercase tracking-wide flex items-center gap-2">
            <Plane className="w-4 h-4 text-pink-500" />
            Outstation Assignments
          </CardTitle>
          <div className="flex items-center gap-3 flex-wrap">
          
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-foreground" />
              <span className="text-[11px] font-black uppercase tracking-widest text-foreground dark:text-foreground">Filters</span>
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search employee, destination…"
                value={filterSearch}
                onChange={e => setFilterSearch(e.target.value)}
                className="pl-8 h-8 text-xs w-40 sm:w-48 placeholder:text-muted-foreground dark:placeholder:text-slate-400 font-medium"
              />
            </div>
            
            {/* Month/Year Filter */}
            <MonthPicker
              monthYear={filterMonthYear}
              onSelectMonthYear={(val) => {
                if (val) {
                  setFilterMonthYear(val);
                } else {
                  setFilterMonthYear(`${currentDate.getFullYear()}-all`);
                }
              }}
              className="appearance-none flex items-center justify-between px-3 py-1.5 h-8 bg-gray-50 dark:bg-card border border-gray-200 dark:border-slate-800 text-foreground dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 text-[11px] font-bold rounded shadow-sm outline-none cursor-pointer uppercase tracking-widest gap-2"
            />

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none" disabled>Select Status</SelectItem>
                {["All", "Active", "Upcoming", "Completed", "Cancelled"].map(s => (
                  <SelectItem key={s} value={s}>{s === "All" ? "All Status" : s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(filterStatus !== "All" || filterSearch || !filterMonthYear) && (
              <Badge className="cursor-pointer bg-gray-100 dark:bg-gray-500/20 text-foreground dark:text-gray-300 text-[10px] border border-gray-200 dark:border-slate-800 dark:border-gray-500/30 hover:bg-gray-200"
                onClick={() => { setFilterStatus("All"); setFilterSearch(""); setFilterMonthYear(`${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`); }}>
                Clear ×
              </Badge>
            )}
            <span className="text-[10px] text-foreground font-bold">{filtered.length} records</span>
          
        </div>
      </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="h-48 flex items-center justify-center"><Loader2 className="animate-spin w-7 h-7 text-pink-400" /></div>
          ) : filtered.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center gap-2 text-muted-foreground dark:text-slate-400">
              <Plane className="w-10 h-10 opacity-20" />
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground dark:text-slate-400">No assignments found</p>
            </div>
          ) : (
            <div className="rounded-md border border-gray-200 dark:border-slate-800 dark:border-gray-500/30/60 bg-white dark:bg-card [&_.overflow-auto::-webkit-scrollbar]:hidden [&_.overflow-auto]:[-ms-overflow-style:none] [&_.overflow-auto]:[scrollbar-width:none]">
              <Table ref={tableRef}>
                <TableHeader>
                  <TableRow className="bg-slate-50/60 hover:bg-slate-50/60">
                    <TableHead className="text-black text-[10px] px-2.5">Employee</TableHead>
                    <TableHead className="text-black text-[10px] px-2.5">Department</TableHead>
                    <TableHead className="text-black text-[10px] px-2.5">Branch</TableHead>
                    <TableHead className="text-black text-[10px] px-2.5">Destination</TableHead>
                    <TableHead className="text-black text-[10px] px-2.5">Start</TableHead>
                    <TableHead className="text-black text-[10px] px-2.5">End</TableHead>
                    <TableHead className="text-center text-black text-[10px] px-2.5">Days</TableHead>
                    <TableHead className="text-black text-[10px] px-2.5">Assigned By</TableHead>
                    <TableHead className="text-black text-[10px] px-2.5">Status</TableHead>
                    <TableHead className="text-black text-[10px] px-2.5">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentItems.map(a => (
                    <TableRow key={a.id} className="hover:bg-pink-50/20 transition-colors cursor-pointer" onClick={() => setViewFormAssignment(a)}>
                      <TableCell className="py-3 px-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-200 to-pink-400 flex items-center justify-center text-[9px] font-black text-pink-800 shrink-0">
                            {(a.full_name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-semibold text-foreground dark:text-gray-100 text-[12px] truncate max-w-[150px]" title={a.full_name}>{formatName(a.full_name)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground dark:text-gray-300 text-[12px] px-2.5">{a.department || "—"}</TableCell>
                      <TableCell className="text-foreground dark:text-gray-300 text-[12px] px-2.5">{a.branch || "—"}</TableCell>
                      <TableCell className="px-2.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1 font-semibold text-foreground dark:text-gray-100 text-[12px]">
                          <MapPin className="w-3 h-3 text-pink-400 shrink-0" />{a.destination}
                        </div>
                        {a.client_company && <div className="text-[10px] text-foreground ml-4">{a.client_company}</div>}
                      </TableCell>
                      <TableCell className="text-foreground dark:text-foreground whitespace-nowrap text-[12px] px-2.5">{fmtDate(a.start_date)}</TableCell>
                      <TableCell className="text-foreground dark:text-foreground whitespace-nowrap text-[12px] px-2.5">{fmtDate(a.end_date)}</TableCell>
                      <TableCell className="text-center font-black text-pink-600 text-[12px] px-2.5">{a.total_days != null ? Number(a.total_days) : "—"}</TableCell>
                      <TableCell className="text-foreground dark:text-foreground text-[12px] font-medium px-2.5" title={a.assigned_by_name}>{formatName(a.assigned_by_name || "")}</TableCell>
                      <TableCell className="px-2.5" onClick={(e) => e.stopPropagation()}>{statusBadge(a.status)}</TableCell>
                      <TableCell className="px-2.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(a)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>
                          {a.status !== "Cancelled" && a.status !== "Completed" && (
                            <button onClick={() => handleCancel(a.id)} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-500 transition-colors" title="Cancel"><XCircle className="w-3.5 h-3.5" /></button>
                          )}
                          {String(a.assigned_by) === String(userId) ? (
                            <button 
                              onClick={() => {
                                setDeleteTarget(a.id);
                                setDeleteDialogOpen(true);
                              }} 
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors" 
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button 
                              disabled 
                              className="p-1.5 rounded-lg text-gray-300 dark:text-foreground cursor-not-allowed" 
                              title="Only the user who created this assignment can delete it."
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          
          {/* Pagination Controls */}
          {!loading && filtered.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-gray-100 dark:border-slate-800 gap-4 bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="flex items-center gap-4 text-[10px] font-bold text-foreground uppercase tracking-widest">
                    <span>
                      TOTAL SHOWING {indexOfFirstItem + 1} TO {Math.min(indexOfLastItem, filtered.length)} OF {filtered.length} ENTRIES
                    </span>
                <div className="flex items-center gap-2">
                  <span>Show</span>
                  <Select 
                    value={entriesPerPage.toString()} 
                    onValueChange={(val) => { setEntriesPerPage(Number(val)); setCurrentPage(1); }}
                  >
                    <SelectTrigger className="h-7 text-[10px] font-bold rounded border-gray-200 dark:border-slate-700 w-[60px]">
                      <SelectValue placeholder={entriesPerPage.toString()}>{entriesPerPage}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
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
                  className="h-7 px-2 text-[10px] font-bold rounded"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <div className="flex items-center gap-1 overflow-x-auto max-w-[150px] sm:max-w-none scrollbar-hide">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`h-7 w-7 p-0 text-[10px] font-bold rounded ${currentPage === pageNum ? 'bg-pink-500 text-white border-pink-500 hover:bg-pink-600' : 'text-foreground'}`}
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
                  className="h-7 px-2 text-[10px] font-bold rounded"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assignment Drawer / Dialog */}
      <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-black uppercase tracking-wide">
              <Plane className="w-4 h-4" style={{ color: PINK }} />
              {editTarget ? "Edit Outstation Assignment" : "New Outstation Assignment"}
            </DialogTitle>
            <DialogDescription className="text-[11px]">
              {editTarget ? "Update trip details below." : "Assign one or more employees to an outstation trip."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 pt-2">

            {/* Employee Multi-Select (only for new) */}
            {!editTarget && (
              <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase tracking-widest text-foreground dark:text-foreground flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Select Employees <span className="text-red-500">*</span>
                </Label>

                {/* Selected tags */}
                {selectedEmps.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-2 bg-pink-50 rounded-lg border border-pink-100">
                    {selectedEmps.map(e => (
                      <span key={e.user_id} className="inline-flex items-center gap-1 bg-white dark:bg-card border border-pink-200 dark:border-pink-500/30 text-pink-700 dark:text-pink-300 text-[10px] font-bold px-2 py-1 rounded-md">
                        {e.full_name}
                        <button onClick={() => toggleEmp(e)} className="hover:text-red-500 transition-colors"><X className="w-2.5 h-2.5" /></button>
                      </span>
                    ))}
                    <span className="text-[10px] text-pink-400 font-bold self-center ml-1">{selectedEmps.length} selected</span>
                  </div>
                )}

                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <Input placeholder="Search employees…" value={empSearch} onChange={e => setEmpSearch(e.target.value)} className="pl-8 h-8 text-xs" />
                </div>

                {/* Employee List */}
                <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-slate-800 dark:border-gray-500/30 rounded-lg divide-y divide-gray-50">
                  {filteredEmps.length === 0 ? (
                    <div className="py-4 text-center text-[10px] text-foreground font-bold uppercase">No employees found</div>
                  ) : (
                    filteredEmps.map(e => {
                      const isSelected = !!selectedEmps.find(s => s.user_id === e.user_id);
                      return (
                        <div key={e.user_id}
                          onClick={() => toggleEmp(e)}
                          className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors ${isSelected ? "bg-pink-50" : "hover:bg-gray-50 dark:bg-slate-900/50"}`}>
                          <div className="flex items-center gap-2.5">
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? "bg-pink-500 border-pink-500" : "border-gray-300"}`}>
                              {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                            </div>
                            <div>
                              <p className="text-[11px] font-bold text-foreground dark:text-gray-100">{e.full_name}</p>
                              <p className="text-[9px] text-foreground">{e.department} · {e.branch}</p>
                            </div>
                          </div>
                          {isSelected && <Badge className="bg-pink-100 dark:bg-pink-500/20 text-pink-600 border border-pink-200 dark:border-pink-500/30 text-[9px] font-bold">Selected</Badge>}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Trip Info */}
            <div className="space-y-3">
              <Label className="text-[11px] font-black uppercase tracking-widest text-foreground dark:text-foreground flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Trip Information
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] font-bold text-foreground dark:text-gray-300 mb-1 block">Destination <span className="text-red-500">*</span></Label>
                  <Input value={form.destination} onChange={e => setForm(f => ({ ...f, destination: e.target.value }))} placeholder="e.g. Johor Bahru" className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px] font-bold text-foreground dark:text-gray-300 mb-1 block">Client / Company</Label>
                  <Input value={form.client_company} onChange={e => setForm(f => ({ ...f, client_company: e.target.value }))} placeholder="e.g. ABC Sdn Bhd" className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px] font-bold text-foreground dark:text-gray-300 mb-1 block">Event Name</Label>
                  <Input value={form.project} onChange={e => setForm(f => ({ ...f, project: e.target.value }))} placeholder="Event name" className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px] font-bold text-foreground dark:text-gray-300 mb-1 block">Meeting Title</Label>
                  <Input value={form.meeting_title} onChange={e => setForm(f => ({ ...f, meeting_title: e.target.value }))} placeholder="Meeting / event title" className="h-8 text-xs" />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-[10px] font-bold text-foreground dark:text-gray-300 mb-1 block">Purpose</Label>
                  <textarea
                    value={form.purpose}
                    onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
                    placeholder="Purpose of travel…"
                    rows={2}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-3">
              <Label className="text-[11px] font-black uppercase tracking-widest text-foreground dark:text-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Duration
              </Label>
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <label className="w-16 text-xs font-bold text-foreground uppercase tracking-wider hidden sm:block">Starts</label>
                  <label className="text-[10px] font-bold text-foreground block sm:hidden">STARTS</label>
                  <div className="flex-1 flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="date"
                        required
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-[13px] sm:text-sm text-foreground focus:outline-none focus:border-[#FFFE00] focus:ring-1 focus:ring-[#FFFE00] transition-all h-[38px]"
                        value={form.start_date}
                        onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                      />
                    </div>
                    <div className="relative flex-1">
                      <input
                        type="time"
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-[13px] sm:text-sm text-foreground focus:outline-none focus:border-[#FFFE00] focus:ring-1 focus:ring-[#FFFE00] transition-all h-[38px]"
                        value={form.start_time}
                        onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <label className="w-16 text-xs font-bold text-foreground uppercase tracking-wider hidden sm:block">Ends</label>
                  <label className="text-[10px] font-bold text-foreground block sm:hidden">ENDS</label>
                  <div className="flex-1 flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="date"
                        required
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-[13px] sm:text-sm text-foreground focus:outline-none focus:border-[#FFFE00] focus:ring-1 focus:ring-[#FFFE00] transition-all h-[38px]"
                        value={form.end_date}
                        onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                      />
                    </div>
                    <div className="relative flex-1">
                      <input
                        type="time"
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-[13px] sm:text-sm text-foreground focus:outline-none focus:border-[#FFFE00] focus:ring-1 focus:ring-[#FFFE00] transition-all h-[38px]"
                        value={form.end_time}
                        onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              </div>
              {form.start_date && form.end_date && (
                <div className="flex items-center gap-2 bg-pink-50 border border-pink-100 rounded-lg px-3 py-2">
                  <Calendar className="w-3.5 h-3.5 text-pink-500" />
                  <span className="text-[11px] font-black text-pink-700 dark:text-pink-300">Total Duration: {totalDays} day{totalDays !== 1 ? "s" : ""}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100 dark:border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setDrawerOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSubmit} disabled={submitting} style={{ background: PINK }} className="text-white gap-1.5">
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plane className="w-3.5 h-3.5" />}
                {editTarget ? "Save Changes" : `Assign${selectedEmps.length > 1 ? ` (${selectedEmps.length})` : ""}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-black uppercase tracking-wide">
              Delete Outstation Assignment
            </DialogTitle>
            <DialogDescription className="text-[12px] text-foreground mt-2">
              Are you sure you want to delete this outstation assignment?
              This action will permanently remove the assignment and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800 mt-4">
            <Button variant="outline" size="sm" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={confirmDelete} 
              disabled={deleting}
              className="gap-1.5"
            >
              {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Delete Assignment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Form Dialog */}
      <Dialog open={!!viewFormAssignment} onOpenChange={() => setViewFormAssignment(null)}>
        <DialogContent className="max-w-lg w-[95vw] sm:w-full rounded-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
          {viewFormAssignment && (
            <>
              {/* Header (Fixed) */}
              <div className="bg-[#942392] px-6 py-5 text-white shrink-0">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-white/20 shrink-0">
                    <Plane className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/70 mb-1">Outstation Assignment</p>
                    <DialogTitle className="text-lg font-black text-white leading-tight">
                      {viewFormAssignment.project || viewFormAssignment.purpose || "Outstation Trip"}
                    </DialogTitle>
                    <p className="text-[11px] text-white/80 mt-1">The outstation details below.</p>
                  </div>
                </div>
              </div>

              {/* Body (Scrollable) */}
              <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
                {/* Trip Information */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-black dark:text-white mb-3 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> Trip Information
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 bg-gray-50 dark:bg-slate-900/50 rounded-xl p-3 border border-gray-100 dark:border-slate-800">
                      <p className="text-[10px] text-black dark:text-white font-bold uppercase">Destination</p>
                      <p className="text-sm font-black text-foreground dark:text-gray-100 mt-0.5">{viewFormAssignment.destination}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-3 border border-gray-100 dark:border-slate-800">
                      <p className="text-[10px] text-black dark:text-white font-bold uppercase">Event Name</p>
                      <p className="text-sm font-black text-foreground dark:text-gray-100 mt-0.5">{viewFormAssignment.project || viewFormAssignment.purpose || "Outstation Trip"}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-3 border border-gray-100 dark:border-slate-800">
                      <p className="text-[10px] text-black dark:text-white font-bold uppercase">Status</p>
                      <div className="mt-1">{statusBadge(viewFormAssignment.status)}</div>
                    </div>
                  </div>
                </div>

                {/* Duration */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-black dark:text-white mb-3 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> Duration
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-3 border border-gray-100 dark:border-slate-800">
                      <p className="text-[10px] text-black dark:text-white font-bold uppercase">Start Date</p>
                      <p className="text-sm font-black text-foreground dark:text-gray-100 mt-0.5">{fmtDate(viewFormAssignment.start_date)}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-3 border border-gray-100 dark:border-slate-800">
                      <p className="text-[10px] text-black dark:text-white font-bold uppercase">End Date</p>
                      <p className="text-sm font-black text-foreground dark:text-gray-100 mt-0.5">{fmtDate(viewFormAssignment.end_date)}</p>
                    </div>
                    <div className="bg-[#942392]/5 rounded-xl p-3 border border-[#942392]/20">
                      <p className="text-[10px] text-[#942392] font-bold uppercase">Total Days</p>
                      <p className="text-lg font-black text-[#942392] mt-0.5">{viewFormAssignment.total_days || 0} {viewFormAssignment.total_days === 1 ? 'Day' : 'Days'}</p>
                    </div>
                  </div>
                </div>

                {/* Employees Assigned */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-black dark:text-white mb-3 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> Employee Assigned
                  </p>
                  <div className="space-y-2">
                      <div className="flex items-center gap-3 bg-gray-50 dark:bg-slate-900/50 rounded-xl p-3 border border-gray-100 dark:border-slate-800">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#942392]/20 to-pink-200 flex items-center justify-center text-[10px] font-black text-[#942392] shrink-0">
                          {(viewFormAssignment.full_name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-bold text-foreground dark:text-gray-100 truncate">{viewFormAssignment.full_name}</p>
                          <p className="text-[10px] text-foreground">{viewFormAssignment.department || "—"} · {viewFormAssignment.branch || "—"}</p>
                        </div>
                        {statusBadge(viewFormAssignment.status)}
                      </div>
                  </div>
                </div>
              </div>

              {/* Footer (Fixed) */}
              <div className="px-6 pb-5 flex justify-end gap-2">
                <Button variant="outline" onClick={() => {
                  if (!viewFormAssignment) return;
                  const printWindow = window.open("", "_blank");
                  if (!printWindow) return;
                  const html = `
                    <html>
                      <head>
                        <title>Outstation Assignment - ${viewFormAssignment.project || viewFormAssignment.purpose || "Trip"}</title>
                        <style>
                          body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
                          h1 { color: #942392; font-size: 24px; margin-bottom: 5px; }
                          h2 { font-size: 16px; margin-top: 30px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
                          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
                          .info-box { background: #f9f9f9; padding: 15px; border-radius: 8px; border: 1px solid #eee; }
                          .label { font-size: 10px; color: #666; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; }
                          .value { font-size: 14px; font-weight: bold; }
                          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #eee; font-size: 12px; }
                          th { font-weight: bold; color: #666; text-transform: uppercase; font-size: 10px; }
                        </style>
                      </head>
                      <body>
                        <h1>${viewFormAssignment.project || viewFormAssignment.purpose || "Outstation Trip"}</h1>
                        <p style="color: #666; margin-top: 0;">Outstation Assignment Details</p>
                        
                        <h2>Trip Information</h2>
                        <div class="info-grid">
                          <div class="info-box" style="grid-column: span 2;">
                            <div class="label">Destination</div>
                            <div class="value">${viewFormAssignment.destination}</div>
                          </div>
                          <div class="info-box">
                            <div class="label">Status</div>
                            <div class="value">${viewFormAssignment.status}</div>
                          </div>
                          <div class="info-box">
                            <div class="label">Total Days</div>
                            <div class="value">${viewFormAssignment.total_days || 0} Days (${fmtDate(viewFormAssignment.start_date)} - ${fmtDate(viewFormAssignment.end_date)})</div>
                          </div>
                        </div>

                        <h2>Employee Assigned</h2>
                        <table>
                          <tr>
                            <th>Name</th>
                            <th>Department</th>
                            <th>Branch</th>
                            <th>Status</th>
                          </tr>
                          <tr>
                            <td style="font-weight: bold;">${viewFormAssignment.full_name}</td>
                            <td>${viewFormAssignment.department || '-'}</td>
                            <td>${viewFormAssignment.branch || '-'}</td>
                            <td>${viewFormAssignment.status}</td>
                          </tr>
                        </table>
                        
                        <div style="margin-top: 40px; font-size: 10px; color: #999; text-align: center;">
                          Generated from Rayhar Employee Portal
                        </div>
                      </body>
                    </html>
                  `;
                  printWindow.document.write(html);
                  printWindow.document.close();
                  setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
                }} className="rounded-xl font-black text-[11px] border-purple-200 text-purple-700 hover:bg-purple-50">
                  Export to PDF
                </Button>
                <Button variant="outline" onClick={() => setViewFormAssignment(null)} className="rounded-xl font-black text-[11px]">
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <TableScrollTopButton entriesPerPage={entriesPerPage} tableRef={tableRef} />
    </div>
  );
}




