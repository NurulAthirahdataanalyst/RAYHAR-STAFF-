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
}

export function ApprovalStatusTracker({ status, approverRole, approvalHistory = [] }: ApprovalStatusTrackerProps) {
  
  // Normalize history and fallback steps to a unified array of items to render horizontally
  let items: any[] = [];
  
  if (approvalHistory && approvalHistory.length > 0) {
    items = approvalHistory.map(h => ({
      status: h.status,
      name: h.approver_name || h.approver_id,
      role: h.approver_role || 'Manager',
      date: h.created_at ? new Date(h.created_at).toLocaleDateString('en-GB') : ''
    }));
    
    if (status === 'Pending') {
      items.push({
        status: 'Pending',
        name: approverRole ? `at ${approverRole}` : 'Approval',
        role: '',
        date: ''
      });
    }
  } else {
    const role = String(approverRole || "").toLowerCase();
    let currentStep = 0; 
    if (role.includes("branch") || role.includes("hod")) currentStep = 1;
    else if (role.includes("operation") || role.includes("finance")) currentStep = 2;
    else if (role.includes("md") || role.includes("managing") || role.includes("director")) currentStep = 3;
    
    if (status === 'Approved') currentStep = 4;
    
    const steps = ["Submit", "HOD", "Operation Manager", "MD"];
    
    steps.forEach((step, idx) => {
      let nodeState = "Pending"; 
      if (idx === 0 || status === 'Approved' || (status === 'Rejected' && idx < currentStep) || (status !== 'Rejected' && idx < currentStep)) {
        nodeState = "Approved";
      } else if (status === 'Rejected' && idx === currentStep) {
        nodeState = "Rejected";
      } else if (idx === currentStep) {
        nodeState = "Pending";
      } else {
        nodeState = "Future";
      }
      
      if (nodeState !== "Future") {
        items.push({
          status: nodeState,
          name: step,
          role: '',
          date: ''
        });
      }
    });
  }

  return (
    <div className="w-full py-4 overflow-x-auto hide-scrollbar">
      <div className="flex flex-row items-start justify-between min-w-[500px] relative">
        {/* Horizontal connecting line */}
        <div className="absolute top-4 left-[10%] right-[10%] h-[2px] bg-slate-200 dark:bg-slate-700 z-0 translate-y-[-50%]" />
        
        {items.map((item, idx) => {
          const isApproved = item.status === 'Approved';
          const isRejected = item.status === 'Rejected';
          const isPending = item.status === 'Pending';
          
          const colorClass = isApproved ? 'text-emerald-500 bg-emerald-500/10' : (isRejected ? 'text-rose-500 bg-rose-500/10' : 'text-[#7B0099] bg-[#7B0099]/10');
          const borderClass = isApproved ? 'border-emerald-500' : (isRejected ? 'border-rose-500' : 'border-[#7B0099]');
          const iconColor = isApproved ? 'text-emerald-500' : (isRejected ? 'text-rose-500' : 'text-[#7B0099]');
          
          return (
            <div key={idx} className={`relative z-10 flex flex-col items-center flex-1 ${isPending ? 'opacity-60' : ''}`}>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full border-[3px] bg-white dark:bg-slate-900 shadow shrink-0 ${borderClass} ${iconColor}`}>
                {isApproved && <Check className="w-4 h-4 font-bold" strokeWidth={4} />}
                {isRejected && <X className="w-4 h-4 font-bold" strokeWidth={4} />}
                {isPending && <div className="w-2.5 h-2.5 rounded-full bg-[#7B0099]" />}
              </div>
              
              <div className="mt-3 flex flex-col items-center text-center px-1">
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded mb-1 ${colorClass}`}>
                  {item.status}
                </span>
                <span className="text-[11px] font-bold text-foreground leading-tight">
                  {item.name}
                </span>
                {item.role && (
                  <span className="text-[9px] text-muted-foreground mt-0.5">
                    {item.role}
                  </span>
                )}
                {item.date && (
                  <span className="text-[9px] font-bold text-slate-400 mt-1">
                    {item.date}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
