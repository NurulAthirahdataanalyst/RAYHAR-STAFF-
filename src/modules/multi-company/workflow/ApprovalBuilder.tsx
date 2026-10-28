import React, { useState, useEffect, useMemo } from 'react';
import { multiCompanyApi } from '../services/multiCompanyApi';
import {
  CompanyRole,
  ApprovalWorkflowStep,
  CompanyBranch,
  CompanyDepartment,
  WorkflowBranchScope
} from '../types/multiCompany.types';
import {
  Plus,
  Trash2,
  ArrowDown,
  Shield,
  Check,
  Clock,
  Loader2,
  Building2,
  MapPin,
  Layers,
  GitBranch,
  Sparkles,
  UserCheck,
  Crown,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/config/api';

interface ApprovalBuilderProps {
  companyId: number;
  companyName: string;
}

interface StaffMember {
  user_id: string;
  full_name: string;
  role?: string;
  branch?: string;
  department?: string;
  status?: string;
}

export const ApprovalBuilder: React.FC<ApprovalBuilderProps> = ({ companyId, companyName }) => {
  const isMainCompany = companyId === 1 || companyName.toLowerCase().includes('rayhar travels');

  // For Main Company (Rayhar Travels): 2 distinct branch-based workflow tracks
  const [hqSteps, setHqSteps] = useState<ApprovalWorkflowStep[]>([]);
  const [branchSteps, setBranchSteps] = useState<ApprovalWorkflowStep[]>([]);
  const [activeTrackFilter, setActiveTrackFilter] = useState<'ALL' | 'HQ' | 'OTHER_BRANCHES'>('ALL');

  // For Subsidiary Companies: standard workflow steps
  const [steps, setSteps] = useState<ApprovalWorkflowStep[]>([]);

  const [availableRoles, setAvailableRoles] = useState<CompanyRole[]>([]);
  const [branches, setBranches] = useState<CompanyBranch[]>([]);
  const [departments, setDepartments] = useState<CompanyDepartment[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Build default 2-track steps for Rayhar Travels (Main Company)
  const buildDefaultRayharWorkflows = (roles: CompanyRole[]) => {
    const findRole = (targetName: string) =>
      roles.find((r) => (r.name || '').trim().toLowerCase() === targetName.toLowerCase());

    const hodRole = findRole('Head of Department');
    const omRole = findRole('Operation Manager');
    const blRole = findRole('Branch Leader');
    const mdRole = findRole('Managing Director');

    const defaultHq: ApprovalWorkflowStep[] = [
      {
        company_id: companyId,
        module: 'leave',
        branch_scope: 'HQ',
        step_order: 1,
        approver_role_id: hodRole?.id || '',
        approver_role_name: hodRole?.name || 'Head of Department',
        step_label: 'Department Review (HQ Department Only)',
        routing_rule: 'Only HQ has departments — routes to the Head of Department of the employee\'s department',
        auto_escalate_hours: 48
      },
      {
        company_id: companyId,
        module: 'leave',
        branch_scope: 'HQ',
        step_order: 2,
        approver_role_id: omRole?.id || '',
        approver_role_name: omRole?.name || 'Operation Manager',
        step_label: 'Highest Approval (Operation Manager)',
        routing_rule: 'Highest approval authority for all Rayhar HQ leave requests',
        auto_escalate_hours: 48
      }
    ];

    const defaultOtherBranches: ApprovalWorkflowStep[] = [
      {
        company_id: companyId,
        module: 'leave',
        branch_scope: 'OTHER_BRANCHES',
        step_order: 1,
        approver_role_id: blRole?.id || '',
        approver_role_name: blRole?.name || 'Branch Leader',
        step_label: 'Branch Endorsement (Own Branch Only)',
        routing_rule: 'Follows employee\'s own branch only — appears when HR creates/assigns a Branch Leader role for that branch',
        auto_escalate_hours: 48
      },
      {
        company_id: companyId,
        module: 'leave',
        branch_scope: 'OTHER_BRANCHES',
        step_order: 2,
        approver_role_id: mdRole?.id || '',
        approver_role_name: mdRole?.name || 'Managing Director',
        step_label: 'Highest Approval (Managing Director)',
        routing_rule: 'Highest approval authority for all other branches except HQ',
        auto_escalate_hours: 48
      }
    ];

    return { defaultHq, defaultOtherBranches };
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [settingsData, rolesData, mainRolesData, branchData, deptData, empRes] = await Promise.all([
          multiCompanyApi.getLeaveSettings(companyId),
          multiCompanyApi.getCompanyRoles(companyId),
          companyId !== 1 ? multiCompanyApi.getCompanyRoles(1) : Promise.resolve([]),
          multiCompanyApi.getCompanyBranches(companyId).catch(() => []),
          multiCompanyApi.getCompanyDepartments(companyId).catch(() => []),
          fetch(`${API_BASE_URL}/api/employees?role=hr_admin&status=Active`)
            .then((r) => r.json())
            .catch(() => ({ employees: [] }))
        ]);

        // Combine subsidiary roles + main company executive roles (for escalation)
        const combinedRoles = [
          ...rolesData,
          ...mainRolesData.filter(
            (r) =>
              r.scope_type === 'Parent Group Access' ||
              r.scope_type === 'Parent Group Data' ||
              ['managing director', 'operation manager', 'hr admin'].includes((r.name || '').toLowerCase())
          )
        ];
        // Deduplicate by role ID
        const uniqueRoles = Array.from(new Map(combinedRoles.map((r) => [r.id, r])).values());
        setAvailableRoles(uniqueRoles);
        setBranches(branchData || []);
        setDepartments(deptData || []);

        const rawEmps: StaffMember[] = Array.isArray(empRes?.employees)
          ? empRes.employees
          : Array.isArray(empRes?.data)
          ? empRes.data
          : [];
        setStaffList(rawEmps);

        const rawSteps = settingsData.approval_workflow || [];

        if (companyId === 1 || companyName.toLowerCase().includes('rayhar travels')) {
          const { defaultHq, defaultOtherBranches } = buildDefaultRayharWorkflows(uniqueRoles);

          // Partition raw steps into HQ and OTHER_BRANCHES tracks
          const parsedHq: ApprovalWorkflowStep[] = [];
          const parsedBranch: ApprovalWorkflowStep[] = [];

          rawSteps.forEach((s) => {
            const roleObj = uniqueRoles.find((r) => r.id === s.approver_role_id);
            const rName = (s.approver_role_name || roleObj?.name || '').toLowerCase();
            const labelLower = (s.step_label || '').toLowerCase();

            if (s.branch_scope === 'HQ') {
              parsedHq.push(s);
            } else if (s.branch_scope === 'OTHER_BRANCHES') {
              parsedBranch.push(s);
            } else if (
              labelLower.includes('[hq]') ||
              labelLower.includes('hq department') ||
              rName === 'head of department' ||
              rName === 'operation manager'
            ) {
              parsedHq.push({ ...s, branch_scope: 'HQ' });
            } else if (
              labelLower.includes('[branch]') ||
              labelLower.includes('own branch') ||
              rName === 'branch leader' ||
              rName === 'managing director'
            ) {
              parsedBranch.push({ ...s, branch_scope: 'OTHER_BRANCHES' });
            }
          });

          setHqSteps(
            parsedHq.length > 0
              ? parsedHq.map((s, i) => ({ ...s, branch_scope: 'HQ', step_order: i + 1 }))
              : defaultHq
          );
          setBranchSteps(
            parsedBranch.length > 0
              ? parsedBranch.map((s, i) => ({ ...s, branch_scope: 'OTHER_BRANCHES', step_order: i + 1 }))
              : defaultOtherBranches
          );
        } else {
          setSteps(rawSteps);
        }
      } catch (err) {
        console.error('Failed to load approval workflow:', err);
      } finally {
        setLoading(false);
      }
    };
    void fetchData();
  }, [companyId, companyName]);

  // Compute live approver mappings from active staff list
  const approverCoverage = useMemo(() => {
    const normalizeRole = (r?: string) => (r || '').toLowerCase().replace(/_/g, ' ').trim();

    const hodByDept = new Map<string, string[]>();
    const branchLeadersByBranch = new Map<string, string[]>();
    const operationManagers: string[] = [];
    const managingDirectors: string[] = [];

    staffList.forEach((emp) => {
      const r = normalizeRole(emp.role);
      const name = emp.full_name || emp.user_id;
      const bCode = (emp.branch || '').toUpperCase().trim();
      const dept = (emp.department || '').trim();

      if (r === 'head of department' || r === 'hod') {
        const key = dept || 'HQ General';
        hodByDept.set(key, [...(hodByDept.get(key) || []), name]);
      } else if (r === 'branch leader') {
        const key = bCode || 'BRANCH';
        branchLeadersByBranch.set(key, [...(branchLeadersByBranch.get(key) || []), name]);
      } else if (r === 'operation manager' || r === 'finance manager') {
        if (!operationManagers.includes(name)) operationManagers.push(name);
      } else if (r === 'managing director' || r === 'md') {
        if (!managingDirectors.includes(name)) managingDirectors.push(name);
      }
    });

    const nonHqBranches = branches.filter((b) => (b.code || '').toUpperCase() !== 'HQ');

    return {
      hodByDept,
      branchLeadersByBranch,
      operationManagers,
      managingDirectors,
      nonHqBranches
    };
  }, [staffList, branches]);

  // Handlers for Main Company (2 tracks)
  const handleAddTrackStep = (scope: 'HQ' | 'OTHER_BRANCHES') => {
    const defaultRoleId = availableRoles.length > 0 ? availableRoles[0].id : '';
    if (scope === 'HQ') {
      const newStep: ApprovalWorkflowStep = {
        company_id: companyId,
        module: 'leave',
        branch_scope: 'HQ',
        step_order: hqSteps.length + 1,
        approver_role_id: defaultRoleId,
        step_label: hqSteps.length === 0 ? 'Department Review (HQ Department Only)' : 'Highest Approval (Operation Manager)',
        routing_rule:
          hqSteps.length === 0
            ? 'Only HQ has departments — routes to the Head of Department of the employee\'s department'
            : 'Highest approval authority for Rayhar HQ leave requests',
        auto_escalate_hours: 48
      };
      setHqSteps([...hqSteps, newStep]);
    } else {
      const newStep: ApprovalWorkflowStep = {
        company_id: companyId,
        module: 'leave',
        branch_scope: 'OTHER_BRANCHES',
        step_order: branchSteps.length + 1,
        approver_role_id: defaultRoleId,
        step_label: branchSteps.length === 0 ? 'Branch Endorsement (Own Branch Only)' : 'Highest Approval (Managing Director)',
        routing_rule:
          branchSteps.length === 0
            ? 'Follows employee\'s own branch only — appears when HR creates/assigns a Branch Leader role for that branch'
            : 'Highest approval authority for all other branches except HQ',
        auto_escalate_hours: 48
      };
      setBranchSteps([...branchSteps, newStep]);
    }
  };

  const handleRemoveTrackStep = (scope: 'HQ' | 'OTHER_BRANCHES', index: number) => {
    if (scope === 'HQ') {
      const updated = hqSteps
        .filter((_, idx) => idx !== index)
        .map((s, idx) => ({ ...s, step_order: idx + 1 }));
      setHqSteps(updated);
    } else {
      const updated = branchSteps
        .filter((_, idx) => idx !== index)
        .map((s, idx) => ({ ...s, step_order: idx + 1 }));
      setBranchSteps(updated);
    }
  };

  const handleUpdateTrackStep = (
    scope: 'HQ' | 'OTHER_BRANCHES',
    index: number,
    field: keyof ApprovalWorkflowStep,
    value: any
  ) => {
    if (scope === 'HQ') {
      const updated = [...hqSteps];
      updated[index] = { ...updated[index], [field]: value };
      if (field === 'approver_role_id') {
        const found = availableRoles.find((r) => r.id === value);
        if (found) updated[index].approver_role_name = found.name;
      }
      setHqSteps(updated);
    } else {
      const updated = [...branchSteps];
      updated[index] = { ...updated[index], [field]: value };
      if (field === 'approver_role_id') {
        const found = availableRoles.find((r) => r.id === value);
        if (found) updated[index].approver_role_name = found.name;
      }
      setBranchSteps(updated);
    }
  };

  const handleResetDefaultRayhar = () => {
    const { defaultHq, defaultOtherBranches } = buildDefaultRayharWorkflows(availableRoles);
    setHqSteps(defaultHq);
    setBranchSteps(defaultOtherBranches);
    toast.info('Reset to Rayhar Travels default branch-based workflows (HQ & Other Branches)');
  };

  // Handlers for Subsidiary Companies
  const handleAddStep = () => {
    const defaultRoleId = availableRoles.length > 0 ? availableRoles[0].id : '';
    const newStep: ApprovalWorkflowStep = {
      company_id: companyId,
      module: 'leave',
      branch_scope: 'ALL',
      step_order: steps.length + 1,
      approver_role_id: defaultRoleId,
      step_label:
        steps.length === 0
          ? 'Initial Endorsement'
          : steps.length === 1
          ? 'Department Review'
          : 'Final Sign-off',
      auto_escalate_hours: 48
    };
    setSteps([...steps, newStep]);
  };

  const handleRemoveStep = (index: number) => {
    const updated = steps
      .filter((_, idx) => idx !== index)
      .map((s, idx) => ({
        ...s,
        step_order: idx + 1
      }));
    setSteps(updated);
  };

  const handleUpdateStep = (index: number, field: keyof ApprovalWorkflowStep, value: any) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], [field]: value };
    setSteps(updated);
  };

  const handleSave = async () => {
    const combinedToSave: ApprovalWorkflowStep[] = isMainCompany
      ? [
          ...hqSteps.map((s, idx) => ({
            ...s,
            branch_scope: 'HQ' as WorkflowBranchScope,
            step_order: idx + 1
          })),
          ...branchSteps.map((s, idx) => ({
            ...s,
            branch_scope: 'OTHER_BRANCHES' as WorkflowBranchScope,
            step_order: idx + 1
          }))
        ]
      : steps.map((s, idx) => ({
          ...s,
          branch_scope: (s.branch_scope || 'ALL') as WorkflowBranchScope,
          step_order: idx + 1
        }));

    if (combinedToSave.some((s) => !s.approver_role_id)) {
      toast.error('All steps must have an assigned approver role');
      return;
    }

    try {
      setSaving(true);
      await multiCompanyApi.saveApprovalWorkflow(companyId, combinedToSave);
      toast.success(`Leave approval workflow saved for ${companyName}!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save approval workflow');
    } finally {
      setSaving(false);
    }
  };

  // Helper to render role-specific live coverage details inside a step card
  const renderRoleCoverageDetails = (roleId: string, scope: 'HQ' | 'OTHER_BRANCHES') => {
    const roleObj = availableRoles.find((r) => r.id === roleId);
    const roleNameLower = (roleObj?.name || '').toLowerCase().trim();

    if (roleNameLower === 'head of department') {
      return (
        <div className="mt-2.5 pt-2.5 border-t border-border/50 dark:border-neutral-800 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#942392] dark:text-[#f885d5] flex items-center gap-1">
              <Layers className="w-3 h-3" />
              Rayhar HQ Departments (Only HQ Has Departments):
            </span>
            <Badge
              variant="outline"
              className="text-[9px] font-bold border-purple-500/30 bg-purple-500/10 text-[#942392] dark:text-purple-300"
            >
              {departments.length} HQ Departments
            </Badge>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {departments.map((d) => {
              const hodNames = approverCoverage.hodByDept.get(d.name) || [];
              const hasHod = hodNames.length > 0;
              return (
                <div
                  key={d.id}
                  className={`px-2 py-1 rounded-lg border text-[10px] flex items-center gap-1.5 ${
                    hasHod
                      ? 'border-emerald-500/30 bg-emerald-500/5 text-foreground'
                      : 'border-border/60 bg-muted/30 text-muted-foreground'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      hasHod ? 'bg-emerald-500' : 'bg-amber-400'
                    }`}
                  />
                  <span className="font-black">{d.name}</span>
                  {hasHod && (
                    <span className="text-[9px] font-semibold text-emerald-700 dark:text-emerald-300">
                      • {hodNames.join(', ')}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (roleNameLower === 'branch leader') {
      const assignedBranches = approverCoverage.nonHqBranches.filter((b) =>
        approverCoverage.branchLeadersByBranch.has((b.code || '').toUpperCase())
      );
      const unassignedBranches = approverCoverage.nonHqBranches.filter(
        (b) => !approverCoverage.branchLeadersByBranch.has((b.code || '').toUpperCase())
      );

      return (
        <div className="mt-2.5 pt-2.5 border-t border-border/50 dark:border-neutral-800 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              Follows Employee&apos;s Own Branch Only (Appears When HR Assigns Branch Leader):
            </span>
            <Badge
              variant="outline"
              className="text-[9px] font-bold border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            >
              {assignedBranches.length} Active Branch Leader Branches
            </Badge>
          </div>

          {assignedBranches.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {assignedBranches.map((b) => {
                const leaders = approverCoverage.branchLeadersByBranch.get((b.code || '').toUpperCase()) || [];
                return (
                  <div
                    key={b.code}
                    className="px-2 py-1 rounded-lg border border-emerald-500/30 bg-emerald-500/5 text-[10px] flex items-center gap-1.5"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="font-mono font-black text-foreground">{b.code}</span>
                    <span className="text-muted-foreground font-semibold">({b.name})</span>
                    <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-300">
                      • {leaders.join(', ')}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {unassignedBranches.length > 0 && (
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Branches awaiting Branch Leader role assignment:</strong>{' '}
              {unassignedBranches.map((b) => b.code).join(', ')} —{' '}
              <span className="italic">
                Step 1 automatically activates for any branch as soon as HR creates/assigns a Branch Leader for that branch.
              </span>
            </p>
          )}
        </div>
      );
    }

    if (roleNameLower === 'operation manager') {
      return (
        <div className="mt-2.5 pt-2.5 border-t border-border/50 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-2 text-[10px]">
          <span className="font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1">
            <Crown className="w-3 h-3" />
            Highest Approval for {scope === 'HQ' ? 'Rayhar HQ' : 'Selected Scope'}:
          </span>
          <span className="font-bold text-foreground">
            {approverCoverage.operationManagers.length > 0
              ? approverCoverage.operationManagers.join(', ')
              : 'Operation Manager (HQ)'}
          </span>
        </div>
      );
    }

    if (roleNameLower === 'managing director') {
      return (
        <div className="mt-2.5 pt-2.5 border-t border-border/50 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-2 text-[10px]">
          <span className="font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1">
            <Crown className="w-3 h-3" />
            Highest Approval for {scope === 'OTHER_BRANCHES' ? 'All Other Branches (Except HQ)' : 'Selected Scope'}:
          </span>
          <span className="font-bold text-foreground">
            {approverCoverage.managingDirectors.length > 0
              ? approverCoverage.managingDirectors.join(', ')
              : 'Managing Director (HQ)'}
          </span>
        </div>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-[#942392]" />
        Loading approval workflow...
      </div>
    );
  }

  // ============================================================================
  // RENDER FOR RAYHAR TRAVELS (MAIN COMPANY) — 2 BRANCH-BASED WORKFLOWS
  // ============================================================================
  if (isMainCompany) {
    const showHq = activeTrackFilter === 'ALL' || activeTrackFilter === 'HQ';
    const showBranches = activeTrackFilter === 'ALL' || activeTrackFilter === 'OTHER_BRANCHES';

    return (
      <div className="space-y-5">
        {/* Header Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs font-black uppercase tracking-wider text-foreground dark:text-neutral-200">
                Multi-Tier Leave Approval Sequence
              </h4>
              <Badge className="bg-[#942392]/10 text-[#942392] dark:text-[#f885d5] border border-[#942392]/25 text-[10px] font-black uppercase tracking-wider">
                <GitBranch className="w-3 h-3 mr-1" />
                2 Branch-Based Workflows Active
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Branch-based step-by-step sign-off routing configured for <strong className="text-foreground">{companyName}</strong> (Rayhar HQ vs. Other Branches)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetDefaultRayhar}
              className="text-xs font-bold border-border hover:bg-muted h-8"
              title="Reset to standard Rayhar HQ & Branch workflows"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Reset Default
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="bg-[#942392] hover:bg-[#800A7A] text-white font-bold text-xs h-8 shadow-xs"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Check className="w-3.5 h-3.5 mr-1" />}
              Save Workflow
            </Button>
          </div>
        </div>

        {/* Branch-Based Routing Summary Banner */}
        <div className="p-3.5 bg-[#942392]/5 dark:bg-[#942392]/10 rounded-xl border border-[#942392]/20 flex items-start gap-3 text-xs">
          <div className="p-1.5 rounded-lg bg-[#942392] text-white shrink-0 mt-0.5">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div className="space-y-1.5 flex-1">
            <span className="font-black text-[#942392] dark:text-[#f885d5] uppercase tracking-wider block text-[11px]">
              Branch-Based Leave Approval Routing Rules — {companyName}
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-muted-foreground dark:text-neutral-300">
              <div className="p-2 rounded-lg bg-background/80 dark:bg-neutral-900/70 border border-border/60">
                <strong className="text-foreground block uppercase text-[10px] tracking-wider text-[#942392] dark:text-[#f885d5]">
                  1. Rayhar HQ (HQ Branch Only)
                </strong>
                Employee Submits → <strong className="text-foreground">Step 1: Head of Department</strong>{' '}
                <span className="italic">(Only HQ has departments)</span> →{' '}
                <strong className="text-foreground">Step 2 (Highest Approval): Operation Manager</strong>
              </div>
              <div className="p-2 rounded-lg bg-background/80 dark:bg-neutral-900/70 border border-border/60">
                <strong className="text-foreground block uppercase text-[10px] tracking-wider text-emerald-700 dark:text-emerald-400">
                  2. Other Branches (All Branches Except HQ)
                </strong>
                Employee Submits → <strong className="text-foreground">Step 1: Branch Leader</strong>{' '}
                <span className="italic">(Follows own branch only; appears when HR creates/assigns Branch Leader for that branch)</span> →{' '}
                <strong className="text-foreground">Step 2 (Highest Approval): Managing Director</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Branch Workflow Scope Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 dark:border-neutral-800 pb-3">
          <button
            type="button"
            onClick={() => setActiveTrackFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTrackFilter === 'ALL'
                ? 'bg-[#942392] text-white shadow-xs'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            All Branch Workflows (2)
          </button>
          <button
            type="button"
            onClick={() => setActiveTrackFilter('HQ')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTrackFilter === 'HQ'
                ? 'bg-[#942392] text-white shadow-xs'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            1. Rayhar HQ Workflow
          </button>
          <button
            type="button"
            onClick={() => setActiveTrackFilter('OTHER_BRANCHES')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTrackFilter === 'OTHER_BRANCHES'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            2. Other Branches (Except HQ)
          </button>
        </div>

        {/* Two Workflow Tracks Grid */}
        <div
          className={`grid grid-cols-1 ${
            activeTrackFilter === 'ALL' ? 'xl:grid-cols-2' : ''
          } gap-5 items-start`}
        >
          {/* ============================================================== */}
          {/* TRACK 1: RAYHAR HQ WORKFLOW                                    */}
          {/* ============================================================== */}
          {showHq && (
            <div className="rounded-2xl border-2 border-[#942392]/25 bg-card/60 dark:bg-neutral-900/50 p-4 space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border/60 dark:border-neutral-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-md bg-[#942392] text-white text-[10px] font-black uppercase tracking-wider">
                      Workflow 1 • Rayhar HQ
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-[#942392]/10 text-[#942392] dark:text-[#f885d5] border border-[#942392]/20 text-[10px] font-bold">
                      Branch: HQ Only
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-medium">
                    Department-based approval sequence (Only HQ has departments; highest approval is Operation Manager)
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddTrackStep('HQ')}
                  className="text-xs font-bold border-[#942392]/30 hover:bg-[#942392]/10 text-[#942392] h-8 shrink-0 self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add HQ Step
                </Button>
              </div>

              {/* Entry Trigger Pill */}
              <div className="p-2.5 rounded-xl bg-muted/40 dark:bg-neutral-800/50 border border-dashed border-border flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#942392]/15 text-[#942392] flex items-center justify-center font-black text-[10px]">
                    0
                  </div>
                  <div>
                    <span className="font-black text-foreground uppercase text-[10px] tracking-wider block">
                      Trigger: Employee Submits Leave Request (Rayhar HQ)
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Applies to all staff assigned to branch <strong>HQ (Rayhar HQ)</strong>
                    </span>
                  </div>
                </div>
                <Badge variant="outline" className="text-[9px] font-bold">
                  Start
                </Badge>
              </div>

              <div className="flex justify-center -my-2">
                <ArrowDown className="w-4 h-4 text-[#942392]/60" />
              </div>

              {/* HQ Steps */}
              <div className="space-y-3">
                {hqSteps.map((step, idx) => {
                  const isLast = idx === hqSteps.length - 1;
                  return (
                    <React.Fragment key={`hq-${idx}`}>
                      <div className="p-4 rounded-xl border border-border dark:border-neutral-800 bg-background dark:bg-neutral-900 shadow-xs transition-all hover:border-[#942392]/40">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="flex items-start sm:items-center gap-3 w-full">
                            <div className="w-7 h-7 rounded-lg bg-[#942392] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs mt-1 sm:mt-0">
                              {idx + 1}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 flex-1">
                              <div>
                                <div className="flex items-center gap-1.5 mb-1">
                                  <Label className="text-[10px] font-black text-black dark:text-white uppercase tracking-wider">
                                    Step {idx + 1} Label
                                  </Label>
                                  {isLast && (
                                    <span className="px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[9px] font-black uppercase">
                                      Highest Approval
                                    </span>
                                  )}
                                </div>
                                <Input
                                  value={step.step_label}
                                  onChange={(e) => handleUpdateTrackStep('HQ', idx, 'step_label', e.target.value)}
                                  placeholder="e.g. Department Review"
                                  className="text-xs h-8 bg-card dark:bg-neutral-950 border-border dark:border-neutral-800 w-full font-medium text-black dark:text-white"
                                />
                              </div>

                              <div>
                                <Label className="text-[10px] font-black text-black dark:text-white uppercase tracking-wider block mb-1">
                                  Approver Role (HQ Step {idx + 1})
                                </Label>
                                <Select
                                  value={step.approver_role_id}
                                  onValueChange={(val) => handleUpdateTrackStep('HQ', idx, 'approver_role_id', val)}
                                >
                                  <SelectTrigger className="text-xs h-8 bg-card dark:bg-neutral-950 border-border dark:border-neutral-800 w-full font-bold text-black dark:text-white">
                                    <SelectValue placeholder="Select approver role..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableRoles.map((r) => (
                                      <SelectItem key={r.id} value={r.id} className="text-xs font-medium">
                                        {r.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                            {hqSteps.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveTrackStep('HQ', idx)}
                                className="text-destructive hover:bg-destructive/10 h-7 px-2"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {step.routing_rule && (
                          <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1.5">
                            <UserCheck className="w-3 h-3 text-[#942392] shrink-0" />
                            <span>{step.routing_rule}</span>
                          </p>
                        )}

                        {renderRoleCoverageDetails(step.approver_role_id, 'HQ')}
                      </div>

                      {!isLast && (
                        <div className="flex justify-center -my-1">
                          <ArrowDown className="w-4 h-4 text-[#942392]/60 animate-bounce" />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TRACK 2: OTHER BRANCHES (EXCEPT HQ) WORKFLOW                   */}
          {/* ============================================================== */}
          {showBranches && (
            <div className="rounded-2xl border-2 border-emerald-600/25 bg-card/60 dark:bg-neutral-900/50 p-4 space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border/60 dark:border-neutral-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider">
                      Workflow 2 • Other Branches (Except HQ)
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-[10px] font-bold">
                      {approverCoverage.nonHqBranches.length} Non-HQ Branches
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-medium">
                    Branch-scoped approval sequence (Follows employee&apos;s own branch only; highest approval is Managing Director)
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddTrackStep('OTHER_BRANCHES')}
                  className="text-xs font-bold border-emerald-600/30 hover:bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 h-8 shrink-0 self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add Branch Step
                </Button>
              </div>

              {/* Entry Trigger Pill */}
              <div className="p-2.5 rounded-xl bg-muted/40 dark:bg-neutral-800/50 border border-dashed border-border flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-black text-[10px]">
                    0
                  </div>
                  <div>
                    <span className="font-black text-foreground uppercase text-[10px] tracking-wider block">
                      Trigger: Employee Submits Leave Request (Other Branch Except HQ)
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Applies to all branches except HQ (e.g. AOR, BBB, DGN, SHA, SNS, TGG, etc.)
                    </span>
                  </div>
                </div>
                <Badge variant="outline" className="text-[9px] font-bold">
                  Start
                </Badge>
              </div>

              <div className="flex justify-center -my-2">
                <ArrowDown className="w-4 h-4 text-emerald-600/60" />
              </div>

              {/* Other Branches Steps */}
              <div className="space-y-3">
                {branchSteps.map((step, idx) => {
                  const isLast = idx === branchSteps.length - 1;
                  return (
                    <React.Fragment key={`branch-${idx}`}>
                      <div className="p-4 rounded-xl border border-border dark:border-neutral-800 bg-background dark:bg-neutral-900 shadow-xs transition-all hover:border-emerald-600/40">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="flex items-start sm:items-center gap-3 w-full">
                            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs mt-1 sm:mt-0">
                              {idx + 1}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 flex-1">
                              <div>
                                <div className="flex items-center gap-1.5 mb-1">
                                  <Label className="text-[10px] font-black text-black dark:text-white uppercase tracking-wider">
                                    Step {idx + 1} Label
                                  </Label>
                                  {isLast && (
                                    <span className="px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[9px] font-black uppercase">
                                      Highest Approval
                                    </span>
                                  )}
                                </div>
                                <Input
                                  value={step.step_label}
                                  onChange={(e) =>
                                    handleUpdateTrackStep('OTHER_BRANCHES', idx, 'step_label', e.target.value)
                                  }
                                  placeholder="e.g. Branch Endorsement"
                                  className="text-xs h-8 bg-card dark:bg-neutral-950 border-border dark:border-neutral-800 w-full font-medium text-black dark:text-white"
                                />
                              </div>

                              <div>
                                <Label className="text-[10px] font-black text-black dark:text-white uppercase tracking-wider block mb-1">
                                  Approver Role (Branch Step {idx + 1})
                                </Label>
                                <Select
                                  value={step.approver_role_id}
                                  onValueChange={(val) =>
                                    handleUpdateTrackStep('OTHER_BRANCHES', idx, 'approver_role_id', val)
                                  }
                                >
                                  <SelectTrigger className="text-xs h-8 bg-card dark:bg-neutral-950 border-border dark:border-neutral-800 w-full font-bold text-black dark:text-white">
                                    <SelectValue placeholder="Select approver role..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableRoles.map((r) => (
                                      <SelectItem key={r.id} value={r.id} className="text-xs font-medium">
                                        {r.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                            {branchSteps.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveTrackStep('OTHER_BRANCHES', idx)}
                                className="text-destructive hover:bg-destructive/10 h-7 px-2"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {step.routing_rule && (
                          <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1.5">
                            <UserCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>{step.routing_rule}</span>
                          </p>
                        )}

                        {renderRoleCoverageDetails(step.approver_role_id, 'OTHER_BRANCHES')}
                      </div>

                      {!isLast && (
                        <div className="flex justify-center -my-1">
                          <ArrowDown className="w-4 h-4 text-emerald-600/60 animate-bounce" />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER FOR SUBSIDIARY COMPANIES — STANDARD CONFIGURABLE WORKFLOW
  // ============================================================================
  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-foreground dark:text-neutral-200">
            Multi-Tier Leave Approval Sequence
          </h4>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Configure step-by-step sign-off routing for {companyName}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddStep}
            className="text-xs font-bold border-[#942392]/30 hover:bg-[#942392]/10 text-[#942392] h-8"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Step
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="bg-[#942392] hover:bg-[#800A7A] text-white font-bold text-xs h-8 shadow-xs"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Check className="w-3.5 h-3.5 mr-1" />}
            Save Workflow
          </Button>
        </div>
      </div>

      {steps.length === 0 ? (
        <div className="p-8 border border-dashed border-border dark:border-neutral-800 rounded-xl text-center space-y-2">
          <Shield className="w-8 h-8 mx-auto text-muted-foreground/40" />
          <p className="text-xs text-muted-foreground font-medium">
            No approval steps configured for {companyName}. Click &quot;+ Add Step&quot; to create an approval ladder.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {steps.map((step, idx) => {
            const isLast = idx === steps.length - 1;

            return (
              <React.Fragment key={idx}>
                <div className="p-4 rounded-xl border border-border dark:border-neutral-800 bg-card dark:bg-card/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all hover:border-[#942392]/30">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="w-7 h-7 rounded-lg bg-[#942392] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                      {idx + 1}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1 sm:flex-initial">
                      <div>
                        <Label className="text-[10px] font-black text-black dark:text-white uppercase tracking-wider">
                          Step Label
                        </Label>
                        <Input
                          value={step.step_label}
                          onChange={(e) => handleUpdateStep(idx, 'step_label', e.target.value)}
                          placeholder="e.g. Branch Endorsement"
                          className="text-xs h-8 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 w-44 font-medium placeholder:font-normal text-black dark:text-white"
                        />
                      </div>

                      <div>
                        <Label className="text-[10px] font-black text-black dark:text-white uppercase tracking-wider">
                          Approver Role
                        </Label>
                        <Select
                          value={step.approver_role_id}
                          onValueChange={(val) => handleUpdateStep(idx, 'approver_role_id', val)}
                        >
                          <SelectTrigger className="text-xs h-8 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 w-52 font-medium data-[placeholder]:font-normal text-black dark:text-white">
                            <SelectValue placeholder="Select approver..." />
                          </SelectTrigger>
                          <SelectContent>
                            {availableRoles.map((r) => (
                              <SelectItem key={r.id} value={r.id} className="text-xs">
                                {r.name} {r.scope_type === 'Parent Group Access' || r.scope_type === 'Parent Group Data' ? '(Group Executive)' : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveStep(idx)}
                      className="text-destructive hover:bg-destructive/10 h-8 px-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {!isLast && (
                  <div className="flex justify-center -my-1">
                    <ArrowDown className="w-4 h-4 text-[#942392]/60 animate-bounce" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
};
