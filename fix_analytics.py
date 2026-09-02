import re

with open('backend/server.js', 'r', encoding='utf-8') as f:
    content = f.read()

replacement = """      const [rlRows] = await pool.query(\
        SELECT SUM(CASE WHEN validation_status = 'Validated' THEN 1 ELSE 0 END) as earned 
        FROM replacement_leave_requests 
        WHERE employee_id = ?
      \, [String(userId)]);
      const replacementEarned = parseInt(rlRows[0]?.earned) || 0;
      
      const totalAdjustment = parseFloat(adjMap['ANNUAL LEAVE'] || adjMap['CUTI TAHUNAN'] || 0);
      const medicalAdj = parseFloat(adjMap['MEDICAL LEAVE'] || adjMap['SICK LEAVE'] || adjMap['CUTI SAKIT'] || 0);
      const replacementAdj = parseFloat(adjMap['REPLACEMENT LEAVE'] || adjMap['CUTI GANTI'] || 0) + replacementEarned;"""

content = re.sub(r'      const totalAdjustment = parseFloat\(adjMap\[\'ANNUAL LEAVE\'\] \|\| adjMap\[\'CUTI TAHUNAN\'\] \|\| 0\);\s*const medicalAdj = parseFloat\(adjMap\[\'MEDICAL LEAVE\'\] \|\| adjMap\[\'SICK LEAVE\'\] \|\| adjMap\[\'CUTI SAKIT\'\] \|\| 0\);\s*const replacementAdj = parseFloat\(adjMap\[\'REPLACEMENT LEAVE\'\] \|\| adjMap\[\'CUTI GANTI\'\] \|\| 0\);', replacement, content)

with open('backend/server.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Done")
