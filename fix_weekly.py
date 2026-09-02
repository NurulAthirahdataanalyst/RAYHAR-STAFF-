with open('backend/server.js', 'r', encoding='utf-8') as f:
    content = f.read()

replacement = """
    // We need to fetch attendances specifically for the requested week because attRows might only contain data for the requested month.
    const [weekAttRows] = await pool.query(
      SELECT a.*, p.name, p.department, p.branch,
        CASE WHEN (a.clock_in AT TIME ZONE 'Asia/Kuala_Lumpur')::time > ?::time THEN 1 ELSE 0 END as is_late
       FROM attendances a
       JOIN profiles p ON p.user_id = a.user_id
       WHERE a.clock_in >= ? AND a.clock_in <= ? AND p.status = 'Active' ,
      [lateTimeStr, weekStartD.toISOString(), weekEndD.toISOString(), ...pFilterParams]
    );

    // Add Present and Late from weekAttRows (ONLY for current week)
    weekAttRows.forEach(att => {
"""

content = content.replace(
    "    // Add Present and Late from attRows (ONLY for current week)\n    attRows.forEach(att => {",
    replacement
)

with open('backend/server.js', 'w', encoding='utf-8') as f:
    f.write(content)