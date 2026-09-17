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
  approvalHistory?: ApprovalHistoryItem[]; // Passed from parent
  branch?: string; // Employee branch
  department?: string;
  pendingApproverName?: string;
  pendingApproverContext?: string;
}

const formatRoleName = (r?: string) => {
  if (!r) return "MANAGER";
  const map: Record<string, string> = {
    branch_leader: "BRANCH LEADER",
    managing_director: "MANAGING DIRECTOR",
    operation_manager: "OPERATION MANAGER",
    finance_manager: "OPERATION MANAGER",
    head_of_department: "HEAD OF DEPARTMENT",
    hr_admin: "HR ADMIN",
    branch_officer: "BRANCH OFFICER",
    employee: "EMPLOYEE",
  };
  const key = r.toLowerCase().trim();
  return map[key] || r.replace(/_/g, ' ').toUpperCase();
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
  approvalHistory = [], 
  branch = "",
  department = "",
  pendingApproverName = "",
  pendingApproverContext = "",
}: ApprovalStatusTrackerProps) {
  const isHQ = String(branch).toUpperCase() === 'HQ';
  const sUpper = String(status || "").toUpperCase();

  // Find approval records in history
  const lvl1History = (approvalHistory || []).find(h => {
    const r = String(h.approver_role || "").toLowerCase();
    return r.includes("hod") || r.includes("department") || r.includes("branch");
  });

  const lvl2History = (approvalHistory || []).find(h => {
    const r = String(h.approver_role || "").toLowerCase();
    return r.includes("operation") || r.includes("finance") || r.includes("managing") || r.includes("director") || r.includes("md");
  });

  // Determine stage flags
  const isApproved = sUpper === 'APPROVED';
  const isRejected = sUpper === 'REJECTED';

  const isLvl1Pending = sUpper.includes('HOD') || sUpper.includes('BRANCH') || sUpper === 'PENDING';
  const isLvl2Pending = sUpper.includes('OPERATION') || sUpper.includes('FINANCE') || sUpper.includes('MD') || sUpper.includes('MANAGING');

  // Step 1 status & details
  let step1Status: 'Approved' | 'Rejected' | 'Pending' | 'Future' = 'Future';
  let step1Subtitle: string | undefined = undefined;
  let step1Date: string | undefined = undefined;

  const lvl1RoleTitle = isHQ ? "HEAD OF DEPARTMENT" : "BRANCH LEADER";
  const lvl1Context = isHQ 
    ? formatDept(lvl1History?.approver_department || pendingApproverContext || department) 
    : (lvl1History?.approver_branch || pendingApproverContext || branch || "HQ");

  if (lvl1History) {
    const isL1Approved = String(lvl1History.status).toLowerCase() === 'approved';
    step1Status = isL1Approved ? 'Approved' : 'Rejected';
    step1Subtitle = lvl1History.approver_name 
      ? `${lvl1History.approver_name} • ${lvl1Context}` 
      : `Approved • ${lvl1Context}`;
    if (lvl1History.created_at) {
      step1Date = new Date(lvl1History.created_at).toLocaleDateString('en-GB');
    }
  } else if (isApproved || isLvl2Pending) {
    step1Status = 'Approved';
    step1Subtitle = `Approved • ${lvl1Context}`;
  } else if (isRejected && !lvl2History) {
    step1Status = 'Rejected';
    step1Subtitle = pendingApproverName ? `${pendingApproverName} • ${lvl1Context}` : `Rejected • ${lvl1Context}`;
  } else if (isLvl1Pending) {
    step1Status = 'Pending';
    step1Subtitle = pendingApproverName 
      ? `${pendingApproverName} • ${lvl1Context}` 
      : 'Awaiting Approval';
  }

  // Step 2 status & details
  let step2Status: 'Approved' | 'Rejected' | 'Pending' | 'Future' = 'Future';
  let step2Subtitle: string | undefined = undefined;
  let step2Date: string | undefined = undefined;

  const lvl2RoleTitle = isHQ ? "OPERATION MANAGER" : "MANAGING DIRECTOR";
  const lvl2Context = lvl2History?.approver_branch || pendingApproverContext || 'HQ';

  if (lvl2History) {
    const isL2Approved = String(lvl2History.status).toLowerCase() === 'approved';
    step2Status = isL2Approved ? 'Approved' : 'Rejected';
    step2Subtitle = lvl2History.approver_name 
      ? `${lvl2History.approver_name} • ${lvl2Context}` 
      : `Approved • ${lvl2Context}`;
    if (lvl2History.created_at) {
      step2Date = new Date(lvl2History.created_at).toLocaleDateString('en-GB');
    }
  } else if (isApproved) {
    step2Status = 'Approved';
    step2Subtitle = pendingApproverName ? `${pendingApproverName} • ${lvl2Context}` : `Approved • ${lvl2Context}`;
  } else if (isRejected && (lvl2History || isLvl2Pending)) {
    step2Status = 'Rejected';
    step2Subtitle = pendingApproverName ? `${pendingApproverName} • ${lvl2Context}` : `Rejected • ${lvl2Context}`;
  } else if (isLvl2Pending) {
    step2Status = 'Pending';
    step2Subtitle = pendingApproverName 
      ? `${pendingApproverName} • ${lvl2Context}` 
      : 'Awaiting Approval';
  }

  const items: Array<{
    title: string;
    subtitle?: string;
    status: 'Approved' | 'Rejected' | 'Pending' | 'Future';
    date?: string;
  }> = [
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
  ];

  return (
    <div className="w-full py-2">
      <div className="flex items-start justify-between relative">
        {items.map((item, idx) => {
          const isApproved = item.status === 'Approved';
          const isRejected = item.status === 'Rejected';
          const isPending = item.status === 'Pending';
          const isFuture = item.status === 'Future';

          const isLast = idx === items.length - 1;

          const circleBorder = isApproved
            ? 'border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50'
            : isRejected
            ? 'border-rose-500 bg-rose-50 text-rose-600 dark:bg-rose-950/50'
            : isPending
            ? 'border-[#942392] bg-purple-50 text-[#942392] dark:bg-purple-950/50 shadow-md shadow-[#942392]/20 animate-pulse'
            : 'border-slate-300 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-800';

          const badgeBg = isApproved
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
            : isRejected
            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
            : isPending
            ? 'bg-[#942392]/10 text-[#942392] dark:text-purple-300 border-[#942392]/20'
            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200';

          return (
            <React.Fragment key={idx}>
              {/* Step Item */}
              <div className="flex flex-col items-center text-center flex-1 z-10 min-w-0 px-1">
                {/* Node Icon */}
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center mb-2 shadow-sm transition-all ${circleBorder}`}>
                  {isApproved && <Check className="w-4 h-4 font-black" strokeWidth={3.5} />}
                  {isRejected && <X className="w-4 h-4 font-black" strokeWidth={3.5} />}
                  {isPending && <Clock className="w-4 h-4 font-bold animate-spin" />}
                  {isFuture && <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />}
                </div>

                {/* Status Badge */}
                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border mb-1 whitespace-nowrap ${badgeBg}`}>
                  {item.status === 'Future' ? 'PENDING' : item.status.toUpperCase()}
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
                    isApproved ? 'bg-emerald-500' : isRejected ? 'bg-rose-400' : 'bg-slate-200 dark:bg-slate-700'
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

