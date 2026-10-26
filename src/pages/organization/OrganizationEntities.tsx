import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  ShieldCheck, 
  ArrowRightLeft, 
  History, 
  MapPin, 
  Layers, 
  Sparkles,
  SlidersHorizontal,
  Plus
} from 'lucide-react';
import { useCompany } from '@/modules/multi-company/contexts/CompanyContext';
import { Tab3_CompanyMgmt } from '@/modules/multi-company/modules/SettingsHub/tabs/Tab3_CompanyMgmt';
import { Tab9_IAM } from '@/modules/multi-company/modules/SettingsHub/tabs/Tab9_IAM';
import { Tab4_BranchLocationMgmt } from '@/modules/multi-company/modules/SettingsHub/tabs/Tab4_BranchLocationMgmt';
import { Tab5_DepartmentMgmt } from '@/modules/multi-company/modules/SettingsHub/tabs/Tab5_DepartmentMgmt';
import { CompanyTransferWizard } from '@/modules/multi-company/employee-assignment/CompanyTransferWizard';
import { EmployeeCompanyHistory } from '@/modules/multi-company/employee-assignment/EmployeeCompanyHistory';
import PageHeader from '@/components/layout/PageHeader';

export type OrganizationSection = 'entities' | 'roles' | 'transfer' | 'history' | 'branches' | 'departments';

interface SectionConfig {
  id: OrganizationSection;
  label: string;
  icon: React.ElementType;
  description: string;
}

const SECTIONS: SectionConfig[] = [
  {
    id: 'entities',
    label: 'Corporate Entities',
    icon: Building2,
    description: 'Holding structures, subsidiaries, branding logos & entity hierarchies'
  },
  {
    id: 'roles',
    label: 'Company Roles & RBAC',
    icon: ShieldCheck,
    description: 'Company-specific roles, permission matrices & isolated access boundaries'
  },
  {
    id: 'transfer',
    label: 'Employee Transfer Wizard',
    icon: ArrowRightLeft,
    description: 'Verified multi-step employee transition & role compatibility validation'
  },
  {
    id: 'history',
    label: 'Transfer Career History',
    icon: History,
    description: 'Immutable historical company transition ledger & audit trails'
  },
  {
    id: 'branches',
    label: 'Branches & Geofence',
    icon: MapPin,
    description: 'Office branches, GPS geofencing radius & night shift modes'
  },
  {
    id: 'departments',
    label: 'Departments',
    icon: Layers,
    description: 'Departmental divisions and headcount allocations across entities'
  }
];

export default function OrganizationEntities() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { companies, activeCompany } = useCompany();

  const currentSection = (searchParams.get('tab') as OrganizationSection) || 'entities';

  const handleSelectSection = (section: OrganizationSection) => {
    setSearchParams({ tab: section });
  };

  const activeSectionObj = SECTIONS.find(s => s.id === currentSection) || SECTIONS[0];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-[#800A7A] via-[#942392] to-[#3d0052] text-white shadow-lg border border-[#942392]/30">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl text-white backdrop-blur-md">
              <Building2 className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white">
              Organization & Entities
            </h1>
            <Badge variant="outline" className="bg-[#ffff00] text-[#942392] border-0 font-black text-[10px] px-2 py-0.5 uppercase tracking-wider shadow-xs ml-2">
              {companies.length} Registered Entities
            </Badge>
          </div>
          <p className="text-xs text-white/80 max-w-2xl font-medium">
            Centralized multi-company governance hub for managing subsidiaries, isolated RBAC permissions, branch geofencing, and verified inter-company employee transfers.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            onClick={() => handleSelectSection('transfer')}
            className="bg-[#ffff00] hover:bg-[#ffff00]/90 text-[#942392] font-black text-xs uppercase tracking-wider shadow-md h-9 px-4 rounded-xl flex items-center gap-1.5"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            Transfer Employee
          </Button>
        </div>
      </div>

      {/* Navigation Sub-Tabs Bar */}
      <div className="bg-card dark:bg-neutral-900 p-2 rounded-2xl border border-border dark:border-neutral-800 shadow-xs flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        {SECTIONS.map((sec) => {
          const Icon = sec.icon;
          const isActive = currentSection === sec.id;

          return (
            <button
              key={sec.id}
              onClick={() => handleSelectSection(sec.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-[#942392] text-white shadow-sm font-black'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 font-bold'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{sec.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Section Content Area */}
      <div className="min-h-[500px]">
        {currentSection === 'entities' && (
          <Tab3_CompanyMgmt 
            onNavigateToTab={(tab, cId) => {
              if (tab === 'branch') handleSelectSection('branches');
              else if (tab === 'iam') handleSelectSection('roles');
            }} 
          />
        )}

        {currentSection === 'roles' && (
          <Tab9_IAM />
        )}

        {currentSection === 'transfer' && (
          <Card className="border border-border dark:border-neutral-800 shadow-xs bg-white/70 dark:bg-card/70 backdrop-blur-md rounded-2xl p-6">
            <CompanyTransferWizard onTransferComplete={() => handleSelectSection('history')} />
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
