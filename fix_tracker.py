import re
import os

with open('src/components/leave/ApprovalStatusTracker.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add branch?: string to interface
content = content.replace(
    'approvalHistory?: ApprovalHistoryItem[]; // Passed from parent',
    'approvalHistory?: ApprovalHistoryItem[]; // Passed from parent\n  branch?: string; // Employee branch'
)

# Add branch to props
content = content.replace(
    'export function ApprovalStatusTracker({ status, approverRole, approvalHistory = [] }: ApprovalStatusTrackerProps) {',
    'export function ApprovalStatusTracker({ status, approverRole, approvalHistory = [], branch = "" }: ApprovalStatusTrackerProps) {'
)

# Replace the else block logic
old_logic = '''    const role = String(approverRole || "").toLowerCase();
    let currentStep = 0; 
    if (role.includes("branch") || role.includes("hod")) currentStep = 1;
    else if (role.includes("operation") || role.includes("finance")) currentStep = 2;
    else if (role.includes("md") || role.includes("managing") || role.includes("director")) currentStep = 3;
    
    if (status === 'Approved') currentStep = 4;
    
    const steps = ["Submit", "HOD", "Operation Manager", "MD"];'''

new_logic = '''    const role = String(approverRole || "").toLowerCase();
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
      
    if (status === 'Approved') currentStep = steps.length;'''

content = content.replace(old_logic, new_logic)

with open('src/components/leave/ApprovalStatusTracker.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated ApprovalStatusTracker.tsx")
