import re

# Fix 1: Replace setView with flyTo in MapController (in both files)
# Fix 2: Add onClick to the Apply Location button inside the map modal

for fpath in [
    "c:\\Users\\HP\\ATTENDANCE_SYSTEM\\src\\pages\\Branches.tsx",
    "c:\\Users\\HP\\ATTENDANCE_SYSTEM\\src\\pages\\Settings.tsx",
]:
    with open(fpath, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Fix MapController: setView -> flyTo for smooth animation
    content = content.replace(
        "map.setView(center, map.getZoom());",
        "map.flyTo(center, map.getZoom(), { animate: true, duration: 1 });"
    )

    with open(fpath, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Fixed MapController flyTo in {fpath.split(chr(92))[-1]}")

# Fix 3: Add onClick to Apply Location button inside map modal in Branches.tsx
path = "c:\\Users\\HP\\ATTENDANCE_SYSTEM\\src\\pages\\Branches.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

OLD_APPLY_BTN = '''                  <Button type="button" variant="outline" className="w-full h-10 rounded-xl text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border-purple-200">
                    Apply Location
                  </Button>'''

NEW_APPLY_BTN = '''                  <Button type="button" variant="outline" className="w-full h-10 rounded-xl text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border-purple-200" onClick={() => {
                    const lat = parseFloat(String(editBranchData.latitude));
                    const lng = parseFloat(String(editBranchData.longitude));
                    if (!isNaN(lat) && !isNaN(lng)) {
                      // Force re-render to trigger MapController flyTo
                      setEditBranchData(prev => ({...prev, latitude: String(lat), longitude: String(lng)}));
                      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
                        .then(r => r.json())
                        .then(data => {
                          if (data && data.display_name) {
                            setEditBranchData(prev => ({...prev, location: data.display_name}));
                          }
                        }).catch(console.error);
                    }
                  }}>
                    Apply Location
                  </Button>'''

if OLD_APPLY_BTN in content:
    content = content.replace(OLD_APPLY_BTN, NEW_APPLY_BTN)
    print("Applied Apply Location onClick fix in Branches.tsx")
else:
    print("WARNING: Could not find Apply Location button to patch - checking...")
    # Find the approximate location
    idx = content.find("Apply Location")
    print(f"Found 'Apply Location' at character index {idx}")
    print(repr(content[max(0, idx-200):idx+100]))

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
