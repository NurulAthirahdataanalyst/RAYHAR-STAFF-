import { useState, useEffect, useRef } from "react";
import {
  Award,
  BadgePlus,
  CalendarRange,
  ClipboardList,
  History,
  Layers3,
  ShieldAlert,
  Sparkles,
  RotateCcw,
  Users,
  Gift,
  CircleAlert,
  ArrowLeft,
  Search,
  Check,
  X,
  Plus,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useRole } from "@/contexts/RoleContext";
import { Navigate } from "react-router-dom";
import { API_BASE_URL } from "@/config/api";
import { toast, useToast } from "@/hooks/use-toast";
import { getEmployeeLeaveBalances, updateEmployeeLeaveBalance } from "@/lib/leaveStorage";

const modules = [
  {
    title: "Annual Leave Allocation",
    description: "Set each employee's base entitlement for the leave year according to role, policy, or grade.",
    icon: CalendarRange,
    tone: "bg-sky-500/10 text-sky-600",
  },
  {
    title: "Carry Forward Leave",
    description: "Move approved unused leave from the previous year into the current cycle based on carry-forward rules.",
    icon: RotateCcw,
    tone: "bg-emerald-500/10 text-emerald-600",
  },
  {
    title: "Additional Leave Allocation",
    description: "Grant extra leave days for rewards, compensation, retention, or special business approvals.",
    icon: BadgePlus,
    tone: "bg-violet-500/10 text-violet-600",
  },
  {
    title: "Manual Leave Adjustments",
    description: "Correct balances when there is a policy update, payroll correction, or data reconciliation issue.",
    icon: ClipboardList,
    tone: "bg-amber-500/10 text-amber-600",
  },
  {
    title: "Special Leave Credits",
    description: "Issue special-purpose credits such as compassionate leave, replacement leave, or birthday leave.",
    icon: Gift,
    tone: "bg-rose-500/10 text-rose-600",
  },
  {
    title: "Maternity Leave",
    description: "Leave granted to female employees before and/or after childbirth.",
    icon: Sparkles,
    tone: "bg-pink-500/10 text-pink-600",
  },
  {
    title: "Leave Balance History",
    description: "Track every allocation, deduction, and correction so HR can audit the full entitlement lifecycle.",
    icon: History,
    tone: "bg-slate-500/10 text-slate-600",
  },
];

export default function LeaveEntitlementManagement() {
  const { role, loading: roleLoading } = useRole();
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const annualModule = modules.find((m) => m.title === "Annual Leave Allocation");
  const otherModules = modules.filter((m) => m.title !== "Annual Leave Allocation");

  // Fetch employees
  useEffect(() => {
    const fetchEmployees = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/employees`);
        const data = await res.json();
        if (data.success) {
          setEmployees(data.employees);
        }
      } catch (err) {
        console.error("Error loading employees:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, []);

  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7B0099]" />
      </div>
    );
  }

  if (role !== "hr_admin" && role !== "managing_director") {
    return <Navigate to="/" replace />;
  }

  // Helper: get unused leaves mock
  const getUnusedDays = (empId: string) => {
    const num = parseInt(empId.replace(/\D/g, '')) || 5;
    return (num % 8) + 1; // Generates dynamic 1-8 days
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Top Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-black font-heading text-foreground tracking-tight">
            Leave Entitlement Management
          </h1>
          <p className="max-w-3xl text-sm sm:text-base text-muted-foreground">
            Centralised administration for employee leave allocation, balance corrections, carry forward rules, and audit-ready entitlement history.
          </p>
        </div>
      </div>

      {activeModule === null ? (
        // DASHBOARD VIEW
        <>
          <Card className="overflow-hidden border-border/60 bg-card/77 backdrop-blur-sm">
            <CardHeader className="border-b border-border/50 bg-muted/20">
              <CardTitle className="flex items-center gap-2 text-lg font-black">
                <Layers3 className="w-5 h-5 text-[#7B0099]" />
                Module Scope
              </CardTitle>
              <CardDescription>
                This page is structured for enterprise leave entitlement administration and can grow with policy-driven features over time.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* Left Side: Large Annual Leave Allocation Card */}
                {annualModule && (
                  <div
                    onClick={() => setActiveModule(annualModule.title)}
                    className="lg:col-span-1 rounded-2xl border border-border/60 bg-gradient-to-br from-[#7B0099]/5 to-transparent p-6 shadow-sm hover:shadow-md hover:border-[#7B0099]/40 cursor-pointer transition-all duration-200 group flex flex-col justify-between min-h-[220px] lg:min-h-full"
                  >
                    <div>
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 ${annualModule.tone}`}>
                        <annualModule.icon className="w-6 h-6" />
                      </div>
                      <h3 className="mt-6 text-lg font-black text-foreground group-hover:text-[#7B0099] transition-colors">
                        {annualModule.title}
                      </h3>
                      <p className="mt-3 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                        {annualModule.description}
                      </p>
                    </div>
                    <div className="mt-8 pt-4 border-t border-border/40 text-[#7B0099] text-xs font-black uppercase tracking-wider flex items-center gap-1.5 group-hover:translate-x-1 transition-transform">
                      Configure Base Leave &rarr;
                    </div>
                  </div>
                )}

                {/* Right Side: 3-column Grid for Other Modules */}
                <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {otherModules.map((module) => {
                    const Icon = module.icon;
                    return (
                      <div
                        key={module.title}
                        onClick={() => setActiveModule(module.title)}
                        className="rounded-2xl border border-border/60 bg-background/60 p-4 shadow-sm hover:shadow-md hover:border-[#7B0099]/40 cursor-pointer transition-all duration-200 group flex flex-col justify-between"
                      >
                        <div>
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${module.tone}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <h3 className="mt-4 text-sm font-black text-foreground group-hover:text-[#7B0099] transition-colors">
                            {module.title}
                          </h3>
                          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                            {module.description}
                          </p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-border/30 text-xs text-muted-foreground/80 font-bold group-hover:text-[#7B0099] transition-colors">
                          Manage module &rarr;
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <Card className="xl:col-span-2 border-border/60 bg-card/77 backdrop-blur-sm">
              <CardHeader className="border-b border-border/50 bg-muted/20">
                <CardTitle className="flex items-center gap-2 text-lg font-black">
                  <Award className="w-5 h-5 text-emerald-600" />
                  Recommended HR Workflow
                </CardTitle>
                <CardDescription>
                  A typical annual leave entitlement cycle for January processing and ongoing HR administration.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <ol className="space-y-3">
                  {[
                    "Allocate the annual entitlement for all eligible employees.",
                    "Carry forward approved unused days from the prior year.",
                    "Apply forfeiture where the policy cap is exceeded.",
                    "Add special credits or additional leave where approvals exist.",
                    "Record manual adjustments with a reason and approver.",
                    "Review the balance history before closing the leave year.",
                  ].map((step, index) => (
                    <li key={step} className="flex gap-3 rounded-2xl border border-border/60 p-4">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#7B0099]/10 text-[11px] font-black text-[#7B0099]">
                        {index + 1}
                      </div>
                      <p className="text-sm text-foreground/90">{step}</p>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/77 backdrop-blur-sm">
              <CardHeader className="border-b border-border/50 bg-muted/20">
                <CardTitle className="flex items-center gap-2 text-lg font-black">
                  <CircleAlert className="w-5 h-5 text-amber-600" />
                  Audit Notes
                </CardTitle>
                <CardDescription>
                  Keep entitlement changes transparent and policy-aligned.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                <div className="rounded-2xl bg-amber-500/5 border border-amber-500/15 p-4 text-sm text-foreground/90">
                  Every balance change should capture the reason, date, affected period, and user who made the change.
                </div>
                <div className="rounded-2xl bg-sky-500/5 border border-sky-500/15 p-4 text-sm text-foreground/90">
                  This module name stays future-proof for carry forward, forfeiture, bulk updates, and balance history features.
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        // ACTIVE MODULE VIEWS
        <div className="animate-in slide-in-from-bottom duration-300">
          {activeModule === "Annual Leave Allocation" && (
            <AnnualLeaveAllocationForm
              employees={employees}
              onCancel={() => setActiveModule(null)}
            />
          )}
          {activeModule === "Carry Forward Leave" && (
            <CarryForwardLeaveForm
              employees={employees}
              onCancel={() => setActiveModule(null)}
              getUnusedDays={getUnusedDays}
            />
          )}
          {activeModule === "Additional Leave Allocation" && (
            <AdditionalLeaveAllocationForm
              employees={employees}
              onCancel={() => setActiveModule(null)}
            />
          )}
          {activeModule === "Manual Leave Adjustments" && (
            <ManualLeaveAdjustmentForm
              employees={employees}
              onCancel={() => setActiveModule(null)}
            />
          )}
          {activeModule === "Special Leave Credits" && (
            <SpecialLeaveCreditsForm
              employees={employees}
              onCancel={() => setActiveModule(null)}
            />
          )}
          {activeModule === "Maternity Leave" && (
            <MaternityLeaveForm
              employees={employees}
              onCancel={() => setActiveModule(null)}
            />
          )}
          {activeModule === "Leave Balance History" && (
            <LeaveBalanceHistoryForm
              employees={employees}
              onCancel={() => setActiveModule(null)}
              getUnusedDays={getUnusedDays}
            />
          )}
        </div>
      )}
    </div>
  );
}

/* ==========================================================
   AUTOCOMPLETE EMPLOYEE SELECTOR COMPONENT
   ========================================================== */
function EmployeeSearchSelector({
  employees,
  selectedEmployee,
  onSelect,
  placeholder = "Search Employee...",
}: {
  employees: any[];
  selectedEmployee: any | null;
  onSelect: (emp: any | null) => void;
  placeholder?: string;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const filtered = employees.filter(
    (e) =>
      e.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      e.user_id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={selectedEmployee ? selectedEmployee.full_name : search}
          onChange={(e) => {
            if (selectedEmployee) onSelect(null);
            setSearch(e.target.value);
            setOpen(true);
          }}
          onClick={() => setOpen(true)}
          className="pl-8 pr-8 bg-white dark:bg-card h-9 text-xs"
        />
        {selectedEmployee && (
          <button
            onClick={() => {
              onSelect(null);
              setSearch("");
              setOpen(true);
            }}
            className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {open && !selectedEmployee && (
        <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-2 text-xs text-muted-foreground">No employees found</div>
          ) : (
            filtered.map((emp) => (
              <div
                key={emp.user_id}
                onClick={(e) => {
                  onSelect(emp);
                  setSearch("");
                  setOpen(false);
                }}
                className="p-2 text-xs cursor-pointer hover:bg-muted transition-colors flex items-center justify-between"
              >
                <div>
                  <span className="font-bold">{emp.full_name}</span>
                  <span className="text-muted-foreground ml-2">({emp.user_id})</span>
                </div>
                <span className="text-[10px] text-muted-foreground">{emp.branch}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ==========================================================
   1. ANNUAL LEAVE ALLOCATION FORM (COMPANION SUB-FORM)
   ========================================================== */
function AnnualLeaveAllocationForm({
  employees,
  onCancel,
}: {
  employees: any[];
  onCancel: () => void;
}) {
  const [allocMode, setAllocMode] = useState<"base" | "ot">("base");

  // Mode 1: Base entitlement state variables
  const [selectedBranch, setSelectedBranch] = useState("All");
  const [selectedDept, setSelectedDept] = useState("All");
  const [search, setSearch] = useState("");
  const [leaveDays, setLeaveDays] = useState(14);
  const [leaveYear, setLeaveYear] = useState("2026");

  // Mode 2: OT convert state variables
  const [selectedEmp, setSelectedEmp] = useState<any | null>(null);
  const [selectedOTs, setSelectedOTs] = useState<string[]>([]);
  const [targetLeaveType, setTargetLeaveType] = useState("Annual & Emergency Leave");
  const [otHoursLimit, setOtHoursLimit] = useState(8);

  const mockOTs = [
    { id: "OT-01", date: "2026-07-01", hours: 4, description: "Approved Overtime - System maintenance HOD approved" },
    { id: "OT-02", date: "2026-07-04", hours: 8, description: "Approved Overtime - Weekend event HOD approved" },
    { id: "OT-03", date: "2026-07-05", hours: 6, description: "Approved Overtime - Urgent customer support" },
  ];

  const totalSelectedOTHours = mockOTs
    .filter(ot => selectedOTs.includes(ot.id))
    .reduce((sum, ot) => sum + ot.hours, 0);

  const allocatedDays = Number((totalSelectedOTHours / otHoursLimit).toFixed(1));

  const filtered = employees.filter((e) => {
    const bMatch = selectedBranch === "All" || e.branch === selectedBranch;
    const dMatch = selectedDept === "All" || e.department === selectedDept;
    const sMatch = !search || e.full_name?.toLowerCase().includes(search.toLowerCase()) || e.user_id?.toLowerCase().includes(search.toLowerCase());
    return bMatch && dMatch && sMatch;
  });

  const uniqueBranches = ["All", ...new Set(employees.map(e => e.branch).filter(Boolean))];
  const uniqueDepts = ["All", ...new Set(employees.map(e => e.department).filter(Boolean))];

  const handleGrant = () => {
    // Audit Log for localStorage
    const newLogs = filtered.map(emp => {
      updateEmployeeLeaveBalance(emp.user_id, emp.full_name, "Annual & Emergency Leave", leaveDays);
      return {
        date: new Date().toISOString().split('T')[0],
        action: `Base Entitlement`,
        performedBy: "Nurul Athirah (HR)",
        reference: `ANN-ALLOC-${leaveYear}`,
        before: 0,
        after: leaveDays,
        type: "Allocation",
        leave: "Annual & Emergency Leave",
        employee: emp.full_name,
      };
    });

    const saved = localStorage.getItem("leave_balance_history_logs");
    const currentLogs = saved ? JSON.parse(saved) : [];
    localStorage.setItem("leave_balance_history_logs", JSON.stringify([...newLogs, ...currentLogs]));

    toast({
      title: "Annual Leave Allocated",
      description: `Successfully allocated base ${leaveDays} days for year ${leaveYear} to ${filtered.length} employees.`,
    });
    onCancel();
  };

  const handleOTAllocate = () => {
    if (!selectedEmp) return;
    if (selectedOTs.length === 0) {
      toast({
        title: "No OT Records Selected",
        description: "Please check at least one approved OT record to convert.",
        variant: "destructive",
      });
      return;
    }

    const currentBalances = getEmployeeLeaveBalances(selectedEmp.user_id);
    const targetType = targetLeaveType === "Annual & Emergency Leave" ? "Annual & Emergency Leave" : "Replacement Leave";
    const newTotal = currentBalances[targetType] + allocatedDays;
    updateEmployeeLeaveBalance(selectedEmp.user_id, selectedEmp.full_name, targetType, newTotal);

    // Append to local history logs
    const newLog = {
      date: new Date().toISOString().split('T')[0],
      action: `OT Convert (+${allocatedDays}d)`,
      performedBy: "Nurul Athirah (HR)",
      reference: `OT-CONV-${selectedOTs.join('-')}`,
      before: currentBalances[targetType],
      after: newTotal,
      type: "Allocation",
      leave: targetLeaveType,
      employee: selectedEmp.full_name,
    };

    const saved = localStorage.getItem("leave_balance_history_logs");
    const currentLogs = saved ? JSON.parse(saved) : [];
    localStorage.setItem("leave_balance_history_logs", JSON.stringify([newLog, ...currentLogs]));

    toast({
      title: "OT Conversion Successful",
      description: `Allocated +${allocatedDays} days of ${targetLeaveType} to ${selectedEmp.full_name} for ${totalSelectedOTHours} hours of Overtime.`,
    });
    
    // reset form
    setSelectedEmp(null);
    setSelectedOTs([]);
    onCancel();
  };

  const handleToggleOT = (otId: string) => {
    if (selectedOTs.includes(otId)) {
      setSelectedOTs(selectedOTs.filter(id => id !== otId));
    } else {
      setSelectedOTs([...selectedOTs, otId]);
    }
  };

  return (
    <Card className="border-border/60 bg-card/75 shadow-lg">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 border-b pb-4 mb-4 bg-muted/20">
        <Button variant="ghost" size="icon" onClick={onCancel} className="h-8 w-8 rounded-full hover:bg-sky-500/10 hover:text-sky-600 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="w-9 h-9 rounded-xl bg-sky-500/10 flex items-center justify-center">
          <CalendarRange className="w-5 h-5 text-sky-600" />
        </div>
        <div>
          <CardTitle className="text-base sm:text-lg font-black text-foreground">Annual Leave Allocation</CardTitle>
          <CardDescription className="text-xs">Setup or reset the annual base leave days for your staff.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-2">
        {/* Toggle Mode */}
        <div className="flex gap-2 p-1 bg-muted/30 border rounded-lg w-fit">
          <Button
            variant={allocMode === "base" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setAllocMode("base")}
            className="text-xs font-bold uppercase tracking-wider h-8"
          >
            Base Entitlement
          </Button>
          <Button
            variant={allocMode === "ot" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setAllocMode("ot")}
            className="text-xs font-bold uppercase tracking-wider h-8 gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            OT to Replacement Leave
          </Button>
        </div>

        {allocMode === "base" ? (
          // MODE 1: BASE ENTITLEMENT ALLOCATION
          <>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3 border-b pb-1">Allocation Config</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Leave Year</Label>
                  <Select value={leaveYear} onValueChange={setLeaveYear}>
                    <SelectTrigger className="bg-white dark:bg-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2026">2026</SelectItem>
                      <SelectItem value="2027">2027</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Base Entitlement (Days)</Label>
                  <Input type="number" value={leaveDays} onChange={(e) => setLeaveDays(Number(e.target.value))} className="bg-white dark:bg-card text-xs h-9" />
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3 border-b pb-1">Employee Filter</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Branch</Label>
                  <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                    <SelectTrigger className="bg-white dark:bg-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueBranches.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Department</Label>
                  <Select value={selectedDept} onValueChange={setSelectedDept}>
                    <SelectTrigger className="bg-white dark:bg-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueDepts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-bold">Search Name or ID</Label>
                  <Input placeholder="Enter employee name..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-white dark:bg-card text-xs h-9" />
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Matching Employees ({filtered.length})</h4>
              </div>
              <div className="border rounded-md max-h-60 overflow-y-auto bg-white dark:bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">Employee ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead className="text-right">New Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((emp) => (
                      <TableRow key={emp.user_id}>
                        <TableCell className="font-medium text-xs">{emp.user_id}</TableCell>
                        <TableCell className="text-xs font-bold">{emp.full_name}</TableCell>
                        <TableCell className="text-xs">{emp.branch}</TableCell>
                        <TableCell className="text-xs">{emp.department || "-"}</TableCell>
                        <TableCell className="text-right text-xs font-black text-[#7B0099]">{leaveDays} Days</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t pt-4">
              <Button variant="outline" size="sm" onClick={onCancel} className="text-xs uppercase font-black tracking-wider">Cancel</Button>
              <Button size="sm" onClick={handleGrant} className="bg-sky-600 hover:bg-sky-700 text-white text-xs uppercase font-black tracking-wider">Allocate Base Leave</Button>
            </div>
          </>
        ) : (
          // MODE 2: OT TO REPLACEMENT LEAVE ALLOCATION
          <div className="space-y-4 max-w-2xl mx-auto border p-4 rounded-xl bg-muted/5">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3 border-b pb-1">Employee</h4>
              <EmployeeSearchSelector
                employees={employees}
                selectedEmployee={selectedEmp}
                onSelect={setSelectedEmp}
                placeholder="Search staff who worked OT..."
              />
            </div>

            {selectedEmp && (
              <>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3 border-b pb-1">Approved Overtime Records</h4>
                  <div className="border rounded-md bg-white dark:bg-card text-xs divide-y">
                    {mockOTs.map((ot) => {
                      const isChecked = selectedOTs.includes(ot.id);
                      return (
                        <div
                          key={ot.id}
                          onClick={() => handleToggleOT(ot.id)}
                          className={`p-3 cursor-pointer transition-colors flex items-center justify-between hover:bg-muted/10 ${
                            isChecked ? "bg-amber-500/5" : ""
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}} // handled by click
                              className="cursor-pointer rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                            />
                            <div>
                              <div className="font-bold">{ot.date}</div>
                              <div className="text-[10px] text-muted-foreground mt-0.5">{ot.description}</div>
                            </div>
                          </div>
                          <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">
                            {ot.hours} Hours
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Leave Type Allocation</Label>
                    <Select value={targetLeaveType} onValueChange={setTargetLeaveType}>
                      <SelectTrigger className="bg-white dark:bg-card"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Annual & Emergency Leave">Annual & Emergency Leave</SelectItem>
                        <SelectItem value="Replacement Leave">Replacement Leave</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">OT Hours Per 1 Day Leave</Label>
                    <Select value={otHoursLimit.toString()} onValueChange={(val) => setOtHoursLimit(Number(val))}>
                      <SelectTrigger className="bg-white dark:bg-card"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="8">8 Hours Overtime</SelectItem>
                        <SelectItem value="4">4 Hours Overtime</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-lg flex items-center justify-between text-xs dark:bg-slate-900 dark:border-slate-800 mt-2">
                  <div>
                    <span className="text-muted-foreground block font-medium">Conversion Summary</span>
                    <span className="font-bold text-amber-800 dark:text-amber-400">
                      {totalSelectedOTHours} Selected Hours / {otHoursLimit}h Rate
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-muted-foreground block font-medium">Replacement Days Granted</span>
                    <span className="font-black text-sm text-amber-600">+{allocatedDays} Days</span>
                  </div>
                </div>

                <div className="flex justify-end gap-3 border-t pt-4">
                  <Button variant="outline" size="sm" onClick={onCancel} className="text-xs uppercase font-black tracking-wider">Cancel</Button>
                  <Button
                    size="sm"
                    onClick={handleOTAllocate}
                    disabled={selectedOTs.length === 0}
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs uppercase font-black tracking-wider"
                  >
                    Allocate Replacement Leave
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ==========================================================
   2. CARRY FORWARD LEAVE FORM
   ========================================================== */
function CarryForwardLeaveForm({
  employees,
  onCancel,
  getUnusedDays,
}: {
  employees: any[];
  onCancel: () => void;
  getUnusedDays: (id: string) => number;
}) {
  const [leaveType, setLeaveType] = useState("Annual & Emergency Leave");
  const [leaveYear, setLeaveYear] = useState("2026");
  const [carryToYear, setCarryToYear] = useState("2027");
  const [maxCarry, setMaxCarry] = useState(5);
  const [expiryDate, setExpiryDate] = useState("2027-03-31");

  const [selectedBranch, setSelectedBranch] = useState("All");
  const [selectedDept, setSelectedDept] = useState("All");
  const [empType, setEmpType] = useState("Permanent");
  const [search, setSearch] = useState("");

  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);

  // Filter Employees dynamically
  const filtered = employees.filter((e) => {
    const bMatch = selectedBranch === "All" || e.branch === selectedBranch;
    const dMatch = selectedDept === "All" || e.department === selectedDept;
    const sMatch = !search || e.full_name?.toLowerCase().includes(search.toLowerCase()) || e.user_id?.toLowerCase().includes(search.toLowerCase());
    return bMatch && dMatch && sMatch;
  });

  const uniqueBranches = ["All", ...new Set(employees.map(e => e.branch).filter(Boolean))];
  const uniqueDepts = ["All", ...new Set(employees.map(e => e.department).filter(Boolean))];

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEmployees(filtered.map(e => e.user_id));
    } else {
      setSelectedEmployees([]);
    }
  };

  const handleToggleSelect = (uid: string) => {
    if (selectedEmployees.includes(uid)) {
      setSelectedEmployees(selectedEmployees.filter(id => id !== uid));
    } else {
      setSelectedEmployees([...selectedEmployees, uid]);
    }
  };

  const handleExecute = () => {
    // Log to local balance history logs
    const newLogs = employees
      .filter((e) => selectedEmployees.includes(e.user_id))
      .map(emp => {
        const unused = getUnusedDays(emp.user_id);
        const eligible = Math.min(unused, maxCarry);
        
        const currentBalances = getEmployeeLeaveBalances(emp.user_id);
        const newTotal = currentBalances[leaveType as keyof typeof currentBalances] + eligible;
        updateEmployeeLeaveBalance(emp.user_id, emp.full_name, leaveType, newTotal);

        return {
          date: new Date().toISOString().split('T')[0],
          action: `Carry Forward CF`,
          performedBy: "System Job",
          reference: `ROLL-CF-${carryToYear}`,
          before: currentBalances[leaveType as keyof typeof currentBalances],
          after: newTotal,
          type: "Carry Forward",
          leave: leaveType,
          employee: emp.full_name,
        };
      });

    const saved = localStorage.getItem("leave_balance_history_logs");
    const currentLogs = saved ? JSON.parse(saved) : [];
    localStorage.setItem("leave_balance_history_logs", JSON.stringify([...newLogs, ...currentLogs]));

    toast({
      title: "Carry Forward Successful",
      description: `Executed carry forward for ${selectedEmployees.length} employees up to max ${maxCarry} days.`,
    });
    onCancel();
  };

  return (
    <Card className="border-border/60 bg-card/75 shadow-lg">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 border-b pb-4 mb-4 bg-muted/20">
        <Button variant="ghost" size="icon" onClick={onCancel} className="h-8 w-8 rounded-full hover:bg-emerald-500/10 hover:text-emerald-600 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
          <RotateCcw className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <CardTitle className="text-base sm:text-lg font-black text-foreground">Carry Forward Leave</CardTitle>
          <CardDescription className="text-xs">Setup annual roll-over configs and select eligible employees to carry forward unused leaves.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-2">
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3 border-b pb-1">Carry Forward Configuration</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Leave Type</Label>
              <Select value={leaveType} onValueChange={setLeaveType}>
                <SelectTrigger className="bg-white dark:bg-card"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Annual & Emergency Leave">Annual & Emergency Leave</SelectItem>
                  <SelectItem value="Replacement Leave">Replacement Leave</SelectItem>
                  <SelectItem value="Sick Leave (MC)">Sick Leave (MC)</SelectItem>
                  <SelectItem value="Unpaid Leave">Unpaid Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Leave Year</Label>
              <Select value={leaveYear} onValueChange={setLeaveYear}>
                <SelectTrigger className="bg-white dark:bg-card"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2026">2026</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Carry Forward To</Label>
              <Select value={carryToYear} onValueChange={setCarryToYear}>
                <SelectTrigger className="bg-white dark:bg-card"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2027">2027</SelectItem>
                  <SelectItem value="2028">2028</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Max Carry Forward (Days)</Label>
              <Input type="number" value={maxCarry} onChange={(e) => setMaxCarry(Number(e.target.value))} className="bg-white dark:bg-card h-9 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Expiry Date</Label>
              <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="bg-white dark:bg-card h-9 text-xs" />
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3 border-b pb-1">Employee Selection</h4>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Department</Label>
              <Select value={selectedDept} onValueChange={setSelectedDept}>
                <SelectTrigger className="bg-white dark:bg-card"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {uniqueDepts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Branch</Label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="bg-white dark:bg-card"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {uniqueBranches.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Employment Type</Label>
              <Select value={empType} onValueChange={setEmpType}>
                <SelectTrigger className="bg-white dark:bg-card"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Permanent">Permanent</SelectItem>
                  <SelectItem value="Contract">Contract</SelectItem>
                  <SelectItem value="All">All types</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Search Employee</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Enter ID or Name..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 bg-white dark:bg-card h-9 text-xs" />
              </div>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3 border-b pb-1">Eligible Employees</h4>
          <div className="border rounded-md max-h-80 overflow-y-auto bg-white dark:bg-card">
            <Table className="text-xs">
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="w-[50px] text-center">
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && selectedEmployees.length === filtered.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="cursor-pointer rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-center">Unused</TableHead>
                  <TableHead className="text-center">Eligible</TableHead>
                  <TableHead className="text-center">Carry Forward</TableHead>
                  <TableHead className="text-center">Forfeit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((emp) => {
                  const unused = getUnusedDays(emp.user_id);
                  const eligible = Math.min(unused, maxCarry);
                  const selected = selectedEmployees.includes(emp.user_id);
                  const cf = selected ? eligible : 0;
                  const forfeit = unused - cf;

                  return (
                    <TableRow key={emp.user_id} className={selected ? "bg-emerald-500/5" : ""}>
                      <TableCell className="text-center">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => handleToggleSelect(emp.user_id)}
                          className="cursor-pointer rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-bold">{emp.full_name}</div>
                        <div className="text-[10px] text-muted-foreground">{emp.user_id} • {emp.branch}</div>
                      </TableCell>
                      <TableCell>{emp.department || "--"}</TableCell>
                      <TableCell className="text-center font-bold">{unused}d</TableCell>
                      <TableCell className="text-center font-bold text-amber-600">{eligible}d</TableCell>
                      <TableCell className="text-center font-black text-emerald-600">{cf}d</TableCell>
                      <TableCell className="text-center font-bold text-rose-600">{forfeit}d</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex justify-between items-center border-t pt-4">
          <div className="text-xs text-muted-foreground">
            Selected: <span className="font-bold text-emerald-600">{selectedEmployees.length}</span> / {filtered.length} employees
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="sm" onClick={onCancel} className="text-xs uppercase font-black tracking-wider">Cancel</Button>
            <Button size="sm" disabled={selectedEmployees.length === 0} onClick={handleExecute} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs uppercase font-black tracking-wider">
              Execute Carry Forward
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ==========================================================
   3. ADDITIONAL LEAVE ALLOCATION FORM
   ========================================================== */
function AdditionalLeaveAllocationForm({
  employees,
  onCancel,
}: {
  employees: any[];
  onCancel: () => void;
}) {
  const [selectedEmp, setSelectedEmp] = useState<any | null>(null);
  const [leaveType, setLeaveType] = useState("Annual & Emergency Leave");
  const [addDays, setAddDays] = useState(3);
  const [effectiveDate, setEffectiveDate] = useState("2027-01-10");
  const [expiryDate, setExpiryDate] = useState("2027-12-31");
  const [reasonCat, setReasonCat] = useState("Performance Reward");
  const [remarks, setRemarks] = useState("");

  const handleGrant = () => {
    if (!selectedEmp) return;

    const currentBalances = getEmployeeLeaveBalances(selectedEmp.user_id);
    const newTotal = currentBalances[leaveType as keyof typeof currentBalances] + addDays;
    updateEmployeeLeaveBalance(selectedEmp.user_id, selectedEmp.full_name, leaveType, newTotal);

    // Log to local balance history logs
    const newLog = {
      date: new Date().toISOString().split('T')[0],
      action: `Additional Leave (+${addDays}d)`,
      performedBy: "Nurul Athirah (HR)",
      reference: `ADD-ALLOC-${reasonCat.replace(/\s+/g, '-')}`,
      before: currentBalances[leaveType as keyof typeof currentBalances],
      after: newTotal,
      type: "Allocation",
      leave: leaveType,
      employee: selectedEmp.full_name,
    };
    const saved = localStorage.getItem("leave_balance_history_logs");
    const currentLogs = saved ? JSON.parse(saved) : [];
    localStorage.setItem("leave_balance_history_logs", JSON.stringify([newLog, ...currentLogs]));

    toast({
      title: "Leave Allocated Successfully",
      description: `Granted +${addDays} days to ${selectedEmp.full_name} under Category: ${reasonCat}.`,
    });
    onCancel();
  };

  return (
    <Card className="border-border/60 bg-card/75 shadow-lg max-w-2xl mx-auto">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 border-b pb-4 mb-4 bg-muted/20">
        <Button variant="ghost" size="icon" onClick={onCancel} className="h-8 w-8 rounded-full hover:bg-violet-500/10 hover:text-violet-600 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
          <BadgePlus className="w-5 h-5 text-violet-600" />
        </div>
        <div>
          <CardTitle className="text-base sm:text-lg font-black text-foreground">Additional Leave Allocation</CardTitle>
          <CardDescription className="text-xs">Grant extra leave days to specific employees as rewards or adjustments.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-2">
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3 border-b pb-1">Employee Information</h4>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Search Employee</Label>
              <EmployeeSearchSelector
                employees={employees}
                selectedEmployee={selectedEmp}
                onSelect={setSelectedEmp}
                placeholder="Search staff by name or ID..."
              />
            </div>
            {selectedEmp && (
              <div className="grid grid-cols-3 gap-4 bg-muted/20 p-3 rounded-lg border border-border/50 text-xs">
                <div>
                  <span className="text-muted-foreground block">Current Balance</span>
                  <span className="font-bold text-foreground text-sm">14 Days</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Department</span>
                  <span className="font-bold text-foreground">{selectedEmp.department || "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Branch</span>
                  <span className="font-bold text-foreground">{selectedEmp.branch || "-"}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3 border-b pb-1">Allocation Details</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Leave Type</Label>
              <Select value={leaveType} onValueChange={setLeaveType}>
                <SelectTrigger className="bg-white dark:bg-card"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Annual & Emergency Leave">Annual & Emergency Leave</SelectItem>
                  <SelectItem value="Replacement Leave">Replacement Leave</SelectItem>
                  <SelectItem value="Sick Leave (MC)">Sick Leave (MC)</SelectItem>
                  <SelectItem value="Unpaid Leave">Unpaid Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Additional Days</Label>
              <div className="flex items-center border rounded-md px-3 bg-white dark:bg-card h-9">
                <span className="text-xs font-bold text-muted-foreground mr-2">+</span>
                <input
                  type="number"
                  value={addDays}
                  onChange={(e) => setAddDays(Number(e.target.value))}
                  className="bg-transparent border-0 outline-none w-full text-xs font-bold"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Effective Date</Label>
              <Input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className="bg-white dark:bg-card h-9 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Expiry Date</Label>
              <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="bg-white dark:bg-card h-9 text-xs" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-bold">Reason Category</Label>
              <Select value={reasonCat} onValueChange={setReasonCat}>
                <SelectTrigger className="bg-white dark:bg-card"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Performance Reward">Performance Reward</SelectItem>
                  <SelectItem value="Birthday Credit">Birthday Credit</SelectItem>
                  <SelectItem value="OT Replacement">OT Replacement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-bold">Remarks</Label>
              <Textarea
                rows={3}
                placeholder="Enter remarks/reason context..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="bg-white dark:bg-card text-xs"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t pt-4">
          <Button variant="outline" size="sm" onClick={onCancel} className="text-xs uppercase font-black tracking-wider">Cancel</Button>
          <Button size="sm" disabled={!selectedEmp} onClick={handleGrant} className="bg-violet-600 hover:bg-violet-700 text-white text-xs uppercase font-black tracking-wider">
            Grant Leave
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ==========================================================
   4. MANUAL LEAVE ADJUSTMENT FORM
   ========================================================== */
function ManualLeaveAdjustmentForm({
  employees,
  onCancel,
  onRefresh
}: any) {
  const { toast } = useToast();
  const [selectedEmp, setSelectedEmp] = useState<any | null>(null);
  const [leaveType, setLeaveType] = useState("Annual Leave");
  const [adjustmentType, setAdjustmentType] = useState("Add Leave");
  const [adjDays, setAdjDays] = useState(1);
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split("T")[0]);
  const [reasonCategory, setReasonCategory] = useState("Performance Reward");
  const [reasonDetails, setReasonDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leaveBalances, setLeaveBalances] = useState<any>(null);

  useEffect(() => {
    if (selectedEmp?.user_id) {
      try {
        const balances = getEmployeeLeaveBalances(selectedEmp.user_id);
        setLeaveBalances(balances);
      } catch (err) {
        console.error(err);
      }
    } else {
      setLeaveBalances(null);
    }
  }, [selectedEmp?.user_id]);

  // Derived data for current balance display
  const entitlement = leaveBalances ? leaveBalances.annualEntitlement : (selectedEmp?.annual_leave_entitlement || 0);
  const currentAdjustments = leaveBalances ? leaveBalances.carryForward : 0; 
  const approvedLeaveTaken = leaveBalances ? leaveBalances.approvedLeaveTaken : 0; 
  const currentBalance = leaveBalances ? leaveBalances.balance : 0;

  const adjValue = adjustmentType === "Add Leave" ? adjDays : -adjDays;
  const newBalance = currentBalance + adjValue;

  const handleSave = async () => {
    if (!selectedEmp) {
      toast({ title: "Validation Error", description: "Please select an employee.", variant: "destructive" });
      return;
    }
    if (adjDays <= 0) {
      toast({ title: "Validation Error", description: "Adjustment amount must be greater than 0.", variant: "destructive" });
      return;
    }
    if (!reasonDetails.trim()) {
      toast({ title: "Validation Error", description: "Reason details are required.", variant: "destructive" });
      return;
    }
    if (newBalance < 0) {
      toast({ title: "Validation Error", description: "Deduction cannot result in a negative balance.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Simulate API call for now (can be replaced with real backend)
      await new Promise(r => setTimeout(r, 600));

      const newLog = {
        date: effectiveDate,
        action: "Leave Adjustment",
        reference: `${reasonCategory}: ${reasonDetails}`,
        before: currentBalance,
        after: newBalance,
        performedBy: "HR Admin (Auto)",
        leave: leaveType,
        employee: selectedEmp.full_name,
      };

      const saved = localStorage.getItem("leave_balance_history_logs");
      const currentLogs = saved ? JSON.parse(saved) : [];
      localStorage.setItem("leave_balance_history_logs", JSON.stringify([newLog, ...currentLogs]));

      toast({
        title: "Leave balance updated successfully.",
        description: (
          <div className="mt-1 space-y-1 text-xs">
            <div>Employee: {selectedEmp.full_name}</div>
            <div>{leaveType}</div>
            <div>Adjustment: {adjValue > 0 ? '+' : ''}{adjValue} Days</div>
            <div>New Balance: {newBalance} Days</div>
          </div>
        ),
      });
      onRefresh?.();
      onCancel();
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to apply adjustment",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-border/60 bg-white dark:bg-card shadow-lg max-w-2xl mx-auto rounded-xl overflow-hidden">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 border-b pb-4 bg-slate-50 dark:bg-slate-900/50">
        <Button variant="ghost" size="icon" onClick={onCancel} className="h-8 w-8 rounded-full hover:bg-amber-500/10 hover:text-amber-600 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
          <ClipboardList className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <CardTitle className="text-base sm:text-lg font-black text-foreground">Manage Leave Adjustment</CardTitle>
          <CardDescription className="text-xs">Adjust employee's leave balance.</CardDescription>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6 pt-6">
        {/* Employee Section */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold flex items-center">Employee <span className="text-red-500 ml-1">*</span></Label>
            <EmployeeSearchSelector
              employees={employees}
              selectedEmployee={selectedEmp}
              onSelect={setSelectedEmp}
              placeholder="Search employee..."
            />
          </div>

          {/* Employee Info */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1.5 border border-border/50 rounded-md p-2 bg-muted/10">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Employee ID</Label>
              <div className="text-xs font-bold">{selectedEmp?.user_id || "—"}</div>
            </div>
            <div className="space-y-1.5 border border-border/50 rounded-md p-2 bg-muted/10">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Department</Label>
              <div className="text-xs font-bold">{selectedEmp?.department || "—"}</div>
            </div>
            <div className="space-y-1.5 border border-border/50 rounded-md p-2 bg-muted/10 md:col-span-1 col-span-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Branch</Label>
              <div className="text-xs font-bold">{selectedEmp?.branch || "—"}</div>
            </div>
          </div>
        </div>

        <div className="border-t border-border/50" />

        {/* Adjustment Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold flex items-center">Leave Type <span className="text-red-500 ml-1">*</span></Label>
            <Select value={leaveType} onValueChange={setLeaveType}>
              <SelectTrigger className="bg-white dark:bg-card h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Annual Leave">Annual & Emergency Leave</SelectItem>
                <SelectItem value="Sick Leave">Sick & Hospitalisation Leave</SelectItem>
                <SelectItem value="Maternity Leave">Maternity Leave</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold flex items-center">Adjustment Type <span className="text-red-500 ml-1">*</span></Label>
            <div className="flex gap-4 pt-1">
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input 
                  type="radio" 
                  name="adjType" 
                  checked={adjustmentType === "Add Leave"} 
                  onChange={() => setAdjustmentType("Add Leave")}
                  className="text-amber-600 focus:ring-amber-500" 
                />
                Add Leave
              </label>
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input 
                  type="radio" 
                  name="adjType" 
                  checked={adjustmentType === "Deduct Leave"} 
                  onChange={() => setAdjustmentType("Deduct Leave")}
                  className="text-amber-600 focus:ring-amber-500" 
                />
                Deduct Leave
              </label>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold flex items-center">Adjustment Amount <span className="text-red-500 ml-1">*</span></Label>
            <div className="relative">
              <Input type="number" value={adjDays} onChange={(e) => setAdjDays(Number(e.target.value))} className="bg-white dark:bg-card h-9 text-xs pr-12 font-bold" min={1} />
              <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-medium">Days</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold flex items-center">Effective Date <span className="text-red-500 ml-1">*</span></Label>
            <Input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className="bg-white dark:bg-card h-9 text-xs" />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs font-bold flex items-center">Reason Category <span className="text-red-500 ml-1">*</span></Label>
            <Select value={reasonCategory} onValueChange={setReasonCategory}>
              <SelectTrigger className="bg-white dark:bg-card h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Performance Reward">Performance Reward</SelectItem>
                <SelectItem value="Carry Forward">Carry Forward</SelectItem>
                <SelectItem value="Manual Correction">Manual Correction</SelectItem>
                <SelectItem value="Special Approval">Special Approval</SelectItem>
                <SelectItem value="Compensation">Compensation</SelectItem>
                <SelectItem value="System Migration">System Migration</SelectItem>
                <SelectItem value="Payroll Correction">Payroll Correction</SelectItem>
                <SelectItem value="Disciplinary Deduction">Disciplinary Deduction</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs font-bold flex items-center">Reason Details <span className="text-red-500 ml-1">*</span></Label>
            <Textarea
              rows={4}
              placeholder="Enter detailed reason for this adjustment..."
              value={reasonDetails}
              onChange={(e) => setReasonDetails(e.target.value)}
              className="bg-white dark:bg-card text-xs resize-none"
            />
          </div>
        </div>

        <div className="border-t border-border/50" />

        {/* Balances summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-lg border border-border/50">
          <div className="space-y-2">
            <h5 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Current Leave Balance</h5>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Annual Entitlement</span>
                <span className="font-medium">{entitlement} Days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Adjustments</span>
                <span className="font-medium">{currentAdjustments > 0 ? '+' : ''}{currentAdjustments} Days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Approved Leave Taken</span>
                <span className="font-medium">{approvedLeaveTaken} Days</span>
              </div>
              <div className="border-t border-border/60 my-1 pt-1 flex justify-between font-bold text-[#7B0099] dark:text-purple-400">
                <span>Current Balance</span>
                <span>{currentBalance} Days</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h5 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">After Adjustment</h5>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Adjustment</span>
                <span className={`font-bold ${adjValue > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {adjValue > 0 ? '+' : ''}{adjValue} Days
                </span>
              </div>
              <div className="border-t border-border/60 mt-7 pt-1 flex justify-between font-black text-amber-600">
                <span>New Balance</span>
                <span>{newBalance} Days</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border/50" />

        {/* Attachment */}
        <div className="space-y-2">
          <Label className="text-xs font-bold">Attachment (Optional)</Label>
          <div className="border-2 border-dashed border-border/60 rounded-lg p-4 flex flex-col items-center justify-center bg-muted/5 hover:bg-muted/10 transition-colors cursor-pointer">
            <div className="text-xs font-bold text-amber-600 mb-1">Upload Supporting Document</div>
            <div className="text-[10px] text-muted-foreground text-center">
              Examples:<br/>
              • Approval Letter<br/>
              • Reward Letter<br/>
              • Management Memo
            </div>
          </div>
        </div>

        <div className="border-t border-border/50" />

        {/* Meta */}
        <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
          <div>
            <div className="mb-0.5">Adjusted By</div>
            <div className="font-bold text-foreground">HR Admin (Auto)</div>
          </div>
          <div className="text-right">
            <div className="mb-0.5">Adjustment Date</div>
            <div className="font-bold text-foreground">
              {new Date().toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })} 
              {" "}
              {new Date().toLocaleTimeString("en-MY", { hour: "numeric", minute: "2-digit" })} (Auto)
            </div>
          </div>
        </div>

        <div className="border-t border-border/50" />
        
        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" size="sm" onClick={onCancel} className="text-xs uppercase font-black tracking-wider w-32">Cancel</Button>
          <Button size="sm" disabled={isSubmitting} onClick={handleSave} className="bg-amber-600 hover:bg-amber-700 text-white text-xs uppercase font-black tracking-wider min-w-[150px]">
            {isSubmitting ? "Saving..." : "Save Adjustment"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ==========================================================
   5. SPECIAL LEAVE CREDITS FORM
   ========================================================== */
function SpecialLeaveCreditsForm({ employees, onCancel }: any) {
  const { toast } = useToast();
  const [selectedEmp, setSelectedEmp] = useState<any | null>(null);
  const [leaveCategory, setLeaveCategory] = useState("Compassionate Leave");
  const [adjDays, setAdjDays] = useState(1);
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split("T")[0]);
  const [reasonDetails, setReasonDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = () => {
    if (!selectedEmp) return;
    setIsSubmitting(true);
    
    // Mock save
    setTimeout(() => {
      // Append to history logs
      const newLog = {
        date: new Date().toISOString().split('T')[0],
        action: `Grant ${leaveCategory}`,
        performedBy: "HR Admin (Auto)",
        reference: `SPL-${Date.now().toString().slice(-6)}`,
        before: 0,
        after: adjDays,
        type: "Special Credit",
        leave: leaveCategory,
        employee: selectedEmp.full_name,
      };

      const saved = localStorage.getItem("leave_balance_history_logs");
      const currentLogs = saved ? JSON.parse(saved) : [];
      localStorage.setItem("leave_balance_history_logs", JSON.stringify([newLog, ...currentLogs]));

      toast({
        title: "Special Leave Granted",
        description: `Allocated ${adjDays} days of ${leaveCategory} to ${selectedEmp.full_name}.`,
      });
      setIsSubmitting(false);
      onCancel();
    }, 600);
  };

  return (
    <Card className="border-border/60 bg-white dark:bg-card shadow-lg max-w-2xl mx-auto rounded-xl overflow-hidden">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 border-b pb-4 bg-rose-50/50 dark:bg-rose-950/20">
        <Button variant="ghost" size="icon" onClick={onCancel} className="h-8 w-8 rounded-full hover:bg-rose-500/10 hover:text-rose-600 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center">
          <Gift className="w-5 h-5 text-rose-600" />
        </div>
        <div>
          <CardTitle className="text-base sm:text-lg font-black text-foreground">Special Leave Credits</CardTitle>
          <CardDescription className="text-xs">Issue special-purpose leave credits.</CardDescription>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6 pt-6">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold flex items-center">Employee <span className="text-red-500 ml-1">*</span></Label>
            <EmployeeSearchSelector employees={employees} selectedEmployee={selectedEmp} onSelect={setSelectedEmp} placeholder="Search employee..." />
          </div>
          {selectedEmp && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1.5 border border-border/50 rounded-md p-2 bg-muted/10">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Employee ID</Label>
                <div className="text-xs font-bold">{selectedEmp.user_id}</div>
              </div>
              <div className="space-y-1.5 border border-border/50 rounded-md p-2 bg-muted/10 md:col-span-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Department</Label>
                <div className="text-xs font-bold">{selectedEmp.department || "IT Department"}</div>
              </div>
            </div>
          )}
        </div>

        {selectedEmp && (
          <>
            <div className="border-t border-border/50" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold flex items-center">Leave Category <span className="text-red-500 ml-1">*</span></Label>
                <Select value={leaveCategory} onValueChange={setLeaveCategory}>
                  <SelectTrigger className="bg-white dark:bg-card h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Compassionate Leave">Compassionate Leave</SelectItem>
                    <SelectItem value="Marriage Leave">Marriage Leave</SelectItem>
                    <SelectItem value="Paternity Leave">Paternity Leave</SelectItem>
                    <SelectItem value="Exam Leave">Exam Leave</SelectItem>
                    <SelectItem value="Birthday Leave">Birthday Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold flex items-center">Credit Amount <span className="text-red-500 ml-1">*</span></Label>
                <div className="relative">
                  <Input type="number" value={adjDays} onChange={(e) => setAdjDays(Number(e.target.value))} className="bg-white dark:bg-card h-9 text-xs pr-12 font-bold" min={1} />
                  <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-medium">Days</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold flex items-center">Effective Date <span className="text-red-500 ml-1">*</span></Label>
                <Input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className="bg-white dark:bg-card h-9 text-xs" />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs font-bold">Reason Details & Comments</Label>
                <Textarea rows={3} placeholder="Optional details..." value={reasonDetails} onChange={(e) => setReasonDetails(e.target.value)} className="bg-white dark:bg-card text-xs resize-none" />
              </div>
            </div>
            
            <div className="border-t border-border/50" />
            <div className="flex justify-end gap-3">
              <Button variant="outline" size="sm" onClick={onCancel} className="text-xs uppercase font-black tracking-wider w-32">Cancel</Button>
              <Button size="sm" disabled={isSubmitting} onClick={handleSave} className="bg-rose-600 hover:bg-rose-700 text-white text-xs uppercase font-black tracking-wider min-w-[150px]">
                {isSubmitting ? "Processing..." : "Grant Special Leave"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ==========================================================
   6. MATERNITY LEAVE FORM
   ========================================================== */
function MaternityLeaveForm({ employees, onCancel }: any) {
  const { toast } = useToast();
  const [selectedEmp, setSelectedEmp] = useState<any | null>(null);
  const [edd, setEdd] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [totalDays, setTotalDays] = useState(98);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto calculate End Date based on Start Date + 98 days
  useEffect(() => {
    if (startDate) {
      const start = new Date(startDate);
      start.setDate(start.getDate() + totalDays - 1);
      setEndDate(start.toISOString().split("T")[0]);
    }
  }, [startDate, totalDays]);

  const handleSave = () => {
    if (!selectedEmp) return;
    setIsSubmitting(true);
    
    // Mock save
    setTimeout(() => {
      const newLog = {
        date: new Date().toISOString().split('T')[0],
        action: `Maternity Allocation`,
        performedBy: "HR Admin (Auto)",
        reference: `MAT-${Date.now().toString().slice(-6)}`,
        before: 0,
        after: totalDays,
        type: "Statutory Leave",
        leave: "Maternity Leave",
        employee: selectedEmp.full_name,
      };

      const saved = localStorage.getItem("leave_balance_history_logs");
      const currentLogs = saved ? JSON.parse(saved) : [];
      localStorage.setItem("leave_balance_history_logs", JSON.stringify([newLog, ...currentLogs]));

      toast({
        title: "Maternity Leave Granted",
        description: `Allocated ${totalDays} days of Maternity Leave to ${selectedEmp.full_name}.`,
      });
      setIsSubmitting(false);
      onCancel();
    }, 600);
  };

  return (
    <Card className="border-border/60 bg-white dark:bg-card shadow-lg max-w-2xl mx-auto rounded-xl overflow-hidden">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 border-b pb-4 bg-pink-50/50 dark:bg-pink-950/20">
        <Button variant="ghost" size="icon" onClick={onCancel} className="h-8 w-8 rounded-full hover:bg-pink-500/10 hover:text-pink-600 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="w-9 h-9 rounded-xl bg-pink-500/10 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-pink-600" />
        </div>
        <div>
          <CardTitle className="text-base sm:text-lg font-black text-foreground">Maternity Leave Allocation</CardTitle>
          <CardDescription className="text-xs">Manage statutory maternity leave (typically 98 days).</CardDescription>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6 pt-6">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold flex items-center">Female Employee <span className="text-red-500 ml-1">*</span></Label>
            <EmployeeSearchSelector employees={employees} selectedEmployee={selectedEmp} onSelect={setSelectedEmp} placeholder="Search female employee..." />
          </div>
          {selectedEmp && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1.5 border border-border/50 rounded-md p-2 bg-muted/10">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Employee ID</Label>
                <div className="text-xs font-bold">{selectedEmp.user_id}</div>
              </div>
              <div className="space-y-1.5 border border-border/50 rounded-md p-2 bg-muted/10 md:col-span-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Department</Label>
                <div className="text-xs font-bold">{selectedEmp.department || "IT Department"}</div>
              </div>
            </div>
          )}
        </div>

        {selectedEmp && (
          <>
            <div className="border-t border-border/50" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Expected Delivery Date (EDD)</Label>
                <Input type="date" value={edd} onChange={(e) => setEdd(e.target.value)} className="bg-white dark:bg-card h-9 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Total Entitlement (Days) <span className="text-red-500 ml-1">*</span></Label>
                <Input type="number" value={totalDays} onChange={(e) => setTotalDays(Number(e.target.value))} className="bg-white dark:bg-card h-9 text-xs font-bold" min={1} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Leave Start Date <span className="text-red-500 ml-1">*</span></Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-white dark:bg-card h-9 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Leave End Date</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-muted/50 h-9 text-xs font-bold text-pink-600" readOnly />
              </div>
            </div>
            
            <div className="space-y-2 mt-2">
              <Label className="text-xs font-bold flex items-center">Medical Certificate / Proof <span className="text-red-500 ml-1">*</span></Label>
              <div className="border-2 border-dashed border-border/60 rounded-lg p-4 flex flex-col items-center justify-center bg-muted/5 hover:bg-muted/10 transition-colors cursor-pointer">
                <div className="text-xs font-bold text-pink-600 mb-1">Upload Medical Document</div>
                <div className="text-[10px] text-muted-foreground">PDF, JPG, PNG up to 5MB</div>
              </div>
            </div>

            <div className="border-t border-border/50" />
            <div className="flex justify-end gap-3">
              <Button variant="outline" size="sm" onClick={onCancel} className="text-xs uppercase font-black tracking-wider w-32">Cancel</Button>
              <Button size="sm" disabled={isSubmitting || !startDate} onClick={handleSave} className="bg-pink-600 hover:bg-pink-700 text-white text-xs uppercase font-black tracking-wider min-w-[150px]">
                {isSubmitting ? "Processing..." : "Allocate Maternity Leave"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ==========================================================
   7. LEAVE BALANCE HISTORY FORM
   ========================================================== */
function LeaveBalanceHistoryForm({ onCancel }: any) {
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("leave_balance_history_logs");
    if (saved) {
      setLogs(JSON.parse(saved));
    }
  }, []);

  const filteredLogs = logs.filter(log => 
    !search || 
    log.employee.toLowerCase().includes(search.toLowerCase()) || 
    log.action.toLowerCase().includes(search.toLowerCase()) ||
    log.leave.toLowerCase().includes(search.toLowerCase()) ||
    log.reference.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card className="border-border/60 bg-white dark:bg-card shadow-lg max-w-5xl mx-auto rounded-xl overflow-hidden">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 border-b pb-4 bg-slate-50 dark:bg-slate-900/50">
        <Button variant="ghost" size="icon" onClick={onCancel} className="h-8 w-8 rounded-full hover:bg-slate-500/10 hover:text-slate-600 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="w-9 h-9 rounded-xl bg-slate-500/10 flex items-center justify-center">
          <History className="w-5 h-5 text-slate-600" />
        </div>
        <div>
          <CardTitle className="text-base sm:text-lg font-black text-foreground">Leave Balance History</CardTitle>
          <CardDescription className="text-xs">Audit log of all entitlement allocations and adjustments.</CardDescription>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="p-4 border-b border-border/50 bg-muted/10">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search employee, action, or ref..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 bg-white dark:bg-card h-9 text-xs"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto max-h-[500px]">
          <Table>
            <TableHeader className="bg-muted/30 sticky top-0 backdrop-blur-md">
              <TableRow>
                <TableHead className="text-xs font-bold">Date</TableHead>
                <TableHead className="text-xs font-bold">Employee</TableHead>
                <TableHead className="text-xs font-bold">Action / Reference</TableHead>
                <TableHead className="text-xs font-bold">Leave Type</TableHead>
                <TableHead className="text-right text-xs font-bold">Change</TableHead>
                <TableHead className="text-right text-xs font-bold">New Balance</TableHead>
                <TableHead className="text-xs font-bold pl-6">Performed By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-xs">
                    No history records found. Ensure you allocate or adjust leave first.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log, idx) => {
                  const isPositive = log.after > log.before;
                  const diff = Math.abs(log.after - log.before);
                  return (
                    <TableRow key={idx} className="hover:bg-muted/30">
                      <TableCell className="text-xs whitespace-nowrap">{log.date}</TableCell>
                      <TableCell className="text-xs font-bold">{log.employee}</TableCell>
                      <TableCell className="text-xs">
                        <div className="font-bold text-foreground">{log.action}</div>
                        <div className="text-[10px] text-muted-foreground">{log.reference}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="secondary" className="text-[10px] font-medium bg-muted text-muted-foreground">
                          {log.leave}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs font-bold">
                        <span className={isPositive ? "text-emerald-600" : "text-rose-600"}>
                          {isPositive ? '+' : '-'}{diff}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-xs font-black">{log.after} Days</TableCell>
                      <TableCell className="text-[11px] text-muted-foreground pl-6 whitespace-nowrap">{log.performedBy}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
