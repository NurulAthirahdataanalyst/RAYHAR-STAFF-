with open('src/pages/LeaveFormView.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

old_code = """<ApprovalHistoryTimeline 
                      status={selectedForm.status} 
                      approverRole={selectedForm.approverRole || "HR Admin"} 
                      approvalHistory={selectedForm.approvalHistory}
                      branch={selectedForm.branch || "HQ"} 
                      pendingApproverName={selectedForm.pending_approver_name}
                    />"""

new_code = """<ApprovalHistoryTimeline 
                      status={selectedForm.status} 
                      approverRole={selectedForm.approverRole || "HR Admin"} 
                      approvalHistory={selectedForm.approvalHistory}
                      branch={selectedForm.branch || "HQ"} 
                      department={selectedForm.department || ""}
                      pendingApproverName={selectedForm.pending_approver_name}
                    />"""

if old_code in text:
    text = text.replace(old_code, new_code)
    with open('src/pages/LeaveFormView.tsx', 'w', encoding='utf-8') as f:
        f.write(text)
    print("Updated LeaveFormView")
else:
    print("Not found")
