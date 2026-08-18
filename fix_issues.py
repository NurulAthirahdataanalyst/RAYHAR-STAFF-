import re

file_path = "c:\\Users\\HP\\ATTENDANCE_SYSTEM\\src\\pages\\Branches.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

old_picker = """<LocationPicker setLocation={(lat, lng) => {
                  setEditBranchData({...editBranchData, latitude: lat.toString(), longitude: lng.toString()});
                }} />"""

new_picker = """<LocationPicker setLocation={(lat, lng) => {
                  setEditBranchData({...editBranchData, latitude: lat.toString(), longitude: lng.toString()});
                  fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
                    .then(res => res.json())
                    .then(data => {
                      if(data && data.display_name) {
                        setEditBranchData(prev => ({...prev, location: data.display_name}));
                      }
                    }).catch(console.error);
                }} />"""

content = content.replace(old_picker, new_picker)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated Branches.tsx map reverse geocoding")

file_path = "c:\\Users\\HP\\ATTENDANCE_SYSTEM\\src\\pages\\Attendance.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()
    
content = content.replace("<DTitle>", "<DialogTitle>").replace("</DTitle>", "</DialogTitle>")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated Attendance.tsx DialogTitle typo")

