import re

file_path = "c:\\Users\\HP\\ATTENDANCE_SYSTEM\\src\\pages\\Attendance.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add state
content = content.replace("const [outstationPromptOpen, setOutstationPromptOpen] = useState(false);", "const [outstationPromptOpen, setOutstationPromptOpen] = useState(false);\n  const [isOutstationAssigned, setIsOutstationAssigned] = useState(false);")

# 2. Update fetchStatus
old_fetch = """      try {
        const response = await fetch(
          `${API_BASE_URL}/api/attendance-status?empId=${id}`
        );
        const data = await response.json();

        if (data.isOnLeave) {
          setIsOnLeave(true);
        }"""

new_fetch = """      try {
        const response = await fetch(
          `${API_BASE_URL}/api/attendance-status?empId=${id}`
        );
        const data = await response.json();

        if (data.isOnLeave) {
          setIsOnLeave(true);
        }
        if (data.isOutstation) {
          setIsOutstationAssigned(true);
        } else {
          setIsOutstationAssigned(false);
        }"""
content = content.replace(old_fetch, new_fetch)

# 3. Update handleAttendanceAction
old_action = """            if (dist > radius) {
               setPendingLocation({lat, lng, acc});
               setOutstationPromptOpen(true);
               setLoading(false);
               return;
            }"""

new_action = """            if (dist > radius) {
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
            }"""
content = content.replace(old_action, new_action)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated Attendance.tsx")
