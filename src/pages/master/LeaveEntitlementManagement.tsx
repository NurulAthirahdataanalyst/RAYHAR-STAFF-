import { useState, useEffect } from "react";
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
import { toast } from "@/hooks/use-toast";

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
    title: "Leave Forfeiture",
    description: "Remove expired or non-carryable leave balances after policy cut-off or year-end processing.",
    icon: ShieldAlert,
    tone: "bg-red-500/10 text-red-600",
  },
  {
    title: "Leave Balance History",
    description: "Track every allocation, deduction, and correction so HR can audit the full entitlement lifecycle.",
    icon: History,
    tone: "bg-slate-500/10 text-slate-600",
  },
  {
    title: "Bulk Leave Allocation",
    description: "Apply the same entitlement update to many employees at once for annual rollouts or policy changes.",
    icon: Users,
    tone: "bg-cyan-500/10 text-cyan-600",
  },
];

export default function LeaveEntitlementManagement() {
  const { role } = useRole();
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

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

  if (role && role !== "hr_admin" && role !== "managing_director") {
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
          <Badge className="w-fit bg-[#7B0099]/10 text-[#7B0099] hover:bg-[#7B0099]/10 border border-[#7B0099]/15">
            HR Master Module
          </Badge>
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
          <Card className="overflow-hidden border-border/60 bg-card/70 backdrop-blur-sm">
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
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {modules.map((module) => {
                  const Icon = module.icon;
                  return (
                    <div
                      key={module.title}
                      onClick={() => setActiveModule(module.title)}
                      className="rounded-2xl border border-border/60 bg-background/60 p-4 shadow-sm hover:shadow-md hover:border-[#7B0099]/40 cursor-pointer transition-all duration-200 group"
                    >
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${module.tone}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <h3 className="mt-4 text-sm font-black text-foreground group-hover:text-[#7B0099] transition-colors">{module.title}</h3>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">{module.description}</p>
                    </div>
                  );
                })}
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
          {activeModule === "Leave Forfeiture" && (
            <LeaveForfeitureForm
              employees={employees}
              onCancel={() => setActiveModule(null)}
              getUnusedDays={getUnusedDays}
            />
          )}
          {activeModule === "Bulk Leave Allocation" && (
            <BulkLeaveAllocationForm
              employees={employees}
              onCancel={() => setActiveModule(null)}
            />
          )}
          {activeModule === "Leave Balance History" && (
            <LeaveBalanceHistoryForm
              employees={employees}
              onCancel={() => setActiveModule(null)}
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

  const filtered = employees.filter(
    (e) =>
      e.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      e.user_id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative w-full">
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
          onFocus={() => setOpen(true)}
          className="pl-8 pr-8"
        />
        {selectedEmployee && (
          <button
            onClick={() => {
              onSelect(null);
              setSearch("");
            }}
            className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {open && !selectedEmployee && search.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-popover text-popover-foreground border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-2 text-xs text-muted-foreground">No employees found</div>
          ) : (
            filtered.map((emp) => (
              <div
                key={emp.user_id}
                onClick={() => {
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
  const [selectedBranch, setSelectedBranch] = useState("All");
  const [selectedDept, setSelectedDept] = useState("All");
  const [search, setSearch] = useState("");
  const [leaveDays, setLeaveDays] = useState(14);
  const [leaveYear, setLeaveYear] = useState("2026");

  const filtered = employees.filter((e) => {
    const bMatch = selectedBranch === "All" || e.branch === selectedBranch;
    const dMatch = selectedDept === "All" || e.department === selectedDept;
    const sMatch = !search || e.full_name?.toLowerCase().includes(search.toLowerCase()) || e.user_id?.toLowerCase().includes(search.toLowerCase());
    return bMatch && dMatch && sMatch;
  });

  const uniqueBranches = ["All", ...new Set(employees.map(e => e.branch).filter(Boolean))];
  const uniqueDepts = ["All", ...new Set(employees.map(e => e.department).filter(Boolean))];

  const handleGrant = () => {
    toast({
      title: "Annual Leave Allocated",
      description: `Successfully allocated base ${leaveDays} days for year ${leaveYear} to ${filtered.length} employees.`,
    });
    onCancel();
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
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3">Allocation Config</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Leave Year</Label>
              <Select value={leaveYear} onValueChange={setLeaveYear}>
                <SelectTrigger className="bg-white">
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
              <Input type="number" value={leaveDays} onChange={(e) => setLeaveDays(Number(e.target.value))} className="bg-white" />
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3">Employee Filter</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Branch</Label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="bg-white">
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
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {uniqueDepts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-bold">Search Name or ID</Label>
              <Input placeholder="Enter employee name..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-white" />
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Matching Employees ({filtered.length})</h4>
          </div>
          <div className="border rounded-md max-h-60 overflow-y-auto bg-white">
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
                    <TableCell className="text-right text-xs font-black text-sky-600">{leaveDays} Days</TableCell>
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
  const [leaveType, setLeaveType] = useState("Annual Leave");
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
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Annual Leave">Annual Leave</SelectItem>
                  <SelectItem value="Medical Leave">Medical Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Leave Year</Label>
              <Select value={leaveYear} onValueChange={setLeaveYear}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2026">2026</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Carry Forward To</Label>
              <Select value={carryToYear} onValueChange={setCarryToYear}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2027">2027</SelectItem>
                  <SelectItem value="2028">2028</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Max Carry Forward (Days)</Label>
              <Input type="number" value={maxCarry} onChange={(e) => setMaxCarry(Number(e.target.value))} className="bg-white h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Expiry Date</Label>
              <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="bg-white h-9" />
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3 border-b pb-1">Employee Selection</h4>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Department</Label>
              <Select value={selectedDept} onValueChange={setSelectedDept}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {uniqueDepts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Branch</Label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {uniqueBranches.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Employment Type</Label>
              <Select value={empType} onValueChange={setEmpType}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
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
                <Input placeholder="Enter ID or Name..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 bg-white h-9" />
              </div>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3 border-b pb-1">Eligible Employees</h4>
          <div className="border rounded-md max-h-80 overflow-y-auto bg-white">
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
  const [leaveType, setLeaveType] = useState("Annual Leave");
  const [addDays, setAddDays] = useState(3);
  const [effectiveDate, setEffectiveDate] = useState("2027-01-10");
  const [expiryDate, setExpiryDate] = useState("2027-12-31");
  const [reasonCat, setReasonCat] = useState("Performance Reward");
  const [remarks, setRemarks] = useState("");

  const handleGrant = () => {
    if (!selectedEmp) return;
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
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Annual Leave">Annual Leave</SelectItem>
                  <SelectItem value="Medical Leave">Medical Leave</SelectItem>
                  <SelectItem value="Replacement Leave">Replacement Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Additional Days</Label>
              <div className="flex items-center border rounded-md px-3 bg-white h-9">
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
              <Input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className="bg-white h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Expiry Date</Label>
              <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="bg-white h-9" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-bold">Reason Category</Label>
              <Select value={reasonCat} onValueChange={setReasonCat}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
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
                className="bg-white text-xs"
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
}: {
  employees: any[];
  onCancel: () => void;
}) {
  const [selectedEmp, setSelectedEmp] = useState<any | null>(null);
  const [leaveType, setLeaveType] = useState("Annual Leave");
  const [adjType, setAdjType] = useState("add"); // add / deduct
  const [adjDays, setAdjDays] = useState(2);
  const [reason, setReason] = useState("System Correction");
  const [remarks, setRemarks] = useState("");
  const [fileName, setFileName] = useState("");

  const currentAnnualBalance = 12;
  const currentMedicalBalance = 8;

  const currentSelectedBalance = leaveType === "Annual Leave" ? currentAnnualBalance : currentMedicalBalance;
  const newBalance = adjType === "add" ? currentSelectedBalance + adjDays : currentSelectedBalance - adjDays;

  const handleSave = () => {
    if (!selectedEmp) return;
    toast({
      title: "Adjustment Applied Successfully",
      description: `Adjusted balance for ${selectedEmp.full_name}: New Balance is ${newBalance} days.`,
    });
    onCancel();
  };

  return (
    <Card className="border-border/60 bg-card/75 shadow-lg max-w-2xl mx-auto">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 border-b pb-4 mb-4 bg-muted/20">
        <Button variant="ghost" size="icon" onClick={onCancel} className="h-8 w-8 rounded-full hover:bg-amber-500/10 hover:text-amber-600 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
          <ClipboardList className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <CardTitle className="text-base sm:text-lg font-black text-foreground">Manual Leave Adjustment</CardTitle>
          <CardDescription className="text-xs">Directly modify an employee's leave balance ledger for audit corrections.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-2">
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3 border-b pb-1">Employee</h4>
          <div className="space-y-4">
            <EmployeeSearchSelector
              employees={employees}
              selectedEmployee={selectedEmp}
              onSelect={setSelectedEmp}
              placeholder="Search staff to adjust..."
            />
            {selectedEmp && (
              <div className="grid grid-cols-2 gap-4 bg-muted/20 p-3 rounded-lg border border-border/50 text-xs">
                <div>
                  <span className="text-muted-foreground block mb-1">Current Balance</span>
                  <div className="space-y-0.5">
                    <div>Annual Leave: <span className="font-bold text-foreground">{currentAnnualBalance} Days</span></div>
                    <div>Medical Leave: <span className="font-bold text-foreground">{currentMedicalBalance} Days</span></div>
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Details</span>
                  <div>Branch: <span className="font-bold text-foreground">{selectedEmp.branch}</span></div>
                  <div>Dept: <span className="font-bold text-foreground">{selectedEmp.department || "-"}</span></div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3 border-b pb-1">Adjustment</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Leave Type</Label>
              <Select value={leaveType} onValueChange={setLeaveType}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Annual Leave">Annual Leave</SelectItem>
                  <SelectItem value="Medical Leave">Medical Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Adjustment Type</Label>
              <Select value={adjType} onValueChange={setAdjType}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">(+ Add)</SelectItem>
                  <SelectItem value="deduct">(- Deduct)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Adjustment Days</Label>
              <Input type="number" value={adjDays} onChange={(e) => setAdjDays(Math.max(0, Number(e.target.value)))} className="bg-white h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">New Balance</Label>
              <div className="h-9 flex items-center px-3 border bg-muted/30 rounded-md font-black text-sm text-foreground">
                {newBalance} Days
              </div>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-bold">Reason</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="System Correction">System Correction</SelectItem>
                  <SelectItem value="Policy Update">Policy Update</SelectItem>
                  <SelectItem value="Dispute Settlement">Dispute Settlement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-bold">Remarks</Label>
              <Textarea
                rows={3}
                placeholder="Detail explanation for audit tracking..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="bg-white text-xs"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-bold">Attachment (Optional)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  id="adj-file"
                  onChange={(e) => setFileName(e.target.files?.[0]?.name || "")}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById("adj-file")?.click()}
                  className="text-xs w-full justify-start h-9"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {fileName || "Upload Evidence / Supporting document"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t pt-4">
          <Button variant="outline" size="sm" onClick={onCancel} className="text-xs uppercase font-black tracking-wider">Cancel</Button>
          <Button size="sm" disabled={!selectedEmp} onClick={handleSave} className="bg-amber-600 hover:bg-amber-700 text-white text-xs uppercase font-black tracking-wider">
            Save Adjustment
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ==========================================================
   5. SPECIAL LEAVE CREDITS FORM
   ========================================================== */
function SpecialLeaveCreditsForm({
  employees,
  onCancel,
}: {
  employees: any[];
  onCancel: () => void;
}) {
  const [selectedEmp, setSelectedEmp] = useState<any | null>(null);
  const [specialLeave, setSpecialLeave] = useState("Birthday Leave");
  const [days, setDays] = useState(2);
  const [effectiveDate, setEffectiveDate] = useState("2026-07-06");
  const [expiryDate, setExpiryDate] = useState("2027-07-06");
  const [reason, setReason] = useState("");
  const [remarks, setRemarks] = useState("");

  const handleGrant = () => {
    if (!selectedEmp) return;
    toast({
      title: "Special Leave Granted",
      description: `Granted ${days} days of ${specialLeave} to ${selectedEmp.full_name}.`,
    });
    onCancel();
  };

  return (
    <Card className="border-border/60 bg-card/75 shadow-lg max-w-2xl mx-auto">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 border-b pb-4 mb-4 bg-muted/20">
        <Button variant="ghost" size="icon" onClick={onCancel} className="h-8 w-8 rounded-full hover:bg-rose-500/10 hover:text-rose-600 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center">
          <Gift className="w-5 h-5 text-rose-600" />
        </div>
        <div>
          <CardTitle className="text-base sm:text-lg font-black text-foreground">Special Leave Credits</CardTitle>
          <CardDescription className="text-xs">Grant special-use credits like Birthday, Marriage, or Replacement leaves.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-2">
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3 border-b pb-1">Employee</h4>
          <EmployeeSearchSelector
            employees={employees}
            selectedEmployee={selectedEmp}
            onSelect={setSelectedEmp}
            placeholder="Search staff for special leave..."
          />
        </div>

        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3 border-b pb-1">Special Leave</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-xs font-bold">Leave Type</Label>
              <RadioGroup value={specialLeave} onValueChange={setSpecialLeave} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {["Birthday Leave", "Compassionate Leave", "Marriage Leave", "Replacement Leave", "Emergency Leave"].map((type) => (
                  <div key={type} className="flex items-center space-x-2 border p-2.5 rounded-md bg-white hover:bg-muted/10 cursor-pointer">
                    <RadioGroupItem value={type} id={type} />
                    <Label htmlFor={type} className="text-xs font-bold cursor-pointer">{type}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Days</Label>
              <Input type="number" value={days} onChange={(e) => setDays(Number(e.target.value))} className="bg-white h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Effective Date</Label>
              <Input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className="bg-white h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Expiry Date</Label>
              <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="bg-white h-9" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-bold">Reason</Label>
              <Input placeholder="Enter reason description..." value={reason} onChange={(e) => setReason(e.target.value)} className="bg-white h-9" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-bold">Remarks</Label>
              <Textarea
                rows={3}
                placeholder="Enter remarks..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="bg-white text-xs"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t pt-4">
          <Button variant="outline" size="sm" onClick={onCancel} className="text-xs uppercase font-black tracking-wider">Cancel</Button>
          <Button size="sm" disabled={!selectedEmp} onClick={handleGrant} className="bg-rose-600 hover:bg-rose-700 text-white text-xs uppercase font-black tracking-wider">
            Grant Credit
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ==========================================================
   6. LEAVE FORFEITURE FORM
   ========================================================== */
function LeaveForfeitureForm({
  employees,
  onCancel,
  getUnusedDays,
}: {
  employees: any[];
  onCancel: () => void;
  getUnusedDays: (id: string) => number;
}) {
  const [leaveType, setLeaveType] = useState("Annual Leave");
  const [carryLimit, setCarryLimit] = useState(5);
  const [expiryDate, setExpiryDate] = useState("2027-03-31");
  const [selectedEmp, setSelectedEmp] = useState<any | null>(null);
  const [reason, setReason] = useState("Carry Forward Limit Exceeded");
  const [remarks, setRemarks] = useState("");

  const unused = selectedEmp ? getUnusedDays(selectedEmp.user_id) : 0;
  const eligible = Math.min(unused, carryLimit);
  const forfeit = Math.max(0, unused - eligible);

  const handleForfeit = () => {
    if (!selectedEmp) return;
    toast({
      title: "Leave Forfeited Successful",
      description: `Forfeited ${forfeit} unused days from ${selectedEmp.full_name} successfully.`,
    });
    onCancel();
  };

  return (
    <Card className="border-border/60 bg-card/75 shadow-lg max-w-2xl mx-auto">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 border-b pb-4 mb-4 bg-muted/20">
        <Button variant="ghost" size="icon" onClick={onCancel} className="h-8 w-8 rounded-full hover:bg-red-500/10 hover:text-red-600 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center">
          <ShieldAlert className="w-5 h-5 text-red-600" />
        </div>
        <div>
          <CardTitle className="text-base sm:text-lg font-black text-foreground">Leave Forfeiture</CardTitle>
          <CardDescription className="text-xs">Enforce forfeiture rules on expired carry forwards or policy overflows.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-2">
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3 border-b pb-1">Policy</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Leave Type</Label>
              <Select value={leaveType} onValueChange={setLeaveType}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Annual Leave">Annual Leave</SelectItem>
                  <SelectItem value="Medical Leave">Medical Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Carry Forward Limit</Label>
              <Select value={carryLimit.toString()} onValueChange={(val) => setCarryLimit(Number(val))}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 Days</SelectItem>
                  <SelectItem value="3">3 Days</SelectItem>
                  <SelectItem value="0">0 Days (No roll-over)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Expiry Date</Label>
              <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="bg-white h-9" />
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3 border-b pb-1">Employee</h4>
          <div className="space-y-4">
            <EmployeeSearchSelector
              employees={employees}
              selectedEmployee={selectedEmp}
              onSelect={setSelectedEmp}
              placeholder="Search staff to check..."
            />
            {selectedEmp && (
              <div className="grid grid-cols-3 gap-4 bg-muted/20 p-3 rounded-lg border border-border/50 text-xs">
                <div>
                  <span className="text-muted-foreground block">Unused Leave</span>
                  <span className="font-bold text-foreground text-sm">{unused} Days</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Eligible Carry Forward</span>
                  <span className="font-bold text-emerald-600 text-sm">{eligible} Days</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Days To Forfeit</span>
                  <span className="font-bold text-rose-600 text-sm">{forfeit} Days</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {selectedEmp && (
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3 border-b pb-1">Forfeiture Process</h4>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Reason</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Carry Forward Limit Exceeded">Carry Forward Limit Exceeded</SelectItem>
                    <SelectItem value="Policy Expiry Date Reached">Policy Expiry Date Reached</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Remarks</Label>
                <Textarea
                  rows={2}
                  placeholder="Audit trail remarks..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="bg-white text-xs"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 border-t pt-4">
          <Button variant="outline" size="sm" onClick={onCancel} className="text-xs uppercase font-black tracking-wider">Cancel</Button>
          <Button size="sm" disabled={!selectedEmp || forfeit === 0} onClick={handleForfeit} className="bg-red-600 hover:bg-red-700 text-white text-xs uppercase font-black tracking-wider">
            Process Forfeiture
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ==========================================================
   7. BULK LEAVE ALLOCATION FORM (4-STEP WIZARD)
   ========================================================== */
function BulkLeaveAllocationForm({
  employees,
  onCancel,
}: {
  employees: any[];
  onCancel: () => void;
}) {
  const [step, setStep] = useState(1);
  const [selectedDept, setSelectedDept] = useState("All");
  const [selectedBranch, setSelectedBranch] = useState("All");
  const [empType, setEmpType] = useState("All");
  const [statusFilter, setStatusFilter] = useState("Active");

  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [leaveType, setLeaveType] = useState("Annual Leave");
  const [days, setDays] = useState(14);
  const [effectiveDate, setEffectiveDate] = useState("2027-01-01");
  const [expiryDate, setExpiryDate] = useState("2027-12-31");
  const [reason, setReason] = useState("Annual Allocation");

  // Dynamic filter for Step 1
  const filtered = employees.filter((e) => {
    const bMatch = selectedBranch === "All" || e.branch === selectedBranch;
    const dMatch = selectedDept === "All" || e.department === selectedDept;
    return bMatch && dMatch;
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

  const handleConfirmAllocation = () => {
    toast({
      title: "Bulk Allocation Successful",
      description: `Granted ${days} days of ${leaveType} to ${selectedEmployees.length} employees.`,
    });
    onCancel();
  };

  return (
    <Card className="border-border/60 bg-card/75 shadow-lg">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 border-b pb-4 mb-4 bg-muted/20">
        <Button variant="ghost" size="icon" onClick={onCancel} className="h-8 w-8 rounded-full hover:bg-cyan-500/10 hover:text-cyan-600 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center">
          <Users className="w-5 h-5 text-cyan-600" />
        </div>
        <div>
          <CardTitle className="text-base sm:text-lg font-black text-foreground">Bulk Leave Allocation</CardTitle>
          <CardDescription className="text-xs">Grant leave balances to batches of employees using a step-by-step wizard.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-2">
        {/* Wizard Steps indicator */}
        <div className="flex items-center justify-between border-b pb-4">
          {[
            { num: 1, label: "Select Employees" },
            { num: 2, label: "Allocation Details" },
            { num: 3, label: "Preview" },
            { num: 4, label: "Confirmation" },
          ].map((s) => (
            <div key={s.num} className="flex items-center gap-2 text-xs">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center font-black ${
                  step === s.num
                    ? "bg-cyan-600 text-white"
                    : step > s.num
                    ? "bg-cyan-100 text-cyan-700"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step > s.num ? <Check className="w-3.5 h-3.5" /> : s.num}
              </div>
              <span className={`font-bold ${step === s.num ? "text-cyan-600" : "text-muted-foreground"}`}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* STEP 1: SELECT EMPLOYEES */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Department</Label>
                <Select value={selectedDept} onValueChange={setSelectedDept}>
                  <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {uniqueDepts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Branch</Label>
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {uniqueBranches.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Employment Type</Label>
                <Select value={empType} onValueChange={setEmpType}>
                  <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Types</SelectItem>
                    <SelectItem value="Permanent">Permanent</SelectItem>
                    <SelectItem value="Contract">Contract</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Employment Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border rounded-md max-h-60 overflow-y-auto bg-white">
              <Table className="text-xs">
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="w-[50px] text-center">
                      <input
                        type="checkbox"
                        checked={filtered.length > 0 && selectedEmployees.length === filtered.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="cursor-pointer rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                      />
                    </TableHead>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Department</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((emp) => {
                    const isSel = selectedEmployees.includes(emp.user_id);
                    return (
                      <TableRow key={emp.user_id} className={isSel ? "bg-cyan-500/5" : ""}>
                        <TableCell className="text-center">
                          <input
                            type="checkbox"
                            checked={isSel}
                            onChange={() => handleToggleSelect(emp.user_id)}
                            className="cursor-pointer rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                          />
                        </TableCell>
                        <TableCell className="font-medium">{emp.user_id}</TableCell>
                        <TableCell className="font-bold">{emp.full_name}</TableCell>
                        <TableCell>{emp.branch}</TableCell>
                        <TableCell>{emp.department || "--"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>Selected: <strong>{selectedEmployees.length}</strong> employees</span>
            </div>
          </div>
        )}

        {/* STEP 2: ALLOCATION DETAILS */}
        {step === 2 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto py-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Leave Type</Label>
              <Select value={leaveType} onValueChange={setLeaveType}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Annual Leave">Annual/Emergency Leave</SelectItem>
                  <SelectItem value="Medical Leave">Medical Leave</SelectItem>
                  <SelectItem value="Replacement Leave">Replacement Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Days to Allocate</Label>
              <Input type="number" value={days} onChange={(e) => setDays(Number(e.target.value))} className="bg-white h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Effective Date</Label>
              <Input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className="bg-white h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Expiry Date</Label>
              <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="bg-white h-9" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-bold">Reason</Label>
              <Input placeholder="e.g. Annual Allocation 2027" value={reason} onChange={(e) => setReason(e.target.value)} className="bg-white h-9" />
            </div>
          </div>
        )}

        {/* STEP 3: PREVIEW */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-cyan-50 border border-cyan-200 p-4 rounded-lg flex items-center justify-between text-xs dark:bg-slate-900 dark:border-slate-800">
              <div>
                <span className="text-muted-foreground block">Allocation Overview</span>
                <span className="font-bold text-sm text-cyan-800 dark:text-cyan-400">
                  {selectedEmployees.length} Employees • {leaveType} • {days} Days
                </span>
              </div>
              <div className="text-right">
                <span className="text-muted-foreground block">Effective Date</span>
                <span className="font-bold">{effectiveDate}</span>
              </div>
            </div>

            <div className="border rounded-md max-h-60 overflow-y-auto bg-white">
              <Table className="text-xs">
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead className="text-right">Days Allocated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees
                    .filter((e) => selectedEmployees.includes(e.user_id))
                    .map((emp) => (
                      <TableRow key={emp.user_id}>
                        <TableCell className="font-medium">{emp.user_id}</TableCell>
                        <TableCell className="font-bold">{emp.full_name}</TableCell>
                        <TableCell>{emp.branch}</TableCell>
                        <TableCell className="text-right font-black text-cyan-600">+{days} Days</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* STEP 4: CONFIRMATION */}
        {step === 4 && (
          <div className="max-w-md mx-auto text-center py-8 space-y-4 border rounded-xl bg-muted/10">
            <div className="w-16 h-16 bg-cyan-100 rounded-full flex items-center justify-center mx-auto text-cyan-600">
              <Users className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-lg">Allocation Summary</h3>
              <p className="text-xs text-muted-foreground">Please double check the batch allocation totals.</p>
            </div>
            <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto text-left text-xs bg-white p-4 rounded-lg border">
              <div>
                <span className="text-muted-foreground">Total Employees:</span>
                <div className="font-black text-sm">{selectedEmployees.length}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Total Days:</span>
                <div className="font-black text-sm">{selectedEmployees.length * days} Days</div>
              </div>
              <div className="col-span-2 pt-2 border-t">
                <span className="text-muted-foreground">Leave Type:</span>
                <div className="font-bold">{leaveType}</div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Controls */}
        <div className="flex justify-between items-center border-t pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="text-xs uppercase font-black tracking-wider"
          >
            Cancel
          </Button>

          <div className="flex gap-2">
            {step > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep(step - 1)}
                className="text-xs uppercase font-black tracking-wider"
              >
                Back
              </Button>
            )}
            {step < 4 ? (
              <Button
                size="sm"
                onClick={() => setStep(step + 1)}
                disabled={step === 1 && selectedEmployees.length === 0}
                className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs uppercase font-black tracking-wider"
              >
                Next
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleConfirmAllocation}
                className="bg-cyan-700 hover:bg-cyan-800 text-white text-xs uppercase font-black tracking-wider"
              >
                Confirm Allocation
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ==========================================================
   8. LEAVE BALANCE HISTORY FORM
   ========================================================== */
function LeaveBalanceHistoryForm({
  employees,
  onCancel,
}: {
  employees: any[];
  onCancel: () => void;
}) {
  const [selectedEmp, setSelectedEmp] = useState<any | null>(null);
  const [yearFilter, setYearFilter] = useState("2026");
  const [leaveType, setLeaveType] = useState("All");
  const [actionType, setActionType] = useState("All");

  // Mock History Records
  const historyRecords = [
    {
      date: "2026-07-06",
      action: "Manual Correction",
      performedBy: "Nurul Athirah (HR)",
      reference: "SYS-ADJ-928",
      before: 10,
      after: 12,
      type: "Adjustment",
      leave: "Annual Leave",
      employee: "Ali Ahmad",
    },
    {
      date: "2026-07-05",
      action: "Carry Forward Applied",
      performedBy: "System Job",
      reference: "ROLL-CF-2026",
      before: 0,
      after: 5,
      type: "Carry Forward",
      leave: "Annual Leave",
      employee: "Siti Nur",
    },
    {
      date: "2026-06-12",
      action: "Leave Taken (Approved)",
      performedBy: "Siti Nur (Self)",
      reference: "REQ-LV-1002",
      before: 8,
      after: 5,
      type: "Usage",
      leave: "Annual Leave",
      employee: "Siti Nur",
    },
    {
      date: "2026-01-01",
      action: "Annual Allocation Granted",
      performedBy: "Nurul Athirah (HR)",
      reference: "INIT-ALLOC-2026",
      before: 0,
      after: 14,
      type: "Allocation",
      leave: "Annual Leave",
      employee: "Ali Ahmad",
    },
  ];

  // Filter dynamic history list
  const filteredHistory = historyRecords.filter((rec) => {
    const empMatch = !selectedEmp || rec.employee === selectedEmp.full_name || selectedEmp.full_name?.toLowerCase().includes(rec.employee.toLowerCase());
    const yearMatch = rec.date.startsWith(yearFilter);
    const leaveMatch = leaveType === "All" || rec.leave === leaveType;
    const actionMatch = actionType === "All" || rec.type === actionType;
    return empMatch && yearMatch && leaveMatch && actionMatch;
  });

  return (
    <Card className="border-border/60 bg-card/75 shadow-lg">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 border-b pb-4 mb-4 bg-muted/20">
        <Button variant="ghost" size="icon" onClick={onCancel} className="h-8 w-8 rounded-full hover:bg-slate-500/10 hover:text-slate-600 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="w-9 h-9 rounded-xl bg-slate-500/10 flex items-center justify-center">
          <History className="w-5 h-5 text-slate-600" />
        </div>
        <div>
          <CardTitle className="text-base sm:text-lg font-black text-foreground">Leave Balance History</CardTitle>
          <CardDescription className="text-xs">Track and audit changes to employee leave balances over time.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-2">
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3 border-b pb-1">Filters</h4>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Employee</Label>
              <EmployeeSearchSelector
                employees={employees}
                selectedEmployee={selectedEmp}
                onSelect={setSelectedEmp}
                placeholder="Search staff..."
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Year</Label>
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2026">2026</SelectItem>
                  <SelectItem value="2027">2027</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Leave Type</Label>
              <Select value={leaveType} onValueChange={setLeaveType}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Types</SelectItem>
                  <SelectItem value="Annual Leave">Annual Leave</SelectItem>
                  <SelectItem value="Medical Leave">Medical Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Action Type</Label>
              <Select value={actionType} onValueChange={setActionType}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Actions</SelectItem>
                  <SelectItem value="Allocation">Allocation</SelectItem>
                  <SelectItem value="Carry Forward">Carry Forward</SelectItem>
                  <SelectItem value="Adjustment">Adjustment</SelectItem>
                  <SelectItem value="Usage">Usage</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3 border-b pb-1">History Logs</h4>
          <div className="border rounded-md bg-white">
            <Table className="text-xs">
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="w-[100px]">Date</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>Performed By</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-center">Before</TableHead>
                  <TableHead className="text-center">After</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No balance logs found for selected filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredHistory.map((rec, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{rec.date}</TableCell>
                      <TableCell className="font-bold">{rec.employee}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5">
                          {rec.action}
                        </Badge>
                      </TableCell>
                      <TableCell>{rec.leave}</TableCell>
                      <TableCell>{rec.performedBy}</TableCell>
                      <TableCell className="font-mono text-muted-foreground">{rec.reference}</TableCell>
                      <TableCell className="text-center font-bold text-muted-foreground">{rec.before}d</TableCell>
                      <TableCell className="text-center font-black text-emerald-600">{rec.after}d</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex justify-end border-t pt-4">
          <Button variant="outline" size="sm" onClick={onCancel} className="text-xs uppercase font-black tracking-wider">Close</Button>
        </div>
      </CardContent>
    </Card>
  );
}
