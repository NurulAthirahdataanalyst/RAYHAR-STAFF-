import React from 'react';
import { Check, X } from 'lucide-react';

interface ApprovalStatusTrackerProps {
  status: string; // "Pending", "Approved", "Rejected"
  approverRole: string; // The role that is currently pending or the role that rejected it
}

export function ApprovalStatusTracker({ status, approverRole }: ApprovalStatusTrackerProps) {
  const role = String(approverRole || "").toLowerCase();
  
  // Determine which step we are at
  let currentStep = 0; // 0 = Submit, 1 = HOD, 2 = Operation Manager, 3 = MD
  if (role.includes("branch") || role.includes("hod")) currentStep = 1;
  else if (role.includes("operation") || role.includes("finance")) currentStep = 2;
  else if (role.includes("md") || role.includes("managing") || role.includes("director")) currentStep = 3;
  
  // If approved, it went all the way
  if (status === 'Approved') currentStep = 4;
  
  const steps = ["Submit", "HOD", "Operation Manager", "MD"];
  
  return (
    <div className="relative w-full py-8 mt-4">
      {/* Background track */}
      <div className="absolute top-1/2 -translate-y-1/2 left-4 right-4 h-1.5 bg-muted/50 dark:bg-muted-foreground/20 rounded-full" />
      
      {/* Active colored track */}
      <div className="absolute top-1/2 -translate-y-1/2 left-4 right-4 h-1.5 rounded-full flex">
        {steps.map((_, idx) => {
          if (idx === steps.length - 1) return null; // 3 segments for 4 steps
          
          let segmentColor = "bg-transparent";
          
          if (status === 'Approved') {
            segmentColor = "bg-emerald-500";
          } else if (status === 'Rejected') {
            if (idx < currentStep - 1) {
              segmentColor = "bg-emerald-500"; // Previously approved steps
            } else if (idx === currentStep - 1) {
              segmentColor = "bg-rose-500"; // The step that rejected it
            } else {
              segmentColor = "bg-transparent"; // Future steps are grey (transparent shows bg)
            }
          } else {
            // Pending
            if (idx < currentStep - 1) {
              segmentColor = "bg-emerald-500"; // Previously approved steps
            } else if (idx === currentStep - 1) {
              // The currently pending step line is green up to the node? Or grey?
              // The mockups show grey for future. Let's leave it transparent.
              segmentColor = "bg-emerald-500 transition-all duration-1000"; // give it some color
              // Wait, if it is pending, the line leading TO it should be green.
            }
          }
          
          return (
            <div key={idx} className={`h-full flex-1 transition-all duration-500 ${segmentColor}`} />
          );
        })}
      </div>
      
      {/* Nodes */}
      <div className="relative flex justify-between px-2">
        {steps.map((step, idx) => {
          let nodeState = "pending"; // "approved", "rejected", "pending", "future"
          
          if (idx === 0) {
            nodeState = "approved"; // Submit is always approved
          } else if (status === 'Approved') {
            nodeState = "approved";
          } else if (status === 'Rejected') {
            if (idx < currentStep) nodeState = "approved";
            else if (idx === currentStep) nodeState = "rejected";
            else nodeState = "future";
          } else {
            // Pending
            if (idx < currentStep) nodeState = "approved";
            else if (idx === currentStep) nodeState = "pending";
            else nodeState = "future";
          }
          
          return (
            <div key={step} className="flex flex-col items-center relative w-16">
              <div 
                className={`w-6 h-6 rounded-full flex items-center justify-center border-[3px] bg-white dark:bg-slate-900 z-10 transition-colors
                  ${nodeState === 'approved' ? 'border-emerald-500 text-emerald-500' : 
                    nodeState === 'rejected' ? 'border-rose-500 text-rose-500' : 
                    nodeState === 'pending' ? 'border-[#7B0099] text-[#7B0099]' : 
                    'border-muted-foreground/30 text-transparent'}`}
              >
                {nodeState === 'approved' && <Check className="w-3.5 h-3.5 font-bold" strokeWidth={4} />}
                {nodeState === 'rejected' && <X className="w-3.5 h-3.5 font-bold" strokeWidth={4} />}
                {nodeState === 'pending' && <div className="w-2 h-2 rounded-full bg-[#7B0099]" />}
                {nodeState === 'future' && <div className="w-2 h-2 rounded-full bg-muted-foreground/20" />}
              </div>
              <p 
                className={`text-[9px] font-black uppercase tracking-tighter absolute -bottom-8 w-24 text-center transition-colors
                  ${nodeState === 'approved' ? 'text-emerald-500' : 
                    nodeState === 'rejected' ? 'text-rose-500' : 
                    nodeState === 'pending' ? 'text-[#7B0099]' : 
                    'text-foreground opacity-40'}`}
              >
                {step}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
