import re

with open('src/pages/Attendance.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_body = """            body: JSON.stringify({
              employee_id: employeeId,
              attendance_id: activeSession?.id || activeSession?.attendance_id,
              latitude: lat,
              longitude: lng,
              accuracy: acc
            })"""

new_body = """            body: JSON.stringify({
              employee_id: employeeId,
              attendance_id: activeSession?.id || activeSession?.attendance_id,
              latitude: lat,
              longitude: lng,
              accuracy: acc,
              distance: dist_meters
            })"""

# We need to compute dist_meters inside handleUpdateLocation
old_handle = """  const handleUpdateLocation = () => {
    if (!navigator.geolocation) return;
    setOutstationLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const acc = position.coords.accuracy;
        const employeeId = user?.user_id || user?.id;"""

new_handle = """  const handleUpdateLocation = () => {
    if (!navigator.geolocation) return;
    setOutstationLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const acc = position.coords.accuracy;
        const employeeId = user?.user_id || user?.id;

        let dist_meters: number | undefined = undefined;
        const branchCode = activeSession?.location || selectedLocation || user?.branch || 'HQ';
        const branchInfo = branches.find((b: any) => b.code === branchCode || b.name === branchCode);
        if (branchInfo && branchInfo.latitude && branchInfo.longitude) {
          dist_meters = Math.round(haversineDistance(lat, lng, parseFloat(branchInfo.latitude), parseFloat(branchInfo.longitude)));
        }"""

content = content.replace(old_handle, new_handle)
content = content.replace(old_body, new_body)

with open('src/pages/Attendance.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
