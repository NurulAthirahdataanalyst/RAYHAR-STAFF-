import { useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { ExportDropdown } from "@/components/shared/ExportDropdown";
import { exportToCSV } from "@/utils/export";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus,
  Search,
  Shield,
  Edit,
  Trash2,
  Copy,
  Eye,
  Loader2,
  ArrowLeft,
  Check,
  CheckCircle2,
  Lock,
  ChevronDown,
  ChevronRight,
  Users,
  CheckSquare,
  Square,
  AlertCircle,
  Sparkles,
  LayoutDashboard,
  Calendar,
  Clock,
  Plane,
  CalendarDays,
  BarChart3,
  Building2,
  MapPinned,
  Settings as SettingsIcon,
  HelpCircle
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { API_BASE_URL } from "@/config/api";
import { useRole } from "@/contexts/RoleContext";
import { YearPopover } from "@/components/shared/YearPopover";

interface PermissionItem {
  id: number;
  module: string;
  permission_key: string;
  display_name: string;
}

interface RoleItem {
  id: string;
  name: string;
  description?: string;
  is_system_role: boolean;
  status: "Active" | "Inactive";
  total_users: number;
  permission_count: number;
  permissions?: PermissionItem[];
  permission_keys?: string[];
  created_at: string;
  updated_at?: string;
}

const MODULE_ICONS: Record<string, any> = {
  "Dashboard": LayoutDashboard,
  "Calendar": Calendar,
  "Attendance": Clock,
  "Leave Management": CalendarDays,
  "Leave Administration": CheckSquare,
  "Employee Management": Users,
  "Outstation": Plane,
  "Analytics": BarChart3,
  "Reports": BarChart3,
  "GPS": MapPinned,
  "Settings": SettingsIcon,
};

export default function Role() {
  const navigate = useNavigate();
  const { role: currentUserRole, hasPermission } = useRole();

  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [groupedPermissions, setGroupedPermissions] = useState<Record<string, PermissionItem[]>>({});
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all"); // 'all' | 'system' | 'custom'
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'active' | 'inactive'
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [entriesPerPage, setEntriesPerPage] = useState("10");

  // Form Modal State (Add / Edit / View / Duplicate)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit" | "view" | "duplicate">("add");
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);

  // Form Fields
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStatus, setFormStatus] = useState<"Active" | "Inactive">("Active");
  const [selectedTemplate, setSelectedTemplate] = useState("blank");
  const [selectedPermissionKeys, setSelectedPermissionKeys] = useState<Set<string>>(new Set());
  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({});

  // Users List Modal
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);
  const [roleUsers, setRoleUsers] = useState<any[]>([]);
  const [selectedRoleForUsers, setSelectedRoleForUsers] = useState<RoleItem | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Delete Confirmation Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<RoleItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch roles and permissions
  const fetchData = async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/roles`),
        fetch(`${API_BASE_URL}/api/permissions`)
      ]);
      const rolesData = await rolesRes.json();
      const permsData = await permsRes.json();

      if (rolesData.success) {
        setRoles(rolesData.roles || []);
      }
      if (permsData.success) {
        setPermissions(permsData.permissions || []);
        setGroupedPermissions(permsData.grouped || {});
      }
    } catch (err) {
      console.error("Error fetching role data:", err);
      toast.error("Failed to load role management data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Total permissions count
  const totalAvailablePerms = permissions.length;

  // Open Add Role Modal
  const handleOpenAddModal = () => {
    setFormMode("add");
    setEditingRoleId(null);
    setFormName("");
    setFormDescription("");
    setFormStatus("Active");
    setSelectedTemplate("blank");
    setSelectedPermissionKeys(new Set());
    setCollapsedModules({});
    setIsFormModalOpen(true);
  };

  // Open Edit Role Modal
  const handleOpenEditModal = (roleItem: RoleItem) => {
    setFormMode("edit");
    setEditingRoleId(roleItem.id);
    setFormName(roleItem.name);
    setFormDescription(roleItem.description || "");
    setFormStatus(roleItem.status || "Active");
    setSelectedTemplate(roleItem.name);
    setSelectedPermissionKeys(new Set(roleItem.permission_keys || []));
    setCollapsedModules({});
    setIsFormModalOpen(true);
  };

  // Open View Role Modal
  const handleOpenViewModal = (roleItem: RoleItem) => {
    setFormMode("view");
    setEditingRoleId(roleItem.id);
    setFormName(roleItem.name);
    setFormDescription(roleItem.description || "");
    setFormStatus(roleItem.status || "Active");
    setSelectedTemplate(roleItem.name);
    setSelectedPermissionKeys(new Set(roleItem.permission_keys || []));
    setCollapsedModules({});
    setIsFormModalOpen(true);
  };

  // Open Duplicate Role Modal
  const handleOpenDuplicateModal = (roleItem: RoleItem) => {
    setFormMode("duplicate");
    setEditingRoleId(roleItem.id);
    setFormName(`${roleItem.name} (Copy)`);
    setFormDescription(roleItem.description ? `Copy of ${roleItem.name}: ${roleItem.description}` : `Duplicated from ${roleItem.name}`);
    setFormStatus("Active");
    setSelectedTemplate(roleItem.name);
    setSelectedPermissionKeys(new Set(roleItem.permission_keys || []));
    setCollapsedModules({});
    setIsFormModalOpen(true);
  };

  // Handle Template Selection
  const handleSelectTemplate = (templateName: string) => {
    setSelectedTemplate(templateName);
    if (templateName === "blank") {
      setSelectedPermissionKeys(new Set());
      toast.info("Cleared permissions (Blank Role)");
      return;
    }

    const templateRole = roles.find(r => r.name.toLowerCase() === templateName.toLowerCase());
    if (templateRole && Array.isArray(templateRole.permission_keys)) {
      setSelectedPermissionKeys(new Set(templateRole.permission_keys));
      toast.success(`Copied ${templateRole.permission_keys.length} permissions from ${templateRole.name}`);
    }
  };

  // Toggle individual permission
  const handleTogglePermission = (key: string) => {
    if (formMode === "view") return;
    setSelectedPermissionKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Toggle all permissions in a module
  const handleToggleModuleAll = (moduleName: string, modulePerms: PermissionItem[]) => {
    if (formMode === "view") return;
    const allChecked = modulePerms.every(p => selectedPermissionKeys.has(p.permission_key));
    setSelectedPermissionKeys(prev => {
      const next = new Set(prev);
      modulePerms.forEach(p => {
        if (allChecked) {
          next.delete(p.permission_key);
        } else {
          next.add(p.permission_key);
        }
      });
      return next;
    });
  };

  // Toggle module collapse
  const toggleModuleCollapse = (moduleName: string) => {
    setCollapsedModules(prev => ({
      ...prev,
      [moduleName]: !prev[moduleName]
    }));
  };

  // Expand / Collapse all modules
  const handleToggleAllSections = (expand: boolean) => {
    const nextState: Record<string, boolean> = {};
    Object.keys(groupedPermissions).forEach(mod => {
      nextState[mod] = !expand;
    });
    setCollapsedModules(nextState);
  };

  // Select all or deselect all across all modules
  const handleGlobalSelectAll = (select: boolean) => {
    if (formMode === "view") return;
    if (select) {
      setSelectedPermissionKeys(new Set(permissions.map(p => p.permission_key)));
    } else {
      setSelectedPermissionKeys(new Set());
    }
  };

  // Submit Add / Edit / Duplicate
  const handleSubmitForm = async () => {
    if (!formName.trim()) {
      toast.error("Role Name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const permsArray = Array.from(selectedPermissionKeys);

      if (formMode === "add" || formMode === "duplicate") {
        const res = await fetch(`${API_BASE_URL}/api/roles`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName.trim(),
            description: formDescription.trim(),
            status: formStatus,
            permissions: permsArray
          })
        });
        const data = await res.json();
        if (data.success) {
          toast.success(formMode === "duplicate" ? `Role duplicated as '${formName}'` : `Role '${formName}' created successfully!`);
          setIsFormModalOpen(false);
          fetchData();
        } else {
          toast.error(data.error || "Failed to create role");
        }
      } else if (formMode === "edit" && editingRoleId) {
        const res = await fetch(`${API_BASE_URL}/api/roles/${editingRoleId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName.trim(),
            description: formDescription.trim(),
            status: formStatus,
            permissions: permsArray
          })
        });
        const data = await res.json();
        if (data.success) {
          toast.success(`Role '${formName}' updated successfully!`);
          setIsFormModalOpen(false);
          fetchData();
        } else {
          toast.error(data.error || "Failed to update role");
        }
      }
    } catch (err: any) {
      console.error("Error submitting role form:", err);
      toast.error(err.message || "Server error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Role Status (Activate / Deactivate)
  const handleToggleRoleStatus = async (roleItem: RoleItem) => {
    if (roleItem.is_system_role) {
      toast.error("System roles must remain Active.");
      return;
    }

    const nextStatus = roleItem.status === "Active" ? "Inactive" : "Active";
    try {
      const res = await fetch(`${API_BASE_URL}/api/roles/${roleItem.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Role '${roleItem.name}' is now ${nextStatus}`);
        fetchData();
      } else {
        toast.error(data.error || "Failed to toggle status");
      }
    } catch (err) {
      console.error("Error toggling role status:", err);
      toast.error("Failed to update status");
    }
  };

  // Open Delete Modal
  const handlePromptDelete = (roleItem: RoleItem) => {
    if (roleItem.is_system_role) {
      toast.error("System roles are protected templates and cannot be deleted.");
      return;
    }
    if (roleItem.total_users > 0) {
      toast.error(`Cannot delete role '${roleItem.name}' because ${roleItem.total_users} user(s) are assigned to it. Reassign them first.`);
      return;
    }
    setRoleToDelete(roleItem);
    setIsDeleteModalOpen(true);
  };

  // Confirm Delete Role
  const handleConfirmDelete = async () => {
    if (!roleToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/roles/${roleToDelete.id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || `Role '${roleToDelete.name}' deleted successfully`);
        setIsDeleteModalOpen(false);
        setRoleToDelete(null);
        fetchData();
      } else {
        toast.error(data.error || "Failed to delete role");
      }
    } catch (err) {
      console.error("Error deleting role:", err);
      toast.error("Server error deleting role");
    } finally {
      setIsDeleting(false);
    }
  };

  // Open Users Modal
  const handleViewRoleUsers = async (roleItem: RoleItem) => {
    setSelectedRoleForUsers(roleItem);
    setIsUsersModalOpen(true);
    setLoadingUsers(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/roles/${roleItem.id}/users`);
      const data = await res.json();
      if (data.success) {
        setRoleUsers(data.users || []);
      } else {
        setRoleUsers([]);
      }
    } catch (err) {
      console.error("Error fetching role users:", err);
      setRoleUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Filtered Roles
  const filteredRoles = useMemo(() => {
    return roles
      .filter(r => {
        if (!selectedYear) return true;
        return new Date(r.created_at).getFullYear().toString() === selectedYear;
      })
      .filter(r => {
        if (typeFilter === "system") return r.is_system_role;
        if (typeFilter === "custom") return !r.is_system_role;
        return true;
      })
      .filter(r => {
        if (statusFilter === "all") return true;
        return r.status.toLowerCase() === statusFilter.toLowerCase();
      })
      .filter(r => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        return (
          r.name.toLowerCase().includes(q) ||
          (r.description && r.description.toLowerCase().includes(q))
        );
      });
  }, [roles, selectedYear, typeFilter, statusFilter, searchQuery]);

  return (
    <div className="space-y-4 animate-in fade-in duration-500 w-full pt-0 pb-8">
      {/* Top Breadcrumb & Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="mb-1 gap-2 px-0 text-foreground hover:bg-transparent hover:text-[#942392] transition-colors touch-target"
            onClick={() => navigate("/master")}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">
              Back to Employee Management
            </span>
          </Button>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#942392]/10 dark:bg-[#942392]/20 rounded-xl text-[#942392]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900 dark:text-gray-100 tracking-tight">
                Role Management
              </h1>
              <p className="text-xs text-muted-foreground">
                Manage enterprise system roles and configure unlimited custom permissions
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <ExportDropdown
            onExportCSV={() => exportToCSV(filteredRoles, "Role_Permissions_List")}
            onExportPDF={() => window.print()}
          />
          {hasPermission("employee.role") && (
            <Button
              onClick={handleOpenAddModal}
              className="h-10 px-4 rounded-xl bg-[#942392] text-white hover:bg-[#942392]/90 font-bold text-xs uppercase tracking-wider shadow-md shadow-[#942392]/20 transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Role</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="border-0 shadow-sm rounded-2xl overflow-hidden bg-card border border-border/50">
        <CardContent className="p-0">
          {/* Table Header Filters */}
          <div className="p-4 border-b border-border/60 flex flex-wrap items-center justify-between gap-3 bg-muted/20">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                Roles List ({filteredRoles.length})
              </h2>
              <Badge variant="outline" className="text-[10px] font-semibold">
                {roles.filter(r => r.is_system_role).length} System · {roles.filter(r => !r.is_system_role).length} Custom
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:ml-auto">
              {/* Year Filter */}
              <YearPopover
                year={selectedYear}
                onSelectYear={setSelectedYear}
                className="w-[calc(50%-0.25rem)] sm:w-[120px] shrink-0 h-9"
              />

              {/* Type Filter */}
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[calc(50%-0.25rem)] sm:w-[130px] shrink-0 bg-background border-border/60 h-9 text-xs font-semibold rounded-xl">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="system">System Roles</SelectItem>
                  <SelectItem value="custom">Custom Roles</SelectItem>
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[calc(50%-0.25rem)] sm:w-[120px] shrink-0 bg-background border-border/60 h-9 text-xs font-semibold rounded-xl">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="inactive">Inactive Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Sub Filters & Search */}
          <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-muted/10">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold shrink-0">
              <span>Show</span>
              <Select value={entriesPerPage} onValueChange={setEntriesPerPage}>
                <SelectTrigger className="w-[70px] bg-background border-border/60 h-9 text-xs font-bold rounded-xl">
                  <SelectValue placeholder="10" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span>Roles</span>
            </div>

            <div className="relative flex-1 min-w-[200px] sm:flex-none sm:w-[280px] sm:ml-auto">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search roles or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background border-border/60 h-9 w-full rounded-xl text-xs"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="text-gray-700 dark:text-gray-200 font-bold bg-muted/40 border-b border-border/60">
                <tr>
                  <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-wider">Role Name</th>
                  <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-wider text-center">Total Users</th>
                  <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-wider text-center">Role Type</th>
                  <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-wider text-center">Permissions</th>
                  <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-wider text-center">Status</th>
                  <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-wider">Created Date</th>
                  <th className="px-6 py-3.5 text-right text-[10px] font-black uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#942392]" />
                      Loading roles & permissions matrix...
                    </td>
                  </tr>
                ) : filteredRoles.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                      No roles matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredRoles.slice(0, parseInt(entriesPerPage) || 10).map((r) => (
                    <tr
                      key={r.id}
                      className="hover:bg-muted/30 transition-colors bg-card group"
                    >
                      {/* Role Name */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-xl shrink-0 ${
                            r.is_system_role
                              ? "bg-purple-100 dark:bg-purple-950/40 text-[#942392]"
                              : "bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400"
                          }`}>
                            {r.is_system_role ? (
                              <Lock className="w-4 h-4" />
                            ) : (
                              <Shield className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-gray-900 dark:text-gray-100 block">
                              {r.name}
                            </span>
                            {r.is_system_role && (
                              <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                                Default System Role
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Description */}
                      <td className="px-6 py-4 max-w-xs truncate text-xs text-muted-foreground font-medium" title={r.description}>
                        {r.description || "—"}
                      </td>

                      {/* Total Users */}
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleViewRoleUsers(r)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold hover:bg-[#942392]/10 hover:text-[#942392] transition-colors"
                          title="Click to view assigned users"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>{r.total_users || 0}</span>
                        </button>
                      </td>

                      {/* Role Type */}
                      <td className="px-6 py-4 text-center">
                        {r.is_system_role ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] tracking-wider font-extrabold uppercase rounded-full border bg-purple-50 text-[#942392] border-purple-200 dark:bg-purple-950/30 dark:border-purple-800">
                            <Lock className="w-3 h-3" />
                            System
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] tracking-wider font-extrabold uppercase rounded-full border bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800">
                            Custom
                          </span>
                        )}
                      </td>

                      {/* Permissions Count */}
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-muted/60 text-foreground">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                          <span>{r.permission_count || (r.permission_keys ? r.permission_keys.length : 0)} of {totalAvailablePerms}</span>
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 text-center">
                        {r.status === "Active" ? (
                          <span className="inline-flex items-center justify-center px-3 py-1 text-[10px] tracking-wider font-extrabold uppercase rounded-full border bg-green-50 text-green-600 border-green-200 dark:bg-green-500/10 dark:border-green-500/20">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center px-3 py-1 text-[10px] tracking-wider font-extrabold uppercase rounded-full border bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20">
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Created Date */}
                      <td className="px-6 py-4 text-xs text-muted-foreground font-medium">
                        {new Date(r.created_at).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric"
                        })}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        {r.is_system_role ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenViewModal(r)}
                            className="h-8 px-3 rounded-lg text-xs font-bold gap-1.5 border-border/70 hover:bg-[#942392]/10 hover:text-[#942392]"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Permissions</span>
                          </Button>
                        ) : (
                          <div className="flex items-center justify-end gap-1 text-foreground">
                            {/* View */}
                            <button
                              onClick={() => handleOpenViewModal(r)}
                              className="p-1.5 hover:text-[#942392] hover:bg-[#942392]/10 rounded-lg transition-colors"
                              title="View permissions"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Edit */}
                            <button
                              onClick={() => handleOpenEditModal(r)}
                              className="p-1.5 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors"
                              title="Edit role"
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            {/* Duplicate */}
                            <button
                              onClick={() => handleOpenDuplicateModal(r)}
                              className="p-1.5 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/30 rounded-lg transition-colors"
                              title="Duplicate role"
                            >
                              <Copy className="w-4 h-4" />
                            </button>

                            {/* Toggle Status */}
                            <button
                              onClick={() => handleToggleRoleStatus(r)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                r.status === "Active"
                                  ? "hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                                  : "hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30"
                              }`}
                              title={r.status === "Active" ? "Deactivate role" : "Activate role"}
                            >
                              <AlertCircle className="w-4 h-4" />
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => handlePromptDelete(r)}
                              disabled={r.total_users > 0}
                              className={`p-1.5 rounded-lg transition-colors ${
                                r.total_users > 0
                                  ? "opacity-30 cursor-not-allowed text-muted-foreground"
                                  : "hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 text-rose-500"
                              }`}
                              title={
                                r.total_users > 0
                                  ? `Cannot delete role: ${r.total_users} user(s) assigned`
                                  : "Delete role"
                              }
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* RESPONSIVE ADAPTIVE FORM MODAL (Non-fixed size, scales on Mobile/Tablet/PC) */}
      {/* ========================================================================= */}
      <Dialog open={isFormModalOpen} onOpenChange={setIsFormModalOpen}>
        <DialogContent
          className="w-[96vw] sm:w-[92vw] md:w-[90vw] lg:w-[86vw] xl:w-[80vw] max-w-5xl max-h-[92vh] sm:max-h-[88vh] p-0 overflow-hidden border border-border/80 shadow-2xl rounded-2xl flex flex-col bg-card"
        >
          {/* Header */}
          <DialogHeader className="p-4 sm:p-6 pb-3 sm:pb-4 border-b border-border/60 bg-muted/20 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className={`p-2.5 rounded-xl ${
                  formMode === "view"
                    ? "bg-purple-100 text-[#942392] dark:bg-purple-950/40"
                    : formMode === "duplicate"
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40"
                    : "bg-[#942392]/10 text-[#942392]"
                }`}>
                  {formMode === "view" ? (
                    <Eye className="w-5 h-5" />
                  ) : formMode === "duplicate" ? (
                    <Copy className="w-5 h-5" />
                  ) : (
                    <Shield className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <DialogTitle className="text-lg sm:text-xl font-black text-gray-900 dark:text-gray-100">
                    {formMode === "add" && "Create New Custom Role"}
                    {formMode === "edit" && `Edit Role: ${formName}`}
                    {formMode === "duplicate" && `Duplicate Role: ${formName}`}
                    {formMode === "view" && `Role Permissions: ${formName}`}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    {formMode === "view"
                      ? "Inspect assigned system module permissions"
                      : "Define role specifications and toggle granular module permissions"}
                  </DialogDescription>
                </div>
              </div>

              {/* Total Permissions Counter Badge */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <Badge
                  variant="outline"
                  className="px-3 py-1 bg-[#942392]/10 text-[#942392] dark:bg-[#942392]/20 border-[#942392]/30 font-bold text-xs rounded-xl flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{selectedPermissionKeys.size} of {totalAvailablePerms} Permissions Selected</span>
                </Badge>
              </div>
            </div>
          </DialogHeader>

          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* System Role Notification Banner */}
            {formMode === "view" && (
              <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 flex items-start gap-2.5 text-xs text-purple-900 dark:text-purple-200">
                <Lock className="w-4 h-4 text-[#942392] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Standardized Role Template</span>
                  This role represents an immutable system template. Its assigned permissions are protected to safeguard enterprise business workflows.
                </div>
              </div>
            )}

            {/* Role Metadata Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4 rounded-xl bg-muted/20 border border-border/50">
              {/* Role Name */}
              <div className="space-y-1.5">
                <Label htmlFor="form-role-name" className="text-xs font-bold text-gray-700 dark:text-gray-200">
                  Role Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="form-role-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  disabled={formMode === "view"}
                  placeholder="e.g. Finance Manager, IT Support"
                  className="h-10 text-xs font-medium rounded-xl border-border/60 bg-background"
                />
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <Label htmlFor="form-status" className="text-xs font-bold text-gray-700 dark:text-gray-200">
                  Status
                </Label>
                <Select
                  value={formStatus}
                  onValueChange={(val: "Active" | "Inactive") => setFormStatus(val)}
                  disabled={formMode === "view"}
                >
                  <SelectTrigger className="h-10 text-xs font-medium rounded-xl border-border/60 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Copy Permissions From Template Dropdown */}
              {formMode !== "view" && (
                <div className="space-y-1.5 sm:col-span-2 md:col-span-1">
                  <Label htmlFor="copy-template" className="text-xs font-bold text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#942392]" />
                    <span>Copy Permissions From</span>
                  </Label>
                  <Select value={selectedTemplate} onValueChange={handleSelectTemplate}>
                    <SelectTrigger className="h-10 text-xs font-bold rounded-xl border-border/60 bg-background focus:ring-[#942392]">
                      <SelectValue placeholder="Choose Role Template" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl max-h-60">
                      <SelectItem value="blank" className="font-semibold text-muted-foreground">
                        ⚪ Blank Role (0 Permissions)
                      </SelectItem>
                      <div className="px-2 py-1 text-[10px] font-black uppercase text-muted-foreground tracking-wider">
                        System Templates
                      </div>
                      {roles.filter(r => r.is_system_role).map(r => (
                        <SelectItem key={r.id} value={r.name} className="font-bold">
                          🛡️ {r.name} ({r.permission_keys ? r.permission_keys.length : 0} perms)
                        </SelectItem>
                      ))}
                      {roles.filter(r => !r.is_system_role).length > 0 && (
                        <>
                          <div className="px-2 py-1 text-[10px] font-black uppercase text-muted-foreground tracking-wider">
                            Custom Roles
                          </div>
                          {roles.filter(r => !r.is_system_role).map(r => (
                            <SelectItem key={r.id} value={r.name} className="font-semibold">
                              ✨ {r.name}
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Description */}
              <div className="space-y-1.5 sm:col-span-2 md:col-span-3">
                <Label htmlFor="form-desc" className="text-xs font-bold text-gray-700 dark:text-gray-200">
                  Role Description
                </Label>
                <Textarea
                  id="form-desc"
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  disabled={formMode === "view"}
                  placeholder="Outline responsibilities and access privileges for this role..."
                  className="text-xs rounded-xl border-border/60 bg-background resize-none"
                />
              </div>
            </div>

            {/* Permission Assignment Section */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border/60">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-[#942392]" />
                    <span>Module Permissions Matrix</span>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Select the modules and granular features this role can access
                  </p>
                </div>

                {formMode !== "view" && (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleGlobalSelectAll(true)}
                      className="h-8 px-2.5 text-xs font-bold text-[#942392] hover:bg-[#942392]/10 rounded-lg"
                    >
                      Select All
                    </Button>
                    <span className="text-muted-foreground/40">•</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleGlobalSelectAll(false)}
                      className="h-8 px-2.5 text-xs font-bold text-muted-foreground hover:bg-muted rounded-lg"
                    >
                      Clear All
                    </Button>
                    <span className="text-muted-foreground/40">•</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleAllSections(true)}
                      className="h-8 px-2.5 text-xs font-bold text-foreground hover:bg-muted rounded-lg"
                    >
                      Expand All
                    </Button>
                  </div>
                )}
              </div>

              {/* Modules Grid (Responsive 1 or 2 Columns on PC) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {Object.entries(groupedPermissions).map(([moduleName, modulePerms]) => {
                  const ModuleIcon = MODULE_ICONS[moduleName] || Shield;
                  const allModuleChecked = modulePerms.every(p => selectedPermissionKeys.has(p.permission_key));
                  const someModuleChecked = modulePerms.some(p => selectedPermissionKeys.has(p.permission_key));
                  const isCollapsed = collapsedModules[moduleName];
                  const selectedCountInModule = modulePerms.filter(p => selectedPermissionKeys.has(p.permission_key)).length;

                  return (
                    <div
                      key={moduleName}
                      className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm transition-all"
                    >
                      {/* Module Header Bar */}
                      <div className="p-3.5 bg-muted/30 border-b border-border/50 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {/* Module Checkbox */}
                          {formMode !== "view" ? (
                            <button
                              type="button"
                              onClick={() => handleToggleModuleAll(moduleName, modulePerms)}
                              className="text-[#942392] hover:opacity-80 transition-opacity shrink-0"
                              title={allModuleChecked ? "Deselect all" : "Select all module permissions"}
                            >
                              {allModuleChecked ? (
                                <div className="w-5 h-5 border-2 border-[#942392] bg-[#942392] rounded flex items-center justify-center shadow-sm">
                                  <Check className="w-3.5 h-3.5 text-white stroke-[3.5]" />
                                </div>
                              ) : someModuleChecked ? (
                                <div className="w-5 h-5 border-2 border-[#942392] bg-[#942392]/20 rounded flex items-center justify-center">
                                  <div className="w-2.5 h-1 bg-[#942392] rounded" />
                                </div>
                              ) : (
                                <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 hover:border-[#942392] bg-background rounded transition-colors" />
                              )}
                            </button>
                          ) : (
                            <span className="text-muted-foreground shrink-0">
                              {allModuleChecked ? (
                                <div className="w-5 h-5 border-2 border-[#942392] bg-[#942392] rounded flex items-center justify-center shadow-sm">
                                  <Check className="w-3.5 h-3.5 text-white stroke-[3.5]" />
                                </div>
                              ) : someModuleChecked ? (
                                <div className="w-5 h-5 border-2 border-[#942392] bg-[#942392]/20 rounded flex items-center justify-center">
                                  <div className="w-2.5 h-1 bg-[#942392] rounded" />
                                </div>
                              ) : (
                                <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 bg-background rounded opacity-60" />
                              )}
                            </span>
                          )}

                          <div className="p-1.5 rounded-lg bg-background text-[#942392] shrink-0 border border-border/40">
                            <ModuleIcon className="w-4 h-4" />
                          </div>

                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">
                              {moduleName}
                            </h4>
                            <span className="text-[10px] text-muted-foreground font-medium">
                              {selectedCountInModule} of {modulePerms.length} active
                            </span>
                          </div>
                        </div>

                        {/* Expand/Collapse Toggle */}
                        <button
                          type="button"
                          onClick={() => toggleModuleCollapse(moduleName)}
                          className="p-1 hover:bg-background rounded-lg text-muted-foreground transition-colors shrink-0"
                          title={isCollapsed ? "Expand module" : "Collapse module"}
                        >
                          {isCollapsed ? (
                            <ChevronRight className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      {/* Module Permissions Checklist */}
                      {!isCollapsed && (
                        <div className="p-3.5 space-y-2.5 bg-background/50">
                          {modulePerms.map((perm) => {
                            const isChecked = selectedPermissionKeys.has(perm.permission_key);
                            return (
                              <label
                                key={perm.id}
                                className={`flex items-start gap-2.5 p-2 rounded-xl transition-all cursor-pointer ${
                                  isChecked
                                    ? "bg-[#942392]/5 border border-[#942392]/20"
                                    : "hover:bg-muted/40 border border-transparent"
                                } ${formMode === "view" ? "cursor-default" : ""}`}
                              >
                                <div className="relative mt-0.5 shrink-0">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleTogglePermission(perm.permission_key)}
                                    disabled={formMode === "view"}
                                    className="sr-only"
                                  />
                                  <div
                                    className={`w-4 h-4 rounded flex items-center justify-center transition-all border ${
                                      isChecked
                                        ? "bg-[#942392] border-[#942392] text-white shadow-sm"
                                        : "border-gray-300 dark:border-gray-600 bg-background hover:border-[#942392]"
                                    } ${formMode === "view" ? "opacity-70" : ""}`}
                                  >
                                    {isChecked && <Check className="w-3 h-3 text-white stroke-[3.5]" />}
                                  </div>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className={`text-xs font-semibold ${
                                      isChecked ? "text-gray-900 dark:text-gray-100 font-bold" : "text-muted-foreground"
                                    }`}>
                                      {perm.display_name}
                                    </span>
                                    <span className="text-[9px] font-mono text-muted-foreground/60 shrink-0">
                                      {perm.permission_key}
                                    </span>
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <DialogFooter className="p-4 sm:p-5 border-t border-border/60 bg-muted/20 shrink-0 flex items-center justify-between gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsFormModalOpen(false)}
              className="border-border/60 text-xs font-bold rounded-xl h-10 px-4"
            >
              {formMode === "view" ? "Close" : "Cancel"}
            </Button>

            {formMode !== "view" && (
              <Button
                type="button"
                onClick={handleSubmitForm}
                disabled={isSubmitting}
                className="bg-[#942392] hover:bg-[#942392]/90 text-white font-bold text-xs uppercase tracking-wider rounded-xl h-10 px-5 shadow-md shadow-[#942392]/20"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>{formMode === "edit" ? "Save Changes" : "Create Role"}</span>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DELETE CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="max-w-md p-6 rounded-2xl">
          <DialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <DialogTitle className="text-lg font-bold">
              Delete Role "{roleToDelete?.name}"?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to permanently delete this custom role? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
              className="rounded-xl h-10 text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl h-10 text-xs font-bold"
            >
              {isDeleting ? "Deleting..." : "Confirm Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* ASSIGNED USERS MODAL */}
      {/* ========================================================================= */}
      <Dialog open={isUsersModalOpen} onOpenChange={setIsUsersModalOpen}>
        <DialogContent className="max-w-lg p-0 overflow-hidden rounded-2xl">
          <DialogHeader className="p-5 border-b border-border/60 bg-muted/20">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Users className="w-4 h-4 text-[#942392]" />
              <span>Assigned Employees: {selectedRoleForUsers?.name}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Staff members currently inheriting permissions from this role
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-80 overflow-y-auto p-4 space-y-2">
            {loadingUsers ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-[#942392]" />
                Loading staff...
              </div>
            ) : roleUsers.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No employees are currently assigned to this role.
              </div>
            ) : (
              roleUsers.map((u) => (
                <div
                  key={u.user_id}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-border/50 hover:bg-muted/30 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">
                      {u.full_name}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {u.email} • {u.branch || "HQ"} {u.department ? `• ${u.department}` : ""}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[9px] font-bold">
                    {u.status || "Active"}
                  </Badge>
                </div>
              ))
            )}
          </div>

          <DialogFooter className="p-4 border-t border-border/60 bg-muted/20">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsUsersModalOpen(false)}
              className="rounded-xl text-xs font-bold"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
