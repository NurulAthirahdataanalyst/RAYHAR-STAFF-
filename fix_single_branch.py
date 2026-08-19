import re

with open('src/pages/Attendance.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_logic = """          } else {
            // Single branch mode \u2014 check user's home branch only
            const branchCode = selectedLocation || user?.branch || 'HQ';
            const branchInfo = branches.find((b: any) => b.code === branchCode || b.name === branchCode);

            if (branchInfo && branchInfo.latitude && branchInfo.longitude) {"""

new_logic = """          } else {
            // Single branch mode \u2014 check user's home branch only
            const branchCode = selectedLocation || user?.branch || 'HQ';
            const branchInfo = branches.find((b: any) => b.code === branchCode || b.name === branchCode);

            if (!branchInfo || !branchInfo.latitude || !branchInfo.longitude) {
              toast({ title: "Clock In Failed", description: "Your branch location coordinates are not configured in the system. Please contact HR.", variant: "destructive" });
              setLoading(false);
              return;
            }

            if (branchInfo && branchInfo.latitude && branchInfo.longitude) {"""

# Use regex to be safe about encoding
pattern = r'\}\s*else\s*\{\s*// Single branch mode [^\n]*\n\s*const branchCode = selectedLocation \|\| user\?\.branch \|\| \'HQ\';\s*\n\s*const branchInfo = branches\.find\(\(b: any\) => b\.code === branchCode \|\| b\.name === branchCode\);\s*\n\s*if \(branchInfo && branchInfo\.latitude && branchInfo\.longitude\) \{'

replacement = """          } else {
            // Single branch mode \u2014 check user's home branch only
            const branchCode = selectedLocation || user?.branch || 'HQ';
            const branchInfo = branches.find((b: any) => b.code === branchCode || b.name === branchCode);

            if (!branchInfo || !branchInfo.latitude || !branchInfo.longitude) {
              toast({ title: "Clock In Failed", description: "Your branch location coordinates are not configured in the system. Please contact HR.", variant: "destructive" });
              setLoading(false);
              return;
            }

            if (branchInfo && branchInfo.latitude && branchInfo.longitude) {"""

content = re.sub(pattern, replacement, content)

with open('src/pages/Attendance.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
