import os

filepath = r"c:\Users\HP\ATTENDANCE_SYSTEM\backend\server.js"
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add the endpoint if it doesn't exist
if "/api/leave-balance/:userId" not in content:
    endpoint_code = """
app.get("/api/leave-balance/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    // 1. Get Base Entitlements
    const [profile] = await pool.query(`SELECT annual_leave_entitlement, medical_leave_entitlement FROM profiles WHERE user_id = ?`, [userId]);
    if (!profile.length) return res.status(404).json({ error: "Profile not found" });
    
    const baseAnnual = parseFloat(profile[0].annual_leave_entitlement || 14);
    const baseMedical = parseFloat(profile[0].medical_leave_entitlement || 14);

    // 2. Get Manual Adjustments
    const [adjustments] = await pool.query(`
      SELECT leave_type, SUM(adjustment_days) as total_adj
      FROM leave_balance_adjustments
      WHERE employee_id = ?
      GROUP BY leave_type
    `, [userId]);

    let annualAdj = 0;
    let medicalAdj = 0;
    let replacementAdj = 0;

    for (const row of adjustments) {
      const typeUpper = (row.leave_type || '').toUpperCase();
      if (['ANNUAL LEAVE', 'ANNUAL & EMERGENCY LEAVE', 'ANNUAL/EMERGENCY LEAVE', 'CUTI TAHUNAN'].includes(typeUpper)) {
        annualAdj += parseFloat(row.total_adj);
      } else if (['SICK LEAVE', 'MEDICAL LEAVE', 'CUTI SAKIT'].includes(typeUpper)) {
        medicalAdj += parseFloat(row.total_adj);
      } else if (['REPLACEMENT LEAVE', 'CUTI GANTI'].includes(typeUpper)) {
        replacementAdj += parseFloat(row.total_adj);
      }
    }

    // 3. Get Used Leaves (Approved)
    const [usedLeaves] = await pool.query(`
      SELECT leave_type, SUM(days) as total_used
      FROM leave_requests
      WHERE user_id = ? AND status = 'Approved'
      GROUP BY leave_type
    `, [userId]);

    let annualUsed = 0;
    let medicalUsed = 0;
    let replacementUsed = 0;

    for (const row of usedLeaves) {
      const typeUpper = (row.leave_type || '').toUpperCase();
      if (['ANNUAL LEAVE', 'ANNUAL & EMERGENCY LEAVE', 'ANNUAL/EMERGENCY LEAVE', 'CUTI TAHUNAN'].includes(typeUpper)) {
        annualUsed += parseFloat(row.total_used);
      } else if (['SICK LEAVE', 'MEDICAL LEAVE', 'CUTI SAKIT'].includes(typeUpper)) {
        medicalUsed += parseFloat(row.total_used);
      } else if (['REPLACEMENT LEAVE', 'CUTI GANTI'].includes(typeUpper)) {
        replacementUsed += parseFloat(row.total_used);
      }
    }

    const annualBalance = Math.max(0, (baseAnnual + annualAdj) - annualUsed);
    const medicalBalance = Math.max(0, (baseMedical + medicalAdj) - medicalUsed);
    const replacementBalance = Math.max(0, replacementAdj - replacementUsed);

    res.json({
      success: true,
      balances: {
        annual: annualBalance,
        medical: medicalBalance,
        replacement: replacementBalance,
        annualEntitlement: baseAnnual,
        medicalEntitlement: baseMedical
      }
    });
  } catch (err) {
    console.error("Error fetching leave balance:", err);
    res.status(500).json({ success: false, error: "Database error" });
  }
});
"""
    # Insert it right before module.exports or somewhere at the end
    content = content.replace("app.listen(port,", endpoint_code + "\napp.listen(port,")
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Endpoint added")
else:
    print("Endpoint already exists")
