import re

file_path = "c:\\Users\\HP\\ATTENDANCE_SYSTEM\\src\\pages\\Attendance.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

pattern1 = re.compile(r'(if\s*\(data\.isOnLeave\)\s*\{\s*setIsOnLeave\(true\);\s*\})', re.DOTALL)
content = pattern1.sub(r'\1\n        if (data.isOutstation) {\n          setIsOutstationAssigned(true);\n        } else {\n          setIsOutstationAssigned(false);\n        }', content)

pattern2 = re.compile(r'if\s*\(dist\s*>\s*radius\)\s*\{\s*setPendingLocation\(\{lat,\s*lng,\s*acc\}\);\s*setOutstationPromptOpen\(true\);\s*setLoading\(false\);\s*return;\s*\}', re.DOTALL)
new_action = """if (dist > radius) {
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
content = pattern2.sub(new_action, content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated Attendance.tsx again")
