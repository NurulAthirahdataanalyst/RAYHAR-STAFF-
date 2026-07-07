import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  Plane, Plus, Filter, Loader2, MapPin, Edit2, XCircle, Trash2,
  Users, Search, Calendar, CheckCircle2, X,
} from "lucide-react";
import { API_BASE_URL } from "../../config/api";

const OUTSTATION_ROLES = ["hr_admin", "managing_director", "finance_manager", "branch_leader", "head_of_department"];
const PINK = "#EC4899";

const BRANCHES = ["HQ","KMM","TGG","CNH","KBG","DGN","JTH","KBR","RMP","MZM","TWU","AOR","BTM","KKS","SHA","BBB","KUL","IPH","MJG","MLK","SNS","JB","BTP"];

function formatName(fullName: string) {
  if (!fullName) return "—";
  return fullName.split(/ BIN | BINTI /i)[0];
}

function fmtDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-MY", { day: "2-digit", month: "short", year: "numeric" });
}

function statusBadge(status: string) {
  switch (status) {
    case "Active":    return <Badge className="bg-pink-100 text-pink-700 border border-pink-200 font-bold text-[10px] whitespace-nowrap">🟣 Active</Badge>;
    case "Upcoming":  return <Badge className="bg-amber-100 text-amber-700 border border-amber-200 font-bold text-[10px] whitespace-nowrap">🟡 Upcoming</Badge>;
    case "Completed": return <Badge className="bg-blue-100 text-blue-700 border border-blue-200 font-bold text-[10px] whitespace-nowrap">🔵 Completed</Badge>;
    case "Cancelled": return <Badge className="bg-gray-100 text-gray-600 border border-gray-200 font-bold text-[10px] whitespace-nowrap">⬜ Cancelled</Badge>;
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
  const [editTarget, setEditTarget] = useState<Assignment | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Multi-select employees
  const [selectedEmps, setSelectedEmps] = useState<Employee[]>([]);
  const [empSearch, setEmpSearch] = useState("");

  // Form state
  const [form, setForm] = useState(emptyForm);

  // Filters
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterSearch, setFilterSearch] = useState("");

  useEffect(() => {
    if (!roleLoading && !OUTSTATION_ROLES.includes(role)) navigate("/");
  }, [role, roleLoading, navigate]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const scopeParams = new URLSearchParams({ role, branch: userBranch || "", department: userDepartment || "" });
      const [assRes, empRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/outstation?${scopeParams}`),
        fetch(`${API_BASE_URL}/api/employees?role=${role}&branch=${userBranch || ""}&department=${userDepartment || ""}`),
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
      if (filterStatus !== "All" && a.status !== filterStatus) return false;
      if (filterSearch) {
        const q = filterSearch.toLowerCase();
        if (!a.full_name?.toLowerCase().includes(q) && !a.destination?.toLowerCase().includes(q) && !a.department?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [assignments, filterStatus, filterSearch]);

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

  const handleDelete = async (id: number) => {
    if (!confirm("Permanently delete this outstation assignment?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/outstation/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) { toast.success("Assignment deleted"); void fetchData(); }
      else toast.error(data.error || "Failed to delete");
    } catch { toast.error("Network error"); }
  };

  if (roleLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin w-7 h-7 text-pink-500" /></div>;

  const totalDays = calcTotalDays(form.start_date, form.end_date);

  return (
    <div className="space-y-5 animate-in fade-in duration-500 max-w-7xl mx-auto px-4 pt-2 pb-8">

      {/* Filter Bar */}
      <Card className="border border-gray-200/80 shadow-sm">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-[11px] font-black uppercase tracking-widest text-gray-500">Filters</span>
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search employee, destination…"
                value={filterSearch}
                onChange={e => setFilterSearch(e.target.value)}
                className="pl-8 h-8 text-xs w-48 sm:w-56"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none" disabled>Select Status</SelectItem>
                {["All", "Active", "Upcoming", "Completed", "Cancelled"].map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(filterStatus !== "All" || filterSearch) && (
              <Badge className="cursor-pointer bg-gray-100 text-gray-600 text-[10px] border border-gray-200 hover:bg-gray-200"
                onClick={() => { setFilterStatus("All"); setFilterSearch(""); }}>
                Clear ×
              </Badge>
            )}
            <span className="text-[10px] text-gray-400 font-bold">{filtered.length} records</span>
          </div>
          <Button size="sm" className="h-8 text-xs gap-1.5 shrink-0" style={{ background: PINK }} onClick={openNew}>
            <Plus className="w-3.5 h-3.5" /> New Assignment
          </Button>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border border-gray-200/80 shadow-sm overflow-hidden">
        <CardHeader className="pb-0 border-b border-gray-100">
          <CardTitle className="text-sm font-black uppercase tracking-wide flex items-center gap-2">
            <Plane className="w-4 h-4 text-pink-500" />
            Outstation Assignments
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="h-48 flex items-center justify-center"><Loader2 className="animate-spin w-7 h-7 text-pink-400" /></div>
          ) : filtered.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Plane className="w-10 h-10 opacity-20" />
              <p className="text-[10px] font-black uppercase tracking-widest">No assignments found</p>
            </div>
          ) : (
            <div className="rounded-md border border-gray-200/60 bg-white">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/60 hover:bg-slate-50/60">
                    <TableHead className="font-medium text-black uppercase tracking-widest whitespace-nowrap text-[10px]">Employee</TableHead>
                    <TableHead className="font-medium text-black uppercase tracking-widest whitespace-nowrap text-[10px]">Department</TableHead>
                    <TableHead className="font-medium text-black uppercase tracking-widest whitespace-nowrap text-[10px]">Branch</TableHead>
                    <TableHead className="font-medium text-black uppercase tracking-widest whitespace-nowrap text-[10px]">Destination</TableHead>
                    <TableHead className="font-medium text-black uppercase tracking-widest whitespace-nowrap text-[10px]">Start</TableHead>
                    <TableHead className="font-medium text-black uppercase tracking-widest whitespace-nowrap text-[10px]">End</TableHead>
                    <TableHead className="text-center font-medium text-black uppercase tracking-widest whitespace-nowrap text-[10px]">Days</TableHead>
                    <TableHead className="font-medium text-black uppercase tracking-widest whitespace-nowrap text-[10px]">Assigned By</TableHead>
                    <TableHead className="font-medium text-black uppercase tracking-widest whitespace-nowrap text-[10px]">Status</TableHead>
                    <TableHead className="font-medium text-black uppercase tracking-widest whitespace-nowrap text-[10px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(a => (
                    <TableRow key={a.id} className="hover:bg-pink-50/20 transition-colors">
                      <TableCell className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-200 to-pink-400 flex items-center justify-center text-[9px] font-black text-pink-800 shrink-0">
                            {(a.full_name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-semibold text-gray-800 text-[12px] truncate max-w-[120px]" title={a.full_name}>{formatName(a.full_name)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600 text-[12px]">{a.department || "—"}</TableCell>
                      <TableCell className="text-gray-600 text-[12px]">{a.branch || "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 font-semibold text-gray-800 text-[12px]">
                          <MapPin className="w-3 h-3 text-pink-400 shrink-0" />{a.destination}
                        </div>
                        {a.client_company && <div className="text-[10px] text-gray-400 ml-4">{a.client_company}</div>}
                      </TableCell>
                      <TableCell className="text-gray-500 whitespace-nowrap text-[12px]">{fmtDate(a.start_date)}</TableCell>
                      <TableCell className="text-gray-500 whitespace-nowrap text-[12px]">{fmtDate(a.end_date)}</TableCell>
                      <TableCell className="text-center font-black text-pink-600 text-[12px]">{a.total_days != null ? Number(a.total_days) : "—"}</TableCell>
                      <TableCell className="text-gray-500 text-[12px] font-medium" title={a.assigned_by_name}>{formatName(a.assigned_by_name || "")}</TableCell>
                      <TableCell>{statusBadge(a.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(a)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>
                          {a.status !== "Cancelled" && a.status !== "Completed" && (
                            <button onClick={() => handleCancel(a.id)} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-500 transition-colors" title="Cancel"><XCircle className="w-3.5 h-3.5" /></button>
                          )}
                          <button onClick={() => handleDelete(a.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
                <Label className="text-[11px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Select Employees <span className="text-red-500">*</span>
                </Label>

                {/* Selected tags */}
                {selectedEmps.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-2 bg-pink-50 rounded-lg border border-pink-100">
                    {selectedEmps.map(e => (
                      <span key={e.user_id} className="inline-flex items-center gap-1 bg-white border border-pink-200 text-pink-700 text-[10px] font-bold px-2 py-1 rounded-md">
                        {e.full_name}
                        <button onClick={() => toggleEmp(e)} className="hover:text-red-500 transition-colors"><X className="w-2.5 h-2.5" /></button>
                      </span>
                    ))}
                    <span className="text-[10px] text-pink-400 font-bold self-center ml-1">{selectedEmps.length} selected</span>
                  </div>
                )}

                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <Input placeholder="Search employees…" value={empSearch} onChange={e => setEmpSearch(e.target.value)} className="pl-8 h-8 text-xs" />
                </div>

                {/* Employee List */}
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-50">
                  {filteredEmps.length === 0 ? (
                    <div className="py-4 text-center text-[10px] text-gray-400 font-bold uppercase">No employees found</div>
                  ) : (
                    filteredEmps.map(e => {
                      const isSelected = !!selectedEmps.find(s => s.user_id === e.user_id);
                      return (
                        <div key={e.user_id}
                          onClick={() => toggleEmp(e)}
                          className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors ${isSelected ? "bg-pink-50" : "hover:bg-gray-50"}`}>
                          <div className="flex items-center gap-2.5">
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? "bg-pink-500 border-pink-500" : "border-gray-300"}`}>
                              {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                            </div>
                            <div>
                              <p className="text-[11px] font-bold text-gray-800">{e.full_name}</p>
                              <p className="text-[9px] text-gray-400">{e.department} · {e.branch}</p>
                            </div>
                          </div>
                          {isSelected && <Badge className="bg-pink-100 text-pink-600 border border-pink-200 text-[9px] font-bold">Selected</Badge>}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Trip Info */}
            <div className="space-y-3">
              <Label className="text-[11px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Trip Information
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] font-bold text-gray-600 mb-1 block">Destination <span className="text-red-500">*</span></Label>
                  <Input value={form.destination} onChange={e => setForm(f => ({ ...f, destination: e.target.value }))} placeholder="e.g. Johor Bahru" className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px] font-bold text-gray-600 mb-1 block">Client / Company</Label>
                  <Input value={form.client_company} onChange={e => setForm(f => ({ ...f, client_company: e.target.value }))} placeholder="e.g. ABC Sdn Bhd" className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px] font-bold text-gray-600 mb-1 block">Project</Label>
                  <Input value={form.project} onChange={e => setForm(f => ({ ...f, project: e.target.value }))} placeholder="Project name" className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px] font-bold text-gray-600 mb-1 block">Meeting Title</Label>
                  <Input value={form.meeting_title} onChange={e => setForm(f => ({ ...f, meeting_title: e.target.value }))} placeholder="Meeting / event title" className="h-8 text-xs" />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-[10px] font-bold text-gray-600 mb-1 block">Purpose</Label>
                  <textarea
                    value={form.purpose}
                    onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
                    placeholder="Purpose of travel…"
                    rows={2}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-3">
              <Label className="text-[11px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Duration
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <Label className="text-[10px] font-bold text-gray-600 mb-1 block">Start Date <span className="text-red-500">*</span></Label>
                  <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px] font-bold text-gray-600 mb-1 block">Start Time</Label>
                  <Input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px] font-bold text-gray-600 mb-1 block">End Date <span className="text-red-500">*</span></Label>
                  <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px] font-bold text-gray-600 mb-1 block">End Time</Label>
                  <Input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} className="h-8 text-xs" />
                </div>
              </div>
              {form.start_date && form.end_date && (
                <div className="flex items-center gap-2 bg-pink-50 border border-pink-100 rounded-lg px-3 py-2">
                  <Calendar className="w-3.5 h-3.5 text-pink-500" />
                  <span className="text-[11px] font-black text-pink-700">Total Duration: {totalDays} day{totalDays !== 1 ? "s" : ""}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
              <Button variant="outline" size="sm" onClick={() => setDrawerOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSubmit} disabled={submitting} style={{ background: PINK }} className="text-white gap-1.5">
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plane className="w-3.5 h-3.5" />}
                {editTarget ? "Save Changes" : `Assign${selectedEmps.length > 1 ? ` (${selectedEmps.length})` : ""}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
