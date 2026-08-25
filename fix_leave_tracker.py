import re

file = 'src/pages/LeaveFormView.tsx'
with open(file, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the vertical timeline with the horizontal ApprovalStatusTracker
old_timeline_block = """                  {/* Approval History Timeline */}
                  {selectedForm.approvalHistory && selectedForm.approvalHistory.length > 0 && (
                    <div className="space-y-4 pt-4 border-t border-border/50">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[#7B0099]" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Approval History</h3>
                      </div>
                      
<div className="relative space-y-4 before:absolute before:inset-0 before:ml-4 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border/50 before:to-transparent">
  {selectedForm.approvalHistory?.map((history, idx) => {
    const isLast = idx === selectedForm.approvalHistory.length - 1;
    const hStatus = (selectedForm.status === 'Rejected' && isLast) ? 'Rejected' : history.status;
    return (
      <div key={idx} className="relative flex items-start gap-4">
        {hStatus === 'Approved' ? (
          <div className="flex items-center justify-center w-6 h-6 rounded-full border-[3px] border-emerald-600 bg-white dark:bg-slate-900 shadow-sm z-10 -ml-1">
            <Check className="w-4 h-4 text-emerald-600" strokeWidth={4} />
          </div>
        ) : (
          <div className="flex items-center justify-center w-6 h-6 rounded-full border-[3px] border-rose-600 bg-white dark:bg-slate-900 shadow-sm z-10 -ml-1">
            <X className="w-4 h-4 text-rose-600" strokeWidth={4} />
          </div>
        )}
        <div className="ml-4 flex-1 bg-muted/30 rounded-[16px] p-3 border border-border/40">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${hStatus === 'Approved' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                {hStatus}
              </span>
              <span className="text-[10px] font-black text-foreground/70">
                by {history.approver_name || history.approver_id} ({formatApproverRole(history.approver_role, history.approver_department, history.approver_branch)})
              </span>
            </div>
            <span className="text-[8px] font-black text-foreground/50">
              {new Date(history.created_at).toLocaleDateString('ms-MY')}
            </span>
          </div>
          {history.remarks && (
            <p className="text-[10px] italic text-foreground bg-white/50 dark:bg-black/20 p-2 rounded-lg mt-1">
              "{history.remarks}"
            </p>
          )}
        </div>
      </div>
    );
  })}
</div>
</div>
)}"""

new_timeline_block = """                  {/* Approval History Timeline */}
                  <div className="space-y-4 pt-4 border-t border-border/50">
                    <div className="flex items-center gap-2 mb-4">
                      <Clock className="w-4 h-4 text-[#7B0099]" />
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Approval Status Tracker</h3>
                    </div>
                    <ApprovalStatusTracker 
                      status={selectedForm.status} 
                      approverRole={selectedForm.approverRole || "HR Admin"} 
                      approvalHistory={selectedForm.approvalHistory} 
                    />
                    
                    {/* Render remarks below the tracker if they exist */}
                    {selectedForm.approvalHistory && selectedForm.approvalHistory.length > 0 && selectedForm.approvalHistory.some(h => h.remarks) && (
                      <div className="mt-4 space-y-2">
                        {selectedForm.approvalHistory.filter(h => h.remarks).map((history, idx) => (
                          <div key={idx} className="bg-muted/30 rounded-xl p-3 border border-border/40">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-[10px] font-black text-foreground/70">
                                Remark by {history.approver_name || history.approver_id}
                              </span>
                              <span className="text-[8px] font-black text-foreground/50">
                                {new Date(history.created_at).toLocaleDateString('ms-MY')}
                              </span>
                            </div>
                            <p className="text-[10px] italic text-foreground bg-white/50 dark:bg-black/20 p-2 rounded-lg mt-1">
                              "{history.remarks}"
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>"""

if old_timeline_block in content:
    content = content.replace(old_timeline_block, new_timeline_block)
    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)
    print("LeaveFormView.tsx approval history replaced with ApprovalStatusTracker!")
else:
    print("Could not find the exact old_timeline_block block in LeaveFormView.tsx.")
    # Attempting manual search
    import sys
    sys.exit(1)
