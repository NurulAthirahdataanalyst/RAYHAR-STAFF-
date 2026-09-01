with open('src/pages/TeamAttendance.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

old_render = """                          const emp = employees.find(e => e.user_id === historyFor);
                          const branchName = emp?.branch || "HQ";
                          
                          let distance: number | null = null;
                          // We don't have apiBranches in TeamAttendance, so distance might be N/A
                          
                          const isNoGPS = Number(h.lat) === 0 && Number(h.lng) === 0;"""

new_render = """                          const emp = employees.find(e => e.user_id === historyFor);
                          const branchName = emp?.branch || "HQ";
                          
                          let distance: number | null = null;
                          const branchData = apiBranches.find(b => b.branch_code === branchName);
                          if (branchData && branchData.latitude && branchData.longitude && h.lat && h.lng) {
                            distance = calculateDistance(Number(h.lat), Number(h.lng), Number(branchData.latitude), Number(branchData.longitude));
                          }
                          
                          const isNoGPS = Number(h.lat) === 0 && Number(h.lng) === 0;"""

if old_render in text:
    text = text.replace(old_render, new_render)
    with open('src/pages/TeamAttendance.tsx', 'w', encoding='utf-8') as f:
        f.write(text)
    print("Updated distance!")
else:
    print("Not found render")
