import re

with open('src/components/leave/LeaveDetailsModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'approvalHistory={selectedRequest.approvalHistory}',
    'approvalHistory={selectedRequest.approvalHistory}\n                          branch={selectedRequest.branch || "HQ"}'
)

with open('src/components/leave/LeaveDetailsModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated LeaveDetailsModal.tsx")


with open('src/pages/LeaveFormView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'approvalHistory={selectedForm.approvalHistory}',
    'approvalHistory={selectedForm.approvalHistory}\n                        branch={selectedForm.branch || "HQ"}'
)

with open('src/pages/LeaveFormView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated LeaveFormView.tsx")
