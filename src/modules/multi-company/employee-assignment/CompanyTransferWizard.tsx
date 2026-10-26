import React, { useState, useEffect, useMemo } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import { multiCompanyApi } from '../services/multiCompanyApi';
import { API_BASE_URL } from '@/config/api';
import { CompanyBranch, CompanyRole, CompanyDepartment } from '../types/multiCompany.types';
import { 
  ArrowRight, 
  UserCheck, 
  Building2, 
  MapPin, 
  Shield, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Loader2, 
  Clock, 
  Calendar, 
  FileCheck2, 
  Layers, 
  FileText, 
  CheckSquare, 
  Square,
  ArrowRightLeft,
  Info,
  ChevronRight,
  ChevronLeft,
  XCircle,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface EmployeeTransferWizardProps {
  onTransferComplete?: () => void;
}

export const CompanyTransferWizard: React.FC<EmployeeTransferWizardProps> = ({ onTransferComplete }) => {
  const { companies, refreshCompanies } = useCompany();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  
  // Destination states
  const [targetCompanyId, setTargetCompanyId] = useState<number | null>(null);
  const [targetBranches, setTargetBranches] = useState<CompanyBranch[]>([]);
  const [targetRoles, setTargetRoles] = useState<CompanyRole[]>([]);
  const [targetDepartments, setTargetDepartments] = useState<CompanyDepartment[]>([]);
  
  const [targetBranchCode, setTargetBranchCode] = useState<string>('');
  const [targetRoleId, setTargetRoleId] = useState<string>('');
  const [targetDepartmentName, setTargetDepartmentName] = useState<string>('');
  const [reportingManager, setReportingManager] = useState<string>('');
  const [leaveEntitlement, setLeaveEntitlement] = useState<number>(14);
  const [attendanceProfile, setAttendanceProfile] = useState<string>('Standard Corporate Schedule');
  const [transferReason, setTransferReason] = useState<string>('');
  
  // Wizard navigation step: 1 = Selection & Warning, 2 = Role & Permissions, 3 = Placement, 4 = Data Impact & Confirmation
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);

  // 3 Mandatory Checkboxes for Final Confirmation
  const [ackCompanyMove, setAckCompanyMove] = useState(false);
  const [ackHistoricalData, setAckHistoricalData] = useState(false);
  const [ackReviewPermissions, setAckReviewPermissions] = useState(false);

  // Load staff list
  useEffect(() => {
    const loadEmps = async () => {
      try {
        setLoadingEmployees(true);
        const res = await fetch(`${API_BASE_URL}/api/employees`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.success) {
          setEmployees(data.employees || []);
        }
      } catch (err) {
        console.error('Error loading employees for transfer wizard:', err);
      } finally {
        setLoadingEmployees(false);
      }
    };
    void loadEmps();
  }, []);

  // When target company changes, load its specific branches, roles, and departments
  useEffect(() => {
    if (!targetCompanyId) {
      setTargetBranches([]);
      setTargetRoles([]);
      setTargetDepartments([]);
      return;
    }

    const loadTargetData = async () => {
      try {
        const [bList, rList, dList] = await Promise.all([
          multiCompanyApi.getCompanyBranches(targetCompanyId),
          multiCompanyApi.getCompanyRoles(targetCompanyId),
          multiCompanyApi.getCompanyDepartments(targetCompanyId)
        ]);
        setTargetBranches(bList);
        setTargetRoles(rList);
        setTargetDepartments(dList);

        if (bList.length > 0) setTargetBranchCode(bList[0].code);
        else setTargetBranchCode('');

        if (dList.length > 0) setTargetDepartmentName(dList[0].name);
        else setTargetDepartmentName('');

        // Automatic Role Compatibility Check:
        // Does the employee's current role name exist in the destination company?
        const currentEmp = employees.find(e => (e.user_id || e.id) === selectedEmployeeId);
        const currentRoleName = currentEmp?.role || currentEmp?.role_name || '';
        
        const matchingTargetRole = rList.find(
          r => r.name.toLowerCase().trim() === currentRoleName.toLowerCase().trim()
        );

        if (matchingTargetRole) {
          setTargetRoleId(matchingTargetRole.id);
        } else if (rList.length > 0) {
          setTargetRoleId(rList[0].id);
        } else {
          setTargetRoleId('');
        }
      } catch (err) {
        console.error('Failed to load target company metadata:', err);
      }
    };

    void loadTargetData();
  }, [targetCompanyId, selectedEmployeeId, employees]);

  const selectedEmployee = useMemo(() => {
    return employees.find(e => (e.user_id || e.id) === selectedEmployeeId);
  }, [employees, selectedEmployeeId]);

  const targetCompany = useMemo(() => {
    return companies.find(c => c.id === targetCompanyId);
  }, [companies, targetCompanyId]);

  // Check role match status
  const currentRoleName = selectedEmployee?.role || selectedEmployee?.role_name || 'Staff';
  const matchingRoleExists = useMemo(() => {
    if (!targetRoles.length || !currentRoleName) return false;
    return targetRoles.some(r => r.name.toLowerCase().trim() === currentRoleName.toLowerCase().trim());
  }, [targetRoles, currentRoleName]);

  const selectedTargetRole = useMemo(() => {
    return targetRoles.find(r => r.id === targetRoleId);
  }, [targetRoles, targetRoleId]);

  const allConfirmationsChecked = ackCompanyMove && ackHistoricalData && ackReviewPermissions;

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!selectedEmployeeId || !targetCompanyId) {
        toast.error('Please select an employee and target company');
        return;
      }
      if (selectedEmployee?.company_id === targetCompanyId) {
        toast.error('Selected employee already belongs to this company');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!targetRoleId) {
        toast.error('Please select an authorized role in the target entity');
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (!transferReason.trim()) {
        toast.error('Please provide a transfer reason / authorization justification');
        return;
      }
      setCurrentStep(4);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) setCurrentStep(prev => prev - 1);
  };

  const handleExecuteTransfer = async () => {
    if (!allConfirmationsChecked) {
      toast.error('Please check all 3 mandatory confirmation acknowledgements before proceeding');
      return;
    }

    try {
      setSubmitting(true);
      await multiCompanyApi.transferEmployee({
        employee_id: selectedEmployeeId,
        new_company_id: targetCompanyId!,
        new_branch_id: targetBranchCode || undefined,
        new_role_id: targetRoleId || undefined,
        new_department_id: targetDepartmentName || undefined,
        reason: transferReason.trim()
      });

      toast.success(`Successfully transferred ${selectedEmployee?.full_name || selectedEmployeeId} to ${targetCompany?.company_name}!`);
      setSelectedEmployeeId('');
      setTargetCompanyId(null);
      setTransferReason('');
      setAckCompanyMove(false);
      setAckHistoricalData(false);
      setAckReviewPermissions(false);
      setCurrentStep(1);

      await refreshCompanies();
      if (onTransferComplete) onTransferComplete();
    } catch (err: any) {
      toast.error(err.message || 'Company transfer failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Stepper Indicator */}
      <div className="p-4 bg-muted/30 dark:bg-neutral-900/40 rounded-2xl border border-border dark:border-neutral-800">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          {[
            { num: 1, label: 'Employee & Entity' },
            { num: 2, label: 'Role & Permissions' },
            { num: 3, label: 'Placement & Profile' },
            { num: 4, label: 'Verification & Finalize' }
          ].map((s, idx) => {
            const isActive = currentStep === s.num;
            const isCompleted = currentStep > s.num;

            return (
              <React.Fragment key={s.num}>
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black transition-all ${
                    isCompleted
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : isActive
                      ? 'bg-[#942392] text-white shadow-md ring-4 ring-[#942392]/20'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : s.num}
                  </div>
                  <span className={`text-[11px] font-black uppercase tracking-wider hidden sm:inline ${
                    isActive ? 'text-black dark:text-white font-black' : 'text-muted-foreground'
                  }`}>
                    {s.label}
                  </span>
                </div>
                {idx < 3 && (
                  <div className={`flex-1 h-0.5 mx-2 rounded-full transition-all ${
                    currentStep > s.num ? 'bg-emerald-500' : 'bg-border dark:bg-neutral-800'
                  }`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* STEP 1: EMPLOYEE SELECTION & HIGH-RISK WARNING */}
      {currentStep === 1 && (
        <div className="space-y-5">
          {/* Warning Message Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 text-amber-950 dark:text-amber-200 space-y-2">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h4 className="text-xs font-black uppercase tracking-wider">
                Company Transfer Verification Warning
              </h4>
            </div>
            <p className="text-xs leading-relaxed text-amber-900/90 dark:text-amber-200/90">
              You are about to change this employee's corporate entity. This action will migrate the employee into a segregated organizational environment. The employee will no longer belong to their previous company's operational hierarchy, and previous company-specific data will remain bound to the historical holding.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Staff Member Selection */}
            <div className="p-5 bg-card dark:bg-neutral-900 rounded-2xl border border-border dark:border-neutral-800 space-y-4 shadow-xs">
              <div className="space-y-1">
                <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-[#942392]" />
                  Select Employee to Transfer *
                </Label>
                <p className="text-[11px] text-muted-foreground">Choose the staff member who will be transferred to another company.</p>
              </div>

              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger className="text-xs bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-bold text-black dark:text-white h-10">
                  <SelectValue placeholder={loadingEmployees ? "Loading personnel list..." : "Choose staff member..."} />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {employees.map(e => (
                    <SelectItem key={e.user_id || e.id} value={e.user_id || e.id} className="text-xs font-bold">
                      {e.full_name || e.name} ({e.user_id || e.id}) — {e.branch || 'HQ'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedEmployee && (
                <div className="p-3.5 bg-muted/40 dark:bg-neutral-800/40 rounded-xl border border-border/50 text-xs space-y-2">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-muted-foreground uppercase font-bold">Current Company:</span>
                    <strong className="text-black dark:text-white">{selectedEmployee.company_name || 'Rayhar Travels'}</strong>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-muted-foreground uppercase font-bold">Current Role:</span>
                    <Badge variant="outline" className="font-bold text-[10px] bg-[#942392]/10 text-[#942392] border-[#942392]/30">
                      {selectedEmployee.role || 'Staff'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-muted-foreground uppercase font-bold">Branch & Dept:</span>
                    <span className="font-medium text-foreground">{selectedEmployee.branch || 'HQ'} · {selectedEmployee.department || 'General'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Target Subsidiary Selection */}
            <div className="p-5 bg-card dark:bg-neutral-900 rounded-2xl border border-border dark:border-neutral-800 space-y-4 shadow-xs">
              <div className="space-y-1">
                <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-[#942392]" />
                  Destination Company / Subsidiary *
                </Label>
                <p className="text-[11px] text-muted-foreground">Select the business entity where this employee will be relocated.</p>
              </div>

              <Select 
                value={targetCompanyId ? targetCompanyId.toString() : ''} 
                onValueChange={(val) => setTargetCompanyId(parseInt(val, 10))}
              >
                <SelectTrigger className="text-xs bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-bold text-black dark:text-white h-10">
                  <SelectValue placeholder="Select target entity..." />
                </SelectTrigger>
                <SelectContent>
                  {companies.map(c => (
                    <SelectItem key={c.id} value={c.id.toString()} className="text-xs font-bold">
                      {c.company_name} ({c.company_type === 'main' ? 'Parent Holding' : 'Subsidiary'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* What Will Change Checklist */}
              <div className="p-3.5 bg-muted/30 dark:bg-neutral-800/40 rounded-xl border border-border/50 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#942392] dark:text-[#f885d5] block">
                  Affected Organizational Structure (Will Reset & Rebind):
                </span>
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <span className="flex items-center gap-1.5 text-foreground font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Company Entity
                  </span>
                  <span className="flex items-center gap-1.5 text-foreground font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Department
                  </span>
                  <span className="flex items-center gap-1.5 text-foreground font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Branch Location
                  </span>
                  <span className="flex items-center gap-1.5 text-foreground font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Reporting Manager
                  </span>
                  <span className="flex items-center gap-1.5 text-foreground font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Team Hierarchy
                  </span>
                  <span className="flex items-center gap-1.5 text-foreground font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Organization Chart
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="button"
              onClick={handleNextStep}
              disabled={!selectedEmployeeId || !targetCompanyId}
              className="bg-[#942392] hover:bg-[#800A7A] text-white font-black text-xs uppercase tracking-wider shadow-sm h-10 px-6 rounded-xl"
            >
              Next: Role & Permissions Validation
              <ChevronRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: ROLE COMPATIBILITY & PERMISSION VALIDATION */}
      {currentStep === 2 && (
        <div className="space-y-5">
          <div className="p-5 bg-card dark:bg-neutral-900 rounded-2xl border border-border dark:border-neutral-800 space-y-5 shadow-xs">
            <div className="space-y-1">
              <h4 className="text-xs font-black uppercase tracking-wider text-black dark:text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#942392]" />
                Role Compatibility & RBAC Validation
              </h4>
              <p className="text-[11px] text-muted-foreground">
                Every company owns its independent role structure. Roles are never automatically copied or assumed.
              </p>
            </div>

            {/* Current vs Target Compatibility Checker */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-2 text-xs">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Current Role in {selectedEmployee?.company_name || 'Current Company'}</span>
                <div className="font-black text-sm text-foreground">{currentRoleName}</div>
                <p className="text-[10px] text-muted-foreground">Original permissions belong to current entity environment.</p>
              </div>

              <div className={`p-4 rounded-xl border-2 space-y-2 text-xs ${
                matchingRoleExists 
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-950 dark:text-emerald-200' 
                  : 'bg-amber-500/10 border-amber-500/40 text-amber-950 dark:text-amber-200'
              }`}>
                <div className="flex items-center gap-1.5 font-black text-[11px]">
                  {matchingRoleExists ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      Role Match Found in {targetCompany?.company_name}
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      No Matching Role Found in {targetCompany?.company_name}
                    </>
                  )}
                </div>
                <p className="text-[11px]">
                  {matchingRoleExists
                    ? `Role "${currentRoleName}" exists in ${targetCompany?.company_name}. You may retain it or select a different role.`
                    : `"${currentRoleName}" does not exist in ${targetCompany?.company_name}. You must explicitly select a role available in this entity.`}
                </p>
              </div>
            </div>

            {/* Target Role Selector */}
            <div className="space-y-1.5 pt-2">
              <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">
                Assigned Role in {targetCompany?.company_name} *
              </Label>
              <Select value={targetRoleId} onValueChange={setTargetRoleId}>
                <SelectTrigger className="text-xs bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-bold text-black dark:text-white h-10">
                  <SelectValue placeholder="Choose role available in destination entity..." />
                </SelectTrigger>
                <SelectContent>
                  {targetRoles.map(r => (
                    <SelectItem key={r.id} value={r.id} className="text-xs font-bold">
                      {r.name} ({r.role_type || 'Role'}) {r.scope_type === 'Parent Group Access' ? '— Group Level' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Permissions Granted in New Role Preview */}
            <div className="p-4 rounded-xl bg-muted/30 dark:bg-neutral-800/40 border border-border/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-black dark:text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#942392]" />
                  Permissions Granted to Employee in {targetCompany?.company_name}
                </span>
                <Badge variant="outline" className="font-bold text-[10px] bg-[#942392]/10 text-[#942392]">
                  {selectedTargetRole?.name || 'Selected Role'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {[
                  { name: 'Employee Management', active: true },
                  { name: 'Attendance & Clock-In', active: true },
                  { name: 'Leave Application & Approvals', active: true },
                  { name: 'Outstation Records', active: true },
                  { name: 'Reports & Analytics', active: selectedTargetRole?.role_type !== 'Employee Role' },
                  { name: 'Branch Administration', active: selectedTargetRole?.role_type === 'Management Role' || selectedTargetRole?.role_type === 'Operational Role' },
                  { name: 'Entity Settings', active: selectedTargetRole?.role_type === 'Management Role' },
                  { name: 'Role Management (RBAC)', active: selectedTargetRole?.role_type === 'Management Role' }
                ].map(p => (
                  <div key={p.name} className={`p-2 rounded-lg border flex items-center gap-1.5 ${
                    p.active 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-bold' 
                      : 'bg-muted/40 border-border/40 text-muted-foreground line-through opacity-60'
                  }`}>
                    {p.active ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <XCircle className="w-3.5 h-3.5 shrink-0" />}
                    <span className="text-[11px] truncate">{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handlePreviousStep}
              className="font-bold text-xs h-10 px-4"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <Button
              type="button"
              onClick={handleNextStep}
              disabled={!targetRoleId}
              className="bg-[#942392] hover:bg-[#800A7A] text-white font-black text-xs uppercase tracking-wider shadow-sm h-10 px-6 rounded-xl"
            >
              Next: Placement & Profile
              <ChevronRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: PLACEMENT & NEW COMPANY PROFILE */}
      {currentStep === 3 && (
        <div className="space-y-5">
          <div className="p-5 bg-card dark:bg-neutral-900 rounded-2xl border border-border dark:border-neutral-800 space-y-5 shadow-xs">
            <div className="space-y-1">
              <h4 className="text-xs font-black uppercase tracking-wider text-black dark:text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#942392]" />
                New Entity Placement & Profile Initialization
              </h4>
              <p className="text-[11px] text-muted-foreground">
                Set up location assignment, working schedule profile, and starting entitlement balances for {targetCompany?.company_name}.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">Assigned Branch Location *</Label>
                <Select value={targetBranchCode} onValueChange={setTargetBranchCode} disabled={targetBranches.length === 0}>
                  <SelectTrigger className="text-xs bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-bold text-black dark:text-white h-10">
                    <SelectValue placeholder={targetBranches.length === 0 ? "No branches registered in entity" : "Choose branch..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {targetBranches.map(b => (
                      <SelectItem key={b.code} value={b.code} className="text-xs font-bold">
                        {b.name} ({b.code}) — {b.location || 'Branch'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">Department *</Label>
                <Select value={targetDepartmentName} onValueChange={setTargetDepartmentName} disabled={targetDepartments.length === 0}>
                  <SelectTrigger className="text-xs bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-bold text-black dark:text-white h-10">
                    <SelectValue placeholder={targetDepartments.length === 0 ? "General Operations" : "Choose department..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {targetDepartments.map(d => (
                      <SelectItem key={d.name} value={d.name} className="text-xs font-bold">
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">Reporting Manager (Optional)</Label>
                <Input
                  value={reportingManager}
                  onChange={(e) => setReportingManager(e.target.value)}
                  placeholder="e.g. Encik Roslan (Operation Manager)"
                  className="text-xs h-10 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-bold text-black dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">Annual Leave Entitlement (Days)</Label>
                <Input
                  type="number"
                  min={0}
                  max={60}
                  value={leaveEntitlement}
                  onChange={(e) => setLeaveEntitlement(Number(e.target.value))}
                  className="text-xs h-10 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-bold text-black dark:text-white"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">Transfer Justification & Authorization Notes *</Label>
              <Input
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                placeholder="e.g. Secondment to RayRent for fleet management expansion and driver oversight"
                className="text-xs h-10 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-bold text-black dark:text-white"
                required
              />
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handlePreviousStep}
              className="font-bold text-xs h-10 px-4"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <Button
              type="button"
              onClick={handleNextStep}
              disabled={!transferReason.trim()}
              className="bg-[#942392] hover:bg-[#800A7A] text-white font-black text-xs uppercase tracking-wider shadow-sm h-10 px-6 rounded-xl"
            >
              Next: Data Impact & Finalize
              <ChevronRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 4: DATA IMPACT & FINAL CONFIRMATION */}
      {currentStep === 4 && (
        <div className="space-y-5">
          {/* Data Impact Boundary Box */}
          <div className="p-5 bg-card dark:bg-neutral-900 rounded-2xl border border-border dark:border-neutral-800 space-y-4 shadow-xs">
            <div className="space-y-1">
              <h4 className="text-xs font-black uppercase tracking-wider text-black dark:text-white flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-[#942392]" />
                Historical Data Boundary & Retention Guarantee
              </h4>
              <p className="text-[11px] text-muted-foreground">
                All records generated during employment under <strong>{selectedEmployee?.company_name || 'Rayhar Travels'}</strong> remain permanently archived under that original entity.
              </p>
            </div>

            <div className="p-4 bg-muted/30 dark:bg-neutral-800/40 rounded-xl border border-border/50 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#942392] dark:text-[#f885d5] block">
                The following records belong to {selectedEmployee?.company_name || 'Rayhar Travels'} and will remain permanently there:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {[
                  'Attendance History',
                  'Leave History',
                  'Overtime Records',
                  'Outstation Records',
                  'Payroll & Slips',
                  'Expense Claims',
                  'Analytics Reports',
                  'Company Calendar',
                  'Approval Workflow Ties',
                  'Department Logs',
                  'Branch Logs'
                ].map(item => (
                  <div key={item} className="flex items-center gap-1.5 text-foreground font-semibold text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Transfer Summary Card */}
            <div className="p-4 rounded-xl border border-[#942392]/30 bg-[#942392]/5 dark:bg-[#942392]/10 space-y-3">
              <h5 className="text-xs font-black uppercase tracking-wider text-[#942392] dark:text-[#f885d5]">
                Company Transfer Summary
              </h5>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Employee</span>
                  <strong className="text-foreground">{selectedEmployee?.full_name || selectedEmployeeId}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Source Entity</span>
                  <span className="text-muted-foreground font-bold">{selectedEmployee?.company_name || 'Rayhar Travels'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Destination Entity</span>
                  <strong className="text-[#942392] dark:text-[#f885d5] font-black">{targetCompany?.company_name}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">New Role in Entity</span>
                  <strong className="text-foreground">{selectedTargetRole?.name || 'Assigned Role'}</strong>
                </div>
              </div>
            </div>

            {/* 3 Mandatory Checkboxes */}
            <div className="p-4 rounded-xl border-2 border-amber-500/40 bg-amber-500/5 space-y-3 pt-3">
              <span className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-200 block">
                Mandatory Administrative Acknowledgements *
              </span>
              <p className="text-[11px] text-muted-foreground">
                This action cannot be automatically reversed. Please confirm all 3 acknowledgements below to enable transfer execution.
              </p>

              <div className="space-y-2 pt-1">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs select-none">
                  <input
                    type="checkbox"
                    checked={ackCompanyMove}
                    onChange={(e) => setAckCompanyMove(e.target.checked)}
                    className="mt-0.5 rounded border-gray-400 text-[#942392] focus:ring-[#942392] w-4 h-4 cursor-pointer"
                  />
                  <span className="text-foreground font-bold">
                    I understand that this employee will become part of another isolated company entity.
                  </span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer text-xs select-none">
                  <input
                    type="checkbox"
                    checked={ackHistoricalData}
                    onChange={(e) => setAckHistoricalData(e.target.checked)}
                    className="mt-0.5 rounded border-gray-400 text-[#942392] focus:ring-[#942392] w-4 h-4 cursor-pointer"
                  />
                  <span className="text-foreground font-bold">
                    I understand that company-specific historical records remain archived with the original company.
                  </span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer text-xs select-none">
                  <input
                    type="checkbox"
                    checked={ackReviewPermissions}
                    onChange={(e) => setAckReviewPermissions(e.target.checked)}
                    className="mt-0.5 rounded border-gray-400 text-[#942392] focus:ring-[#942392] w-4 h-4 cursor-pointer"
                  />
                  <span className="text-foreground font-bold">
                    I have reviewed the employee's new authorized role and permission scope in the destination entity.
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handlePreviousStep}
              className="font-bold text-xs h-10 px-4"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <Button
              type="button"
              onClick={handleExecuteTransfer}
              disabled={submitting || !allConfirmationsChecked}
              className="bg-[#942392] hover:bg-[#800A7A] text-white font-black text-xs uppercase tracking-wider shadow-md h-10 px-6 rounded-xl disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Executing Verified Transfer...
                </>
              ) : (
                <>
                  <ArrowRightLeft className="w-4 h-4 mr-2" />
                  Confirm & Execute Transfer
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
