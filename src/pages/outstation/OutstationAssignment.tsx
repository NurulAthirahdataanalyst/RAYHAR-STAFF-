import { writePrintDocument } from '@/utils/security';
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import PageActions from "@/components/layout/PageActions";
import { MonthPicker } from "@/components/shared/MonthPicker";
import { YearPopover } from "@/components/shared/YearPopover";
import { CustomDatePicker, CustomTimePicker } from "@/components/common/TablePagination";
import { TableScrollTopButton } from "@/components/shared/TableScrollTopButton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  Plane, Plus, Loader2, MapPin, Edit2, XCircle, Trash2,
  Users, Search, Calendar, ChevronLeft, ChevronRight, ArrowLeft, Download, FileText, X
} from "lucide-react";
import { AnimatedCheckbox } from "@/components/ui/animated-checkbox";
import { API_BASE_URL } from "../../config/api";

const OUTSTATION_ROLES = ["hr_admin", "managing_director", "operation_manager", "finance_manager", "branch_leader", "head_of_department"];
const PINK = "#942392";

function formatName(fullName: string) {
  if (!fullName) return "—";
  return fullName.split(/ BIN | BINTI /i)[0];
}

function fmtDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-MY", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
}

function statusBadge(status: string) {
  const baseClasses = "inline-flex items-center justify-center px-3 py-1 text-[10px] tracking-wider font-extrabold uppercase rounded-full border-[1.5px] whitespace-nowrap";
  switch (status) {
    case "Active":    return <span className={`${baseClasses} bg-pink-50 dark:bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-500/30`}>Active</span>;
    case "Upcoming":  return <span className={`${baseClasses} bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30`}>Upcoming</span>;
    case "Completed": return <span className={`${baseClasses} bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30`}>Completed</span>;
    case "Cancelled": return <span className={`${baseClasses} bg-gray-50 dark:bg-gray-500/10 text-foreground dark:text-gray-300 border-gray-200 dark:border-gray-500/30`}>Cancelled</span>;
    default:          return <span className={`${baseClasses} bg-gray-50 text-gray-700 border-gray-200`}>{status}</span>;
  }
}

function calcTotalDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(start.slice(0, 10));
  const e = new Date(end.slice(0, 10));
  const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diff);
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
  position?: string;
  destination: string;
  client_company?: string;
  purpose?: string;
  project?: string;
  meeting_title?: string;
  start_date: string;
  start_time?: string;
  end_date: string;
  end_time?: string;
  total_days?: number;
  status: string;
  assigned_by?: string;
  assigned_by_name?: string;
  assigned_by_role?: string;
};

type EventGroup = {
  key: string;
  eventName: string;
  destination: string;
  client_company?: string;
  purpose?: string;
  project?: string;
  meeting_title?: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  totalDays: number;
  status: string;
  assigned_by?: string;
  assigned_by_name?: string;
  assigned_by_role?: string;
  assignments: Assignment[];
};

type EditStaffParticipant = {
  assignment_id?: number;
  user_id: string;
  full_name: string;
  branch: string;
  department: string;
  position?: string;
  isOriginal: boolean;
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

  // View state
  const [selectedEventKey, setSelectedEventKey] = useState<string | null>(null);
  const [viewFormEvent, setViewFormEvent] = useState<EventGroup | null>(null);

  // New assignment modal
  const [newDrawerOpen, setNewDrawerOpen] = useState(false);
  const [newSelectedEmps, setNewSelectedEmps] = useState<Employee[]>([]);
  const [newEmpSearch, setNewEmpSearch] = useState("");
  const [newForm, setNewForm] = useState(emptyForm);

  // Edit event modal (with full participant management)
  const [editEventModalOpen, setEditEventModalOpen] = useState(false);
  const [editEventTarget, setEditEventTarget] = useState<EventGroup | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editParticipants, setEditParticipants] = useState<EditStaffParticipant[]>([]);
  const [addStaffSearch, setAddStaffSearch] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Filters
  const [viewType, setViewType] = useState<"month" | "year">("month");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterSearch, setFilterSearch] = useState("");
  const currentDate = new Date();
  const [searchParams] = useSearchParams();
  const initialMonth = searchParams.get('month');
  const initialYear = searchParams.get('year');
  const [filterMonthYear, setFilterMonthYear] = useState(
    initialMonth && initialYear ? `${initialYear}-${initialMonth}` : `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`
  );
  const [selectedYear, setSelectedYear] = useState(() => currentDate.getFullYear().toString());

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const tableRef = useRef<HTMLTableElement>(null);

  useEffect(() => {
    if (!roleLoading && !OUTSTATION_ROLES.includes(role)) navigate("/");
  }, [role, roleLoading, navigate]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    let attempts = 0;
    while (attempts < 3) {
      try {
        attempts++;
        const scopeParams = new URLSearchParams({ role, branch: userBranch || "", department: userDepartment || "" });
        const [assRes, empRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/outstation?${scopeParams}`),
          fetch(`${API_BASE_URL}/api/employees?role=${encodeURIComponent(role)}&branch=${encodeURIComponent(userBranch || "")}&department=${encodeURIComponent(userDepartment || "")}`),
        ]);
        const [assData, empData] = await Promise.all([assRes.json(), empRes.json()]);
        if (assData.success) setAssignments(assData.data || assData.assignments || []);
        if (empData.success) setEmployees(empData.data || empData.employees || []);
        break;
      } catch (err) {
        console.warn(`OutstationAssignment fetch attempt ${attempts} failed:`, err);
        if (attempts >= 3) {
          // Keep existing assignments if available; avoid disrupting user with toast on transient network hiccup
        } else {
          await new Promise((r) => setTimeout(r, 1200 * attempts));
        }
      }
    }
    setLoading(false);
  }, [role, userBranch, userDepartment]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Group individual assignments into Events
  const eventGroups = useMemo<EventGroup[]>(() => {
    const today = new Date().toISOString().split('T')[0];
    const groups: Record<string, EventGroup> = {};

    assignments.forEach(a => {
      const rawName = (a.project && a.project.trim() !== '-' && a.project.trim() !== '')
        ? a.project.trim()
        : (a.meeting_title && a.meeting_title.trim() !== '-' && a.meeting_title.trim() !== '')
        ? a.meeting_title.trim()
        : (a.purpose && a.purpose.trim() !== '-' && a.purpose.trim() !== '')
        ? a.purpose.trim()
        : (a.destination ? `Trip to ${a.destination}` : 'General Event');

      const dest = (a.destination || '').trim();
      const sDate = a.start_date ? a.start_date.slice(0, 10) : '';
      const eDate = a.end_date ? a.end_date.slice(0, 10) : '';

      const groupKey = `${rawName}:::${dest}:::${sDate}:::${eDate}`;

      if (!groups[groupKey]) {
        groups[groupKey] = {
          key: groupKey,
          eventName: rawName,
          destination: a.destination || '',
          client_company: a.client_company || '',
          purpose: a.purpose || '',
          project: a.project || '',
          meeting_title: a.meeting_title || '',
          startDate: a.start_date || '',
          endDate: a.end_date || '',
          startTime: a.start_time || '',
          endTime: a.end_time || '',
          totalDays: a.total_days ? Number(a.total_days) : 0,
          status: 'Upcoming',
          assigned_by: a.assigned_by,
          assigned_by_name: a.assigned_by_name,
          assigned_by_role: a.assigned_by_role,
          assignments: []
        };
      }

      const g = groups[groupKey];
      g.assignments.push(a);

      if (a.start_date && (!g.startDate || a.start_date < g.startDate)) g.startDate = a.start_date;
      if (a.end_date && (!g.endDate || a.end_date > g.endDate)) g.endDate = a.end_date;
      if (a.destination && !g.destination) g.destination = a.destination;
      if (a.client_company && !g.client_company) g.client_company = a.client_company;
      if (a.purpose && !g.purpose) g.purpose = a.purpose;
      if (a.project && !g.project) g.project = a.project;
      if (a.meeting_title && !g.meeting_title) g.meeting_title = a.meeting_title;
      if (a.start_time && !g.startTime) g.startTime = a.start_time;
      if (a.end_time && !g.endTime) g.endTime = a.end_time;
    });

    return Object.values(groups).map(g => {
      const s = g.startDate?.slice(0, 10) || today;
      const e = g.endDate?.slice(0, 10) || today;
      g.totalDays = calcTotalDays(s, e);

      const allCancelled = g.assignments.length > 0 && g.assignments.every(a => a.status === 'Cancelled');
      if (allCancelled) {
        g.status = 'Cancelled';
      } else if (today > e) {
        g.status = 'Completed';
      } else if (today >= s && today <= e) {
        g.status = 'Active';
      } else {
        g.status = 'Upcoming';
      }

      return g;
    });
  }, [assignments]);

  // Selected event object for detail view
  const selectedEvent = useMemo(() => {
    if (!selectedEventKey) return null;
    return eventGroups.find(e => e.key === selectedEventKey) || null;
  }, [eventGroups, selectedEventKey]);

  // Filtered event groups for Events Overview
  const filteredEvents = useMemo(() => {
    return eventGroups.filter(e => {
      if (filterStatus !== "All" && e.status !== filterStatus) return false;
      if (filterSearch) {
        const q = filterSearch.toLowerCase();
        if (!(e.eventName || "").toLowerCase().includes(q) && !(e.destination || "").toLowerCase().includes(q)) {
          return false;
        }
      }

      if (e.startDate) {
        const d = new Date(e.startDate);
        if (viewType === "month" && filterMonthYear) {
          const [fYear, fMonth] = filterMonthYear.split('-');
          if (fMonth === 'all') {
            if (d.getFullYear().toString() !== fYear) return false;
          } else {
            if (d.getFullYear().toString() !== fYear || (d.getMonth() + 1).toString().padStart(2, '0') !== fMonth) {
              return false;
            }
          }
        } else if (viewType === "year" && selectedYear) {
          if (d.getFullYear().toString() !== selectedYear) return false;
        }
      }

      return true;
    });
  }, [eventGroups, filterStatus, filterSearch, viewType, filterMonthYear, selectedYear]);

  // Filtered assignments for Event Participant Detail view
  const filteredParticipants = useMemo(() => {
    if (!selectedEvent) return [];
    return selectedEvent.assignments.filter(a => {
      if (filterStatus !== "All" && a.status !== filterStatus) return false;
      if (filterSearch) {
        const q = filterSearch.toLowerCase();
        const matchesName = (a.full_name || "").toLowerCase().includes(q);
        const matchesDest = (a.destination || "").toLowerCase().includes(q);
        const matchesDept = (a.department || "").toLowerCase().includes(q);
        const matchesBranch = (a.branch || "").toLowerCase().includes(q);
        if (!matchesName && !matchesDest && !matchesDept && !matchesBranch) return false;
      }
      return true;
    });
  }, [selectedEvent, filterStatus, filterSearch]);

  // Pagination calculations
  const totalItems = selectedEventKey ? filteredParticipants.length : filteredEvents.length;
  const totalPages = Math.ceil(totalItems / entriesPerPage) || 1;
  const indexOfLastItem = currentPage * entriesPerPage;
  const indexOfFirstItem = indexOfLastItem - entriesPerPage;

  const pagedEvents = useMemo(() => {
    return filteredEvents.slice(indexOfFirstItem, indexOfLastItem);
  }, [filteredEvents, indexOfFirstItem, indexOfLastItem]);

  const pagedParticipants = useMemo(() => {
    return filteredParticipants.slice(indexOfFirstItem, indexOfLastItem);
  }, [filteredParticipants, indexOfFirstItem, indexOfLastItem]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, filterSearch, filterMonthYear, selectedYear, viewType, selectedEventKey, entriesPerPage]);

  // Open New Assignment Drawer
  const openNew = () => {
    setNewForm(emptyForm);
    setNewSelectedEmps([]);
    setNewEmpSearch("");
    setNewDrawerOpen(true);
  };

  useEffect(() => {
    if (location.state?.openNew) {
      navigate(location.pathname, { replace: true, state: {} });
      setTimeout(() => openNew(), 50);
    }
  }, [location.state, location.pathname, navigate]);

  // Open Edit Event Modal with full staff participants list
  const openEditEvent = (event: EventGroup) => {
    if (event.status === "Completed") {
      toast.error("Completed outstation assignments cannot be edited.");
      return;
    }
    setEditEventTarget(event);
    setEditForm({
      destination: event.destination || "",
      client_company: event.client_company || "",
      purpose: event.purpose || "",
      project: event.project || event.eventName || "",
      meeting_title: event.meeting_title || "",
      start_date: event.startDate ? event.startDate.slice(0, 10) : "",
      end_date: event.endDate ? event.endDate.slice(0, 10) : "",
      start_time: event.startTime || "",
      end_time: event.endTime || "",
    });

    const parts: EditStaffParticipant[] = event.assignments.map(a => {
      const emp = employees.find(e => String(e.user_id) === String(a.user_id));
      return {
        assignment_id: a.id,
        user_id: String(a.user_id),
        full_name: a.full_name || emp?.full_name || "",
        branch: a.branch || emp?.branch || "",
        department: a.department || emp?.department || "",
        position: a.position || emp?.position || "",
        isOriginal: true,
      };
    });
    setEditParticipants(parts);
    setAddStaffSearch("");
    setEditEventModalOpen(true);
  };

  // Staff available to add in edit modal
  const availableToAddStaff = useMemo(() => {
    const q = addStaffSearch.toLowerCase();
    const assignedIds = new Set(editParticipants.map(p => String(p.user_id)));
    return employees.filter(e => {
      if (assignedIds.has(String(e.user_id))) return false;
      if (!q) return true;
      return (
        (e.full_name || "").toLowerCase().includes(q) ||
        (e.branch || "").toLowerCase().includes(q) ||
        (e.department || "").toLowerCase().includes(q)
      );
    });
  }, [employees, editParticipants, addStaffSearch]);

  const handleAddStaffToEdit = (emp: Employee) => {
    setEditParticipants(prev => [
      ...prev,
      {
        user_id: String(emp.user_id),
        full_name: emp.full_name,
        branch: emp.branch,
        department: emp.department,
        position: emp.position,
        isOriginal: false,
      }
    ]);
  };

  const handleRemoveStaffFromEdit = (userIdToRemove: string) => {
    setEditParticipants(prev => prev.filter(p => String(p.user_id) !== String(userIdToRemove)));
  };

  // Save Event Changes (Trip Details + Add/Remove Participants)
  const handleSaveEventEdit = async () => {
    if (!editEventTarget) return;
    if (!editForm.destination.trim()) {
      toast.error("Destination is required");
      return;
    }
    if (!editForm.start_date || !editForm.end_date) {
      toast.error("Start and end dates are required");
      return;
    }
    if (editParticipants.length === 0) {
      toast.error("At least one staff participant is required for the assignment");
      return;
    }

    setSubmitting(true);
    try {
      const totalDays = calcTotalDays(editForm.start_date, editForm.end_date);
      const eventName = editForm.project.trim() || editForm.meeting_title.trim() || editForm.purpose.trim() || "Outstation Trip";

      const retainedOriginals = editParticipants.filter(p => p.isOriginal && p.assignment_id);
      const removedOriginals = editEventTarget.assignments.filter(
        orig => !editParticipants.some(p => p.assignment_id === orig.id)
      );
      const newlyAddedStaff = editParticipants.filter(p => !p.isOriginal || !p.assignment_id);

      // 1. Update retained assignments with modified event trip details
      const updatePromises = retainedOriginals.map(p =>
        fetch(`${API_BASE_URL}/api/outstation/${p.assignment_id}?role=${encodeURIComponent(role)}&userId=${encodeURIComponent(userId || '')}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...editForm,
            project: eventName,
            total_days: totalDays,
          }),
        }).then(r => r.json())
      );

      // 2. Delete / remove assignments for removed staff participants
      const deletePromises = removedOriginals.map(rem =>
        fetch(`${API_BASE_URL}/api/outstation/${rem.id}?role=${encodeURIComponent(role)}&userId=${encodeURIComponent(userId || '')}`, {
          method: "DELETE",
        }).then(r => r.json())
      );

      // 3. Create assignments for newly added staff participants
      let addPromise = Promise.resolve({ success: true });
      if (newlyAddedStaff.length > 0) {
        addPromise = fetch(`${API_BASE_URL}/api/outstation`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_ids: newlyAddedStaff.map(s => ({
              user_id: s.user_id,
              full_name: s.full_name,
              branch: s.branch,
              department: s.department,
              position: s.position,
            })),
            ...editForm,
            project: eventName,
            total_days: totalDays,
            assigned_by: userId,
            assigned_by_name: userName,
            assigned_by_role: role,
          }),
        }).then(r => r.json());
      }

      await Promise.all([...updatePromises, ...deletePromises, addPromise]);

      toast.success("Outstation assignment and participants updated successfully!");
      setEditEventModalOpen(false);
      setEditEventTarget(null);

      // Update selectedEventKey to point to the new key if event details changed
      const updatedKey = `${eventName}:::${editForm.destination.trim()}:::${editForm.start_date}:::${editForm.end_date}`;
      if (selectedEventKey) {
        setSelectedEventKey(updatedKey);
      }

      await fetchData();
    } catch (err) {
      console.error("Save event edit error:", err);
      toast.error("Failed to save changes. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Multi-select employees for NEW assignment
  const filteredNewEmps = useMemo(() => {
    const q = newEmpSearch.toLowerCase();
    return employees.filter(e =>
      (e.full_name || "").toLowerCase().includes(q) ||
      (e.branch || "").toLowerCase().includes(q) ||
      (e.department || "").toLowerCase().includes(q)
    ).slice(0, 30);
  }, [employees, newEmpSearch]);

  const toggleNewEmp = (emp: Employee) => {
    setNewSelectedEmps(prev => {
      const exists = prev.find(e => e.user_id === emp.user_id);
      if (exists) return prev.filter(e => e.user_id !== emp.user_id);
      return [...prev, emp];
    });
  };

  // Submit NEW assignment
  const handleCreateAssignment = async () => {
    if (newSelectedEmps.length === 0) { toast.error("Select at least one employee"); return; }
    if (!newForm.destination) { toast.error("Destination is required"); return; }
    if (!newForm.start_date || !newForm.end_date) { toast.error("Start and end dates are required"); return; }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/outstation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_ids: newSelectedEmps.map(e => ({ user_id: e.user_id, full_name: e.full_name, branch: e.branch, department: e.department, position: e.position })),
          ...newForm,
          total_days: calcTotalDays(newForm.start_date, newForm.end_date),
          assigned_by: userId,
          assigned_by_name: userName,
          assigned_by_role: role,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || `${newSelectedEmps.length} outstation assignment(s) created!`);
        setNewDrawerOpen(false);
        void fetchData();
      } else {
        toast.error(data.error || "Failed to create assignment");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelAssignment = async (id: number) => {
    if (!confirm("Cancel this outstation assignment?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/outstation/${id}/cancel`, { method: "PUT" });
      const data = await res.json();
      if (data.success) {
        toast.success("Assignment cancelled");
        void fetchData();
      } else {
        toast.error(data.error || "Failed to cancel");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const confirmDeleteAssignment = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/outstation/${deleteTarget}?userId=${encodeURIComponent(userId || "")}&role=${encodeURIComponent(role || "")}`, {
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

  // Export CSV
  const exportCSV = () => {
    if (selectedEvent) {
      const headers = ["Employee", "Department", "Branch", "Event", "Destination", "Start Date", "End Date", "Days", "Status", "Assigned By"];
      const rows = filteredParticipants.map(a => [
        a.full_name, a.department || "", a.branch || "",
        a.project || selectedEvent.eventName, a.destination || "",
        a.start_date?.slice(0, 10), a.end_date?.slice(0, 10),
        a.total_days || calcTotalDays(a.start_date, a.end_date),
        a.status, a.assigned_by_name || ""
      ]);
      const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `outstation_assignment_${selectedEvent.eventName.toLowerCase().replace(/\s+/g, '_')}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } else {
      const headers = ["Event Name", "Destination", "Start Date", "End Date", "Days", "Status", "Participants"];
      const rows = filteredEvents.map(e => [
        e.eventName, e.destination || "",
        e.startDate?.slice(0, 10), e.endDate?.slice(0, 10),
        e.totalDays, e.status, `${e.assignments.length} Staff`
      ]);
      const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `outstation_assignments_overview.csv`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin w-7 h-7 text-pink-500" />
      </div>
    );
  }

  const editTotalDays = calcTotalDays(editForm.start_date, editForm.end_date);
  const newTotalDays = calcTotalDays(newForm.start_date, newForm.end_date);

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-8">

      {/* Top Action Bar */}
      <PageActions>
        <div className="flex w-full items-center justify-between gap-3 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 px-0 text-foreground hover:bg-transparent hover:text-[#942392] transition-colors touch-target"
            onClick={() => {
              if (selectedEventKey) {
                setSelectedEventKey(null);
              } else {
                navigate("/outstation");
              }
            }}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">
              {selectedEventKey ? "Back to Events Overview" : "Back to Outstation Dashboard"}
            </span>
          </Button>

          <div className="flex items-center gap-2.5 ml-auto">
            {selectedEvent && (selectedEvent.status === "Active" || selectedEvent.status === "Upcoming") && (
              <Button
                variant="outline"
                className="h-10 px-4 text-[13px] font-bold border-[#942392]/30 text-[#942392] hover:bg-[#942392]/10 bg-white dark:bg-slate-900 shadow-sm shrink-0"
                onClick={() => openEditEvent(selectedEvent)}
              >
                <Edit2 className="w-4 h-4 mr-1.5" /> Edit Event & Staff
              </Button>
            )}

            <Button
              className="h-10 px-5 text-[14px] font-semibold text-white shadow-sm bg-[#942392] hover:bg-[#3b0764] shrink-0"
              onClick={openNew}
            >
              <Plane className="w-4 h-4 mr-2" /> New Assignment
            </Button>
          </div>
        </div>
      </PageActions>

      {/* Main Table Card */}
      <Card className="border border-slate-100 dark:border-slate-800 bg-card shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] rounded-[24px] overflow-hidden">
        
        {/* Card Header (Matches Screenshots 1 & 2) */}
        <CardHeader className="pb-0 bg-card space-y-0 pt-4 px-4 sm:px-6">
          {/* Header Top Row */}
          <div className="flex items-center justify-between mb-3">
            <CardTitle className="text-sm font-black uppercase tracking-wide flex items-center gap-2">
              <Plane className="w-4 h-4 text-[#942392]" />
              {selectedEvent ? selectedEvent.eventName : "Events Overview"}
              <Badge className="bg-[#942392]/10 text-[#942392] border border-[#942392]/20 text-[10px] font-black">
                {selectedEvent ? filteredParticipants.length : filteredEvents.length}
              </Badge>
            </CardTitle>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 shrink-0" onClick={exportCSV}>
              <Download className="w-3.5 h-3.5" /> Export CSV
            </Button>
          </div>

          {/* Header Filter Row */}
          <div className="flex flex-wrap items-end justify-between w-full gap-2 border-b border-border/60 dark:border-slate-700">
            
            {/* LEFT: Tabs (only in Events Overview mode) */}
            {!selectedEvent ? (
              <div className="flex items-center gap-6 w-full sm:w-auto shrink-0">
                <button
                  onClick={() => setViewType("month")}
                  className={`text-sm font-bold pb-2.5 translate-y-[1px] relative z-10 transition-colors border-b-2 ${
                    viewType === "month"
                      ? "text-[#942392] border-[#942392]"
                      : "text-foreground/70 hover:text-foreground border-transparent hover:border-[#ffff00]"
                  }`}
                >
                  Month
                </button>
                <button
                  onClick={() => setViewType("year")}
                  className={`text-sm font-bold pb-2.5 translate-y-[1px] relative z-10 transition-colors border-b-2 ${
                    viewType === "year"
                      ? "text-[#942392] border-[#942392]"
                      : "text-foreground/70 hover:text-foreground border-transparent hover:border-[#ffff00]"
                  }`}
                >
                  Year
                </button>
              </div>
            ) : (
              <div className="pb-2.5 text-xs text-muted-foreground font-semibold flex flex-wrap items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-pink-500 shrink-0" />
                <span>{selectedEvent.destination}</span>
                <span>•</span>
                <span>{fmtDate(selectedEvent.startDate)} - {fmtDate(selectedEvent.endDate)} ({selectedEvent.totalDays} Days)</span>
              </div>
            )}

            {/* RIGHT: Filters */}
            <div className="flex items-center gap-2 flex-wrap pb-2.5 w-full sm:w-auto sm:ml-auto">
              {!selectedEvent ? (
                <>
                  <div className="relative w-full sm:w-44 shrink-0">
                    <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <Input
                      placeholder="Search event..."
                      value={filterSearch}
                      onChange={e => setFilterSearch(e.target.value)}
                      className="pl-8 pr-7 h-8 text-xs w-full bg-gray-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-foreground dark:text-slate-100 font-medium"
                    />
                    {filterSearch && (
                      <button
                        type="button"
                        onClick={() => setFilterSearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
                        title="Clear search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {viewType === "month" ? (
                    <MonthPicker
                      monthYear={filterMonthYear}
                      onSelectMonthYear={(val) => {
                        if (val) setFilterMonthYear(val);
                        else setFilterMonthYear(`${currentDate.getFullYear()}-all`);
                      }}
                      className="appearance-none flex items-center justify-between px-3 py-1.5 bg-gray-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-foreground dark:text-slate-100 text-xs font-black rounded-md shadow-sm outline-none cursor-pointer h-8 gap-2 hover:border-[#942392]/40 w-[calc(50%-0.25rem)] sm:w-auto shrink-0"
                    />
                  ) : (
                    <YearPopover
                      year={selectedYear}
                      onSelectYear={setSelectedYear}
                      className="appearance-none flex items-center justify-between px-3 py-1.5 bg-gray-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-foreground dark:text-slate-100 text-xs font-black rounded-md shadow-sm outline-none cursor-pointer h-8 gap-2 hover:border-[#942392]/40 w-[calc(50%-0.25rem)] sm:w-auto shrink-0"
                    />
                  )}
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[calc(50%-0.25rem)] sm:w-[130px] shrink-0 h-8 text-xs bg-gray-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-foreground dark:text-slate-100">
                      <SelectValue placeholder="Status">{filterStatus === "All" ? "All Status" : filterStatus}</SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-foreground dark:text-slate-100">
                      {["All", "Active", "Upcoming", "Completed", "Cancelled"].map(s => (
                        <SelectItem key={s} value={s}>{s === "All" ? "All Status" : s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              ) : (
                <>
                  <div className="relative w-full sm:w-48 shrink-0">
                    <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <Input
                      placeholder="Search employee, destination…"
                      value={filterSearch}
                      onChange={e => setFilterSearch(e.target.value)}
                      className="pl-8 pr-7 h-8 text-xs w-full bg-gray-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-foreground dark:text-slate-100 font-medium"
                    />
                    {filterSearch && (
                      <button
                        type="button"
                        onClick={() => setFilterSearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
                        title="Clear search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="flex-1 sm:flex-none sm:w-[130px] shrink-0 h-8 text-xs bg-gray-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-foreground dark:text-slate-100">
                      <SelectValue placeholder="Status">{filterStatus === "All" ? "All Status" : filterStatus}</SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-foreground dark:text-slate-100">
                      {["All", "Active", "Upcoming", "Completed", "Cancelled"].map(s => (
                        <SelectItem key={s} value={s}>{s === "All" ? "All Status" : s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-[10px] text-foreground font-bold shrink-0">{filteredParticipants.length} records</span>
                </>
              )}
            </div>
          </div>
        </CardHeader>

        {/* Card Body */}
        <CardContent className="p-0">
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <Loader2 className="animate-spin w-7 h-7 text-pink-400" />
            </div>
          ) : (!selectedEvent && filteredEvents.length === 0) || (selectedEvent && filteredParticipants.length === 0) ? (
            <div className="h-48 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Plane className="w-10 h-10 opacity-20" />
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {selectedEvent ? "No participants found for this event" : "No assignments found"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table ref={tableRef} className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900">
                    {!selectedEvent ? (
                      // 1st Screenshot Columns
                      <>
                        <th className="px-4 py-3 text-left text-[10px] font-black text-foreground dark:text-slate-100 uppercase tracking-widest min-w-[200px]">
                          Event Name
                        </th>
                        <th className="px-4 py-3 text-left text-[10px] font-black text-foreground dark:text-slate-100 uppercase tracking-widest min-w-[160px]">
                          Destination
                        </th>
                        <th className="px-3 py-3 text-left text-[10px] font-black text-foreground dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">
                          Start Date
                        </th>
                        <th className="px-3 py-3 text-left text-[10px] font-black text-foreground dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">
                          End Date
                        </th>
                        <th className="px-3 py-3 text-center text-[10px] font-black text-foreground dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">
                          Days
                        </th>
                        <th className="px-3 py-3 text-center text-[10px] font-black text-foreground dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">
                          Status
                        </th>
                        <th className="px-3 py-3 text-center text-[10px] font-black text-foreground dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">
                          Participants
                        </th>
                        <th className="px-3 py-3 text-center text-[10px] font-black text-foreground dark:text-slate-100 uppercase tracking-widest whitespace-nowrap w-[120px]">
                          Actions
                        </th>
                      </>
                    ) : (
                      // 2nd Screenshot Columns
                      [
                        "Employee",
                        "Department",
                        "Branch",
                        "Event",
                        "Start",
                        "End",
                        "Days",
                        "Assigned By",
                        "Status",
                        "Actions"
                      ].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-foreground dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">
                          {h}
                        </th>
                      ))
                    )}
                  </tr>
                </thead>
                <tbody>
                  {!selectedEvent ? (
                    // EVENTS OVERVIEW ROWS (Screenshot 1)
                    pagedEvents.map((e) => (
                      <tr
                        key={e.key}
                        onClick={() => setSelectedEventKey(e.key)}
                        className="border-b border-gray-50 dark:border-slate-800 hover:bg-pink-50/30 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                      >
                        {/* Event Name (Clickable) */}
                        <td className="px-4 py-3 align-middle font-bold text-foreground dark:text-gray-100 min-w-[200px]">
                          <span
                            className="group-hover:text-[#942392] transition-colors underline decoration-dotted underline-offset-4"
                            title={`Click to view participants of ${e.eventName}`}
                          >
                            {e.eventName}
                          </span>
                        </td>

                        {/* Destination */}
                        <td className="px-4 py-3 align-middle min-w-[160px]">
                          <div className="flex items-center gap-1 font-semibold text-foreground dark:text-gray-100">
                            <MapPin className="w-3 h-3 text-pink-400 shrink-0" />
                            <span>{e.destination}</span>
                          </div>
                          {e.client_company && (
                            <div className="text-[10px] text-muted-foreground ml-4">{e.client_company}</div>
                          )}
                        </td>

                        {/* Start Date */}
                        <td className="px-3 py-3 align-middle text-foreground dark:text-gray-100 font-medium whitespace-nowrap">
                          {fmtDate(e.startDate)}
                        </td>

                        {/* End Date */}
                        <td className="px-3 py-3 align-middle text-foreground dark:text-gray-100 font-medium whitespace-nowrap">
                          {fmtDate(e.endDate)}
                        </td>

                        {/* Days */}
                        <td className="px-3 py-3 align-middle text-center font-black text-pink-600">
                          {e.totalDays}
                        </td>

                        {/* Status */}
                        <td className="px-3 py-3 align-middle text-center">
                          {statusBadge(e.status)}
                        </td>

                        {/* Participants */}
                        <td className="px-3 py-3 align-middle text-center">
                          <Badge variant="outline" className="text-foreground dark:text-slate-300 font-semibold px-2.5 py-0.5 rounded-full border-slate-200 dark:border-slate-700">
                            {e.assignments.length} Staff
                          </Badge>
                        </td>

                        {/* Actions (View Form & Edit Form stacked vertically) */}
                        <td className="px-3 py-2.5 align-middle text-center w-[120px]" onClick={(ev) => ev.stopPropagation()}>
                          <div className="flex flex-col items-center justify-center gap-1.5 mx-auto">
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-[94px] inline-flex items-center justify-center px-2 py-1 h-6 text-[10px] tracking-wider font-extrabold uppercase rounded-full border-[1.5px] whitespace-nowrap gap-1 border-[#942392]/30 text-[#942392] hover:bg-[#942392]/5 shadow-none"
                              onClick={() => setViewFormEvent(e)}
                            >
                              <FileText className="w-3 h-3" /> View Form
                            </Button>

                            {(e.status === "Active" || e.status === "Upcoming") && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-[94px] inline-flex items-center justify-center px-2 py-1 h-6 text-[10px] tracking-wider font-extrabold uppercase rounded-full border-[1.5px] whitespace-nowrap gap-1 border-blue-500/30 text-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-500/10 shadow-none"
                                onClick={() => openEditEvent(e)}
                              >
                                <Edit2 className="w-3 h-3" /> Edit Form
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    // PARTICIPANTS DETAIL ROWS (Screenshot 2)
                    pagedParticipants.map((a) => (
                      <tr
                        key={a.id}
                        className="border-b border-gray-50 dark:border-slate-800 hover:bg-pink-50/20 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* Employee Avatar + Name */}
                        <td className="px-4 py-3 align-middle">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-200 to-pink-400 dark:from-pink-900 dark:to-pink-600 flex items-center justify-center text-[10px] font-black text-pink-800 dark:text-pink-100 shrink-0">
                              {(a.full_name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                            </div>
                            <span className="font-semibold text-foreground dark:text-gray-100 truncate max-w-[170px]" title={a.full_name}>
                              {a.full_name}
                            </span>
                          </div>
                        </td>

                        {/* Department */}
                        <td className="px-4 py-3 align-middle text-foreground dark:text-gray-300">
                          {a.department || "—"}
                        </td>

                        {/* Branch */}
                        <td className="px-4 py-3 align-middle text-foreground dark:text-gray-300 font-semibold">
                          {a.branch || "—"}
                        </td>

                        {/* Event */}
                        <td className="px-4 py-3 align-middle">
                          <div className="flex items-center gap-1 font-semibold text-foreground dark:text-gray-100">
                            <MapPin className="w-3 h-3 text-pink-400 shrink-0" />
                            <span>{a.project || selectedEvent.eventName}</span>
                          </div>
                        </td>

                        {/* Start */}
                        <td className="px-4 py-3 align-middle text-foreground dark:text-gray-100 font-medium whitespace-nowrap">
                          {fmtDate(a.start_date)}
                        </td>

                        {/* End */}
                        <td className="px-4 py-3 align-middle text-foreground dark:text-gray-100 font-medium whitespace-nowrap">
                          {fmtDate(a.end_date)}
                        </td>

                        {/* Days */}
                        <td className="px-4 py-3 align-middle text-center font-black text-pink-600">
                          {a.total_days != null ? Number(a.total_days) : calcTotalDays(a.start_date, a.end_date)}
                        </td>

                        {/* Assigned By */}
                        <td className="px-4 py-3 align-middle text-foreground dark:text-gray-100 font-medium" title={a.assigned_by_name}>
                          {formatName(a.assigned_by_name || "")}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3 align-middle">
                          {statusBadge(a.status)}
                        </td>

                        {/* Actions (Cancel, Trash) */}
                        <td className="px-4 py-3 align-middle">
                          <div className="flex items-center gap-1">

                            {a.status !== "Cancelled" && a.status !== "Completed" && (
                              <button
                                onClick={() => handleCancelAssignment(a.id)}
                                className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-500 transition-colors"
                                title="Cancel Assignment"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              onClick={() => {
                                setDeleteTarget(a.id);
                                setDeleteDialogOpen(true);
                              }}
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-red-400 transition-colors"
                              title="Delete Assignment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {!loading && totalItems > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-gray-100 dark:border-slate-800 gap-4 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-4 text-[10px] font-bold text-foreground uppercase tracking-widest">
                <span>
                  TOTAL SHOWING {indexOfFirstItem + 1} TO {Math.min(indexOfLastItem, totalItems)} OF {totalItems} ENTRIES
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

      {/* EDIT EVENT MODAL (With full Participant Management: Add/Remove staff) */}
      <Dialog open={editEventModalOpen} onOpenChange={setEditEventModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden border-0 border-none outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 focus-visible:ring-0 shadow-2xl [&>button]:text-white [&>button]:hover:text-white/80 [&>button]:top-4 [&>button]:right-4 [&>button]:focus:ring-0 [&>button]:focus:ring-offset-0 [&>button]:focus:outline-none [&>button]:outline-none">
          <DialogHeader className="px-6 py-4 border-b border-[#c8006d] bg-[#e4007c] shrink-0 text-white">
            <DialogTitle className="flex items-center gap-2 text-base font-black uppercase tracking-wide text-white">
              <Plane className="w-4 h-4 text-white" />
              EDIT OUTSTATION ASSIGNMENT
            </DialogTitle>
            <DialogDescription className="text-pink-100 text-[11px]">
              Update trip details and manage staff participants below.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 p-6 overflow-y-auto flex-1">
            
            {/* Trip Information */}
            <div className="space-y-3">
              <Label className="text-[11px] font-black uppercase tracking-widest text-foreground flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#942392]" /> Trip Information
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] font-bold text-foreground mb-1 block">
                    Destination <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={editForm.destination}
                    onChange={e => setEditForm(f => ({ ...f, destination: e.target.value }))}
                    placeholder="e.g. Sepang, Selangor"
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[10px] font-bold text-foreground mb-1 block">Client / Company</Label>
                  <Input
                    value={editForm.client_company}
                    onChange={e => setEditForm(f => ({ ...f, client_company: e.target.value }))}
                    placeholder="e.g. ABC Sdn Bhd"
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[10px] font-bold text-foreground mb-1 block">Event Name</Label>
                  <Input
                    value={editForm.project}
                    onChange={e => setEditForm(f => ({ ...f, project: e.target.value }))}
                    placeholder="e.g. KHUP 2026"
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[10px] font-bold text-foreground mb-1 block">Meeting Title</Label>
                  <Input
                    value={editForm.meeting_title}
                    onChange={e => setEditForm(f => ({ ...f, meeting_title: e.target.value }))}
                    placeholder="Meeting / event title"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-[10px] font-bold text-foreground mb-1 block">Purpose</Label>
                  <textarea
                    value={editForm.purpose}
                    onChange={e => setEditForm(f => ({ ...f, purpose: e.target.value }))}
                    placeholder="Purpose of outstation travel…"
                    rows={2}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-3">
              <Label className="text-[11px] font-black uppercase tracking-widest text-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#942392]" /> Duration
              </Label>
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <label className="w-16 text-xs font-bold text-foreground uppercase tracking-wider hidden sm:block">Starts</label>
                  <label className="text-[10px] font-bold text-foreground block sm:hidden">STARTS</label>
                  <div className="flex-1 flex gap-2">
                    <div className="relative flex-1">
                      <CustomDatePicker
                        value={editForm.start_date}
                        onChange={(d) => setEditForm(f => ({ ...f, start_date: d }))}
                        placeholder="dd/mm/yyyy"
                        displayFormat="DD/MM/YYYY"
                        className="w-full"
                      />
                    </div>
                    <div className="relative flex-1">
                      <CustomTimePicker
                        value={editForm.start_time}
                        onChange={(t) => setEditForm(f => ({ ...f, start_time: t }))}
                        placeholder="--:-- --"
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <label className="w-16 text-xs font-bold text-foreground uppercase tracking-wider hidden sm:block">Ends</label>
                  <label className="text-[10px] font-bold text-foreground block sm:hidden">ENDS</label>
                  <div className="flex-1 flex gap-2">
                    <div className="relative flex-1">
                      <CustomDatePicker
                        value={editForm.end_date}
                        onChange={(d) => setEditForm(f => ({ ...f, end_date: d }))}
                        placeholder="dd/mm/yyyy"
                        displayFormat="DD/MM/YYYY"
                        className="w-full"
                      />
                    </div>
                    <div className="relative flex-1">
                      <CustomTimePicker
                        value={editForm.end_time}
                        onChange={(t) => setEditForm(f => ({ ...f, end_time: t }))}
                        placeholder="--:-- --"
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>
              {editForm.start_date && editForm.end_date && (
                <div className="flex items-center gap-2 bg-pink-50 dark:bg-pink-950/30 border border-pink-100 dark:border-pink-900/40 rounded-lg px-3 py-2">
                  <Calendar className="w-3.5 h-3.5 text-pink-500" />
                  <span className="text-[11px] font-black text-pink-700 dark:text-pink-300">
                    Total Duration: {editTotalDays} day{editTotalDays !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>

            {/* STAFF PARTICIPANTS MANAGEMENT */}
            <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] font-black uppercase tracking-widest text-foreground flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#942392]" /> Staff Participants ({editParticipants.length})
                </Label>
                <span className="text-[10px] text-muted-foreground font-semibold">
                  Add or remove staff assigned to this event
                </span>
              </div>

              {/* Current assigned staff tags/list */}
              <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 dark:border-slate-800 rounded-xl p-2.5 bg-slate-50/50 dark:bg-slate-900/50">
                {editParticipants.length === 0 ? (
                  <p className="text-xs text-amber-600 dark:text-amber-400 p-2 text-center font-medium">
                    No participants selected. Please add at least one staff participant below.
                  </p>
                ) : (
                  editParticipants.map((p) => (
                    <div
                      key={p.user_id}
                      className="flex items-center justify-between p-2 rounded-lg bg-card border border-gray-200 dark:border-slate-800 shadow-sm"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#942392]/20 to-pink-200 flex items-center justify-center text-[10px] font-black text-[#942392] shrink-0">
                          {(p.full_name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">{p.full_name}</p>
                          <p className="text-[10px] text-muted-foreground">{p.department || "—"} · {p.branch || "—"}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!p.isOriginal && (
                          <Badge className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[9px] font-bold">
                            Newly Added
                          </Badge>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveStaffFromEdit(p.user_id)}
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-full"
                          title="Remove staff from event"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add New Staff Search & Selection */}
              <div className="space-y-2 mt-3 pt-2">
                <Label className="text-[10px] font-bold text-foreground block">
                  Add More Staff to This Event
                </Label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    placeholder="Search employee by name, department, or branch…"
                    value={addStaffSearch}
                    onChange={e => setAddStaffSearch(e.target.value)}
                    className="pl-8 pr-8 h-8 text-xs"
                  />
                  {addStaffSearch && (
                    <button
                      type="button"
                      onClick={() => setAddStaffSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="max-h-36 overflow-y-auto border border-gray-200 dark:border-slate-800 rounded-lg divide-y divide-gray-100 dark:divide-slate-800">
                  {availableToAddStaff.length === 0 ? (
                    <div className="p-3 text-center text-xs text-muted-foreground">
                      {addStaffSearch ? "No matching staff found" : "All eligible staff are already assigned"}
                    </div>
                  ) : (
                    availableToAddStaff.slice(0, 30).map(emp => (
                      <div
                        key={emp.user_id}
                        onClick={() => handleAddStaffToEdit(emp)}
                        className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-pink-50/50 dark:hover:bg-pink-950/20 transition-colors"
                      >
                        <div>
                          <p className="text-xs font-bold text-foreground">{emp.full_name}</p>
                          <p className="text-[10px] text-muted-foreground">{emp.department} · {emp.branch}</p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-[10px] font-bold text-[#942392] hover:bg-[#942392]/10"
                        >
                          <Plus className="w-3 h-3 mr-1" /> Add
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Fixed Footer with Identical Full-Width Separator Line */}
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-end gap-3 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setEditEventModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveEventEdit}
              disabled={submitting}
              className="bg-[#e4007c] hover:bg-[#c8006d] text-white gap-1.5 shadow-sm"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plane className="w-3.5 h-3.5" />}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* NEW ASSIGNMENT MODAL (Drawer) */}
      <Dialog open={newDrawerOpen} onOpenChange={setNewDrawerOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden border-0 border-none outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 focus-visible:ring-0 shadow-2xl [&>button]:text-white [&>button]:hover:text-white/80 [&>button]:top-4 [&>button]:right-4 [&>button]:focus:ring-0 [&>button]:focus:ring-offset-0 [&>button]:focus:outline-none [&>button]:outline-none">
          <DialogHeader className="px-6 py-4 border-b border-[#c8006d] bg-[#e4007c] shrink-0 text-white">
            <DialogTitle className="flex items-center gap-2 text-base font-black uppercase tracking-wide text-white">
              <Plane className="w-4 h-4 text-white" />
              New Outstation Assignment
            </DialogTitle>
            <DialogDescription className="text-pink-100 text-[11px]">
              Assign one or more employees to an outstation event.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 p-6 overflow-y-auto flex-1">
            {/* Employee Multi-Select */}
            <div className="space-y-2">
              <Label className="text-[11px] font-black uppercase tracking-widest text-foreground flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Select Employees <span className="text-red-500">*</span>
              </Label>

              {newSelectedEmps.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-2 bg-pink-50 dark:bg-pink-950/30 rounded-lg border border-pink-100 dark:border-pink-900/40">
                  {newSelectedEmps.map(e => (
                    <span key={e.user_id} className="inline-flex items-center gap-1 bg-card border border-pink-200 dark:border-pink-500/30 text-pink-700 dark:text-pink-300 text-[10px] font-bold px-2 py-1 rounded-md">
                      {e.full_name}
                      <button onClick={() => toggleNewEmp(e)} className="hover:text-red-500 transition-colors">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                  <span className="text-[10px] text-pink-500 font-bold self-center ml-1">
                    {newSelectedEmps.length} selected
                  </span>
                </div>
              )}

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  placeholder="Search employees…"
                  value={newEmpSearch}
                  onChange={e => setNewEmpSearch(e.target.value)}
                  className="pl-8 pr-8 h-8 text-xs"
                />
                {newEmpSearch && (
                  <button
                    type="button"
                    onClick={() => setNewEmpSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-slate-800 rounded-lg divide-y divide-gray-100 dark:divide-slate-800">
                {filteredNewEmps.length === 0 ? (
                  <div className="py-4 text-center text-[10px] text-muted-foreground font-bold uppercase">No employees found</div>
                ) : (
                  filteredNewEmps.map(e => {
                    const isSelected = !!newSelectedEmps.find(s => s.user_id === e.user_id);
                    return (
                      <div
                        key={e.user_id}
                        onClick={() => toggleNewEmp(e)}
                        className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors ${
                          isSelected ? "bg-pink-50 dark:bg-pink-950/40" : "hover:bg-gray-50 dark:hover:bg-slate-800/60"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="pointer-events-none flex items-center justify-center shrink-0">
                            <AnimatedCheckbox checked={isSelected} readOnly color="#ec4899" size={18} />
                          </div>
                          <div>
                            <p className="text-[11px] font-bold text-foreground dark:text-gray-100">{e.full_name}</p>
                            <p className="text-[9px] text-muted-foreground">{e.department} · {e.branch}</p>
                          </div>
                        </div>
                        {isSelected && (
                          <Badge className="bg-pink-100 dark:bg-pink-500/20 text-pink-600 border border-pink-200 dark:border-pink-500/30 text-[9px] font-bold">
                            Selected
                          </Badge>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Trip Info */}
            <div className="space-y-3">
              <Label className="text-[11px] font-black uppercase tracking-widest text-foreground flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Trip Information
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] font-bold text-foreground mb-1 block">
                    Destination <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={newForm.destination}
                    onChange={e => setNewForm(f => ({ ...f, destination: e.target.value }))}
                    placeholder="e.g. Johor Bahru"
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[10px] font-bold text-foreground mb-1 block">Client / Company</Label>
                  <Input
                    value={newForm.client_company}
                    onChange={e => setNewForm(f => ({ ...f, client_company: e.target.value }))}
                    placeholder="e.g. ABC Sdn Bhd"
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[10px] font-bold text-foreground mb-1 block">Event Name</Label>
                  <Input
                    value={newForm.project}
                    onChange={e => setNewForm(f => ({ ...f, project: e.target.value }))}
                    placeholder="e.g. KHUP 2026"
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[10px] font-bold text-foreground mb-1 block">Meeting Title</Label>
                  <Input
                    value={newForm.meeting_title}
                    onChange={e => setNewForm(f => ({ ...f, meeting_title: e.target.value }))}
                    placeholder="Meeting / event title"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-[10px] font-bold text-foreground mb-1 block">Purpose</Label>
                  <textarea
                    value={newForm.purpose}
                    onChange={e => setNewForm(f => ({ ...f, purpose: e.target.value }))}
                    placeholder="Purpose of travel…"
                    rows={2}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-3">
              <Label className="text-[11px] font-black uppercase tracking-widest text-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Duration
              </Label>
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <label className="w-16 text-xs font-bold text-foreground uppercase tracking-wider hidden sm:block">Starts</label>
                  <label className="text-[10px] font-bold text-foreground block sm:hidden">STARTS</label>
                  <div className="flex-1 flex gap-2">
                    <div className="relative flex-1">
                      <CustomDatePicker
                        value={newForm.start_date}
                        onChange={(d) => setNewForm(f => ({ ...f, start_date: d }))}
                        placeholder="dd/mm/yyyy"
                        displayFormat="DD/MM/YYYY"
                        className="w-full"
                      />
                    </div>
                    <div className="relative flex-1">
                      <CustomTimePicker
                        value={newForm.start_time}
                        onChange={(t) => setNewForm(f => ({ ...f, start_time: t }))}
                        placeholder="--:-- --"
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <label className="w-16 text-xs font-bold text-foreground uppercase tracking-wider hidden sm:block">Ends</label>
                  <label className="text-[10px] font-bold text-foreground block sm:hidden">ENDS</label>
                  <div className="flex-1 flex gap-2">
                    <div className="relative flex-1">
                      <CustomDatePicker
                        value={newForm.end_date}
                        onChange={(d) => setNewForm(f => ({ ...f, end_date: d }))}
                        placeholder="dd/mm/yyyy"
                        displayFormat="DD/MM/YYYY"
                        className="w-full"
                      />
                    </div>
                    <div className="relative flex-1">
                      <CustomTimePicker
                        value={newForm.end_time}
                        onChange={(t) => setNewForm(f => ({ ...f, end_time: t }))}
                        placeholder="--:-- --"
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>
              {newForm.start_date && newForm.end_date && (
                <div className="flex items-center gap-2 bg-pink-50 dark:bg-pink-950/30 border border-pink-100 dark:border-pink-900/40 rounded-lg px-3 py-2">
                  <Calendar className="w-3.5 h-3.5 text-pink-500" />
                  <span className="text-[11px] font-black text-pink-700 dark:text-pink-300">
                    Total Duration: {newTotalDays} day{newTotalDays !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Fixed Footer with Identical Full-Width Separator Line */}
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-end gap-3 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setNewDrawerOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCreateAssignment} disabled={submitting} className="bg-[#e4007c] hover:bg-[#c8006d] text-white gap-1.5 shadow-sm">
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plane className="w-3.5 h-3.5" />}
              Assign{newSelectedEmps.length > 1 ? ` (${newSelectedEmps.length})` : ""}
            </Button>
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
              onClick={confirmDeleteAssignment}
              disabled={deleting}
              className="gap-1.5"
            >
              {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Delete Assignment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* VIEW FORM DIALOG (Read-only view showing event details and all staff assigned) */}
      <Dialog open={!!viewFormEvent} onOpenChange={() => setViewFormEvent(null)}>
        <DialogContent className="max-w-lg w-[95vw] sm:w-full rounded-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col border-0 border-none outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 focus-visible:ring-0 shadow-2xl [&>button]:text-white [&>button]:hover:text-white/80 [&>button]:top-4 [&>button]:right-4 [&>button]:focus:ring-0 [&>button]:focus:ring-offset-0 [&>button]:focus:outline-none [&>button]:outline-none">
          {viewFormEvent && (
            <>
              {/* Header */}
              <div className="bg-[#e4007c] px-6 py-5 text-white shrink-0 border-b border-[#c8006d]">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-white/20 shrink-0">
                    <Plane className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/70 mb-1">Outstation Assignment Form</p>
                    <DialogTitle className="text-lg font-black text-white leading-tight">
                      {viewFormEvent.eventName}
                    </DialogTitle>
                    <p className="text-[11px] text-white/80 mt-1">Submitted outstation assignment details.</p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
                {/* Trip Information */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-black dark:text-white mb-3 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#942392]" /> Trip Information
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 bg-gray-50 dark:bg-slate-900/50 rounded-xl p-3 border border-gray-100 dark:border-slate-800">
                      <p className="text-[10px] text-black dark:text-white font-bold uppercase">Destination</p>
                      <p className="text-sm font-black text-foreground dark:text-gray-100 mt-0.5">{viewFormEvent.destination}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-3 border border-gray-100 dark:border-slate-800">
                      <p className="text-[10px] text-black dark:text-white font-bold uppercase">Event Name</p>
                      <p className="text-sm font-black text-foreground dark:text-gray-100 mt-0.5">{viewFormEvent.eventName}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-3 border border-gray-100 dark:border-slate-800">
                      <p className="text-[10px] text-black dark:text-white font-bold uppercase">Status</p>
                      <div className="mt-1">{statusBadge(viewFormEvent.status)}</div>
                    </div>
                  </div>
                </div>

                {/* Duration */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-black dark:text-white mb-3 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#942392]" /> Duration
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-3 border border-gray-100 dark:border-slate-800">
                      <p className="text-[10px] text-black dark:text-white font-bold uppercase">Start Date</p>
                      <p className="text-sm font-black text-foreground dark:text-gray-100 mt-0.5">{fmtDate(viewFormEvent.startDate)}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-3 border border-gray-100 dark:border-slate-800">
                      <p className="text-[10px] text-black dark:text-white font-bold uppercase">End Date</p>
                      <p className="text-sm font-black text-foreground dark:text-gray-100 mt-0.5">{fmtDate(viewFormEvent.endDate)}</p>
                    </div>
                    <div className="bg-[#942392]/5 rounded-xl p-3 border border-[#942392]/20">
                      <p className="text-[10px] text-[#942392] font-bold uppercase">Total Days</p>
                      <p className="text-lg font-black text-[#942392] mt-0.5">{viewFormEvent.totalDays} {viewFormEvent.totalDays === 1 ? 'Day' : 'Days'}</p>
                    </div>
                  </div>
                </div>

                {/* Employees Assigned */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-black dark:text-white mb-3 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#942392]" /> Employees Assigned ({viewFormEvent.assignments.length})
                  </p>
                  <div className="space-y-2">
                    {viewFormEvent.assignments.map((a) => (
                      <div key={a.id} className="flex items-center gap-3 bg-gray-50 dark:bg-slate-900/50 rounded-xl p-3 border border-gray-100 dark:border-slate-800">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#942392]/20 to-pink-200 flex items-center justify-center text-[10px] font-black text-[#942392] shrink-0">
                          {(a.full_name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-bold text-foreground dark:text-gray-100 truncate">{a.full_name}</p>
                          <p className="text-[10px] text-muted-foreground">{a.department || "—"} · {a.branch || "—"}</p>
                        </div>
                        {statusBadge(a.status)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 pb-5 flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!viewFormEvent) return;
                    const printWindow = window.open("", "_blank");
                    if (!printWindow) return;
                    const staffRowsHtml = viewFormEvent.assignments.map(a => `
                      <tr>
                        <td style="font-weight: bold;">${a.full_name}</td>
                        <td>${a.department || '-'}</td>
                        <td>${a.branch || '-'}</td>
                        <td>${a.status}</td>
                      </tr>
                    `).join("");

                    const html = `
                      <html>
                        <head>
                          <title>Outstation Assignment - ${viewFormEvent.eventName}</title>
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
                          <h1>${viewFormEvent.eventName}</h1>
                          <p style="color: #666; margin-top: 0;">Outstation Assignment Details</p>
                          
                          <h2>Trip Information</h2>
                          <div class="info-grid">
                            <div class="info-box" style="grid-column: span 2;">
                              <div class="label">Destination</div>
                              <div class="value">${viewFormEvent.destination}</div>
                            </div>
                            <div class="info-box">
                              <div class="label">Status</div>
                              <div class="value">${viewFormEvent.status}</div>
                            </div>
                            <div class="info-box">
                              <div class="label">Total Days</div>
                              <div class="value">${viewFormEvent.totalDays} Days (${fmtDate(viewFormEvent.startDate)} - ${fmtDate(viewFormEvent.endDate)})</div>
                            </div>
                          </div>

                          <h2>Employees Assigned (${viewFormEvent.assignments.length} Staff)</h2>
                          <table>
                            <tr>
                              <th>Name</th>
                              <th>Department</th>
                              <th>Branch</th>
                              <th>Status</th>
                            </tr>
                            ${staffRowsHtml}
                          </table>
                          
                          <div style="margin-top: 40px; font-size: 10px; color: #999; text-align: center;">
                            Generated from Rayhar Employee Portal
                          </div>
                        </body>
                      </html>
                    `;
                    writePrintDocument(printWindow, html, { autoPrint: true, closeAfterPrint: true, delay: 250 });
                  }}
                  className="rounded-xl font-black text-[11px] border-purple-200 text-purple-700 hover:bg-purple-50"
                >
                  Export to PDF
                </Button>
                {(viewFormEvent.status === "Active" || viewFormEvent.status === "Upcoming") && (
                  <Button
                    onClick={() => {
                      const target = viewFormEvent;
                      setViewFormEvent(null);
                      openEditEvent(target);
                    }}
                    className="rounded-xl font-black text-[11px] bg-[#942392] hover:bg-[#7a1b7a] text-white gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit Form
                  </Button>
                )}
                <Button variant="outline" onClick={() => setViewFormEvent(null)} className="rounded-xl font-black text-[11px]">
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
