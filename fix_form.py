with open('src/pages/LeaveFormView.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

old_component = """                  <div className="space-y-4 print:space-y-2 pt-4 print:pt-2 border-t border-border/50">
                    <ApprovalHistoryTimeline 
                      status={selectedForm.status} 
                      approverRole={selectedForm.approverRole || "HR Admin"} 
                      approvalHistory={selectedForm.approvalHistory}
                      branch={selectedForm.branch || "HQ"} 
                    />"""

new_component = """                  <div className="space-y-4 print:space-y-2 pt-4 print:pt-2 border-t border-border/50">
                    <ApprovalHistoryTimeline 
                      status={selectedForm.status} 
                      approverRole={selectedForm.approverRole || "HR Admin"} 
                      approvalHistory={selectedForm.approvalHistory}
                      branch={selectedForm.branch || "HQ"} 
                      pendingApproverName={selectedForm.pending_approver_name}
                    />"""

if old_component in text:
    text = text.replace(old_component, new_component)
    with open('src/pages/LeaveFormView.tsx', 'w', encoding='utf-8') as f:
        f.write(text)
    print("Updated LeaveFormView!")
else:
    print("Failed to update LeaveFormView")
