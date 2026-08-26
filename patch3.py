import re

file_path = 'src/components/leave/ApprovalStatusTracker.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update Props Interface
old_props = '''interface ApprovalStatusTrackerProps {
  status: string; // "Pending", "Approved", "Rejected"
  approverRole: string; // The role that is currently pending or the role that rejected it
  approvalHistory?: any[]; // Passed from parent
  branch?: string; // Employee branch
}

export function ApprovalStatusTracker({ status, approverRole, approvalHistory = [], branch = "" }: ApprovalStatusTrackerProps) {'''

# Find the exact props interface definition in the file
interface_match = re.search(r'interface ApprovalStatusTrackerProps \{.*?\}.*?export function ApprovalStatusTracker\([^)]*\) \{', content, re.DOTALL)
if interface_match:
    original_interface = interface_match.group(0)
    new_interface = original_interface.replace('branch = ""', 'branch = "", variant = "linear"').replace('branch?: string;', 'branch?: string;\n  variant?: "staggered" | "linear";')
    content = content.replace(original_interface, new_interface)
else:
    print("Failed to find ApprovalStatusTrackerProps")

# 2. Add container layout variables inside the component
layout_vars = '''
  const isStaggered = variant === 'staggered';
  
  const containerClass = isStaggered 
    ? "relative pl-6 space-y-6 before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 dark:before:via-slate-700 before:to-transparent mt-4 mb-4"
    : "relative border-l-2 border-slate-200 dark:border-slate-700 ml-3 space-y-6 pb-4 mt-4";
    
  const itemWrapperClass = isStaggered
    ? "relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
    : "relative pl-6";
    
  const getIconClass = (borderClass, extraClass) => isStaggered
    ? lex items-center justify-center w-6 h-6 rounded-full border-[3px] bg-white dark:bg-slate-900 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10  
    : bsolute -left-[13px] top-2 w-6 h-6 rounded-full border-[3px] bg-white dark:bg-slate-900 shadow z-10 flex items-center justify-center  ;
    
  const getCardClass = () => isStaggered 
    ? "w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] p-3 rounded border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-800"
    : "p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-800";
'''

content = content.replace('export function ApprovalStatusTracker(', 'export function ApprovalStatusTracker(') # no-op just to find it
# actually insert after the opening brace of the function
func_start = content.find('ApprovalStatusTrackerProps) {') + len('ApprovalStatusTrackerProps) {')
content = content[:func_start] + layout_vars + content[func_start:]

# 3. Replace the JSX returned by approvalHistory block
old_history_jsx = '''    if (approvalHistory && approvalHistory.length > 0) {
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
                <div className={lex items-center justify-center w-6 h-6 rounded-full border-[3px] bg-white dark:bg-slate-900 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10  }>
                  {isApproved && <Check className="w-3.5 h-3.5 font-bold" strokeWidth={4} />}
                  {isRejected && <X className="w-3.5 h-3.5 font-bold" strokeWidth={4} />}
                  {!isApproved && !isRejected && <div className="w-2 h-2 rounded-full bg-[#7B0099]" />}
                </div>
                
                <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] p-3 rounded border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex flex-col gap-1">
                       <div className="flex items-center gap-2">
                         <span className={	ext-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded }>
                            {h.status}
                         </span>
                       </div>
                       <span className="text-[11px] font-bold text-foreground">
                          by {h.approver_name || h.approver_id} ({h.approver_role || 'Manager'}{h.approver_branch ?  [] : ''})
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
                          Pending {approverRole ? t  : 'Approval'}
                       </span>
                    </div>
                  </div>
                </div>
              </div>
          )}
        </div>
      );
    }'''
# Let's use regex to replace it because white-spaces might differ slightly
history_regex = re.compile(r'if \(approvalHistory && approvalHistory\.length > 0\) \{.*?return \(\s*<div className="relative pl-6 space-y-6 before:absolute.*?</div>\s*\);\s*\}', re.DOTALL)
new_history_jsx = '''if (approvalHistory && approvalHistory.length > 0) {
      return (
        <div className={containerClass}>
          {approvalHistory.map((h, idx) => {
            const isApproved = h.status === 'Approved';
            const isRejected = h.status === 'Rejected';
            const colorClass = isApproved ? 'text-emerald-500 bg-emerald-500/10' : (isRejected ? 'text-rose-500 bg-rose-500/10' : 'text-[#7B0099] bg-[#7B0099]/10');
            const borderClass = isApproved ? 'border-emerald-500' : (isRejected ? 'border-rose-500' : 'border-[#7B0099]');
            const extraClass = isApproved ? 'text-emerald-500' : (isRejected ? 'text-rose-500' : 'text-[#7B0099]');
            
            let dateStr = "";
            if (h.created_at) {
               const d = new Date(h.created_at);
               dateStr = d.toLocaleDateString('en-GB');
            }
            
            return (
              <div key={idx} className={itemWrapperClass}>
                <div className={getIconClass(borderClass, extraClass)}>
                  {isApproved && <Check className="w-3.5 h-3.5 font-bold" strokeWidth={4} />}
                  {isRejected && <X className="w-3.5 h-3.5 font-bold" strokeWidth={4} />}
                  {!isApproved && !isRejected && <div className="w-2 h-2 rounded-full bg-[#7B0099]" />}
                </div>
                
                <div className={getCardClass()}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex flex-col gap-1">
                       <div className="flex items-center gap-2">
                         <span className={	ext-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded }>
                            {h.status}
                         </span>
                         {!isStaggered && <span className="text-[11px] font-bold text-foreground">
                            by {h.approver_name || h.approver_id} ({h.approver_role || 'Manager'}{h.approver_branch ?  [] : ''})
                         </span>}
                       </div>
                       {isStaggered && <span className="text-[11px] font-bold text-foreground">
                          by {h.approver_name || h.approver_id} ({h.approver_role || 'Manager'}{h.approver_branch ?  [] : ''})
                       </span>}
                    </div>
                    {dateStr && (
                       <div className="text-[10px] font-bold text-foreground whitespace-nowrap">
                          {dateStr}
                       </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          
          {status === 'Pending' && (
             <div className={${itemWrapperClass} }>
                <div className={getIconClass('border-[#7B0099]', 'text-[#7B0099]')}>
                  <div className="w-2 h-2 rounded-full bg-[#7B0099]" />
                </div>
                <div className={${getCardClass()} }>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded text-[#7B0099] bg-[#7B0099]/10">
                          PENDING
                       </span>
                       <span className="text-[11px] font-bold text-foreground">
                          Pending {approverRole ? t  : 'Approval'}
                       </span>
                    </div>
                  </div>
                </div>
              </div>
          )}
        </div>
      );
    }'''

content = history_regex.sub(new_history_jsx, content)

# 4. Replace the JSX returned by the fallback staggered block
fallback_regex = re.compile(r'return \(\s*<div className="relative pl-6 space-y-6 before:absolute before:inset-0 before:ml-2\.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0\.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 dark:before:via-slate-700 before:to-transparent mt-4 mb-4">.*?</div>\s*\);\s*\}', re.DOTALL)
new_fallback_jsx = '''return (
    <div className={containerClass}>
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
        const extraClass = isApproved ? 'text-emerald-500' : (isRejected ? 'text-rose-500' : 'text-[#7B0099]');
        
        return (
          <div key={idx} className={${itemWrapperClass} }>
            <div className={getIconClass(borderClass, extraClass)}>
              {isApproved && <Check className="w-3.5 h-3.5 font-bold" strokeWidth={4} />}
              {isRejected && <X className="w-3.5 h-3.5 font-bold" strokeWidth={4} />}
              {nodeState === 'pending' && <div className="w-2 h-2 rounded-full bg-[#7B0099]" />}
            </div>
            
            <div className={${getCardClass()} }>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex flex-col gap-1">
                   <div className="flex items-center gap-2">
                     <span className={	ext-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded }>
                        {nodeState === 'pending' ? 'PENDING' : nodeState.toUpperCase()}
                     </span>
                     {!isStaggered && <span className="text-[11px] font-bold text-foreground">
                        {step}
                     </span>}
                   </div>
                   {isStaggered && <span className="text-[11px] font-bold text-foreground">
                      {step}
                   </span>}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}'''
content = fallback_regex.sub(new_fallback_jsx, content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched ApprovalStatusTracker.tsx")
