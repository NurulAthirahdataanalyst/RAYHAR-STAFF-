import re

file_path = "c:\\Users\\HP\\ATTENDANCE_SYSTEM\\src\\pages\\Attendance.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = re.sub(
    r'if \(acc !== undefined\) payload\.accuracy = acc;\n        \}',
    'if (acc !== undefined) payload.accuracy = acc;\n          if (dist !== undefined) payload.distance = dist;\n        }',
    content
)

old_pattern = r"const branchCode = user\?\.branch \|\| 'HQ';\s*const branchInfo = branches\.find\(\(b: any\) => b\.code === branchCode \|\| b\.name === branchCode\);\s*if \(branchInfo && branchInfo\.latitude && branchInfo\.longitude\) \{\s*const radius = branchInfo\.radius \|\| 50;\s*const dist = haversineDistance\(lat, lng, parseFloat\(branchInfo\.latitude\), parseFloat\(branchInfo\.longitude\)\);\s*if \(dist > radius\) \{\s*if \(isOutstationAssigned\) \{\s*setPendingLocation\(\{lat, lng, acc\}\);\s*setOutstationPromptOpen\(true\);\s*setLoading\(false\);\s*return;\s*\} else \{\s*toast\(\{ title: \"Clock In Failed\", description: `You are outside the branch radius \(\$\{radius\}m\)\. Distance: \$\{Math\.round\(dist\)\}m`, variant: \"destructive\" \}\);\s*setLoading\(false\);\s*return;\s*\}\s*\}\s*\}\s*// Either distance <= radius or no branch info found \(fallback to normal clockin\)\s*performClockInOrOut\(employeeId, attendance_type, lat, lng, acc\);"

new_content = """const branchCode = user?.branch || 'HQ';
          const branchInfo = branches.find((b: any) => b.code === branchCode || b.name === branchCode);
          let dist_meters: number | undefined = undefined;

          if (branchInfo && branchInfo.latitude && branchInfo.longitude) {
            const radius = branchInfo.radius || 50;
            dist_meters = Math.round(haversineDistance(lat, lng, parseFloat(branchInfo.latitude), parseFloat(branchInfo.longitude)));
            
            if (dist_meters > radius) {
               if (isOutstationAssigned) {
                 setPendingLocation({lat, lng, acc});
                 setOutstationPromptOpen(true);
                 setLoading(false);
                 return;
               } else {
                 toast({ title: "Clock In Failed", description: `You are outside the branch radius (${radius}m). Distance: ${dist_meters}m`, variant: "destructive" });
                 setLoading(false);
                 return;
               }
            }
          }
          
          // Either distance <= radius or no branch info found (fallback to normal clockin)
          performClockInOrOut(employeeId, attendance_type, lat, lng, acc, dist_meters);"""

content = re.sub(old_pattern, new_content, content, flags=re.DOTALL)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated handleAttendanceAction")
