import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
  Settings, 
  Check, 
  Save, 
  Building2, 
  ShieldCheck, 
  Sparkles,
  Info,
  CheckCircle2,
  XCircle,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { useCompany } from '@/modules/multi-company/contexts/CompanyContext';
import { multiCompanyApi } from '@/modules/multi-company/services/multiCompanyApi';
import { CompanyModuleSetting } from '@/modules/multi-company/types/multiCompany.types';
import { useRole } from '@/contexts/RoleContext';

// Icon mapping helper
const MODULE_ICONS: Record<string, React.ElementType> = {
  dashboard: LayoutDashboard,
  calendar: Calendar,
  attendance: Clock,
  leave_management: CalendarDays,
  leave_admin: ClipboardList,
  employee_management: Users,
  outstation: Plane,
  analytics: PieChart,
  reports: FileSearch,
  gps: MapPinned,
  settings: Settings,
};

export const CompanyModuleManagement: React.FC = () => {
  const { companies, activeCompany, refreshCompanyModules } = useCompany();
  const { userName, role } = useRole();

  const [selectedCompanyId, setSelectedCompanyId] = useState<number>(activeCompany?.id || 1);
  const [modules, setModules] = useState<CompanyModuleSetting[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [hasChanges, setHasChanges] = useState<boolean>(false);

  // Sync selected company when active company changes
  useEffect(() => {
    if (activeCompany?.id) {
      setSelectedCompanyId(activeCompany.id);
    }
  }, [activeCompany?.id]);

  // Fetch company modules
  const fetchModules = async (companyId: number) => {
    try {
      setLoading(true);
      const res = await multiCompanyApi.getCompanyModules(companyId);
      setModules(res.modules || []);
      setHasChanges(false);
    } catch (err: any) {
      console.error('Error loading company modules:', err);
      toast.error('Failed to load company module configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCompanyId) {
      void fetchModules(selectedCompanyId);
    }
  }, [selectedCompanyId]);

  const currentCompany = companies.find(c => c.id === selectedCompanyId) || activeCompany;
  const isMainCompany = currentCompany?.company_type === 'main';

  // Toggle single module
  const handleToggleModule = (moduleKey: string) => {
    setModules(prev =>
      prev.map(m => {
        if (m.module_key === moduleKey) {
          return { ...m, is_enabled: !m.is_enabled };
        }
        return m;
      })
    );
    setHasChanges(true);
  };

  // Enable all
  const handleEnableAll = () => {
    setModules(prev => prev.map(m => ({ ...m, is_enabled: true })));
    setHasChanges(true);
  };

  // Disable optional modules (keep Settings & Dashboard recommended)
  const handleDisableAll = () => {
    setModules(prev =>
      prev.map(m => {
        // Keep core Dashboard & Settings enabled for minimal operation
        if (m.module_key === 'dashboard' || m.module_key === 'settings') {
          return { ...m, is_enabled: true };
        }
        return { ...m, is_enabled: false };
      })
    );
    setHasChanges(true);
  };

  // Save changes
  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = modules.map(m => ({
        module_key: m.module_key,
        is_enabled: m.is_enabled
      }));

      await multiCompanyApi.saveCompanyModules(
        selectedCompanyId, 
        payload, 
        userName || 'HR Administrator'
      );

      setHasChanges(false);
      toast.success(`Module configuration for ${currentCompany?.company_name || 'company'} saved successfully!`);
      
      // Refresh global context so sidebar and permissions update dynamically
      await refreshCompanyModules();
    } catch (err: any) {
      console.error('Error saving company modules:', err);
      toast.error(err.message || 'Failed to save module configuration');
    } finally {
      setSaving(false);
    }
  };

  const enabledCount = modules.filter(m => m.is_enabled).length;

  return (
    <div className="space-y-6">
      {/* Top Banner / Company Selector Bar */}
      <Card className="border border-border dark:border-neutral-800 shadow-xs bg-white dark:bg-card p-5 rounded-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#942392]/10 border border-[#942392]/20 flex items-center justify-center shrink-0">
              <Boxes className="w-6 h-6 text-[#942392]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black uppercase tracking-wider text-foreground">
                  Company Module Management
                </h2>
                <Badge className="bg-[#942392]/10 text-[#942392] border-none font-bold text-[10px] px-2 py-0.5">
                  Multi-Tenant RBAC
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Configure which operational modules and features are enabled per company entity
              </p>
            </div>
          </div>

          {/* Company Switcher */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                Target Entity:
              </span>
              <Select 
                value={String(selectedCompanyId)} 
                onValueChange={(val) => setSelectedCompanyId(parseInt(val, 10))}
              >
                <SelectTrigger className="w-[230px] h-10 rounded-xl font-bold text-xs bg-muted/40 border-border">
                  <SelectValue placeholder="Select Company" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {companies.map(c => (
                    <SelectItem key={c.id} value={String(c.id)} className="font-semibold text-xs">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
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

            {/* Save Button */}
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className={`h-10 px-5 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-sm flex items-center gap-2 ${
                hasChanges
                  ? 'bg-[#942392] hover:bg-[#942392]/90 text-white shadow-[#942392]/20 animate-pulse'
                  : 'bg-muted text-muted-foreground hover:bg-muted'
              }`}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Configuration</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Entity Status Indicator Banner */}
        <div className="mt-4 pt-4 border-t border-border/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-foreground">{currentCompany?.company_name}</span>
            <Badge variant="outline" className={`text-[10px] font-bold uppercase ${
              isMainCompany ? 'border-[#942392] text-[#942392] bg-[#942392]/5' : 'border-blue-500 text-blue-600 bg-blue-50/50'
            }`}>
              {isMainCompany ? 'Main Parent Company' : 'Subsidiary Company'}
            </Badge>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">{enabledCount}</strong> of <strong>{modules.length}</strong> modules active
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleEnableAll}
              className="text-[11px] font-bold text-[#942392] hover:underline"
            >
              Enable All
            </button>
            <span className="text-muted-foreground/40">•</span>
            <button
              type="button"
              onClick={handleDisableAll}
              className="text-[11px] font-bold text-muted-foreground hover:text-foreground hover:underline"
            >
              Clear Optional
            </button>
          </div>
        </div>
      </Card>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 space-y-3">
          <Loader2 className="w-8 h-8 text-[#942392] animate-spin" />
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Loading company modules...</p>
        </div>
      ) : (
        /* 2-Column Responsive Card Grid (matching Role management style) */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {modules.map(mod => {
            const IconComponent = MODULE_ICONS[mod.module_key] || Boxes;
            const isEnabled = mod.is_enabled;
            const perms = mod.permissions || [];

            return (
              <div
                key={mod.module_key}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isEnabled
                    ? 'border-border/80 dark:border-neutral-800 bg-card shadow-xs'
                    : 'border-border/40 dark:border-neutral-900 bg-muted/20 opacity-75'
                }`}
              >
                {/* Card Header */}
                <div className={`p-4 flex items-center justify-between border-b ${
                  isEnabled
                    ? 'bg-muted/30 dark:bg-neutral-800/40 border-border/60 dark:border-neutral-800'
                    : 'bg-muted/10 border-border/30 dark:border-neutral-900'
                }`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      isEnabled
                        ? 'bg-[#942392]/10 text-[#942392] border border-[#942392]/20'
                        : 'bg-muted text-muted-foreground border border-border/40'
                    }`}>
                      <IconComponent className="w-4 h-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-black uppercase tracking-wider text-foreground truncate">
                          {mod.module_name}
                        </h3>
                        <Badge
                          variant="outline"
                          className={`text-[9px] font-extrabold uppercase px-1.5 py-0 ${
                            isEnabled
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                              : 'bg-neutral-500/10 text-neutral-500 border-neutral-500/20'
                          }`}
                        >
                          {isEnabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {perms.length} features available
                      </span>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={() => handleToggleModule(mod.module_key)}
                      className="data-[state=checked]:bg-[#942392]"
                    />
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 space-y-3">
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {mod.description || 'Module features and operational access for this company entity.'}
                  </p>

                  {/* Child Features Checklist */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 block">
                      Included Features:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                      {perms.map(p => (
                        <div
                          key={p.id}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                            isEnabled
                              ? 'bg-muted/40 dark:bg-neutral-800/40 text-foreground border border-border/40'
                              : 'bg-muted/10 text-muted-foreground/60 border border-transparent line-through'
                          }`}
                        >
                          {isEnabled ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#942392] shrink-0" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                          )}
                          <span className="text-[11px] font-medium truncate">
                            {p.display_name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CompanyModuleManagement;
