import { writePrintDocument } from '@/utils/security';
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Download, FileBarChart, Loader2, Clock, Sparkles, Building2, Briefcase, PieChart, ShieldCheck, User
} from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { API_BASE_URL } from "../config/api";
import { MonthPicker } from "@/components/shared/MonthPicker";
import { YearPopover } from "@/components/shared/YearPopover";
import { AnimatedCheckbox } from "@/components/ui/animated-checkbox";
import { useCompany } from "@/modules/multi-company/contexts/CompanyContext";

const calculateWorkingHours = (clockIn: string | null | undefined, clockOut: string | null | undefined) => {
  if (!clockIn) return "--";
  
  const start = new Date(clockIn).getTime();
  let end;
  
  if (clockOut) {
    end = new Date(clockOut).getTime();
  } else {
    // If clockOut is missing, check if it's today in UTC+8
    const clockInDate = new Date(clockIn);
    const klNow = new Date(Date.now() + 8 * 60 * 60 * 1000);
    const klClockInTime = new Date(clockInDate.getTime() + 8 * 60 * 60 * 1000);
    
    const isToday = klNow.getUTCFullYear() === klClockInTime.getUTCFullYear() &&
                    klNow.getUTCMonth() === klClockInTime.getUTCMonth() &&
                    klNow.getUTCDate() === klClockInTime.getUTCDate();
    
    if (isToday) {
      end = Date.now();
    } else {
      const klEndOfDay = new Date(klClockInTime);
      klEndOfDay.setUTCHours(23, 59, 59, 999);
      end = klEndOfDay.getTime() - 8 * 60 * 60 * 1000;
    }
  }
  
  const diffMs = end - start;
  if (diffMs < 0) return "--";
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
};

interface Branch {
  code: string;
  name: string;
  company_id?: number;
}

interface Department {
  name: string;
  employee_count?: number;
}

export default function Reports() {
  const { role, roleName, userBranch, userDepartment, userId, userName, scopeType } = useRole();
  const { companies, activeCompany } = useCompany();

  // Resolve Authorization Scope
  const effectiveScope = useMemo(() => {
    const norm = (role || "").toLowerCase().trim();
    if (norm === 'employee') return 'Own Data Only';

    const s = (scopeType || "").toLowerCase().trim();
    if (s.includes('own') || s.includes('self')) return 'Own Data Only';
    if (s.includes('branch')) return 'Branch Data Only';
    if (s.includes('group') || s.includes('parent')) return 'Parent Group Data';
    if (s.includes('company staff')) return 'Company Staff Data';

    // Fallback deducing from role
    if (norm.includes('hr_admin') || norm.includes('hr admin') || norm.includes('admin') || norm.includes('managing_director') || norm.includes('md')) {
      return 'Parent Group Data';
    }
    if (norm.includes('branch_leader') || norm.includes('branch leader') || norm.includes('branch_officer')) {
      return 'Branch Data Only';
    }
    if (norm.includes('operation_manager') || norm.includes('finance_manager') || norm.includes('head_of_department') || norm.includes('hod') || norm.includes('assure')) {
      return 'Company Staff Data';
    }
    return 'Own Data Only';
  }, [scopeType, role]);

  const isOwnDataOnly = effectiveScope === 'Own Data Only';
  const isBranchOnly = effectiveScope === 'Branch Data Only';
  const isCompanyOnly = effectiveScope === 'Company Staff Data';
  const isParentGroup = effectiveScope === 'Parent Group Data';
  
  const normRole = (role || "").toLowerCase().trim();
  const isHRAdmin = ['hr_admin', 'admin', 'hr'].includes(normRole);
  const isMD_OM = ['managing_director', 'operation_manager', 'finance_manager', 'md'].includes(normRole);
  const isFullAdmin = isParentGroup || isHRAdmin || isMD_OM;
  const isBranchLeader = normRole === 'branch_leader';
  const isHOD = normRole === 'head_of_department' || normRole === 'hod';
  const isEmployee = normRole === 'employee' || normRole === 'branch_officer';

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("presenceSidebarCollapsed") === "true";
    }
    return false;
  });

  useEffect(() => {
    const handleSidebarChange = () => {
      setSidebarCollapsed(localStorage.getItem("presenceSidebarCollapsed") === "true");
    };
    window.addEventListener("presenceSidebarCollapsedChanged", handleSidebarChange);
    return () => {
      window.removeEventListener("presenceSidebarCollapsedChanged", handleSidebarChange);
    };
  }, []);

  // Dynamic Lists from Database
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);

  // Multi-Company Checkbox Filter for HR
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<number[]>(() => {
    return activeCompany?.id ? [activeCompany.id] : [1];
  });

  useEffect(() => {
    const handleCompanySwitched = (e: any) => {
      const newId = e.detail?.company_id || e.detail?.company?.id;
      if (newId) {
        setSelectedCompanyIds([newId]);
      }
    };
    window.addEventListener('rayhar_company_switched', handleCompanySwitched);
    return () => window.removeEventListener('rayhar_company_switched', handleCompanySwitched);
  }, []);

  // Filtered branches based on company selection
  const filteredBranches = useMemo(() => {
    if (!branches || !Array.isArray(branches)) return [];
    if (!isFullAdmin || selectedCompanyIds.length === 0 || selectedCompanyIds.length === (companies?.length || 0)) {
      return branches;
    }
    return branches.filter((b: any) => {
      const bCompanyId = b.company_id || (b.code?.toUpperCase() === 'RAYRENT' ? 2 : 1);
      return selectedCompanyIds.includes(bCompanyId);
    });
  }, [branches, selectedCompanyIds, companies?.length, isFullAdmin]);

  // Report Generator State
  const [generatorType, setGeneratorType] = useState<"stability" | "trends" | "leave" | "financial" | "outstation" | "company_leave">("trends");
  const [generatorDept, setGeneratorDept] = useState("all");
  const [generatorBranch, setGeneratorBranch] = useState("all");
  const [generatorFormat, setGeneratorFormat] = useState<"pdf" | "excel" | "csv">("pdf");
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewCount, setPreviewCount] = useState(0);

  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [periodMode, setPeriodMode] = useState<"year" | "month">("month");

  useEffect(() => {
    if (generatorBranch !== 'all' && filteredBranches.length > 0 && !filteredBranches.some(b => b.code === generatorBranch)) {
      setGeneratorBranch('all');
    }
  }, [filteredBranches, generatorBranch]);

  // Sync scope-based default branch and department
  useEffect(() => {
    if (isOwnDataOnly) {
      if (userBranch) setGeneratorBranch(userBranch);
      if (userDepartment) setGeneratorDept(userDepartment);
    } else if (isBranchOnly && userBranch) {
      setGeneratorBranch(userBranch);
    } else if (normRole === "branch_leader" && userBranch) {
      setGeneratorBranch(userBranch);
    } else if ((normRole === "head_of_department" || normRole === "hod") && userDepartment) {
      setGeneratorDept(userDepartment);
    }
  }, [isOwnDataOnly, isBranchOnly, normRole, userBranch, userDepartment]);

  const fetchPreviewCount = useCallback(async () => {
    try {
      const effectiveBranch = isOwnDataOnly
        ? (userBranch || generatorBranch)
        : (isBranchOnly || isBranchLeader)
        ? (userBranch || generatorBranch)
        : generatorBranch;
      
      const effectiveDept = isOwnDataOnly
        ? (userDepartment || generatorDept)
        : (isHOD ? (userDepartment || generatorDept) : generatorDept);

      let companiesParam = String(activeCompany?.id || 1);
      if (isParentGroup) {
        if (selectedCompanyIds.length === 0 || selectedCompanyIds.length === (companies?.length || 0)) {
          companiesParam = "all";
        } else {
          companiesParam = selectedCompanyIds.join(",");
        }
      }

      const params = new URLSearchParams({
        type: generatorType,
        month: selectedMonth,
        year: selectedYear,
        branch: effectiveBranch || "all",
        department: effectiveDept || "all",
        companies: companiesParam,
        company_id: String(activeCompany?.id || 1),
        scope_type: effectiveScope,
        requesterRole: role || "",
        requesterBranch: userBranch || "",
        requesterDept: userDepartment || "",
        requesterId: userId || ""
      });
      const response = await fetch(`${API_BASE_URL}/api/reports/generator?${params}`);
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setPreviewCount(data.data.length);
      } else {
        setPreviewCount(0);
      }
    } catch (e) {
      console.error("Error fetching preview count:", e);
      setPreviewCount(0);
    }
  }, [generatorType, selectedMonth, selectedYear, generatorBranch, generatorDept, selectedCompanyIds, companies?.length, isParentGroup, isOwnDataOnly, isBranchOnly, isBranchLeader, isHOD, activeCompany?.id, effectiveScope, role, userBranch, userDepartment, userId]);

  useEffect(() => {
    fetchPreviewCount();
  }, [fetchPreviewCount]);

  const months = useMemo(() => [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ], []);

  // Load Initial Lists
  const fetchLists = useCallback(async () => {
    try {
      const branchRes = await fetch(`${API_BASE_URL}/api/branches`);
      const branchData = await branchRes.json();
      if (branchData.success && Array.isArray(branchData.branches)) {
        setBranches(branchData.branches);
      }

      const deptRes = await fetch(`${API_BASE_URL}/api/departments`);
      const deptData = await deptRes.json();
      if (deptData.success && Array.isArray(deptData.departments)) {
        setDepartments(deptData.departments.map((d: any) => d.name).filter(Boolean));
      }
    } catch (e) {
      console.error("Error loading system lists:", e);
    }
  }, []);

  useEffect(() => {
    fetchLists();
    const handleUpdate = () => { fetchLists(); };
    window.addEventListener('app:refresh', handleUpdate);
    window.addEventListener('rayhar_branches_updated', handleUpdate);
    return () => {
      window.removeEventListener('app:refresh', handleUpdate);
      window.removeEventListener('rayhar_branches_updated', handleUpdate);
    };
  }, [fetchLists]);

  // Generate Report action using real data
  const triggerGenerateReport = async () => {
    setIsGenerating(true);
    try {
      const effectiveBranch = isOwnDataOnly
        ? (userBranch || generatorBranch)
        : (isBranchOnly || isBranchLeader)
        ? (userBranch || generatorBranch)
        : generatorBranch;
      
      const effectiveDept = isOwnDataOnly
        ? (userDepartment || generatorDept)
        : (isHOD ? (userDepartment || generatorDept) : generatorDept);

      let companiesParam = String(activeCompany?.id || 1);
      if (isParentGroup) {
        if (selectedCompanyIds.length === 0 || selectedCompanyIds.length === (companies?.length || 0)) {
          companiesParam = "all";
        } else {
          companiesParam = selectedCompanyIds.join(",");
        }
      }

      const params = new URLSearchParams({
        type: generatorType,
        month: selectedMonth,
        year: selectedYear,
        branch: effectiveBranch || "all",
        department: effectiveDept || "all",
        companies: companiesParam,
        company_id: String(activeCompany?.id || 1),
        scope_type: effectiveScope,
        requesterRole: role || "",
        requesterBranch: userBranch || "",
        requesterDept: userDepartment || "",
        requesterId: userId || ""
      });
      
      const response = await fetch(`${API_BASE_URL}/api/reports/generator?${params}`);
      const data = await response.json();
      
      if (data.success) {
        const reportPrefix = isOwnDataOnly ? `Personal_${(userName || 'My').replace(/\s+/g, '_')}_` : 'Rayhar_';
        const reportName = selectedMonth === 'all'
          ? `${reportPrefix}${generatorType.toUpperCase()}_Report_${selectedYear}.csv`
          : `${reportPrefix}${generatorType.toUpperCase()}_Report_${selectedMonth}_${selectedYear}.csv`;
        let headers: string[] = [];
        let rows: any[] = [];
        
        if (generatorType === "trends" || generatorType === "stability") {
          headers = ["Employee ID", "Employee Name", "Company", "Branch", "Date", "Status", "Clock In", "Clock Out", "Total Hours"];
          rows = data.data.map((r: any) => {
             const dateStr = r.date || (r.clock_in ? new Date(r.clock_in).toLocaleDateString() : "--");
             const timeIn = r.clock_in ? new Date(r.clock_in).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }) : "--:--";
             const timeOut = r.clock_out ? new Date(r.clock_out).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }) : "--:--";
             const statusStr = r.status || "Present";
             const totalHrs = r.total_hours || calculateWorkingHours(r.clock_in, r.clock_out);
             const compName = r.company_name || (r.branch === 'RAYRENT' ? 'RayRent' : 'Rayhar Travels');
             return [r.user_id, r.full_name, compName, r.branch, dateStr, statusStr, timeIn, timeOut, totalHrs];
          });
        } else if (generatorType === "outstation") {
          headers = ["Event Name", "Destination", "Start Date", "End Date", "Days", "Status", "Employee Name", "Company", "Department", "Branch"];
          rows = data.data.map((r: any) => [
            r.event_name, r.destination, 
            new Date(r.start_date).toLocaleDateString(), 
            new Date(r.end_date).toLocaleDateString(), 
            r.total_days, r.status, r.full_name, r.company_name || (r.branch === 'RAYRENT' ? 'RayRent' : 'Rayhar Travels'), r.department, r.branch
          ]);
        } else if (generatorType === "company_leave") {
          headers = ["Leave Name", "Type", "Start Date", "End Date", "Applies To", "Branch", "Department", "Status"];
          rows = data.data.map((r: any) => [
            r.leave_name, r.leave_type || "N/A", 
            new Date(r.start_date).toLocaleDateString(), 
            new Date(r.end_date).toLocaleDateString(), 
            r.applies_to, r.branch_id || "All", r.department_id || "All", r.status
          ]);
        } else {
          headers = ["Employee ID", "Employee Name", "Company", "Branch", "Department", "Leave Type", "Days", "Status"];
          rows = data.data.map((r: any) => [r.user_id, r.full_name, r.company_name || (r.branch === 'RAYRENT' ? 'RayRent' : 'Rayhar Travels'), r.branch, r.department, r.leave_type, r.days, r.status]);
        }
        
        if (rows.length === 0) {
           toast.error("No data found for the selected filters.");
           setIsGenerating(false);
           return;
        }
        
        const escapeCsv = (val: any) => {
          if (val === null || val === undefined) return '';
          const str = String(val);
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        };

        if (generatorFormat === 'pdf') {
          const printWindow = window.open("", "_blank");
          if (!printWindow) {
            toast.error("Could not open print window. Please allow popups.");
            return;
          }
          
          const rowsHtml = rows.map(r => `<tr>${r.map((c: any) => `<td>${escapeCsv(c)}</td>`).join('')}</tr>`).join('');
          const headersHtml = headers.map(h => `<th>${h}</th>`).join('');
          
          writePrintDocument(printWindow, `
            <html>
              <head>
                <title>${reportName.replace('.csv', '')}</title>
                <style>
                  body { font-family: 'Inter', sans-serif; padding: 20px; color: #1e293b; }
                  h2 { color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; font-size: 24px; font-weight: 800; }
                  table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
                  th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
                  th { background: #f8fafc; font-weight: 700; color: #475569; }
                </style>
              </head>
              <body>
                <h2>${reportName.replace('.csv', '').replace(/_/g, ' ')}</h2>
                <table>
                  <thead><tr>${headersHtml}</tr></thead>
                  <tbody>${rowsHtml}</tbody>
                </table>
              </body>
            </html>
          `, { autoPrint: true, closeAfterPrint: true });
          toast.success(`${generatorType.toUpperCase()} Analytical Report PDF generated successfully!`);
        } else if (generatorFormat === 'excel') {
          const csvContent = [
            headers.join(","),
            ...rows.map(row => row.map(escapeCsv).join(","))
          ].join("\n");
          const blob = new Blob(["\ufeff", csvContent], { type: "application/vnd.ms-excel;charset=utf-8;" });
          const link = document.createElement("a");
          const url = URL.createObjectURL(blob);
          link.setAttribute("href", url);
          link.setAttribute("download", reportName.replace('.csv', '.xlsx'));
          link.style.visibility = 'hidden';
          link.click();
          toast.success(`${generatorType.toUpperCase()} Analytical Report Excel sheet generated!`);
        } else {
          const csvContent = [
            headers.join(","),
            ...rows.map(row => row.map(escapeCsv).join(","))
          ].join("\n");
          const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
          const link = document.createElement("a");
          const url = URL.createObjectURL(blob);
          link.setAttribute("href", url);
          link.setAttribute("download", reportName);
          link.style.visibility = 'hidden';
          link.click();
          toast.success(`${generatorType.toUpperCase()} Analytical Report CSV generated successfully!`);
        }
      } else {
         toast.error("Failed to generate report");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error generating report");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={`p-4 ${sidebarCollapsed ? "md:p-8" : "md:p-6"} space-y-6 w-full transition-all duration-300`}>
      <Card className="border border-white/60 bg-white/40 dark:bg-card/40 backdrop-blur-2xl shadow-2xl rounded-[32px] overflow-hidden relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#942392] to-transparent opacity-50" />
        <CardContent className="p-6 sm:p-8">
          {/* GENERATE REPORT SECTION */}
          <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 items-start">
              
              {/* Generator Settings Form */}
              <Card className="border-none shadow-sm bg-card/60 backdrop-blur-md rounded-[28px] lg:col-span-2 p-4 space-y-4 hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-foreground uppercase tracking-tight">Configure Analytical Report</h3>
                  <p className="text-[10px] sm:text-xs font-bold text-foreground uppercase tracking-wider">Generate targeted PDF/CSV datasets compiled directly from live database logs</p>
                </div>

                {/* 1. Report Type Selection */}
                <div className="space-y-2">
                  <span className="text-[10px] font-black text-foreground uppercase tracking-widest">1. Report Type Selection</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <button
                      type="button"
                      onClick={() => setGeneratorType("trends")}
                      className={`p-4 rounded-xl border-2 text-left flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${
                        generatorType === "trends"
                          ? "border-[#942392] dark:border-fuchsia-500 bg-[#942392]/5 dark:bg-[#942392]/20 text-foreground"
                          : "border-border/40 dark:border-slate-800 bg-white/40 dark:bg-card/20 text-foreground hover:bg-muted/40 hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          generatorType === "trends" ? "bg-[#942392]/15 dark:bg-[#942392]/30 text-[#942392] dark:text-fuchsia-300" : "bg-muted dark:bg-slate-800 text-foreground"
                        }`}>
                          <Clock className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">Attendance Trends</span>
                      </div>
                      <hr className="border-border/50 dark:border-slate-800 my-2.5 w-full" />
                      <span className="text-[10px] font-medium leading-normal text-foreground dark:text-slate-300">Clock-in, late check audits, and raw timelines</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setGeneratorType("leave")}
                      className={`p-4 rounded-xl border-2 text-left flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${
                        generatorType === "leave"
                          ? "border-[#942392] dark:border-fuchsia-500 bg-[#942392]/5 dark:bg-[#942392]/20 text-foreground"
                          : "border-border/40 dark:border-slate-800 bg-white/40 dark:bg-card/20 text-foreground hover:bg-muted/40 hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          generatorType === "leave" ? "bg-[#942392]/15 dark:bg-[#942392]/30 text-[#942392] dark:text-fuchsia-300" : "bg-muted dark:bg-slate-800 text-foreground"
                        }`}>
                          <PieChart className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">Leave Utilization</span>
                      </div>
                      <hr className="border-border/50 dark:border-slate-800 my-2.5 w-full" />
                      <span className="text-[10px] font-medium leading-normal text-foreground dark:text-slate-300">Department utilization rates and absence charts</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setGeneratorType("outstation")}
                      className={`p-4 rounded-xl border-2 text-left flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${
                        generatorType === "outstation"
                          ? "border-[#942392] dark:border-fuchsia-500 bg-[#942392]/5 dark:bg-[#942392]/20 text-foreground"
                          : "border-border/40 dark:border-slate-800 bg-white/40 dark:bg-card/20 text-foreground hover:bg-muted/40 hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          generatorType === "outstation" ? "bg-[#942392]/15 dark:bg-[#942392]/30 text-[#942392] dark:text-fuchsia-300" : "bg-muted dark:bg-slate-800 text-foreground"
                        }`}>
                          <Briefcase className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">Outstation Assignment</span>
                      </div>
                      <hr className="border-border/50 dark:border-slate-800 my-2.5 w-full" />
                      <span className="text-[10px] font-medium leading-normal text-foreground dark:text-slate-300">Official business travel and assignment activities</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setGeneratorType("company_leave")}
                      className={`p-4 rounded-xl border-2 text-left flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${
                        generatorType === "company_leave"
                          ? "border-[#942392] dark:border-fuchsia-500 bg-[#942392]/5 dark:bg-[#942392]/20 text-foreground"
                          : "border-border/40 dark:border-slate-800 bg-white/40 dark:bg-card/20 text-foreground hover:bg-muted/40 hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          generatorType === "company_leave" ? "bg-[#942392]/15 dark:bg-[#942392]/30 text-[#942392] dark:text-fuchsia-300" : "bg-muted dark:bg-slate-800 text-foreground"
                        }`}>
                          <Building2 className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">Company Leave Calendar</span>
                      </div>
                      <hr className="border-border/50 dark:border-slate-800 my-2.5 w-full" />
                      <span className="text-[10px] font-medium leading-normal text-foreground dark:text-slate-300">Corporate holidays and organization-wide leave schedule</span>
                    </button>
                  </div>
                </div>

                {/* 2. Scope Select */}
                <div className="space-y-2">
                  <span className="text-[10px] font-black text-foreground uppercase tracking-widest">2. Scope Selection</span>

                  {/* Informational Scope Badge for Own Data Only */}
                  {isOwnDataOnly && (
                    <div className="p-3.5 rounded-2xl border-2 border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                            <span>Authorization Scope: Own Data Only</span>
                            <Badge variant="outline" className="text-[8px] border-emerald-500/30 text-emerald-600 bg-emerald-100/50 dark:bg-emerald-900/30 font-black uppercase px-1.5 py-0">
                              Self
                            </Badge>
                          </div>
                          <p className="text-[10px] text-muted-foreground font-semibold truncate">
                            Report compiling records for <strong className="text-foreground">{userName || "yourself"}</strong> only. Other staff records are restricted.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Multi-Company Checkbox Filter (Only for Parent Group Data) */}
                  {isParentGroup && (
                    <div className="p-3.5 rounded-2xl border-2 border-[#942392]/20 bg-[#942392]/5 dark:bg-[#942392]/10 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-[#942392]" />
                          <span className="text-[10px] font-black text-foreground uppercase tracking-widest">
                            Company Scope Filter
                          </span>
                          <span className="text-[9px] text-muted-foreground font-semibold hidden sm:inline">
                            (Check all companies or select individual companies to export)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (companies && selectedCompanyIds.length === companies.length) {
                              setSelectedCompanyIds([1]);
                            } else if (companies) {
                              setSelectedCompanyIds(companies.map(c => c.id));
                            }
                          }}
                          className="text-[10px] font-black text-[#942392] hover:underline cursor-pointer"
                        >
                          {companies && selectedCompanyIds.length === companies.length ? "Reset to Main Only" : "Select All Companies"}
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        {/* All Companies Toggle */}
                        <div
                          onClick={() => {
                            if (companies && selectedCompanyIds.length === companies.length) {
                              setSelectedCompanyIds([1]);
                            } else if (companies) {
                              setSelectedCompanyIds(companies.map(c => c.id));
                            }
                          }}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-xs font-bold transition-all duration-200 cursor-pointer ${
                            companies && selectedCompanyIds.length === companies.length && companies.length > 0
                              ? "bg-[#942392] border-[#942392] text-white shadow-sm"
                              : "bg-card/70 border-border/60 text-foreground hover:border-[#942392]/50"
                          }`}
                        >
                          <AnimatedCheckbox
                            checked={Boolean(companies && selectedCompanyIds.length === companies.length && companies.length > 0)}
                            readOnly
                            color="#ffffff"
                            size={16}
                          />
                          <span className="text-[10px] uppercase tracking-wider font-black">All Companies</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-black ${
                            companies && selectedCompanyIds.length === companies.length
                              ? "bg-white/20 text-white"
                              : "bg-muted text-foreground"
                          }`}>
                            {companies?.length || 0}
                          </span>
                        </div>

                        {/* Individual Company Checkboxes */}
                        {(companies || []).map((comp) => {
                          const isChecked = selectedCompanyIds.includes(comp.id);
                          return (
                            <div
                              key={comp.id}
                              onClick={() => {
                                setSelectedCompanyIds(prev => {
                                  if (prev.includes(comp.id)) {
                                    const next = prev.filter(id => id !== comp.id);
                                    return next.length > 0 ? next : [comp.id];
                                  } else {
                                    return [...prev, comp.id];
                                  }
                                });
                              }}
                              className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-xs font-bold transition-all duration-200 cursor-pointer ${
                                isChecked
                                  ? "bg-[#942392]/10 border-[#942392] text-[#942392] dark:text-fuchsia-300 shadow-xs"
                                  : "bg-card/70 border-border/60 text-foreground hover:border-[#942392]/50"
                              }`}
                            >
                              <AnimatedCheckbox
                                checked={isChecked}
                                readOnly
                                color="#942392"
                                size={16}
                              />
                              <span className="text-[10px] uppercase tracking-wider font-black">{comp.company_name}</span>
                              <Badge 
                                variant="outline" 
                                className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0 h-4 border ${
                                  comp.company_type === 'main'
                                    ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50"
                                    : "border-purple-500/30 text-purple-600 dark:purple-400 bg-purple-50/50"
                                }`}
                              >
                                {comp.company_type === 'main' ? 'Main' : 'Subsidiary'}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    {/* Branch Selection or Locked Branch */}
                    {isOwnDataOnly ? (
                      <div className="space-y-1.5 min-w-0">
                        <label className="text-[9px] font-black text-foreground uppercase tracking-widest">Branch Location</label>
                        <div className="w-full h-11 px-3.5 flex items-center justify-between text-xs font-black uppercase tracking-widest rounded-xl border border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 truncate shadow-xs">
                          <span>{userBranch || "Your Branch"}</span>
                          <Badge variant="outline" className="text-[8px] border-emerald-500/40 text-emerald-600 font-black uppercase tracking-wider">YOUR BRANCH</Badge>
                        </div>
                      </div>
                    ) : (isBranchOnly || isBranchLeader) ? (
                      <div className="space-y-1.5 min-w-0">
                        <label className="text-[9px] font-black text-foreground uppercase tracking-widest">Branch Location (Locked)</label>
                        <div className="w-full h-11 px-3.5 flex items-center justify-between text-xs font-black uppercase tracking-widest rounded-xl border border-[#942392]/30 bg-[#942392]/5 text-[#942392] truncate shadow-xs">
                          <span>{userBranch || "Your Branch"}</span>
                          <Badge variant="outline" className="text-[8px] border-[#942392]/40 text-[#942392] font-black uppercase tracking-wider">YOUR BRANCH</Badge>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5 min-w-0">
                        <label className="text-[9px] font-black text-foreground uppercase tracking-widest">Branch Location</label>
                        <Select value={generatorBranch} onValueChange={setGeneratorBranch}>
                          <SelectTrigger className="w-full h-11 text-xs font-black uppercase tracking-widest rounded-xl border-border bg-background/30">
                            <SelectValue placeholder="All Branches" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="all" className="text-[10px] font-black uppercase tracking-widest">All Branches</SelectItem>
                            {filteredBranches.filter(b => !!b.code).map(b => (
                              <SelectItem key={b.code} value={b.code} className="text-[10px] font-black uppercase tracking-widest">
                                {b.code} - {b.name ? b.name.toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase()) : b.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Department Selection or Locked Department */}
                    {isOwnDataOnly ? (
                      <div className="space-y-1.5 min-w-0">
                        <label className="text-[9px] font-black text-foreground uppercase tracking-widest">Department</label>
                        <div className="w-full h-11 px-3.5 flex items-center justify-between text-xs font-black uppercase tracking-widest rounded-xl border border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 truncate shadow-xs">
                          <span>{userDepartment || "Your Department"}</span>
                          <Badge variant="outline" className="text-[8px] border-emerald-500/40 text-emerald-600 font-black uppercase tracking-wider">YOUR DEPT</Badge>
                        </div>
                      </div>
                    ) : isHOD ? (
                      <div className="space-y-1.5 min-w-0">
                        <label className="text-[9px] font-black text-foreground uppercase tracking-widest">Department (Locked)</label>
                        <div className="w-full h-11 px-3.5 flex items-center justify-between text-xs font-black uppercase tracking-widest rounded-xl border border-[#942392]/30 bg-[#942392]/5 text-[#942392] truncate shadow-xs">
                          <span>{userDepartment || "Your Department"}</span>
                          <Badge variant="outline" className="text-[8px] border-[#942392]/40 text-[#942392] font-black uppercase tracking-wider">YOUR DEPT</Badge>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5 min-w-0">
                        <label className="text-[9px] font-black text-foreground uppercase tracking-widest">Department</label>
                        <Select value={generatorDept} onValueChange={setGeneratorDept}>
                          <SelectTrigger className="w-full h-11 text-xs font-black uppercase tracking-widest rounded-xl border-border bg-background/30">
                            <SelectValue placeholder="All Departments" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="all" className="text-[10px] font-black uppercase tracking-widest">All Departments</SelectItem>
                            {departments.filter(Boolean).map(d => (
                              <SelectItem key={d} value={d} className="text-[10px] font-black uppercase tracking-widest">
                                {d ? d.toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase()) : d}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="space-y-1.5 col-span-2 sm:col-span-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <label className="text-[9px] font-black text-foreground uppercase tracking-widest">Period</label>
                        <div className="flex items-center bg-white dark:bg-slate-900 rounded-full p-1 border border-slate-200 dark:border-slate-800 shadow-sm gap-0.5">
                          <button 
                            type="button"
                            onClick={() => { setPeriodMode("year"); setSelectedMonth("all"); }} 
                            className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase transition-all ${periodMode === 'year' ? 'bg-[#ffff00] text-[#942392] shadow-sm' : 'text-slate-600 dark:text-white hover:text-[#942392] dark:hover:text-[#ffff00]'}`}
                          >
                            Year
                          </button>
                          <button 
                            type="button"
                            onClick={() => { setPeriodMode("month"); setSelectedMonth((new Date().getMonth() + 1).toString()); }} 
                            className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase transition-all ${periodMode === 'month' ? 'bg-[#ffff00] text-[#942392] shadow-sm' : 'text-slate-600 dark:text-white hover:text-[#942392] dark:hover:text-[#ffff00]'}`}
                          >
                            Month
                          </button>
                        </div>
                      </div>
                      {periodMode === 'year' ? (
                        <YearPopover
                          year={selectedYear}
                          onSelectYear={(y) => { setSelectedYear(y); setSelectedMonth("all"); }}
                          className="w-full h-11 px-3.5 flex items-center justify-between text-xs font-black uppercase tracking-widest rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/80 text-foreground dark:text-white outline-none cursor-pointer hover:border-[#942392] dark:hover:border-[#942392] transition-colors focus:ring-1 focus:ring-[#942392]"
                        />
                      ) : (
                        <MonthPicker
                          hideAllYear={true}
                          monthYear={selectedMonth === 'all' ? `${selectedYear}-${String(new Date().getMonth()+1).padStart(2, '0')}` : `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`}
                          onSelectMonthYear={(val) => {
                            const [y, m] = val.split('-');
                            setSelectedYear(y);
                            setSelectedMonth(m);
                          }}
                          className="w-full h-11 px-3.5 flex items-center justify-between text-xs font-black uppercase tracking-widest rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/80 text-foreground dark:text-white outline-none cursor-pointer hover:border-[#942392] dark:hover:border-[#942392] transition-colors focus:ring-1 focus:ring-[#942392]"
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. Export Format */}
                <div className="space-y-2">
                  <span className="text-[10px] font-black text-foreground uppercase tracking-widest">3. Export Format</span>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setGeneratorFormat("csv")}
                      className={`py-3 px-4 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${
                        generatorFormat === "csv"
                          ? "border-[#942392] dark:border-fuchsia-500/50 bg-[#942392]/5 dark:bg-[#942392]/20 text-[#942392] dark:text-fuchsia-300 font-black"
                          : "border-border/50 dark:border-slate-800 bg-background/20 dark:bg-slate-900/40 text-foreground dark:text-slate-300 font-semibold hover:bg-muted/40 hover:text-foreground"
                      }`}
                    >
                      <Download className="w-4 h-4" />
                      <span className="text-[10px] uppercase tracking-wider">Raw CSV</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setGeneratorFormat("excel")}
                      className={`py-3 px-4 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${
                        generatorFormat === "excel"
                          ? "border-[#942392] dark:border-fuchsia-500/50 bg-[#942392]/5 dark:bg-[#942392]/20 text-[#942392] dark:text-fuchsia-300 font-black"
                          : "border-border/50 dark:border-slate-800 bg-background/20 dark:bg-slate-900/40 text-foreground dark:text-slate-300 font-semibold hover:bg-muted/40 hover:text-foreground"
                      }`}
                    >
                      <FileBarChart className="w-4 h-4" />
                      <span className="text-[10px] uppercase tracking-wider">Excel Sheet</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setGeneratorFormat("pdf")}
                      className={`py-3 px-4 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${
                        generatorFormat === "pdf"
                          ? "border-[#942392] dark:border-fuchsia-500/50 bg-[#942392]/5 dark:bg-[#942392]/20 text-[#942392] dark:text-fuchsia-300 font-black"
                          : "border-border/50 dark:border-slate-800 bg-background/20 dark:bg-slate-900/40 text-foreground dark:text-slate-300 font-semibold hover:bg-muted/40 hover:text-foreground"
                      }`}
                    >
                      <FileBarChart className="w-4 h-4" />
                      <span className="text-[10px] uppercase tracking-wider">PDF report</span>
                    </button>
                  </div>
                </div>
              </Card>

              {/* Synthesis Preview Panel */}
              <Card className="border-none shadow-sm bg-card/60 backdrop-blur-md rounded-[28px] overflow-hidden p-4 flex flex-col gap-4 hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
                <div>
                  <h4 className="text-xs font-black text-foreground uppercase tracking-widest">Synthesis Preview</h4>
                  <p className="text-[9px] font-bold text-foreground uppercase tracking-wider mt-0.5">Real-time compilation preview</p>
                </div>

                {/* Counter Display */}
                <div className="bg-muted/30 dark:bg-slate-900/60 border border-border/40 dark:border-slate-800 rounded-2xl p-5 text-center flex flex-col gap-1 items-center justify-center select-none shadow-inner">
                  <span className="text-[9px] font-black text-foreground dark:text-slate-300 uppercase tracking-widest">Live Compiled Dataset</span>
                  <span className="text-3xl font-black text-[#942392] dark:text-fuchsia-300 font-mono mt-1 drop-shadow-sm">
                    {previewCount.toLocaleString()} Records
                  </span>
                  <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mt-1 flex items-center gap-1.5 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Synced Live via Database
                  </span>
                </div>

                {/* Active Scope Summary */}
                <div className="space-y-2">
                  <span className="text-[9px] font-black text-foreground uppercase tracking-widest">Active Scope Preview</span>
                  <div className="bg-background/40 border border-border/40 rounded-xl p-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-muted-foreground uppercase text-[9px]">Scope:</span>
                      <span className="inline-flex items-center gap-1">
                        <span className="font-black text-[11px] text-foreground">{effectiveScope}</span>
                        <Badge variant="outline" className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0 h-4 border ${
                          isOwnDataOnly ? "border-emerald-500/30 text-emerald-600 bg-emerald-50/50" :
                          isBranchOnly ? "border-amber-500/30 text-amber-700 bg-amber-50/50" :
                          isCompanyOnly ? "border-purple-500/30 text-[#942392] bg-purple-50/50" :
                          "border-blue-500/30 text-blue-700 bg-blue-50/50"
                        }`}>
                          {isOwnDataOnly ? "Self" : isBranchOnly ? "Branch" : isCompanyOnly ? "Company" : "Group HQ"}
                        </Badge>
                      </span>
                    </div>
                    {isOwnDataOnly && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-muted-foreground uppercase text-[9px]">Staff:</span>
                        <span className="font-black text-foreground text-right truncate max-w-[150px]">{userName || "Yourself"}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-muted-foreground uppercase text-[9px]">Company:</span>
                      <span className="font-black text-[#942392] dark:text-fuchsia-300 text-right truncate max-w-[150px]">
                        {isParentGroup
                          ? (companies && selectedCompanyIds.length === companies.length && companies.length > 0
                              ? "ALL COMPANIES (" + companies.length + ")"
                              : (companies || []).filter(c => selectedCompanyIds.includes(c.id)).map(c => c.company_name).join(", ") || activeCompany?.company_name || "None")
                          : (activeCompany?.company_name || "Current Company")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-muted-foreground uppercase text-[9px]">Branch:</span>
                      <span className="font-bold text-foreground text-right">
                        {isOwnDataOnly ? (userBranch || "Your Branch") : (isBranchOnly || isBranchLeader) ? `${userBranch || "Your Branch"} (Locked)` : (generatorBranch === 'all' ? 'All Branches' : generatorBranch)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-muted-foreground uppercase text-[9px]">Department:</span>
                      <span className="font-bold text-foreground text-right truncate max-w-[140px]">
                        {isOwnDataOnly ? (userDepartment || "Your Dept") : (generatorDept === 'all' ? 'All Departments' : generatorDept)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-muted-foreground uppercase text-[9px]">Period:</span>
                      <span className="font-bold text-foreground text-right">
                        {periodMode === 'year' ? selectedYear : `${months.find(m => m.value === selectedMonth)?.label || selectedMonth} ${selectedYear}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Compile Button */}
                <Button
                  type="button"
                  onClick={triggerGenerateReport}
                  disabled={isGenerating}
                  className="w-full py-6 rounded-[18px] bg-[#FFFE00] hover:bg-[#E6E500] text-[#942392] ring-2 ring-[#942392] font-black text-xs uppercase tracking-widest shadow-xl shadow-[#942392]/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Generating Report...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Report
                    </>
                  )}
                </Button>
              </Card>

            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
