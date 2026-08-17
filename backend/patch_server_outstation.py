import re

file_path = "c:\\Users\\HP\\ATTENDANCE_SYSTEM\\backend\\server.js"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

attendance_old = """app.post("/api/attendance", async (req, res) => {
  const { user_id, location, attendance_type } = req.body;"""

attendance_new = """app.post("/api/attendance", async (req, res) => {
  const { user_id, location, attendance_type, latitude, longitude, accuracy } = req.body;"""

content = content.replace(attendance_old, attendance_new)

insert_old = """      const [result] = await pool.query(
        `INSERT INTO attendances (user_id, clock_in, location, attendance_type) VALUES (?, NOW(), ?, ?)`,
        [user_id, finalLocation, finalType]
      );"""

insert_new = """      const [result] = await pool.query(
        `INSERT INTO attendances (user_id, clock_in, location, attendance_type, clock_in_latitude, clock_in_longitude, clock_in_accuracy) VALUES (?, NOW(), ?, ?, ?, ?, ?) RETURNING attendance_id`,
        [user_id, finalLocation, finalType, latitude || null, longitude || null, accuracy || null]
      );
      const insertedId = result[0]?.attendance_id || result.insertId;
      if (finalType === 'OUTSTATION' || finalType === 'BRANCH') {
          await pool.query(
              `INSERT INTO employee_location_logs (employee_id, attendance_id, latitude, longitude, accuracy, location_type, ip_address) VALUES (?, ?, ?, ?, ?, 'CLOCK_IN', ?)`,
              [user_id, insertedId, latitude || null, longitude || null, accuracy || null, req.ip || req.connection.remoteAddress]
          );
      }"""

content = content.replace(insert_old, insert_new)

clockout_old = """app.post("/api/clock-out", async (req, res) => {
  const { attendance_id } = req.body;"""

clockout_new = """app.post("/api/clock-out", async (req, res) => {
  const { attendance_id, latitude, longitude, accuracy } = req.body;"""
content = content.replace(clockout_old, clockout_new)

update_old = """      const [result] = await pool.query(
        `UPDATE attendances
         SET clock_out = NOW(), working_hours = ?
         WHERE attendance_id = ?`,
        [workingHoursStr, attendance_id]
      );"""

update_new = """      const [result] = await pool.query(
        `UPDATE attendances
         SET clock_out = NOW(), working_hours = ?, clock_out_latitude = ?, clock_out_longitude = ?, clock_out_accuracy = ?
         WHERE attendance_id = ?`,
        [workingHoursStr, latitude || null, longitude || null, accuracy || null, attendance_id]
      );
      const [att] = await pool.query(`SELECT user_id, attendance_type FROM attendances WHERE attendance_id = ?`, [attendance_id]);
      if (att.length > 0 && (att[0].attendance_type === 'OUTSTATION' || att[0].attendance_type === 'BRANCH')) {
          await pool.query(
              `INSERT INTO employee_location_logs (employee_id, attendance_id, latitude, longitude, accuracy, location_type, ip_address) VALUES (?, ?, ?, ?, ?, 'CLOCK_OUT', ?)`,
              [att[0].user_id, attendance_id, latitude || null, longitude || null, accuracy || null, req.ip || req.connection.remoteAddress]
          );
      }"""
content = content.replace(update_old, update_new)

endpoints_add = """
app.post("/api/outstation/log-location", async (req, res) => {
  try {
    const { employee_id, attendance_id, latitude, longitude, accuracy } = req.body;
    await pool.query(
        `INSERT INTO employee_location_logs (employee_id, attendance_id, latitude, longitude, accuracy, location_type, ip_address) VALUES (?, ?, ?, ?, ?, 'UPDATE', ?)`,
        [employee_id, attendance_id || null, latitude, longitude, accuracy, req.ip || req.connection.remoteAddress]
    );
    res.json({ success: true });
  } catch(e) {
    console.error(e);
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get("/api/outstation/today", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT a.attendance_id, a.user_id, p.full_name, p.department, a.clock_in, a.clock_out, a.attendance_type
      FROM attendances a
      JOIN profiles p ON p.user_id = a.user_id
      WHERE DATE(a.clock_in) = CURRENT_DATE AND a.attendance_type = 'OUTSTATION'
    `);
    
    // Postgres specific: getting latest row per employee_id
    const [logs] = await pool.query(`
      SELECT DISTINCT ON (employee_id) employee_id, latitude, longitude, accuracy, recorded_at, location_type
      FROM employee_location_logs
      WHERE DATE(recorded_at) = CURRENT_DATE
      ORDER BY employee_id, recorded_at DESC
    `);
    
    res.json({ success: true, attendances: rows, latest_locations: logs });
  } catch(e) {
    console.error(e);
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get("/api/outstation/history/:user_id", async (req, res) => {
  try {
    const [logs] = await pool.query(`
      SELECT * FROM employee_location_logs
      WHERE employee_id = ? AND DATE(recorded_at) = CURRENT_DATE
      ORDER BY recorded_at ASC
    `, [req.params.user_id]);
    res.json({ success: true, history: logs });
  } catch(e) {
    console.error(e);
    res.status(500).json({ success: false, error: e.message });
  }
});

app.put("/api/branches/:code", async (req, res) => {
  try {
    const { name, location, latitude, longitude, radius, zone } = req.body;
    await pool.query(
      `UPDATE branches SET name = ?, location = ?, latitude = ?, longitude = ?, radius = ?, operating_zone = ? WHERE code = ?`,
      [name, location, latitude || null, longitude || null, radius || 50, zone || 'ZONE_B', req.params.code]
    );
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get("/api/branches", async (req, res) => {"""

content = content.replace('app.get("/api/branches", async (req, res) => {', endpoints_add)

branch_post_old = """app.post("/api/branches", async (req, res) => {
  try {
    const { code, name, location, zone } = req.body;"""

branch_post_new = """app.post("/api/branches", async (req, res) => {
  try {
    const { code, name, location, zone, latitude, longitude, radius } = req.body;"""
content = content.replace(branch_post_old, branch_post_new)

branch_post_insert_old = """    const [result] = await pool.query(
      `INSERT INTO branches (code, name, location, operating_zone) VALUES (?, ?, ?, ?) RETURNING *`,
      [code, name, location, zone || 'ZONE_B']
    );"""
branch_post_insert_new = """    const [result] = await pool.query(
      `INSERT INTO branches (code, name, location, operating_zone, latitude, longitude, radius) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      [code, name, location, zone || 'ZONE_B', latitude || null, longitude || null, radius || 50]
    );"""
content = content.replace(branch_post_insert_old, branch_post_insert_new)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Patch applied")
