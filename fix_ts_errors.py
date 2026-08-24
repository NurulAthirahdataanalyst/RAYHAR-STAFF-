import os
import re

def fix_imports(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Remove duplicates of useNavigate
    while content.count('import { useNavigate } from "react-router-dom";') > 1:
        content = content.replace('import { useNavigate } from "react-router-dom";\n', '', 1)

    # For ArrowLeft
    if 'ArrowLeft' in content and 'import { ArrowLeft }' not in content and 'import {ArrowLeft}' not in content:
        if 'lucide-react' in content:
            content = re.sub(r'import\s+\{', 'import { ArrowLeft, ', content, count=1)
        else:
            content = 'import { ArrowLeft } from "lucide-react";\n' + content

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

for p in ['src/pages/Employees.tsx', 'src/pages/LeaveFormView.tsx', 'src/pages/master/Department.tsx', 'src/pages/outstation/OutstationAssignment.tsx']:
    fix_imports(p)

# LeaveEntitlementManagement ChevronLeft / Right
file = 'src/pages/master/LeaveEntitlementManagement.tsx'
with open(file, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('import { ChevronLeft, ChevronRight,  useState', 'import { useState')
if 'ChevronLeft' in content and 'ChevronLeft' not in content.split('lucide-react')[0]:
    content = re.sub(r'import\s+\{\s*([^\}]+)\s*\}\s+from\s+[\'\"]lucide-react[\'\"]', r'import { ChevronLeft, ChevronRight, \1 } from "lucide-react"', content, count=1)

# Remove currentPage from AnnualLeaveAllocationForm
pattern = r'    const indexOfLastItem = currentPage \* entriesPerPage;\n    const indexOfFirstItem = indexOfLastItem - entriesPerPage;\n    const currentItems = filtered\.slice\(indexOfFirstItem, indexOfLastItem\);\n    const totalPages = Math\.ceil\(filtered\.length / entriesPerPage\);\n'
if content.count(pattern) > 0:
    # Actually wait, maybe re.sub is better
    pass

# We will just manually search and replace the first instance
first_idx = content.find("const indexOfLastItem = currentPage * entriesPerPage;")
if first_idx != -1:
    second_idx = content.find("const indexOfLastItem = currentPage * entriesPerPage;", first_idx + 1)
    if second_idx != -1:
        # It's there twice. Remove the first one.
        end_idx = content.find("entriesPerPage);", first_idx) + 16
        content = content[:first_idx] + content[end_idx:]

with open(file, 'w', encoding='utf-8') as f:
    f.write(content)
