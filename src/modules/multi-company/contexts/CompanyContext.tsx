import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Company, UserCompanyRole } from '../types/multiCompany.types';
import { multiCompanyApi } from '../services/multiCompanyApi';

interface CompanyContextType {
  activeCompany: Company | null;
  companies: Company[];
  userCompanies: UserCompanyRole[];
  userActiveRole: UserCompanyRole | null;
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
  const [loading, setLoading] = useState<boolean>(true);

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

      // Determine initial active company
      const cachedId = sessionStorage.getItem(STORAGE_ACTIVE_COMPANY_KEY);
      let selected: Company | undefined;

      if (cachedId) {
        selected = activeList.find(c => c.id === parseInt(cachedId, 10));
      }

      // If no valid cached company, default to user's assigned default or Main Company (id = 1)
      if (!selected) {
        const userDefault = uCompanies.find(uc => uc.is_default);
        if (userDefault) {
          selected = activeList.find(c => c.id === userDefault.company_id);
        }
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
    const target = companies.find(c => c.id === companyId);
    if (target) {
      setActiveCompany(target);
      sessionStorage.setItem(STORAGE_ACTIVE_COMPANY_KEY, target.id.toString());
      // Emit synthetic event so components know company context changed
      window.dispatchEvent(new CustomEvent('rayhar_company_switched', { detail: { company: target } }));
    }
  }, [companies]);

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
  const isParentGroupAdmin = 
    Boolean(activeCompany?.company_type === 'main' && ['hr_admin', 'admin', 'managing_director', 'operation_manager'].includes(normUserRole)) ||
    userCompanies.some(uc => uc.scope_type === 'Parent Group Access');

  return (
    <CompanyContext.Provider
      value={{
        activeCompany,
        companies,
        userCompanies,
        userActiveRole,
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
