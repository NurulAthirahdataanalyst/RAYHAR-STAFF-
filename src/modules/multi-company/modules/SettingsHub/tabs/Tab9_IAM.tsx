import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { 
  ShieldCheck, 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  Sparkles, 
  Check, 
  AlertCircle, 
  Loader2, 
  Shield, 
  ChevronRight, 
  ChevronDown,
  Building2,
  Clock,
  Calendar,
  CalendarDays,
  ClipboardList,
  Plane,
  PieChart,
  FileSearch,
  MapPinned,
  Settings as SettingsIcon,
  LayoutDashboard
} from 'lucide-react';
import { toast } from 'sonner';
import { useCompany } from '../../../contexts/CompanyContext';
import { multiCompanyApi } from '../../../services/multiCompanyApi';
import { CompanyRole, RoleTemplate, RoleType, ScopeType, CompanyModuleSetting, ModulePermission } from '../../../types/multiCompany.types';
import { API_BASE_URL } from '@/config/api';

const MODULE_ICONS: Record<string, React.ElementType> = {
  dashboard: LayoutDashboard,
  calendar: Calendar,
  attendance: Clock,
  leave_management: CalendarDays,
  leave_admin: ClipboardList,
  organization_entities: Building2,
  employee_management: Users,
  outstation: Plane,
  analytics: PieChart,
  reports: FileSearch,
  gps: MapPinned,
  settings: SettingsIcon,
};

export const Tab9_IAM: React.FC = () => {
  const { companies, activeCompany } = useCompany();
  const [selectedCompanyId, setSelectedCompanyId] = useState<number>(activeCompany?.id || 1);
  const [roles, setRoles] = useState<CompanyRole[]>([]);
  const [mainCompanyRoles, setMainCompanyRoles] = useState<any[]>([]);
  const [companyModules, setCompanyModules] = useState<CompanyModuleSetting[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<CompanyRole | null>(null);
  const [roleName, setRoleName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [roleType, setRoleType] = useState<RoleType>('Operational Role');
  const [scopeType, setScopeType] = useState<ScopeType>('Current Company Only');
  const [roleStatus, setRoleStatus] = useState<'Active' | 'Inactive'>('Active');
  const [selectedTemplate, setSelectedTemplate] = useState('blank');
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [selectedPermissionLevels, setSelectedPermissionLevels] = useState<Record<string, 'view' | 'edit'>>({});
  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (activeCompany) setSelectedCompanyId(activeCompany.id);
  }, [activeCompany]);

  const fetchRolesAndModules = async (cId: number) => {
    try {
      setLoading(true);
      const [rList, modRes, mainRolesRes] = await Promise.all([
        multiCompanyApi.getCompanyRoles(cId),
        multiCompanyApi.getCompanyModules(cId),
        fetch(`${API_BASE_URL}/api/roles`).then(r => r.json()).catch(() => ({ roles: [] }))
      ]);
      setRoles(rList || []);
      setCompanyModules(modRes.modules || []);
      setMainCompanyRoles(mainRolesRes.roles || []);
    } catch (err) {
      console.error('Error fetching IAM data:', err);
      toast.error('Failed to load role definitions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchRolesAndModules(selectedCompanyId);
  }, [selectedCompanyId]);

  const currentCompany = companies.find(c => c.id === selectedCompanyId) || activeCompany;

  // Filter modules to only those enabled for this company
  const visibleModules = useMemo(() => {
    return companyModules.filter(m => m.is_enabled);
  }, [companyModules]);

  const totalVisiblePerms = useMemo(() => {
    return visibleModules.reduce((acc, m) => acc + (m.permissions?.length || 0), 0);
  }, [visibleModules]);

  const handleOpenAdd = () => {
    setEditingRole(null);
    setRoleName('');
    setDisplayName('');
    setDescription('');
    setRoleType('Operational Role');
    setScopeType('Current Company Only');
    setRoleStatus('Active');
    setSelectedTemplate('blank');
    setSelectedPermissions(new Set());
    setSelectedPermissionLevels({});
    setCollapsedModules({});
    setModalOpen(true);
  };

  const handleOpenEdit = (r: CompanyRole) => {
    setEditingRole(r);
    setRoleName(r.name);
    setDisplayName(r.name);
    setDescription(r.description || '');
    setRoleType(r.role_type || 'Operational Role');
    setScopeType(r.scope_type || 'Current Company Only');
    setRoleStatus(r.status || 'Active');
    setSelectedTemplate(r.name);

    const keys = r.permission_keys || [];
    setSelectedPermissions(new Set(keys));

    const levels: Record<string, 'view' | 'edit'> = { ...(r.permission_levels || {}) };
    keys.forEach(k => {
      if (!levels[k]) levels[k] = 'edit';
    });
    setSelectedPermissionLevels(levels);
    setCollapsedModules({});
    setModalOpen(true);
  };

  // Copy Permissions From Main Company Role
  const handleSelectTemplate = (templateName: string) => {
    setSelectedTemplate(templateName);
    if (templateName === 'blank') {
      setSelectedPermissions(new Set());
      setSelectedPermissionLevels({});
      toast.info('Cleared permissions (Blank Role)');
      return;
    }

    const mainRole = mainCompanyRoles.find(r => r.name.toLowerCase() === templateName.toLowerCase());
    if (mainRole && Array.isArray(mainRole.permission_keys)) {
      // Filter permissions to only those enabled for the target company
      const allowedCompanyPerms = new Set(
        visibleModules.flatMap(m => (m.permissions || []).map(p => p.permission_key))
      );

      const filteredKeys = mainRole.permission_keys.filter((k: string) => allowedCompanyPerms.has(k));
      const sourceLevels = mainRole.permission_levels || {};
      const nextLevels: Record<string, 'view' | 'edit'> = {};
      filteredKeys.forEach((k: string) => {
        nextLevels[k] = sourceLevels[k] || 'edit';
      });

      setSelectedPermissions(new Set(filteredKeys));
      setSelectedPermissionLevels(nextLevels);
      toast.success(`Copied ${filteredKeys.length} permissions from Main Company (${mainRole.name})`);
    }
  };

  // Toggle submodule
  const handleTogglePermission = (permKey: string) => {
    setSelectedPermissions(prev => {
      const next = new Set(prev);
      if (next.has(permKey)) next.delete(permKey);
      else next.add(permKey);
      return next;
    });
    setSelectedPermissionLevels(prev => ({
      ...prev,
      [permKey]: prev[permKey] || 'edit'
    }));
  };

  // Set explicit level ('view' | 'edit')
  const handleSetLevel = (permKey: string, level: 'view' | 'edit') => {
    setSelectedPermissions(prev => new Set(prev).add(permKey));
    setSelectedPermissionLevels(prev => ({
      ...prev,
      [permKey]: level
    }));
  };

  // Toggle whole module
  const handleToggleModuleAll = (modulePerms: ModulePermission[]) => {
    const keys = modulePerms.map(p => p.permission_key);
    const allChecked = keys.every(k => selectedPermissions.has(k));
    setSelectedPermissions(prev => {
      const next = new Set(prev);
      keys.forEach(k => {
        if (allChecked) next.delete(k);
        else next.add(k);
      });
      return next;
    });
  };

  // Global Select / Clear All
  const handleGlobalSelect = (select: boolean) => {
    if (select) {
      const allKeys = visibleModules.flatMap(m => (m.permissions || []).map(p => p.permission_key));
      setSelectedPermissions(new Set(allKeys));
    } else {
      setSelectedPermissions(new Set());
    }
  };

  // Toggle collapse
  const toggleCollapse = (modKey: string) => {
    setCollapsedModules(prev => ({ ...prev, [modKey]: !prev[modKey] }));
  };

  const handleToggleAllCollapse = (expand: boolean) => {
    const next: Record<string, boolean> = {};
    visibleModules.forEach(m => { next[m.module_key] = !expand; });
    setCollapsedModules(next);
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) {
      toast.error('Role Name is required');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        role_name: roleName.trim(),
        name: roleName.trim(),
        display_name: displayName.trim() || roleName.trim(),
        description: description.trim(),
        role_type: roleType,
        scope_type: scopeType,
        status: roleStatus,
        permissions: Array.from(selectedPermissions),
        permission_levels: selectedPermissionLevels,
        company_id: selectedCompanyId
      };

      if (editingRole) {
        await multiCompanyApi.updateRole(editingRole.id, payload);
        toast.success(`Role "${roleName}" updated successfully!`);
      } else {
        await multiCompanyApi.createCompanyRole(selectedCompanyId, payload);
        toast.success(`Role "${roleName}" registered for ${currentCompany?.company_name}!`);
      }

      await fetchRolesAndModules(selectedCompanyId);
      setModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Error saving role');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async (roleId: string, roleName: string) => {
    if (!window.confirm(`Are you sure you want to delete role "${roleName}"?`)) return;
    try {
      await multiCompanyApi.deleteRole(roleId);
      toast.success(`Role "${roleName}" deleted`);
      await fetchRolesAndModules(selectedCompanyId);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete role');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-muted/30 dark:bg-neutral-900/40 rounded-2xl border border-border dark:border-neutral-800">
        <div className="flex flex-wrap items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-[#942392]" />
          <span className="text-xs font-black uppercase tracking-wider text-black dark:text-white">
            Company IAM Scope:
          </span>
          <Select 
            value={selectedCompanyId ? selectedCompanyId.toString() : "1"} 
            onValueChange={(val) => setSelectedCompanyId(parseInt(val, 10))}
          >
            <SelectTrigger className="w-72 min-w-[260px] text-xs h-9 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-bold text-black dark:text-white shadow-xs rounded-xl">
              <SelectValue placeholder="Select company...">
                {currentCompany ? `${currentCompany.company_name} (${currentCompany.company_type === 'main' ? 'Main Company' : 'Subsidiary'})` : 'Rayhar Travels (Main Company)'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {companies.length > 0 ? (
                companies.map(c => (
                  <SelectItem key={c.id} value={c.id.toString()} className="text-xs font-bold">
                    {c.company_name} ({c.company_type === 'main' ? 'Main Company' : 'Subsidiary'})
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="1" className="text-xs font-bold">
                  Rayhar Travels (Main Company)
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleOpenAdd}
          className="bg-[#942392] hover:bg-[#800A7A] text-white font-black text-xs uppercase tracking-wider shadow-sm h-9 px-4 rounded-full self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Add Company Role
        </Button>
      </div>

      {/* Roles Table */}
      <Card className="border border-border dark:border-neutral-800 shadow-xs bg-white/70 dark:bg-card/70 backdrop-blur-md rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-xs text-black dark:text-white flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#942392]" />
            Loading roles...
          </div>
        ) : roles.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <ShieldCheck className="w-8 h-8 mx-auto text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground font-medium">
              No roles defined yet for {currentCompany?.company_name}. Click "+ Add Company Role" to begin.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 dark:bg-neutral-800/60 border-b border-border dark:border-neutral-800 text-xs font-black uppercase tracking-wider text-black dark:text-white">
                <tr>
                  <th className="px-4 py-3.5">Role Name</th>
                  <th className="px-4 py-3.5">Role Type</th>
                  <th className="px-4 py-3.5">Scope Boundary</th>
                  <th className="px-4 py-3.5">Assigned Staff</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 dark:divide-neutral-800/40">
                {roles.map((r) => {
                  const isGroup = r.scope_type === 'Parent Group Access';

                  return (
                    <tr key={r.id} className="hover:bg-muted/40 dark:hover:bg-neutral-800/40 transition-colors">
                      {/* Role Name */}
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-black dark:text-white">
                            {r.name}
                          </span>
                          {r.description && (
                            <span className="text-xs text-muted-foreground truncate max-w-xs">{r.description}</span>
                          )}
                        </div>
                      </td>

                      {/* Role Type Pill Badge */}
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border border-blue-200 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
                          {r.role_type || 'Operational Role'}
                        </span>
                      </td>

                      {/* Scope Boundary Pill Badge */}
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
                          isGroup 
                            ? 'border-[#942392]/30 bg-[#942392]/10 text-[#942392] dark:text-[#f885d5]' 
                            : 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}>
                          {r.scope_type || 'Current Company Only'}
                        </span>
                      </td>

                      {/* Assigned Staff Pill Badge */}
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300">
                          <Users className="w-3.5 h-3.5 text-[#942392]" />
                          <span>{r.total_users || 0} Staff</span>
                        </span>
                      </td>

                      {/* Status Pill Badge */}
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(r)}
                            className="h-8 px-3 rounded-full text-xs font-bold border-border/80 hover:bg-muted"
                          >
                            <Edit className="w-3.5 h-3.5 mr-1" />
                            Edit
                          </Button>

                          {!r.is_system_role && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRole(r.id, r.name)}
                              className="h-8 w-8 p-0 rounded-full text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                              title="Delete role"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Upgraded Wide Modal Matching /master/role */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-2xl bg-card border border-border shadow-2xl">
          <form onSubmit={handleSaveRole} className="flex flex-col h-full max-h-[92vh] overflow-hidden">
            {/* Modal Header Bar */}
            <DialogHeader className="p-5 sm:p-6 border-b border-border/60 bg-muted/20 shrink-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <DialogTitle className="text-lg font-bold text-black dark:text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-[#942392]" />
                    <span>
                      {editingRole ? `Edit Role: ${editingRole.name}` : `Create New Role for ${currentCompany?.company_name}`}
                    </span>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Define role specifications, copy permissions from Main Company, and toggle granular View | Edit access
                  </DialogDescription>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border border-[#942392]/30 bg-[#942392]/10 text-[#942392] dark:text-[#f885d5]">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>{selectedPermissions.size} of {totalVisiblePerms} Permissions Selected</span>
                  </span>
                </div>
              </div>
            </DialogHeader>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
              {/* Role Metadata Box */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4 rounded-xl bg-muted/20 border border-border/50">
                {/* Role Name */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">
                    Role Name <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    placeholder="e.g. Finance Manager, Fleet Supervisor"
                    className="h-10 text-xs font-medium placeholder:font-normal rounded-xl border-border/60 bg-background text-black dark:text-white"
                    required
                  />
                </div>

                {/* Status */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">
                    Status
                  </Label>
                  <Select value={roleStatus} onValueChange={(val: any) => setRoleStatus(val)}>
                    <SelectTrigger className="h-10 text-xs font-bold rounded-xl border-border/60 bg-background text-black dark:text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="Active" className="font-bold">Active</SelectItem>
                      <SelectItem value="Inactive" className="font-bold">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Copy Permissions From (Main Company Roles) */}
                <div className="space-y-1.5 sm:col-span-2 md:col-span-1">
                  <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#942392]" />
                    <span>Copy Permissions From</span>
                  </Label>
                  <Select value={selectedTemplate} onValueChange={handleSelectTemplate}>
                    <SelectTrigger className="h-10 text-xs font-bold rounded-xl border-border/60 bg-background text-black dark:text-white">
                      <SelectValue placeholder="Choose Role Template" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl max-h-60">
                      <SelectItem value="blank" className="font-bold text-muted-foreground">
                        ⚪ Blank Role (0 Permissions)
                      </SelectItem>
                      <div className="px-2 py-1 text-[10px] font-black uppercase text-muted-foreground tracking-wider">
                        Main Company Roles (Rayhar Travels)
                      </div>
                      {mainCompanyRoles.map(r => (
                        <SelectItem key={r.id} value={r.name} className="font-bold">
                          🛡️ {r.name} ({r.permission_keys ? r.permission_keys.length : 0} perms)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Role Type */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">
                    Role Type
                  </Label>
                  <Select value={roleType} onValueChange={(val: any) => setRoleType(val)}>
                    <SelectTrigger className="h-10 text-xs font-bold rounded-xl border-border/60 bg-background text-black dark:text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="Management Role" className="font-bold">Management Role (Director, OM, HOD)</SelectItem>
                      <SelectItem value="Department Role" className="font-bold">Department Role (HR, Finance)</SelectItem>
                      <SelectItem value="Operational Role" className="font-bold">Operational Role (Supervisor, Leader)</SelectItem>
                      <SelectItem value="Employee Role" className="font-bold">Employee Role (Staff, Driver)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Scope Boundary */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">
                    Access Scope Boundary
                  </Label>
                  <Select value={scopeType} onValueChange={(val: any) => setScopeType(val)}>
                    <SelectTrigger className="h-10 text-xs font-bold rounded-xl border-border/60 bg-background text-black dark:text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="Current Company Only" className="font-bold">Current Company Only (Sandboxed)</SelectItem>
                      <SelectItem value="Parent Group Access" className="font-bold">Parent Group Access (HQ Cross-Access)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Description */}
                <div className="space-y-1.5 sm:col-span-2 md:col-span-1">
                  <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">
                    Role Description
                  </Label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Responsibilities for this role..."
                    className="h-10 text-xs font-medium placeholder:font-normal rounded-xl border-border/60 bg-background text-black dark:text-white"
                  />
                </div>
              </div>

              {/* Module Permissions Matrix Section */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border/60">
                  <div>
                    <h3 className="text-sm font-bold text-black dark:text-white flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-[#942392]" />
                      <span>Module Permissions Matrix</span>
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Select modules and submodules available for {currentCompany?.company_name} with granular View | Edit access
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleGlobalSelect(true)}
                      className="h-8 px-2.5 text-xs font-black text-[#942392] hover:bg-[#942392]/10 rounded-lg uppercase"
                    >
                      Select All
                    </Button>
                    <span className="text-muted-foreground/40">•</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleGlobalSelect(false)}
                      className="h-8 px-2.5 text-xs font-bold text-muted-foreground hover:bg-muted rounded-lg"
                    >
                      Clear All
                    </Button>
                    <span className="text-muted-foreground/40">•</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleAllCollapse(true)}
                      className="h-8 px-2.5 text-xs font-bold text-black dark:text-white hover:bg-muted rounded-lg"
                    >
                      Expand All
                    </Button>
                  </div>
                </div>

                {/* 2-Column Responsive Matrix */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {visibleModules.map(mod => {
                    const IconComponent = MODULE_ICONS[mod.module_key] || Shield;
                    const perms: ModulePermission[] = mod.permissions || [];
                    const isCollapsed = collapsedModules[mod.module_key];

                    const activeCount = perms.filter(p => selectedPermissions.has(p.permission_key)).length;
                    const allChecked = perms.length > 0 && activeCount === perms.length;
                    const someChecked = activeCount > 0 && !allChecked;

                    return (
                      <div
                        key={mod.module_key}
                        className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs transition-all"
                      >
                        {/* Module Header Bar */}
                        <div className="p-3.5 bg-muted/30 border-b border-border/50 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {/* Module Checkbox */}
                            <button
                              type="button"
                              onClick={() => handleToggleModuleAll(perms)}
                              className="text-[#942392] hover:opacity-80 transition-opacity shrink-0"
                              title={allChecked ? "Deselect all" : "Select all module permissions"}
                            >
                              {allChecked ? (
                                <div className="w-5 h-5 border-2 border-[#942392] bg-[#942392] rounded flex items-center justify-center shadow-xs">
                                  <Check className="w-3.5 h-3.5 text-white stroke-[3.5]" />
                                </div>
                              ) : someChecked ? (
                                <div className="w-5 h-5 border-2 border-[#942392] bg-[#942392]/20 rounded flex items-center justify-center">
                                  <div className="w-2.5 h-1 bg-[#942392] rounded" />
                                </div>
                              ) : (
                                <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 hover:border-[#942392] bg-background rounded transition-colors" />
                              )}
                            </button>

                            <div className="p-1.5 rounded-lg bg-background text-[#942392] shrink-0 border border-border/40">
                              <IconComponent className="w-4 h-4" />
                            </div>

                            <div className="min-w-0">
                              <h4 className="text-xs font-black uppercase tracking-wider text-black dark:text-white truncate">
                                {mod.module_name}
                              </h4>
                              <span className="text-[10px] text-muted-foreground font-medium">
                                {activeCount} of {perms.length} active
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => toggleCollapse(mod.module_key)}
                            className="p-1 hover:bg-background rounded-lg text-black dark:text-white transition-colors shrink-0"
                            title={isCollapsed ? "Expand module" : "Collapse module"}
                          >
                            {isCollapsed ? (
                              <ChevronRight className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </div>

                        {/* Checklist items */}
                        {!isCollapsed && (
                          <div className="p-3.5 space-y-2 bg-background/50">
                            {perms.map(p => {
                              const isChecked = selectedPermissions.has(p.permission_key);
                              const currentLevel = selectedPermissionLevels[p.permission_key] || 'edit';

                              return (
                                <div
                                  key={p.id}
                                  onClick={() => handleTogglePermission(p.permission_key)}
                                  className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                                    isChecked
                                      ? 'bg-[#942392]/5 border-[#942392]/25 dark:bg-[#942392]/10'
                                      : 'hover:bg-muted/40 border-border/40'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                    <div
                                      className={`w-4 h-4 rounded flex items-center justify-center transition-all border shrink-0 ${
                                        isChecked
                                          ? 'bg-[#942392] border-[#942392] text-white shadow-2xs'
                                          : 'border-gray-300 dark:border-gray-600 bg-background hover:border-[#942392]'
                                      }`}
                                    >
                                      {isChecked && <Check className="w-3 h-3 text-white stroke-[3.5]" />}
                                    </div>

                                    <span className={`text-xs font-bold leading-tight truncate ${
                                      isChecked ? 'text-black dark:text-white' : 'text-muted-foreground'
                                    }`}>
                                      {p.display_name}
                                    </span>
                                  </div>

                                  {/* Segmented View | Edit Toggle */}
                                  <div 
                                    className="flex items-center gap-1.5 shrink-0" 
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="inline-flex items-center p-0.5 rounded-full bg-muted/80 dark:bg-neutral-800 border border-border/70 shadow-2xs">
                                      <button
                                        type="button"
                                        onClick={() => handleSetLevel(p.permission_key, 'view')}
                                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${
                                          isChecked && currentLevel === 'view'
                                            ? 'bg-[#942392] text-white shadow-xs'
                                            : isChecked
                                            ? 'text-muted-foreground hover:text-black dark:hover:text-white hover:bg-background/60'
                                            : 'text-muted-foreground/40 hover:text-muted-foreground'
                                        }`}
                                        title="View: Read-only access"
                                      >
                                        View
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleSetLevel(p.permission_key, 'edit')}
                                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${
                                          isChecked && currentLevel === 'edit'
                                            ? 'bg-[#942392] text-white shadow-xs'
                                            : isChecked
                                            ? 'text-muted-foreground hover:text-black dark:hover:text-white hover:bg-background/60'
                                            : 'text-muted-foreground/40 hover:text-muted-foreground'
                                        }`}
                                        title="Edit: Full management privileges"
                                      >
                                        Edit
                                      </button>
                                    </div>
                                    <span className="hidden sm:inline text-[9px] font-mono text-muted-foreground/60">
                                      {p.permission_key}
                                    </span>
                                  </div>
                                </div>
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
                onClick={() => setModalOpen(false)}
                className="border-border/60 text-xs font-bold rounded-full h-10 px-5"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={saving || !roleName.trim()}
                className="bg-[#942392] hover:bg-[#800A7A] text-white font-bold text-xs uppercase tracking-wider rounded-full h-10 px-6 shadow-md shadow-[#942392]/20"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>{editingRole ? 'Save Changes' : 'Create Role'}</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Tab9_IAM;
