import re

with open('src/pages/Attendance.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update fetchStatus
old_fetchStatus = """      if (data.isOnLeave) {
        setIsOnLeave(true);
      }
        if (data.isOutstation) {
          setIsOutstationAssigned(true);
        } else {
          setIsOutstationAssigned(false);
        }

      if (data.attendanceStatus) {"""

new_fetchStatus = """      if (data.isOnLeave) {
        setIsOnLeave(true);
      }
      
      try {
        const outstationRes = await fetch(`${API_BASE_URL}/api/outstation?userId=${id}`);
        if (outstationRes.ok) {
            const outstations = await outstationRes.json();
            const todayStr = new Date().toISOString().split('T')[0];
            const isReallyActive = Array.isArray(outstations) && outstations.some((o: any) => 
                o.start_date <= todayStr && o.end_date >= todayStr && o.status !== "Cancelled"
            );
            setIsOutstationAssigned(isReallyActive);
        } else {
            setIsOutstationAssigned(!!data.isOutstation);
        }
      } catch (e) {
        setIsOutstationAssigned(!!data.isOutstation);
      }

      if (data.attendanceStatus) {"""

if 'const outstationRes = await fetch' not in content:
    content = content.replace(old_fetchStatus, new_fetchStatus)

# 2. Update handleAttendanceAction to skip prompt
old_clockin_start = """        // It is Clock In
        let attendance_type = "BRANCH";
        if (attendanceMode === 'temporary') attendance_type = "Temporary Assignment";
        else if (attendanceMode === 'multi') attendance_type = "Multi-Location";"""

new_clockin_start = """        if (isOutstationAssigned) {
          performClockInOrOut(employeeId, "OUTSTATION", lat, lng, acc, undefined);
          return;
        }

        // It is Clock In
        let attendance_type = "BRANCH";
        if (attendanceMode === 'temporary') attendance_type = "Temporary Assignment";
        else if (attendanceMode === 'multi') attendance_type = "Multi-Location";"""

if 'if (isOutstationAssigned) {' not in content.split('// It is Clock In')[0][-100:]:
    content = content.replace(old_clockin_start, new_clockin_start)

# 3. Clean up the prompts to just be rejections (we don't need outstation prompt anymore since we bypass if true)
old_prompt1 = """          if (!withinAnyBranch) {
            if (isOutstationAssigned) {
              setPendingLocation({lat, lng, acc});
              setOutstationPromptOpen(true);
              setLoading(false);
              return;
            } else {
              toast({ title: "Clock In Failed", description: `You are outside all your assigned branch locations. Closest distance: ${dist_meters}m`, variant: "destructive" });
              setLoading(false);
              return;
            }
          }"""

new_prompt1 = """          if (!withinAnyBranch) {
            toast({ title: "Clock In Failed", description: `You are outside all your assigned branch locations. Closest distance: ${dist_meters}m`, variant: "destructive" });
            setLoading(false);
            return;
          }"""

content = content.replace(old_prompt1, new_prompt1)

old_prompt2 = """            if (dist_meters > radius) {
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
            }"""

new_prompt2 = """            if (dist_meters > radius) {
              toast({ title: "Clock In Failed", description: `You are outside the branch radius (${radius}m). Distance: ${dist_meters}m`, variant: "destructive" });
              setLoading(false);
              return;
            }"""

content = content.replace(old_prompt2, new_prompt2)


with open('src/pages/Attendance.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
