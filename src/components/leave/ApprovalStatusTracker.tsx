import React from 'react';
import { Check, X, Clock } from 'lucide-react';

interface ApprovalHistoryItem {
  approver_id?: string;
  approver_role?: string;
  approver_name?: string;
  approver_department?: string;
  approver_branch?: string;
  status: string;
  created_at?: string;
}

interface ApprovalStatusTrackerProps {
  variant?: 'horizontal' | 'linear' | 'staggered';
  status: string; // "Pending", "Pending HOD", "Approved", "Rejected"
  approverRole?: string; // The role that is currently pending or the role that rejected it
  approverName?: string;
  approvalHistory?: ApprovalHistoryItem[]; // Passed from parent
  branch?: string; // Employee branch
  department?: string;
  companyName?: string;
  pendingApproverName?: string;
  pendingApproverContext?: string;
  workflowSteps?: Array<{
    step_order: number;
    step_label?: string;
    role_name?: string;
    branch_scope?: string;
  }>;
}

const normRoleStr = (r?: string) =>
  String(r || "")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();

const formatRoleName = (r?: string) => {
  if (!r) return "MANAGER";
  const cleaned = String(r).replace(/\([^)]*\)/g, "").trim();
  const key = cleaned.toLowerCase().replace(/\s+/g, "_");
  const map: Record<string, string> = {
    assure_leader: "ASSURE LEADER",
    branch_leader: "BRANCH LEADER",
    managing_director: "MANAGING DIRECTOR",
    md: "MANAGING DIRECTOR",
    operation_manager: "OPERATION MANAGER",
    finance_manager: "OPERATION MANAGER",
    head_of_department: "HEAD OF DEPARTMENT",
    hod: "HEAD OF DEPARTMENT",
    hr_admin: "HR ADMIN",
    hr: "HR ADMIN",
    admin: "HR ADMIN",
    branch_officer: "BRANCH OFFICER",
    employee: "EMPLOYEE",
  };
  return map[key] || cleaned.replace(/_/g, " ").toUpperCase();
};

const formatDept = (dept?: string) => {
  if (!dept) return "HQ";
  let d = String(dept).trim();
  if (d.toLowerCase() === 'information technology') d = 'IT';
  if (/^it$/i.test(d)) d = 'IT';
  if (!d.toUpperCase().includes('HQ')) {
    return `${d} (HQ)`;
  }
  return d;
};

export function ApprovalStatusTracker({ 
  status, 
  approverRole, 
  approverName,
  approvalHistory = [], 
  branch = "",
  department = "",
  companyName = "",
  pendingApproverName = "",
  pendingApproverContext = "",
  workflowSteps = [],
}: ApprovalStatusTrackerProps) {
  const isHQ = String(branch).toUpperCase() === 'HQ';
  const isRayRent = String(branch).toUpperCase() === 'RAYRENT' || String(companyName || '').toLowerCase().includes('rayrent');
  const isRayharVacation = String(branch).toUpperCase().includes('RV') || String(companyName || '').toLowerCase().includes('vacation');
  const sUpper = String(status || "").toUpperCase();

  // Determine stage flags
  const isApproved = sUpper === 'APPROVED';
  const isRejected = sUpper === 'REJECTED';

  const aRole = String(approverRole || "").toLowerCase();
  const isLvl1ApproverRole = aRole.includes("branch") || aRole.includes("hod") || aRole.includes("department");
  const isLvl2ApproverRole = aRole.includes("operation") || aRole.includes("finance") || aRole.includes("managing") || aRole.includes("director") || aRole.includes("md");

  // Check if handled / approved by HR Admin
  const isHrRole = (r?: string) => {
    if (!r) return false;
    const s = String(r).toLowerCase().trim().replace(/[\s_-]+/g, '');
    return s.includes('hr') || s === 'admin' || s === 'superadmin' || s === 'hradmin';
  };

  const hrHistory = (approvalHistory || []).find(h => {
    const r = String(h.approver_role || "");
    const s = String(h.status || "").toLowerCase();
    const hasHrInName = Boolean(h.approver_name && /hr\s*admin/i.test(h.approver_name));
    return (isHrRole(r) || hasHrInName) && (s === 'approved' || s === 'rejected');
  }) || (approvalHistory || []).find(h => isHrRole(h.approver_role) || Boolean(h.approver_name && /hr\s*admin/i.test(h.approver_name)));

  // Find explicit approval records in history for multi-tier flow
  const lvl1History = (approvalHistory || []).find(h => {
    const r = String(h.approver_role || "").toLowerCase();
    return r.includes("hod") || r.includes("department") || r.includes("branch");
  });

  const lvl2History = (approvalHistory || []).find(h => {
    const r = String(h.approver_role || "").toLowerCase();
    return r.includes("operation") || r.includes("finance") || r.includes("managing") || r.includes("director") || r.includes("md");
  });

  // Explicit check for Managing Director approval
  const mdHistory = (approvalHistory || []).slice().reverse().find(h => {
    const r = String(h.approver_role || "").toLowerCase();
    return r.includes("managing") || r.includes("director") || r.includes("md");
  });

  const opHistory = (approvalHistory || []).slice().reverse().find(h => {
    const r = String(h.approver_role || "").toLowerCase();
    return r.includes("operation");
  });

  const isMdApproved = Boolean(
    (mdHistory && String(mdHistory.status || "").toLowerCase().includes("approved")) ||
    (isApproved && (aRole.includes("md") || aRole.includes("managing") || aRole.includes("director")))
  );

  const isOpApproved = Boolean(
    (opHistory && String(opHistory.status || "").toLowerCase().includes("approved")) ||
    (isApproved && aRole.includes("operation"))
  );

  const isApprovedByHr = 
    Boolean(hrHistory && String(hrHistory.status || "").toLowerCase() === 'approved') ||
    (isApproved && !isMdApproved && !isOpApproved && (isHrRole(approverRole) || (approvalHistory || []).some(h => isHrRole(h.approver_role))));

  const isRejectedByHr = 
    Boolean(hrHistory && String(hrHistory.status || "").toLowerCase() === 'rejected') ||
    (isRejected && isHrRole(approverRole));

  const isPendingHr = 
    sUpper.includes('HR') || 
    (isHrRole(approverRole) && !isApproved && !isRejected);

  const isHrWorkflow = !isMdApproved && !isOpApproved && !isRayRent && !lvl1History && (isApprovedByHr || isRejectedByHr || isPendingHr);

  // Prepare HR Admin details
  const hrName = hrHistory?.approver_name || approverName || (isRayRent ? "NURUL ATHIRAH ABDUL RAHMAN" : "");
  const hrContext = isRayRent 
    ? "RAYRENT" 
    : (hrHistory?.approver_branch || "HQ");

  let hrSubtitle: string | undefined = undefined;
  if (isApprovedByHr) {
    hrSubtitle = hrName ? `${hrName} • ${hrContext}` : `Approved • ${hrContext}`;
  } else if (isRejectedByHr) {
    hrSubtitle = hrName ? `${hrName} • ${hrContext}` : `Rejected • ${hrContext}`;
  } else {
    // Pending
    hrSubtitle = pendingApproverName ? `${pendingApproverName} • ${hrContext}` : `Awaiting HR Admin Approval • ${hrContext}`;
  }

  let hrDate: string | undefined = undefined;
  if (hrHistory?.created_at) {
    hrDate = new Date(hrHistory.created_at).toLocaleDateString('en-GB');
  } else if (isApproved || isRejected) {
    hrDate = new Date().toLocaleDateString('en-GB');
  }

  const stepHrStatus: 'Approved' | 'Rejected' | 'Pending' = isApprovedByHr 
    ? 'Approved' 
    : (isRejectedByHr ? 'Rejected' : 'Pending');

  const isLvl1Pending = sUpper.includes('HOD') || (sUpper.includes('BRANCH') && !isRayRent) || sUpper === 'PENDING';
  const isLvl2Pending = sUpper.includes('OPERATION') || sUpper.includes('FINANCE') || sUpper.includes('MD') || sUpper.includes('MANAGING') || (isRayRent && sUpper.includes('BRANCH'));

  // Step 1 status & details
  let step1Status: 'Approved' | 'Rejected' | 'Pending' | 'Future' = 'Future';
  let step1Subtitle: string | undefined = undefined;
  let step1Date: string | undefined = undefined;

  const lvl1RoleTitle = isRayRent ? "INITIAL ENDORSEMENT" : (isHQ ? "HEAD OF DEPARTMENT" : "BRANCH LEADER");
  const lvl1Context = isHQ 
    ? formatDept(lvl1History?.approver_department || pendingApproverContext || department) 
    : (lvl1History?.approver_branch || pendingApproverContext || branch || "HQ");

  // Step 2 status & details
  let step2Status: 'Approved' | 'Rejected' | 'Pending' | 'Future' = 'Future';
  let step2Subtitle: string | undefined = undefined;
  let step2Date: string | undefined = undefined;

  const lvl2RoleTitle = isMdApproved || (isLvl2Pending && (sUpper.includes("MD") || sUpper.includes("MANAGING")))
    ? "MANAGING DIRECTOR"
    : (isOpApproved || (isLvl2Pending && (sUpper.includes("OPERATION") || sUpper.includes("FINANCE"))))
    ? "OPERATION MANAGER"
    : (isApprovedByHr && Boolean(lvl1History))
    ? "HR ADMIN"
    : (isRayRent ? "BRANCH LEADER" : (isHQ ? "OPERATION MANAGER" : "MANAGING DIRECTOR"));

  const lvl2Context = isRayRent
    ? (lvl2History?.approver_branch || branch || 'RayRent')
    : 'HQ';

  if (isRayRent) {
    const isAssurePending = sUpper.includes("ASSURE");
    const isBlPending = sUpper.includes("BRANCH");

    const assureHistory = (approvalHistory || []).find(h => {
      const r = String(h.approver_role || "").toLowerCase();
      const n = String(h.approver_name || "").toLowerCase();
      return r.includes("assure") || n.includes("qistina");
    });
    const blHistory = (approvalHistory || []).find(h => {
      const r = String(h.approver_role || "").toLowerCase();
      const n = String(h.approver_name || "").toLowerCase();
      return r.includes("branch") || n.includes("alif");
    });

    const isBlApproved = Boolean(
      (blHistory && String(blHistory.status || "").toLowerCase().includes("approved")) ||
      isAssurePending ||
      (isApproved && !isRejected) ||
      // Rejected at the Assure Leader stage implies Branch Leader already approved
      (isRejected && (Boolean(assureHistory) || aRole.includes("assure")))
    );

    const isAssureApproved = Boolean(
      (assureHistory && String(assureHistory.status || "").toLowerCase().includes("approved")) ||
      (isApproved && (aRole.includes("assure") || (approvalHistory || []).length >= 2 || isApprovedByHr))
    );

    // Step 1: Branch Leader
    if (blHistory && String(blHistory.status).toLowerCase().includes("rejected")) {
      step1Status = 'Rejected';
      step1Subtitle = blHistory.approver_name ? `${blHistory.approver_name} • RAYRENT` : `Rejected • RAYRENT`;
      if (blHistory.created_at) step1Date = new Date(blHistory.created_at).toLocaleDateString('en-GB');
      step2Status = 'Future';
    } else if (isBlApproved) {
      step1Status = 'Approved';
      step1Subtitle = blHistory?.approver_name ? `${blHistory.approver_name} • RAYRENT` : (approverName && aRole.includes("branch") ? `${approverName} • RAYRENT` : `Approved • RAYRENT`);
      if (blHistory?.created_at) step1Date = new Date(blHistory.created_at).toLocaleDateString('en-GB');

      // Step 2: Assure Leader
      if (isAssureApproved) {
        step2Status = 'Approved';
        const aName = assureHistory?.approver_name || (isApprovedByHr ? hrName : "Assure Leader");
        step2Subtitle = aName ? `${aName} • RayRent` : `Approved • RayRent`;
        if (assureHistory?.created_at) step2Date = new Date(assureHistory.created_at).toLocaleDateString('en-GB');
      } else if (isRejected) {
        step2Status = 'Rejected';
        const aName = assureHistory?.approver_name || approverName || "Assure Leader";
        step2Subtitle = aName ? `${aName} • RayRent` : `Rejected • RayRent`;
        if (assureHistory?.created_at) step2Date = new Date(assureHistory.created_at).toLocaleDateString('en-GB');
      } else {
        // Pending Assure Leader
        step2Status = 'Pending';
        step2Subtitle = pendingApproverName ? `${pendingApproverName} • RayRent` : `Awaiting Assure Leader Approval • RayRent`;
      }
    } else if (isRejected) {
      // Rejected with no history record: Branch Leader stage rejected it
      step1Status = 'Rejected';
      step1Subtitle = approverName ? `${approverName} • RAYRENT` : `Rejected • RAYRENT`;
      step2Status = 'Future';
    } else {
      // Step 1 Pending Branch Leader
      step1Status = 'Pending';
      step1Subtitle = pendingApproverName ? `${pendingApproverName} • RAYRENT` : `Awaiting Branch Leader Approval • RAYRENT`;
      step2Status = 'Future';
    }
  } else if (isRejected) {
    // Check which stage rejected the request
    const isL1Reject = String(lvl1History?.status).toLowerCase() === 'rejected' || isLvl1ApproverRole || (!lvl2History && !isLvl2ApproverRole);

    if (isL1Reject) {
      step1Status = 'Rejected';
      step1Subtitle = lvl1History?.approver_name 
        ? `${lvl1History.approver_name} • ${lvl1Context}` 
        : (pendingApproverName ? `${pendingApproverName} • ${lvl1Context}` : `Rejected • ${lvl1Context}`);
      if (lvl1History?.created_at) {
        step1Date = new Date(lvl1History.created_at).toLocaleDateString('en-GB');
      }
      step2Status = 'Future';
      step2Subtitle = undefined;
    } else {
      // Level 1 was approved, Level 2 was rejected
      step1Status = 'Approved';
      step1Subtitle = lvl1History?.approver_name 
        ? `${lvl1History.approver_name} • ${lvl1Context}` 
        : `Approved • ${lvl1Context}`;
      if (lvl1History?.created_at) {
        step1Date = new Date(lvl1History.created_at).toLocaleDateString('en-GB');
      }

      step2Status = 'Rejected';
      step2Subtitle = lvl2History?.approver_name 
        ? `${lvl2History.approver_name} • ${lvl2Context}` 
        : (pendingApproverName ? `${pendingApproverName} • ${lvl2Context}` : `Rejected • ${lvl2Context}`);
      if (lvl2History?.created_at) {
        step2Date = new Date(lvl2History.created_at).toLocaleDateString('en-GB');
      }
    }
  } else if (isApproved) {
    step1Status = 'Approved';
    step1Subtitle = lvl1History?.approver_name 
      ? `${lvl1History.approver_name} • ${lvl1Context}` 
      : `Approved • ${lvl1Context}`;
    if (lvl1History?.created_at) {
      step1Date = new Date(lvl1History.created_at).toLocaleDateString('en-GB');
    }

    step2Status = 'Approved';
    const highestApproverName = isMdApproved
      ? (mdHistory?.approver_name || (aRole.includes("md") || aRole.includes("managing") || aRole.includes("director") ? approverName : "") || "Managing Director")
      : isOpApproved
      ? (opHistory?.approver_name || (aRole.includes("operation") ? approverName : "") || "Operation Manager")
      : (lvl2History?.approver_name || (isLvl2ApproverRole ? approverName : "") || (isApprovedByHr ? (hrName || "HR Admin") : ""));

    step2Subtitle = highestApproverName 
      ? `${highestApproverName} • ${lvl2Context}` 
      : (pendingApproverName ? `${pendingApproverName} • ${lvl2Context}` : `Approved • ${lvl2Context}`);
    
    if (mdHistory?.created_at || opHistory?.created_at || lvl2History?.created_at) {
      step2Date = new Date((mdHistory?.created_at || opHistory?.created_at || lvl2History?.created_at)!).toLocaleDateString('en-GB');
    } else {
      step2Date = new Date().toLocaleDateString('en-GB');
    }
  } else if (isLvl2Pending) {
    step1Status = 'Approved';
    step1Subtitle = lvl1History?.approver_name 
      ? `${lvl1History.approver_name} • ${lvl1Context}` 
      : `Approved • ${lvl1Context}`;
    if (lvl1History?.created_at) {
      step1Date = new Date(lvl1History.created_at).toLocaleDateString('en-GB');
    }

    step2Status = 'Pending';
    step2Subtitle = pendingApproverName 
      ? `${pendingApproverName} • ${lvl2Context}` 
      : (sUpper.includes("MD") || sUpper.includes("MANAGING") ? `Awaiting Managing Director Approval • ${lvl2Context}` : 'Awaiting Approval');
  } else {
    // Level 1 pending
    step1Status = 'Pending';
    step1Subtitle = pendingApproverName 
      ? `${pendingApproverName} • ${lvl1Context}` 
      : 'Awaiting Approval';
    step2Status = 'Future';
    step2Subtitle = undefined;
  }

  const rayRentTitle = isMdApproved
    ? "MANAGING DIRECTOR"
    : isApprovedByHr
    ? "HR ADMIN"
    : "ASSURE LEADER";

  // RayRent final step is only skipped when the Branch Leader was the final approver
  // (company workflow has no Assure Leader step) and nobody else acted afterwards.
  const rayRentHasAssureActivity = (approvalHistory || []).some(h => {
    const r = String(h.approver_role || "").toLowerCase();
    return r.includes("assure") || r.includes("managing") || r.includes("director") || isHrRole(h.approver_role);
  }) || aRole.includes("assure") || sUpper.includes("ASSURE");
  const rayRentShowFinalStep = !(isApproved && !rayRentHasAssureActivity && !isMdApproved && !isApprovedByHr);

  // Rayhar Vacation 2-tier Sequence: Administrative Assistant -> General Manager
  const aaHistory = (approvalHistory || []).find(h => {
    const r = String(h.approver_role || "").toLowerCase();
    return r.includes("administrative") || r.includes("assistant");
  });
  const gmHistory = (approvalHistory || []).find(h => {
    const r = String(h.approver_role || "").toLowerCase();
    return r.includes("general") || r.includes("gm");
  });

  const isGmPending = sUpper.includes("GENERAL") || sUpper.includes("GM");
  const isAaPending = sUpper.includes("ADMINISTRATIVE") || sUpper.includes("ASSISTANT") || (sUpper.includes("PENDING") && !isGmPending && !gmHistory);

  let rvStep1Status: 'Approved' | 'Rejected' | 'Pending' | 'Future' = 'Future';
  let rvStep1Subtitle: string | undefined = undefined;
  let rvStep1Date: string | undefined = undefined;

  let rvStep2Status: 'Approved' | 'Rejected' | 'Pending' | 'Future' = 'Future';
  let rvStep2Subtitle: string | undefined = undefined;
  let rvStep2Date: string | undefined = undefined;

  if (isRayharVacation) {
    if (isApproved) {
      rvStep1Status = 'Approved';
      rvStep1Subtitle = aaHistory?.approver_name ? `${aaHistory.approver_name} • RV - KMN` : `Approved • RV - KMN`;
      if (aaHistory?.created_at) rvStep1Date = new Date(aaHistory.created_at).toLocaleDateString('en-GB');

      rvStep2Status = 'Approved';
      rvStep2Subtitle = gmHistory?.approver_name ? `${gmHistory.approver_name} • RV - KMN` : `Approved • RV - KMN`;
      if (gmHistory?.created_at) rvStep2Date = new Date(gmHistory.created_at).toLocaleDateString('en-GB');
    } else if (isRejected) {
      if (gmHistory && String(gmHistory.status).toLowerCase().includes('rejected')) {
        rvStep1Status = 'Approved';
        rvStep1Subtitle = aaHistory?.approver_name ? `${aaHistory.approver_name} • RV - KMN` : `Approved • RV - KMN`;
        if (aaHistory?.created_at) rvStep1Date = new Date(aaHistory.created_at).toLocaleDateString('en-GB');

        rvStep2Status = 'Rejected';
        rvStep2Subtitle = gmHistory.approver_name ? `${gmHistory.approver_name} • RV - KMN` : `Rejected • RV - KMN`;
        if (gmHistory.created_at) rvStep2Date = new Date(gmHistory.created_at).toLocaleDateString('en-GB');
      } else {
        rvStep1Status = 'Rejected';
        rvStep1Subtitle = aaHistory?.approver_name ? `${aaHistory.approver_name} • RV - KMN` : (approverName ? `${approverName} • RV - KMN` : `Rejected • RV - KMN`);
        if (aaHistory?.created_at) rvStep1Date = new Date(aaHistory.created_at).toLocaleDateString('en-GB');
        rvStep2Status = 'Future';
      }
    } else if (isGmPending) {
      rvStep1Status = 'Approved';
      rvStep1Subtitle = aaHistory?.approver_name ? `${aaHistory.approver_name} • RV - KMN` : `Approved • RV - KMN`;
      if (aaHistory?.created_at) rvStep1Date = new Date(aaHistory.created_at).toLocaleDateString('en-GB');

      rvStep2Status = 'Pending';
      rvStep2Subtitle = pendingApproverName ? `${pendingApproverName} • RV - KMN` : `Awaiting General Manager Approval • RV - KMN`;
    } else {
      // Step 1: Administrative Assistant Pending
      rvStep1Status = 'Pending';
      rvStep1Subtitle = pendingApproverName ? `${pendingApproverName} • RV - KMN` : `Awaiting Administrative Assistant Approval • RV - KMN`;
      rvStep2Status = 'Future';
    }
  }

  // Dynamically resolve tracker steps from latest saved workflow if available
  let dynamicItems: Array<{
    title: string;
    subtitle?: string;
    status: 'Approved' | 'Rejected' | 'Pending' | 'Future';
    date?: string;
  }> | null = null;

  const getStepLocationContext = (effectiveRoleTitle: string, stepHist?: ApprovalHistoryItem) => {
    const rNorm = normRoleStr(effectiveRoleTitle);
    if (
      rNorm.includes("managing director") ||
      rNorm === "md" ||
      rNorm.includes("operation manager") ||
      rNorm.includes("finance manager")
    ) {
      return "HQ";
    }
    if (rNorm.includes("hr admin") || rNorm === "hr" || rNorm === "admin") {
      return isRayRent ? "RAYRENT" : (stepHist?.approver_branch || "HQ");
    }
    if (rNorm.includes("head of department") || rNorm === "hod") {
      return formatDept(stepHist?.approver_department || department);
    }
    if (rNorm.includes("assure")) {
      return "RayRent";
    }
    if (isRayharVacation || rNorm.includes("administrative") || rNorm.includes("general manager")) {
      return stepHist?.approver_branch || branch || "RV - KMN";
    }
    return stepHist?.approver_branch || branch || "HQ";
  };

  if (workflowSteps && workflowSteps.length > 0) {
    const cleanBranch = String(branch || '').trim().toUpperCase();
    let applicableSteps = workflowSteps.filter(s => {
      const scope = String(s.branch_scope || '').trim().toUpperCase();
      if (scope === 'ALL') return true;
      if (scope === cleanBranch) return true;
      if (scope.split(',').map(x => x.trim()).includes(cleanBranch)) return true;
      return false;
    });

    if (applicableSteps.length === 0) {
      if (cleanBranch === 'HQ') {
        applicableSteps = workflowSteps.filter(s => String(s.branch_scope || '').trim().toUpperCase() === 'HQ');
      } else {
        applicableSteps = workflowSteps.filter(s => String(s.branch_scope || '').trim().toUpperCase() === 'OTHER_BRANCHES');
      }
    }
    if (applicableSteps.length === 0) {
      applicableSteps = workflowSteps.filter(s => String(s.branch_scope || '').trim().toUpperCase() === 'ALL');
    }
    if (applicableSteps.length === 0) {
      applicableSteps = workflowSteps;
    }

    applicableSteps.sort((a, b) => a.step_order - b.step_order);

    if (applicableSteps.length > 0) {
      dynamicItems = [
        {
          title: "SUBMIT",
          subtitle: "Application Submitted",
          status: "Approved",
        }
      ];

      // Pre-match approvalHistory entries to applicableSteps (Pass 1: role match, Pass 2: positional fallback for overrides like HR Admin)
      const usedHistIndices = new Set<number>();
      const stepHists: Array<ApprovalHistoryItem | undefined> = new Array(applicableSteps.length).fill(undefined);

      for (let i = 0; i < applicableSteps.length; i++) {
        const sr = normRoleStr(applicableSteps[i].role_name || applicableSteps[i].step_label);
        const matchIdx = (approvalHistory || []).findIndex((h, idx) => {
          if (usedHistIndices.has(idx)) return false;
          const hr = normRoleStr(h.approver_role);
          if (!hr || !sr) return false;
          return (
            hr === sr ||
            hr.includes(sr) ||
            sr.includes(hr) ||
            (sr.includes('hod') && hr.includes('head')) ||
            (sr.includes('head') && hr.includes('hod')) ||
            (sr.includes('md') && hr.includes('managing')) ||
            (sr.includes('managing') && hr.includes('md')) ||
            (sr.includes('operation') && hr.includes('finance')) ||
            (sr.includes('finance') && hr.includes('operation'))
          );
        });
        if (matchIdx !== -1) {
          stepHists[i] = approvalHistory[matchIdx];
          usedHistIndices.add(matchIdx);
        }
      }

      for (let i = 0; i < applicableSteps.length; i++) {
        if (!stepHists[i] && (approvalHistory || [])[i] && !usedHistIndices.has(i)) {
          stepHists[i] = approvalHistory[i];
          usedHistIndices.add(i);
        }
      }

      const cleanCurrent = normRoleStr(sUpper.replace(/^PENDING\s+/, ''));
      let currentIdx = applicableSteps.findIndex(s => {
        const r = normRoleStr(s.role_name);
        const l = normRoleStr(s.step_label);
        return (
          cleanCurrent === r ||
          cleanCurrent === l ||
          (cleanCurrent.includes('hod') && r.includes('head')) ||
          (cleanCurrent.includes('head') && r.includes('hod')) ||
          (cleanCurrent.includes('md') && r.includes('managing')) ||
          (cleanCurrent.includes('managing') && r.includes('md')) ||
          (cleanCurrent.includes('operation') && r.includes('finance')) ||
          (cleanCurrent.includes('finance') && r.includes('operation'))
        );
      });

      if (currentIdx === -1 && sUpper.startsWith('PENDING')) {
        const approvedCount = (approvalHistory || []).filter(h => String(h.status).toLowerCase().includes('approved')).length;
        currentIdx = Math.min(approvedCount, applicableSteps.length - 1);
      } else if (isRejected) {
        const rejectedStepIdx = stepHists.findIndex(h => h && String(h.status).toLowerCase().includes('rejected'));
        if (rejectedStepIdx !== -1) {
          currentIdx = rejectedStepIdx;
        } else {
          const approvedCount = (approvalHistory || []).filter(h => String(h.status).toLowerCase().includes('approved')).length;
          currentIdx = Math.min(approvedCount, applicableSteps.length - 1);
        }
      }

      for (let i = 0; i < applicableSteps.length; i++) {
        const step = applicableSteps[i];
        const stepHist = stepHists[i];

        let roleTitle = formatRoleName(step.role_name || step.step_label || `STEP ${step.step_order}`);
        if (stepHist?.approver_role) {
          roleTitle = formatRoleName(stepHist.approver_role);
        } else if (isApproved && i === applicableSteps.length - 1 && approverRole && (approvalHistory || []).length === 0) {
          roleTitle = formatRoleName(approverRole);
        } else if (isRejected && i === currentIdx && approverRole && !stepHist) {
          roleTitle = formatRoleName(approverRole);
        }

        const stepLoc = getStepLocationContext(roleTitle, stepHist);

        let stepStatus: 'Approved' | 'Rejected' | 'Pending' | 'Future' = 'Future';
        let stepSub: string | undefined = undefined;
        let stepDate: string | undefined = undefined;

        if (isApproved) {
          stepStatus = 'Approved';
          const dispName = stepHist?.approver_name || (i === applicableSteps.length - 1 && (approvalHistory || []).length === 0 ? approverName : '');
          stepSub = dispName ? `${dispName} • ${stepLoc}` : `Approved • ${stepLoc}`;
          if (stepHist?.created_at) stepDate = new Date(stepHist.created_at).toLocaleDateString('en-GB');
        } else if (isRejected) {
          if (currentIdx === i) {
            stepStatus = 'Rejected';
            const rejName = stepHist?.approver_name || approverName;
            stepSub = rejName ? `${rejName} • ${stepLoc}` : `Rejected • ${stepLoc}`;
            if (stepHist?.created_at) stepDate = new Date(stepHist.created_at).toLocaleDateString('en-GB');
          } else if (i < currentIdx) {
            stepStatus = 'Approved';
            stepSub = stepHist?.approver_name ? `${stepHist.approver_name} • ${stepLoc}` : `Approved • ${stepLoc}`;
            if (stepHist?.created_at) stepDate = new Date(stepHist.created_at).toLocaleDateString('en-GB');
          } else {
            stepStatus = 'Future';
          }
        } else if (sUpper.startsWith('PENDING')) {
          if (i < currentIdx) {
            stepStatus = 'Approved';
            stepSub = stepHist?.approver_name ? `${stepHist.approver_name} • ${stepLoc}` : `Approved • ${stepLoc}`;
            if (stepHist?.created_at) stepDate = new Date(stepHist.created_at).toLocaleDateString('en-GB');
          } else if (i === currentIdx) {
            stepStatus = 'Pending';
            stepSub = pendingApproverName ? `${pendingApproverName} • ${stepLoc}` : `Awaiting ${step.role_name || step.step_label} Approval • ${stepLoc}`;
          } else {
            stepStatus = 'Future';
          }
        }

        dynamicItems.push({
          title: roleTitle,
          subtitle: stepSub,
          status: stepStatus,
          date: stepDate,
        });
      }
    }
  }

  const items: Array<{
    title: string;
    subtitle?: string;
    status: 'Approved' | 'Rejected' | 'Pending' | 'Future';
    date?: string;
  }> = dynamicItems || (isRayRent
    ? [
        {
          title: "SUBMIT",
          subtitle: "Application Submitted",
          status: "Approved" as const,
        },
        {
          title: "BRANCH LEADER",
          subtitle: step1Subtitle,
          status: step1Status,
          date: step1Date,
        },
        ...(rayRentShowFinalStep
          ? [{
              title: rayRentTitle,
              subtitle: step2Subtitle,
              status: step2Status,
              date: step2Date,
            }]
          : []),
      ]
    : isRayharVacation
    ? [
        {
          title: "SUBMIT",
          subtitle: "Application Submitted",
          status: "Approved",
        },
        {
          title: "ADMINISTRATIVE ASSISTANT",
          subtitle: rvStep1Subtitle,
          status: rvStep1Status,
          date: rvStep1Date,
        },
        {
          title: "GENERAL MANAGER",
          subtitle: rvStep2Subtitle,
          status: rvStep2Status,
          date: rvStep2Date,
        },
      ]
    : isHrWorkflow
    ? [
        {
          title: "SUBMIT",
          subtitle: "Application Submitted",
          status: "Approved",
        },
        {
          title: "HR ADMIN",
          subtitle: hrSubtitle,
          status: stepHrStatus,
          date: hrDate,
        }
      ]
    : [
        {
          title: "SUBMIT",
          subtitle: "Application Submitted",
          status: "Approved",
        },
        {
          title: lvl1RoleTitle,
          subtitle: step1Subtitle,
          status: step1Status,
          date: step1Date,
        },
        {
          title: lvl2RoleTitle,
          subtitle: step2Subtitle,
          status: step2Status,
          date: step2Date,
        }
      ]);

  return (
    <div className="w-full py-2">
      <div className="flex items-start justify-between relative">
        {items.map((item, idx) => {
          const itemApproved = item.status === 'Approved';
          const itemRejected = item.status === 'Rejected';
          const itemPending = item.status === 'Pending';
          const itemFuture = item.status === 'Future';

          const isLast = idx === items.length - 1;

          const circleBorder = itemApproved
            ? 'border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50'
            : itemRejected
            ? 'border-rose-500 bg-rose-50 text-rose-600 dark:bg-rose-950/50'
            : itemPending
            ? 'border-[#942392] bg-purple-50 text-[#942392] dark:bg-purple-950/50 shadow-md shadow-[#942392]/20 animate-pulse'
            : 'border-slate-300 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-800';

          const badgeBg = itemApproved
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
            : itemRejected
            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
            : itemPending
            ? 'bg-[#942392]/10 text-[#942392] dark:text-purple-300 border-[#942392]/20'
            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200';

          return (
            <React.Fragment key={idx}>
              {/* Step Item */}
              <div className="flex flex-col items-center text-center flex-1 z-10 min-w-0 px-1">
                {/* Node Icon */}
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center mb-2 shadow-sm transition-all ${circleBorder}`}>
                  {itemApproved && <Check className="w-4 h-4 font-black" strokeWidth={3.5} />}
                  {itemRejected && <X className="w-4 h-4 font-black" strokeWidth={3.5} />}
                  {itemPending && <Clock className="w-4 h-4 font-bold animate-spin" />}
                  {itemFuture && <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />}
                </div>

                {/* Status Badge */}
                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border mb-1 whitespace-nowrap ${badgeBg}`}>
                  {item.status === 'Future' ? (isRejected ? '-' : 'PENDING') : item.status.toUpperCase()}
                </span>

                {/* Title (Role) */}
                <h4 className="text-[11px] font-black text-foreground truncate max-w-full">
                  {item.title}
                </h4>

                {/* Subtitle (Approver Name / Context) */}
                {item.subtitle && (
                  <p className="text-[9px] font-bold text-muted-foreground truncate max-w-full mt-0.5">
                    {item.subtitle}
                  </p>
                )}

                {/* Date */}
                {item.date && (
                  <span className="text-[8px] font-bold text-foreground/50 mt-0.5">
                    {item.date}
                  </span>
                )}
              </div>

              {/* Connecting Line between steps */}
              {!isLast && (
                <div className="flex-1 flex items-center self-start mt-4 -mx-2 px-1">
                  <div className={`h-[3px] w-full rounded-full transition-colors ${
                    itemApproved && items[idx + 1]?.status === 'Approved'
                      ? 'bg-emerald-500'
                      : itemRejected
                      ? 'bg-rose-400'
                      : 'bg-slate-200 dark:bg-slate-700'
                  }`} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

