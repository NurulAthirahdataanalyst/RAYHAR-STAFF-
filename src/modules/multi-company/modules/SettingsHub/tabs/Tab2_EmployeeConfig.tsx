import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { 
  UserPlus, 
  ArrowRightLeft, 
  History, 
  Building2, 
  MapPin, 
  Layers, 
  Briefcase, 
  Shield, 
  CheckCircle2, 
  RotateCcw, 
  Loader2,
  CalendarDays,
  User,
  Phone,
  CreditCard,
  Lock
} from 'lucide-react';
import { toast } from 'sonner';
import { useCompany } from '../../../contexts/CompanyContext';
import { multiCompanyApi } from '../../../services/multiCompanyApi';
import { API_BASE_URL } from '@/config/api';
import { CompanyBranch, CompanyDepartment, CompanyRole } from '../../../types/multiCompany.types';
import { CompanyTransferWizard } from '../../../employee-assignment/CompanyTransferWizard';
import { EmployeeCompanyHistory } from '../../../employee-assignment/EmployeeCompanyHistory';
import { formatMyKad, parseMyKad, formatMalaysianPhone } from '@/utils/mykadUtils';

export const Tab2_EmployeeConfig: React.FC = () => {
  const navigate = useNavigate();
  const { companies, activeCompany } = useCompany();
  const [subTab, setSubTab] = useState<'onboard' | 'transfer' | 'history'>('onboard');

  // Form states - Personal & Identity
  const [fullName, setFullName] = useState('');
  const [icNumber, setIcNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [joinDate, setJoinDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Form states - Credentials
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Form states - Organization & Roles
  const [selectedCompanyId, setSelectedCompanyId] = useState<number>(activeCompany?.id || 1);
  const [branches, setBranches] = useState<CompanyBranch[]>([]);
  const [departments, setDepartments] = useState<CompanyDepartment[]>([]);
  const [roles, setRoles] = useState<CompanyRole[]>([]);
  
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState('Active');
  const [loadingContext, setLoadingContext] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Real-time dynamic IC calculations (DOB, Age, Gender)
  const parsedIc = useMemo(() => parseMyKad(icNumber), [icNumber]);

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
    setIcNumber('');
    setPhone('');
    setJoinDate(new Date().toISOString().split('T')[0]);
    setEmail('');
    setPassword('');
    setEmploymentStatus('Active');
    toast.info('Onboarding form cleared');
  };

  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      toast.error('Full Name, Email Address, and Password are required');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    const selectedRoleObj = roles.find(r => r.id === selectedRoleId);

    try {
      setSubmitting(true);
      const res = await fetch(`${API_BASE_URL}/api/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim().toUpperCase(),
          email: email.trim(),
          password: password,
          company_id: selectedCompanyId,
          branch: selectedBranch || 'HQ',
          department: selectedDepartment || null,
          role: selectedRoleObj?.name || 'Employee',
          role_id: selectedRoleId || undefined,
          status: employmentStatus || 'Active',
          ic_number: icNumber ? formatMyKad(icNumber) : null,
          phone: phone ? formatMalaysianPhone(phone) : null,
          gender: parsedIc.gender || null,
          dob: parsedIc.dob || null,
          join_date: joinDate || null,
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to onboard employee');
      }

      toast.success(`Staff ${fullName} successfully onboarded into ${companies.find(c => c.id === selectedCompanyId)?.company_name || 'selected company'}!`);
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
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            subTab === 'onboard'
              ? 'bg-[#942392] text-white shadow-xs'
              : 'text-muted-foreground hover:bg-muted/60 dark:hover:bg-neutral-800'
          }`}
        >
          Onboard New Staff
        </button>

        <button
          type="button"
          onClick={() => setSubTab('transfer')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            subTab === 'transfer'
              ? 'bg-[#942392] text-white shadow-xs'
              : 'text-muted-foreground hover:bg-muted/60 dark:hover:bg-neutral-800'
          }`}
        >
          Company Transfer Wizard
        </button>

        <button
          type="button"
          onClick={() => setSubTab('history')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            subTab === 'history'
              ? 'bg-[#942392] text-white shadow-xs'
              : 'text-muted-foreground hover:bg-muted/60 dark:hover:bg-neutral-800'
          }`}
        >
          Transfer Career History
        </button>
      </div>

      {subTab === 'onboard' && (
        <Card className="border border-border dark:border-neutral-800 shadow-xs bg-white/70 dark:bg-card/70 backdrop-blur-md rounded-2xl p-6 space-y-6">
          <div className="space-y-1">
            <h3 className="text-sm font-black uppercase tracking-wider text-foreground dark:text-white">
              Staff Onboarding & Company Role Allocation
            </h3>
            <p className="text-xs text-muted-foreground dark:text-neutral-400">
              Provision employee credentials, identity records (MyKad, phone, DOB, age, gender), map their company entity, branch location, department, and custom authorized role.
            </p>
          </div>

          <form onSubmit={handleOnboardSubmit} className="space-y-6">
            {/* Section 1: Personal & Identity Details */}
            <div className="p-4 rounded-xl border border-border/50 dark:border-neutral-800 bg-muted/20 dark:bg-neutral-900/40 space-y-4">
              <h4 className="text-[11px] font-black uppercase tracking-wider text-black dark:text-white">
                Personal Information & Identity Records
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black uppercase tracking-wider text-black dark:text-white">
                    Full Name <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value.toUpperCase())}
                    placeholder="e.g. AHMAD ALBAB"
                    className="text-xs h-9 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-bold uppercase placeholder:normal-case placeholder:font-normal text-black dark:text-white"
                    required
                  />
                </div>

                {/* IC Number */}
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black uppercase tracking-wider text-black dark:text-white">
                    ID Card (IC) Number
                  </Label>
                  <Input
                    type="text"
                    maxLength={14}
                    value={icNumber}
                    onChange={(e) => setIcNumber(formatMyKad(e.target.value))}
                    placeholder="e.g. 900101-14-5678"
                    className="text-xs h-9 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-mono font-bold placeholder:font-normal text-black dark:text-white"
                  />
                </div>

                {/* Phone Number */}
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black uppercase tracking-wider text-black dark:text-white">
                    Phone Number
                  </Label>
                  <Input
                    type="text"
                    maxLength={12}
                    value={phone}
                    onChange={(e) => setPhone(formatMalaysianPhone(e.target.value))}
                    placeholder="e.g. 012-3456789"
                    className="text-xs h-9 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-mono font-bold placeholder:font-normal text-black dark:text-white"
                  />
                </div>

                {/* Date of Join */}
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black uppercase tracking-wider text-black dark:text-white">
                    Date of Join
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="flex items-center justify-between w-full h-9 px-3 bg-background dark:bg-neutral-900 border border-border dark:border-neutral-800 focus:border-[#942392] focus:ring-2 focus:ring-[#942392]/10 rounded-lg text-xs font-bold text-black dark:text-white text-left shadow-xs hover:bg-muted/50 transition-colors"
                      >
                        <span>
                          {joinDate
                            ? new Date(joinDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()
                            : "SELECT DATE"}
                        </span>
                        <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 border-none shadow-2xl rounded-2xl overflow-hidden z-[80]" align="start">
                      <Calendar
                        mode="single"
                        selected={joinDate ? new Date(joinDate) : undefined}
                        onSelect={(d) => {
                          if (d) {
                            const localIso = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                            setJoinDate(localIso);
                          } else {
                            setJoinDate("");
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Real-time Dynamic Info Bar from IC */}
              {icNumber && (
                <div className="p-3 bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/60 rounded-xl flex items-center justify-between flex-wrap gap-2 animate-in fade-in slide-in-from-top-1 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#942392]">Date of Birth:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{parsedIc.formattedDob || "Calculating..."}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#942392]">Age:</span>
                    <span className="font-black text-[#942392]">{parsedIc.age !== null ? `${parsedIc.age} years old` : "—"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#942392]">Gender:</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-white dark:bg-purple-900 border border-purple-200 text-[#942392] dark:text-purple-200">
                      {parsedIc.gender || "—"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Section 2: Account & Access Credentials */}
            <div className="p-4 rounded-xl border border-border/50 dark:border-neutral-800 bg-muted/20 dark:bg-neutral-900/40 space-y-4">
              <h4 className="text-[11px] font-black uppercase tracking-wider text-black dark:text-white">
                Portal Access Credentials
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black uppercase tracking-wider text-black dark:text-white">
                    Corporate Email Address <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="athirah@rayhar.com"
                    className="text-xs h-9 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-medium placeholder:font-normal text-black dark:text-white"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black uppercase tracking-wider text-black dark:text-white">
                    Portal Access Password <span className="text-rose-500">*</span>
                  </Label>
                  <PasswordInput
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="text-xs h-9 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-medium placeholder:font-normal text-black dark:text-white"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Company & Organizational Placement */}
            <div className="p-4 rounded-xl border border-border/50 dark:border-neutral-800 bg-muted/20 dark:bg-neutral-900/40 space-y-4">
              <h4 className="text-[11px] font-black uppercase tracking-wider text-black dark:text-white">
                Organizational Placement & Company Binding
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black uppercase tracking-wider text-black dark:text-white">
                    Company Entity <span className="text-rose-500">*</span>
                  </Label>
                  <Select 
                    value={selectedCompanyId.toString()} 
                    onValueChange={(val) => setSelectedCompanyId(parseInt(val, 10))}
                  >
                    <SelectTrigger className="text-xs h-9 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-medium data-[placeholder]:font-normal text-black dark:text-white">
                      <SelectValue placeholder="Select company..." />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map(c => (
                        <SelectItem key={c.id} value={c.id.toString()} className="text-xs font-bold">
                          {c.company_name} ({c.company_type === 'main' ? 'Parent' : 'Sub'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black uppercase tracking-wider text-black dark:text-white">Assigned Branch</Label>
                  <Select value={selectedBranch} onValueChange={setSelectedBranch} disabled={branches.length === 0}>
                    <SelectTrigger className="text-xs h-9 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-medium data-[placeholder]:font-normal text-black dark:text-white">
                      <SelectValue placeholder={branches.length === 0 ? "No branches" : "Choose branch..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map(b => (
                        <SelectItem key={b.code} value={b.code} className="text-xs font-bold">
                          {b.name} ({b.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black uppercase tracking-wider text-black dark:text-white">Department</Label>
                  <Select value={selectedDepartment} onValueChange={setSelectedDepartment} disabled={departments.length === 0}>
                    <SelectTrigger className="text-xs h-9 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-medium data-[placeholder]:font-normal text-black dark:text-white">
                      <SelectValue placeholder={departments.length === 0 ? "No departments" : "Choose department..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map(d => (
                        <SelectItem key={d.name} value={d.name} className="text-xs font-bold">
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

              </div>
            </div>

            {/* Section 4: Role Authorization & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-black uppercase tracking-wider text-black dark:text-white">
                  System Authorization Role <span className="text-rose-500">*</span>
                </Label>
                <Select value={selectedRoleId} onValueChange={setSelectedRoleId} disabled={roles.length === 0}>
                  <SelectTrigger className="text-xs h-9 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-medium data-[placeholder]:font-normal text-black dark:text-white">
                    <SelectValue placeholder={roles.length === 0 ? "No roles in entity" : "Select authorized role..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map(r => (
                      <SelectItem key={r.id} value={r.id} className="text-xs font-bold">
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
                <Label className="text-[11px] font-black uppercase tracking-wider text-black dark:text-white">Employment Status</Label>
                <Select value={employmentStatus} onValueChange={setEmploymentStatus}>
                  <SelectTrigger className="text-xs h-9 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-medium data-[placeholder]:font-normal text-black dark:text-white">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active" className="text-xs font-bold">Active</SelectItem>
                    <SelectItem value="Inactive" className="text-xs font-bold">Inactive</SelectItem>
                    <SelectItem value="Resigned" className="text-xs font-bold">Resigned</SelectItem>
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
                className="text-[11px] font-black uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                Reset Form
              </Button>

              <Button
                type="submit"
                disabled={submitting || !fullName || !email || !password}
                className="bg-[#942392] hover:bg-[#800A7A] text-white font-black text-[11px] uppercase tracking-wider shadow-sm h-9 px-6 rounded-xl"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
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
