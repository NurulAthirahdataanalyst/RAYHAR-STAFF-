import re
import os

with open('src/pages/LeaveOverview.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add branch to formattedRequests
content = content.replace(
    'days: Number(request.days || 0),',
    'days: Number(request.days || 0),\n            branch: request.branch || "HQ",'
)

# Update ApprovalStatusTracker usage
content = content.replace(
    '<ApprovalStatusTracker status={req.status} approverRole={req.approverRole} />',
    '<ApprovalStatusTracker status={req.status} approverRole={req.approverRole} branch={(req as any).branch || "HQ"} />'
)

with open('src/pages/LeaveOverview.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated LeaveOverview.tsx")
