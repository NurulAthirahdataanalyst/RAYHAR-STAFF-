import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Settings, 
  SlidersHorizontal, 
  UserPlus, 
  Building2, 
  MapPin, 
  Layers, 
  CalendarClock, 
  Clock, 
  FileCheck2, 
  ShieldCheck, 
  History,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
  Info,
  Building
} from 'lucide-react';
import { Tab1_SystemConfig } from './tabs/Tab1_SystemConfig';
import { Tab2_EmployeeConfig } from './tabs/Tab2_EmployeeConfig';
import { Tab3_CompanyMgmt } from './tabs/Tab3_CompanyMgmt';
import { Tab4_BranchLocationMgmt } from './tabs/Tab4_BranchLocationMgmt';
import { Tab5_DepartmentMgmt } from './tabs/Tab5_DepartmentMgmt';
import { Tab6_WorkScheduleMgmt } from './tabs/Tab6_WorkScheduleMgmt';
import { Tab7_AttendanceConfig } from './tabs/Tab7_AttendanceConfig';
import { Tab8_LeaveWorkflowConfig } from './tabs/Tab8_LeaveWorkflowConfig';
import { Tab9_IAM } from './tabs/Tab9_IAM';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useCompany } from '../../contexts/CompanyContext';
import { multiCompanyApi } from '../../services/multiCompanyApi';
import { AuditLogEntry } from '../../types/multiCompany.types';

export type SettingsTabId = 
  | 'system'
  | 'employee'
  | 'company'
  | 'branch'
  | 'department'
  | 'schedule'
  | 'attendance'
  | 'leave'
  | 'iam';

interface TabDefinition {
  id: SettingsTabId;
  label: string;
  badge?: string;
  icon: React.ElementType;
}

const SETTINGS_TABS: TabDefinition[] = [
  { id: 'system', label: '1. SYSTEM CONFIGURATION', icon: SlidersHorizontal },
  { id: 'employee', label: '2. PERSONNEL MANAGEMENT', icon: UserPlus },
  { id: 'company', label: '3. COMPANY MANAGEMENT', icon: Building2 },
  { id: 'branch', label: '4. BRANCH & LOCATION', icon: MapPin },
  { id: 'department', label: '5. DEPARTMENT MANAGEMENT', icon: Layers },
  { id: 'schedule', label: '6. WORK SCHEDULES', icon: CalendarClock },
  { id: 'attendance', label: '7. ATTENDANCE CONFIG', icon: Clock },
  { id: 'leave', label: '8. LEAVE & APPROVALS', icon: FileCheck2 },
  { id: 'iam', label: '9. IDENTITY & ACCESS (IAM)', icon: ShieldCheck },
];

export const SettingsLayout: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialTab = (searchParams.get('tab') as SettingsTabId) || 'system';
  const [activeTab, setActiveTab] = useState<SettingsTabId>(initialTab);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const { activeCompany } = useCompany();
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('settings_tabs_collapsed') === 'true';
    }
    return false;
  });

  const toggleCollapsed = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('settings_tabs_collapsed', String(next));
      return next;
    });
  };

  useEffect(() => {
    const tabParam = searchParams.get('tab') as SettingsTabId;
    if (tabParam && SETTINGS_TABS.some(t => t.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tabId: SettingsTabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  const openAuditLogs = async () => {
    setAuditModalOpen(true);
    setLoadingAudit(true);
    try {
      const logs = await multiCompanyApi.getAuditLogs(activeCompany?.id);
      setAuditLogs(logs);
    } catch (err) {
      console.error('Error loading audit logs:', err);
    } finally {
      setLoadingAudit(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 pb-16 w-full">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#942392] text-white flex items-center justify-center shadow-xs shrink-0">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground uppercase tracking-tight">Portal Configurations</h1>
            <p className="text-xs sm:text-sm text-foreground italic mt-0.5">
              Enterprise multi-company governance, branch geofencing, and centralized IAM roles
            </p>
          </div>
        </div>
        <button 
          onClick={openAuditLogs}
          className="flex items-center self-start sm:self-auto gap-2 px-4 py-2 bg-[#942392]/10 text-[#942392] hover:bg-[#942392]/15 border border-[#942392]/20 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-xs cursor-pointer"
        >
          <History className="w-3.5 h-3.5" />
          <span>View Audit Log</span>
        </button>
      </div>

      {/* 2-COLUMN ENTERPRISE LAYOUT: ASIDE TABS ON LEFT, ACTIVE CARD ON RIGHT */}
      <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
        {/* ASIDE NAVIGATION TABS (Collapsible, Rayhar Purple Gradient, Yellow Active Accent) */}
        <aside className={`w-full shrink-0 lg:sticky lg:top-4 z-10 transition-all duration-300 ${
          isCollapsed ? 'lg:w-20' : 'lg:w-64 xl:w-72'
        }`}>
          <div className="bg-gradient-to-b from-[#800A7A] via-[#942392] to-[#3d0052] p-2.5 sm:p-3 rounded-2xl shadow-lg border border-[#942392]/20 flex flex-row lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible scrollbar-none">
            {/* Header row with Title and Collapse/Expand Toggle */}
            <div className={`px-2 pt-1.5 pb-2 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} border-b border-white/15 mb-2`}>
              {!isCollapsed && (
                <span className="text-[10px] font-black tracking-widest uppercase text-white/80">
                  Configuration Tabs
                </span>
              )}
              <button
                type="button"
                onClick={toggleCollapsed}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer shadow-xs flex items-center justify-center"
                title={isCollapsed ? "Expand Tabs Bar" : "Collapse Tabs Bar"}
                aria-label={isCollapsed ? "Expand Tabs Bar" : "Collapse Tabs Bar"}
              >
                {isCollapsed ? (
                  <PanelLeftOpen className="w-4 h-4 text-white" />
                ) : (
                  <PanelLeftClose className="w-4 h-4 text-white" />
                )}
              </button>
            </div>

            {SETTINGS_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  title={isCollapsed ? tab.label : undefined}
                  className={`flex items-center ${
                    isCollapsed ? 'justify-center py-3 px-0' : 'gap-2.5 sm:gap-3 py-2.5 lg:py-3 px-3 sm:px-3.5'
                  } text-[9px] sm:text-[10px] font-black uppercase tracking-wider rounded-xl transition-all duration-300 text-left shrink-0 lg:shrink lg:w-full whitespace-nowrap lg:whitespace-normal group cursor-pointer ${
                    isActive 
                      ? "bg-[#ffff00] text-[#942392] shadow-md font-black" 
                      : "text-white/90 hover:text-white hover:bg-white/10 font-bold"
                  }`}
                >
                  <div className={`p-1.5 rounded-lg shrink-0 transition-colors ${
                    isActive ? "bg-[#942392]/10 text-[#942392]" : "bg-white/10 text-white/90 group-hover:text-white"
                  }`}>
                    <Icon className="w-4 h-4 shrink-0" />
                  </div>
                  {!isCollapsed && <span className="truncate">{tab.label}</span>}
                </button>
              );
            })}
          </div>
        </aside>

        {/* ACTIVE TAB CONTENTS */}
        <div className="flex-1 min-w-0 w-full space-y-4">
          {/* Forwarding Banner to New Organization & Entities Menu */}
          {['company', 'iam', 'branch', 'department'].includes(activeTab) && (
            <div className="p-3.5 bg-gradient-to-r from-[#800A7A]/10 via-[#942392]/15 to-transparent rounded-2xl border border-[#942392]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-[#942392] text-white shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-black text-black dark:text-white uppercase tracking-wider block">
                    Now available in dedicated "Organization & Entities" module
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Corporate entities, company roles, branches, and verified employee transfers can now be managed directly in the dedicated module.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/organization')}
                className="bg-[#942392] hover:bg-[#800A7A] text-white font-black text-xs uppercase tracking-wider h-8 px-4 rounded-xl shrink-0 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer self-start sm:self-auto"
              >
                <span>Open Organization & Entities</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {activeTab === 'system' && <Tab1_SystemConfig />}
          {activeTab === 'employee' && <Tab2_EmployeeConfig />}
          {activeTab === 'company' && <Tab3_CompanyMgmt onNavigateToTab={(t) => handleTabChange(t as SettingsTabId)} />}
          {activeTab === 'branch' && <Tab4_BranchLocationMgmt />}
          {activeTab === 'department' && <Tab5_DepartmentMgmt />}
          {activeTab === 'schedule' && <Tab6_WorkScheduleMgmt />}
          {activeTab === 'attendance' && <Tab7_AttendanceConfig />}
          {activeTab === 'leave' && <Tab8_LeaveWorkflowConfig />}
          {activeTab === 'iam' && <Tab9_IAM />}
        </div>
      </div>

      {/* AUDIT LOG MODAL */}
      <Dialog open={auditModalOpen} onOpenChange={setAuditModalOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col bg-card dark:bg-neutral-900 border border-border dark:border-neutral-800 rounded-2xl shadow-2xl p-6">
          <DialogHeader className="shrink-0 pb-3 border-b border-border/40">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-[#942392]/10 rounded-xl text-[#942392]">
                <History className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-black text-foreground uppercase tracking-tight">
                  Configuration Audit Trail
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Complete history of administrative operations, company switches, and policy changes
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4 space-y-2.5">
            {loadingAudit ? (
              <div className="py-12 text-center text-xs text-muted-foreground animate-pulse font-bold uppercase tracking-wider">
                Loading audit trail records...
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground italic">
                No recent audit log entries recorded.
              </div>
            ) : (
              auditLogs.map((log) => (
                <div 
                  key={log.id} 
                  className="p-3 bg-muted/30 dark:bg-neutral-800/40 border border-border/40 dark:border-neutral-800 rounded-xl flex items-start justify-between gap-4 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-[#942392] uppercase text-[10px] tracking-wider px-2 py-0.5 bg-[#942392]/10 rounded-md">
                        {log.action}
                      </span>
                      <span className="font-bold text-foreground text-[11px]">
                        {log.entity_type} {log.entity_id ? `(#${log.entity_id})` : ''}
                      </span>
                    </div>
                    {log.details && (
                      <p className="text-[11px] text-muted-foreground">
                        {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-muted-foreground block font-mono">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                    <span className="text-[9px] font-bold text-foreground/80">
                      User #{log.user_id}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettingsLayout;
