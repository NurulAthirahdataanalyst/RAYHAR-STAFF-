import React from 'react';
import { Check, X, Clock } from 'lucide-react';

interface ApprovalHistoryItem {
  approver_id?: string;
  approver_role?: string;
  approver_name?: string;
  status: string;
  created_at?: string;
  approver_branch?: string;
}

interface ApprovalStatusTrackerProps {
  variant?: 'horizontal' | 'linear' | 'staggered';
  status: string; // "Pending", "Approved", "Rejected"
  approverRole: string; // The role that is currently pending or the role that rejected it
  approvalHistory?: ApprovalHistoryItem[]; // Passed from parent
  branch?: string; // Employee branch
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

export function ApprovalStatusTracker({ status, approverRole, approvalHistory = [], branch = "" }: ApprovalStatusTrackerProps) {
  const isHQ = String(branch).toUpperCase() === 'HQ';
  const role = String(approverRole || "").toLowerCase();

  // Define standard steps based on branch
  const defaultStepLabels = isHQ 
    ? ["Submit", "HOD", "Operation Manager"] 
    : ["Submit", "Branch Leader", "Managing Director"];

  let currentStepIndex = 0;
  const sUpper = status.toUpperCase();
  if (isHQ) {
    if (role.includes("hod") || sUpper.includes("HOD")) currentStepIndex = 1;
    else if (role.includes("operation") || role.includes("finance") || sUpper.includes("OPERATION") || sUpper.includes("FINANCE")) currentStepIndex = 2;
  } else {
    if (role.includes("branch") || role.includes("leader") || sUpper.includes("BRANCH LEADER")) currentStepIndex = 1;
    else if (role.includes("md") || role.includes("managing") || role.includes("director") || sUpper.includes("MD")) currentStepIndex = 2;
  }
  if (status === 'Approved') currentStepIndex = defaultStepLabels.length;

  // Build unified items to display in horizontal line
  let items: Array<{
    title: string;
    subtitle?: string;
    status: 'Approved' | 'Rejected' | 'Pending' | 'Future';
    date?: string;
  }> = [];

  if (approvalHistory && approvalHistory.length > 0) {
    // We have actual history items
    items = approvalHistory.map((h) => {
      const isApproved = String(h.status).toLowerCase() === 'approved';
      const isRejected = String(h.status).toLowerCase() === 'rejected';
      const dateStr = h.created_at ? new Date(h.created_at).toLocaleDateString('en-GB') : "";
      
      const roleStr = formatRoleName(h.approver_role);
      const branchStr = h.approver_branch ? ` [${h.approver_branch}]` : '';
      const nameStr = h.approver_name || h.approver_id || "";

      return {
        title: roleStr,
        subtitle: nameStr ? `by ${nameStr}${branchStr}` : undefined,
        status: isRejected ? 'Rejected' : (isApproved ? 'Approved' : 'Pending'),
        date: dateStr,
      };
    });

    if (status && status.toLowerCase().startsWith("rejected")) {
      const hasRejected = items.some(i => i.status === 'Rejected');
      if (!hasRejected && items.length > 0) {
        items[items.length - 1].status = 'Rejected';
      }
    }

    // If still pending, append the pending stage
    if (status && status.toLowerCase().startsWith('pending')) {
      const pendingRole = approverRole ? formatRoleName(approverRole) : "MANAGEMENT";
      items.push({
        title: pendingRole,
        subtitle: `Awaiting Approval`,
        status: 'Pending',
      });
    }
  } else {
    // Fallback: 3 default steps
    items = defaultStepLabels.map((label, idx) => {
      let stepStatus: 'Approved' | 'Rejected' | 'Pending' | 'Future' = 'Future';
      if (idx === 0) {
        stepStatus = 'Approved';
      } else if (status === 'Approved') {
        stepStatus = 'Approved';
      } else if (status === 'Rejected') {
        if (idx < currentStepIndex) stepStatus = 'Approved';
        else if (idx === currentStepIndex) stepStatus = 'Rejected';
        else stepStatus = 'Future';
      } else {
        if (idx < currentStepIndex) stepStatus = 'Approved';
        else if (idx === currentStepIndex) stepStatus = 'Pending';
        else stepStatus = 'Future';
      }

      return {
        title: label.toUpperCase(),
        subtitle: idx === 0 ? "Application Submitted" : undefined,
        status: stepStatus,
      };
    });
  }

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

