import re

file_path = "c:\\Users\\HP\\ATTENDANCE_SYSTEM\\src\\pages\\Settings.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# We need to add state for branchAddress
if "const [branchAddress, setBranchAddress] = useState" not in content:
    content = content.replace('const [branchRadius, setBranchRadius] = useState("50");', 'const [branchRadius, setBranchRadius] = useState("50");\n  const [branchAddress, setBranchAddress] = useState("");')

old_picker = """<LocationPicker setLocation={(lat, lng) => {
                            setBranchLat(lat.toString());
                            setBranchLng(lng.toString());
                          }} />"""

new_picker = """<LocationPicker setLocation={(lat, lng) => {
                            setBranchLat(lat.toString());
                            setBranchLng(lng.toString());
                            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
                              .then(res => res.json())
                              .then(data => {
                                if(data && data.display_name) {
                                  setBranchAddress(data.display_name);
                                }
                              }).catch(console.error);
                          }} />"""

content = content.replace(old_picker, new_picker)

old_address_display = """<div className="p-4 bg-white dark:bg-card border rounded-xl shadow-sm text-xs text-muted-foreground leading-relaxed">
                              Select a location on the map
                            </div>"""

new_address_display = """<div className="p-4 bg-white dark:bg-card border rounded-xl shadow-sm text-xs text-muted-foreground leading-relaxed">
                              {branchAddress || "Select a location on the map"}
                            </div>"""

content = content.replace(old_address_display, new_address_display)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated Settings.tsx map reverse geocoding")
