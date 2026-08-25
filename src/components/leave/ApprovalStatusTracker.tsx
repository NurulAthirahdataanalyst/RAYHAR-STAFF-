import React from 'react';
import { Check, X } from 'lucide-react';

interface ApprovalHistoryItem {
  approver_id?: string;
  approver_role?: string;
  approver_name?: string;
  status: string;
  created_at?: string;
  approver_branch?: string;
}

interface ApprovalStatusTrackerProps {
  status: string; // "Pending", "Approved", "Rejected"
  approverRole: string; // The role that is currently pending or the role that rejected it
  approvalHistory?: ApprovalHistoryItem[]; // Passed from parent
  branch?: string; // Employee branch
}

export function ApprovalStatusTracker({ status, approverRole, approvalHistory = [], branch = "" }: ApprovalStatusTrackerProps) {
  
  if (approvalHistory && approvalHistory.length > 0) {
    return (
      <div className="relative pl-6 space-y-6 before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 dark:before:via-slate-700 before:to-transparent mt-4 mb-4">
        {approvalHistory.map((h, idx) => {
          const isApproved = h.status === 'Approved';
          const isRejected = h.status === 'Rejected';
          const colorClass = isApproved ? 'text-emerald-500 bg-emerald-500/10' : (isRejected ? 'text-rose-500 bg-rose-500/10' : 'text-[#7B0099] bg-[#7B0099]/10');
          const borderClass = isApproved ? 'border-emerald-500' : (isRejected ? 'border-rose-500' : 'border-[#7B0099]');
          
          let dateStr = "";
          if (h.created_at) {
             const d = new Date(h.created_at);
             dateStr = d.toLocaleDateString('en-GB');
          }
          
          return (
            <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className={`flex items-center justify-center w-6 h-6 rounded-full border-[3px] bg-white dark:bg-slate-900 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 ${borderClass} ${isApproved ? 'text-emerald-500' : (isRejected ? 'text-rose-500' : 'text-[#7B0099]')}`}>
                {isApproved && <Check className="w-3.5 h-3.5 font-bold" strokeWidth={4} />}
                {isRejected && <X className="w-3.5 h-3.5 font-bold" strokeWidth={4} />}
                {!isApproved && !isRejected && <div className="w-2 h-2 rounded-full bg-[#7B0099]" />}
              </div>
              
              <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] p-3 rounded border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex flex-col gap-1">
                     <div className="flex items-center gap-2">
                       <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${colorClass}`}>
                          {h.status}
                       </span>
                     </div>
                     <span className="text-[11px] font-bold text-foreground">
                        by {h.approver_name || h.approver_id} ({h.approver_role || 'Manager'}{h.approver_branch ? ` [${h.approver_branch}]` : ''})
                     </span>
                  </div>
                  {dateStr && (
                     <div className="text-[10px] font-bold text-muted-foreground whitespace-nowrap">
                        {dateStr}
                     </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        
        {/* If the overall status is pending, show the pending step */}
        {status === 'Pending' && (
           <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className="flex items-center justify-center w-6 h-6 rounded-full border-[3px] bg-white dark:bg-slate-900 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 border-[#7B0099] text-[#7B0099]">
                <div className="w-2 h-2 rounded-full bg-[#7B0099]" />
              </div>
              <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] p-3 rounded border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-800 opacity-60">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                     <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded text-[#7B0099] bg-[#7B0099]/10">
                        PENDING
                     </span>
                     <span className="text-[11px] font-bold text-foreground">
                        Pending {approverRole ? `at ${approverRole}` : 'Approval'}
                     </span>
                  </div>
                </div>
              </div>
            </div>
        )}
      </div>
    );
  }

  // Fallback to vertical layout with correct branch logic if no explicit history is provided
  const role = String(approverRole || "").toLowerCase();
  const isHQ = String(branch).toUpperCase() === 'HQ';
  
  let currentStep = 0;
  
  if (isHQ) {
    if (role.includes("hod")) currentStep = 1;
    else if (role.includes("operation")) currentStep = 2;
  } else {
    if (role.includes("branch") || role.includes("leader")) currentStep = 1;
    else if (role.includes("md") || role.includes("managing") || role.includes("director")) currentStep = 2;
  }
  
  const steps = isHQ 
    ? ["Submit", "HOD", "Operation Manager"] 
    : ["Submit", "Branch Leader", "MD"];
    
  if (status === 'Approved') currentStep = steps.length;
  
  return (
    <div className="relative pl-6 space-y-6 before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 dark:before:via-slate-700 before:to-transparent mt-4 mb-4">
      {steps.map((step, idx) => {
        let nodeState = "pending"; 
        
        if (idx === 0) {
          nodeState = "approved"; 
        } else if (status === 'Approved') {
          nodeState = "approved";
        } else if (status === 'Rejected') {
          if (idx < currentStep) nodeState = "approved";
          else if (idx === currentStep) nodeState = "rejected";
          else nodeState = "future";
        } else {
          if (idx < currentStep) nodeState = "approved";
          else if (idx === currentStep) nodeState = "pending";
          else nodeState = "future";
        }
        
        if (nodeState === "future") return null;

        const isApproved = nodeState === 'approved';
        const isRejected = nodeState === 'rejected';
        const colorClass = isApproved ? 'text-emerald-500 bg-emerald-500/10' : (isRejected ? 'text-rose-500 bg-rose-500/10' : 'text-[#7B0099] bg-[#7B0099]/10');
        const borderClass = isApproved ? 'border-emerald-500' : (isRejected ? 'border-rose-500' : 'border-[#7B0099]');
        
        return (
          <div key={idx} className={`relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active ${nodeState === 'pending' ? 'opacity-60' : ''}`}>
            <div className={`flex items-center justify-center w-6 h-6 rounded-full border-[3px] bg-white dark:bg-slate-900 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 ${borderClass} ${isApproved ? 'text-emerald-500' : (isRejected ? 'text-rose-500' : 'text-[#7B0099]')}`}>
              {isApproved && <Check className="w-3.5 h-3.5 font-bold" strokeWidth={4} />}
              {isRejected && <X className="w-3.5 h-3.5 font-bold" strokeWidth={4} />}
              {nodeState === 'pending' && <div className="w-2 h-2 rounded-full bg-[#7B0099]" />}
            </div>
            
            <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] p-3 rounded border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex flex-col gap-1">
                   <div className="flex items-center gap-2">
                     <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${colorClass}`}>
                        {nodeState === 'pending' ? 'PENDING' : nodeState.toUpperCase()}
                     </span>
                   </div>
                   <span className="text-[11px] font-bold text-foreground">
                      {step}
                   </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
