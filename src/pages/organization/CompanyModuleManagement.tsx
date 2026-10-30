import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Boxes, 
  LayoutDashboard, 
  Calendar, 
  Clock, 
  CalendarDays, 
  ClipboardList, 
  Users, 
  Plane, 
  PieChart, 
  FileSearch, 
  MapPinned, 
  Settings as SettingsIcon,
  User,
  Briefcase,
  Crown, 
  Check, 
  Save, 
  Building2, 
  ShieldCheck, 
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronRight,
  Shield,
  CheckCircle2,
  Layers,
  Edit,
  X,
  Eye,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { useCompany } from '@/modules/multi-company/contexts/CompanyContext';
import { multiCompanyApi } from '@/modules/multi-company/services/multiCompanyApi';
import { CompanyModuleSetting, CompanyRole, ModulePermission } from '@/modules/multi-company/types/multiCompany.types';
import { useRole } from '@/contexts/RoleContext';
import { API_BASE_URL } from '@/config/api';


export const AUTHORIZATION_SCOPES = [
  {
    value: 'Own Data Only',
    title: 'Own Data Only',
    desc: 'User can only view their own attendance, leave, profile, reports (1 workspace)',
    badge: 'Self'
  },
  {
    value: 'Branch Data Only',
    title: 'Branch Data Only',
    desc: 'User can view employees under the same branch only (1 workspace)',
    badge: 'Branch'
  },
  {
    value: 'Company Staff Data',
    title: 'Company Staff Data',
    desc: 'User can view all employees within the same company (1 company workspace, no dropdown)',
    badge: 'Company'
  },
  {
    value: 'Parent Group Data',
    title: 'Parent Group Data',
    desc: 'User can view multiple companies (can see all company workspaces with dropdown)',
    badge: 'Group HQ'
  }
];

const getRoleIcon = (roleName: string) => {
  const lower = (roleName || '').toLowerCase();
  if (lower.includes('employee') || lower.includes('staff') || lower.includes('driver')) return User;
  if (lower.includes('branch leader') || lower.includes('branch manager') || lower.includes('supervisor')) return Users;
  if (lower.includes('head of department') || lower.includes('hod')) return Briefcase;
  if (lower.includes('hr admin') || lower.includes('admin')) return ShieldCheck;
  if (lower.includes('managing director') || lower.includes('director') || lower.includes('ceo')) return Crown;
  if (lower.includes('operation manager') || lower.includes('operation')) return SettingsIcon;
  return Shield;
};

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

export const CompanyModuleManagement: React.FC = () => {
  const { companies, activeCompany, refreshCompanyModules } = useCompany();
  const { userName } = useRole();

  const [selectedCompanyId, setSelectedCompanyId] = useState<number>(activeCompany?.id || 1);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('all');
  const [modules, setModules] = useState<CompanyModuleSetting[]>([]);
  const [companyRoles, setCompanyRoles] = useState<CompanyRole[]>([]);
  const [mainCompanyRoles, setMainCompanyRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({});

  // Role-specific permission editing states
  const [rolePermissions, setRolePermissions] = useState<Set<string>>(new Set());
  const [rolePermissionLevels, setRolePermissionLevels] = useState<Record<string, 'view' | 'edit'>>({});
  const [roleScope, setRoleScope] = useState<string>('Own Data Only');
  const [copyCompanyId, setCopyCompanyId] = useState<number>(1);

  // Sync selected company when active company changes
  useEffect(() => {
    if (activeCompany?.id) {
      setSelectedCompanyId(activeCompany.id);
    }
  }, [activeCompany?.id]);

  // Load modules, target company roles, and main company template roles
  const loadData = async (companyId: number) => {
    try {
      setLoading(true);
      const [modRes, rolesRes, mainRolesRes] = await Promise.all([
        multiCompanyApi.getCompanyModules(companyId),
        multiCompanyApi.getCompanyRoles(companyId),
        fetch(`${API_BASE_URL}/api/roles`).then(r => r.json()).catch(() => ({ roles: [] }))
      ]);

      const loadedMods = modRes.modules || [];
      setModules(loadedMods);
      setCompanyRoles(rolesRes || []);
      setMainCompanyRoles(mainRolesRes.roles || []);
      setHasChanges(false);
      setIsEditing(false);
    } catch (err: any) {
      console.error('Error loading module data:', err);
      toast.error('Failed to load company module configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCompanyId) {
      setSelectedRoleId('all');
      setIsEditing(false);
      setHasChanges(false);
      void loadData(selectedCompanyId);
    }
  }, [selectedCompanyId]);

  // When selected role changes, initialize role permissions
  useEffect(() => {
    setIsEditing(false);
    if (selectedRoleId === 'all') {
      setRolePermissions(new Set());
      setRolePermissionLevels({});
    } else {
      const targetRole = companyRoles.find(r => r.id === selectedRoleId);
      if (targetRole) {
        const keys = targetRole.permission_keys || [];
        setRolePermissions(new Set(keys));
        setRoleScope(targetRole.scope_type || 'Own Data Only');
        const levels: Record<string, 'view' | 'edit'> = { ...(targetRole.permission_levels || {}) };
        keys.forEach(k => {
          if (!levels[k]) levels[k] = 'edit';
        });
        setRolePermissionLevels(levels);
      }
    }
    setHasChanges(false);
  }, [selectedRoleId, companyRoles]);

  const currentCompany = companies.find(c => c.id === selectedCompanyId) || activeCompany;
  const isMainCompany = currentCompany?.company_type === 'main';

  // Toggle module collapse
  const toggleCollapse = (moduleKey: string) => {
    setCollapsedModules(prev => ({ ...prev, [moduleKey]: !prev[moduleKey] }));
  };

  const handleToggleAllCollapse = (expand: boolean) => {
    const next: Record<string, boolean> = {};
    modules.forEach(m => { next[m.module_key] = !expand; });
    setCollapsedModules(next);
  };

  // Check if submodule is active
  const isSubmoduleActive = (moduleKey: string, permKey: string): boolean => {
    if (selectedRoleId !== 'all') {
      return rolePermissions.has(permKey);
    }
    const mod = modules.find(m => m.module_key === moduleKey);
    if (!mod || !mod.is_enabled) return false;
    if (!mod.enabled_permissions || mod.enabled_permissions.length === 0) return true;
    return mod.enabled_permissions.includes(permKey);
  };

  // Get submodule level
  const getSubmoduleLevel = (moduleKey: string, permKey: string): 'view' | 'edit' => {
    if (selectedRoleId !== 'all') {
      return rolePermissionLevels[permKey] || 'edit';
    }
    const mod = modules.find(m => m.module_key === moduleKey);
    return mod?.permission_levels?.[permKey] || 'edit';
  };

  // Toggle individual submodule
  const handleToggleSubmodule = (moduleKey: string, permKey: string) => {
    setHasChanges(true);

    if (selectedRoleId !== 'all') {
      setRolePermissions(prev => {
        const next = new Set(prev);
        if (next.has(permKey)) next.delete(permKey);
        else next.add(permKey);
        return next;
      });
      setRolePermissionLevels(prev => ({
        ...prev,
        [permKey]: prev[permKey] || 'edit'
      }));
      return;
    }

    // Company Master Mode
    setModules(prev =>
      prev.map(m => {
        if (m.module_key !== moduleKey) return m;
        const allPermKeys = (m.permissions || []).map(p => p.permission_key);
        const currentEnabled = m.enabled_permissions && m.enabled_permissions.length > 0
          ? [...m.enabled_permissions]
          : [...allPermKeys];

        let nextEnabled: string[];
        if (currentEnabled.includes(permKey)) {
          nextEnabled = currentEnabled.filter(k => k !== permKey);
        } else {
          nextEnabled = [...currentEnabled, permKey];
        }

        return {
          ...m,
          is_enabled: nextEnabled.length > 0,
          enabled_permissions: nextEnabled
        };
      })
    );
  };

  // Set explicit View | Edit level
  const handleSetSubmoduleLevel = (moduleKey: string, permKey: string, level: 'view' | 'edit') => {
    setHasChanges(true);

    if (selectedRoleId !== 'all') {
      setRolePermissions(prev => new Set(prev).add(permKey));
      setRolePermissionLevels(prev => ({
        ...prev,
        [permKey]: level
      }));
      return;
    }

    // Company Master Mode
    setModules(prev =>
      prev.map(m => {
        if (m.module_key !== moduleKey) return m;
        const currentLevels = { ...(m.permission_levels || {}) };
        currentLevels[permKey] = level;
        return {
          ...m,
          permission_levels: currentLevels
        };
      })
    );
  };

  // Toggle whole module (all submodules in that card)
  const handleToggleModuleAll = (moduleKey: string) => {
    setHasChanges(true);
    const targetMod = modules.find(m => m.module_key === moduleKey);
    if (!targetMod) return;
    const modPermKeys = (targetMod.permissions || []).map(p => p.permission_key);

    if (selectedRoleId !== 'all') {
      const allSelected = modPermKeys.every(k => rolePermissions.has(k));
      setRolePermissions(prev => {
        const next = new Set(prev);
        modPermKeys.forEach(k => {
          if (allSelected) next.delete(k);
          else next.add(k);
        });
        return next;
      });
      return;
    }

    // Company Master Mode
    const currentlyActive = targetMod.is_enabled && (!targetMod.enabled_permissions || targetMod.enabled_permissions.length === modPermKeys.length);
    setModules(prev =>
      prev.map(m => {
        if (m.module_key !== moduleKey) return m;
        if (currentlyActive) {
          return {
            ...m,
            is_enabled: false,
            enabled_permissions: []
          };
        } else {
          return {
            ...m,
            is_enabled: true,
            enabled_permissions: [...modPermKeys]
          };
        }
      })
    );
  };

  // Global Select All / Clear All
  const handleGlobalToggle = (select: boolean) => {
    setHasChanges(true);

    if (selectedRoleId !== 'all') {
      if (select) {
        const allKeys = modules
          .filter(m => m.is_enabled)
          .flatMap(m => (m.permissions || []).map(p => p.permission_key));
        setRolePermissions(new Set(allKeys));
      } else {
        setRolePermissions(new Set());
      }
      return;
    }

    // Company Master Mode
    setModules(prev =>
      prev.map(m => {
        const allKeys = (m.permissions || []).map(p => p.permission_key);
        return {
          ...m,
          is_enabled: select,
          enabled_permissions: select ? [...allKeys] : []
        };
      })
    );
  };

  // Copy Permissions From Main Company Role
  const handleCopyFromMainRole = (templateName: string) => {
    if (!templateName || templateName === 'none') return;
    const mainRole = mainCompanyRoles.find(r => r.name.toLowerCase() === templateName.toLowerCase()) || companyRoles.find(r => r.name.toLowerCase() === templateName.toLowerCase());
    if (!mainRole) return;

    const sourceKeys: string[] = mainRole.permission_keys || [];
    const sourceLevels: Record<string, 'view' | 'edit'> = { ...(mainRole.permission_levels || {}) };

    // Filter to only modules that are active in this company
    const enabledCompanyPerms = new Set(
      modules.filter(m => m.is_enabled).flatMap(m => (m.permissions || []).map(p => p.permission_key))
    );

    const filteredKeys = sourceKeys.filter(k => enabledCompanyPerms.has(k));
    const nextLevels: Record<string, 'view' | 'edit'> = {};
    filteredKeys.forEach(k => {
      nextLevels[k] = sourceLevels[k] || 'edit';
    });

    setRolePermissions(new Set(filteredKeys));
    setRolePermissionLevels(nextLevels);

    // Auto-update Authorization Scope
    const lowerName = mainRole.name.toLowerCase();
    let autoScope = 'Own Data Only';
    if (mainRole.scope_type === 'Own Data Only') autoScope = 'Own Data Only';
    else if (mainRole.scope_type === 'Branch Data Only') autoScope = 'Branch Data Only';
    else if (mainRole.scope_type === 'Company Staff Data') autoScope = 'Company Staff Data';
    else if (mainRole.scope_type === 'Parent Group Data') autoScope = 'Parent Group Data';
    else if (lowerName.includes('employee') || lowerName.includes('staff') || lowerName.includes('driver')) autoScope = 'Own Data Only';
    else if (lowerName.includes('branch leader') || lowerName.includes('branch manager') || lowerName.includes('head of department') || lowerName.includes('hod')) autoScope = 'Branch Data Only';
    else if (lowerName.includes('hr admin') || lowerName.includes('operation manager')) autoScope = 'Company Staff Data';
    else if (lowerName.includes('managing director') || lowerName.includes('director')) autoScope = 'Parent Group Data';

    setRoleScope(autoScope);
    setHasChanges(true);
    toast.success(`Copied ${filteredKeys.length} permissions from (${mainRole.name}). Authorization Scope auto-updated to: ${autoScope}`);
  };

  // Save changes
  const handleSave = async () => {
    try {
      setSaving(true);

      if (selectedRoleId !== 'all') {
        const targetRole = companyRoles.find(r => r.id === selectedRoleId);
        if (!targetRole) throw new Error('Selected role not found');

        const payload = {
          role_name: targetRole.name,
          name: targetRole.name,
          description: targetRole.description || '',
          role_type: targetRole.role_type || 'Operational Role',
          scope_type: roleScope,
          permissions: Array.from(rolePermissions),
          permission_levels: rolePermissionLevels,
          company_id: selectedCompanyId
        };

        await multiCompanyApi.updateRole(targetRole.id, payload);
        toast.success(`Permissions for role "${targetRole.name}" saved successfully!`);
        
        // Notify application of scope update in real-time
        try {
          sessionStorage.setItem("presence_cached_scope_type", roleScope);
          window.dispatchEvent(new CustomEvent('rayhar_role_scope_updated', { 
            detail: { role_name: targetRole.name, scope_type: roleScope } 
          }));
        } catch (e) {}

        setHasChanges(false);
        setIsEditing(false);
        await loadData(selectedCompanyId);
      } else {
        const payload = modules.map(m => ({
          module_key: m.module_key,
          is_enabled: m.is_enabled,
          enabled_permissions: m.enabled_permissions || (m.permissions || []).map(p => p.permission_key),
          permission_levels: m.permission_levels || {}
        }));

        await multiCompanyApi.saveCompanyModules(
          selectedCompanyId, 
          payload, 
          userName || 'HR Administrator'
        );

        setHasChanges(false);
        setIsEditing(false);
        toast.success(`Module configuration for ${currentCompany?.company_name || 'company'} saved successfully!`);
        await refreshCompanyModules();
        await loadData(selectedCompanyId);
      }
    } catch (err: any) {
      console.error('Error saving module configuration:', err);
      toast.error(err.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  // Counts
  const totalSubmodules = useMemo(() => {
    return modules.reduce((acc, m) => acc + (m.permissions?.length || 0), 0);
  }, [modules]);

  const activeSubmodulesCount = useMemo(() => {
    if (selectedRoleId !== 'all') return rolePermissions.size;
    return modules.reduce((acc, m) => {
      if (!m.is_enabled) return acc;
      const count = m.enabled_permissions ? m.enabled_permissions.length : (m.permissions?.length || 0);
      return acc + count;
    }, 0);
  }, [modules, selectedRoleId, rolePermissions]);

  const activeModulesCount = useMemo(() => {
    return modules.filter(m => {
      if (selectedRoleId !== 'all') {
        return (m.permissions || []).some(p => rolePermissions.has(p.permission_key));
      }
      return m.is_enabled;
    }).length;
  }, [modules, selectedRoleId, rolePermissions]);

  const currentScope = useMemo(() => {
    return AUTHORIZATION_SCOPES.find(s => s.value === roleScope) || AUTHORIZATION_SCOPES[0];
  }, [roleScope]);

  return (
    <div className="space-y-6">
      {/* Top Filter & Actions Bar - In One Line */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3.5 bg-muted/30 dark:bg-neutral-900/40 rounded-xl border border-border dark:border-neutral-800">
        <div className="flex flex-wrap items-center gap-4">
          {/* Target Entity Selector */}
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#942392]" />
            <span className="text-[11px] font-black uppercase tracking-wider text-black dark:text-white whitespace-nowrap">
              Target Entity:
            </span>
            <Select 
              value={String(selectedCompanyId)} 
              onValueChange={(val) => setSelectedCompanyId(parseInt(val, 10))}
            >
              <SelectTrigger className="w-[230px] h-9 rounded-xl font-bold text-xs bg-background dark:bg-neutral-900 border-border text-black dark:text-white shadow-2xs">
                <SelectValue placeholder="Select Company" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {companies.map(c => (
                  <SelectItem key={c.id} value={String(c.id)} className="font-bold text-xs">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-[#942392]" />
                      <span>{c.company_name}</span>
                      {c.company_type === 'main' && (
                        <span className="text-[9px] bg-purple-100 text-[#942392] px-1.5 py-0.2 rounded font-extrabold uppercase">HQ</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Role Selector */}
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#942392]" />
            <span className="text-[11px] font-black uppercase tracking-wider text-black dark:text-white whitespace-nowrap">
              Role:
            </span>
            <Select 
              value={selectedRoleId} 
              onValueChange={setSelectedRoleId}
            >
              <SelectTrigger className="w-[230px] h-9 rounded-xl font-bold text-xs bg-background dark:bg-neutral-900 border-border text-black dark:text-white shadow-2xs">
                <SelectValue placeholder="All Company Modules" />
              </SelectTrigger>
              <SelectContent className="rounded-xl max-h-64">
                <SelectItem value="all" className="font-bold text-xs">
                  All Modules (Company Master)
                </SelectItem>
                {companyRoles.length > 0 && (
                  <div className="px-2 py-1 text-[10px] font-black uppercase text-muted-foreground tracking-wider">
                    Company Roles
                  </div>
                )}
                {companyRoles.map(r => (
                  <SelectItem key={r.id} value={r.id} className="font-semibold text-xs">
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Edit / Cancel and Save Buttons */}
        <div className="flex items-center gap-2.5 shrink-0 self-end lg:self-auto">
          {!isEditing ? (
            <Button
              type="button"
              onClick={() => setIsEditing(true)}
              className="h-9 px-4 rounded-xl font-black text-[11px] uppercase tracking-wider shadow-xs flex items-center justify-center gap-2 border border-slate-300 dark:border-slate-700 bg-white hover:bg-slate-50 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-slate-800 dark:text-slate-100 cursor-pointer transition active:scale-95"
            >
              <Edit className="w-3.5 h-3.5 text-[#942392]" />
              <span>Edit Configuration</span>
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setHasChanges(false);
                void loadData(selectedCompanyId);
              }}
              className="h-9 px-3.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-xs flex items-center justify-center gap-1.5 border border-slate-300 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-700 dark:text-slate-200 cursor-pointer transition active:scale-95"
            >
              <X className="w-3.5 h-3.5 text-slate-500" />
              <span>Cancel Edit</span>
            </Button>
          )}

          <Button
            type="button"
            onClick={handleSave}
            disabled={!isEditing || !hasChanges || saving}
            className="h-9 px-5 rounded-xl font-black text-[11px] uppercase tracking-wider shadow-md flex items-center justify-center gap-2 bg-[#942392] hover:bg-[#800A7A] text-white cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5 text-white" />
                <span>Save Configuration</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Module Overview Sub-Banner & Controls */}
      <Card className="border border-border dark:border-neutral-800 shadow-xs bg-white dark:bg-card p-5 rounded-2xl">
        {/* Entity / Role Sub-Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-sm font-bold text-black dark:text-white">{currentCompany?.company_name}</span>
            <span className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-bold border ${
              isMainCompany 
                ? 'border-[#942392]/30 bg-[#942392]/10 text-[#942392] dark:text-[#f885d5]' 
                : 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
            }`}>
              {isMainCompany ? 'Main Parent Company' : 'Subsidiary Company'}
            </span>

            <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold border ${
              isEditing 
                ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300' 
                : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}>
              {isEditing ? <Edit className="w-3.5 h-3.5 text-amber-600" /> : <Eye className="w-3.5 h-3.5 text-slate-500" />}
              {isEditing ? 'Edit Mode' : 'Overview (Read-Only)'}
            </span>

            {selectedRoleId !== 'all' && (
              <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-bold border border-purple-300 dark:border-purple-700 bg-purple-100/60 dark:bg-purple-950/60 text-[#942392] dark:text-purple-300">
                <ShieldCheck className="w-3.5 h-3.5" />
                Configuring Role: {companyRoles.find(r => r.id === selectedRoleId)?.name}
              </span>
            )}

            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground text-xs">
              <strong className="text-black dark:text-white font-bold">{activeModulesCount}</strong> of <strong>{modules.length}</strong> modules active
              {' '}(<strong className="text-black dark:text-white font-bold">{activeSubmodulesCount}</strong> of <strong>{totalSubmodules}</strong> submodules)
            </span>
          </div>

          {/* Right: Bulk action pills (Select All, Clear All, Expand All) */}
          <div className="flex items-center gap-2">
            {isEditing && (
              <>
                <button
                  type="button"
                  onClick={() => handleGlobalToggle(true)}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border border-slate-300 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition cursor-pointer shadow-2xs active:scale-95"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => handleGlobalToggle(false)}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border border-slate-300 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer shadow-2xs active:scale-95"
                >
                  Clear All
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => {
                const anyOpen = Object.values(collapsedModules).some(v => !v);
                handleToggleAllCollapse(!anyOpen);
              }}
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border border-slate-300 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition cursor-pointer shadow-2xs active:scale-95"
            >
              Expand All
            </button>
          </div>
        </div>

        {/* Dedicated Role Configuration Toolbar: Scope & Template Copy (when Editing a Role) */}
        {isEditing && selectedRoleId !== 'all' && (
          <div className="pt-3.5 mt-3.5 border-t border-border/70 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-4">
              {/* Authorization Data Scope Selector */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-black dark:text-white flex items-center gap-1.5 whitespace-nowrap">
                  <ShieldCheck className="w-4 h-4 text-[#942392]" />
                  Data Scope:
                </span>
                <Select 
                  value={roleScope} 
                  onValueChange={(val) => { 
                    setRoleScope(val); 
                    setHasChanges(true); 
                  }}
                >
                  <SelectTrigger 
                    className="h-9 min-w-[260px] max-w-sm px-3.5 rounded-xl font-bold text-xs bg-background dark:bg-neutral-900 border-border text-foreground shadow-2xs hover:border-[#942392]/50 transition-colors"
                    title={currentScope ? `${currentScope.title} (${currentScope.badge}) - ${currentScope.desc}` : undefined}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-2 h-2 rounded-full bg-[#942392] shrink-0" />
                      <span className="font-extrabold text-xs text-foreground truncate">
                        {currentScope?.title || roleScope}
                      </span>
                      {currentScope?.badge && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#942392]/10 dark:bg-[#942392]/25 text-[#942392] dark:text-[#f885d5] font-black uppercase tracking-wider shrink-0">
                          {currentScope.badge}
                        </span>
                      )}
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl w-[360px] max-w-md p-1.5 shadow-xl border border-border">
                    <div className="px-3 py-2 text-[10px] font-black uppercase text-muted-foreground tracking-wider border-b border-border/60 mb-1">
                      🛡️ Granular Authorization Access Scope
                    </div>
                    {AUTHORIZATION_SCOPES.map(s => (
                      <SelectItem key={s.value} value={s.value} className="py-2.5 px-3 rounded-xl cursor-pointer">
                        <div className="flex flex-col items-start gap-1 text-left">
                          <span className="font-black text-xs text-foreground flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#942392]" />
                            <span>{s.title}</span>
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-[#942392] dark:text-[#f885d5] font-extrabold uppercase">
                              {s.badge}
                            </span>
                          </span>
                          <span className="text-[11px] text-muted-foreground font-medium pl-4 leading-snug">
                            - {s.desc}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Copy From Main Company Role Template */}
              {mainCompanyRoles.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-black dark:text-white flex items-center gap-1.5 whitespace-nowrap">
                    <Sparkles className="w-4 h-4 text-[#942392]" />
                    Copy Template:
                  </span>
                  <Select onValueChange={handleCopyFromMainRole}>
                    <SelectTrigger className="h-9 min-w-[240px] px-3.5 rounded-xl font-bold text-xs bg-background dark:bg-neutral-900 border-border text-foreground shadow-2xs hover:border-[#942392]/50 transition-colors">
                      <div className="flex items-center gap-2 truncate">
                        <Sparkles className="w-3.5 h-3.5 text-[#942392] shrink-0" />
                        <SelectValue placeholder="Copy Permissions From..." />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl max-h-60 w-[300px] p-1.5 shadow-xl border border-border">
                      <div className="px-3 py-2 text-[10px] font-black uppercase text-muted-foreground tracking-wider border-b border-border/60 mb-1">
                        🏛️ Main Company Roles (Template)
                      </div>
                      {mainCompanyRoles.map(mr => {
                        const RoleIcon = getRoleIcon(mr.name);
                        return (
                          <SelectItem key={mr.id} value={mr.name} className="text-xs font-bold py-2 px-3 rounded-xl">
                            <div className="flex items-center justify-between w-full gap-2">
                              <div className="flex items-center gap-2 truncate">
                                <RoleIcon className="w-3.5 h-3.5 text-[#942392] shrink-0" />
                                <span className="truncate">{mr.name}</span>
                              </div>
                              <span className="text-[10px] text-muted-foreground font-semibold shrink-0 bg-muted px-2 py-0.5 rounded-md">
                                {mr.permission_keys ? mr.permission_keys.length : 0} perms
                              </span>
                            </div>
                          </SelectItem>
                        );
                      })}
                      {companyRoles.filter(cr => cr.id !== selectedRoleId && !mainCompanyRoles.some(mr => mr.name.toLowerCase() === cr.name.toLowerCase())).length > 0 && (
                        <>
                          <div className="px-3 py-2 text-[10px] font-black uppercase text-muted-foreground tracking-wider border-b border-border/60 my-1">
                            🏢 Current Company Roles
                          </div>
                          {companyRoles.filter(cr => cr.id !== selectedRoleId && !mainCompanyRoles.some(mr => mr.name.toLowerCase() === cr.name.toLowerCase())).map(cr => {
                            const RoleIcon = getRoleIcon(cr.name);
                            return (
                              <SelectItem key={cr.id} value={cr.name} className="text-xs font-bold py-2 px-3 rounded-xl">
                                <div className="flex items-center justify-between w-full gap-2">
                                  <div className="flex items-center gap-2 truncate">
                                    <RoleIcon className="w-3.5 h-3.5 text-[#942392] shrink-0" />
                                    <span className="truncate">{cr.name}</span>
                                  </div>
                                  <span className="text-[10px] text-muted-foreground font-semibold shrink-0 bg-muted px-2 py-0.5 rounded-md">
                                    {cr.permission_keys ? cr.permission_keys.length : 0} perms
                                  </span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Scope quick explanation hint badge */}
            {currentScope && (
              <div className="hidden xl:flex items-center gap-2 text-[11px] text-muted-foreground font-medium bg-muted/40 dark:bg-neutral-800/40 px-3.5 py-1.5 rounded-xl border border-border/50">
                <Info className="w-3.5 h-3.5 text-[#942392] shrink-0" />
                <span>Scope Rule: <strong className="text-foreground font-bold">{currentScope.desc}</strong></span>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 space-y-3">
          <Loader2 className="w-8 h-8 text-[#942392] animate-spin" />
          <p className="text-xs font-black text-black dark:text-white uppercase tracking-wider">Loading company module matrix...</p>
        </div>
      ) : (
        /* 2-Column Responsive Card Grid (Matching /master/role exactly) */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {modules.map(mod => {
            const IconComponent = MODULE_ICONS[mod.module_key] || Boxes;
            const perms: ModulePermission[] = mod.permissions || [];
            const isCollapsed = collapsedModules[mod.module_key];

            const activeInModCount = perms.filter(p => isSubmoduleActive(mod.module_key, p.permission_key)).length;
            const allChecked = perms.length > 0 && activeInModCount === perms.length;
            const someChecked = activeInModCount > 0 && !allChecked;

            return (
              <div
                key={mod.module_key}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  activeInModCount > 0
                    ? 'border-border dark:border-neutral-800 bg-card shadow-xs'
                    : 'border-border/40 dark:border-neutral-900 bg-muted/20 opacity-75'
                }`}
              >
                {/* Module Header Bar - Soft Purple Theme */}
                <div className="p-3.5 bg-[#942392]/10 dark:bg-[#942392]/20 border-b border-purple-200/80 dark:border-purple-800/60 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Module Checkbox - Only in Edit Mode */}
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => handleToggleModuleAll(mod.module_key)}
                        className="text-[#942392] hover:opacity-80 transition-opacity shrink-0 cursor-pointer"
                        title={allChecked ? "Deselect all submodules" : "Select all submodules"}
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
                          <div className="w-5 h-5 border-2 border-purple-300 dark:border-purple-700 hover:border-[#942392] bg-background rounded transition-colors" />
                        )}
                      </button>
                    )}

                    <div className="p-1.5 rounded-xl bg-white dark:bg-neutral-900 text-[#942392] shrink-0 border border-purple-200/80 dark:border-purple-800/60 shadow-2xs">
                      <IconComponent className="w-4 h-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-[11px] font-black uppercase tracking-wider text-black dark:text-white truncate">
                          {mod.module_name}
                        </h3>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          activeInModCount > 0
                            ? 'border-emerald-300 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                            : 'border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800 text-neutral-500'
                        }`}>
                          {activeInModCount > 0 ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#942392] dark:text-purple-300 font-bold">
                        {activeInModCount} of {perms.length} active
                      </span>
                    </div>
                  </div>

                  {/* Expand / Collapse Chevron */}
                  <button
                    type="button"
                    onClick={() => toggleCollapse(mod.module_key)}
                    className="p-1.5 hover:bg-[#942392]/10 rounded-lg text-black dark:text-white transition-colors shrink-0"
                    title={isCollapsed ? "Expand module" : "Collapse module"}
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Submodule Checklist Body */}
                {!isCollapsed && (
                  <div className="p-3.5 space-y-2 bg-background/50">
                    <p className="text-xs text-muted-foreground pb-1">
                      {mod.description || 'Module features and operational access for this company entity.'}
                    </p>

                    <div className="space-y-2">
                      {perms.map(p => {
                        const isChecked = isSubmoduleActive(mod.module_key, p.permission_key);
                        const currentLevel = getSubmoduleLevel(mod.module_key, p.permission_key);

                        return (
                          <div
                            key={p.id}
                            onClick={isEditing ? () => handleToggleSubmodule(mod.module_key, p.permission_key) : undefined}
                            className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border transition-all ${
                              isEditing ? 'cursor-pointer' : 'cursor-default'
                            } ${
                              isChecked
                                ? 'bg-[#942392]/5 border-[#942392]/25 dark:bg-[#942392]/10'
                                : 'hover:bg-muted/40 border-border/40 opacity-70'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              {/* Submodule Checkbox - Only in Edit Mode */}
                              {isEditing && (
                                <div
                                  className={`w-4 h-4 rounded flex items-center justify-center transition-all border shrink-0 ${
                                    isChecked
                                      ? 'bg-[#942392] border-[#942392] text-white shadow-2xs'
                                      : 'border-gray-300 dark:border-gray-600 bg-background hover:border-[#942392]'
                                  }`}
                                >
                                  {isChecked && <Check className="w-3 h-3 text-white stroke-[3.5]" />}
                                </div>
                              )}

                              <div className="flex items-center gap-2 truncate">
                                <span className={`text-xs font-bold leading-tight truncate ${
                                  isChecked ? 'text-black dark:text-white' : 'text-muted-foreground'
                                }`}>
                                  {p.display_name}
                                </span>
                                {mod.module_key === 'analytics' && (
                                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider shrink-0 ${
                                    p.permission_key === 'analytics.employee'
                                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/40'
                                      : 'bg-purple-100 text-[#942392] dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/50'
                                  }`}>
                                    {p.permission_key === 'analytics.employee' ? 'Personal (Own Data)' : 'Workforce Analytics'}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Granular View | Edit Segmented Control (in Edit Mode) or Tag Badge (in Overview Mode) */}
                            <div 
                              className="flex items-center gap-1.5 shrink-0" 
                              onClick={(e) => isEditing && e.stopPropagation()}
                            >
                              {isEditing ? (
                                <div className="inline-flex items-center p-0.5 rounded-full bg-muted/80 dark:bg-neutral-800 border border-border/70 shadow-2xs">
                                  <button
                                    type="button"
                                    onClick={() => handleSetSubmoduleLevel(mod.module_key, p.permission_key, 'view')}
                                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
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
                                    onClick={() => handleSetSubmoduleLevel(mod.module_key, p.permission_key, 'edit')}
                                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
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
                              ) : (
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                  isChecked
                                    ? currentLevel === 'edit'
                                      ? 'border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 text-[#942392] dark:text-purple-300'
                                      : 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                                    : 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/40 text-slate-400'
                                }`}>
                                  {isChecked ? (currentLevel === 'edit' ? 'Edit Access' : 'View Only') : 'Disabled'}
                                </span>
                              )}

                              <span className="hidden sm:inline text-[9px] font-mono text-muted-foreground/60">
                                {p.permission_key}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CompanyModuleManagement;
