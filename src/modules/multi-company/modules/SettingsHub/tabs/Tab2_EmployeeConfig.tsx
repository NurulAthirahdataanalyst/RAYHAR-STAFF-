import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserPlus, ArrowRightLeft, History, Building2, MapPin, Layers, Briefcase, Shield, CheckCircle2, RotateCcw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCompany } from '../../../contexts/CompanyContext';
import { multiCompanyApi } from '../../../services/multiCompanyApi';
import { API_BASE_URL } from '@/config/api';
import { CompanyBranch, CompanyDepartment, CompanyRole } from '../../../types/multiCompany.types';
import { CompanyTransferWizard } from '../../../employee-assignment/CompanyTransferWizard';
import { EmployeeCompanyHistory } from '../../../employee-assignment/EmployeeCompanyHistory';

export const Tab2_EmployeeConfig: React.FC = () => {
  const { companies, activeCompany } = useCompany();
  const [subTab, setSubTab] = useState<'onboard' | 'transfer' | 'history'>('onboard');

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<number>(activeCompany?.id || 1);
  const [branches, setBranches] = useState<CompanyBranch[]>([]);
  const [departments, setDepartments] = useState<CompanyDepartment[]>([]);
  const [roles, setRoles] = useState<CompanyRole[]>([]);
  
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [position, setPosition] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState('Active Personnel');
  const [loadingContext, setLoadingContext] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // When selected company changes, fetch its branches, departments, and roles dynamically
  useEffect(() => {
    if (!selectedCompanyId) return;

    const loadCompanyData = async () => {
      try {
        setLoadingContext(true);
        const [bList, dList, rList] = await Promise.all([
          multiCompanyApi.getCompanyBranches(selectedCompanyId),
          multiCompanyApi.getCompanyDepartments(selectedCompanyId),
          multiCompanyApi.getCompanyRoles(selectedCompanyId)
        ]);

        setBranches(bList);
        setDepartments(dList);
        setRoles(rList);

        if (bList.length > 0) setSelectedBranch(bList[0].code);
        else setSelectedBranch('');

        if (dList.length > 0) setSelectedDepartment(dList[0].name);
        else setSelectedDepartment('');

        if (rList.length > 0) setSelectedRoleId(rList[0].id);
        else setSelectedRoleId('');
      } catch (err) {
        console.error('Failed to load company metadata:', err);
      } finally {
        setLoadingContext(false);
      }
    };

    void loadCompanyData();
  }, [selectedCompanyId]);

  const handleReset = () => {
    setFullName('');
    setEmail('');
    setPassword('');
    setPosition('');
    setEmploymentStatus('Active Personnel');
    toast.info('Onboarding form cleared');
  };

  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      toast.error('Full Name, Email Address, and Password are required');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`${API_BASE_URL}/api/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim(),
          password: password,
          company_id: selectedCompanyId,
          branch: selectedBranch,
          department: selectedDepartment,
          position: position.trim() || undefined,
          role_id: selectedRoleId,
          status: employmentStatus
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to onboard employee');
      }

      toast.success(`Staff ${fullName} successfully onboarded into ${companies.find(c => c.id === selectedCompanyId)?.company_name}!`);
      handleReset();
    } catch (err: any) {
      toast.error(err.message || 'Onboarding error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-2 border-b border-border dark:border-neutral-800 pb-3">
        <button
          type="button"
          onClick={() => setSubTab('onboard')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            subTab === 'onboard'
              ? 'bg-[#942392] text-white shadow-xs'
              : 'text-muted-foreground hover:bg-muted/60 dark:hover:bg-neutral-800'
          }`}
        >
          <UserPlus className="w-3.5 h-3.5" />
          Onboard New Staff
        </button>

        <button
          type="button"
          onClick={() => setSubTab('transfer')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            subTab === 'transfer'
              ? 'bg-[#942392] text-white shadow-xs'
              : 'text-muted-foreground hover:bg-muted/60 dark:hover:bg-neutral-800'
          }`}
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          Company Transfer Wizard
        </button>

        <button
          type="button"
          onClick={() => setSubTab('history')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            subTab === 'history'
              ? 'bg-[#942392] text-white shadow-xs'
              : 'text-muted-foreground hover:bg-muted/60 dark:hover:bg-neutral-800'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          Transfer Career History
        </button>
      </div>

      {subTab === 'onboard' && (
        <Card className="border border-border dark:border-neutral-800 shadow-xs bg-white/70 dark:bg-card/70 backdrop-blur-md rounded-2xl p-6 space-y-6">
          <div className="space-y-1">
            <h3 className="text-sm font-black uppercase tracking-wider text-foreground dark:text-white flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-[#942392]" />
              Staff Onboarding & Company Role Allocation
            </h3>
            <p className="text-xs text-muted-foreground dark:text-neutral-400">
              Provision employee credentials, map their company entity, branch location, department, and custom authorized role.
            </p>
          </div>

          <form onSubmit={handleOnboardSubmit} className="space-y-5">
            {/* Row 1: Personal Credentials */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground">Full Name *</Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Nurul Athirah Abdul Rahman"
                  className="text-xs h-9 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground">Corporate Email Address *</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="athirah@rayhar.com"
                  className="text-xs h-9 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground">Portal Access Password *</Label>
                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="text-xs h-9 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800"
                  required
                />
              </div>
            </div>

            {/* Row 2: Company & Placement */}
            <div className="p-4 rounded-xl border border-border/50 dark:border-neutral-800 bg-muted/20 dark:bg-neutral-900/40 space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-foreground dark:text-neutral-200 flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-[#942392]" />
                Organizational Placement & Company Binding
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-muted-foreground">Company Entity *</Label>
                  <Select 
                    value={selectedCompanyId.toString()} 
                    onValueChange={(val) => setSelectedCompanyId(parseInt(val, 10))}
                  >
                    <SelectTrigger className="text-xs h-9 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-bold">
                      <SelectValue placeholder="Select company..." />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map(c => (
                        <SelectItem key={c.id} value={c.id.toString()} className="text-xs">
                          {c.company_name} ({c.company_type === 'main' ? 'Parent' : 'Sub'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-muted-foreground">Assigned Branch</Label>
                  <Select value={selectedBranch} onValueChange={setSelectedBranch} disabled={branches.length === 0}>
                    <SelectTrigger className="text-xs h-9 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800">
                      <SelectValue placeholder={branches.length === 0 ? "No branches" : "Choose branch..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map(b => (
                        <SelectItem key={b.code} value={b.code} className="text-xs">
                          {b.name} ({b.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-muted-foreground">Department</Label>
                  <Select value={selectedDepartment} onValueChange={setSelectedDepartment} disabled={departments.length === 0}>
                    <SelectTrigger className="text-xs h-9 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800">
                      <SelectValue placeholder={departments.length === 0 ? "No departments" : "Choose department..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map(d => (
                        <SelectItem key={d.name} value={d.name} className="text-xs">
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-muted-foreground">Designation / Position</Label>
                  <Input
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    placeholder="e.g. Senior Executive"
                    className="text-xs h-9 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800"
                  />
                </div>
              </div>
            </div>

            {/* Row 3: Role & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground">System Authorization Role *</Label>
                <Select value={selectedRoleId} onValueChange={setSelectedRoleId} disabled={roles.length === 0}>
                  <SelectTrigger className="text-xs h-9 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800">
                    <SelectValue placeholder={roles.length === 0 ? "No roles in entity" : "Select authorized role..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map(r => (
                      <SelectItem key={r.id} value={r.id} className="text-xs">
                        {r.name} ({r.role_type || 'Role'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-[10px] text-muted-foreground">
                  Populated from roles configured specifically for {companies.find(c => c.id === selectedCompanyId)?.company_name}
                </span>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground">Employment Status</Label>
                <Select value={employmentStatus} onValueChange={setEmploymentStatus}>
                  <SelectTrigger className="text-xs h-9 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active Personnel" className="text-xs">Active Personnel</SelectItem>
                    <SelectItem value="Inactive Personnel" className="text-xs">Inactive Personnel</SelectItem>
                    <SelectItem value="Resigned" className="text-xs">Resigned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-border/40 dark:border-neutral-800">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReset}
                disabled={submitting}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Reset Form
              </Button>

              <Button
                type="submit"
                disabled={submitting || !fullName || !email || !password}
                className="bg-[#942392] hover:bg-[#800A7A] text-white font-black text-xs uppercase tracking-wider shadow-sm h-9 px-6 rounded-xl"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <UserPlus className="w-3.5 h-3.5 mr-1.5" />}
                Onboard Staff Member
              </Button>
            </div>
          </form>
        </Card>
      )}

      {subTab === 'transfer' && (
        <Card className="border border-border dark:border-neutral-800 shadow-xs bg-white/70 dark:bg-card/70 backdrop-blur-md rounded-2xl p-6">
          <CompanyTransferWizard onTransferComplete={() => setSubTab('history')} />
        </Card>
      )}

      {subTab === 'history' && (
        <Card className="border border-border dark:border-neutral-800 shadow-xs bg-white/70 dark:bg-card/70 backdrop-blur-md rounded-2xl p-6">
          <EmployeeCompanyHistory />
        </Card>
      )}
    </div>
  );
};
