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
  RotateCcw,
  CheckSquare,
  Square,
  Search,
  ChevronDown,
  ChevronUp,
  Filter,
  CheckCircle2,
  AlertCircle
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

export interface WorkflowTrack {
  id: string;
  name: string;
  scopeType: 'HQ' | 'OTHER_BRANCHES' | 'ALL' | 'CUSTOM';
  selectedBranches: string[]; // branch codes
  steps: ApprovalWorkflowStep[];
  isBranchPickerOpen?: boolean;
  branchSearch?: string;
}

export const ApprovalBuilder: React.FC<ApprovalBuilderProps> = ({ companyId, companyName }) => {
  const isMainCompany = companyId === 1 || companyName.toLowerCase().includes('rayhar travels');

  const [tracks, setTracks] = useState<WorkflowTrack[]>([]);
  const [activeTrackFilter, setActiveTrackFilter] = useState<string>('ALL');

  const [availableRoles, setAvailableRoles] = useState<CompanyRole[]>([]);
  const [branches, setBranches] = useState<CompanyBranch[]>([]);
  const [departments, setDepartments] = useState<CompanyDepartment[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reset active track tab when company switches
  useEffect(() => {
    setActiveTrackFilter('ALL');
  }, [companyId]);

  // Helper to build default workflows for Rayhar Travels (Main Company)
  const buildDefaultRayharTracks = (roles: CompanyRole[], branchList: CompanyBranch[]): WorkflowTrack[] => {
    const findRole = (targetName: string) =>
      roles.find((r) => (r.name || '').trim().toLowerCase() === targetName.toLowerCase());

    const hodRole = findRole('Head of Department');
    const omRole = findRole('Operation Manager');
    const blRole = findRole('Branch Leader');
    const mdRole = findRole('Managing Director');

    const nonHqBranchCodes = branchList
      .filter((b) => (b.code || '').toUpperCase() !== 'HQ')
      .map((b) => b.code);

    const hqTrack: WorkflowTrack = {
      id: 'wf-rayhar-hq',
      name: '1. Rayhar Travels Sdn Bhd — Headquarters (HQ)',
      scopeType: 'HQ',
      selectedBranches: ['HQ'],
      steps: [
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
      ]
    };

    const otherBranchesTrack: WorkflowTrack = {
      id: 'wf-rayhar-branches',
      name: '2. Other Regional Branches (Except HQ)',
      scopeType: 'OTHER_BRANCHES',
      selectedBranches: nonHqBranchCodes.length > 0 ? nonHqBranchCodes : ['AOR', 'BBB', 'TGG', 'KBR'],
      steps: [
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
      ]
    };

    return [hqTrack, otherBranchesTrack];
  };

  // Helper to build default workflows for Subsidiary Companies
  const buildDefaultSubsidiaryTracks = (roles: CompanyRole[], branchList: CompanyBranch[]): WorkflowTrack[] => {
    const findRole = (targetName: string) =>
      roles.find((r) => (r.name || '').trim().toLowerCase() === targetName.toLowerCase());

    const blRole = findRole('Branch Leader') || findRole('Branch Admin') || roles[0];
    const allBranchCodes = branchList.map((b) => b.code);

    const subTrack: WorkflowTrack = {
      id: `wf-sub-${companyId}`,
      name: `Workflow 1 • ${companyName} Approval Workflow`,
      scopeType: 'ALL',
      selectedBranches: allBranchCodes.length > 0 ? allBranchCodes : ['RAYRENT'],
      steps: [
        {
          company_id: companyId,
          module: 'leave',
          branch_scope: 'ALL',
          step_order: 1,
          approver_role_id: blRole?.id || '',
          approver_role_name: blRole?.name || 'Branch Leader',
          step_label: 'Highest Approval (Branch Leader)',
          routing_rule: `Highest approval authority for ${companyName} leave applicants`,
          auto_escalate_hours: 48
        }
      ]
    };

    return [subTrack];
  };

  // Load Data
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

        const combinedRoles = [
          ...rolesData,
          ...mainRolesData.filter(
            (r) =>
              r.scope_type === 'Parent Group Access' ||
              r.scope_type === 'Parent Group Data' ||
              ['managing director', 'operation manager', 'hr admin'].includes((r.name || '').toLowerCase())
          )
        ];
        const uniqueRoles = Array.from(new Map(combinedRoles.map((r) => [r.id, r])).values());
        setAvailableRoles(uniqueRoles);

        const currentBranches: CompanyBranch[] = Array.isArray(branchData) && branchData.length > 0 
          ? branchData 
          : isMainCompany 
            ? [{ id: 1, company_id: 1, code: 'HQ', name: 'Rayhar HQ' }]
            : [{ id: 2, company_id: companyId, code: 'RAYRENT', name: `${companyName} Branch` }];

        setBranches(currentBranches);
        setDepartments(deptData || []);

        const rawEmps: StaffMember[] = Array.isArray(empRes?.employees)
          ? empRes.employees
          : Array.isArray(empRes?.data)
          ? empRes.data
          : [];
        setStaffList(rawEmps);

        const rawSteps: ApprovalWorkflowStep[] = settingsData.approval_workflow || [];

        if (isMainCompany) {
          const defaultTracks = buildDefaultRayharTracks(uniqueRoles, currentBranches);

          if (rawSteps.length === 0) {
            setTracks(defaultTracks);
          } else {
            // Group raw steps by branch_scope or custom track identifier
            const hqSteps: ApprovalWorkflowStep[] = [];
            const branchSteps: ApprovalWorkflowStep[] = [];
            const customGroups = new Map<string, ApprovalWorkflowStep[]>();

            rawSteps.forEach((s) => {
              const scope = s.branch_scope || 'HQ';
              if (scope === 'HQ') {
                hqSteps.push(s);
              } else if (scope === 'OTHER_BRANCHES') {
                branchSteps.push(s);
              } else if (scope.startsWith('BRANCHES:') || scope.includes(',')) {
                customGroups.set(scope, [...(customGroups.get(scope) || []), s]);
              } else {
                // Determine by label or approver role
                const rName = (s.approver_role_name || '').toLowerCase();
                if (rName.includes('head of department') || rName.includes('operation manager')) {
                  hqSteps.push({ ...s, branch_scope: 'HQ' });
                } else {
                  branchSteps.push({ ...s, branch_scope: 'OTHER_BRANCHES' });
                }
              }
            });

            const parsedTracks: WorkflowTrack[] = [];

            // Track 1: HQ
            parsedTracks.push({
              id: 'wf-rayhar-hq',
              name: 'Workflow 1 • Rayhar HQ',
              scopeType: 'HQ',
              selectedBranches: ['HQ'],
              steps: hqSteps.length > 0
                ? hqSteps.map((s, idx) => ({ ...s, step_order: idx + 1, branch_scope: 'HQ' }))
                : defaultTracks[0].steps
            });

            // Track 2: Other Branches
            const nonHqBranchCodes = currentBranches
              .filter((b) => (b.code || '').toUpperCase() !== 'HQ')
              .map((b) => b.code);

            parsedTracks.push({
              id: 'wf-rayhar-branches',
              name: 'Workflow 2 • Other Branches (Except HQ)',
              scopeType: 'OTHER_BRANCHES',
              selectedBranches: nonHqBranchCodes,
              steps: branchSteps.length > 0
                ? branchSteps.map((s, idx) => ({ ...s, step_order: idx + 1, branch_scope: 'OTHER_BRANCHES' }))
                : defaultTracks[1].steps
            });

            // Any extra custom tracks
            let customCounter = 3;
            customGroups.forEach((stepsList, scopeKey) => {
              const rawCodes = scopeKey.replace('BRANCHES:', '').split(',').map((c) => c.trim()).filter(Boolean);
              parsedTracks.push({
                id: `wf-custom-${customCounter}`,
                name: `Workflow ${customCounter} • Custom Branch Track`,
                scopeType: 'CUSTOM',
                selectedBranches: rawCodes,
                steps: stepsList.map((s, idx) => ({ ...s, step_order: idx + 1 }))
              });
              customCounter++;
            });

            setTracks(parsedTracks);
          }
        } else {
          // Subsidiary company (e.g. RayRent)
          const defaultSubTracks = buildDefaultSubsidiaryTracks(uniqueRoles, currentBranches);

          if (rawSteps.length === 0) {
            setTracks(defaultSubTracks);
          } else {
            // Group steps by branch_scope if multiple exist
            const scopeGroups = new Map<string, ApprovalWorkflowStep[]>();
            rawSteps.forEach((s) => {
              const scope = s.branch_scope || 'ALL';
              scopeGroups.set(scope, [...(scopeGroups.get(scope) || []), s]);
            });

            const parsedTracks: WorkflowTrack[] = [];
            let wIndex = 1;

            scopeGroups.forEach((stepsList, scopeKey) => {
              let selected: string[] = [];
              if (scopeKey === 'ALL') {
                selected = currentBranches.map((b) => b.code);
              } else if (scopeKey.startsWith('BRANCHES:') || scopeKey.includes(',')) {
                selected = scopeKey.replace('BRANCHES:', '').split(',').map((c) => c.trim()).filter(Boolean);
              } else {
                selected = [scopeKey];
              }

              parsedTracks.push({
                id: `wf-${companyId}-${wIndex}`,
                name: `Workflow ${wIndex} • ${companyName}`,
                scopeType: scopeKey === 'ALL' ? 'ALL' : 'CUSTOM',
                selectedBranches: selected,
                steps: stepsList.map((s, idx) => ({ ...s, step_order: idx + 1 }))
              });
              wIndex++;
            });

            setTracks(parsedTracks.length > 0 ? parsedTracks : defaultSubTracks);
          }
        }
      } catch (err) {
        console.error('Failed to load approval workflow:', err);
      } finally {
        setLoading(false);
      }
    };
    void fetchData();
  }, [companyId, companyName]);

  // Live approver coverage details from active staff list
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

  // Handler: Add New Workflow Track
  const handleAddWorkflow = () => {
    const defaultRoleId = availableRoles.length > 0 ? availableRoles[0].id : '';
    const newIndex = tracks.length + 1;

    // Prioritize HQ branch for the first trigger if HQ is in branch list
    const hasHq = branches.some((b) => (b.code || '').toUpperCase() === 'HQ');
    const initialBranches = hasHq 
      ? ['HQ'] 
      : branches.length > 0 ? [branches[0].code] : ['HQ'];

    const newTrack: WorkflowTrack = {
      id: `wf-${Date.now()}`,
      name: `Workflow ${newIndex} • Branch Approval Flow`,
      scopeType: initialBranches[0] === 'HQ' ? 'HQ' : 'CUSTOM',
      selectedBranches: initialBranches,
      steps: [
        {
          company_id: companyId,
          module: 'leave',
          branch_scope: initialBranches[0] === 'HQ' ? 'HQ' : initialBranches.join(','),
          step_order: 1,
          approver_role_id: defaultRoleId,
          approver_role_name: availableRoles[0]?.name || 'Approver',
          step_label: initialBranches[0] === 'HQ' ? 'Department Review (HQ Department Only)' : 'Branch Endorsement (Own Branch Only)',
          routing_rule: initialBranches[0] === 'HQ' ? 'Only HQ has departments — routes to Head of Department' : 'Follows employee\'s own branch only',
          auto_escalate_hours: 48
        },
        {
          company_id: companyId,
          module: 'leave',
          branch_scope: initialBranches[0] === 'HQ' ? 'HQ' : initialBranches.join(','),
          step_order: 2,
          approver_role_id: availableRoles.length > 1 ? availableRoles[1].id : defaultRoleId,
          approver_role_name: availableRoles[1]?.name || 'Highest Approval',
          step_label: 'Highest Approval (Final Sign-off)',
          routing_rule: 'Highest approval authority for assigned scope',
          auto_escalate_hours: 48
        }
      ],
      isBranchPickerOpen: true
    };

    setTracks([...tracks, newTrack]);
    setActiveTrackFilter(newTrack.id);
    toast.success(`New workflow track added! First trigger set to ${initialBranches[0] === 'HQ' ? 'Rayhar HQ' : initialBranches[0]}.`);
  };

  // Handler: Remove Workflow Track
  const handleRemoveWorkflow = (trackIndex: number) => {
    if (tracks.length <= 1) {
      toast.error('At least one approval workflow track must remain configured.');
      return;
    }
    const updated = tracks.filter((_, idx) => idx !== trackIndex);
    setTracks(updated);
    setActiveTrackFilter('ALL');
    toast.info('Workflow track removed.');
  };

  // Handler: Update Workflow Title
  const handleUpdateTrackName = (trackIndex: number, newName: string) => {
    const updated = [...tracks];
    updated[trackIndex] = { ...updated[trackIndex], name: newName };
    setTracks(updated);
  };

  // Handler: Toggle Branch in Workflow Track
  const handleToggleBranch = (trackIndex: number, branchCode: string) => {
    const updated = [...tracks];
    const current = updated[trackIndex].selectedBranches;
    const exists = current.includes(branchCode);

    let nextBranches: string[];
    if (exists) {
      nextBranches = current.filter((c) => c !== branchCode);
    } else {
      nextBranches = [...current, branchCode];
    }

    updated[trackIndex] = {
      ...updated[trackIndex],
      selectedBranches: nextBranches,
      scopeType: 'CUSTOM'
    };
    setTracks(updated);
  };

  // Handler: Bulk Branch Actions (Select All, HQ Only, Other Branches, Clear)
  const handleBulkBranchAction = (
    trackIndex: number,
    action: 'ALL' | 'HQ_ONLY' | 'NON_HQ' | 'CLEAR'
  ) => {
    const updated = [...tracks];
    if (action === 'ALL') {
      updated[trackIndex].selectedBranches = branches.map((b) => b.code);
      updated[trackIndex].scopeType = 'ALL';
    } else if (action === 'HQ_ONLY') {
      updated[trackIndex].selectedBranches = ['HQ'];
      updated[trackIndex].scopeType = 'HQ';
    } else if (action === 'NON_HQ') {
      const nonHq = branches.filter((b) => (b.code || '').toUpperCase() !== 'HQ').map((b) => b.code);
      updated[trackIndex].selectedBranches = nonHq;
      updated[trackIndex].scopeType = 'OTHER_BRANCHES';
    } else if (action === 'CLEAR') {
      updated[trackIndex].selectedBranches = [];
      updated[trackIndex].scopeType = 'CUSTOM';
    }
    setTracks(updated);
  };

  // Handler: Toggle Branch Picker Visibility
  const handleToggleBranchPicker = (trackIndex: number) => {
    const updated = [...tracks];
    updated[trackIndex] = {
      ...updated[trackIndex],
      isBranchPickerOpen: !updated[trackIndex].isBranchPickerOpen
    };
    setTracks(updated);
  };

  // Handler: Update Search Filter in Branch Picker
  const handleUpdateBranchSearch = (trackIndex: number, search: string) => {
    const updated = [...tracks];
    updated[trackIndex] = {
      ...updated[trackIndex],
      branchSearch: search
    };
    setTracks(updated);
  };

  // Step Management in Track
  const handleAddStepToTrack = (trackIndex: number) => {
    const updated = [...tracks];
    const track = updated[trackIndex];
    const defaultRoleId = availableRoles.length > 0 ? availableRoles[0].id : '';

    const newStep: ApprovalWorkflowStep = {
      company_id: companyId,
      module: 'leave',
      branch_scope: track.scopeType as WorkflowBranchScope,
      step_order: track.steps.length + 1,
      approver_role_id: defaultRoleId,
      approver_role_name: availableRoles[0]?.name || 'Approver',
      step_label:
        track.steps.length === 0
          ? 'Initial Endorsement'
          : track.steps.length === 1
          ? 'Department / Branch Review'
          : 'Highest Approval (Final Sign-off)',
      routing_rule: 'Sequential approval stage',
      auto_escalate_hours: 48
    };

    track.steps = [...track.steps, newStep];
    setTracks(updated);
  };

  const handleRemoveStepFromTrack = (trackIndex: number, stepIndex: number) => {
    const updated = [...tracks];
    const track = updated[trackIndex];

    if (track.steps.length <= 1) {
      toast.error('Each workflow must have at least 1 approval step.');
      return;
    }

    track.steps = track.steps
      .filter((_, idx) => idx !== stepIndex)
      .map((s, idx) => ({ ...s, step_order: idx + 1 }));

    setTracks(updated);
  };

  const handleUpdateStepInTrack = (
    trackIndex: number,
    stepIndex: number,
    field: keyof ApprovalWorkflowStep,
    value: any
  ) => {
    const updated = [...tracks];
    const step = { ...updated[trackIndex].steps[stepIndex], [field]: value };

    if (field === 'approver_role_id') {
      const found = availableRoles.find((r) => r.id === value);
      if (found) step.approver_role_name = found.name;
    }

    updated[trackIndex].steps[stepIndex] = step;
    setTracks(updated);
  };

  // Reset to Defaults
  const handleResetDefaults = () => {
    if (isMainCompany) {
      const def = buildDefaultRayharTracks(availableRoles, branches);
      setTracks(def);
      toast.info('Reset to Rayhar Travels standard branch-based workflows (HQ & Other Branches).');
    } else {
      const def = buildDefaultSubsidiaryTracks(availableRoles, branches);
      setTracks(def);
      toast.info(`Reset to standard workflow for ${companyName}.`);
    }
  };

  // Save All Workflows to Backend
  const handleSave = async () => {
    const allStepsToSave: ApprovalWorkflowStep[] = [];

    for (let tIdx = 0; tIdx < tracks.length; tIdx++) {
      const track = tracks[tIdx];
      if (track.selectedBranches.length === 0) {
        toast.error(`Please assign at least one branch to "${track.name}" before saving.`);
        return;
      }

      if (track.steps.some((s) => !s.approver_role_id)) {
        toast.error(`All steps in "${track.name}" must have an assigned approver role.`);
        return;
      }

      let resolvedScope = track.scopeType as string;
      if (track.scopeType === 'HQ' || (track.selectedBranches.length === 1 && track.selectedBranches[0] === 'HQ')) {
        resolvedScope = 'HQ';
      } else if (
        track.scopeType === 'OTHER_BRANCHES' ||
        (track.selectedBranches.every((b) => b !== 'HQ') && track.selectedBranches.length >= (branches.length - 1))
      ) {
        resolvedScope = 'OTHER_BRANCHES';
      } else if (track.selectedBranches.length === branches.length) {
        resolvedScope = 'ALL';
      } else {
        resolvedScope = `BRANCHES:${track.selectedBranches.join(',')}`;
      }

      track.steps.forEach((s, sIdx) => {
        allStepsToSave.push({
          company_id: companyId,
          module: 'leave',
          branch_scope: resolvedScope,
          step_order: sIdx + 1,
          approver_role_id: s.approver_role_id,
          step_label: s.step_label || `Step ${sIdx + 1}`,
          routing_rule: s.routing_rule || `Track: ${track.name} | Branches: ${track.selectedBranches.join(', ')}`,
          auto_escalate_hours: s.auto_escalate_hours || 48
        });
      });
    }

    try {
      setSaving(true);
      await multiCompanyApi.saveApprovalWorkflow(companyId, allStepsToSave);
      await multiCompanyApi.logActivity({
        category: 'LEAVE_WORKFLOW_UPDATE',
        description: `HR saved leave approval workflows for ${companyName} (${tracks.length} branch workflow tracks configured)`,
        company_id: companyId,
        new_values: { workflow_tracks_count: tracks.length, steps_count: allStepsToSave.length }
      });
      toast.success(`Leave approval workflows successfully saved for ${companyName}!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save approval workflows');
    } finally {
      setSaving(false);
    }
  };

  // Helper to render live role coverage details inside step cards
  const renderRoleCoverageDetails = (roleId: string, track: WorkflowTrack) => {
    const roleObj = availableRoles.find((r) => r.id === roleId);
    const roleNameLower = (roleObj?.name || '').toLowerCase().trim();

    if (roleNameLower === 'head of department' || roleNameLower === 'hod') {
      return (
        <div className="mt-2.5 pt-2.5 border-t border-border/50 dark:border-neutral-800 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#942392] dark:text-[#f885d5]">
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
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
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
          <span className="font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
            Highest Approval for Assigned Scope:
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
          <span className="font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
            Highest Approval for Assigned Scope:
          </span>
          <span className="font-bold text-foreground">
            {approverCoverage.managingDirectors.length > 0
              ? approverCoverage.managingDirectors.join(', ')
              : 'Managing Director'}
          </span>
        </div>
      );
    }

    return null;
  };

  // Helper to format human-readable trigger label
  const getTriggerDetails = (track: WorkflowTrack) => {
    const selected = track.selectedBranches;
    if (selected.length === 0) {
      return {
        titleSuffix: 'No Branch Selected',
        appliesText: 'Please select assigned branches in the filter above'
      };
    }

    if (selected.length === 1) {
      const code = selected[0];
      if (code === 'HQ') {
        return {
          titleSuffix: 'Rayhar HQ',
          appliesText: 'Applies to all staff assigned to branch HQ (Rayhar HQ)'
        };
      }
      const bObj = branches.find((b) => b.code === code);
      const bName = bObj?.name || code;
      return {
        titleSuffix: `Rayhar ${code} (${bName})`,
        appliesText: `Applies to all staff assigned to branch ${code} (${bName})`
      };
    }

    if (selected.length === branches.length) {
      return {
        titleSuffix: `All Branches (${companyName})`,
        appliesText: `Applies to all staff across all ${branches.length} branches in ${companyName}`
      };
    }

    const nonHqBranchCodes = branches
      .filter((b) => (b.code || '').toUpperCase() !== 'HQ')
      .map((b) => b.code);

    if (
      nonHqBranchCodes.length > 0 &&
      selected.length === nonHqBranchCodes.length &&
      selected.every((c) => nonHqBranchCodes.includes(c))
    ) {
      return {
        titleSuffix: 'Other Branches (Except HQ)',
        appliesText: `Applies to all ${selected.length} branches except HQ (${selected.slice(0, 6).join(', ')}...)`
      };
    }

    // Custom subset of branches
    const branchNames = selected
      .map((c) => branches.find((b) => b.code === c)?.name || c)
      .join(', ');

    return {
      titleSuffix: branchNames.length > 40 ? `${branchNames.slice(0, 37)}...` : branchNames,
      appliesText: `Applies to all staff assigned to branch ${selected.join(', ')}`
    };
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-[#942392]" />
        Loading branch-based approval workflows...
      </div>
    );
  }

  const visibleTracks = activeTrackFilter === 'ALL'
    ? tracks
    : tracks.filter((t) => t.id === activeTrackFilter);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-xs font-black uppercase tracking-wider text-foreground dark:text-neutral-200">
              Multi-Tier Leave Approval Sequence
            </h4>
            <span className="inline-flex items-center justify-center px-3 py-1 text-[10px] tracking-wider font-extrabold uppercase rounded-full border-[1.5px] border-[#942392]/30 bg-[#942392]/10 text-[#942392] dark:text-[#f885d5] hover:bg-[#942392] hover:text-white transition-colors cursor-default shadow-2xs">
              {tracks.length} Branch Workflow{tracks.length !== 1 ? 's' : ''} Configured
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Configure how leave requests are routed, filtered by branch, and approved for <strong className="text-foreground">{companyName}</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* + Add Workflow Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddWorkflow}
            className="text-xs font-bold border-[#942392]/40 bg-[#942392]/5 hover:bg-[#942392]/15 text-[#942392] dark:text-[#f885d5] h-8 shadow-xs cursor-pointer"
          >
            + Add Workflow
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResetDefaults}
            className="text-xs font-bold border-border hover:bg-muted h-8 cursor-pointer"
            title="Reset to recommended standard workflows"
          >
            Reset Default
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="bg-[#942392] hover:bg-[#800A7A] text-white font-bold text-xs h-8 shadow-xs cursor-pointer"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Check className="w-3.5 h-3.5 mr-1" />}
            Save Workflow
          </Button>
        </div>
      </div>

      {/* Dynamic Company Banner — Branch-Based Leave Approval Routing Rules */}
      <div className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-border/80 dark:border-neutral-800 space-y-3 shadow-xs">
        <div>
          <h5 className="font-black text-sm uppercase tracking-wider text-[#942392] dark:text-[#f885d5]">
            Branch-Based Leave Approval Routing Rules — {companyName}
          </h5>
          <p className="text-[11px] text-muted-foreground">
            Visual overview of active branch routing pipelines and escalation chains for {companyName}.
          </p>
        </div>

        {/* Quick Summary Grid of Configured Tracks — 2 wide columns preventing cutoff */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-3 pt-1">
          {tracks.map((track, tIdx) => {
            const trg = getTriggerDetails(track);
            const highestStep = track.steps[track.steps.length - 1];
            return (
              <div
                key={track.id}
                className="p-3.5 rounded-xl bg-background/90 dark:bg-neutral-900/90 border border-border/80 text-xs space-y-2 shadow-2xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-black text-xs uppercase tracking-wider text-foreground leading-snug">
                    {tIdx + 1}. {track.name}
                  </span>
                  <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-[9px] tracking-wider font-extrabold uppercase rounded-full border-[1.5px] border-border bg-muted/40 text-foreground shrink-0">
                    {track.selectedBranches.length} Branch{track.selectedBranches.length !== 1 ? 'es' : ''}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  <span>Trigger: </span>
                  <strong className="text-foreground">{trg.titleSuffix}</strong>
                </div>
                <div className="text-[10.5px] text-muted-foreground pt-1.5 border-t border-border/40 flex flex-wrap items-center justify-between gap-1">
                  <span>
                    Ladder: {track.steps.length} Step{track.steps.length !== 1 ? 's' : ''}
                  </span>
                  <span className="font-bold text-[#942392] dark:text-[#f885d5]">
                    Highest: {highestStep?.approver_role_name || highestStep?.step_label || 'Approved'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter Tabs for Tracks */}
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
          All Branch Workflows ({tracks.length})
        </button>

        {tracks.map((t, idx) => {
          const isActive = activeTrackFilter === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTrackFilter(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                isActive
                  ? 'bg-[#942392] text-white shadow-xs'
                  : 'bg-muted/50 text-muted-foreground hover:text-foreground'
              }`}
            >
              {idx + 1}. {t.name}
            </button>
          );
        })}
      </div>

      {/* Workflow Tracks Grid */}
      <div className={`grid grid-cols-1 ${visibleTracks.length > 1 ? 'xl:grid-cols-2' : ''} gap-6 items-start`}>
        {visibleTracks.map((track, trackIdx) => {
          const actualIndex = tracks.findIndex((t) => t.id === track.id);
          const trg = getTriggerDetails(track);
          const branchSearch = (track.branchSearch || '').toLowerCase().trim();

          const filteredBranchList = branches.filter((b) => {
            if (!branchSearch) return true;
            return (
              (b.code || '').toLowerCase().includes(branchSearch) ||
              (b.name || '').toLowerCase().includes(branchSearch)
            );
          });

          return (
            <div
              key={track.id}
              className="rounded-2xl border-2 border-[#942392]/30 bg-card/60 dark:bg-neutral-900/60 p-4 space-y-4 shadow-xs"
            >
              {/* Track Header & Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-border/60 dark:border-neutral-800">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-md bg-[#942392] text-white text-[10px] font-black uppercase tracking-wider">
                      Workflow {actualIndex + 1}
                    </span>
                    <Input
                      value={track.name}
                      onChange={(e) => handleUpdateTrackName(actualIndex, e.target.value)}
                      className="h-7 text-xs font-bold text-foreground w-64 bg-background dark:bg-neutral-950 border-border dark:border-neutral-800"
                      placeholder="Workflow Name..."
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  {/* + Add Step Button */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddStepToTrack(actualIndex)}
                    className="text-xs font-bold border-[#942392]/30 hover:bg-[#942392]/10 text-[#942392] dark:text-[#f885d5] h-8 shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    + Add Step
                  </Button>

                  {/* Remove Workflow Button */}
                  {tracks.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveWorkflow(actualIndex)}
                      className="text-destructive hover:bg-destructive/10 h-8 px-2 cursor-pointer"
                      title="Delete this workflow"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Multi-Branch Filter / Multiple Choose Branch */}
              <div className="p-3 rounded-xl bg-background dark:bg-neutral-950 border border-border/80 dark:border-neutral-800 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Filter className="w-3.5 h-3.5 text-[#942392]" />
                    <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">
                      Filter Multiple Choose Branch:
                    </Label>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-bold border-[#942392]/30 bg-[#942392]/10 text-[#942392] dark:text-[#f885d5]"
                    >
                      {track.selectedBranches.length} / {branches.length} Selected
                    </Badge>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleBranchPicker(actualIndex)}
                    className="h-7 text-xs font-bold border-border gap-1 cursor-pointer"
                  >
                    {track.isBranchPickerOpen ? (
                      <>
                        <ChevronUp className="w-3 h-3" /> Hide Branches
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3 h-3" /> Edit Branches ({track.selectedBranches.length})
                      </>
                    )}
                  </Button>
                </div>

                {/* Selected Branch Badges Preview */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {track.selectedBranches.length === 0 ? (
                    <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> No branch selected. Click &quot;Edit Branches&quot; to assign.
                    </span>
                  ) : track.selectedBranches.length === branches.length ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 text-[10px] font-bold">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> All Branches Assigned ({branches.length})
                    </span>
                  ) : (
                    track.selectedBranches.map((code) => {
                      const bObj = branches.find((b) => b.code === code);
                      return (
                        <span
                          key={code}
                          className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#942392]/10 text-[#942392] dark:text-[#f885d5] border border-[#942392]/20 text-[10px] font-bold gap-1"
                        >
                          <MapPin className="w-2.5 h-2.5" />
                          <span>{code}</span>
                          {bObj && <span className="font-normal opacity-80">({bObj.name})</span>}
                        </span>
                      );
                    })
                  )}
                </div>

                {/* Expandable Branch Checklist Multi-Select */}
                {track.isBranchPickerOpen && (
                  <div className="mt-2 pt-2.5 border-t border-border/60 dark:border-neutral-800 space-y-2.5">
                    {/* Quick Filters */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-bold text-muted-foreground mr-1">Quick Select:</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkBranchAction(actualIndex, 'ALL')}
                        className="h-6 text-[10px] px-2 font-bold cursor-pointer"
                      >
                        All Branches
                      </Button>
                      {branches.some((b) => (b.code || '').toUpperCase() === 'HQ') && (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleBulkBranchAction(actualIndex, 'HQ_ONLY')}
                            className="h-6 text-[10px] px-2 font-bold cursor-pointer"
                          >
                            HQ Only
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleBulkBranchAction(actualIndex, 'NON_HQ')}
                            className="h-6 text-[10px] px-2 font-bold cursor-pointer"
                          >
                            All Non-HQ Branches
                          </Button>
                        </>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleBulkBranchAction(actualIndex, 'CLEAR')}
                        className="h-6 text-[10px] px-2 text-destructive font-bold cursor-pointer"
                      >
                        Clear
                      </Button>
                    </div>

                    {/* Search filter input */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
                      <Input
                        value={track.branchSearch || ''}
                        onChange={(e) => handleUpdateBranchSearch(actualIndex, e.target.value)}
                        placeholder="Search branch name or code..."
                        className="h-7 text-xs pl-8 bg-muted/30 border-border dark:border-neutral-800"
                      />
                    </div>

                    {/* Checkbox Grid */}
                    <div className="max-h-48 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-1.5 p-1 bg-muted/20 rounded-lg border border-border/40">
                      {filteredBranchList.map((branch) => {
                        const isChecked = track.selectedBranches.includes(branch.code);
                        return (
                          <button
                            key={branch.code}
                            type="button"
                            onClick={() => handleToggleBranch(actualIndex, branch.code)}
                            className={`p-1.5 rounded-md text-[10.5px] font-medium flex items-center gap-1.5 text-left transition-all cursor-pointer ${
                              isChecked
                                ? 'bg-[#942392]/15 text-[#942392] dark:text-[#f885d5] font-bold border border-[#942392]/30'
                                : 'hover:bg-muted text-foreground'
                            }`}
                          >
                            {isChecked ? (
                              <CheckSquare className="w-3.5 h-3.5 text-[#942392] shrink-0" />
                            ) : (
                              <Square className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            )}
                            <span className="truncate">
                              <strong className="font-mono">{branch.code}</strong> - {branch.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Exact First Trigger Card (START) */}
              <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500/10 via-background to-background dark:from-neutral-800/60 dark:to-neutral-900/60 border border-dashed border-[#942392]/40 flex items-center justify-between text-xs shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-[#942392] text-white flex items-center justify-center font-black text-[11px] shrink-0 shadow-xs">
                    0
                  </div>
                  <div>
                    <span className="font-black text-foreground uppercase text-[11px] tracking-wider block">
                      Trigger: Employee Submits Leave Request ({trg.titleSuffix})
                    </span>
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {trg.appliesText}
                    </span>
                  </div>
                </div>
                <Badge className="bg-[#942392] text-white text-[9px] font-black uppercase tracking-wider shrink-0">
                  START
                </Badge>
              </div>

              <div className="flex justify-center -my-2">
                <ArrowDown className="w-4 h-4 text-[#942392]/60" />
              </div>

              {/* Sequential Approval Steps */}
              <div className="space-y-3">
                {track.steps.map((step, sIdx) => {
                  const isLast = sIdx === track.steps.length - 1;

                  return (
                    <React.Fragment key={`step-${track.id}-${sIdx}`}>
                      <div className="p-4 rounded-xl border border-border dark:border-neutral-800 bg-background dark:bg-neutral-900 shadow-xs transition-all hover:border-[#942392]/40">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="flex items-start sm:items-center gap-3 w-full">
                            <div className="w-7 h-7 rounded-lg bg-[#942392] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs mt-1 sm:mt-0">
                              {sIdx + 1}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 flex-1">
                              <div>
                                <div className="flex items-center gap-1.5 mb-1">
                                  <Label className="text-[10px] font-black text-black dark:text-white uppercase tracking-wider">
                                    Step {sIdx + 1} Label
                                  </Label>
                                  {isLast && (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 shadow-xs uppercase tracking-wider">
                                      Highest Approval
                                    </span>
                                  )}
                                </div>
                                <Input
                                  value={step.step_label}
                                  onChange={(e) =>
                                    handleUpdateStepInTrack(actualIndex, sIdx, 'step_label', e.target.value)
                                  }
                                  placeholder="e.g. Department Review"
                                  className="text-xs h-8 bg-card dark:bg-neutral-950 border-border dark:border-neutral-800 w-full font-medium text-black dark:text-white"
                                />
                              </div>

                              <div>
                                <Label className="text-[10px] font-black text-black dark:text-white uppercase tracking-wider block mb-1">
                                  Approver Role (Step {sIdx + 1})
                                </Label>
                                <Select
                                  value={step.approver_role_id}
                                  onValueChange={(val) =>
                                    handleUpdateStepInTrack(actualIndex, sIdx, 'approver_role_id', val)
                                  }
                                >
                                  <SelectTrigger className="text-xs h-8 bg-card dark:bg-neutral-950 border-border dark:border-neutral-800 w-full font-bold text-black dark:text-white">
                                    <SelectValue placeholder="Select approver role..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableRoles.map((r) => (
                                      <SelectItem key={r.id} value={r.id} className="text-xs font-medium">
                                        {r.name}{' '}
                                        {r.scope_type === 'Parent Group Access' || r.scope_type === 'Parent Group Data'
                                          ? '(Group Exec)'
                                          : ''}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                            {track.steps.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveStepFromTrack(actualIndex, sIdx)}
                                className="text-destructive hover:bg-destructive/10 h-7 px-2 cursor-pointer"
                                title="Remove Step"
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

                        {renderRoleCoverageDetails(step.approver_role_id, track)}
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

              {/* Bottom Add Step Button */}
              <div className="pt-2 flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddStepToTrack(actualIndex)}
                  className="text-xs font-bold border-dashed border-[#942392]/40 hover:bg-[#942392]/10 text-[#942392] dark:text-[#f885d5] h-8 w-full cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  + Add Step to {track.name}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Action: Add New Branch Approval Workflow */}
      <div className="pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleAddWorkflow}
          className="w-full h-11 border-2 border-dashed border-[#942392]/40 bg-[#942392]/5 hover:bg-[#942392]/15 text-[#942392] dark:text-[#f885d5] font-black uppercase tracking-wider text-xs rounded-2xl gap-2 shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          + Add New Branch Approval Workflow for {companyName}
        </Button>
      </div>
    </div>
  );
};
