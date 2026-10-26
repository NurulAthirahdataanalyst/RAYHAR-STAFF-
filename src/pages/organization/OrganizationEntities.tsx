import React from 'react';
import { useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Tab3_CompanyMgmt } from '@/modules/multi-company/modules/SettingsHub/tabs/Tab3_CompanyMgmt';
import { Tab9_IAM } from '@/modules/multi-company/modules/SettingsHub/tabs/Tab9_IAM';
import { Tab4_BranchLocationMgmt } from '@/modules/multi-company/modules/SettingsHub/tabs/Tab4_BranchLocationMgmt';
import { Tab5_DepartmentMgmt } from '@/modules/multi-company/modules/SettingsHub/tabs/Tab5_DepartmentMgmt';
import { CompanyTransferWizard } from '@/modules/multi-company/employee-assignment/CompanyTransferWizard';
import { EmployeeCompanyHistory } from '@/modules/multi-company/employee-assignment/EmployeeCompanyHistory';
import PageHeader from '@/components/layout/PageHeader';

export type OrganizationSection = 'entities' | 'roles' | 'transfer' | 'history' | 'branches' | 'departments';

export default function OrganizationEntities() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const getActiveSection = (): OrganizationSection => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/transfer')) return 'transfer';
    if (path.includes('/roles')) return 'roles';
    if (path.includes('/history')) return 'history';
    if (path.includes('/branches')) return 'branches';
    if (path.includes('/departments')) return 'departments';
    if (path.includes('/entities')) return 'entities';

    const tab = searchParams.get('tab') as OrganizationSection;
    if (tab && ['entities', 'roles', 'transfer', 'history', 'branches', 'departments'].includes(tab)) {
      return tab;
    }
    return 'entities';
  };

  const currentSection = getActiveSection();

  return (
    <div className="space-y-6 pb-12">
      {/* Page Title & Breadcrumb-aligned Header */}
      <PageHeader />

      {/* Main Section Content Area - Navigated directly via Sidebar Submenu */}
      <div className="min-h-[500px]">
        {currentSection === 'entities' && (
          <Tab3_CompanyMgmt 
            onNavigateToTab={(tab) => {
              if (tab === 'branch') navigate('/organization/branches');
              else if (tab === 'iam') navigate('/organization/roles');
            }} 
          />
        )}

        {currentSection === 'roles' && (
          <Tab9_IAM />
        )}

        {currentSection === 'transfer' && (
          <Card className="border border-border dark:border-neutral-800 shadow-xs bg-white/70 dark:bg-card/70 backdrop-blur-md rounded-2xl p-6">
            <CompanyTransferWizard onTransferComplete={() => navigate('/organization/history')} />
          </Card>
        )}

        {currentSection === 'history' && (
          <Card className="border border-border dark:border-neutral-800 shadow-xs bg-white/70 dark:bg-card/70 backdrop-blur-md rounded-2xl p-6">
            <EmployeeCompanyHistory />
          </Card>
        )}

        {currentSection === 'branches' && (
          <Tab4_BranchLocationMgmt />
        )}

        {currentSection === 'departments' && (
          <Tab5_DepartmentMgmt />
        )}
      </div>
    </div>
  );
}
