import profileSkyBanner from "@/assets/profile-sky-banner.png";
import { UserAvatar, getSavedAvatar } from "@/utils/avatarUtils";
import { AvatarPickerModal } from "@/components/profile/AvatarPickerModal";
import { CustomTimePicker } from "@/components/ui/custom-time-picker";
import { sanitizeUrl, safeFileUrl, downloadUploadedFile, getMcAttachmentUrl, preloadImage, isPdfUrl } from '@/utils/security';
import { formatBranchName } from '@/utils/branchUtils';
import { MonthPicker } from '@/components/shared/MonthPicker';
import { YearPopover } from '@/components/shared/YearPopover';
import { ApprovalHistoryTimeline } from "@/components/leave/ApprovalHistoryTimeline";
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Loader2, 
  CalendarCheck, 
  TrendingUp, 
  Clock,
  CalendarDays,
  ArrowLeft,
  Edit,
  Save, 
  FileText, 
  Users,
  Briefcase,
  X,
  PhoneCall,
  Sparkles,
  Plus,
  User,
  Mail,
  ShieldCheck,
  Download,
  Printer,
    RefreshCw,
    Wallet,
    Stethoscope,
    BarChart3,
  MapPin,
  Plane,
  ChevronLeft,
  ChevronRight,
  Lock
} from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useReactToPrint } from "react-to-print";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatMyKad, parseMyKad, formatMalaysianPhone } from "@/utils/mykadUtils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { parseCutiGantiRows, getCleanReason } from "@/lib/leaveStorage";
import { API_BASE_URL } from "@/config/api";
import { ExportDropdown } from "@/components/shared/ExportDropdown";

const BRANCH_NAMES: Record<string, string> = {
  HQ: "Rayhar HQ",
  KMM: "Kemaman",
  TGG: "Kuala Terengganu",
  CNH: "Cheneh",
  KBG: "Kuala Berang",
  DGN: "Dungun",
  JTH: "Jertih",
  KBR: "Kota Baru",
  RMP: "Rompin",
  MZM: "Muadzam Shah",
  SHA: "Shah Alam",
  BBB: "Bandar Baru Bangi",
  KUL: "Kuala Lumpur",
  IPH: "Ipoh",
  MJG: "Manjung",
  MLK: "Melaka",
  KKS: "Kuala Kangsar",
  TWU: "Tawau",
  SNS: "Seremban",
  AOR: "Alor Setar",
  BTM: "Bertam",
  BTP: "Batu Pahat",
  JB: "Johor Bharu",
  SEP: "Sepang",
};

// Convert any string to Proper Case (title case), e.g. "SEPANG" -> "Sepang"
function toProperCase(str: string): string {
  if (!str) return str;
  return str.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

// Haversine formula
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180; // φ, λ in radians
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // in metres
}


function formatOutstationDate(d: string): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-MY", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
  } catch {
    return d;
  }
}

function calcDaysBetween(start: string, end: string): number {
  if (!start || !end) return 1;
  try {
    const s = new Date(start.slice(0, 10));
    const e = new Date(end.slice(0, 10));
    const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diff);
  } catch {
    return 1;
  }
}

function cleanAssignerName(fullName: string): string {
  if (!fullName) return "—";
  return fullName.split(/ BIN | BINTI /i)[0];
}

function computeClientOutstationStatus(row: any): string {
  if (row.status === 'Cancelled') return 'Cancelled';
  if (row.status === 'Completed') return 'Completed';
  if (!row.start_date || !row.end_date) return row.status || 'Upcoming';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(row.start_date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(row.end_date);
  end.setHours(0, 0, 0, 0);
  if (today < start) return 'Upcoming';
  if (today > end) return 'Completed';
  return 'Active';
}

function renderOutstationStatusBadge(status: string) {
  const baseClasses = "inline-flex items-center justify-center px-2.5 py-0.5 text-[10px] tracking-wider font-extrabold uppercase rounded-full border-[1.5px] whitespace-nowrap";
  switch (status) {
    case "Active":
      return <span className={`${baseClasses} bg-pink-50 dark:bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-500/30`}>Active</span>;
    case "Upcoming":
      return <span className={`${baseClasses} bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30`}>Upcoming</span>;
    case "Completed":
      return <span className={`${baseClasses} bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30`}>Completed</span>;
    case "Cancelled":
      return <span className={`${baseClasses} bg-gray-50 dark:bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-500/30`}>Cancelled</span>;
    default:
      return <span className={`${baseClasses} bg-gray-50 text-gray-700 border-gray-200`}>{status}</span>;
  }
}

export function StaffProfileDialog({ 
  employeeId, 
  initialEmployee,
  isOpen = true, 
  onClose,
  isPage = false,
  onBack,
}: { 
  employeeId: string | null; 
  initialEmployee?: any;
  isOpen?: boolean; 
  onClose?: () => void; 
  isPage?: boolean;
  onBack?: () => void;
}) {
  const { role, userBranch, userDepartment, userId: currentUserId } = useRole();
  const storedUserId = typeof window !== 'undefined' ? (localStorage.getItem("user_id") || localStorage.getItem("userId")) : null;
  const storedUserEmail = typeof window !== 'undefined' ? (localStorage.getItem("user_email") || localStorage.getItem("email")) : null;


  const isHrOrAdmin = role === "hr_admin" || role === "admin" || (typeof role === "string" && role.toLowerCase().includes("hr"));
  const printRef = useRef<HTMLDivElement>(null);
  
  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });
  const [search, setSearch] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("All");
  const [selectedPosition, setSelectedPosition] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("Active");
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [dbEmployees, setDbEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(initialEmployee || null);

  const isOwnProfile = useMemo(() => {
    if (!selectedEmployee) return false;
    const targetUid = String(selectedEmployee.user_id || '').trim().toLowerCase();
    const targetEmail = String(selectedEmployee.email || '').trim().toLowerCase();

    const currUid = currentUserId ? String(currentUserId).trim().toLowerCase() : '';
    const stUserId = storedUserId ? String(storedUserId).trim().toLowerCase() : '';
    const stEmail = storedUserEmail ? String(storedUserEmail).trim().toLowerCase() : '';

    return Boolean(
      (currUid && targetUid && currUid === targetUid) ||
      (stUserId && targetUid && stUserId === targetUid) ||
      (stEmail && targetEmail && stEmail === targetEmail)
    );
  }, [selectedEmployee, currentUserId, storedUserId, storedUserEmail]);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [employeeLeaves, setEmployeeLeaves] = useState<any[]>([]);


  const [viewLeaveStatus, setViewLeaveStatus] = useState<"Approved" | "Pending" | "Rejected" | null>(null);
  const [selectedLeaveFormDetail, setSelectedLeaveFormDetail] = useState<any>(null);
  const [printingLeaveId, setPrintingLeaveId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(isOpen);
  const [analytics, setAnalytics] = useState<any>(null);
  const [todayStats, setTodayStats] = useState<any>(null);

  // Edit Personal Info State
  const [isEditPersonalModalOpen, setIsEditPersonalModalOpen] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editIcNumber, setEditIcNumber] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editBranch, setEditBranch] = useState("HQ");
  const [editDepartment, setEditDepartment] = useState("");
  const [editStatus, setEditStatus] = useState("Active");
  const [editJoinDate, setEditJoinDate] = useState<string>("");
  const [isUpdatingPersonalInfo, setIsUpdatingPersonalInfo] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const parsedEditIc = useMemo(() => parseMyKad(editIcNumber), [editIcNumber]);

  // Edit Today's Attendance State
  const [isEditTodayAttendanceOpen, setIsEditTodayAttendanceOpen] = useState(false);
  const [editClockIn, setEditClockIn] = useState("");
  const [editClockOut, setEditClockOut] = useState("");
  const [attendanceSessions, setAttendanceSessions] = useState<any[]>([]);
  const [currentSessionIdx, setCurrentSessionIdx] = useState(0);
  const [defaultLocationData, setDefaultLocationData] = useState<any>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  // attendance location is fixed from session coordinates
  const [isUpdatingTodayAttendance, setIsUpdatingTodayAttendance] = useState(false);

  useEffect(() => {
    if (selectedEmployee) {
      setEditFullName(selectedEmployee.name || "");
      setEditIcNumber(selectedEmployee.ic_number ? formatMyKad(selectedEmployee.ic_number) : "");
      setEditPhone(selectedEmployee.phone ? formatMalaysianPhone(selectedEmployee.phone) : "");
      setEditBranch(selectedEmployee.branch || "HQ");
      setEditDepartment(selectedEmployee.department || "");
      setEditStatus(selectedEmployee.status || "Active");
      setEditJoinDate(selectedEmployee.join_date ? new Date(selectedEmployee.join_date).toISOString().split('T')[0] : (selectedEmployee.created_at ? new Date(selectedEmployee.created_at).toISOString().split('T')[0] : ""));
    }
  }, [selectedEmployee]);

  useEffect(() => {
    if (todayStats) {
      setEditClockIn(todayStats.clockInTime && todayStats.clockInTime !== "--:--" ? todayStats.clockInTime : "");
      setEditClockOut(todayStats.clockOutTime && todayStats.clockOutTime !== "--:--" ? todayStats.clockOutTime : "");
// attendance status and location are fixed
    }
  }, [todayStats]);


  const formatTimeToDotAmPm = (timeStr?: string | null) => {
    if (!timeStr) return "--:--";
    if (timeStr.includes("AM") || timeStr.includes("PM")) {
      return timeStr.replace(':', '.').replace(/^0(?=[0-9]\.)/, '');
    }
    const parts = timeStr.split(':');
    let h = parseInt(parts[0], 10);
    const m = parts[1] ? parts[1].slice(0, 2) : "00";
    if (isNaN(h)) return timeStr;
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}.${m} ${ampm}`;
  };

  const calculateDiffHoursAndMinutes = (inStr?: string | null, outStr?: string | null) => {
    if (!inStr || !outStr || inStr === "--:--" || outStr === "--:--") return { str: "0 H 00 M", mins: 0 };
    const getMinutes = (str: string) => {
      let clean = String(str).trim();
      if (clean.toUpperCase().includes("AM") || clean.toUpperCase().includes("PM")) {
        const isPM = clean.toUpperCase().includes("PM");
        clean = clean.replace(/AM|PM/gi, '').trim().replace('.', ':');
        const [h, m] = clean.split(':').map(Number);
        let hours = isNaN(h) ? 0 : h;
        if (isPM && hours < 12) hours += 12;
        if (!isPM && hours === 12) hours = 0;
        return hours * 60 + (isNaN(m) ? 0 : m);
      }
      const [h, m] = clean.replace('.', ':').split(':').map(Number);
      return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
    };
    const m1 = getMinutes(inStr);
    const m2 = getMinutes(outStr);
    let diff = m2 - m1;
    if (diff < 0) diff += 24 * 60;
    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;
    return {
      str: `${hours} H ${String(minutes).padStart(2, '0')} M`,
      mins: diff
    };
  };

  const getTotalWorkingHours = () => {
    if (!attendanceSessions || attendanceSessions.length === 0) {
      if (editClockIn && editClockOut) {
        return calculateDiffHoursAndMinutes(editClockIn, editClockOut).str;
      }
      return "0 H 00 M";
    }
    let totalMins = 0;
    attendanceSessions.forEach((sess, idx) => {
      const inVal = idx === currentSessionIdx ? (editClockIn || sess.clock_in_time_24 || sess.clock_in_time_12) : (sess.clock_in_time_24 || sess.clock_in_time_12);
      const outVal = idx === currentSessionIdx ? (editClockOut || sess.clock_out_time_24 || sess.clock_out_time_12) : (sess.clock_out_time_24 || sess.clock_out_time_12);
      if (inVal && outVal && inVal !== "--:--" && outVal !== "--:--") {
        const { mins } = calculateDiffHoursAndMinutes(inVal, outVal);
        totalMins += mins;
      }
    });
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return `${hrs} H ${String(mins).padStart(2, '0')} M`;
  };

  const fetchTodaySessions = async (uid: string) => {
    setIsLoadingSessions(true);
    try {
      const todayDateStr = new Date().toISOString().split('T')[0];
      const res = await fetch(`${API_BASE_URL}/api/employees/${uid}/today-attendance?date=${todayDateStr}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.sessions) && data.sessions.length > 0) {
        setAttendanceSessions(data.sessions);
        setCurrentSessionIdx(0);
        setEditClockIn(data.sessions[0].clock_in_time_24 || "");
        setEditClockOut(data.sessions[0].clock_out_time_24 || "");
        setDefaultLocationData(data.defaultLocation);
      } else {
        const defLoc = data?.defaultLocation || {
          name: selectedEmployee?.branch ? (BRANCH_NAMES[selectedEmployee.branch] || selectedEmployee.branch) : "HQ",
          location_formatted: `${selectedEmployee?.branch ? (BRANCH_NAMES[selectedEmployee.branch] || selectedEmployee.branch) : "HQ"} ( 4.6778, 10.78758646 )`
        };
        setDefaultLocationData(defLoc);
        const initialDraft = {
          attendance_id: null,
          session_number: 1,
          clock_in: null,
          clock_out: null,
          clock_in_time_12: "--:--",
          clock_out_time_12: "--:--",
          clock_in_time_24: "",
          clock_out_time_24: "",
          working_status: "PRESENT",
          location: defLoc.name || "HQ",
          location_formatted: defLoc.location_formatted || "HQ ( 4.6778, 10.78758646 )",
          working_hours: "0 H 00 M",
          duration_minutes: 0,
          has_recorded_clock_in: false,
          has_recorded_clock_out: false,
        };
        setAttendanceSessions([initialDraft]);
        setCurrentSessionIdx(0);
        setEditClockIn("");
        setEditClockOut("");
      }
    } catch (err) {
      console.error("Error fetching today sessions:", err);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const handleSelectSession = (newIdx: number) => {
    if (newIdx < 0 || newIdx >= attendanceSessions.length) return;
    setAttendanceSessions(prev => {
      const copy = [...prev];
      if (copy[currentSessionIdx]) {
        copy[currentSessionIdx] = {
          ...copy[currentSessionIdx],
          clock_in_time_24: editClockIn,
          clock_out_time_24: editClockOut,
        };
      }
      return copy;
    });
    setCurrentSessionIdx(newIdx);
    const sess = attendanceSessions[newIdx];
    setEditClockIn(sess.clock_in_time_24 || "");
    setEditClockOut(sess.clock_out_time_24 || "");
  };

  useEffect(() => {
    if (selectedEmployee?.user_id && isEditTodayAttendanceOpen) {
      fetchTodaySessions(selectedEmployee.user_id);
    }
  }, [selectedEmployee?.user_id, isEditTodayAttendanceOpen]);

  const handleSavePersonalInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee?.user_id) return;
    setIsUpdatingPersonalInfo(true);
    try {
      const parsed = parseMyKad(editIcNumber);
      const res = await fetch(`${API_BASE_URL}/api/employees/${selectedEmployee.user_id}/personal-info`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: editFullName,
          ic_number: editIcNumber ? formatMyKad(editIcNumber) : null,
          phone: editPhone ? formatMalaysianPhone(editPhone) : null,
          gender: parsed.gender || null,
          dob: parsed.dob || null,
          join_date: editJoinDate || null,
          branch: editBranch || null,
          department: editDepartment || null,
          status: editStatus || "Active",
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast({ title: "Updated!", description: "Personal information saved successfully." });
        setSelectedEmployee((prev: any) => ({
          ...prev,
          name: editFullName,
          full_name: editFullName,
          ic_number: editIcNumber ? formatMyKad(editIcNumber) : prev.ic_number,
          phone: editPhone ? formatMalaysianPhone(editPhone) : prev.phone,
          gender: parsed.gender || prev.gender,
          dob: parsed.dob || prev.dob,
          join_date: editJoinDate || prev.join_date,
          branch: editBranch || prev.branch,
          department: editDepartment || prev.department,
          status: editStatus || prev.status,
        }));
        setIsEditPersonalModalOpen(false);
      } else {
        toast({ title: "Update Failed", description: data.error || "Could not update information.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Network Error", description: err.message, variant: "destructive" });
    } finally {
      setIsUpdatingPersonalInfo(false);
    }
  };

  const handleSaveTodayAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee?.user_id) return;
    setIsUpdatingTodayAttendance(true);
    try {
      const todayDateStr = new Date().toISOString().split('T')[0];
      const clockInVal = editClockIn ? (editClockIn.includes('T') ? editClockIn : `${todayDateStr}T${editClockIn}:00`) : null;
      const clockOutVal = editClockOut ? (editClockOut.includes('T') ? editClockOut : `${todayDateStr}T${editClockOut}:00`) : null;

      const res = await fetch(`${API_BASE_URL}/api/employees/${selectedEmployee.user_id}/today-attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clock_in: clockInVal,
          clock_out: clockOutVal,
          attendance_id: attendanceSessions[currentSessionIdx]?.attendance_id || null,
          attendance_type: "Present",
          location: attendanceSessions[currentSessionIdx]?.location || "HQ",
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast({ title: "Attendance Updated!", description: "Today's attendance record saved." });
        if (selectedEmployee?.user_id) {
          fetchTodayStats(selectedEmployee.user_id);
          fetchTodaySessions(selectedEmployee.user_id);
        }
        setIsEditTodayAttendanceOpen(false);
      } else {
        toast({ title: "Failed", description: data.error || "Could not update attendance.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Network Error", description: err.message, variant: "destructive" });
    } finally {
      setIsUpdatingTodayAttendance(false);
    }
  };

  useEffect(() => {
    setIsModalOpen(isOpen);
  }, [isOpen]);

  useEffect(() => {
    if (initialEmployee) {
      const formatted = {
        ...initialEmployee,
        id: initialEmployee.user_id || initialEmployee.id,
        name: initialEmployee.full_name || initialEmployee.name || "Employee",
        email: initialEmployee.email || "Account Active",
        position: (initialEmployee.role === "operation_manager" || initialEmployee.role === "finance_manager" || initialEmployee.position === "Finance Manager" || initialEmployee.position === "finance_manager") ? "Operation Manager" : initialEmployee.role === "hr_admin" ? "HR Admin" : initialEmployee.role ? String(initialEmployee.role).split('_').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : (initialEmployee.position || "Employee"),
        branch: initialEmployee.branch || "HQ",
        department: initialEmployee.department || "General",
        status: initialEmployee.status || "Active",
      };
      setSelectedEmployee(formatted);
      setIsModalOpen(true);
    }
  }, [initialEmployee]);

  useEffect(() => {
    if ((isOpen || isPage) && employeeId) {
      fetch(`${API_BASE_URL}/api/employees`)
        .then(r => r.json())
        .then(data => {
           if(data.success) {
              const emp = data.employees.find((e: any) => e.user_id === employeeId || e.id === employeeId);
              if(emp) {
                 const formatted = {
                   ...emp,
                   id: emp.user_id,
                   name: emp.full_name || emp.name || "New User",
                   email: emp.email || "Account Active",
                   position: (emp.role === "operation_manager" || emp.role === "finance_manager" || emp.position === "Finance Manager" || emp.position === "finance_manager") ? "Operation Manager" : emp.role === "hr_admin" ? "HR Admin" : emp.role ? String(emp.role).split('_').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : "Employee",
                   branch: emp.branch || "HQ",
                   department: emp.department || "General",
                   status: emp.status || "Active",
                 };
                 setSelectedEmployee(formatted);
                 setIsModalOpen(true);
              }
           }
        })
        .catch(err => console.warn("Could not fetch employee details:", err));
    }
  }, [employeeId, isOpen, isPage]);
  const currentYear = new Date().getFullYear();
  const [selectedMonthYear, setSelectedMonthYear] = useState<string>(`${currentYear}-all`);
  const availableYears = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsDate, setAnalyticsDate] = useState<string>(new Date().toISOString().substring(0, 7));

  const fetchTodayStats = async (uid: string) => {
    try {
      const dStr = new Date().toLocaleDateString("en-CA");
      const res = await fetch(`${API_BASE_URL}/api/dashboard-stats?userId=${uid}&date=${dStr}`);
      const data = await res.json();
      if (data.success && data.stats) {
        setTodayStats(data.stats);
      } else {
        setTodayStats(null);
      }
    } catch(e) {
      setTodayStats(null);
    }
  };

  const fetchAnalytics = async (userId: string, monthYear = selectedMonthYear) => {
    setAnalyticsLoading(true);
    try {
      const [y, m] = monthYear.split('-');
      const params = new URLSearchParams();
      params.append('month', m || 'all');
      params.append('year', y);
      
      const res = await fetch(`${API_BASE_URL}/api/employees/${userId}/analytics?${params}`);
      const data = await res.json();
      if (data.success) {
        setAnalytics(data.analytics);
      }
    } catch (e) {
      console.error("Error fetching analytics:", e);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedEmployee && isModalOpen) {
      fetchBranchesAndDepartments();
      fetchAnalytics(selectedEmployee.user_id, selectedMonthYear);
      fetchTodayStats(selectedEmployee.user_id);
      fetchAttendanceSettings(selectedEmployee.user_id);
      fetchOutstationAssignments(selectedEmployee.user_id);
    } else {
      setAnalytics(null);
      setOutstationAssignments([]);
      setOutstationSearch("");
    }
  }, [selectedEmployee, isModalOpen, selectedMonthYear]);

    
  const [outstationAssignments, setOutstationAssignments] = useState<any[]>([]);
  const [loadingOutstation, setLoadingOutstation] = useState(false);
  const [outstationSearch, setOutstationSearch] = useState("");
  const [viewOutstationDetail, setViewOutstationDetail] = useState<any | null>(null);

  const fetchOutstationAssignments = async (userId: string) => {
    setLoadingOutstation(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/outstation?user_id=${encodeURIComponent(userId)}&role=employee`);
      const data = await res.json();
      if (data.success && Array.isArray(data.assignments)) {
        const userAssignments = data.assignments.filter(
          (a: any) => String(a.user_id) === String(userId)
        );
        setOutstationAssignments(userAssignments);
      } else {
        setOutstationAssignments([]);
      }
    } catch (err) {
      console.error("Error fetching outstation assignments for user:", err);
      setOutstationAssignments([]);
    } finally {
      setLoadingOutstation(false);
    }
  };

  const [tempAssignmentsHistory, setTempAssignmentsHistory] = useState<any[]>([]);
  const [locationHistory, setLocationHistory] = useState<any[]>([]);
  const [locationHistoryTotal, setLocationHistoryTotal] = useState(0);
  const [locationHistoryPage, setLocationHistoryPage] = useState(1);
  const [locationHistoryHasMore, setLocationHistoryHasMore] = useState(false);
  const [loadingMoreLocationHistory, setLoadingMoreLocationHistory] = useState(false);

  const [tempAssignment, setTempAssignment] = useState({ location: "", start_date: "", end_date: "", status: "Active" });
  const [allowedLocations, setAllowedLocations] = useState<string[]>([]);
  const [loadingSettings, setLoadingSettings] = useState(false);

  const fetchLocationHistoryData = async (userId: string, pageNum: number = 1, append: boolean = false) => {
    if (append) {
      setLoadingMoreLocationHistory(true);
    } else {
      setLoadingSettings(true);
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/employee-location-history?userId=${userId}&page=${pageNum}&limit=50`);
      const histData = await res.json();
      if (histData.success) {
        const newItems = histData.history || [];
        setLocationHistory(prev => append ? [...prev, ...newItems] : newItems);
        setLocationHistoryTotal(histData.total || newItems.length);
        setLocationHistoryHasMore(!!histData.hasMore);
        setLocationHistoryPage(pageNum);
      } else {
        if (!append) setLocationHistory([]);
      }
    } catch (e) {
      console.error("Error fetching location history", e);
      if (!append) setLocationHistory([]);
    } finally {
      setLoadingSettings(false);
      setLoadingMoreLocationHistory(false);
    }
  };

  const handleLoadMoreLocationHistory = () => {
    if (!selectedEmployee?.user_id || loadingMoreLocationHistory) return;
    fetchLocationHistoryData(selectedEmployee.user_id, locationHistoryPage + 1, true);
  };

  const fetchAttendanceSettings = async (userId: string) => {
    fetchTodayStats(userId);
    fetchLocationHistoryData(userId, 1, false);
    setLoadingSettings(true);
    try {
      const [waRes, alRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/work-assignments/${userId}`),
        fetch(`${API_BASE_URL}/api/allowed-locations/${userId}`)
      ]);
      const waData = await waRes.json();
      const alData = await alRes.json();

      if (waData.success) {
        setTempAssignmentsHistory(waData.assignments || []);
      }
      if (waData.success && waData.assignments.length > 0) {
        const activeOrLatest = waData.assignments[0];
        setTempAssignment({
          location: activeOrLatest.location,
          start_date: activeOrLatest.start_date ? activeOrLatest.start_date.split('T')[0] : "",
          end_date: activeOrLatest.end_date ? activeOrLatest.end_date.split('T')[0] : "",
          status: activeOrLatest.status
        });
      } else {
        setTempAssignment({ location: "", start_date: "", end_date: "", status: "Active" });
      }

      if (alData.success) {
        setAllowedLocations(alData.allowedLocations);
      }
    } catch (e) {
      console.error(e);
    }
    setLoadingSettings(false);
  };

  const saveTempAssignment = async () => {
    if (!selectedEmployee) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/work-assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...tempAssignment, user_id: selectedEmployee.user_id })
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Temporary Assignment Saved" });
        fetchAttendanceSettings(selectedEmployee.user_id);
      } else {
        throw new Error(data.error);
      }
    } catch (e: any) {
      toast({ title: "Error Saving Assignment", description: e.message, variant: "destructive" });
    }
  };

  const saveAllowedLocations = async () => {
    if (!selectedEmployee) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/allowed-locations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: selectedEmployee.user_id, branches: allowedLocations })
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Allowed Locations Saved" });
      } else {
        throw new Error(data.error);
      }
    } catch (e: any) {
      toast({ title: "Error Saving Locations", description: e.message, variant: "destructive" });
    }
  };

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [loadingLeaves, setLoadingLeaves] = useState(false);
  const { toast } = useToast();

  // Add User State
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupBranch, setSignupBranch] = useState("HQ");
  const [signupDepartment, setSignupDepartment] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupRole, setSignupRole] = useState("");
  const [availableRoles, setAvailableRoles] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalTarget(document.getElementById("page-header-actions"));
  }, []);
  const [branchesList, setBranchesList] = useState<any[]>([]);
  const [departmentsList, setDepartmentsList] = useState<any[]>([]);
  const [branchMap, setBranchMap] = useState<Record<string, string>>(BRANCH_NAMES);

  useEffect(() => {
    fetchRoles();
    fetchBranchesAndDepartments();
  }, []);

  const fetchBranchesAndDepartments = async () => {
    try {
      const bRes = await fetch(`${API_BASE_URL}/api/branches`);
      const bData = await bRes.json();
      if (bData.success) {
        setBranchesList(bData.branches);
        const newMap = { ...BRANCH_NAMES };
        bData.branches.forEach((b: any) => {
          newMap[b.code] = b.name;
        });
        setBranchMap(newMap);
      }
      const dRes = await fetch(`${API_BASE_URL}/api/departments`);
      const dData = await dRes.json();
      if (dData.success) {
        setDepartmentsList(dData.departments);
      }
    } catch (error) {
      console.error("Error fetching branches/departments:", error);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/roles`);
      const data = await response.json();
      if (data.success) {
        setAvailableRoles(data.roles);
      }
    } catch (error) {
      console.error("Error fetching roles:", error);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [role, userBranch, userDepartment]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        role,
        branch: userBranch || "",
        department: userDepartment || "",
      });

      const [empRes, assignRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/employees?${params}`),
        fetch(`${API_BASE_URL}/api/work-assignments-all`)
      ]);
      const data = await empRes.json();
      const assignData = await assignRes.json();
      let assignments: any[] = [];
      if (assignData.success) {
        assignments = assignData.assignments;
      }

      if (!empRes.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch employees");
      }

      const formattedData = (Array.isArray(data.employees) ? data.employees : []).map((employee: any) => {
        const activeAssignment = assignments.find((a: any) => 
          a.user_id === employee.user_id && a.status === 'Active' && 
          (!a.start_date || new Date(a.start_date) <= new Date()) &&
          (!a.end_date || new Date(a.end_date) >= new Date())
        );

        return {
          ...employee,
          id: employee.user_id,
          name: employee.full_name || "New User",
          email: employee.email || "Account Active",
          position: employee.role_name || ((employee.role === "operation_manager" || employee.role === "finance_manager" || employee.position === "Finance Manager" || employee.position === "finance_manager") ? "Operation Manager" : employee.role === "hr_admin" ? "HR Admin" : employee.role === "managing_director" ? "Managing Director" : employee.role === "head_of_department" ? "Head of Department" : employee.role === "branch_leader" ? "Branch Leader" : employee.role ? employee.role.split('_').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : "Employee"),
          branch: employee.branch || "HQ",
          department: employee.department || "General",
          status: employee.status || "Active",
          tempBranch: activeAssignment ? activeAssignment.location : null,
        };
      });

      setDbEmployees(formattedData);
    } catch (error) {
      console.error("Error fetching employees:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchLeaves = async () => {
      if (!viewLeaveStatus || !selectedEmployee) {
        setEmployeeLeaves([]);
        return;
      }

      setLoadingLeaves(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/leave-requests?userId=${selectedEmployee.user_id}`);
        const data = await response.json();
        if (data.success) {
          setEmployeeLeaves(data.leaveRequests || []);
        } else {
          setEmployeeLeaves([]);
        }
      } catch (err) {
        console.error("Error fetching leaves", err);
        setEmployeeLeaves([]);
      } finally {
        setLoadingLeaves(false);
      }
    };
    fetchLeaves();
  }, [viewLeaveStatus, selectedEmployee]);

  const uniqueBranches = Array.from(
    new Set((Array.isArray(dbEmployees) ? dbEmployees : []).map((emp) => emp.branch).filter(Boolean))
  ).sort() as string[];

  const uniquePositions = Array.from(
    new Set([...((Array.isArray(availableRoles) ? availableRoles : []).filter(r => r.status === 'Active').map(r => r.name)), ...((Array.isArray(dbEmployees) ? dbEmployees : []).map((emp) => emp.position))].filter(Boolean))
  ).sort() as string[];

  const filtered = dbEmployees.filter((e) => {
    const matchesSearch =
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.position.toLowerCase().includes(search.toLowerCase());
    const matchesBranch = selectedBranch === "All" || e.branch === selectedBranch;
    const matchesPosition = selectedPosition === "All" || e.position?.toLowerCase() === selectedPosition.toLowerCase() || e.role?.toLowerCase() === selectedPosition.toLowerCase() || (e.role_name && e.role_name.toLowerCase() === selectedPosition.toLowerCase());
    const matchesStatus = selectedStatus === "All" || e.status === selectedStatus;
    return matchesSearch && matchesBranch && matchesPosition && matchesStatus;
  });

  // Sort priority for roles: Head of Department at position 4, Branch Leader at position 5
  const getRolePriority = (roleStr: string) => {
    switch (roleStr) {
      case "managing_director": return 1;
      case "operation_manager":
      case "finance_manager": return 2;
      case "hr_admin": return 3;
      case "head_of_department": return 4;
      case "branch_leader": return 5;
      case "branch_officer": return 6;
      case "employee": return 7;
      default: return 8;
    }
  };

  const sorted = [...filtered].sort((a, b) => {
    const priorityA = getRolePriority(a.role);
    const priorityB = getRolePriority(b.role);
    
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    // Secondary sort: alphabetical by name
    return a.name.localeCompare(b.name);
  });

  const handleExportCSV = () => {
    const today = new Date().toISOString().split('T')[0];
    const csvContent = [
      ["Name", "Email", "Position", "Permanent Branch", "Working Branch", "Status"],
      ...(Array.isArray(filtered) ? filtered : []).map((emp) => {
        // Use active temporary branch if available, otherwise permanent branch
        const workingBranch = emp.tempBranch || emp.branch;
        return [
          `"${emp.name}"`,
          `"${emp.email}"`,
          `"${emp.position === "Finance Manager" || emp.position === "finance_manager" ? "Operation Manager" : emp.position.replace(/_/g, ' ')}"`,
          `"${emp.branch}"`,
          `"${workingBranch}"`,
          `"${emp.status}"`,
        ];
      })
    ]
      .map(e => e.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Employee_Directory_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    link.click();
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedBranch, selectedPosition, selectedStatus]);

  const indexOfLastItem = currentPage * entriesPerPage;
  const indexOfFirstItem = indexOfLastItem - entriesPerPage;
  const currentItems = sorted.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sorted.length / entriesPerPage);

  const handleEmployeeClick = (emp: any) => {
    setSelectedEmployee(emp);
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (e: React.MouseEvent, emp: any) => {
    e.stopPropagation();
    const currentStatus = emp.status || "Active";
    const nextStatus = currentStatus === "Active" ? "Inactive" : "Active";
    
    const confirmMessage = currentStatus === "Active" 
      ? `Are you sure you want to mark ${emp.name} as Inactive?`
      : `Are you sure you want to reactivate ${emp.name}?`;
      
    if (!window.confirm(confirmMessage)) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/employees/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: emp.id || emp.user_id,
          status: nextStatus,
          changer_role: role
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast({
          title: `Status Updated!`,
          description: `Successfully marked ${emp.name} as ${nextStatus}.`
        });
        fetchEmployees();
      } else {
        toast({
          title: "Update Failed",
          description: data.error || "Failed to update status",
          variant: "destructive"
        });
      }
    } catch (err) {
      console.error("Error toggling status:", err);
      toast({
        title: "Connection Error",
        description: "Could not connect to the server.",
        variant: "destructive"
      });
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupPassword.length < 6) {
      toast({ title: "Password too short", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          full_name: signupName, 
          email: signupEmail, 
          password: signupPassword,
          branch: signupBranch,
          department: signupBranch === "HQ" ? signupDepartment : null,
          role: (availableRoles.find(r => r.name.toLowerCase() === signupRole.toLowerCase())?.name || signupRole || "Employee"),
          status: 'Active'
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({ title: "User Created!", description: `Successfully created user ${data.user.full_name}` });
        setIsAddModalOpen(false);
        // Reset form
        setSignupName("");
        setSignupEmail("");
        setSignupPassword("");
        setSignupBranch("HQ");
        setSignupDepartment("");
        setSignupRole(""); // reset so placeholder shows
        fetchEmployees(); // Refresh list
      } else {
        toast({ title: "Signup failed", description: data.error || "Could not create user", variant: "destructive" });
      }
    } catch (err) {
      console.error("Signup connection error:", err);
      toast({ title: "Connection Error", description: "Could not connect to the server.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderTabsContent = () => (
    <>
      {selectedEmployee ? (
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="mb-4 flex w-fit mx-auto flex-wrap h-auto gap-1 bg-slate-100 dark:bg-slate-900 p-2 rounded-xl shadow-inner border border-slate-200 dark:border-slate-800">
                  <TabsTrigger value="basic" className="rounded-lg text-xs neumorphic-tab font-semibold">Employee Detail</TabsTrigger>
                  <TabsTrigger value="attendance_settings" className="rounded-lg text-xs neumorphic-tab font-semibold">Attendance Settings</TabsTrigger>
                  <TabsTrigger value="temporary_assignment" className="rounded-lg text-xs neumorphic-tab font-semibold">Temporary Assignment</TabsTrigger>
                  <TabsTrigger value="multi_location" className="rounded-lg text-xs neumorphic-tab font-semibold">Multi Location Branch</TabsTrigger>
                  <TabsTrigger value="outstation_assignment" className="rounded-lg text-xs neumorphic-tab font-semibold">Outstation Assignment</TabsTrigger>
                  <TabsTrigger value="location_history" className="rounded-lg text-xs neumorphic-tab font-semibold">Location History</TabsTrigger>
                  <TabsTrigger value="analytics" className="rounded-lg text-xs neumorphic-tab font-semibold">Performance Analytics</TabsTrigger>
                </TabsList>
                
                <TabsContent value="basic" className="mt-0 space-y-6">
                  {(() => {
                    const parsedEmpMyKad = parseMyKad(selectedEmployee?.ic_number || '');
                    return (
                      <div className="flex flex-col lg:flex-row gap-6 items-start">
                        {/* ================================================== */}
                        {/* LEFT COLUMN: Profile Summary Card + Today's Attendance (Screenshot 5 & 3) */}
                        {/* ================================================== */}
                        <div className="w-full lg:w-1/3 flex flex-col gap-5">
                          {/* Sky Banner Card (Screenshot 5) */}
                          <Card className="border-none shadow-xl bg-card rounded-[28px] overflow-hidden">
                            <div className="relative h-36 sm:h-40 w-full overflow-hidden bg-sky-200 dark:bg-slate-900">
                              <img
                                src={profileSkyBanner}
                                alt="Sky Clouds Banner"
                                className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none"
                              />
                              <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/10 dark:from-black/30 dark:to-black/30 pointer-events-none" />
                              {isOwnProfile && (
                                <button
                                  type="button"
                                  onClick={() => setAvatarModalOpen(true)}
                                  className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 shadow-md backdrop-blur-md flex items-center justify-center hover:scale-110 active:scale-95 transition-all cursor-pointer border border-white/60 dark:border-slate-700"
                                  title="Change Avatar"
                                >
                                  <Plus className="w-4 h-4 font-black" />
                                </button>
                              )}
                            </div>

                            {/* Overlapping Avatar Circle */}
                            <div className="relative px-6 pb-6 pt-0 text-center">
                              <div className="relative -mt-16 sm:-mt-18 mb-3 flex justify-center">
                                <div className="relative group p-1.5 rounded-full bg-white dark:bg-slate-800 shadow-xl ring-4 ring-purple-100 dark:ring-purple-900/30">
                                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-2 border-white dark:border-slate-700 bg-slate-100 flex items-center justify-center">
                                    <UserAvatar
                                      avatarId={getSavedAvatar(selectedEmployee.user_id, selectedEmployee.email)}
                                      name={selectedEmployee.name}
                                      className="w-full h-full"
                                    />
                                  </div>
                                  {isOwnProfile && (
                                    <button
                                      type="button"
                                      onClick={() => setAvatarModalOpen(true)}
                                      className="absolute bottom-1 right-1 p-2 bg-[#942392] hover:bg-[#800A7A] text-white rounded-full shadow-lg border-2 border-white transition-all transform hover:scale-110 active:scale-95 cursor-pointer"
                                      title="Change Avatar"
                                    >
                                      <Sparkles className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                                {selectedEmployee.name}
                              </h2>
                              <div className="mt-1 flex justify-center">
                                <Badge variant="secondary" className="text-xs uppercase font-bold tracking-wider px-3 py-0.5 bg-purple-50 dark:bg-purple-950/40 text-[#942392] dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                  {selectedEmployee.position?.replace(/_/g, ' ') || 'Staff'}
                                </Badge>
                              </div>
                              <p className="text-xs font-semibold text-muted-foreground mt-2">
                                {selectedEmployee.department ? `${selectedEmployee.department} · ` : ''}{selectedEmployee.branch}
                              </p>

                              {/* 3 Quick Badges (Screenshot 5) */}
                              <div className="grid grid-cols-3 gap-2 mt-5 p-2 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <div className="text-center p-2">
                                  <span className="text-[10px] font-black uppercase text-foreground dark:text-foreground tracking-wider block">Branch</span>
                                  <span className="text-xs font-bold text-foreground">{selectedEmployee.branch}</span>
                                </div>
                                <div className="text-center p-2 border-x border-slate-200/60 dark:border-slate-800">
                                  <span className="text-[10px] font-black uppercase text-foreground dark:text-foreground tracking-wider block">User ID</span>
                                  <span className="text-xs font-mono font-black text-foreground">{selectedEmployee.user_id}</span>
                                </div>
                                <div className="text-center p-2">
                                  <span className="text-[10px] font-black uppercase text-foreground dark:text-foreground tracking-wider block">Status</span>
                                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    {selectedEmployee.status}
                                  </span>
                                </div>
                              </div>

                              {/* Change Profile Avatar Button (Owner only) */}
                              {isOwnProfile && (
                                <div className="mt-4">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setAvatarModalOpen(true)}
                                    className="w-full rounded-xl border-[#942392]/30 text-[#942392] hover:bg-[#942392]/10 font-black text-xs uppercase tracking-wider h-9"
                                  >
                                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                                    Change Profile Avatar
                                  </Button>
                                </div>
                              )}
                            </div>
                          </Card>

                          {/* Today's Attendance Snapshot Card (Screenshot 3) */}
                          <Card className="border-none shadow-xl bg-card rounded-[28px] p-5 space-y-4">
                            <div className="flex items-center justify-between border-b border-border/60 pb-3">
                              <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-purple-50 dark:bg-purple-950/40 text-[#942392] rounded-xl border border-purple-200 dark:border-purple-800">
                                  <Clock className="w-4 h-4" />
                                </div>
                                <div>
                                  <h3 className="text-xs font-black uppercase tracking-widest text-foreground">Today's Attendance</h3>
                                  <p className="text-[9px] font-bold text-muted-foreground uppercase">Live real-time punch snapshot</p>
                                </div>
                              </div>
                              {isHrOrAdmin && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setIsEditTodayAttendanceOpen(true)}
                                  className="h-8 px-2.5 rounded-xl border-[#942392]/30 text-[#942392] hover:bg-[#942392]/10 font-black text-[10px] uppercase tracking-wider"
                                  title="Edit Attendance (HR Only)"
                                >
                                  <Edit className="w-3.5 h-3.5 mr-1" />
                                  Edit
                                </Button>
                              )}
                            </div>

                            <div className="space-y-3 text-xs">
                              <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl">
                                <span className="text-[10px] font-black uppercase text-foreground">📍 Clock In</span>
                                <span className="font-mono font-black text-foreground">
                                  {(todayStats?.clockInTime && todayStats.clockInTime !== "--:--") ? todayStats.clockInTime : "--"}
                                </span>
                              </div>
                              <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl">
                                <span className="text-[10px] font-black uppercase text-foreground">📍 Clock Out</span>
                                <span className="font-mono font-black text-foreground">
                                  {(todayStats?.clockOutTime && todayStats.clockOutTime !== "--:--") ? todayStats.clockOutTime : "--"}
                                </span>
                              </div>
                              <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl">
                                <span className="text-[10px] font-black uppercase text-foreground">Working Status</span>
                                <span className="font-bold text-foreground">
                                  {todayStats?.todayStatus || "Present"}
                                </span>
                              </div>
                              <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl">
                                <span className="text-[10px] font-black uppercase text-foreground">Distance</span>
                                <span className="font-mono font-bold text-foreground">
                                  {todayStats?.distanceMeters !== undefined && todayStats?.distanceMeters !== null
                                    ? (Number(todayStats.distanceMeters) >= 1000 ? `${(Number(todayStats.distanceMeters) / 1000).toFixed(2)} km` : `${todayStats.distanceMeters} m`)
                                    : "4.00 m"}
                                </span>
                              </div>
                              <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl">
                                <span className="text-[10px] font-black uppercase text-foreground">Location</span>
                                <span className="font-bold text-foreground truncate max-w-[150px]">
                                  {todayStats?.attendanceLocationFormatted || (todayStats?.attendanceLocation ? `${BRANCH_NAMES[todayStats.attendanceLocation] || todayStats.attendanceLocation} ( 4.6778, 10.78758646 )` : "HQ ( 4.6778, 10.78758646 )")}
                                </span>
                              </div>
                              <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl">
                                <span className="text-[10px] font-black uppercase text-foreground">Working Hours</span>
                                <span className="font-mono font-black text-[#942392]">
                                  {todayStats?.workingHours || "0 H 00 M"}
                                </span>
                              </div>
                              <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl">
                                <span className="text-[10px] font-black uppercase text-foreground">Attendance Status</span>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  {todayStats?.todayStatus ? todayStats.todayStatus.replace(/\(.*?\)/g, '').trim() : "Present"}
                                </span>
                              </div>
                            </div>
                          </Card>
                        </div>

                        {/* ================================================== */}
                        {/* RIGHT COLUMN: Account & Personal Information (Screenshot 5) */}
                        {/* ================================================== */}
                        <div className="w-full lg:w-2/3 flex flex-col gap-5">
                          <Card className="border-none shadow-xl bg-card rounded-[28px] p-6 space-y-6">
                            <div className="flex items-center justify-between border-b border-border/60 pb-4">
                              <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-purple-50 dark:bg-purple-950/40 text-[#942392] rounded-2xl border border-purple-200 dark:border-purple-800">
                                  <User className="w-5 h-5" />
                                </div>
                                <div>
                                  <h3 className="text-base font-black uppercase tracking-tight text-foreground">Account & Personal Information</h3>
                                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Official employment records & identity details</p>
                                </div>
                              </div>
                              {isHrOrAdmin && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setIsEditPersonalModalOpen(true)}
                                  className="h-9 px-4 rounded-xl border-[#942392]/30 text-[#942392] hover:bg-[#942392]/10 font-black text-xs uppercase tracking-wider shadow-xs"
                                  title="Edit Employee Details (HR Only)"
                                >
                                  <Edit className="w-3.5 h-3.5 mr-1.5" />
                                  Edit Information
                                </Button>
                              )}
                            </div>

                            {/* Information Grid (2 Columns on MD) */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-start gap-3">
                                <User className="w-4 h-4 text-[#942392] mt-0.5 shrink-0" />
                                <div>
                                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Full Name</span>
                                  <span className="text-xs font-black text-foreground uppercase">{selectedEmployee.name}</span>
                                </div>
                              </div>

                              <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-start gap-3">
                                <Mail className="w-4 h-4 text-[#942392] mt-0.5 shrink-0" />
                                <div className="min-w-0">
                                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Email Address</span>
                                  <span className="text-xs font-bold text-foreground truncate block">{selectedEmployee.email}</span>
                                </div>
                              </div>

                              <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-start gap-3">
                                <ShieldCheck className="w-4 h-4 text-[#942392] mt-0.5 shrink-0" />
                                <div>
                                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">User ID</span>
                                  <span className="text-xs font-mono font-black text-foreground">{selectedEmployee.user_id}</span>
                                </div>
                              </div>

                              <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-start gap-3">
                                <Briefcase className="w-4 h-4 text-[#942392] mt-0.5 shrink-0" />
                                <div>
                                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Branch</span>
                                  <span className="text-xs font-bold text-foreground">{selectedEmployee.branch}</span>
                                </div>
                              </div>

                              <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-start gap-3">
                                <MapPin className="w-4 h-4 text-[#942392] mt-0.5 shrink-0" />
                                <div>
                                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Department</span>
                                  <span className="text-xs font-bold text-foreground">{selectedEmployee.department || "—"}</span>
                                </div>
                              </div>

                              <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-start gap-3">
                                <CalendarCheck className="w-4 h-4 text-[#942392] mt-0.5 shrink-0" />
                                <div>
                                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Status</span>
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${selectedEmployee.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                                    {selectedEmployee.status}
                                  </span>
                                </div>
                              </div>

                              <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-start gap-3">
                                <FileText className="w-4 h-4 text-[#942392] mt-0.5 shrink-0" />
                                <div>
                                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">IC Number (MyKad)</span>
                                  <span className="text-xs font-mono font-black text-foreground">
                                    {selectedEmployee.ic_number ? formatMyKad(selectedEmployee.ic_number) : (parsedEmpMyKad.formatted || "—")}
                                  </span>
                                </div>
                              </div>

                              <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-start gap-3">
                                <CalendarDays className="w-4 h-4 text-[#942392] mt-0.5 shrink-0" />
                                <div>
                                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Date of Birth (From IC)</span>
                                  <span className="text-xs font-bold text-foreground">
                                    {parsedEmpMyKad.formattedDob || (selectedEmployee.dob ? new Date(selectedEmployee.dob).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : "—")}
                                  </span>
                                </div>
                              </div>

                              <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-start gap-3">
                                <Clock className="w-4 h-4 text-[#942392] mt-0.5 shrink-0" />
                                <div>
                                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Age (Dynamic Calculation)</span>
                                  <span className="text-xs font-black text-[#942392]">
                                    {parsedEmpMyKad.age !== null ? `${parsedEmpMyKad.age} years old` : "—"}
                                  </span>
                                </div>
                              </div>

                              <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-start gap-3">
                                <User className="w-4 h-4 text-[#942392] mt-0.5 shrink-0" />
                                <div>
                                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Gender (Auto from IC)</span>
                                  <span className="text-xs font-bold text-foreground">
                                    {selectedEmployee.gender || parsedEmpMyKad.gender || "—"}
                                  </span>
                                </div>
                              </div>

                              <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-start gap-3">
                                <PhoneCall className="w-4 h-4 text-[#942392] mt-0.5 shrink-0" />
                                <div>
                                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Phone Number</span>
                                  <span className="text-xs font-mono font-bold text-foreground">
                                    {selectedEmployee.phone ? formatMalaysianPhone(selectedEmployee.phone) : "—"}
                                  </span>
                                </div>
                              </div>

                              <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-start gap-3">
                                <CalendarCheck className="w-4 h-4 text-[#942392] mt-0.5 shrink-0" />
                                <div>
                                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Date of Join</span>
                                  <span className="text-xs font-bold text-foreground">
                                    {selectedEmployee.join_date ? new Date(selectedEmployee.join_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase() : (selectedEmployee.created_at ? new Date(selectedEmployee.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase() : "—")}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </Card>
                        </div>
                      </div>
                    );
                  })()}
                </TabsContent>

                {/* ================================================== */}
                {/* PERFORMANCE ANALYTICS TAB (Screenshot 2) */}
                {/* ================================================== */}
                <TabsContent value="analytics" className="mt-0">
                  <TooltipProvider>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-[28px] border border-slate-200 dark:border-slate-800/80 shadow-xl">
                      <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-0 gap-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded">
                          <BarChart3 className="h-3.5 w-3.5" />
                        </div>
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                          {selectedMonthYear.split('-')[0]} Performance Analytics
                        </h3>
                      </div>
                      
                      {/* Month Picker */}
                      <MonthPicker
                        monthYear={selectedMonthYear}
                        onSelectMonthYear={(val) => {
                          setSelectedMonthYear(val);
                        }}
                      />
                    </div>

                    {analyticsLoading ? (
                      <div className="flex flex-col items-center justify-center p-12 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                        <Loader2 className="w-6 h-6 animate-spin text-purple-600 mb-2" />
                        <p className="text-xs print:text-[11px] font-bold text-foreground">Calculating statistics...</p>
                      </div>
                    ) : analytics ? (
                      <>
                        {/* Attendance Performance Section */}
                        <section>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* Monthly Rate Card */}
                            <Card className="shadow-sm border-slate-200 dark:border-slate-800/60 hover:shadow-md transition-shadow duration-200">
                              <CardContent className="p-4">
                                <div className="flex justify-between items-center mb-3">
                                  <div className="flex items-center gap-2">
                                    <p className="text-[10px] print:text-[13px] font-bold uppercase tracking-widest text-foreground dark:text-foreground">Monthly Rate</p>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <div className="w-3 h-3 rounded-full bg-slate-100 dark:bg-slate-800 text-foreground flex items-center justify-center text-[10px] print:text-[13px] font-bold cursor-help hover:bg-slate-200 transition-colors">?</div>
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-[200px] p-2 text-[8px] print:text-[13px] leading-relaxed">
                                        <p className="font-bold mb-1 text-slate-800 dark:text-slate-200">Formula:</p>
                                        <p className="text-slate-600 dark:text-slate-300">(Present Days / Expected Working Days) × 100</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
                                  <Badge variant="secondary" className={`text-[10px] print:text-[13px] font-black uppercase tracking-wider px-2 py-0.5 border ${
                                    analytics.attendance.monthly.rate >= 95 ? 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800' : 
                                    analytics.attendance.monthly.rate >= 85 ? 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800' : 
                                    analytics.attendance.monthly.rate >= 70 ? 'text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800' : 
                                    'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-800'
                                  }`}>
                                    {analytics.attendance.monthly.rate >= 95 ? 'Excellent' : analytics.attendance.monthly.rate >= 85 ? 'Good' : analytics.attendance.monthly.rate >= 70 ? 'Warning' : 'Review'}
                                  </Badge>
                                </div>
                                
                                <div className="flex items-baseline gap-1 mb-3">
                                  <span className={`text-3xl font-black tracking-tighter ${
                                    analytics.attendance.monthly.rate >= 85 ? 'text-emerald-600 dark:text-emerald-400' : 
                                    analytics.attendance.monthly.rate >= 70 ? 'text-amber-500 dark:text-amber-400' : 
                                    analytics.attendance.monthly.rate === 0 ? 'text-slate-300' : 'text-slate-700 dark:text-slate-200'
                                  }`}>
                                    {analytics.attendance.monthly.rate}
                                  </span>
                                  <span className="text-sm font-bold text-foreground">%</span>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-2">
                                  <div className="bg-emerald-50/50 dark:bg-emerald-950/40 border border-emerald-100/50 dark:border-emerald-800/60 rounded-lg p-2 text-center">
                                    <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 leading-none mb-1">{analytics.attendance.monthly.present}</p>
                                    <p className="text-[10px] print:text-[13px] font-bold text-emerald-600/70 dark:text-emerald-400/80 uppercase tracking-wider">Present</p>
                                  </div>
                                  <div className="bg-amber-50/50 dark:bg-amber-950/40 border border-amber-100/50 dark:border-amber-800/60 rounded-lg p-2 text-center">
                                    <p className="text-lg font-black text-amber-600 dark:text-amber-400 leading-none mb-1">{analytics.attendance.monthly.late}</p>
                                    <p className="text-[10px] print:text-[13px] font-bold text-amber-600/70 dark:text-amber-400/80 uppercase tracking-wider">Late</p>
                                  </div>
                                  <div className="bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800/60 rounded-lg p-2 text-center">
                                    <p className="text-lg font-black text-slate-600 dark:text-slate-300 leading-none mb-1">{analytics.attendance.monthly.absent}</p>
                                    <p className="text-[10px] print:text-[13px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Absent</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>

                            {/* Yearly Rate Card */}
                            <Card className="shadow-sm border-slate-200 dark:border-slate-800/60 hover:shadow-md transition-shadow duration-200">
                              <CardContent className="p-4">
                                <div className="flex justify-between items-center mb-3">
                                  <div className="flex items-center gap-2">
                                    <p className="text-[10px] print:text-[13px] font-bold uppercase tracking-widest text-foreground dark:text-foreground">Yearly Rate</p>
                                  </div>
                                  <Badge variant="secondary" className={`text-[10px] print:text-[13px] font-black uppercase tracking-wider px-2 py-0.5 border ${
                                    analytics.attendance.yearly.rate >= 95 ? 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800' : 
                                    analytics.attendance.yearly.rate >= 85 ? 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800' : 
                                    analytics.attendance.yearly.rate >= 70 ? 'text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800' : 
                                    'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-800'
                                  }`}>
                                    {analytics.attendance.yearly.rate >= 95 ? 'Excellent' : analytics.attendance.yearly.rate >= 85 ? 'Good' : analytics.attendance.yearly.rate >= 70 ? 'Warning' : 'Review'}
                                  </Badge>
                                </div>
                                
                                <div className="flex items-baseline gap-1 mb-3">
                                  <span className={`text-3xl font-black tracking-tighter ${
                                    analytics.attendance.yearly.rate >= 85 ? 'text-emerald-600 dark:text-emerald-400' : 
                                    analytics.attendance.yearly.rate >= 70 ? 'text-amber-500 dark:text-amber-400' : 
                                    analytics.attendance.yearly.rate === 0 ? 'text-slate-300' : 'text-slate-700 dark:text-slate-200'
                                  }`}>
                                    {analytics.attendance.yearly.rate}
                                  </span>
                                  <span className="text-sm font-bold text-foreground">%</span>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-2">
                                  <div className="bg-emerald-50/50 dark:bg-emerald-950/40 border border-emerald-100/50 dark:border-emerald-800/60 rounded-lg p-2 text-center">
                                    <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 leading-none mb-1">{analytics.attendance.yearly.present}</p>
                                    <p className="text-[10px] print:text-[13px] font-bold text-emerald-600/70 dark:text-emerald-400/80 uppercase tracking-wider">Present</p>
                                  </div>
                                  <div className="bg-amber-50/50 dark:bg-amber-950/40 border border-amber-100/50 dark:border-amber-800/60 rounded-lg p-2 text-center">
                                    <p className="text-lg font-black text-amber-600 dark:text-amber-400 leading-none mb-1">{analytics.attendance.yearly.late}</p>
                                    <p className="text-[10px] print:text-[13px] font-bold text-amber-600/70 dark:text-amber-400/80 uppercase tracking-wider">Late</p>
                                  </div>
                                  <div className="bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800/60 rounded-lg p-2 text-center">
                                    <p className="text-lg font-black text-slate-600 dark:text-slate-300 leading-none mb-1">{analytics.attendance.yearly.absent}</p>
                                    <p className="text-[10px] print:text-[13px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Absent</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        </section>

                        {/* Leave Utilization Section */}
                        <section>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="p-1 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded">
                                <Briefcase className="h-3 w-3" />
                              </div>
                              <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Leave Utilization</h3>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                            <div className="rounded-xl border border-slate-200 dark:border-slate-800/60 p-3 bg-white dark:bg-slate-800 shadow-sm flex flex-col justify-between">
                              <p className="text-xs print:text-[11px] font-bold uppercase tracking-widest text-foreground dark:text-foreground mb-1.5">Total Entitled</p>
                              <p className="text-2xl font-black text-slate-800 dark:text-slate-200 tracking-tighter">{analytics.leave.entitlement}</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 dark:border-slate-800/60 p-3 bg-white dark:bg-slate-800 shadow-sm flex flex-col justify-between">
                              <p className="text-xs print:text-[11px] font-bold uppercase tracking-widest text-foreground dark:text-foreground mb-1.5">Approved Taken</p>
                              <p className="text-2xl font-black text-slate-800 dark:text-slate-200 tracking-tighter">{analytics.leave.used}</p>
                            </div>
                            <div className="rounded-xl border-2 border-emerald-500/20 dark:border-emerald-700/50 p-3 bg-emerald-50/30 dark:bg-emerald-950/40 shadow-sm flex flex-col justify-between">
                              <p className="text-xs print:text-[11px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1.5">Remaining Balance</p>
                              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter">{analytics.leave.remaining}</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 dark:border-slate-800/60 p-3 bg-white dark:bg-slate-800 shadow-sm flex flex-col justify-between">
                              <Tooltip>
                                <TooltipTrigger className="text-left w-full h-full flex flex-col justify-between">
                                  <p className="text-xs print:text-[11px] font-bold uppercase tracking-widest text-foreground dark:text-foreground mb-1.5 flex items-center justify-between w-full">
                                    Utilization
                                    <span className="w-3 h-3 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[7px] text-foreground">?</span>
                                  </p>
                                  <p className={`text-2xl font-black tracking-tighter ${analytics.leave.utilizationRate >= 90 ? 'text-amber-500' : 'text-slate-800 dark:text-slate-200'}`}>
                                    {analytics.leave.utilizationRate}%
                                  </p>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">Formula: (Approved Leave / Total Entitled) × 100</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <button 
                              className="group flex flex-col items-start p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/50 hover:bg-amber-50 dark:hover:bg-amber-900/40 hover:border-amber-300 dark:hover:border-amber-700 transition-all duration-200"
                              onClick={() => setViewLeaveStatus("Pending")}
                            >
                              <div className="flex justify-between items-center w-full mb-2">
                                <div className="p-1.5 bg-amber-100 dark:bg-amber-900/60 rounded-lg text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                                  <Clock className="w-3 h-3" />
                                </div>
                                <span className="text-lg font-black text-amber-600 dark:text-amber-400">{analytics.leave.pending}</span>
                              </div>
                              <span className="text-xs print:text-[11px] font-bold text-amber-700/80 dark:text-amber-300/80 uppercase tracking-widest">Pending Requests</span>
                            </button>
                            
                            <button 
                              className="group flex flex-col items-start p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/40 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-200"
                              onClick={() => setViewLeaveStatus("Approved")}
                            >
                              <div className="flex justify-between items-center w-full mb-2">
                                <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/60 rounded-lg text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                                  <Briefcase className="w-3 h-3" />
                                </div>
                                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{analytics.leave.approvedApplications ?? analytics.leave.totalTaken}</span>
                              </div>
                              <span className="text-xs print:text-[11px] font-bold text-emerald-700/80 dark:text-emerald-300/80 uppercase tracking-widest">Approved Leave</span>
                            </button>

                            <button 
                              className="group flex flex-col items-start p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:bg-slate-800 hover:border-slate-300 transition-all duration-200 opacity-90 hover:opacity-100"
                              onClick={() => setViewLeaveStatus("Rejected")}
                            >
                              <div className="flex justify-between items-center w-full mb-2">
                                <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-foreground group-hover:scale-110 transition-transform">
                                  <X className="w-3 h-3" />
                                </div>
                                <span className="text-lg font-black text-foreground">{analytics.leave.rejected}</span>
                              </div>
                              <span className="text-xs print:text-[11px] font-bold text-foreground uppercase tracking-widest">Rejected Requests</span>
                            </button>
                          </div>

                          {/* 3 Leave Type Breakdown Cards (Replacement, Unpaid, Medical) */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                            {/* REPLACEMENT LEAVE */}
                            <div className="border border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-800 rounded-xl p-3 flex flex-col justify-between shadow-sm">
                              <p className="text-xs print:text-[11px] font-bold uppercase tracking-widest text-foreground dark:text-foreground mb-1 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span><RefreshCw className="w-3 h-3 text-muted-foreground" />Replacement Leave</p>
                              <div className="my-1.5">
                                <span className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tighter">
                                  {analytics.leave?.replacement?.taken || 0}
                                </span>
                                <span className="text-xs font-semibold text-foreground ml-1.5">Days Taken</span>
                              </div>
                              <div className="mt-1">
                                <div className="flex justify-between items-center text-xs print:text-[11px] font-bold text-foreground mb-1">
                                  <span className="uppercase tracking-wider">Progress</span>
                                  <span>{analytics.leave?.replacement?.taken || 0} / {analytics.leave?.replacement?.entitlement || 0}</span>
                                </div>
                                <Progress 
                                  value={
                                    (analytics.leave?.replacement?.entitlement || 0) > 0 
                                      ? Math.min(100, Math.round(((analytics.leave?.replacement?.taken || 0) / analytics.leave.replacement.entitlement) * 100)) 
                                      : (analytics.leave?.replacement?.taken || 0) > 0 ? 100 : 0
                                  } 
                                  className="h-1.5" 
                                />
                              </div>
                            </div>

                            {/* UNPAID LEAVE */}
                            <div className="border border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-800 rounded-xl p-3 flex flex-col justify-between shadow-sm">
                              <p className="text-xs print:text-[11px] font-bold uppercase tracking-widest text-foreground dark:text-foreground mb-1 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span><Wallet className="w-3 h-3 text-muted-foreground" />Unpaid Leave</p>
                              <div className="my-1.5">
                                <span className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tighter">
                                  {analytics.leave?.unpaid?.taken || 0}
                                </span>
                                <span className="text-xs font-semibold text-foreground ml-1.5">
                                  {(analytics.leave?.unpaid?.taken || 0) === 0 ? "Application" : "Days Taken"}
                                </span>
                              </div>
                              <div className="mt-1">
                                <div className="flex justify-between items-center text-xs print:text-[11px] font-bold text-foreground mb-1">
                                  <span className="uppercase tracking-wider">Usage</span>
                                  <span>{(analytics.leave?.unpaid?.taken || 0) === 0 ? "0 Application" : `${analytics.leave?.unpaid?.taken} Days`}</span>
                                </div>
                                <Progress 
                                  value={(analytics.leave?.unpaid?.taken || 0) > 0 ? 100 : 0} 
                                  className="h-1.5" 
                                />
                              </div>
                            </div>

                            {/* MEDICAL LEAVE (SICK LEAVE) */}
                            <div className="border border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-800 rounded-xl p-3 flex flex-col justify-between shadow-sm">
                              <p className="text-xs print:text-[11px] font-bold uppercase tracking-widest text-foreground dark:text-foreground mb-1 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span><Stethoscope className="w-3 h-3 text-muted-foreground" />Medical Leave (Sick Leave)</p>
                              <div className="my-1.5">
                                <span className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tighter">
                                  {analytics.leave?.sick?.taken || 0}
                                </span>
                                <span className="text-xs font-semibold text-foreground ml-1.5">Days Taken</span>
                              </div>
                              <div className="mt-1">
                                <div className="flex justify-between items-center text-xs print:text-[11px] font-bold text-foreground mb-1">
                                  <span className="uppercase tracking-wider">Progress</span>
                                  <span>{analytics.leave?.sick?.taken || 0} / {analytics.leave?.sick?.entitlement || 14}</span>
                                </div>
                                <Progress 
                                  value={Math.min(100, Math.round(((analytics.leave?.sick?.taken || 0) / (analytics.leave?.sick?.entitlement || 14)) * 100))} 
                                  className="h-1.5" 
                                />
                              </div>
                            </div>
                          </div>
                        </section>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-32 text-foreground bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-800/60 dark:border-slate-700 shadow-sm">
                        <Users className="w-12 h-12 opacity-20 mb-4" />
                        <p className="text-sm font-bold">Analytics unavailable.</p>
                      </div>
                    )}
                  </div>
                    </div>
                  </TooltipProvider>
                </TabsContent>

                <TabsContent value="attendance_settings" className="mt-0">
                  {loadingSettings ? (
                    <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                  ) : (
                    <div className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                        <Card className="h-full">
                          <CardContent className="p-4 space-y-4">
                            <h3 className="font-bold text-lg border-b pb-2">Primary Branch</h3>
                            <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded text-sm font-semibold">
                              {selectedEmployee.branch} - {toProperCase(branchMap[selectedEmployee.branch] || BRANCH_NAMES[selectedEmployee.branch as keyof typeof BRANCH_NAMES] || selectedEmployee.branch || "Unknown")}
                            </div>
                          </CardContent>
                        </Card>
  
                        <Card className="h-full">
                          <CardContent className="p-4 space-y-4">
                            <h3 className="font-bold text-lg border-b pb-2">Temporary Assignment</h3>
                            
                            <div className="space-y-3">
                              <div>
                                <Label className="text-xs print:text-[11px] font-bold text-foreground uppercase">Working Branch</Label>
                                <Select value={tempAssignment.location} onValueChange={(val) => setTempAssignment({...tempAssignment, location: val})}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select Branch" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(branchesList.length > 0
                                      ? branchesList
                                      : Object.entries(branchMap).map(([code, name]) => ({ code, name }))
                                    ).map((b: any) => (
                                      <SelectItem key={b.code} value={b.code}>
                                        {b.code} - {toProperCase(b.name || branchMap[b.code] || b.code)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
  
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label className="text-xs print:text-[11px] font-bold text-foreground uppercase">Start Date</Label>
                                  <Input type="date" value={tempAssignment.start_date} onChange={(e) => setTempAssignment({...tempAssignment, start_date: e.target.value})} />
                                </div>
                                <div>
                                  <Label className="text-xs print:text-[11px] font-bold text-foreground uppercase">End Date</Label>
                                  <Input type="date" value={tempAssignment.end_date} onChange={(e) => setTempAssignment({...tempAssignment, end_date: e.target.value})} />
                                </div>
                              </div>
                              
                              <div>
                                <Label className="text-xs print:text-[11px] font-bold text-foreground uppercase">Status</Label>
                                <Select value={tempAssignment.status} onValueChange={(val) => setTempAssignment({...tempAssignment, status: val})}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Active">Active</SelectItem>
                                    <SelectItem value="Completed">Completed</SelectItem>
                                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
  
                              <Button className="w-full mt-2 bg-[#a01497] hover:bg-[#850f7c] text-white" onClick={saveTempAssignment}>Save Temporary Assignment</Button>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {role === "hr_admin" ? (
                        <Card>
                          <CardContent className="p-4 space-y-4">
                            <div className="flex justify-between items-center border-b pb-2">
                              <h3 className="font-bold text-lg">Manage Allowed Branches</h3>
                            </div>
                            <div className="text-xs text-foreground mb-2">Select the branches this employee is permitted to clock into.</div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-2">
                              {(branchesList.length > 0
                                ? branchesList
                                : Object.entries(branchMap).map(([code, name]) => ({ code, name }))
                              ).map((b: any) => {
                                const code = b.code;
                                const name = toProperCase(b.name || branchMap[code] || code);
                                return (
                                  <div key={code} className="flex items-center space-x-2 border p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800">
                                    <Checkbox 
                                      id={`branch-${code}`} 
                                      checked={allowedLocations.includes(code)}
                                      onCheckedChange={(checked) => {
                                        if (checked) setAllowedLocations([...allowedLocations, code]);
                                        else setAllowedLocations(allowedLocations.filter(c => c !== code));
                                      }}
                                    />
                                    <Label htmlFor={`branch-${code}`} className="text-sm cursor-pointer flex-1">
                                      {code} - {name}
                                    </Label>
                                  </div>
                                );
                              })}
                            </div>
                            <Button className="w-full mt-4 bg-[#a01497] hover:bg-[#850f7c] text-white" onClick={saveAllowedLocations}>Save Allowed Branches</Button>
                          </CardContent>
                        </Card>
                      ) : null}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="temporary_assignment" className="mt-0">
                  {loadingSettings ? (
                    <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                  ) : (
                    <div className="max-w-3xl mx-auto space-y-6">
                      <Card>
                        <CardContent className="p-4 space-y-4">
                          <h3 className="font-bold text-lg border-b pb-2">Assignment History</h3>
                          {tempAssignmentsHistory.length === 0 ? (
                            <div className="text-center py-8 text-sm text-muted-foreground border rounded-lg border-dashed">
                              No temporary assignments found for this employee.
                            </div>
                          ) : (
                            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                              <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                                  <tr>
                                    <th className="px-4 py-3 font-semibold text-black dark:text-white">Branch</th>
                                    <th className="px-4 py-3 font-semibold text-black dark:text-white">Assignment</th>
                                    <th className="px-4 py-3 font-semibold text-black dark:text-white">Start Date</th>
                                    <th className="px-4 py-3 font-semibold text-black dark:text-white">End Date</th>
                                    <th className="px-4 py-3 font-semibold text-black dark:text-white">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                    {(Array.isArray(tempAssignmentsHistory) ? tempAssignmentsHistory : []).map((ta, idx) => (
                                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                                        <td className="px-4 py-3 font-bold text-black dark:text-white">{ta.location}</td>
                                        <td className="px-4 py-3 text-black dark:text-white">{toProperCase(branchMap[ta.location] || BRANCH_NAMES[ta.location as keyof typeof BRANCH_NAMES] || ta.location)}</td>
                                        <td className="px-4 py-3 text-black dark:text-white">{ta.start_date ? new Date(ta.start_date).toLocaleDateString('en-GB') : '-'}</td>
                                        <td className="px-4 py-3 text-black dark:text-white">{ta.end_date ? new Date(ta.end_date).toLocaleDateString('en-GB') : '-'}</td>
                                        <td className="px-4 py-3">
                                          {ta.status === 'Active' ? (
                                            <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-[10px] tracking-wider font-extrabold uppercase rounded-full border-[1.5px] whitespace-nowrap bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30">
                                              Active
                                            </span>
                                          ) : ta.status === 'Completed' ? (
                                            <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-[10px] tracking-wider font-extrabold uppercase rounded-full border-[1.5px] whitespace-nowrap bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30">
                                              Completed
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-[10px] tracking-wider font-extrabold uppercase rounded-full border-[1.5px] whitespace-nowrap bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700">
                                              {ta.status}
                                            </span>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="multi_location" className="mt-0">
                  {loadingSettings ? (
                    <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                  ) : (
                    <div className="max-w-3xl mx-auto space-y-6">
                      <Card>
                        <CardContent className="p-4 space-y-4">
                          <h3 className="font-bold text-lg border-b pb-2 mb-4">Allowed Branches</h3>
                          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                            <table className="w-full text-sm text-left">
                              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                  <th className="px-4 py-3 font-semibold text-black dark:text-white">Type</th>
                                  <th className="px-4 py-3 font-semibold text-black dark:text-white">Branch</th>
                                  <th className="px-4 py-3 font-semibold text-black dark:text-white">Code</th>
                                  <th className="px-4 py-3 font-semibold text-black dark:text-white">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                                  <td className="px-4 py-3 font-bold text-black dark:text-white whitespace-nowrap uppercase">Permanent Branch</td>
                                  <td className="px-4 py-3 text-black dark:text-white">{selectedEmployee?.branch ? toProperCase(branchMap[selectedEmployee.branch] || BRANCH_NAMES[selectedEmployee.branch as keyof typeof BRANCH_NAMES] || selectedEmployee.branch) : '-'}</td>
                                  <td className="px-4 py-3 font-bold text-black dark:text-white">{selectedEmployee?.branch || '-'}</td>
                                  <td className="px-4 py-3">
                                    <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-[10px] tracking-wider font-extrabold uppercase rounded-full border-[1.5px] whitespace-nowrap bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30">
                                      Permanent
                                    </span>
                                  </td>
                                </tr>
                                {(Array.isArray(allowedLocations) ? allowedLocations : []).filter(c => c !== selectedEmployee?.branch).map((loc, idx) => (
                                  <tr key={loc} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                                    <td className="px-4 py-3 font-bold text-black dark:text-white whitespace-nowrap uppercase">Branch {idx + 2}</td>
                                    <td className="px-4 py-3 text-black dark:text-white">{toProperCase(branchMap[loc] || BRANCH_NAMES[loc as keyof typeof BRANCH_NAMES] || loc)}</td>
                                    <td className="px-4 py-3 font-bold text-black dark:text-white">{loc}</td>
                                    <td className="px-4 py-3">
                                      <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-[10px] tracking-wider font-extrabold uppercase rounded-full border-[1.5px] whitespace-nowrap bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30">
                                        Active
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="outstation_assignment" className="mt-0">
                  {loadingOutstation ? (
                    <div className="flex flex-col items-center justify-center p-12 space-y-3">
                      <Loader2 className="w-8 h-8 animate-spin text-[#942392]" />
                      <p className="text-xs text-muted-foreground font-semibold">Loading outstation assignments...</p>
                    </div>
                  ) : (
                    <div className="max-w-5xl mx-auto space-y-4">
                      <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-800 rounded-xl overflow-hidden">
                        <CardContent className="p-4 space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-2 mb-4">
                            <h3 className="font-bold text-lg">Outstation Assignment</h3>

                            <div className="flex items-center gap-2">
                              {outstationAssignments.length > 3 && (
                                <div className="relative w-48 sm:w-56">
                                  <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                  <Input 
                                    placeholder="Search event or place..."
                                    value={outstationSearch}
                                    onChange={(e) => setOutstationSearch(e.target.value)}
                                    className="pl-8 h-8 text-xs rounded-lg"
                                  />
                                </div>
                              )}
                              <Badge variant="outline" className="text-xs font-bold text-[#942392] border-[#942392]/30 bg-[#942392]/5 whitespace-nowrap">
                                {outstationAssignments.length} {outstationAssignments.length === 1 ? 'Record' : 'Records'}
                              </Badge>
                            </div>
                          </div>

                          {outstationAssignments.length === 0 ? (
                            <div className="text-center py-12 text-sm text-muted-foreground border rounded-xl border-dashed border-slate-200 dark:border-slate-700">
                              <Plane className="w-9 h-9 text-slate-300 dark:text-slate-600 mx-auto mb-2 opacity-50" />
                              <p className="font-semibold text-slate-700 dark:text-slate-300">No outstation assignments found</p>
                              <p className="text-xs text-muted-foreground mt-1">This employee has not been assigned to any outstation events.</p>
                            </div>
                          ) : (
                            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-sm">
                              <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                                  <tr>
                                    <th className="px-4 py-3 font-semibold text-black dark:text-white min-w-[200px]">
                                      Event
                                    </th>
                                    <th className="px-4 py-3 font-semibold text-black dark:text-white whitespace-nowrap">
                                      Start
                                    </th>
                                    <th className="px-4 py-3 font-semibold text-black dark:text-white whitespace-nowrap">
                                      End
                                    </th>
                                    <th className="px-4 py-3 font-semibold text-black dark:text-white text-center whitespace-nowrap">
                                      Days
                                    </th>
                                    <th className="px-4 py-3 font-semibold text-black dark:text-white whitespace-nowrap">
                                      Assigned By
                                    </th>
                                    <th className="px-4 py-3 font-semibold text-black dark:text-white text-center whitespace-nowrap">
                                      Status
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-800">
                                  {outstationAssignments
                                    .filter((a) => {
                                      if (!outstationSearch.trim()) return true;
                                      const q = outstationSearch.toLowerCase();
                                      const ev = (a.project || a.meeting_title || a.purpose || a.destination || '').toLowerCase();
                                      const by = (a.assigned_by_name || a.assigned_by || '').toLowerCase();
                                      return ev.includes(q) || by.includes(q);
                                    })
                                    .map((a, idx) => {
                                      const eventName = (a.project && a.project.trim() !== '-' && a.project.trim() !== '')
                                        ? a.project.trim()
                                        : (a.meeting_title && a.meeting_title.trim() !== '-' && a.meeting_title.trim() !== '')
                                        ? a.meeting_title.trim()
                                        : (a.purpose && a.purpose.trim() !== '-' && a.purpose.trim() !== '')
                                        ? a.purpose.trim()
                                        : (a.destination ? `Trip to ${a.destination}` : 'General Event');

                                      const totalDays = a.total_days != null ? Number(a.total_days) : calcDaysBetween(a.start_date, a.end_date);
                                      const status = a.status || computeClientOutstationStatus(a);

                                      return (
                                        <tr key={a.id || idx} onClick={() => setViewOutstationDetail(a)} className="hover:bg-pink-50/20 dark:hover:bg-slate-700/30 transition-colors cursor-pointer" title="Click to view details">
                                          {/* Event */}
                                          <td className="px-4 py-3 align-middle">
                                            <div className="font-bold text-black dark:text-white">
                                              {eventName}
                                            </div>
                                            {a.destination && (
                                              <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                                                <MapPin className="w-3 h-3 text-[#942392] shrink-0" />
                                                <span>{a.destination}</span>
                                                {a.client_company && <span>• {a.client_company}</span>}
                                              </div>
                                            )}
                                          </td>

                                          {/* Start */}
                                          <td className="px-3 py-3 align-middle whitespace-nowrap font-medium text-black dark:text-white">
                                            {formatOutstationDate(a.start_date)}
                                            {a.start_time && (
                                              <span className="block text-[10px] text-muted-foreground">{a.start_time.slice(0, 5)}</span>
                                            )}
                                          </td>

                                          {/* End */}
                                          <td className="px-3 py-3 align-middle whitespace-nowrap font-medium text-black dark:text-white">
                                            {formatOutstationDate(a.end_date)}
                                            {a.end_time && (
                                              <span className="block text-[10px] text-muted-foreground">{a.end_time.slice(0, 5)}</span>
                                            )}
                                          </td>

                                          {/* Days */}
                                          <td className="px-3 py-3 align-middle text-center whitespace-nowrap">
                                            <span className="font-black text-[#942392] text-xs">
                                              {totalDays} {totalDays === 1 ? 'Day' : 'Days'}
                                            </span>
                                          </td>

                                          {/* Assigned By */}
                                          <td className="px-4 py-3 align-middle whitespace-nowrap text-black dark:text-white font-medium">
                                            <div>{a.assigned_by_name ? cleanAssignerName(a.assigned_by_name) : (a.assigned_by || '—')}</div>
                                            {a.assigned_by_role && (
                                              <span className="text-[10px] text-muted-foreground block capitalize">
                                                {a.assigned_by_role.replace(/_/g, ' ')}
                                              </span>
                                            )}
                                          </td>

                                          {/* Status */}
                                          <td className="px-3 py-3 align-middle text-center whitespace-nowrap">
                                            {renderOutstationStatusBadge(status)}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="location_history">
                  <div className="p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800/60">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Location History</h3>
                      <span className="text-xs text-muted-foreground font-semibold">
                        {locationHistoryTotal ? `Showing ${locationHistory.length} of ${locationHistoryTotal} records` : `${locationHistory.length} records`}
                      </span>
                    </div>
                    {loadingSettings ? (
                      <div className="flex items-center justify-center min-h-[200px]">
                        <p className="text-sm text-muted-foreground">Loading location history...</p>
                      </div>
                    ) : locationHistory.length === 0 ? (
                      <div className="flex items-center justify-center min-h-[200px]">
                        <p className="text-sm text-muted-foreground">No location history available for this employee.</p>
                      </div>
                    ) : (
                      <>
                        <div className="relative">
                          <div className="overflow-x-auto max-h-[400px] overflow-y-auto" id="staff-location-scroll">
                            <table className="w-full text-xs">
                              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 z-10">
                                <tr>
                                  <th className="text-left font-black text-foreground uppercase tracking-widest px-2 py-2">Timestamp</th>
                                  <th className="text-left font-black text-foreground uppercase tracking-widest px-2 py-2">Coordinates</th>
                                  <th className="text-left font-black text-foreground uppercase tracking-widest px-2 py-2">Distance from Branch</th>
                                  <th className="text-left font-black text-foreground uppercase tracking-widest px-2 py-2">Location Status</th>
                                  <th className="text-left font-black text-foreground uppercase tracking-widest px-2 py-2">Attendance Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(Array.isArray(locationHistory) ? locationHistory : []).map((h: any, idx: number) => {
                                  const ts = h.timestamp ? new Date(h.timestamp) : null;
                                  const dateStr = ts ? ts.toLocaleDateString('ms-MY', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';
                                  const timeStr = ts ? ts.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : '-';
                                  const pLat = Number(h.lat);
                                  const pLng = Number(h.lng);
                                  const isNoGPS = (!pLat && !pLng) || (pLat === 0 && pLng === 0);

                                  const statusColors: Record<string, string> = {
                                    'Clock In': 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30',
                                    'Clock Out': 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30',
                                    'Replacement Leave': 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30',
                                    'Outstation': 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30',
                                  };
                                  const statusDotColors: Record<string, string> = {
                                    'Clock In': 'bg-blue-500',
                                    'Clock Out': 'bg-indigo-500',
                                    'Replacement Leave': 'bg-amber-500',
                                    'Outstation': 'bg-purple-500',
                                  };
                                  const attStatus = h.attendance_status || null;
                                  const attClass = attStatus ? (statusColors[attStatus] || 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-500/20 dark:text-teal-300 dark:border-teal-500/30') : '';
                                  const attDot = attStatus ? (statusDotColors[attStatus] || 'bg-teal-500') : '';

                                  return (
                                    <tr key={idx} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-900/30">
                                      <td className="px-2 py-2 whitespace-nowrap">
                                        <div className="font-bold text-foreground">{dateStr}</div>
                                        <div className="text-muted-foreground">{timeStr}</div>
                                      </td>
                                      <td className="px-2 py-2 font-mono text-[8px] print:text-[13px] text-muted-foreground whitespace-nowrap">
                                        {isNoGPS ? 'N/A' : `${pLat.toFixed(7)}, ${pLng.toFixed(7)}`}
                                      </td>
                                      <td className="px-2 py-2 whitespace-nowrap font-bold text-foreground">
                                        {isNoGPS || h.distance == null ? '-' : `${h.distance} m`}
                                      </td>
                                      <td className="px-2 py-2">
                                        {isNoGPS ? (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] print:text-[13px] font-black border uppercase tracking-widest bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/20 dark:text-slate-300 dark:border-slate-500/30">
                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                                            No GPS
                                          </span>
                                        ) : h.location_status === 'OFF-SITE' ? (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] print:text-[13px] font-black border uppercase tracking-widest bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/20 dark:text-orange-300 dark:border-orange-500/30">
                                            <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                            Off-Site {h.is_update ? "- UPDATED" : ""}
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] print:text-[13px] font-black border uppercase tracking-widest bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                            On-Site {h.is_update ? "- UPDATED" : ""}
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-2 py-2">
                                        {attStatus ? (
                                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] print:text-[13px] font-black border uppercase tracking-widest ${attClass}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${attDot}`} />
                                            {attStatus}
                                          </span>
                                        ) : (
                                          <span className="text-muted-foreground">-</span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                          <button 
                            onClick={() => {
                              const el = document.getElementById('staff-location-scroll');
                              if (el) el.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="absolute bottom-4 right-4 z-50 p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full shadow-lg hover:bg-slate-50 dark:hover:bg-slate-700 hover:scale-105 transition-all text-slate-600 dark:text-slate-300"
                            title="Scroll to Top"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 19V5M5 12l7-7 7 7"/>
                            </svg>
                          </button>
                        </div>

                        {/* Load More Button Footer */}
                        <div className="pt-3 flex items-center justify-between border-t border-slate-200 dark:border-slate-700/60 mt-3">
                          <span className="text-xs text-muted-foreground font-medium">
                            Showing {locationHistory.length} of {locationHistoryTotal || locationHistory.length} records
                          </span>
                          {locationHistoryHasMore ? (
                            <Button
                              onClick={handleLoadMoreLocationHistory}
                              disabled={loadingMoreLocationHistory}
                              variant="outline"
                              size="sm"
                              className="text-xs print:text-[11px] font-bold uppercase tracking-widest gap-2 bg-card border-[#942392]/30 text-[#942392] hover:bg-[#942392]/10"
                            >
                              {loadingMoreLocationHistory ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading...
                                </>
                              ) : (
                                "Load More"
                              )}
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">All records loaded</span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </TabsContent>

</Tabs>
            ) : (
              <div className="py-20 text-center text-foreground dark:text-foreground">
                <p>Loading profile details...</p>
              </div>
            )}
    </>
  );

  return (
    <>
      {isPage ? (
        <div className="w-full space-y-4 animate-in fade-in duration-300">
          {/* Top navigation with left side arrow */}
          <div className="flex items-center justify-between pb-3 border-b border-border/40">
            <Button
              variant="ghost"
              size="sm"
              className="group gap-2 px-0 text-[#942392] hover:bg-transparent hover:text-[#5e0080] transition-all duration-200 touch-target cursor-pointer active:scale-95"
              onClick={() => {
                if (onBack) onBack();
                else if (onClose) onClose();
              }}
            >
              <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
              <span className="text-xs font-black uppercase tracking-widest">
                BACK TO EMPLOYEE DIRECTORY
              </span>
            </Button>
            {selectedEmployee && (
              <div className="flex items-center gap-2">
                <Badge className="bg-[#942392]/10 text-[#942392] dark:bg-[#942392]/20 dark:text-purple-300 border-none text-[10px] font-black uppercase px-2.5 py-1">
                  {selectedEmployee.branch}
                </Badge>
                <span className="text-xs font-mono font-bold text-muted-foreground">
                  {selectedEmployee.user_id}
                </span>
              </div>
            )}
          </div>
          <div className="w-full">
            {renderTabsContent()}
          </div>
        </div>
      ) : (
        <Dialog open={isModalOpen} onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open && onClose) {
            onClose();
          }
        }}>
          <DialogContent className="max-w-6xl w-full overflow-hidden border-0 border-none shadow-2xl rounded-2xl p-0 gap-0 bg-slate-50 dark:bg-slate-900 print:hidden flex flex-col max-h-[90vh]">
            <DialogHeader className="p-4 pb-3 bg-[#942392] shrink-0 z-10 shadow-sm text-white border-none">
              <DialogTitle className="text-xl font-black tracking-tight text-white uppercase">Staff Profile {selectedEmployee ? `- ${selectedEmployee.name} (${selectedEmployee.branch})` : ""}</DialogTitle>
            </DialogHeader>
            <div className="p-4 overflow-y-auto flex-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {renderTabsContent()}
            </div>
          </DialogContent>
        </Dialog>
      )}
      {/* LEAVE FORMS DIALOG */}
      <Dialog open={!!viewLeaveStatus} onOpenChange={(open) => !open && setViewLeaveStatus(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden p-0 border-0 border-none shadow-2xl rounded-2xl flex flex-col">
          <div className="print:hidden flex flex-col flex-1 overflow-hidden">
            <DialogHeader className="bg-[#942392] p-6 text-white shrink-0 border-none">
              <DialogTitle className="flex items-center gap-2 text-white">
                <FileText className="h-5 w-5 text-white/90" />
                {viewLeaveStatus} Leaves - {selectedEmployee?.name}
              </DialogTitle>
              <DialogDescription className="text-white/80">
                Review the submitted leave forms with this status.
              </DialogDescription>
            </DialogHeader>

            <div className="p-6 overflow-y-auto flex-1">

          {loadingLeaves ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4 mt-2">
              {(Array.isArray(employeeLeaves) ? employeeLeaves : []).filter(req => {
                const status = (req.status || "").toLowerCase().trim();
                const viewStatus = (viewLeaveStatus || "").toLowerCase().trim();
                if (viewStatus === "pending") return status.includes("pending");
                return status === viewStatus;
              }).length === 0 ? (
                <p className="text-sm text-center text-foreground p-4 italic">No {viewLeaveStatus?.toLowerCase()} leave records found for this staff member.</p>
              ) : (
                <div className="border border-border/50 rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="text-[8px] print:text-[13px]">Leave Type</TableHead>
                        <TableHead className="text-[8px] print:text-[13px]">Start Date</TableHead>
                        <TableHead className="text-[8px] print:text-[13px]">End Date</TableHead>
                        <TableHead className="text-[8px] print:text-[13px]">Days</TableHead>
                        <TableHead className="text-[8px] print:text-[13px] text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(Array.isArray(employeeLeaves) ? employeeLeaves : [])
                        .filter(req => {
                          const status = (req.status || "").toLowerCase().trim();
                          const viewStatus = (viewLeaveStatus || "").toLowerCase().trim();
                          if (viewStatus === "pending") return status.includes("pending");
                          return status === viewStatus;
                        })
                        .map(req => {
                          const fromStr = new Date(req.start_date).toLocaleDateString('ms-MY', { day: '2-digit', month: '2-digit', year: 'numeric' });
                          const toStr = new Date(req.end_date).toLocaleDateString('ms-MY', { day: '2-digit', month: '2-digit', year: 'numeric' });
                          return (
                            <TableRow key={req.leave_id} className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setSelectedLeaveFormDetail(req)}>
                              <TableCell className="font-bold text-xs">{req.leave_type}</TableCell>
                              <TableCell className="text-xs">{fromStr}</TableCell>
                              <TableCell className="text-xs">{toStr}</TableCell>
                              <TableCell className="text-xs print:text-[11px] font-bold">{req.days}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-[8px] print:text-[13px] bg-[#942392] text-white hover:bg-[#5c0073] hover:text-white font-bold"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedLeaveFormDetail(req);
                                  }}
                                >
                                  View Form
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* LEAVE APPLICATION DETAIL DIALOG (MATCHES LEAVE ADMIN) */}
      <Dialog open={!!selectedLeaveFormDetail} onOpenChange={(open) => !open && setSelectedLeaveFormDetail(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto border-none shadow-2xl rounded-[32px] p-0 safe-area-bottom">
          {selectedLeaveFormDetail && (() => {
            const req = selectedLeaveFormDetail;
            const fromStr = new Date(req.start_date).toLocaleDateString('ms-MY', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const toStr = new Date(req.end_date).toLocaleDateString('ms-MY', { day: '2-digit', month: '2-digit', year: 'numeric' });
            return (
              <>
                <div className="p-6 bg-gradient-to-br from-[#942392] to-[#a855f7] text-white print:hidden">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-3 text-white text-xl font-black tracking-tight">
                      <FileText className="h-6 w-6" />
                      Leave Application Detail
                    </DialogTitle>
                    <DialogDescription className="text-white/80 font-bold uppercase text-[8px] print:text-[13px] tracking-widest">
                      HR Approval Registry • ID: {req.leave_id}
                    </DialogDescription>
                  </DialogHeader>
                </div>

                <div id="leave-form-print" ref={printRef} className="p-4 sm:p-6 print:p-6 space-y-4">
                  <div className="rounded-[24px] border border-border/50 p-4 sm:p-6 print:p-6 space-y-4 bg-card shadow-sm">
                    <div className="text-center border-b-2 border-foreground/50 dark:border-purple-500/50 pb-4">
                      <h2 className="text-2xl print:text-4xl font-black tracking-tighter text-foreground dark:text-purple-400">RAYHAR GROUP</h2>
                      <p className="text-[10px] print:text-xs font-black tracking-[0.2em] print:tracking-[0.3em] uppercase opacity-60 dark:text-purple-300">Permohonan Cuti Kakitangan</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 print:gap-y-6 print:gap-x-8 text-xs print:text-[11px] font-bold">
                      <div className="space-y-1 print:space-y-1.5">
                        <span className="text-[9px] print:text-[13px] uppercase font-black text-slate-950 dark:text-slate-50">Nama Penuh</span>
                        <p className="border-b pb-1 print:pb-2 border-border/40 truncate">{selectedEmployee?.name}</p>
                      </div>
                      <div className="space-y-1 print:space-y-1.5">
                        <span className="text-[9px] print:text-[13px] uppercase font-black text-slate-950 dark:text-slate-50">Cawangan</span>
                        <p className="border-b pb-1 print:pb-2 border-border/40">{selectedEmployee?.branch || "HQ"}</p>
                      </div>
                      <div className="space-y-1 print:space-y-1.5">
                        <span className="text-[9px] print:text-[13px] uppercase font-black text-slate-950 dark:text-slate-50">Jenis Cuti</span>
                        <p className="border-b pb-1 print:pb-2 border-border/40">{req.leave_type}</p>
                      </div>
                      <div className="space-y-1 print:space-y-1.5">
                        <span className="text-[9px] print:text-[13px] uppercase font-black text-slate-950 dark:text-slate-50">Status</span>
                        <p className={`font-black uppercase ${req.status === "Rejected" ? "text-rose-600" : "text-[#942392]"}`}>
                          {req.status}
                        </p>
                      </div>
                    </div>

                    {!(req.leave_type === "Replacement Leave" || req.leave_type === "Cuti Ganti") ? (
                      <div className="grid grid-cols-4 gap-3 print:gap-4">
                      {/* Dari */}
                      <div className="border border-border/50 rounded-xl overflow-hidden flex flex-col">
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-1.5 text-center border-b border-border/50">
                          <p className="text-[9px] print:text-[13px] uppercase font-black text-slate-950 dark:text-slate-50">Dari</p>
                        </div>
                        <div className="p-2 flex-1 flex items-center justify-center bg-white dark:bg-slate-950">
                          <p className="font-black text-xs sm:text-sm print:text-[11px] text-center">{req.from}</p>
                        </div>
                      </div>
                      
                      {/* Hingga */}
                      <div className="border border-border/50 rounded-xl overflow-hidden flex flex-col">
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-1.5 text-center border-b border-border/50">
                          <p className="text-[9px] print:text-[13px] uppercase font-black text-slate-950 dark:text-slate-50">Hingga</p>
                        </div>
                        <div className="p-2 flex-1 flex items-center justify-center bg-white dark:bg-slate-950">
                          <p className="font-black text-xs sm:text-sm print:text-[11px] text-center">{req.to}</p>
                        </div>
                      </div>
                      
                      {/* Bilangan Hari */}
                      <div className="border border-[#942392]/30 rounded-xl overflow-hidden flex flex-col shadow-sm">
                        <div className="bg-[#942392]/5 p-1.5 text-center border-b border-[#942392]/20">
                          <p className="text-[9px] print:text-[13px] uppercase font-black text-[#942392]">Bilangan Hari</p>
                        </div>
                        <div className="p-2 flex-1 flex items-center justify-center bg-white dark:bg-slate-950">
                          <p className="font-black text-xs sm:text-sm print:text-[11px] text-[#942392] text-center">{req.days}</p>
                        </div>
                      </div>
                      
                      {/* Baki Layak */}
                      <div className="border border-emerald-500/40 rounded-xl overflow-hidden flex flex-col shadow-sm">
                        <div className="bg-emerald-50 p-1.5 text-center border-b border-emerald-500/20 dark:bg-emerald-950/20">
                          <p className="text-[9px] print:text-[13px] uppercase font-black text-emerald-600">Baki Layak</p>
                        </div>
                        <div className="p-2 flex-1 flex items-center justify-center bg-white dark:bg-slate-950">
                          <p className="font-black text-xs sm:text-sm print:text-[11px] text-emerald-600 text-center">{req.balance ?? "-"} HARI</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-[20px] border border-border/50">
                        <span className="text-[10px] print:text-[13px] font-black uppercase text-slate-950 dark:text-slate-50 tracking-wider pl-2">Jumlah Hari Cuti Ganti</span>
                        <div className="text-center bg-white dark:bg-slate-900 rounded-[14px] border border-border/50 px-6 py-1.5 shadow-sm flex flex-col justify-center">
                          <p className="text-[9px] print:text-[13px] uppercase font-black text-[#942392]">Hari</p>
                          <p className="font-black text-lg text-[#942392] leading-none mt-0.5">{req.days}</p>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <p className="text-[10px] print:text-[13px] font-black uppercase text-slate-950 dark:text-slate-50 tracking-widest">Sebab / Tujuan</p>
                      <p className="rounded-[16px] border border-border/40 p-4 font-bold text-foreground bg-muted/10 text-sm leading-relaxed">
                        {getCleanReason(req.reason) || "-"}
                      </p>
                    </div>

                    {/* Conditional Fields: Cuti Ganti */}
                    {(req.leave_type === "Replacement Leave" || req.leave_type === "Cuti Ganti") && (() => {
                      const rows = parseCutiGantiRows(
                        req.reason,
                        req.cuti_ganti_tarikh,
                        req.cuti_ganti_hari,
                        req.cuti_ganti_jam
                      );
                      return (
                        <div className="space-y-3">
                          <p className="text-[10px] print:text-[13px] font-black uppercase text-blue-600 opacity-80 tracking-widest px-1">Butiran Cuti Ganti</p>
                          <div className="border border-blue-500/20 rounded-[20px] overflow-hidden bg-blue-500/5">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-blue-500/10 hover:bg-blue-500/10 border-b border-blue-500/20">
                                  <TableHead className="py-2.5 px-4 text-[8px] print:text-[13px]">Tarikh Cuti</TableHead>
                                  <TableHead className="py-2.5 px-4 text-[8px] print:text-[13px]">Tarikh/Hari Cuti Ganti</TableHead>
                                  <TableHead className="py-2.5 px-4 text-[8px] print:text-[13px]">Keterangan / Tugasan</TableHead>
                                  <TableHead className="py-2.5 px-4 text-[8px] print:text-[13px] text-right">Jam Bekerja</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody className="divide-y divide-blue-500/10 font-bold text-foreground/80">
                                {rows.map((row, idx) => (
                                  <TableRow key={idx} className="hover:bg-blue-500/5">
                                    <TableCell className="py-2 px-4">{row.tarikhCuti || "-"}</TableCell>
                                    <TableCell className="py-2 px-4">{row.tarikhGanti || "-"}</TableCell>
                                    <TableCell className="py-2 px-4 whitespace-normal break-words max-w-[200px] text-[9px] print:text-[13px] text-blue-900/80 font-medium">{row.keterangan || "-"}</TableCell>
                                    <TableCell className="py-2 px-4 text-right">{row.jamGanti || 0} Jam</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Conditional Fields: Cuti Tanpa Gaji */}
                    {(req.leave_type === "Unpaid Leave" || req.leave_type === "Cuti Tanpa Gaji") && (
                      <div className="grid grid-cols-2 gap-4 print:gap-y-6 print:gap-x-8 text-[8px] print:text-[13px] border rounded-[20px] p-4 bg-rose-500/5 border-rose-500/20">
                        <div>
                          <p className="uppercase font-black text-rose-600 opacity-60">No. Tel H/P</p>
                          <p className="font-black mt-0.5">{req.cuti_tanpa_gaji_phone || "-"}</p>
                        </div>
                        <div>
                          <p className="uppercase font-black text-rose-600 opacity-60">Tandatangan</p>
                          <p className="font-black mt-0.5 text-rose-700">
                            {req.cuti_tanpa_gaji_signature ? "✓ DISAHKAN" : "TIADA PENGESAHAN"}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Conditional Fields: Cuti Sakit (MC) */}
                    {(req.leave_type === "Sick Leave" || req.leave_type === "Cuti Sakit") && req.mc_file_url && (
                      <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-[16px] flex items-center justify-between group print:hidden">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-[#942392]" />
                          <span className="text-[10px] print:text-[13px] font-black text-[#942392] uppercase tracking-widest">MC Attachment</span>
                        </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={sanitizeUrl(getMcAttachmentUrl(req.mc_file_url) || safeFileUrl(req.mc_file_url, "about:blank"))}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] print:text-[13px] font-black uppercase tracking-widest bg-[#942392] text-white px-4 py-2 rounded-xl hover:bg-[#5e0080] transition-colors shadow-lg"
                        >
                          View File
                        </a>
                        <button
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            try {
                              const empName = req.employee || req.full_name || selectedEmployee?.name || "UNKNOWN";
                              const branchName = req.branch || selectedEmployee?.branch || "HQ";
                              const leaveType = req.type || req.leave_type || "MC";
                              
                              let originalExt = "pdf";
                              if (req.mc_file_url) {
                                const match = req.mc_file_url.match(/\.([a-zA-Z0-9]+)$/);
                                if (match) {
                                  originalExt = match[1];
                                }
                              }
                              const filename = `${empName} - ${branchName} - ${leaveType}.${originalExt}`;
                              
                              await downloadUploadedFile(req.mc_file_url, filename);
                            } catch (err) {
                              import("react-hot-toast").then(({ toast }) => toast.error("Failed to download file"));
                            }
                          }}
                          className="flex items-center justify-center gap-1.5 h-8 px-3 rounded-md border border-[#942392]/20 text-[#942392] hover:bg-[#942392] hover:text-white transition-colors"
                          title="Download File"
                        >
                          <Download className="w-4 h-4" />
                          <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline-block">Download File</span>
                        </button>
                      </div>
                      </div>
                    )}

                    {/* Maklumat Waris Section */}
                    <div className="pt-4 border-t border-border/50 space-y-4">
                      <div className="flex items-center gap-2">
                        <PhoneCall className="w-4 h-4 text-rose-500" />
                        <h3 className="text-[10px] print:text-[13px] font-black uppercase tracking-[0.2em]">Maklumat Waris (Kecemasan)</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-4 print:gap-y-6 print:gap-x-8 bg-muted/20 print:bg-transparent print:border-none p-4 print:px-0 rounded-[20px]">
                        <div className="space-y-1 print:space-y-1.5">
                          <span className="text-[10px] print:text-[13px] font-black text-slate-950 dark:text-slate-50 uppercase">Nama</span>
                          <p className="text-xs print:text-[11px] font-bold truncate">{req.waris_nama || "-"}</p>
                        </div>
                        <div className="space-y-1 print:space-y-1.5">
                          <span className="text-[10px] print:text-[13px] font-black text-slate-950 dark:text-slate-50 uppercase">Hubungan</span>
                          <p className="text-xs print:text-[11px] font-bold truncate">{req.waris_hubungan || "-"}</p>
                        </div>
                        <div className="space-y-1 print:space-y-1.5">
                          <span className="text-[10px] print:text-[13px] font-black text-slate-950 dark:text-slate-50 uppercase">No. Telefon</span>
                          <p className="text-[9px] print:text-[13px] font-black text-[#942392]">{req.waris_phone || "-"}</p>
                        </div>
                        <div className="space-y-1 print:space-y-1.5">
                          <span className="text-[10px] print:text-[13px] font-black text-slate-950 dark:text-slate-50 uppercase">Alamat</span>
                          <p className="text-xs print:text-[11px] font-bold break-words">{req.waris_alamat || "-"}</p>
                        </div>
                      </div>
                    </div>

                    {/* Approval History Timeline */}
                    <div className="space-y-4 pt-4 border-t border-border/50">
                      <ApprovalHistoryTimeline 
                        status={req.status} 
                        approvalHistory={Array.isArray(req.approval_history) ? req.approval_history : []}
                        branch={req.branch || "HQ"} 
                        department={req.department || ""}
                        pendingApproverName={req.pending_approver_name}
                      />
                    </div>

                    <div className="hidden print:block pt-24 mt-12 pb-2">
                      <div className="grid grid-cols-2 gap-16">
                        <div className="border-t border-foreground pt-2 text-center">
                          <p className="text-[10px] print:text-[13px] font-bold uppercase">Tandatangan Kakitangan</p>
                        </div>
                        <div className="border-t border-foreground pt-2 text-center">
                          <p className="text-[10px] print:text-[13px] font-bold uppercase">Kelulusan Pengurus / HR</p>
                        </div>
                      </div>
                      <p className="text-[9px] print:text-[13px] text-center italic mt-4 text-foreground">
                        Borang ini sah digunakan sebagai bukti rasmi cuti kakitangan setelah mendapat kelulusan pihak pengurusan.
                      </p>
                    </div>

                    <p className="text-[8px] print:text-[13px] text-center italic text-muted-foreground pt-4 print:hidden">
                      Borang ini sah digunakan sebagai bukti rasmi cuti kakitangan setelah mendapat kelulusan pihak pengurusan.
                    </p>

                    <div className="pt-4 flex justify-end gap-3 print:hidden">
                      <Button
                        type="button"
                        variant="outline"
                        className="gap-2 border-[#942392] text-[#942392] hover:bg-[#942392]/5 rounded-xl font-black text-[8px] print:text-[13px] uppercase tracking-widest px-6"
                        onClick={async () => {
                          const originalTitle = document.title;
                          const empName = selectedEmployee?.name || selectedEmployee?.full_name || "UNKNOWN";
                          const branch = selectedEmployee?.branch || selectedEmployee?.branch_code || "HQ";
                          document.title = `LEAVE REQUEST ( ${empName.toUpperCase()} - ${branch.toUpperCase()} )`;
                          if (req.mc_file_url) {
                            await preloadImage(getMcAttachmentUrl(req.mc_file_url), safeFileUrl(req.mc_file_url));
                            await new Promise((r) => setTimeout(r, 200));
                          }
                          handlePrint();
                          setTimeout(() => {
                            document.title = originalTitle;
                          }, 500);
                        }}
                      >
                        <Printer className="w-4 h-4" /> Save to PDF
                      </Button>
                    </div>

                    </div>
                {/* Print-only MC Document Page */}
                    {(req.leave_type === "Sick Leave" || req.leave_type === "Cuti Sakit") && req.mc_file_url && (
                      <div 
                        className="opacity-0 h-0 w-0 overflow-hidden absolute print:static print:opacity-100 print:h-auto print:w-full print:break-before-page print:pt-6 print:border-2 print:border-black print:p-6 print:mt-6 print:overflow-visible"
                        style={{
                          pageBreakBefore: "always",
                          breakBefore: "page",
                          pageBreakInside: "avoid",
                          breakInside: "avoid"
                        }}
                      >
                        <div className="text-center mb-6">
                          <h2 className="text-xl font-bold uppercase tracking-widest text-black border-b-2 border-black inline-block pb-2">MC DOCUMENT</h2>
                        </div>
                        {isPdfUrl(req.mc_file_url) ? (
                          <div className="p-8 border-2 border-slate-300 rounded-xl text-center my-6 space-y-3 bg-slate-50/50">
                            <FileText className="w-12 h-12 mx-auto text-[#942392]" />
                            <p className="font-black text-sm uppercase text-slate-800 tracking-wider">Lampiran Sijil Cuti Sakit (Format PDF)</p>
                            <p className="text-xs text-slate-600 font-mono break-all">{req.mc_file_url.split('/').pop()}</p>
                            <p className="text-xs text-slate-500 italic mt-2">Dokumen ini telah dilampirkan dalam format PDF. Sila guna butang &quot;View File&quot; atau &quot;Download File&quot; dalam portal untuk melihat fail asal.</p>
                          </div>
                        ) : (
                          <div className="w-full flex items-center justify-center max-h-[750px]">
                            <img 
                              src={sanitizeUrl(getMcAttachmentUrl(req.mc_file_url) || safeFileUrl(req.mc_file_url, "about:blank"))} 
                              alt="MC Attachment" 
                              className="max-w-full max-h-[750px] object-contain block mx-auto"
                              onError={(e) => {
                                const currentSrc = e.currentTarget.src;
                                if (currentSrc.includes('supabase.co')) {
                                  e.currentTarget.src = sanitizeUrl(safeFileUrl(req.mc_file_url, "about:blank"));
                                }
                              }}
                            />
                          </div>
                        )}
                      </div>
                    )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Add User Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-xl md:max-w-2xl overflow-hidden p-0 border-0 border-none shadow-2xl rounded-3xl [&>button]:text-white [&>button]:hover:text-white/80 bg-card">
          <DialogHeader className="bg-[#942392] p-6 text-white border-b border-white/20 shrink-0 text-left">
            <DialogTitle className="text-white font-black uppercase tracking-tight text-lg m-0">Add New Staff</DialogTitle>
            <DialogDescription className="text-white/80 text-xs font-bold uppercase tracking-wider m-0 mt-1">
              Create a new user account for an employee. They will be assigned to the selected branch.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSignup} className="p-6 space-y-4 bg-card">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="signup-name" className="text-[10px] font-black uppercase tracking-widest text-foreground">
                  Full Name
                </Label>
                <Input
                  id="signup-name"
                  type="text"
                  className="h-11 px-4 bg-background/50 border border-border/80 focus:border-[#942392] focus:ring-2 focus:ring-[#942392]/10 rounded-xl text-xs font-bold uppercase placeholder:normal-case"
                  placeholder="e.g. AHMAD ALBAB"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value.toUpperCase())}
                  required
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5 col-span-1">
                <Label htmlFor="signup-email" className="text-[10px] font-black uppercase tracking-widest text-foreground">
                  Email Address
                </Label>
                <Input
                  id="signup-email"
                  type="email"
                  className="h-11 px-4 bg-background/50 border border-border/80 focus:border-[#942392] focus:ring-2 focus:ring-[#942392]/10 rounded-xl text-xs font-bold"
                  placeholder="ahmad@rayhar.com"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  required
                />
              </div>

              {/* Branch */}
              <div className="space-y-1.5 col-span-1">
                <Label htmlFor="signup-branch" className="text-[10px] font-black uppercase tracking-widest text-foreground">
                  Branch Assignment
                </Label>
                <Select value={signupBranch} onValueChange={setSignupBranch}>
                  <SelectTrigger className="h-11 px-4 rounded-xl border border-input bg-background/50 text-xs font-bold shadow-xs">
                    <SelectValue placeholder="Select Branch" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {(Array.isArray(branchesList) ? branchesList : []).map((b) => (
                      <SelectItem key={b.code} value={b.code} className="text-xs font-bold">
                        {b.code} - {toProperCase(b.name)}
                      </SelectItem>
                    ))}
                    {branchesList.length === 0 && (
                      <SelectItem value="HQ" disabled className="text-xs">Loading branches...</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Department - only shown if HQ */}
              {signupBranch === "HQ" && (
                <div className="space-y-1.5 col-span-1 animate-in fade-in slide-in-from-top-2">
                  <Label htmlFor="signup-department" className="text-[10px] font-black uppercase tracking-widest text-foreground">
                    Department
                  </Label>
                  <Select value={signupDepartment} onValueChange={setSignupDepartment} required>
                    <SelectTrigger className="h-11 px-4 rounded-xl border border-input bg-background/50 text-xs font-bold shadow-xs">
                      <SelectValue placeholder="Select Department" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {(Array.isArray(departmentsList) ? departmentsList : []).map((d) => {
                        const dName = d.name || d.department_name || d;
                        return (
                          <SelectItem key={dName} value={dName} className="text-xs font-bold">
                            {toProperCase(dName)}
                          </SelectItem>
                        );
                      })}
                      {departmentsList.length === 0 && (
                        <SelectItem value="IT" disabled className="text-xs">Loading departments...</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Role */}
              <div className="space-y-1.5 col-span-1">
                <Label htmlFor="signup-role" className="text-[10px] font-black uppercase tracking-widest text-foreground">
                  Role
                </Label>
                <Select value={signupRole} onValueChange={setSignupRole}>
                  <SelectTrigger className="h-11 px-4 rounded-xl border border-input bg-background/50 text-xs font-bold shadow-xs">
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl max-h-64">
                    <SelectGroup>
                      <SelectLabel className="text-xs font-bold text-slate-500 uppercase tracking-wider">System Roles</SelectLabel>
                      {(Array.isArray(availableRoles) ? availableRoles : [])
                        .filter((r) => r.is_system_role && r.status === 'Active')
                        .map((r) => (
                          <SelectItem key={r.id} value={r.name} className="text-xs font-bold">
                            {r.name}
                          </SelectItem>
                        ))}
                    </SelectGroup>
                    <SelectSeparator />
                    <SelectGroup>
                      <SelectLabel className="text-xs font-bold text-slate-500 uppercase tracking-wider">Custom Roles</SelectLabel>
                      {(Array.isArray(availableRoles) ? availableRoles : [])
                        .filter((r) => !r.is_system_role && r.status === 'Active')
                        .map((r) => (
                          <SelectItem key={r.id} value={r.name} className="text-xs font-bold">
                            {r.name}
                          </SelectItem>
                        ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {/* Password */}
              <div className={`space-y-1.5 ${signupBranch === "HQ" ? "col-span-2 md:col-span-2" : "col-span-1"}`}>
                <Label htmlFor="signup-password" className="text-[10px] font-black uppercase tracking-widest text-foreground">
                  Password
                </Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="Min. 6 characters"
                  className="h-11 px-4 bg-background/50 border border-border/80 focus:border-[#942392] focus:ring-2 focus:ring-[#942392]/10 rounded-xl text-xs font-bold"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div className="border-t border-border/60 pt-4 mt-6 flex items-center justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)} className="rounded-xl px-5 h-10 text-xs font-bold uppercase tracking-wider">
                Cancel
              </Button>
              <Button type="submit" className="bg-[#942392] hover:bg-[#800A7A] text-white rounded-xl px-6 h-10 text-xs font-black uppercase tracking-wider shadow-sm transition-all" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                {isSubmitting ? "Creating..." : "Create User"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* OUTSTATION ASSIGNMENT DETAIL MODAL */}
      <Dialog open={!!viewOutstationDetail} onOpenChange={() => setViewOutstationDetail(null)}>
        <DialogContent className="max-w-lg w-[95vw] sm:w-full rounded-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
          {viewOutstationDetail && (
            <>
              <div className="bg-[#942392] px-6 py-5 text-white shrink-0">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-white/20 shrink-0">
                    <Plane className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/70 mb-1">Outstation Assignment Detail</p>
                    <h2 className="text-base font-black truncate">
                      {viewOutstationDetail.project || viewOutstationDetail.meeting_title || viewOutstationDetail.purpose || (viewOutstationDetail.destination ? `Trip to ${viewOutstationDetail.destination}` : 'General Event')}
                    </h2>
                  </div>
                </div>
              </div>

              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase">Destination</p>
                    <p className="text-sm font-black text-slate-800 dark:text-slate-100 mt-0.5">{viewOutstationDetail.destination}</p>
                    {viewOutstationDetail.client_company && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">{viewOutstationDetail.client_company}</p>
                    )}
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase">Status</p>
                    <div className="mt-1">{renderOutstationStatusBadge(viewOutstationDetail.status || computeClientOutstationStatus(viewOutstationDetail))}</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase">Start Date</p>
                    <p className="text-sm font-black text-slate-800 dark:text-slate-100 mt-0.5">{formatOutstationDate(viewOutstationDetail.start_date)}</p>
                    {viewOutstationDetail.start_time && (
                      <p className="text-[10px] text-muted-foreground">{viewOutstationDetail.start_time.slice(0, 5)}</p>
                    )}
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase">End Date</p>
                    <p className="text-sm font-black text-slate-800 dark:text-slate-100 mt-0.5">{formatOutstationDate(viewOutstationDetail.end_date)}</p>
                    {viewOutstationDetail.end_time && (
                      <p className="text-[10px] text-muted-foreground">{viewOutstationDetail.end_time.slice(0, 5)}</p>
                    )}
                  </div>
                  <div className="bg-[#942392]/5 rounded-xl p-3 border border-[#942392]/20">
                    <p className="text-[10px] text-[#942392] font-bold uppercase">Total Days</p>
                    <p className="text-lg font-black text-[#942392] mt-0.5">
                      {viewOutstationDetail.total_days != null ? Number(viewOutstationDetail.total_days) : calcDaysBetween(viewOutstationDetail.start_date, viewOutstationDetail.end_date)} Days
                    </p>
                  </div>
                </div>

                {viewOutstationDetail.purpose && (
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase">Purpose / Scope</p>
                    <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 whitespace-pre-wrap">{viewOutstationDetail.purpose}</p>
                  </div>
                )}

                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase">Assigned By</p>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {viewOutstationDetail.assigned_by_name || viewOutstationDetail.assigned_by || '—'}
                  </p>
                  {viewOutstationDetail.assigned_by_role && (
                    <p className="text-[10px] text-muted-foreground capitalize">{viewOutstationDetail.assigned_by_role.replace(/_/g, ' ')}</p>
                  )}
                </div>
              </div>

              <div className="px-6 pb-5 flex justify-end">
                <Button variant="outline" onClick={() => setViewOutstationDetail(null)} className="rounded-xl text-xs font-bold">
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>


      {/* EDIT PERSONAL INFO MODAL (HR ONLY) */}
      <Dialog open={isEditPersonalModalOpen} onOpenChange={setIsEditPersonalModalOpen}>
        <DialogContent className="sm:max-w-xl md:max-w-2xl overflow-hidden p-0 border-0 border-none shadow-2xl rounded-3xl [&>button]:text-white [&>button]:hover:text-white/80 bg-card">
          <DialogHeader className="bg-[#942392] p-6 text-white border-b border-white/20 shrink-0 text-left">
            <DialogTitle className="text-white font-black uppercase tracking-tight text-lg m-0 flex items-center gap-2">
              <Edit className="w-5 h-5 text-white" />
              Edit Employee Details
            </DialogTitle>
            <DialogDescription className="text-white/80 text-xs font-bold uppercase tracking-wider m-0 mt-1">
              Update personal & employment records for {selectedEmployee?.name || "Employee"} ({selectedEmployee?.user_id})
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePersonalInfo} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="space-y-1.5">
                <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Full Name *</Label>
                <Input
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  placeholder="e.g. AHMAD BIN ALI"
                  required
                  className="h-10 text-xs font-bold uppercase"
                />
              </div>

              {/* IC Number */}
              <div className="space-y-1.5">
                <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">IC Number (MyKad)</Label>
                <Input
                  value={editIcNumber}
                  onChange={(e) => setEditIcNumber(formatMyKad(e.target.value))}
                  placeholder="YYMMDD-SS-####"
                  className="h-10 text-xs font-mono font-bold"
                />
              </div>

              {/* Dynamic DOB (Auto from IC) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Date of Birth (Auto from IC)</Label>
                <Input
                  value={parsedEditIc.formattedDob || "Auto calculated from IC"}
                  readOnly
                  className="h-10 text-xs bg-slate-50 dark:bg-slate-900/50 font-bold text-muted-foreground cursor-not-allowed"
                />
              </div>

              {/* Dynamic Age & Gender (Auto from IC) */}
              <div className="space-y-1.5 grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Age</Label>
                  <Input
                    value={parsedEditIc.age !== null ? `${parsedEditIc.age} yrs` : "—"}
                    readOnly
                    className="h-10 text-xs bg-slate-50 dark:bg-slate-900/50 font-bold text-[#942392] cursor-not-allowed"
                  />
                </div>
                <div>
                  <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Gender</Label>
                  <Input
                    value={parsedEditIc.gender || selectedEmployee?.gender || "—"}
                    readOnly
                    className="h-10 text-xs bg-slate-50 dark:bg-slate-900/50 font-bold text-muted-foreground cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div className="space-y-1.5">
                <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Phone Number</Label>
                <Input
                  value={editPhone}
                  onChange={(e) => setEditPhone(formatMalaysianPhone(e.target.value))}
                  placeholder="01X-XXXXXXX"
                  className="h-10 text-xs font-mono font-bold"
                />
              </div>

              {/* Date of Join */}
              <div className="space-y-1.5">
                <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Date of Join</Label>
                <Input
                  type="date"
                  value={editJoinDate}
                  onChange={(e) => setEditJoinDate(e.target.value)}
                  className="h-10 text-xs font-bold"
                />
              </div>

              {/* Branch */}
              <div className="space-y-1.5">
                <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Branch</Label>
                <Select value={editBranch} onValueChange={setEditBranch}>
                  <SelectTrigger className="h-10 text-xs font-bold">
                    <SelectValue placeholder="Select Branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(branchMap || BRANCH_NAMES).map(([code, name]) => (
                      <SelectItem key={code} value={code} className="text-xs font-bold">
                        {name} ({code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Department */}
              <div className="space-y-1.5">
                <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Department</Label>
                <Input
                  value={editDepartment}
                  onChange={(e) => setEditDepartment(e.target.value)}
                  placeholder="e.g. IT Department, Haji Umrah"
                  className="h-10 text-xs font-bold"
                />
              </div>

              {/* Status */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Employment Status</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger className="h-10 text-xs font-bold">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active" className="text-xs font-bold text-emerald-600">Active</SelectItem>
                    <SelectItem value="Inactive" className="text-xs font-bold text-rose-600">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-border flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditPersonalModalOpen(false)}
                className="rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isUpdatingPersonalInfo}
                className="bg-[#942392] hover:bg-[#7a1c78] text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
              >
                {isUpdatingPersonalInfo ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT TODAY ATTENDANCE MODAL (HR ONLY) */}
      <Dialog open={isEditTodayAttendanceOpen} onOpenChange={setIsEditTodayAttendanceOpen}>
        <DialogContent className="w-[95vw] sm:max-w-xl md:max-w-2xl max-h-[90vh] flex flex-col gap-0 overflow-hidden p-0 border-0 border-none shadow-2xl rounded-3xl [&>button]:text-white [&>button]:hover:text-white/80 bg-card">
          <DialogHeader className="bg-[#942392] px-6 py-4 text-white border-b border-white/20 shrink-0 text-left">
            <DialogTitle className="text-white font-black uppercase tracking-tight text-lg m-0 flex items-center gap-2">
              <Clock className="w-5 h-5 text-white" />
              Edit Today's Attendance
            </DialogTitle>
            <DialogDescription className="text-white/80 text-xs font-bold uppercase tracking-wider m-0 mt-1">
              Update live attendance punch for {selectedEmployee?.name || "Employee"}
            </DialogDescription>
          </DialogHeader>

          {/* SESSIONS PAGINATION BAR (< 1 2 3 >) - Sessions appear automatically from user clock-in/out logs */}
          <div className="px-6 pt-4 pb-2 shrink-0">
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/60 px-3.5 py-2.5 rounded-2xl border border-border/60">
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={currentSessionIdx === 0}
                  onClick={() => handleSelectSession(currentSessionIdx - 1)}
                  className="h-8 w-8 p-0 rounded-lg text-xs font-black cursor-pointer"
                  title="Previous Session"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                {attendanceSessions.map((_, idx) => (
                  <Button
                    key={idx}
                    type="button"
                    size="sm"
                    onClick={() => handleSelectSession(idx)}
                    className={`h-8 min-w-[32px] px-2.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      currentSessionIdx === idx
                        ? "bg-[#942392] text-white shadow-md hover:bg-[#7a1c78]"
                        : "bg-background hover:bg-muted text-foreground border border-border"
                    }`}
                  >
                    {idx + 1}
                  </Button>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={currentSessionIdx >= attendanceSessions.length - 1}
                  onClick={() => handleSelectSession(currentSessionIdx + 1)}
                  className="h-8 w-8 p-0 rounded-lg text-xs font-black cursor-pointer"
                  title="Next Session"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  {`Session ${currentSessionIdx + 1} of ${attendanceSessions.length}${currentSessionIdx === 0 && attendanceSessions.length > 1 ? " (Latest)" : ""}`}
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveTodayAttendance} className="px-6 pb-5 pt-2 space-y-4 overflow-y-auto flex-1">
            {isLoadingSessions ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin text-[#942392]" />
                <span className="text-xs font-bold uppercase tracking-wider">Loading punches...</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* 1. CLOCK IN TIME */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">CLOCK IN TIME</Label>
                    {attendanceSessions[currentSessionIdx]?.has_recorded_clock_in ? (
                      <div className="h-10 px-3.5 bg-slate-100 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between font-mono font-black text-xs text-foreground">
                        <span>
                          {attendanceSessions[currentSessionIdx]?.clock_in_time_12
                            ? formatTimeToDotAmPm(attendanceSessions[currentSessionIdx].clock_in_time_12)
                            : (editClockIn ? formatTimeToDotAmPm(editClockIn) : "8.40 AM")}
                        </span>
                        <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <CustomTimePicker
                          value={editClockIn}
                          onChange={(val) => setEditClockIn(val)}
                          placeholder="Select Clock In Time"
                          className="w-full h-10 font-mono font-bold text-xs"
                        />
                        {editClockIn && (
                          <p className="text-[10px] font-bold text-muted-foreground">
                            Selected: <span className="font-mono text-foreground font-black">{formatTimeToDotAmPm(editClockIn)}</span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 2. CLOCK OUT TIME */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">CLOCK OUT TIME</Label>
                    <div className="space-y-1">
                      <CustomTimePicker
                        value={editClockOut}
                        onChange={(val) => setEditClockOut(val)}
                        placeholder="Select Clock Out Time"
                        className="w-full h-10 font-mono font-bold text-xs"
                      />
                    </div>
                    {editClockOut && (
                      <p className="text-[10px] font-bold text-muted-foreground">
                        Selected: <span className="font-mono text-foreground font-black">{formatTimeToDotAmPm(editClockOut)}</span>
                      </p>
                    )}
                  </div>

                  {/* 3. WORKING STATUS (NOT EDITABLE) */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">WORKING STATUS</Label>
                    <div className="h-10 px-3.5 bg-slate-100 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between font-bold text-xs text-foreground">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-emerald-700 dark:text-emerald-400 font-black tracking-wide uppercase">
                          {attendanceSessions[currentSessionIdx]?.working_status || "PRESENT"}
                        </span>
                      </div>
                      <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  </div>

                  {/* 4. LOCATION (NOT EDITABLE & HAVE COORDINATE) */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">LOCATION (WITH COORDINATES)</Label>
                    <div className="h-10 px-3.5 bg-slate-100 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between font-bold text-xs text-foreground">
                      <span className="truncate">
                        {attendanceSessions[currentSessionIdx]?.location_formatted || (todayStats?.attendanceLocationFormatted || "HQ ( 4.6778, 10.78758646 )")}
                      </span>
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 ml-2" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* 5. SESSION WORKING HOURS */}
                  <div className="p-3.5 bg-purple-50/70 dark:bg-purple-950/30 rounded-2xl border border-purple-200 dark:border-purple-800/60 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#942392] block">WORKING HOURS</span>
                      <span className="text-[9px] font-bold text-muted-foreground">
                        Session {currentSessionIdx + 1} duration
                      </span>
                    </div>
                    <span className="font-mono font-black text-sm text-[#942392]">
                      {calculateDiffHoursAndMinutes(
                        editClockIn || attendanceSessions[currentSessionIdx]?.clock_in_time_24 || attendanceSessions[currentSessionIdx]?.clock_in_time_12,
                        editClockOut
                      ).str}
                    </span>
                  </div>

                  {/* 6. TOTAL WORKING HOURS (BOTTOM OF PAGE) */}
                  <div className="p-3.5 bg-gradient-to-r from-purple-50 via-purple-100/60 to-pink-50 dark:from-purple-950/40 dark:to-pink-950/30 rounded-2xl border border-[#942392]/30 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-foreground block">
                        TOTAL WORKING HOURS
                      </span>
                      <span className="text-[9px] font-bold text-muted-foreground">
                        Sum of all {attendanceSessions.length} session{attendanceSessions.length > 1 ? 's' : ''} today
                      </span>
                    </div>
                    <span className="font-mono font-black text-sm text-[#942392]">
                      {getTotalWorkingHours()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="pt-3 border-t border-border flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditTodayAttendanceOpen(false)}
                className="rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isUpdatingTodayAttendance}
                className="bg-[#942392] hover:bg-[#7a1c78] text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
              >
                {isUpdatingTodayAttendance ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Attendance
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </>
  );
}



