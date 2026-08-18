import re

file_path = "c:\\Users\\HP\\ATTENDANCE_SYSTEM\\src\\pages\\Attendance.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update performClockInOrOut signature and payload
content = re.sub(
    r'const performClockInOrOut = async \(employeeId: string, attendance_type: string, lat\?: number, lng\?: number, acc\?: number\) => \{',
    'const performClockInOrOut = async (employeeId: string, attendance_type: string, lat?: number, lng?: number, acc?: number, dist?: number) => {',
    content
)

content = re.sub(
    r'if \(acc !== undefined\) payload\.accuracy = acc;\n        \}',
    'if (acc !== undefined) payload.accuracy = acc;\n          if (dist !== undefined) payload.distance = dist;\n        }',
    content,
    count=1
)
content = re.sub(
    r'if \(acc !== undefined\) payload\.accuracy = acc;\n        \}',
    'if (acc !== undefined) payload.accuracy = acc;\n          if (dist !== undefined) payload.distance = dist;\n        }',
    content
)

# 2. Add dist_meters calculation in handleAttendanceAction
old_action = """          // Find branch coords
          const branchCode = user?.branch || 'HQ';
          const branchInfo = branches.find((b: any) => b.code === branchCode || b.name === branchCode);
  
          if (branchInfo && branchInfo.latitude && branchInfo.longitude) {
            const radius = branchInfo.radius || 50;
            const dist = haversineDistance(lat, lng, parseFloat(branchInfo.latitude), parseFloat(branchInfo.longitude));
            
            if (dist > radius) {
               if (isOutstationAssigned) {
                 setPendingLocation({lat, lng, acc});
                 setOutstationPromptOpen(true);
                 setLoading(false);
                 return;
               } else {
                 toast({ title: "Clock In Failed", description: `You are outside the branch radius (${radius}m). Distance: ${Math.round(dist)}m`, variant: "destructive" });
                 setLoading(false);
                 return;
               }
            }
          }
          
          // Either distance <= radius or no branch info found (fallback to normal clockin)
          performClockInOrOut(employeeId, attendance_type, lat, lng, acc);"""

new_action = """          // Find branch coords
          const branchCode = user?.branch || 'HQ';
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
                 toast({ title: "Clock In Failed", description: `You are outside the branch radius (${radius}m). Distance: ${Math.round(dist_meters)}m`, variant: "destructive" });
                 setLoading(false);
                 return;
               }
            }
          }
          
          // Either distance <= radius or no branch info found (fallback to normal clockin)
          performClockInOrOut(employeeId, attendance_type, lat, lng, acc, dist_meters);"""

content = content.replace(old_action, new_action)

# 3. Add Distance column in the table
# Header
content = re.sub(
    r'<TableHead className="font-medium">Late</TableHead>',
    '<TableHead className="font-medium">Late</TableHead>\n                      <TableHead className="font-medium">Distance</TableHead>',
    content
)

# Body cell
content = re.sub(
    r'<TableCell className="font-medium text-rose-600">\{log\.late === "00:00" \? "--" : log\.late\}</TableCell>',
    '<TableCell className="font-medium text-rose-600">{log.late === "00h 00m" || log.late === "00:00" || log.late === "--" ? "--" : log.late}</TableCell>\n                          <TableCell className="font-medium text-foreground">{log.distance ? `${log.distance} m` : "--"}</TableCell>',
    content
)

# Colspan loading state
content = re.sub(
    r'colSpan=\{attendanceMode === \'multi\' \? 7 : 6\}',
    'colSpan={attendanceMode === \'multi\' ? 8 : 7}',
    content
)


with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated Attendance.tsx")
