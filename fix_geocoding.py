import re

SMART_GEOCODE_FN = """
// Smart geocoding: tries multiple strategies for Malaysian addresses
async function smartGeocode(address: string): Promise<{lat: string, lon: string} | null> {
  const trySearch = async (q: string) => {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=my&limit=1&accept-language=en`);
    const data = await r.json();
    return data && data.length > 0 ? data[0] : null;
  };

  // Strategy 1: Full address + Malaysia
  let result = await trySearch(address + ", Malaysia");
  if (result) return result;

  // Strategy 2: Strip lot/unit numbers (common in Malaysian addresses)
  // Remove LOT XXXX, NO. X, PT XXX patterns
  const stripped = address
    .replace(/\\b(LOT|PT|NO\\.?|UNIT|BLOK|BLK|KM|KILOMETER)\\s*[\\d\\w-]+[,\\s]*/gi, '')
    .replace(/^[,\\s]+/, '').trim();
  if (stripped && stripped !== address) {
    result = await trySearch(stripped + ", Malaysia");
    if (result) return result;
  }

  // Strategy 3: Extract words that look like town/city (skip lot numbers, ignore short tokens)
  // Split by commas and try from right to left (city/state usually at end)
  const parts = address.split(',').map(s => s.trim()).filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i--) {
    const partial = parts.slice(i).join(', ');
    if (partial.length > 3) {
      result = await trySearch(partial + ", Malaysia");
      if (result) return result;
    }
  }

  // Strategy 4: Try just last 2 parts (town, state)
  if (parts.length >= 2) {
    result = await trySearch(parts.slice(-2).join(', ') + ", Malaysia");
    if (result) return result;
  }

  return null;
}
"""

# ============================================================
# BRANCHES.TSX
# ============================================================
path = "c:\\Users\\HP\\ATTENDANCE_SYSTEM\\src\\pages\\Branches.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Insert the helper function before the component
if "smartGeocode" not in content:
    content = content.replace(
        "function MapController",
        SMART_GEOCODE_FN + "\nfunction MapController"
    )

# Replace the search logic in onClick button for Branches.tsx
OLD_ONCLICK_BRANCHES = """                  onClick={() => {
                    const addr = editBranchData.location;
                    if (!addr) { toast.error("Please enter an address first"); return; }
                    toast.loading("Searching coordinates...");
                    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr)}&limit=1`)
                      .then(r => r.json())
                      .then(data => {
                        toast.dismiss();
                        if (data && data.length > 0) {
                          setEditBranchData(prev => ({...prev, latitude: data[0].lat, longitude: data[0].lon}));
                          toast.success("Coordinates found! Click 'Update Location' to view on map.");
                        } else {
                          toast.error("Address not found. Try a more specific address.");
                        }
                      })
                      .catch(() => { toast.dismiss(); toast.error("Search failed"); });
                  }}"""

NEW_ONCLICK_BRANCHES = """                  onClick={async () => {
                    const addr = editBranchData.location;
                    if (!addr) { toast.error("Please enter an address first"); return; }
                    toast.loading("Searching coordinates...");
                    try {
                      const result = await smartGeocode(addr);
                      toast.dismiss();
                      if (result) {
                        setEditBranchData(prev => ({...prev, latitude: result.lat, longitude: result.lon}));
                        toast.success("Coordinates found! Click 'Update Location' to view on map.");
                      } else {
                        toast.error("Could not find coordinates. Try entering just the town/city name.");
                      }
                    } catch { toast.dismiss(); toast.error("Search failed"); }
                  }}"""

OLD_ONKEYDOWN_BRANCHES = """                      if (!addr) return;
                      toast.loading("Searching coordinates...");
                      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr)}&limit=1`)
                        .then(r => r.json())
                        .then(data => {
                          toast.dismiss();
                          if (data && data.length > 0) {
                            setEditBranchData(prev => ({...prev, latitude: data[0].lat, longitude: data[0].lon}));
                            toast.success("Coordinates found!");
                          } else {
                            toast.error("Address not found. Try a more specific address.");
                          }
                        })
                        .catch(() => { toast.dismiss(); toast.error("Search failed"); });"""

NEW_ONKEYDOWN_BRANCHES = """                      if (!addr) return;
                      toast.loading("Searching coordinates...");
                      smartGeocode(addr).then(result => {
                        toast.dismiss();
                        if (result) {
                          setEditBranchData(prev => ({...prev, latitude: result.lat, longitude: result.lon}));
                          toast.success("Coordinates found!");
                        } else {
                          toast.error("Could not find coordinates. Try entering just the town/city name.");
                        }
                      }).catch(() => { toast.dismiss(); toast.error("Search failed"); });"""

content = content.replace(OLD_ONCLICK_BRANCHES, NEW_ONCLICK_BRANCHES)
content = content.replace(OLD_ONKEYDOWN_BRANCHES, NEW_ONKEYDOWN_BRANCHES)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated Branches.tsx")

# ============================================================
# SETTINGS.TSX
# ============================================================
path2 = "c:\\Users\\HP\\ATTENDANCE_SYSTEM\\src\\pages\\Settings.tsx"
with open(path2, "r", encoding="utf-8") as f:
    content2 = f.read()

if "smartGeocode" not in content2:
    content2 = content2.replace(
        "function MapController",
        SMART_GEOCODE_FN + "\nfunction MapController"
    )

OLD_ONCLICK_SETTINGS = """                      onClick={() => {
                        if (!branchLocationInput) { toast.error("Please enter an address first"); return; }
                        toast.loading("Searching coordinates...");
                        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(branchLocationInput)}&limit=1`)
                          .then(r => r.json())
                          .then(data => {
                            toast.dismiss();
                            if (data && data.length > 0) {
                              setNewBranchData(prev => ({...prev, latitude: data[0].lat, longitude: data[0].lon}));
                              toast.success("Coordinates found!");
                            } else {
                              toast.error("Address not found. Try a more specific address.");
                            }
                          })
                          .catch(() => { toast.dismiss(); toast.error("Search failed"); });
                      }}"""

NEW_ONCLICK_SETTINGS = """                      onClick={async () => {
                        if (!branchLocationInput) { toast.error("Please enter an address first"); return; }
                        toast.loading("Searching coordinates...");
                        try {
                          const result = await smartGeocode(branchLocationInput);
                          toast.dismiss();
                          if (result) {
                            setNewBranchData(prev => ({...prev, latitude: result.lat, longitude: result.lon}));
                            toast.success("Coordinates found!");
                          } else {
                            toast.error("Could not find coordinates. Try entering just the town/city name.");
                          }
                        } catch { toast.dismiss(); toast.error("Search failed"); }
                      }}"""

OLD_ONKEYDOWN_SETTINGS = """                          if (!branchLocationInput) return;
                          toast.loading("Searching coordinates...");
                          fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(branchLocationInput)}&limit=1`)
                            .then(r => r.json())
                            .then(data => {
                              toast.dismiss();
                              if (data && data.length > 0) {
                                setNewBranchData(prev => ({...prev, latitude: data[0].lat, longitude: data[0].lon}));
                                toast.success("Coordinates found!");
                              } else {
                                toast.error("Address not found. Try a more specific address.");
                              }
                            })
                            .catch(() => { toast.dismiss(); toast.error("Search failed"); });"""

NEW_ONKEYDOWN_SETTINGS = """                          if (!branchLocationInput) return;
                          toast.loading("Searching coordinates...");
                          smartGeocode(branchLocationInput).then(result => {
                            toast.dismiss();
                            if (result) {
                              setNewBranchData(prev => ({...prev, latitude: result.lat, longitude: result.lon}));
                              toast.success("Coordinates found!");
                            } else {
                              toast.error("Could not find coordinates. Try entering just the town/city name.");
                            }
                          }).catch(() => { toast.dismiss(); toast.error("Search failed"); });"""

content2 = content2.replace(OLD_ONCLICK_SETTINGS, NEW_ONCLICK_SETTINGS)
content2 = content2.replace(OLD_ONKEYDOWN_SETTINGS, NEW_ONKEYDOWN_SETTINGS)

with open(path2, "w", encoding="utf-8") as f:
    f.write(content2)
print("Updated Settings.tsx")
