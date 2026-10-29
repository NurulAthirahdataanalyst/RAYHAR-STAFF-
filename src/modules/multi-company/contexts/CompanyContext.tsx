import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Company, UserCompanyRole, CompanyModuleSetting } from '../types/multiCompany.types';
import { multiCompanyApi } from '../services/multiCompanyApi';

interface CompanyContextType {
  activeCompany: Company | null;
  companies: Company[];
  userCompanies: UserCompanyRole[];
  userActiveRole: UserCompanyRole | null;
  companyModules: CompanyModuleSetting[];
  enabledModuleKeys: string[];
  isModuleEnabled: (moduleKey: string) => boolean;
  isPermissionEnabled: (permKey: string) => boolean;
  refreshCompanyModules: () => Promise<void>;
  loading: boolean;
  setActiveCompanyId: (companyId: number) => void;
  refreshCompanies: () => Promise<void>;
  isParentGroupAdmin: boolean;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

const STORAGE_ACTIVE_COMPANY_KEY = 'rayhar_active_company_id';

const DEFAULT_MAIN_COMPANY: Company = {
  id: 1,
  company_name: 'Rayhar Travels',
  company_type: 'main',
  company_address: 'No. 1, Jalan Terengganu, 20100 Kuala Terengganu, Terengganu',
  email: 'hr@rayhar.com',
  logo_url: '/assets/rayhar-logo.png',
  status: 'active',
  branches_count: 25,
  active_employees_count: 35
};

export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([DEFAULT_MAIN_COMPANY]);
  const [userCompanies, setUserCompanies] = useState<UserCompanyRole[]>([]);
  const [activeCompany, setActiveCompany] = useState<Company | null>(DEFAULT_MAIN_COMPANY);
  const [companyModules, setCompanyModules] = useState<CompanyModuleSetting[]>([]);
  const [enabledModuleKeys, setEnabledModuleKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch company modules for active company
  const fetchModulesForCompany = useCallback(async (companyId: number) => {
    try {
      const res = await multiCompanyApi.getCompanyModules(companyId);
      setCompanyModules(res.modules || []);
      setEnabledModuleKeys(res.enabled_module_keys || []);
    } catch (e) {
      console.warn('Could not load company modules:', e);
    }
  }, []);

  const refreshCompanyModules = useCallback(async () => {
    if (activeCompany?.id) {
      await fetchModulesForCompany(activeCompany.id);
    }
  }, [activeCompany?.id, fetchModulesForCompany]);

  useEffect(() => {
    if (activeCompany?.id) {
      void fetchModulesForCompany(activeCompany.id);
    }
  }, [activeCompany?.id, fetchModulesForCompany]);

  // Check if a module is enabled for the active company
  const isModuleEnabled = useCallback((moduleKey: string): boolean => {
    if (!moduleKey) return true;
    const cleanKey = moduleKey.toLowerCase().trim();
    // Normalize aliases
    let normalized = cleanKey;
    if (cleanKey === 'leave' || cleanKey === 'leave_management' || cleanKey === 'leave management') normalized = 'leave_management';
    if (cleanKey === 'leave_admin' || cleanKey === 'leaveadmin' || cleanKey === 'leave administration') normalized = 'leave_admin';
    if (cleanKey === 'employee' || cleanKey === 'employee_management' || cleanKey === 'employee management' || cleanKey === 'master') normalized = 'employee_management';
    if (cleanKey === 'organization' || cleanKey === 'organization_entities' || cleanKey === 'organization & entities') normalized = 'organization_entities';
    if (cleanKey === 'outstation' || cleanKey === 'outstation management') normalized = 'outstation';
    if (cleanKey === 'gps' || cleanKey === 'gps location tracker') normalized = 'gps';

    // If no company context yet or main company with no records yet, default allow
    if (enabledModuleKeys.length === 0) return true;

    return enabledModuleKeys.includes(normalized) || enabledModuleKeys.includes(cleanKey);
  }, [enabledModuleKeys]);

  // Check if a specific submodule/feature is enabled for the active company
  const isPermissionEnabled = useCallback((permKey: string): boolean => {
    if (!permKey) return true;
    if (companyModules.length === 0) return true;
    
    // Find parent module of this permission
    for (const mod of companyModules) {
      if (!mod.is_enabled) {
        // If module is disabled and this perm belongs to it, return false
        if (mod.permissions?.some(p => p.permission_key === permKey)) return false;
      } else {
        // If module is enabled, check if granular enabled_permissions exists
        if (Array.isArray(mod.enabled_permissions) && mod.enabled_permissions.length > 0) {
          if (mod.permissions?.some(p => p.permission_key === permKey)) {
            return mod.enabled_permissions.includes(permKey);
          }
        }
      }
    }
    return true;
  }, [companyModules]);

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      const allCompanies = await multiCompanyApi.getCompanies();
      if (allCompanies && allCompanies.length > 0) {
        setCompanies(allCompanies);
      }

      let uCompanies: UserCompanyRole[] = [];
      const currentUserId = user?.user_id || user?.id;

      if (currentUserId) {
        try {
          uCompanies = await multiCompanyApi.getUserCompanies(currentUserId);
          setUserCompanies(uCompanies);
        } catch (e) {
          console.warn('Could not load user company roles:', e);
        }
      }

      const activeList = allCompanies && allCompanies.length > 0 ? allCompanies : [DEFAULT_MAIN_COMPANY];

      const normUserRole = (user?.role || '').trim().toLowerCase();
      const isHR = ['hr', 'hr admin', 'hr_admin', 'admin'].includes(normUserRole);
      const isParentScope = (st?: string | null) => {
        if (!st) return false;
        const s = String(st).trim().toLowerCase();
        return s.includes('parent group') || s === 'parent group data' || s === 'parent group access';
      };
      const cachedScope = typeof sessionStorage !== 'undefined' ? (sessionStorage.getItem("presence_cached_scope_type") || "") : "";
      const isAssureLeader = normUserRole === 'assure_leader' || normUserRole.includes('assure');
      const hasParentGroupScope = 
        !isAssureLeader && (
          isHR ||
          isParentScope(user?.scope_type) ||
          isParentScope(cachedScope) ||
          uCompanies.some(uc => isParentScope(uc.scope_type)) ||
          ['managing_director', 'operation_manager'].includes(normUserRole)
        );

      // Determine initial active company
      const cachedId = sessionStorage.getItem(STORAGE_ACTIVE_COMPANY_KEY);
      let selected: Company | undefined;

      const userDefault = uCompanies.find(uc => uc.is_default) || uCompanies[0];
      const userAssignedCompId = userDefault?.company_id || (user as any)?.company_id;

      // Assure Leader is strictly scoped to her own assigned company
      if (isAssureLeader && userAssignedCompId) {
        selected = activeList.find(c => c.id === userAssignedCompId);
      } else if (hasParentGroupScope && cachedId) {
        selected = activeList.find(c => c.id === parseInt(cachedId, 10));
      }

      // Default to user's assigned default company
      if (!selected && userAssignedCompId) {
        selected = activeList.find(c => c.id === userAssignedCompId);
      }

      if (!selected && activeList.length > 0) {
        selected = activeList.find(c => c.company_type === 'main') || activeList[0];
      }

      if (selected) {
        setActiveCompany(selected);
        sessionStorage.setItem(STORAGE_ACTIVE_COMPANY_KEY, selected.id.toString());
      }
    } catch (err) {
      console.error('Error in CompanyProvider:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchAllData();
  }, [fetchAllData]);

  const setActiveCompanyId = useCallback((companyId: number) => {
    // Only HR role or roles with Parent Group Data authorization scope are authorized to switch active company context
    const normUserRole = (user?.role || '').trim().toLowerCase();
    const isHR = ['hr', 'hr admin', 'hr_admin', 'admin'].includes(normUserRole);
    const isParentScope = (st?: string | null) => {
      if (!st) return false;
      const s = String(st).trim().toLowerCase();
      return s.includes('parent group') || s === 'parent group data' || s === 'parent group access';
    };
    const cachedScope = typeof sessionStorage !== 'undefined' ? (sessionStorage.getItem("presence_cached_scope_type") || "") : "";
    const isAssureLeader = normUserRole === 'assure_leader' || normUserRole.includes('assure');
    const hasParentGroupScope = 
      !isAssureLeader && (
        isHR ||
        isParentScope(user?.scope_type) ||
        isParentScope(cachedScope) ||
        userCompanies.some(uc => isParentScope(uc.scope_type)) ||
        ['managing_director', 'operation_manager'].includes(normUserRole)
      );

    if (isAssureLeader) {
      console.warn('Assure Leader role is restricted to her own branch/company only.');
      return;
    }

    if (!hasParentGroupScope) {
      console.warn('Switching company context is restricted to HR Admin or Parent Group Data role authorization.');
      return;
    }
    const target = companies.find(c => c.id === companyId);
    if (target) {
      setActiveCompany(target);
      sessionStorage.setItem(STORAGE_ACTIVE_COMPANY_KEY, target.id.toString());
      try {
        localStorage.setItem(STORAGE_ACTIVE_COMPANY_KEY, target.id.toString());
      } catch (e) {}
      // Emit synthetic event so components know company context changed
      window.dispatchEvent(new CustomEvent('rayhar_company_switched', { detail: { company: target, company_id: target.id } }));
    }
  }, [companies, user, userCompanies]);

  const refreshCompanies = useCallback(async () => {
    try {
      const all = await multiCompanyApi.getCompanies();
      if (all && all.length > 0) {
        setCompanies(all);
        setActiveCompany((prev) => {
          if (prev) {
            const refreshed = all.find((c) => c.id === prev.id);
            if (refreshed) {
              if (
                refreshed.company_name !== prev.company_name ||
                refreshed.company_type !== prev.company_type ||
                refreshed.logo_url !== prev.logo_url ||
                refreshed.status !== prev.status ||
                refreshed.branches_count !== prev.branches_count ||
                refreshed.active_employees_count !== prev.active_employees_count
              ) {
                return refreshed;
              }
              return prev;
            }
          }
          return all.find((c) => c.company_type === 'main') || all[0];
        });
      }
    } catch (err) {
      console.error('Error refreshing companies:', err);
    }
  }, []);

  // Active role for user in current company
  const userActiveRole = userCompanies.find(uc => uc.company_id === activeCompany?.id) || null;

  // Determine if user has parent group administrator powers
  const normUserRole = (user?.role || '').toLowerCase();
  const cachedScope = typeof sessionStorage !== 'undefined' ? (sessionStorage.getItem("presence_cached_scope_type") || "") : "";
  const isParentScope = (st?: string | null) => {
    if (!st) return false;
    const s = String(st).trim().toLowerCase();
    return s.includes('parent group') || s === 'parent group data' || s === 'parent group access';
  };
  const isAssureLeaderRole = normUserRole === 'assure_leader' || normUserRole.includes('assure');
  const isParentGroupAdmin = 
    !isAssureLeaderRole && (
      Boolean(activeCompany?.company_type === 'main' && ['hr_admin', 'admin', 'managing_director', 'operation_manager'].includes(normUserRole)) ||
      isParentScope(user?.scope_type) ||
      isParentScope(cachedScope) ||
      userCompanies.some(uc => isParentScope(uc.scope_type))
    );

  return (
    <CompanyContext.Provider
      value={{
        activeCompany,
        companies,
        userCompanies,
        userActiveRole,
        companyModules,
        enabledModuleKeys,
        isModuleEnabled,
        isPermissionEnabled,
        refreshCompanyModules,
        loading,
        setActiveCompanyId,
        refreshCompanies,
        isParentGroupAdmin
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};
