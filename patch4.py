import re

file_path = 'src/pages/LeaveOverview.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Change title
content = content.replace(
    '<CardTitle className="text-base sm:text-lg font-black text-foreground">Approval History</CardTitle>',
    '<CardTitle className="text-base sm:text-lg font-black text-foreground">Approval Status Tracker</CardTitle>'
)

# 2. Add variant prop
content = content.replace(
    '<ApprovalStatusTracker status={req.status} approverRole={req.approverRole} branch={(req as any).branch || "HQ"} />',
    '<ApprovalStatusTracker status={req.status} approverRole={req.approverRole} branch={(req as any).branch || "HQ"} variant="staggered" />'
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched LeaveOverview.tsx")
