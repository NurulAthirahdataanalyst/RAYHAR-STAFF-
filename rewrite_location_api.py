import re

with open('backend/server.js', 'r', encoding='utf-8') as f:
    text = f.read()

# Find the exact location history endpoint body and replace it
old_start = "app.get('/api/employee-location-history', async (req, res) => {"
old_end = "// Outstation arrival/area check endpoint"

start_idx = text.find(old_start)
end_idx = text.find(old_end)

if start_idx == -1 or end_idx == -1:
    print("Could not find markers!")
    exit(1)

old_block = text[start_idx:end_idx]

new_block = """app.get('/api/employee-location-history', async (req, res) => {
try {
  const userId = req.query.userId || req.query.user_id;
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit || '50', 10)));
  const offset = (page - 1) * limit;

  if (!userId) return res.status(400).json({ success: false, error: 'Missing userId' });

  // 1. Employee profile & branch
  const [profRows] = await pool.query(`SELECT branch FROM profiles WHERE user_id = ?`, [String(userId)]);
  const permBranch = profRows[0]?.branch || 'HQ';

  // 2. Temporary work assignments
  const [tempAssignments] = await pool.query(`
    SELECT location, start_date, COALESCE(end_date, '2099-12-31') as end_date
    FROM employee_work_assignment
    WHERE user_id = ?
  `, [String(userId)]);

  // 3. Branches table for coordinates
  const [branchesRows] = await pool.query(`SELECT code, name, latitude, longitude, radius FROM branches`);
  const branchMap = new Map();
  (branchesRows || []).forEach(b => {
    if (b.code) branchMap.set(b.code, b);
    if (b.name) branchMap.set(b.name, b);
  });

  // 4. Outstation assignments
  const [outstationRows] = await pool.query(`
    SELECT start_date, end_date FROM outstation_assignments
    WHERE user_id = ? AND status IN ('Approved', 'Active')
  `, [String(userId)]);
  const outstationDatesSet = new Set();
  (outstationRows || []).forEach(o => {
    if (!o.start_date) return;
    const s = new Date(o.start_date);
    const e = o.end_date ? new Date(o.end_date) : new Date(o.start_date);
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      outstationDatesSet.add(d.toISOString().split('T')[0]);
    }
  });

  // 5. Leave requests
  const [leaveRows] = await pool.query(`
    SELECT leave_type, start_date, end_date FROM leave_requests
    WHERE user_id = ? AND status = 'Approved'
  `, [String(userId)]);
  const replacementDatesSet = new Set();
  const leaveDatesMap = new Map();
  (leaveRows || []).forEach(l => {
    if (!l.start_date) return;
    const typeUpper = String(l.leave_type || '').toUpperCase();
    const isRepl = typeUpper.includes('REPLACEMENT') || typeUpper.includes('GANTI');
    const s = new Date(l.start_date);
    const e = l.end_date ? new Date(l.end_date) : new Date(l.start_date);
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      const dStr = d.toISOString().split('T')[0];
      if (isRepl) replacementDatesSet.add(dStr);
      else leaveDatesMap.set(dStr, l.leave_type);
    }
  });

  // 6. Replacement leave validations
  const [rlRows] = await pool.query(`
    SELECT replacement_date FROM replacement_leave_requests
    WHERE employee_id = ? AND validation_status = 'Validated'
  `, [String(userId)]);
  (rlRows || []).forEach(r => {
    if (!r.replacement_date) return;
    replacementDatesSet.add(new Date(r.replacement_date).toISOString().split('T')[0]);
  });

  // Helper: Haversine distance
  const calcDistance = (lat1, lon1, lat2, lon2) => {
    if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
    const p1 = Number(lat1), p2 = Number(lon1), p3 = Number(lat2), p4 = Number(lon2);
    if (isNaN(p1) || isNaN(p2) || isNaN(p3) || isNaN(p4)) return null;
    const R = 6371000;
    const dLat = ((p3 - p1) * Math.PI) / 180;
    const dLon = ((p4 - p2) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((p1 * Math.PI) / 180) * Math.cos((p3 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  const resolveLocationDetails = (lat, lng, ts) => {
    const pointDate = new Date(ts);
    let activeBranchCode = permBranch;
    for (const ta of tempAssignments) {
      if (pointDate >= new Date(ta.start_date) && pointDate <= new Date(ta.end_date)) {
        activeBranchCode = ta.location;
        break;
      }
    }
    const bObj = branchMap.get(activeBranchCode);
    const bLat = bObj ? parseFloat(bObj.latitude) : null;
    const bLng = bObj ? parseFloat(bObj.longitude) : null;
    const radius = bObj ? (bObj.radius || 100) : 100;
    const pLat = Number(lat), pLng = Number(lng);
    const isNoGPS = (!pLat && !pLng) || (pLat === 0 && pLng === 0);
    let distance = null;
    if (!isNoGPS && bLat != null && bLng != null) {
      distance = calcDistance(pLat, pLng, bLat, bLng);
    }
    const location_status = isNoGPS ? 'NO GPS' : (distance !== null && distance > radius ? 'OFF-SITE' : 'ON-SITE');
    return { branch: activeBranchCode, distance, location_status };
  };

  const getAttendanceStatus = (ts, isClockIn, isClockOut) => {
    const dateStr = new Date(ts).toISOString().split('T')[0];
    if (isClockOut) return 'Clock Out';
    if (isClockIn) {
      if (replacementDatesSet.has(dateStr)) return 'Replacement Leave';
      if (outstationDatesSet.has(dateStr)) return 'Outstation';
      return 'Clock In';
    }
    if (replacementDatesSet.has(dateStr)) return 'Replacement Leave';
    if (outstationDatesSet.has(dateStr)) return 'Outstation';
    if (leaveDatesMap.has(dateStr)) return leaveDatesMap.get(dateStr) || 'On Leave';
    return null;
  };

  // 7. Count total records for pagination (location logs + clock in + clock out)
  const [[{ total_logs }]] = await pool.query(
    `SELECT COUNT(*) as total_logs FROM employee_location_logs WHERE employee_id = ?`,
    [String(userId)]
  );
  const [[{ total_clock_in }]] = await pool.query(
    `SELECT COUNT(*) as total_clock_in FROM attendances WHERE user_id = ? AND clock_in IS NOT NULL`,
    [String(userId)]
  );
  const [[{ total_clock_out }]] = await pool.query(
    `SELECT COUNT(*) as total_clock_out FROM attendances WHERE user_id = ? AND clock_out IS NOT NULL`,
    [String(userId)]
  );
  
  // We combine all 3 sources. For total, sum them (dedup happens after fetch).
  // Actually we fetch all 3 and merge, so the real total must account for dedup.
  // For simplicity, get total from location_logs only + attendance entries not in logs.
  // The total we show is the count of unique minute-buckets.
  // Easiest: fetch all timestamps (just timestamps), build dedup count, then paginate that.
  
  // Fetch ALL timestamps for counting & deduplication
  const [allLogTs] = await pool.query(
    `SELECT recorded_at as ts, 'log' as source FROM employee_location_logs WHERE employee_id = ? 
     UNION ALL
     SELECT clock_in as ts, 'clock_in' as source FROM attendances WHERE user_id = ? AND clock_in IS NOT NULL
     UNION ALL
     SELECT clock_out as ts, 'clock_out' as source FROM attendances WHERE user_id = ? AND clock_out IS NOT NULL AND clock_out_latitude IS NOT NULL
     ORDER BY ts DESC`,
    [String(userId), String(userId), String(userId)]
  );
  
  // Deduplicate by minute
  const seenMinutes = new Map();
  allLogTs.forEach(row => {
    if (!row.ts) return;
    const minKey = Math.floor(new Date(row.ts).getTime() / 60000);
    if (!seenMinutes.has(minKey)) seenMinutes.set(minKey, { ts: row.ts, source: row.source });
  });
  
  const sortedKeys = [...seenMinutes.entries()].sort((a, b) => b[0] - a[0]);
  const totalCount = sortedKeys.length;
  const pageKeys = sortedKeys.slice(offset, offset + limit);
  
  if (pageKeys.length === 0) {
    return res.json({ success: true, history: [], total: totalCount, page, limit, hasMore: false });
  }
  
  // Get min and max timestamps for this page to fetch actual full records
  const pageTs = pageKeys.map(([k]) => k);
  const minMs = Math.min(...pageTs) * 60000;
  const maxMs = Math.max(...pageTs) * 60000 + 59999;
  const minTs = new Date(minMs).toISOString();
  const maxTs = new Date(maxMs).toISOString();
  
  // Fetch location logs for this time window
  const [logsRows] = await pool.query(
    `SELECT latitude, longitude, accuracy, recorded_at as timestamp, 'update' as event_type 
     FROM employee_location_logs 
     WHERE employee_id = ? AND recorded_at BETWEEN ? AND ?
     ORDER BY recorded_at DESC, id DESC`,
    [String(userId), minTs, maxTs]
  );
  
  // Fetch clock ins for this window
  const [clockInRows] = await pool.query(
    `SELECT clock_in_latitude as latitude, clock_in_longitude as longitude, clock_in_accuracy as accuracy, clock_in as timestamp, 'clock_in' as event_type
     FROM attendances WHERE user_id = ? AND clock_in BETWEEN ? AND ?
     ORDER BY clock_in DESC`,
    [String(userId), minTs, maxTs]
  );
  
  // Fetch clock outs for this window
  const [clockOutRows] = await pool.query(
    `SELECT clock_out_latitude as latitude, clock_out_longitude as longitude, NULL as accuracy, clock_out as timestamp, 'clock_out' as event_type
     FROM attendances WHERE user_id = ? AND clock_out IS NOT NULL AND clock_out BETWEEN ? AND ?
     AND clock_out_latitude IS NOT NULL
     ORDER BY clock_out DESC`,
    [String(userId), minTs, maxTs]
  );
  
  // Map all points
  const allPoints = [
    ...(clockOutRows || []).map(r => ({ ...r, isClockOut: true })),
    ...(clockInRows || []).map(r => ({ ...r, isClockIn: true })),
    ...(logsRows || []).map(r => ({ ...r, is_update: true })),
  ];
  
  // Deduplicate by minute, prefer clock in/out
  const pointByMinute = new Map();
  allPoints.forEach(item => {
    if (!item.timestamp) return;
    const minKey = Math.floor(new Date(item.timestamp).getTime() / 60000);
    const existing = pointByMinute.get(minKey);
    const priority = item.isClockOut ? 3 : item.isClockIn ? 2 : 1;
    const existingPriority = !existing ? 0 : (existing.isClockOut ? 3 : existing.isClockIn ? 2 : 1);
    if (!existing || priority > existingPriority) {
      pointByMinute.set(minKey, item);
    }
  });
  
  // Only return points that are in our page keys
  const pageKeySet = new Set(pageKeys.map(([k]) => k));
  const result = [];
  pageKeys.forEach(([minKey]) => {
    const item = pointByMinute.get(minKey);
    if (!item) return;
    const locDetails = resolveLocationDetails(item.latitude, item.longitude, item.timestamp);
    result.push({
      lat: item.latitude,
      lng: item.longitude,
      accuracy: item.accuracy,
      timestamp: item.timestamp,
      ...locDetails,
      attendance_status: getAttendanceStatus(item.timestamp, !!item.isClockIn, !!item.isClockOut),
      is_update: !!item.is_update,
    });
  });
  
  result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  return res.json({
    success: true,
    history: result,
    total: totalCount,
    page,
    limit,
    hasMore: offset + limit < totalCount,
  });
} catch (e) {
  console.error('/api/employee-location-history error', e.message || e);
  res.status(500).json({ success: false, error: e.message || String(e) });
}
});

"""

new_text = text[:start_idx] + new_block + text[end_idx:]
with open('backend/server.js', 'w', encoding='utf-8') as f:
    f.write(new_text)
print("Backend location history API rewritten!")
