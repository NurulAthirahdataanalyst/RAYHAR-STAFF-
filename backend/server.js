const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { sendNotificationEmail } = require("./mailer");
const { calculateExpectedWorkingDays } = require("./workingDaysHelper");
const { startOfMonth, endOfMonth, startOfYear, endOfYear, format, isBefore } = require("date-fns");

const jwtSecret = process.env.JWT_SECRET;
console.log('ðŸ” JWT_SECRET loaded?', !!jwtSecret);
if (!jwtSecret) {
  console.warn("WARNING: JWT_SECRET is not defined. Set JWT_SECRET in your backend environment variables.");
}

const app = express();

const malaysiaHolidays = [
  // 2024
  { date: "2024-01-01", name: "New Year's Day" },
  { date: "2024-02-10", name: "Chinese New Year" },
  { date: "2024-02-11", name: "Chinese New Year" },
  { date: "2024-03-28", name: "Nuzul Al-Quran" },
  { date: "2024-04-10", name: "Hari Raya Aidilfitri" },
  { date: "2024-04-11", name: "Hari Raya Aidilfitri" },
  { date: "2024-05-01", name: "Labour Day" },
  { date: "2024-05-22", name: "Wesak Day" },
  { date: "2024-06-03", name: "Agong's Birthday" },
  { date: "2024-06-17", name: "Hari Raya Haji" },
  { date: "2024-07-07", name: "Awal Muharram" },
  { date: "2024-08-31", name: "Merdeka Day" },
  { date: "2024-09-16", name: "Malaysia Day" },
  { date: "2024-10-31", name: "Deepavali" },
  { date: "2024-12-25", name: "Christmas Day" },
  
  // 2025
  { date: "2025-01-01", name: "New Year's Day" },
  { date: "2025-01-29", name: "Chinese New Year" },
  { date: "2025-01-30", name: "Chinese New Year" },
  { date: "2025-03-17", name: "Nuzul Al-Quran" },
  { date: "2025-03-31", name: "Hari Raya Aidilfitri" },
  { date: "2025-04-01", name: "Hari Raya Aidilfitri" },
  { date: "2025-05-01", name: "Labour Day" },
  { date: "2025-05-12", name: "Wesak Day" },
  { date: "2025-06-02", name: "Agong's Birthday" },
  { date: "2025-06-06", name: "Hari Raya Haji" },
  { date: "2025-06-27", name: "Awal Muharram" },
  { date: "2025-08-31", name: "Merdeka Day" },
  { date: "2025-09-16", name: "Malaysia Day" },
  { date: "2025-10-20", name: "Deepavali" },
  { date: "2025-12-25", name: "Christmas Day" },
  
  // 2026
  { date: "2026-01-01", name: "New Year's Day" },
  { date: "2026-02-17", name: "Chinese New Year" },
  { date: "2026-02-18", name: "Chinese New Year" },
  { date: "2026-03-06", name: "Nuzul Al-Quran" },
  { date: "2026-03-20", name: "Hari Raya Aidilfitri" },
  { date: "2026-03-21", name: "Hari Raya Aidilfitri" },
  { date: "2026-05-01", name: "Labour Day" },
  { date: "2026-05-24", name: "Wesak Day" },
  { date: "2026-05-27", name: "Hari Raya Haji" },
  { date: "2026-06-01", name: "Agong's Birthday" },
  { date: "2026-06-16", name: "Awal Muharram" },
  { date: "2026-08-31", name: "Merdeka Day" },
  { date: "2026-09-16", name: "Malaysia Day" },
  { date: "2026-11-08", name: "Deepavali" },
  { date: "2026-12-25", name: "Christmas Day" }
];

// Global Settings Memory
let settingsCache = {
  lateThreshold: "09:00 AM",
  leaveRequests: "Pending",
  overtime: "Disabled",
  companyCode: "RAYHAR2024"
};

const settingsFile = path.join(__dirname, 'settings.json');

// Load settings on startup
try {
  if (fs.existsSync(settingsFile)) {
    const data = fs.readFileSync(settingsFile, 'utf8');
    settingsCache = { ...settingsCache, ...JSON.parse(data) };
  }
} catch (e) {
  console.error('Error loading settings:', e);
}

function saveSettings(newSettings) {
  settingsCache = { ...settingsCache, ...newSettings };
  try {
    fs.writeFileSync(settingsFile, JSON.stringify(settingsCache, null, 2));
  } catch (e) {
    console.error('Error saving settings locally:', e);
  }
}

async function saveSettingsToDB(newSettings) {
  settingsCache = { ...settingsCache, ...newSettings };
  saveSettings(newSettings); // keep local copy as fallback
  
  if (newSettings.lateThreshold) {
    try {
      await pool.query(
        "INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?) ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value",
        ['lateThreshold', newSettings.lateThreshold]
      );
    } catch (e) {
      console.error('Error saving settings to DB:', e);
    }
  }
}

function getSettings() {
  return settingsCache;
}

function getLateThresholdTime() {
  const t = settingsCache.lateThreshold || "09:00 AM";
  const parts = t.split(' ');
  const time = parts[0];
  const modifier = parts[1] || 'AM';
  let [hours, minutes] = time.split(':');
  if (hours === '12') hours = '00';
  if (modifier === 'PM') hours = (parseInt(hours, 10) + 12).toString();
  return `${hours.padStart(2, '0')}:${minutes}:00`;
}

const allowedOrigins = [
  "https://rayharstaffportal.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    const isAllowed =
      allowedOrigins.includes(origin) ||
      origin.endsWith(".vercel.app");

    if (isAllowed) {
      return callback(null, true);
    }

    return callback(new Error("CORS blocked: Not allowed origin"));
  },
  credentials: true
}));

app.use(express.json());

app.get("/api/settings", (req, res) => res.json({ success: true, settings: getSettings() }));
app.post("/api/settings", async (req, res) => {
  const current = getSettings();
  if (req.body && req.body.lateThreshold) current.lateThreshold = req.body.lateThreshold;
  await saveSettingsToDB(current);

  // SSE broadcast for settings change
  const operatorName = req.body.operatorName || "System";
  const operatorRole = req.body.operatorRole || "admin";
  broadcastPresenceUpdate({
    type: "config-change",
    timestamp: new Date().toISOString(),
    operatorName,
    operatorRole,
    action: `System Configuration updated (Late Arrivals Grace Period to ${current.lateThreshold})`
  });

  res.json({ success: true, settings: current });
});

// Ensure uploads and uploads/temp folders exist
const uploadsDir = path.join(__dirname, "uploads");
const tempDir = path.join(uploadsDir, "temp");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Multer Config (saves temporarily to uploads/temp)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// ===============================
// ROLES API
// ===============================

app.get("/api/roles", async (req, res) => {
  try {
    const result = await pgPool.query("SELECT * FROM roles ORDER BY created_at ASC");
    const formattedRoles = result.rows.map(row => {
      let displayName = row.name;
      if (row.name === 'hr_admin') {
        displayName = 'HR Admin';
      } else if (row.name) {
        displayName = row.name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      }
      return {
        ...row,
        name: displayName
      };
    });
    res.json({ success: true, roles: formattedRoles });
  } catch (err) {
    console.error("Error fetching roles:", err);
    res.status(500).json({ success: false, error: "Database error fetching roles" });
  }
});

app.post("/api/roles", async (req, res) => {
  const { name, status } = req.body;
  if (!name) return res.status(400).json({ success: false, error: "Role name is required" });

  try {
    const result = await pgPool.query(
      "INSERT INTO roles (name, status) VALUES ($1, $2) RETURNING *",
      [name, status || "Active"]
    );
    res.json({ success: true, role: result.rows[0] });
  } catch (err) {
    console.error("Error adding role:", err);
    // Handle unique constraint violation (duplicate role name)
    if (err.code === '23505') {
      return res.status(400).json({ success: false, error: "Role name already exists" });
    }
    res.status(500).json({ success: false, error: "Database error adding role" });
  }
});

app.put("/api/roles/:id", async (req, res) => {
  const { id } = req.params;
  const { name, status } = req.body;
  if (!name) return res.status(400).json({ success: false, error: "Role name is required" });

  try {
    const result = await pgPool.query(
      "UPDATE roles SET name = $1, status = $2 WHERE id = $3 RETURNING *",
      [name, status || "Active", id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Role not found" });
    }
    res.json({ success: true, role: result.rows[0] });
  } catch (err) {
    console.error("Error updating role:", err);
    if (err.code === '23505') {
      return res.status(400).json({ success: false, error: "Role name already exists" });
    }
    res.status(500).json({ success: false, error: "Database error updating role" });
  }
});

app.delete("/api/roles/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pgPool.query(
      "DELETE FROM roles WHERE id = $1 RETURNING *",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Role not found" });
    }
    res.json({ success: true, message: "Role deleted successfully" });
  } catch (err) {
    console.error("Error deleting role:", err);
    res.status(500).json({ success: false, error: "Database error deleting role" });
  }
});

// Supabase Cloud Storage Helper Functions for Medical Certificate Backup
async function ensureSupabaseBucketExists() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  const https = require("https");

  if (!supabaseUrl || !supabaseKey) {
    console.log("âš ï¸ Supabase credentials not found. Cloud storage backup is disabled.");
    return;
  }

  try {
    const data = JSON.stringify({
      id: "mc-attachments",
      name: "mc-attachments",
      public: true,
      file_size_limit: 52428800,
      allowed_mime_types: null
    });

    const urlObj = new URL(`${supabaseUrl}/storage/v1/bucket`);
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname,
      method: "POST",
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        "Content-Length": data.length,
      }
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => body += chunk);
      res.on("end", () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          console.log("â˜ï¸ Successfully checked/created 'mc-attachments' bucket in Supabase Storage!");
        } else {
          // Status 409 means bucket already exists, which is perfect and expected
          if (res.statusCode !== 409) {
            console.log(`â„¹ï¸ Supabase Bucket status: ${res.statusCode}.`);
          }
        }
      });
    });

    req.on("error", (err) => {
      console.error("âŒ Error checking/creating Supabase Bucket:", err);
    });

    req.write(data);
    req.end();
  } catch (err) {
    console.error("âŒ Failed to verify Supabase Storage bucket:", err);
  }
}

async function uploadToSupabaseStorage(filePath, filename, mimeType) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  const https = require("https");

  if (!supabaseUrl || !supabaseKey) return;

  try {
    const fileContent = fs.readFileSync(filePath);
    const encodedFilename = filename.split('/').map(segment => encodeURIComponent(segment)).join('/');
    const urlObj = new URL(`${supabaseUrl}/storage/v1/object/mc-attachments/${encodedFilename}`);
    
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname,
      method: "POST",
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": mimeType,
        "Content-Length": fileContent.length,
        "x-upsert": "true",
      }
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => body += chunk);
      res.on("end", () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          console.log(`â˜ï¸ Successfully backed up ${filename} to Supabase Storage!`);
        } else {
          console.error(`âŒ Supabase Storage upload failed with status ${res.statusCode}:`, body);
        }
      });
    });

    req.on("error", (err) => {
      console.error("âŒ Error uploading to Supabase Storage:", err);
    });

    req.write(fileContent);
    req.end();
  } catch (err) {
    console.error("âŒ Failed to upload to Supabase Storage:", err);
  }
}

function formatApproverRole(role, department, branch) {
  if (!role) return "Approver";
  const normalized = role.toLowerCase().trim();
  if (normalized === "head_of_department") {
    return `Head Of Department (${department || "N/A"})`;
  }
  if (normalized === "branch_leader") {
    return `Branch Leader (${branch || "N/A"})`;
  }
  if (normalized === "finance_manager") {
    return "Finance Manager";
  }
  if (normalized === "managing_director") {
    return "Managing Director";
  }
  return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

async function generateAndSaveLeaveFormPDF(leaveId) {
  const PDFDocument = require("pdfkit");

  try {
    const [rows] = await pool.query(
      `SELECT lr.*, p.full_name, p.branch, p.department,
        (
          SELECT json_agg(
            json_build_object(
              'id', la.id,
              'approver_id', la.approver_id,
              'approver_role', la.approver_role,
              'status', la.status,
              'remarks', la.remarks,
              'created_at', la.created_at,
              'approver_name', p2.full_name,
              'approver_department', p2.department,
              'approver_branch', p2.branch
            ) ORDER BY la.created_at ASC
          )
          FROM leave_approvals la
          LEFT JOIN profiles p2 ON p2.user_id = la.approver_id
          WHERE la.leave_id = lr.leave_id
        ) as approval_history
       FROM leave_requests lr 
       JOIN profiles p ON p.user_id = lr.user_id 
       WHERE lr.leave_id = ?`,
      [leaveId]
    );

    if (rows.length === 0) {
      console.error(`âŒ Leave request ${leaveId} not found for PDF generation.`);
      return;
    }

    const leave = rows[0];
    const employeeName = leave.full_name || leave.user_id;
    const employeeBranch = leave.branch || "HQ";
    const appliedAt = leave.created_at || new Date().toISOString();
    
    const submitDate = appliedAt instanceof Date 
      ? appliedAt.toISOString().slice(0, 10) 
      : String(appliedAt).slice(0, 10);
      
    const leaveTypeName = leave.leave_type.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
    const safeName = employeeName.toUpperCase().replace(/[^A-Z0-9]/g, "_");
    const filename = `${safeName}-${submitDate}-${leaveTypeName}-form.pdf`;

    const folderName = `${employeeName} (${employeeBranch})`.replace(/[\\/:*?"<>|]/g, "_").trim();
    const userUploadsDir = path.join(__dirname, "uploads", folderName);

    if (!fs.existsSync(userUploadsDir)) {
      fs.mkdirSync(userUploadsDir, { recursive: true });
    }

    const filePath = path.join(userUploadsDir, filename);

    await new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      // Draw page border
      doc.rect(40, 40, 532, 712).strokeColor("#000000").lineWidth(1.5).stroke();

      // Header
      doc.fontSize(20).font("Helvetica-Bold").fillColor("#000000").text("RAYHAR GROUP", { align: "center" });
      doc.fontSize(11).font("Helvetica-Bold").fillColor("#333333").text("PERMOHONAN CUTI KAKITANGAN", { align: "center", characterSpacing: 1 });
      
      // Divider Line under header
      doc.moveTo(40, 95).lineTo(572, 95).strokeColor("#000000").lineWidth(1.5).stroke();

      const leftCol = 55;
      const rightCol = 330;

      // Row 1: Nama Penuh & Cawangan
      doc.fontSize(8).font("Helvetica-Bold").fillColor("#555555").text("NAMA PENUH", leftCol, 108);
      doc.fontSize(9).font("Helvetica-Bold").fillColor("#111111").text(employeeName.toUpperCase(), leftCol, 120);

      doc.fontSize(8).font("Helvetica-Bold").fillColor("#555555").text("CAWANGAN", rightCol, 108);
      doc.fontSize(9).font("Helvetica-Bold").fillColor("#111111").text(employeeBranch.toUpperCase(), rightCol, 120);

      // Row 2: Jenis Cuti & Status
      doc.fontSize(8).font("Helvetica-Bold").fillColor("#555555").text("JENIS CUTI", leftCol, 140);
      doc.fontSize(9).font("Helvetica-Bold").fillColor("#111111").text(leave.leave_type, leftCol, 152);

      doc.fontSize(8).font("Helvetica-Bold").fillColor("#555555").text("STATUS", rightCol, 140);
      
      const statusText = (leave.status || "PENDING").toUpperCase();
      let statusColor = "#111111";
      if (statusText === "APPROVED") statusColor = "#137333";
      else if (statusText === "REJECTED") statusColor = "#c5221f";
      doc.fontSize(9).font("Helvetica-Bold").fillColor(statusColor).text(statusText, rightCol, 152);

      // Divider Line under main info
      doc.moveTo(40, 175).lineTo(572, 175).strokeColor("#cccccc").lineWidth(1).stroke();

      // Date Range Box
      doc.rect(55, 185, 502, 45).strokeColor("#000000").lineWidth(1).stroke();

      const startDateStr = leave.start_date instanceof Date ? leave.start_date.toISOString().slice(0, 10) : String(leave.start_date).slice(0, 10);
      const endDateStr = leave.end_date instanceof Date ? leave.end_date.toISOString().slice(0, 10) : String(leave.end_date).slice(0, 10);

      doc.fontSize(8).font("Helvetica-Bold").fillColor("#555555").text("DARI", 75, 193);
      doc.fontSize(10).font("Helvetica-Bold").fillColor("#111111").text(startDateStr, 75, 207);

      doc.fontSize(8).font("Helvetica-Bold").fillColor("#555555").text("HINGGA", 205, 193);
      doc.fontSize(10).font("Helvetica-Bold").fillColor("#111111").text(endDateStr, 205, 207);

      // HARI box on the right
      doc.roundedRect(375, 190, 170, 35, 4).strokeColor("#000000").lineWidth(1).stroke();
      doc.fontSize(8).font("Helvetica-Bold").fillColor("#555555").text("HARI", 375, 194, { width: 170, align: "center" });
      doc.fontSize(12).font("Helvetica-Bold").fillColor("#000000").text(String(leave.days), 375, 206, { width: 170, align: "center" });

      // Divider Line under Date Range
      doc.moveTo(40, 240).lineTo(572, 240).strokeColor("#cccccc").lineWidth(1).stroke();

      // Sebab / Tujuan
      doc.fontSize(8).font("Helvetica-Bold").fillColor("#555555").text("SEBAB / TUJUAN", leftCol, 248);
      doc.roundedRect(55, 260, 502, 35, 4).strokeColor("#000000").lineWidth(1).stroke();
      doc.fontSize(9).font("Helvetica-Oblique").fillColor("#111111").text(`"${leave.reason || '-'}"`, 65, 272);

      // Divider Line under Reason
      doc.moveTo(40, 305).lineTo(572, 305).strokeColor("#cccccc").lineWidth(1).stroke();

      // Emergency Contact Heading
      doc.fontSize(9).font("Helvetica-Bold").fillColor("#000000").text("MAKLUMAT WARIS (KECEMASAN)", leftCol, 313);
      doc.rect(55, 330, 502, 80).strokeColor("#000000").lineWidth(1).stroke();

      // Emergency Contact Info
      doc.fontSize(8).font("Helvetica-Bold").fillColor("#555555").text("NAMA", 70, 340);
      doc.fontSize(9).font("Helvetica-Bold").fillColor("#111111").text((leave.waris_nama || "N/A").toUpperCase(), 70, 350);

      doc.fontSize(8).font("Helvetica-Bold").fillColor("#555555").text("HUBUNGAN", rightCol, 340);
      doc.fontSize(9).font("Helvetica-Bold").fillColor("#111111").text((leave.waris_hubungan || "N/A").toUpperCase(), rightCol, 350);

      doc.fontSize(8).font("Helvetica-Bold").fillColor("#555555").text("NO. TELEFON", 70, 375);
      doc.fontSize(9).font("Helvetica-Bold").fillColor("#111111").text(leave.waris_phone || "N/A", 70, 385);

      doc.fontSize(8).font("Helvetica-Bold").fillColor("#555555").text("ALAMAT", rightCol, 375);
      doc.fontSize(8).font("Helvetica").fillColor("#111111").text(leave.waris_alamat || "N/A", rightCol, 385, { width: 220 });

      // Divider Line under Emergency Contact
      doc.moveTo(40, 420).lineTo(572, 420).strokeColor("#cccccc").lineWidth(1).stroke();

      // Approval History Section
      doc.fontSize(9).font("Helvetica-Bold").fillColor("#000000").text("APPROVAL HISTORY", leftCol, 428);
      doc.rect(55, 445, 502, 110).strokeColor("#000000").lineWidth(1).stroke();

      const history = leave.approval_history || [];
      if (history.length === 0) {
        doc.fontSize(9).font("Helvetica-Oblique").fillColor("#777777").text("No approval history recorded yet.", 70, 495);
      } else {
        const maxSteps = Math.min(history.length, 3);
        for (let i = 0; i < maxSteps; i++) {
          const step = history[i];
          const stepY = 455 + i * 32;

          // Draw timeline dot & line
          doc.circle(70, stepY + 10, 3).fillColor("#10B981").fill();
          if (i < maxSteps - 1) {
            doc.moveTo(70, stepY + 13).lineTo(70, stepY + 29).strokeColor("#cccccc").lineWidth(1).stroke();
          }

          // Draw card background
          doc.roundedRect(85, stepY, 460, 22, 4).fillColor("#f9fafb").fill();

          // Draw status badge
          const status = (step.status || "APPROVED").toUpperCase();
          const isApproved = status === "APPROVED";
          const badgeBg = isApproved ? "#e6f4ea" : "#fce8e6";
          const badgeText = isApproved ? "#137333" : "#c5221f";

          doc.roundedRect(95, stepY + 4, 60, 14, 3).fillColor(badgeBg).fill();
          doc.fontSize(7).font("Helvetica-Bold").fillColor(badgeText).text(status, 95, stepY + 7, { width: 60, align: "center" });

          // Draw text
          const dateStr = step.created_at 
            ? new Date(step.created_at).toLocaleDateString("en-GB") 
            : "";
          const formattedRole = formatApproverRole(step.approver_role, step.approver_department, step.approver_branch);
          doc.fontSize(8).font("Helvetica-Bold").fillColor("#333333").text(`by ${step.approver_name || 'System'} (${formattedRole})`, 170, stepY + 7);
          doc.fontSize(8).font("Helvetica").fillColor("#666666").text(dateStr, 480, stepY + 7);
        }
      }

      // Divider Line under Approval History
      doc.moveTo(40, 565).lineTo(572, 565).strokeColor("#cccccc").lineWidth(1).stroke();

      // Signatures
      const sigY = 645;
      doc.moveTo(70, sigY).lineTo(230, sigY).strokeColor("#333333").lineWidth(1).stroke();
      doc.moveTo(330, sigY).lineTo(490, sigY).stroke();

      doc.fontSize(8).font("Helvetica-Bold").fillColor("#333333");
      doc.text("TANDATANGAN KAKITANGAN", 70, sigY + 7, { width: 160, align: "center" });
      doc.text("KELULUSAN PENGURUS / HR", 330, sigY + 7, { width: 160, align: "center" });

      doc.end();
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
    });

    console.log(`ðŸ“„ Generated PDF successfully locally: ${filePath}`);

    // Backup to Supabase Storage
    const supabaseStoragePath = `${folderName}/${filename}`;
    await uploadToSupabaseStorage(filePath, supabaseStoragePath, "application/pdf");
  } catch (err) {
    console.error("âŒ Error generating leave form PDF:", err);
  }
}

// Call bucket check on startup
ensureSupabaseBucketExists();

// Serve uploads statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Fallback redirection for files wiped by Render ephemeral restart (supports nested folders)
app.get(/^\/uploads\/(.+)$/, (req, res) => {
  const fileSubpath = req.params[0];
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  if (supabaseUrl && fileSubpath) {
    const encodedSubpath = fileSubpath.split('/').map(segment => encodeURIComponent(segment)).join('/');
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/mc-attachments/${encodedSubpath}`;
    console.log(`â†ªï¸ File ${fileSubpath} not found locally. Redirecting to Supabase fallback: ${publicUrl}`);
    return res.redirect(publicUrl);
  }
  res.status(404).send('Cannot GET /uploads/' + (fileSubpath || ''));
});

// ===============================
// DATABASE CONNECTION (PRODUCTION SAFE)
// ===============================

const connectionString = process.env.DATABASE_URL;

const dbConfig = {
  host: process.env.DB_HOST || process.env.MYSQLHOST,
  user: process.env.DB_USER || process.env.MYSQLUSER,
  password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD,
  database: process.env.DB_NAME || process.env.MYSQLDATABASE,
  port: Number(process.env.DB_PORT || process.env.MYSQLPORT || 5432),
  ssl: { rejectUnauthorized: false }
};

if (!connectionString && (!dbConfig.host || !dbConfig.user || !dbConfig.database)) {
  throw new Error("Missing DB environment variables (DATABASE_URL or split vars)");
}

// PostgreSQL wrapper pool to mimic mysql2/promise interface
const pgPool = connectionString ? new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 10
}) : new Pool(dbConfig);

// Helper: convert all params to strings so PostgreSQL never sees integer vs varchar mismatch
function sanitizeParams(params) {
  if (!params || params.length === 0) return params;
  return params.map(p => {
    if (p === null || p === undefined) return null;
    if (typeof p === 'boolean') return p; // keep booleans as-is for boolean columns
    return String(p);
  });
}

// Helper: replace ? placeholders with $1, $2, ... for PostgreSQL
function mysqlToPostgres(sql, params) {
  if (params && params.length > 0) {
    let i = 1;
    sql = sql.replace(/\?/g, () => `$${i++}`);
  }
  return sql;
}

const pool = {
  pool: pgPool, // for pool.pool.on
  getConnection: async () => {
    const client = await pgPool.connect();
    return {
      query: async (sql, params) => {
        params = sanitizeParams(params);
        sql = mysqlToPostgres(sql, params);
        // Handle RETURNING for INSERT
        let isInsert = /^\s*INSERT\s+/i.test(sql);
        if (isInsert && !/RETURNING/i.test(sql)) {
          sql = sql + " RETURNING *";
        }
        try {
          const res = await client.query(sql, params);
          let resultObj = res.rows || [];
          if (isInsert && res.rows && res.rows.length > 0) {
            const firstRow = res.rows[0];
            const maybeId = firstRow.id || firstRow.leave_id || Object.values(firstRow)[0];
            resultObj = { insertId: maybeId };
          } else if (!Array.isArray(resultObj)) {
            resultObj = [];
          }
          return [resultObj, res.fields];
        } catch(err) {
          throw err;
        }
      },
      release: () => client.release(),
      beginTransaction: () => client.query('BEGIN'),
      commit: () => client.query('COMMIT'),
      rollback: () => client.query('ROLLBACK'),
    };
  },
  query: async (sql, params) => {
    params = sanitizeParams(params);
    sql = mysqlToPostgres(sql, params);
    // Handle returning insert id automatically if it's an INSERT query without RETURNING
    let isInsert = /^\s*INSERT\s+/i.test(sql);
    if (isInsert && !/RETURNING/i.test(sql)) {
      sql = sql + " RETURNING *";
    }
    try {
      const res = await pgPool.query(sql, params);
      let resultObj = res.rows || [];
      if (isInsert && res.rows && res.rows.length > 0) {
        // Find the id or something representing insertId
        const firstRow = res.rows[0];
        const maybeId = firstRow.id || firstRow.leave_id || Object.values(firstRow)[0];
        resultObj = { insertId: maybeId };
      } else if (!Array.isArray(resultObj)) {
        resultObj = [];
      }
      return [resultObj, res.fields]; // returning [rows, fields] like mysql2
    } catch(err) {
      throw err;
    }
  }
};


// Set timezone to Malaysia (UTC+8) for PostgreSQL globally
process.env.PGTZ = 'Asia/Kuala_Lumpur';

// Test connection & Migration
(async () => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT NOW() as now');
    console.log('âœ… Connected to PostgreSQL successfully. Server time:', rows[0].now);

    // Auto-migrate personal_notes table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS personal_notes (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(100) NOT NULL,
        date DATE NOT NULL,
        note_text TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'note',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure user_id column is VARCHAR(100) and not UUID (to support employee format IDs like 'E019')
    try {
      // First drop potential foreign key constraints that would block changing column type
      await connection.query("ALTER TABLE personal_notes DROP CONSTRAINT IF EXISTS fk_user");
      await connection.query("ALTER TABLE personal_notes DROP CONSTRAINT IF EXISTS personal_notes_user_id_fkey");
      await connection.query("ALTER TABLE personal_notes ALTER COLUMN user_id TYPE VARCHAR(100)");
      console.log('ðŸš€ Successfully verified/migrated personal_notes.user_id column type to VARCHAR(100).');
    } catch (colErr) {
      console.error('âš ï¸ Personal notes migration warning:', colErr.message);
    }

    // Create an index to make looking up notes by month faster
    await connection.query(`CREATE INDEX IF NOT EXISTS idx_personal_notes_user_date ON personal_notes(user_id, date);`);
    console.log('âœ… Auto-migration for personal_notes completed.');

    // Auto-migrate system_settings table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        setting_key VARCHAR(50) PRIMARY KEY,
        setting_value VARCHAR(255)
      );
    `);

    // Auto-migrate branches table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS branches (
        code VARCHAR(50) PRIMARY KEY,
        branch VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        location VARCHAR(255)
      );
    `);
    console.log('âœ… Auto-migration for branches completed.');

    // Auto-migrate roles table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        status VARCHAR(50) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Auto-migrate company_leave_calendar table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS company_leave_calendar (
        id SERIAL PRIMARY KEY,
        leave_name VARCHAR(255) NOT NULL,
        leave_type VARCHAR(100),
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        applies_to VARCHAR(100) NOT NULL,
        branch_id TEXT,
        department_id TEXT,
        is_paid BOOLEAN DEFAULT TRUE,
        attendance_required BOOLEAN DEFAULT FALSE,
        status VARCHAR(50) DEFAULT 'Active',
        remarks TEXT,
        created_by VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await connection.query(`ALTER TABLE company_leave_calendar ALTER COLUMN branch_id TYPE TEXT`);
    await connection.query(`ALTER TABLE company_leave_calendar ALTER COLUMN department_id TYPE TEXT`);
    await connection.query(`ALTER TABLE company_leave_calendar ALTER COLUMN leave_type DROP NOT NULL`).catch(() => {});
    await connection.query(`DELETE FROM notifications WHERE type = 'company_leave'`).catch(() => {});
    console.log('✅ Auto-migration for company_leave_calendar completed.');

    try {
      const [roleCountRows] = await connection.query("SELECT COUNT(*) as count FROM roles");
      if (parseInt(roleCountRows[0].count) === 0) {
        console.log("Inserting default roles into database...");
        const defaultRoles = [
          'employee', 'branch_officer', 'branch_leader', 'head_of_department', 
          'finance_manager', 'hr_admin', 'managing_director'
        ];
        for (const role of defaultRoles) {
          await connection.query("INSERT INTO roles (name, status) VALUES (?, 'Active')", [role]);
        }
        console.log("âœ… Default roles inserted.");
      }
    } catch (roleSeedErr) {
      console.error("âš ï¸ Failed to seed default roles:", roleSeedErr.message);
    }
    console.log('âœ… Auto-migration for roles completed.');

    // Load settings from db
    try {
       const [settingRows] = await connection.query('SELECT * FROM system_settings');
       for (const row of settingRows) {
          settingsCache[row.setting_key] = row.setting_value;
       }
       console.log('âœ… Settings loaded from DB:', settingsCache);
    } catch (e) {
       console.error('Error loading settings from DB', e);
    }


    // Auto migration: Clean up unused Telegram and reset token columns from profiles table
    try {
      await connection.query("ALTER TABLE profiles DROP COLUMN IF EXISTS telegram_chat_id");
      await connection.query("ALTER TABLE profiles DROP COLUMN IF EXISTS reset_token");
      await connection.query("ALTER TABLE profiles DROP COLUMN IF EXISTS reset_token_expires");
      console.log('ðŸš€ Successfully migrated: Removed telegram_chat_id, reset_token, and reset_token_expires from profiles table.');
    } catch (migErr) {
      console.error('âš ï¸ Migration warning during cleanup of unused columns:', migErr.message);
    }

    // Auto sanitization of database user_role table and profiles status column (fixes trailing carriage returns/newlines/spaces for all roles)
    try {
      await connection.query("UPDATE user_role SET role = TRIM(BOTH FROM REGEXP_REPLACE(role, '[\\r\\n\\s]+', '', 'g'))");
      await connection.query("UPDATE profiles SET status = TRIM(BOTH FROM REGEXP_REPLACE(status, '[\\r\\n\\s]+', '', 'g'))");
      // Auto-demote inactive users from leader/HOD roles to prevent them from staying assigned
      await connection.query("UPDATE user_role ur SET role = 'employee' FROM profiles p WHERE ur.user_id = p.user_id AND p.status = 'Inactive' AND ur.role IN ('branch_leader', 'head_of_department')");
      console.log('ðŸš€ Successfully sanitized database and demoted inactive users from leader/HOD roles.');
    } catch (sanErr) {
      console.error('âš ï¸ Database sanitization/demotion warning:', sanErr.message);
    }

    // Auto-update branch locations to be geographically accurate (Kemaman, Terengganu, Selangor, Johor, Perak, etc.) instead of generic "RAYHAR BRANCH"
    try {
      const correctBranches = [
        { code: "HQ", location: "Kemaman,Terengganu" },
        { code: "KMM", location: "Kemaman,Terengganu" },
        { code: "CNH", location: "Kemaman,Terengganu" },
        { code: "KBG", location: "Hulu Terengganu,Terengganu" },
        { code: "TGG", location: "Kuala Terengganu,Terengganu" },
        { code: "DGN", location: "Dungun,Terengganu" },
        { code: "JTH", location: "Besut,Terengganu" },
        { code: "KBR", location: "Kota Bharu,Kelantan" },
        { code: "RMP", location: "Rompin,Pahang" },
        { code: "MZM", location: "Muadzam Shah,Pahang" },
        { code: "SHA", location: "Shah Alam,Selangor" },
        { code: "BBB", location: "Bandar Baru Bangi,Selangor" },
        { code: "KUL", location: "Kuala Lumpur,Wilayah Persekutuan" },
        { code: "IPH", location: "Ipoh,Perak" },
        { code: "MJG", location: "Manjung,Perak" },
        { code: "KKS", location: "Kuala Kangsar,Perak" },
        { code: "MLK", location: "Melaka,Melaka" },
        { code: "AOR", location: "Alor Setar,Kedah" },
        { code: "BTM", location: "Bertam,Pulau Pinang" },
        { code: "SNS", location: "Seremban,Negeri Sembilan" },
        { code: "BTP", location: "Batu Pahat,Johor" },
        { code: "JB", location: "Johor Bharu,Johor" },
        { code: "TWU", location: "Tawau,Sabah" }
      ];
      for (const b of correctBranches) {
        await connection.query("UPDATE branches SET location = ? WHERE code = ? AND (location IS NULL OR location = 'RAYHAR BRANCH' OR location = '')", [b.location, b.code]);
      }
      console.log('ðŸš€ Successfully updated correct geographical locations for all Rayhar branches in the database.');
    } catch (branchLocErr) {
      console.error('âš ï¸ Database branch location update warning:', branchLocErr.message);
    }

    connection.release();
  } catch (error) {
    console.error('âŒ Error connecting to PostgreSQL:', error.message);
  }
})();


// ===============================
// REAL-TIME PRESENCE FEED (SSE)
// ===============================
let sseClients = [];
let liveStatsClients = [];

async function getLiveAttendanceStats(queryDate, role, branch, department) {
  const dateStr = queryDate || new Date().toISOString().split('T')[0];
  try {
    const lateTimeStr = getLateThresholdTime ? getLateThresholdTime() : '09:00:00';

    let filterP = "";
    let paramsTotal = [];
    if (role === 'branch_leader') {
      const safeBranch = (branch && branch !== "All") ? branch : "INVALID_BYPASS";
      branch = safeBranch;
      filterP = " AND p.branch = ?";
      paramsTotal.push(branch);
    } else if (role === 'head_of_department') {
      const safeDept = (department && department !== "All") ? department : "INVALID_BYPASS";
      department = safeDept;
      filterP = " AND p.department = ?";
      paramsTotal.push(department);
    }

    // Total active employees
    const [allProfiles] = await pool.query(
      `SELECT user_id, full_name, branch, department, role FROM profiles WHERE status = 'Active' AND DATE(created_at) <= ?::date ${filterP}`,
      [dateStr, ...paramsTotal]
    );
    const total = allProfiles.length;

    // Company leaves active today
    const [companyLeaveRows] = await pool.query(
      `SELECT * FROM company_leave_calendar WHERE status = 'Active' AND ?::date BETWEEN DATE(start_date) AND DATE(end_date)`,
      [dateStr]
    );

    // On leave today
    const leaveParams = [dateStr, ...paramsTotal];
    const [leaveRows] = await pool.query(
      `SELECT DISTINCT lr.user_id, p.full_name, p.branch, p.department
       FROM leave_requests lr
       JOIN profiles p ON p.user_id = lr.user_id
       WHERE lr.status = 'Approved' AND ? BETWEEN lr.start_date AND lr.end_date
       AND p.status = 'Active' ${filterP}`,
      leaveParams
    );

    const onLeaveIds = new Set(leaveRows.map(r => r.user_id));

    // All clock-ins today
    const clockParams = [dateStr, ...paramsTotal];
    const [clockRows] = await pool.query(
      `SELECT a.user_id, p.full_name, p.branch, p.department, p.role, a.clock_in, a.clock_out
       FROM attendances a
       JOIN profiles p ON p.user_id = a.user_id
       WHERE DATE(a.clock_in) = ?
       AND p.status = 'Active' ${filterP}
       ORDER BY a.clock_in ASC`,
      clockParams
    );

    // Deduplicate by user_id (latest record per user)
    const clockMap = {};
    for (const row of clockRows) {
      clockMap[row.user_id] = row;
    }

    const presentList = [];
    const lateList = [];
    const leaveList = [];
    const companyLeaveList = [];
    const absentList = [];

    for (const p of allProfiles) {
      const uid = p.user_id;

      // 1. Check Company Leave first (Highest priority)
      const matchingLeave = companyLeaveRows.find(cl => {
        if (cl.applies_to === 'all') return true;
        if (cl.applies_to === 'branch' && cl.branch_id) {
          return cl.branch_id.split(',').map(s => s.trim()).includes(p.branch);
        }
        if (cl.applies_to === 'department' && cl.department_id) {
          const depts = cl.department_id.split(',').map(s => s.trim());
          const normEmpDept = (p.department || '').toLowerCase().replace(/\bdepartment\b/g, '').trim();
          return depts.some(d => {
            const normClDept = d.toLowerCase().replace(/\bdepartment\b/g, '').trim();
            return normEmpDept === normClDept || p.department === d;
          });
        }
        return false;
      });

      if (matchingLeave) {
        companyLeaveList.push({
          user_id: uid,
          full_name: p.full_name,
          branch: p.branch || 'HQ',
          department: p.department || '—',
          clock_in: null,
          clock_out: null,
          status: 'companyLeave',
          leave_name: matchingLeave.leave_name
        });
      }
      // 2. On Approved Personal Leave
      else if (onLeaveIds.has(uid)) {
        leaveList.push({ user_id: uid, full_name: p.full_name, branch: p.branch || 'HQ', department: p.department || '—', clock_in: null, clock_out: null, status: 'onLeave' });
      }
      // 3. Clocked In
      else if (clockMap[uid]) {
        const row = clockMap[uid];
        const klTime = new Date(new Date(row.clock_in).getTime() + 8 * 60 * 60 * 1000);
        const hh = klTime.getUTCHours();
        const mm = klTime.getUTCMinutes();
        const [lhStr, lmStr] = lateTimeStr.split(':');
        const lh = parseInt(lhStr), lm = parseInt(lmStr);
        const isLate = hh > lh || (hh === lh && mm > lm);
        const lateMinutes = isLate ? (hh * 60 + mm) - (lh * 60 + lm) : 0;
        const timeInFmt = klTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        const timeOutFmt = row.clock_out
          ? new Date(new Date(row.clock_out).getTime() + 8 * 60 * 60 * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
          : null;

        const emp = { user_id: uid, full_name: p.full_name, branch: p.branch || 'HQ', department: p.department || '—', role: p.role || '', clock_in: timeInFmt, clock_out: timeOutFmt };
        if (isLate) lateList.push({ ...emp, status: 'late', late_minutes: lateMinutes });
        else presentList.push({ ...emp, status: 'present', late_minutes: 0 });
      }
      // 4. Absent
      else {
        absentList.push({ user_id: uid, full_name: p.full_name, branch: p.branch || 'HQ', department: p.department || '—', clock_in: null, clock_out: null, status: 'absent' });
      }
    }

    return {
      type: 'presence_update',
      timestamp: new Date().toISOString(),
      stats: {
        present: presentList.length + lateList.length,
        late: lateList.length,
        absent: absentList.length,
        onLeave: leaveList.length,
        companyLeave: companyLeaveList.length,
        total
      },
      employees: [
        ...presentList,
        ...lateList,
        ...leaveList,
        ...companyLeaveList,
        ...absentList
      ]
    };
  } catch (err) {
    console.error('getLiveAttendanceStats error:', err);
    return { type: 'presence_update', timestamp: new Date().toISOString(), stats: { present: 0, late: 0, absent: 0, onLeave: 0, total: 0 }, employees: [] };
  }
}

function broadcastPresenceUpdate(payload = { type: 'refresh' }) {
  console.log(`ðŸ“¡ Broadcasting presence update to ${sseClients.length} clients...`);
  sseClients.forEach((client) => {
    client.write(`data: ${JSON.stringify(payload)}\n\n`);
  });
  // Also refresh live stats clients
  if (liveStatsClients.length > 0) {
    const today = new Date().toISOString().split('T')[0];
    liveStatsClients.forEach(c => {
      getLiveAttendanceStats(today, c.role, c.branch, c.department).then(data => {
        c.res.write(`data: ${JSON.stringify(data)}\n\n`);
      }).catch(console.error);
    });
  }
}

// ===============================
// ROUTES
// ===============================

app.get("/api/presence/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  sseClients.push(res);
  console.log(`ðŸ”Œ SSE Client connected. Total: ${sseClients.length}`);

  req.on("close", () => {
    sseClients = sseClients.filter((c) => c !== res);
    console.log(`ðŸ”Œ SSE Client disconnected. Total: ${sseClients.length}`);
  });
});

// LIVE STATS SSE â€” streams enriched presence data (present/late/absent/on-leave counts + employee list)
app.get("/api/presence/live-stats", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  // Send heartbeat comment to keep connection alive
  res.write(": connected\n\n");

  const queryDate = req.query.date ? req.query.date.toString() : new Date().toISOString().split('T')[0];
  const { role, branch, department } = req.query;

  // Send initial snapshot immediately
  try {
    const snapshot = await getLiveAttendanceStats(queryDate, role, branch, department);
    res.write(`data: ${JSON.stringify(snapshot)}\n\n`);
  } catch (e) {
    console.error("live-stats initial send error:", e);
  }

  // Refresh every 30 seconds
  const interval = setInterval(async () => {
    try {
      const data = await getLiveAttendanceStats(queryDate, role, branch, department);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (e) {
      console.error("live-stats interval error:", e);
    }
  }, 30000);

  const clientEntry = { res, role, branch, department };
  liveStatsClients.push(clientEntry);
  console.log(`ðŸ“Š Live-stats SSE client connected. Total: ${liveStatsClients.length}`);

  req.on("close", () => {
    clearInterval(interval);
    liveStatsClients = liveStatsClients.filter(c => c !== clientEntry);
    console.log(`ðŸ“Š Live-stats SSE client disconnected. Total: ${liveStatsClients.length}`);
  });
});

// ============================================================
// WORKFORCE LIVE FEED SSE
// Streams: clockInOut (present), late (with minutes), pendingApprovals
// For: hr_admin, managing_director, finance_manager
// ============================================================
let workforceFeedClients = [];

async function getWorkforceLiveFeed(dateStr, role, branch, department) {
  const lateTimeStr = getLateThresholdTime ? getLateThresholdTime() : '09:00:00';

  let filterP = "";
  let paramsBase = [];
  if (role === 'branch_leader') {
      const safeBranch = (branch && branch !== "All") ? branch : "INVALID_BYPASS";
      branch = safeBranch;
    filterP = " AND p.branch = ?";
    paramsBase.push(branch);
  } else if (role === 'head_of_department') {
      const safeDept = (department && department !== "All") ? department : "INVALID_BYPASS";
      department = safeDept;
    filterP = " AND p.department = ?";
    paramsBase.push(department);
  }

  // Clock-ins today with role
  const [clockRows] = await pool.query(
    `SELECT a.user_id, p.full_name, p.branch, p.department, p.role, a.clock_in, a.clock_out
     FROM attendances a
     JOIN profiles p ON p.user_id = a.user_id
     WHERE DATE(a.clock_in) = ?
     AND p.status = 'Active' ${filterP}
     ORDER BY a.clock_in ASC`,
    [dateStr, ...paramsBase]
  );

  // On leave today
  const [leaveRows] = await pool.query(
    `SELECT DISTINCT lr.user_id FROM leave_requests lr
     JOIN profiles p ON p.user_id = lr.user_id
     WHERE lr.status = 'Approved' AND ? BETWEEN lr.start_date AND lr.end_date
     AND p.status = 'Active' ${filterP}`,
    [dateStr, ...paramsBase]
  );
  const onLeaveIds = new Set(leaveRows.map(r => r.user_id));

  // Deduplicate by user_id (first clock-in per user)
  const clockMap = {};
  for (const row of clockRows) {
    if (!clockMap[row.user_id]) clockMap[row.user_id] = row;
  }

  // Get active company leaves
  const [companyLeaveDays] = await pool.query(
    `SELECT * FROM company_leave_calendar WHERE status = 'Active' AND ?::date BETWEEN DATE(start_date) AND DATE(end_date)`,
    [dateStr]
  );

  // Get all active profiles to determine absentees
  const [allProfiles] = await pool.query(
    `SELECT user_id, full_name, branch, department, role FROM profiles WHERE status = 'Active' ${filterP}`,
    paramsBase
  );

  const [lhStr, lmStr] = lateTimeStr.split(':');
  const lh = parseInt(lhStr), lm = parseInt(lmStr);

  const clockInOut = [];
  const lateList = [];

  for (const [uid, row] of Object.entries(clockMap)) {
    if (onLeaveIds.has(uid)) continue;
    const klTime = new Date(new Date(row.clock_in).getTime() + 8 * 60 * 60 * 1000);
    const hh = klTime.getUTCHours();
    const mm = klTime.getUTCMinutes();
    const isLate = hh > lh || (hh === lh && mm > lm);
    const lateMinutes = isLate ? (hh * 60 + mm) - (lh * 60 + lm) : 0;
    const timeInFmt = klTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const timeOutFmt = row.clock_out
      ? new Date(new Date(row.clock_out).getTime() + 8 * 60 * 60 * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      : null;

    const initials = (row.full_name || '??').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
    const emp = {
      user_id: uid,
      full_name: row.full_name,
      initials,
      branch: row.branch || 'HQ',
      department: row.department || '—',
      role: row.role || '',
      clock_in: timeInFmt,
      clock_out: timeOutFmt,
      late_minutes: lateMinutes,
      is_late: isLate
    };
    if (isLate) lateList.push(emp);
    else clockInOut.push(emp);
  }

  const absentList = [];
  for (const p of allProfiles) {
    if (!onLeaveIds.has(p.user_id) && !clockMap[p.user_id]) {
      const initials = (p.full_name || '??').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
      
      const isCompanyLeave = companyLeaveDays.some(cl => {
        if (cl.applies_to === 'all') return true;
        if (cl.applies_to === 'branch' && cl.branch_id) {
          return cl.branch_id.split(',').map(s => s.trim()).includes(p.branch);
        }
        if (cl.applies_to === 'department' && cl.department_id) {
          const depts = cl.department_id.split(',').map(s => s.trim());
          const normEmpDept = (p.department || '').toLowerCase().replace(/\bdepartment\b/g, '').trim();
          return depts.some(d => {
            const normClDept = d.toLowerCase().replace(/\bdepartment\b/g, '').trim();
            return normEmpDept === normClDept || p.department === d;
          });
        }
        return false;
      });

      absentList.push({
        user_id: p.user_id,
        full_name: p.full_name,
        initials,
        branch: p.branch || 'HQ',
        department: p.department || '—',
        role: p.role || '',
        status: isCompanyLeave ? 'companyLeave' : 'absent'
      });
    }
  }

  // Pending approvals â€” role-filtered
  let pendingFilters = ["lr.status IN ('Pending', 'Pending Finance', 'Pending MD', 'Pending HOD')"];
  let pendingParams = [];
  if (!['hr_admin', 'managing_director', 'finance_manager'].includes(role)) {
    if (branch) { pendingFilters.push("p.branch = ?"); pendingParams.push(branch); }
    if (department) { pendingFilters.push("p.department = ?"); pendingParams.push(department); }
  }
  const pendingWhere = pendingFilters.length ? `WHERE ${pendingFilters.join(' AND ')}` : '';
  const [pendingRows] = await pool.query(
    `SELECT lr.leave_id, lr.user_id, lr.leave_type, lr.start_date, lr.end_date, lr.days, lr.reason, lr.status,
            p.full_name, p.branch, p.department
     FROM leave_requests lr
     JOIN profiles p ON p.user_id = lr.user_id
     ${pendingWhere}
     ORDER BY lr.created_at DESC
     LIMIT 10`,
    pendingParams
  );

  const pendingApprovals = pendingRows.map(r => ({
    id: r.leave_id,
    user_id: r.user_id,
    name: r.full_name,
    initials: (r.full_name || '??').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase(),
    leave_type: r.leave_type,
    dates: `${new Date(r.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(r.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
    days: `${r.days} day${r.days !== 1 ? 's' : ''}`,
    reason: r.reason || '',
    status: r.status
  }));

  return {
    type: 'workforce_feed',
    timestamp: new Date().toISOString(),
    clockInOut,
    lateList,
    absentList,
    pendingApprovals
  };
}

app.get("/api/workforce/live-feed", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  res.write(": connected\n\n");

  const { date, role, branch, department } = req.query;
  const targetDate = date ? date.toString() : new Date().toISOString().split('T')[0];

  // Send initial snapshot
  try {
    const snapshot = await getWorkforceLiveFeed(targetDate, role, branch, department);
    res.write(`data: ${JSON.stringify(snapshot)}\n\n`);
  } catch (e) {
    console.error("workforce live-feed initial send error:", e);
  }

  // Refresh every 30 seconds
  const interval = setInterval(async () => {
    try {
      const data = await getWorkforceLiveFeed(targetDate, role, branch, department);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (e) {
      console.error("workforce live-feed interval error:", e);
    }
  }, 30000);

  const clientEntry = { res, role, branch, department };
  workforceFeedClients.push(clientEntry);
  console.log(`ðŸ¢ Workforce-feed SSE client connected. Total: ${workforceFeedClients.length}`);

  req.on("close", () => {
    clearInterval(interval);
    workforceFeedClients = workforceFeedClients.filter(c => c !== clientEntry);
    console.log(`ðŸ¢ Workforce-feed SSE client disconnected. Total: ${workforceFeedClients.length}`);
  });
});


app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Rayhar Employee Portal API is running",
    routes: [
      "/api/health",
      "/api/login",
      "/api/signup",
      "/api/employees",
      "/api/branch-employees",
      "/api/leave-requests",
      "/api/user-details/:identifier",
      "/api/attendance-status?empId=E001",
      "/api/dashboard-stats?userId=E001",
    ],
  });
});

app.get("/api/health", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT NOW() AS database_time");
    res.json({
      success: true,
      message: "Database connected",
      databaseTime: rows[0].database_time,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: err.message,
    });
  }
});

// SIGN-UP API
app.post("/api/signup", async (req, res) => {
  const { full_name, email, password, branch, department, status, role, operatorName, operatorRole } = req.body;

  if (!full_name || !email || !password || !branch) {
    return res.status(400).json({ success: false, error: "All fields are required" });
  }

  // Allow department for all branches now


  try {
    const connection = await pool.getConnection();

    const [existing] = await connection.query(
      "SELECT user_id FROM profiles WHERE email = ? LIMIT 1",
      [email]
    );

    if (existing.length > 0) {
      connection.release();
      return res.status(409).json({ success: false, error: "Email already registered" });
    }

    // Generate New E00x ID â€” PostgreSQL version
    const [maxRows] = await connection.query(
      "SELECT MAX(CAST(SUBSTRING(user_id, 2) AS INTEGER)) as max_id FROM profiles WHERE user_id LIKE 'E%'"
    );
    const nextIdNum = (maxRows[0].max_id || 0) + 1;
    const userId = "E" + String(nextIdNum).padStart(3, "0");

    // Hash password before storing it in the database
    const hashedPassword = await bcrypt.hash(password, 10);

    await connection.query(
      `INSERT INTO profiles (user_id, full_name, email, password, branch, department, status, role)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, full_name, email, hashedPassword, branch, department || null, status || "Active", role || 'employee']
    );

    await connection.query(
      "INSERT INTO user_role (user_id, role, department) VALUES (?, ?, ?)",
      [userId, role || 'employee', department || null]
    );

    connection.release();

    // Broadcast onboard staff event via SSE
    broadcastPresenceUpdate({
      type: "config-change",
      timestamp: new Date().toISOString(),
      operatorName: operatorName || "System",
      operatorRole: operatorRole || "admin",
      action: `Onboarded new staff: ${full_name.trim()} (${role || 'employee'})`
    });

    return res.status(201).json({
      success: true,
      message: "User signed up successfully",
      user: {
        user_id: userId,
        full_name,
        email,
        branch,
        department: department
      }
    });

  } catch (err) {
    console.error("Error during sign-up:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ===============================
// BRANCH EMPLOYEE STATISTICS
// ===============================
app.get("/api/branch-employees", async (req, res) => {
  const { branch } = req.query;

  if (!branch) {
    return res.status(400).json({ success: false, error: "Missing branch" });
  }

  try {
    const [rows] = await pool.query(
      `
      SELECT
        p.user_id,
        p.full_name,
        p.email,
        p.branch,
        p.status,
        COALESCE(ur.role, 'employee') AS role,
        COALESCE(lr.pending_leaves, 0) AS pending_leaves,
        COALESCE(lr.approved_leaves, 0) AS approved_leaves,
        COALESCE(lr.rejected_leaves, 0) AS rejected_leaves,
        COALESCE(lr.total_leave_requests, 0) AS total_leave_requests,
        COALESCE(lr.mc_leaves, 0) AS mc_leaves,
        GREATEST(14 - COALESCE(lr.annual_days_used, 0), 0) AS annual_leave_balance,
        COALESCE(att.days_present, 0) AS days_present,
        ROUND((COALESCE(att.days_present, 0)::numeric / EXTRACT(DAY FROM CURRENT_DATE)) * 100) AS attendance_rate,
        today.clock_in AS today_clock_in,
        today.clock_out AS today_clock_out,
        CASE WHEN COALESCE(leave_today.leave_count, 0) > 0 THEN 1 ELSE 0 END AS is_on_leave
      FROM profiles p
      LEFT JOIN user_role ur ON ur.user_id = p.user_id
      LEFT JOIN (
        SELECT
          user_id,
          SUM(CASE WHEN leave_type IN ('Cuti Tahunan', 'Annual/Emergency Leave', 'Cuti Sakit', 'Sick Leave') AND status = 'Approved' THEN days ELSE 0 END) AS annual_days_used,
          SUM(CASE WHEN status LIKE 'Pending%' THEN 1 ELSE 0 END) AS pending_leaves,
          SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) AS approved_leaves,
          SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) AS rejected_leaves,
          SUM(CASE WHEN leave_type IN ('Cuti Sakit', 'Sick Leave') THEN 1 ELSE 0 END) AS mc_leaves,
          COUNT(*) AS total_leave_requests
        FROM leave_requests
        GROUP BY user_id
      ) lr ON lr.user_id = p.user_id
      LEFT JOIN (
        SELECT
          user_id,
          COUNT(DISTINCT DATE(clock_in)) AS days_present
        FROM attendances
        WHERE EXTRACT(YEAR FROM clock_in) = EXTRACT(YEAR FROM CURRENT_DATE)
        AND EXTRACT(MONTH FROM clock_in) = EXTRACT(MONTH FROM CURRENT_DATE)
        GROUP BY user_id
      ) att ON att.user_id = p.user_id
      LEFT JOIN (
        SELECT a.user_id, a.clock_in, a.clock_out
        FROM attendances a
        INNER JOIN (
          SELECT user_id, MAX(attendance_id) AS latest_attendance_id
          FROM attendances
          WHERE DATE(clock_in) = CURRENT_DATE
          GROUP BY user_id
        ) latest ON latest.latest_attendance_id = a.attendance_id
      ) today ON today.user_id = p.user_id
      LEFT JOIN (
        SELECT user_id, COUNT(*) as leave_count
        FROM leave_requests
        WHERE status = 'Approved'
        AND (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kuala_Lumpur')::date BETWEEN (start_date AT TIME ZONE 'Asia/Kuala_Lumpur')::date AND (end_date AT TIME ZONE 'Asia/Kuala_Lumpur')::date
        GROUP BY user_id
      ) leave_today ON leave_today.user_id = p.user_id
      WHERE p.branch = ? AND p.status = 'Active'
      ORDER BY 
        CASE 
          WHEN ur.role = 'managing_director' THEN 1
          WHEN ur.role = 'finance_manager' THEN 2
          WHEN ur.role = 'hr_admin' THEN 3
          WHEN ur.role = 'head_of_department' THEN 4
          WHEN ur.role = 'branch_leader' THEN 5
          WHEN ur.role = 'branch_officer' THEN 6
          WHEN ur.role = 'employee' THEN 7
          ELSE 8
        END ASC,
        p.full_name ASC
      `,
      [branch]
    );

    const [companyLeaves] = await pool.query(
      `SELECT * FROM company_leave_calendar WHERE status = 'Active' AND (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kuala_Lumpur')::date BETWEEN (start_date AT TIME ZONE 'Asia/Kuala_Lumpur')::date AND (end_date AT TIME ZONE 'Asia/Kuala_Lumpur')::date`
    );

    const employees = rows.map((employee) => {
      const matchingLeave = companyLeaves.find(cl => {
        if (cl.applies_to === 'all') return true;
        if (cl.applies_to === 'branch' && cl.branch_id) {
          return cl.branch_id.split(',').map(s => s.trim()).includes(employee.branch);
        }
        if (cl.applies_to === 'department' && cl.department_id) {
          const depts = cl.department_id.split(',').map(s => s.trim());
          const normEmpDept = (employee.department || '').toLowerCase().replace(/\bdepartment\b/g, '').trim();
          return depts.some(d => {
            const normClDept = d.toLowerCase().replace(/\bdepartment\b/g, '').trim();
            return normEmpDept === normClDept || employee.department === d;
          });
        }
        return false;
      });

      let todayStatus = "Absent";
      if (matchingLeave) {
        todayStatus = "Company Leave";
      } else if (employee.is_on_leave) {
        todayStatus = "On Leave";
      } else if (employee.today_clock_in) {
        todayStatus = employee.today_clock_out ? "Clocked Out" : "Present";
      }

      return {
        ...employee,
        today_status: todayStatus
      };
    });

    res.json({ success: true, employees });
  } catch (err) {
    console.error("Branch Employees Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===============================
// LEAVE ENTITLEMENT DATA
// ===============================
app.get("/api/leave-entitlements", async (req, res) => {
  const { branch, department, search, leaveType, year, status } = req.query;

  try {
    const params = [];
    const filters = ["p.status = 'Active'"];

    if (branch) {
      filters.push("p.branch = ?");
      params.push(branch);
    }

    if (department) {
      filters.push("p.department = ?");
      params.push(department);
    }

    if (search) {
      filters.push("(p.full_name ILIKE ? OR p.user_id ILIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
    }

    if (status) {
      filters.push("(CASE WHEN COALESCE(lr.pending_count, 0) > 0 THEN 'Pending' ELSE 'Active' END) = ?");
      params.push(status);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const [rows] = await pool.query(
      `
      SELECT
        p.user_id,
        p.full_name AS employee,
        p.branch,
        p.department,
        COALESCE(lr.annual_days_used, 0) AS annual_days_used,
        GREATEST(14 - COALESCE(lr.annual_days_used, 0), 0) AS balance,
        COALESCE(lr.pending_count, 0) AS pending,
        CASE
          WHEN COALESCE(lr.pending_count, 0) > 0 THEN 'Pending'
          ELSE 'Active'
        END AS status,
        'Annual Leave' AS leave_type,
        COALESCE(?, EXTRACT(YEAR FROM CURRENT_DATE)) AS year_value
      FROM profiles p
      LEFT JOIN (
        SELECT
          user_id,
          SUM(CASE WHEN leave_type IN ('Cuti Tahunan', 'Annual/Emergency Leave') AND status = 'Approved' THEN days ELSE 0 END) AS annual_days_used,
          SUM(CASE WHEN status LIKE 'Pending%' THEN 1 ELSE 0 END) AS pending_count
        FROM leave_requests
        GROUP BY user_id
      ) lr ON lr.user_id = p.user_id
      ${whereClause}
      ORDER BY p.full_name ASC
      `,
      [year || null, ...params]
    );

    const entitlements = rows.map((row) => ({
      ...row,
      balance: Number(row.balance || 0),
      pending: Number(row.pending || 0),
      annual_days_used: Number(row.annual_days_used || 0),
      year: Number(row.year_value || new Date().getFullYear())
    }));

    const summary = {
      totalEmployees: entitlements.length,
      carryForwardEligible: entitlements.filter((row) => row.balance > 0).length,
      pendingAdjustments: entitlements.filter((row) => row.status === "Pending").length,
      expiringSoon: entitlements.filter((row) => row.balance <= 4).length
    };

    res.json({ success: true, entitlements, summary });
  } catch (err) {
    console.error("Leave entitlements error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===============================
// LEAVE REQUESTS
// ===============================
app.get("/api/leave-requests", async (req, res) => {
  const userId = req.query.userId;
  const role = req.query.role ? req.query.role.toString().trim() : "";
  const branch = req.query.branch ? req.query.branch.toString().trim() : "";
  const date = req.query.date;

  try {
    const params = [];
    const filters = [];

    if (userId) {
      filters.push("lr.user_id = ?");
      params.push(userId);
    } else {
      if (role === "branch_leader" && branch) {
        filters.push("p.branch = ?");
        params.push(branch);
      } else if (role === "head_of_department" && req.query.department) {
        filters.push("p.department = ?");
        params.push(req.query.department);
      } else if (role === "head_of_department") {
        // Safety: HOD must have a department to see anything
        filters.push("1 = 0");
      } else if (!["hr_admin", "managing_director", "finance_manager"].includes(role) && branch) {
        filters.push("p.branch = ?");
        params.push(branch);
      }
    }

    if (date) {
      filters.push("DATE(lr.created_at AT TIME ZONE 'Asia/Kuala_Lumpur') = ?");
      params.push(date);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const [rows] = await pool.query(
      `
      SELECT
        lr.leave_id,
        lr.user_id,
        lr.leave_type,
        lr.start_date,
        lr.end_date,
        lr.days,
        lr.reason,
        lr.status,
        lr.approver_id,
        lr.approver_note,
        lr.waris_nama,
        lr.waris_phone,
        lr.waris_alamat,
        lr.waris_hubungan,
        lr.cuti_ganti_tarikh,
        lr.cuti_ganti_hari,
        lr.cuti_ganti_jam,
        lr.cuti_tanpa_gaji_phone,
        lr.cuti_tanpa_gaji_signature,
        lr.mc_file_url,
        lr.created_at,
        lr.updated_at,
        p.full_name,
        p.branch,
        p.department,
        COALESCE(ur_approver.role, '') AS approver_role,
        (
          SELECT json_agg(
            json_build_object(
              'id', la.id,
              'approver_id', la.approver_id,
              'approver_role', la.approver_role,
              'status', la.status,
              'remarks', la.remarks,
              'created_at', la.created_at,
              'approver_name', p2.full_name,
              'approver_department', p2.department,
              'approver_branch', p2.branch
            ) ORDER BY la.created_at ASC
          )
          FROM leave_approvals la
          LEFT JOIN profiles p2 ON p2.user_id = la.approver_id
          WHERE la.leave_id = lr.leave_id
        ) as approval_history
      FROM leave_requests lr
      JOIN profiles p ON p.user_id = lr.user_id
      LEFT JOIN user_role ur_approver ON ur_approver.user_id = lr.approver_id
      ${whereClause}
      ORDER BY lr.created_at DESC, lr.leave_id DESC
      `,
      params
    );

    res.json({ success: true, leaveRequests: rows });
  } catch (err) {
    console.error("Leave Requests Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/leave-requests", upload.single("lampiranMc"), async (req, res) => {
  const {
    user_id,
    leave_type,
    start_date,
    end_date,
    days,
    reason,
    waris_nama,
    waris_phone,
    waris_alamat,
    waris_hubungan,
    cuti_ganti_tarikh,
    cuti_ganti_hari,
    cuti_ganti_jam,
    cuti_tanpa_gaji_phone,
    cuti_tanpa_gaji_signature,
    no_kad_pengenalan
  } = req.body;

  if (!user_id || !leave_type || !start_date || !end_date || !days) {
    return res.status(400).json({
      success: false,
      error: "Missing required leave request fields",
    });
  }

  const signature_val = cuti_tanpa_gaji_signature === "true";
  
  try {
    const [empRows] = await pool.query("SELECT branch, department, full_name FROM profiles WHERE user_id = ?", [user_id]);
    const employeeBranch = empRows[0]?.branch || "HQ";
    const employeeDept = empRows[0]?.department || "";
    const employeeName = empRows[0]?.full_name || user_id;

    let mc_file_url = null;
    if (req.file) {
      try {
        // Sanitize employee name and branch to avoid invalid folder names
        const folderName = `${employeeName} (${employeeBranch})`.replace(/[\\/:*?"<>|]/g, "_").trim();
        const userUploadsDir = path.join(uploadsDir, folderName);
        
        // Ensure subdirectory exists
        if (!fs.existsSync(userUploadsDir)) {
          fs.mkdirSync(userUploadsDir, { recursive: true });
        }
        
        // Move file from temp to subdirectory
        const newFilePath = path.join(userUploadsDir, req.file.filename);
        fs.renameSync(req.file.path, newFilePath);
        
        // Store relative path URL
        mc_file_url = `/uploads/${folderName}/${req.file.filename}`;
        
        // Backup to Supabase with folder structure
        const supabaseStoragePath = `${folderName}/${req.file.filename}`;
        uploadToSupabaseStorage(newFilePath, supabaseStoragePath, req.file.mimetype);
      } catch (fileErr) {
        console.error("âŒ Error organizing file into subfolder:", fileErr);
        // Fallback: move to base uploadsDir
        const fallbackPath = path.join(uploadsDir, req.file.filename);
        try {
          fs.renameSync(req.file.path, fallbackPath);
          mc_file_url = `/uploads/${req.file.filename}`;
          uploadToSupabaseStorage(fallbackPath, req.file.filename, req.file.mimetype);
        } catch (fallbackErr) {
          console.error("âŒ Fallback move also failed:", fallbackErr);
        }
      }
    }
    
    const initialStatus = (leave_type === 'Cuti Sakit' || leave_type === 'Sick Leave') ? 'Approved' : 
                          (employeeBranch === 'HQ' 
                            ? 'Pending HOD' 
                            : 'Pending Branch Leader');

    const [result] = await pool.query(
      `
      INSERT INTO leave_requests
        (user_id, leave_type, start_date, end_date, days, reason, status, waris_nama, waris_phone, waris_alamat, waris_hubungan, cuti_ganti_tarikh, cuti_ganti_hari, cuti_ganti_jam, cuti_tanpa_gaji_phone, cuti_tanpa_gaji_signature, mc_file_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        user_id, leave_type, start_date, end_date, days, reason, initialStatus, waris_nama, waris_phone, waris_alamat, waris_hubungan, cuti_ganti_tarikh || null, cuti_ganti_hari || null, cuti_ganti_jam || null, cuti_tanpa_gaji_phone || null, signature_val, mc_file_url
      ]
    );

    const [rows] = await pool.query(
      `SELECT lr.*, p.full_name, p.branch FROM leave_requests lr JOIN profiles p ON p.user_id = lr.user_id WHERE lr.leave_id = ?`,
      [result.insertId]
    );

    // Save IC number to profile for auto-population on future leave requests
    if (no_kad_pengenalan && no_kad_pengenalan.toString().trim()) {
      try {
        await pool.query(
          `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ic_number VARCHAR(20)`
        );
        await pool.query(
          `UPDATE profiles SET ic_number = ? WHERE user_id = ? AND (ic_number IS NULL OR ic_number = '')`,
          [no_kad_pengenalan.toString().trim(), user_id]
        );
      } catch (icErr) {
        console.error("Warning: could not save ic_number to profile:", icErr);
      }
    }

    const leaveData = rows[0];

    res.status(201).json({ success: true, leaveRequest: leaveData });
    broadcastPresenceUpdate({ type: 'leave-status', leaveId: result.insertId, status: initialStatus, userId: user_id });
    
    // Generate and save the leave form PDF locally and on Supabase Storage
    generateAndSaveLeaveFormPDF(result.insertId);

    // --- SEND EMAIL NOTIFICATION TO HOD / BRANCH LEADER & HR ---
    if (initialStatus !== "Approved" && leaveData) {
      try {
        let approverEmail = "";
        let approverTitle = "HOD";
        let approverUserId = "";

        // Find approver
        if (initialStatus === "Pending Branch Leader") {
          const [blRows] = await pool.query(
            `SELECT p.email, p.user_id FROM profiles p JOIN user_role ur ON p.user_id = ur.user_id WHERE ur.role = 'branch_leader' AND p.branch = ? AND p.status = 'Active' LIMIT 1`,
            [leaveData.branch]
          );
          if (blRows.length > 0) {
            approverEmail = blRows[0].email;
            approverUserId = blRows[0].user_id;
            approverTitle = "Branch Leader";
          }
        } else {
          const [hodRows] = await pool.query(
            `SELECT p.email, p.user_id FROM profiles p JOIN user_role ur ON p.user_id = ur.user_id WHERE ur.role = 'head_of_department' AND p.department = ? AND p.branch = ? AND p.status = 'Active' LIMIT 1`,
            [employeeDept, employeeBranch]
          );
          if (hodRows.length > 0) {
            approverEmail = hodRows[0].email;
            approverUserId = hodRows[0].user_id;
          }
        }

        const subject = `New Leave Request Pending Approval: ${leaveData.full_name}`;
        const html = `
          <h2>New Leave Request Requires Your Approval</h2>
          <p><strong>Employee:</strong> ${leaveData.full_name}</p>
          <p><strong>Leave Type:</strong> ${leaveData.leave_type}</p>
          <p><strong>Dates:</strong> ${new Date(leaveData.start_date).toLocaleDateString()} to ${new Date(leaveData.end_date).toLocaleDateString()}</p>
          <p><strong>Total Days:</strong> ${leaveData.days}</p>
          <br/>
          <p>Please log in to the Employee Portal to review and approve/reject this request as <strong>${approverTitle}</strong>.</p>
        `;

        if (approverEmail) {
          sendNotificationEmail(approverEmail, subject, html).catch(err => {
            console.error("Failed to send HOD notification email:", err);
          });
        }

        if (approverUserId) {
          await pool.query(
            `INSERT INTO notifications (user_id, title, message, type, related_leave_id) VALUES (?, ?, ?, ?, ?)`,
            [approverUserId, `New Leave Request: ${leaveData.full_name}`, `${leaveData.full_name} has requested ${leaveData.days} days of ${leaveData.leave_type}.`, 'leave_approval', result.insertId]
          );
        }

        // Notify HR
        const [hrRows] = await pool.query(
          `SELECT p.email FROM profiles p JOIN user_role ur ON p.user_id = ur.user_id WHERE ur.role = 'hr_admin' AND p.status = 'Active' LIMIT 1`
        );
        if (hrRows.length > 0) {
          sendNotificationEmail(hrRows[0].email, `FYI - New Leave Application: ${leaveData.full_name}`, html).catch(err => {
            console.error("Failed to send HR notification email:", err);
          });
        }

      } catch (mailErr) {
        console.error("Error sending workflow emails/notifications:", mailErr);
      }
    }

  } catch (err) {
    console.error("Create Leave Request Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch("/api/leave-requests/:leaveId/status", async (req, res) => {
  const { leaveId } = req.params;
  const { status, approver_id, approver_note, remarks, action } = req.body;
  const role = req.body.role ? req.body.role.toString().trim() : "";

  // status can be 'Approved', 'Rejected', etc.
  // action can be 'Approve' or 'Reject'


  try {
    const [leaveRows] = await pool.query("SELECT status, user_id FROM leave_requests WHERE leave_id = ?", [leaveId]);
    if (leaveRows.length === 0) return res.status(404).json({ success: false, error: "Leave not found" });
    
    const currentStatus = leaveRows[0].status;
    const user_id = leaveRows[0].user_id;

    // --- SECURITY CHECK: HOD/Branch Leader must match Department/Branch ---
    if (approver_id && (role === "head_of_department" || role === "branch_leader")) {
      const [approverRows] = await pool.query(
        "SELECT branch, department FROM profiles WHERE user_id = ?",
        [approver_id]
      );
      const [employeeRows] = await pool.query(
        "SELECT branch, department FROM profiles WHERE user_id = ?",
        [user_id]
      );

      if (approverRows.length > 0 && employeeRows.length > 0) {
        const approverData = approverRows[0];
        const employeeData = employeeRows[0];

        if (role === "head_of_department") {
          if (approverData.department !== employeeData.department) {
            return res.status(403).json({ success: false, error: "Unauthorized: You can only approve requests from your own department." });
          }
        } else if (role === "branch_leader") {
          if (approverData.branch !== employeeData.branch) {
            return res.status(403).json({ success: false, error: "Unauthorized: You can only approve requests from your own branch." });
          }
        }
      }
    }
    let nextStatus = status; // Default to what frontend sent

    if (action === 'Reject') {
      nextStatus = 'Rejected';
    } else if (action === 'Approve') {
      if (currentStatus.startsWith('Pending HOD') || currentStatus === 'Pending Branch Leader') {
        nextStatus = 'Pending Finance';
      } else if (currentStatus === 'Pending Finance') {
        nextStatus = 'Pending MD';
      } else if (currentStatus === 'Pending MD') {
        nextStatus = 'Approved';
      }
    }

    await pool.query(
      `UPDATE leave_requests SET status = ?, approver_id = ?, approver_note = ? WHERE leave_id = ?`,
      [nextStatus, approver_id || null, remarks || approver_note || null, leaveId]
    );

    // Log to leave_approvals
    await pool.query(
      `INSERT INTO leave_approvals (leave_id, approver_id, approver_role, status, remarks) VALUES (?, ?, ?, ?, ?)`,
      [leaveId, approver_id, role, action === 'Approve' ? 'Approved' : 'Rejected', remarks || null]
    );

    res.json({ success: true, nextStatus });
    broadcastPresenceUpdate({ type: 'leave-status', leaveId, status: nextStatus, userId: user_id });

    // Re-generate and save the leave form PDF with the updated status
    generateAndSaveLeaveFormPDF(leaveId);

    // --- SEND EMAIL NOTIFICATION ON STATUS CHANGE ---
    try {
      const [fullLeaveRows] = await pool.query(
        `SELECT lr.*, p.full_name as employee_name, p.email as employee_email, p.branch 
         FROM leave_requests lr 
         JOIN profiles p ON p.user_id = lr.user_id 
         WHERE lr.leave_id = ?`,
        [leaveId]
      );

      if (fullLeaveRows.length > 0) {
        const leaveData = fullLeaveRows[0];
        let targetEmail = null;
        let targetUserId = null;
        let subject = "";
        let html = "";
        let notificationTitle = "";
        let notificationMessage = "";

        if (nextStatus === "Pending Finance") {
          const [fmRows] = await pool.query(`SELECT p.email, p.user_id FROM profiles p JOIN user_role ur ON p.user_id = ur.user_id WHERE ur.role = 'finance_manager' AND p.status = 'Active' LIMIT 1`);
          if (fmRows.length > 0) {
            targetEmail = fmRows[0].email;
            targetUserId = fmRows[0].user_id;
            subject = `Leave Request Pending Finance Approval: ${leaveData.employee_name}`;
            html = `<p>Approval stage complete for <strong>${leaveData.employee_name}</strong>. It is now pending your Finance review.</p>`;
            notificationTitle = `Leave Approval Required`;
            notificationMessage = `${leaveData.employee_name} requires your Finance approval for a leave request.`;
          }
        } else if (nextStatus === "Pending MD") {
          const [mdRows] = await pool.query(`SELECT p.email, p.user_id FROM profiles p JOIN user_role ur ON p.user_id = ur.user_id WHERE ur.role = 'managing_director' AND p.status = 'Active' LIMIT 1`);
          if (mdRows.length > 0) {
            targetEmail = mdRows[0].email;
            targetUserId = mdRows[0].user_id;
            subject = `Leave Request Pending MD Approval: ${leaveData.employee_name}`;
            html = `<p>Finance Manager has approved a leave request for <strong>${leaveData.employee_name}</strong>. It is now pending your final MD approval.</p>`;
            notificationTitle = `Leave Final Approval Required`;
            notificationMessage = `${leaveData.employee_name} requires your MD approval for a leave request.`;
          }
        } else if (nextStatus === "Approved" || nextStatus === "Rejected") {
          targetEmail = leaveData.employee_email;
          targetUserId = leaveData.user_id;
          subject = `Leave Request ${nextStatus}: ${leaveData.leave_type}`;
          html = `<p>Hello ${leaveData.employee_name},</p><p>Your leave request for <strong>${leaveData.leave_type}</strong> has been <strong>${nextStatus}</strong>.</p>`;
          notificationTitle = `Leave Request ${nextStatus}`;
          notificationMessage = `Your request for ${leaveData.leave_type} has been ${nextStatus.toLowerCase()}.`;

          // Notify HR
          const [hrRows] = await pool.query(
            `SELECT p.email, p.user_id FROM profiles p JOIN user_role ur ON p.user_id = ur.user_id WHERE ur.role = 'hr_admin' AND p.status = 'Active' LIMIT 1`
          );
          if (hrRows.length > 0) {
            sendNotificationEmail(hrRows[0].email, `Leave Request ${nextStatus}: ${leaveData.employee_name}`, `<p>The leave request for <strong>${leaveData.employee_name}</strong> has been <strong>${nextStatus}</strong>.</p>`).catch(console.error);
            pool.query(
              `INSERT INTO notifications (user_id, title, message, type, related_leave_id) VALUES (?, ?, ?, ?, ?)`,
              [hrRows[0].user_id, `Leave ${nextStatus}: ${leaveData.employee_name}`, `${leaveData.employee_name}'s request for ${leaveData.leave_type} is now ${nextStatus.toLowerCase()}.`, 'status_update', leaveId]
            ).catch(console.error);
          }
        }

        if (targetEmail && subject) {
          sendNotificationEmail(targetEmail, subject, html).catch(err => {
            console.error("Failed to send status update email asynchronously:", err);
          });
        }

        if (targetUserId && notificationTitle) {
          await pool.query(
            `INSERT INTO notifications (user_id, title, message, type, related_leave_id) VALUES (?, ?, ?, ?, ?)`,
            [targetUserId, notificationTitle, notificationMessage, 'status_update', leaveId]
          );
        }

        // Notify employee of intermediate status updates
        if (nextStatus === "Pending Finance" || nextStatus === "Pending MD") {
          await pool.query(
            `INSERT INTO notifications (user_id, title, message, type, related_leave_id) VALUES (?, ?, ?, ?, ?)`,
            [leaveData.user_id, `Leave Update: ${nextStatus}`, `Your leave request is now ${nextStatus}.`, 'status_update', leaveId]
          );
        }
      }
    } catch (mailErr) {
      console.error("Error sending status change email:", mailErr);
    }


  } catch (err) {
    console.error("Update Leave Request Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===============================
// NOTIFICATIONS
// ===============================

app.get("/api/notifications", async (req, res) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(400).json({ success: false, error: "user_id required" });

  try {
    // 1. Get user profile details
    const [profiles] = await pool.query(
      `SELECT branch, department FROM profiles WHERE user_id = ?`,
      [user_id]
    );
    const userProfile = profiles[0] || {};
    const userBranch = userProfile.branch || "";
    const userDept = userProfile.department || "";

    // 2. Fetch active company leaves
    const [leaves] = await pool.query(
      `SELECT * FROM company_leave_calendar WHERE status = 'Active' ORDER BY start_date DESC LIMIT 50`
    );

    // 3. Filter relevant company leaves
    const relevantLeaves = leaves.filter(cl => {
      if (cl.applies_to === 'all') return true;
      if (cl.applies_to === 'branch' && cl.branch_id) {
        return cl.branch_id.split(',').map(s => s.trim()).includes(userBranch);
      }
      if (cl.applies_to === 'department' && cl.department_id) {
        const depts = cl.department_id.split(',').map(s => s.trim());
        const normEmp = userDept.toLowerCase().replace(/\bdepartment\b/g, '').trim();
        return depts.some(d => {
          const normD = d.toLowerCase().replace(/\bdepartment\b/g, '').trim();
          return normEmp === normD || userDept === d;
        });
      }
      return false;
    });

    // 4. Map to notification-like objects in-memory
    const companyLeaveNotifs = relevantLeaves.map(cl => {
      const dateRange = cl.start_date === cl.end_date
        ? new Date(cl.start_date).toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' })
        : `${new Date(cl.start_date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })} – ${new Date(cl.end_date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}`;
      return {
        id: `cl-${cl.id}`,
        user_id: user_id,
        title: `🏢 Company Leave: ${cl.leave_name}`,
        message: `${cl.leave_type || 'Company Leave'} on ${dateRange}. This is a ${cl.is_paid ? 'paid' : 'unpaid'} leave day.`,
        type: 'company_leave',
        is_read: false,
        related_leave_id: cl.id,
        created_at: cl.created_at || cl.updated_at
      };
    });

    // 5. Fetch db notifications
    const [dbRows] = await pool.query(
      `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
      [user_id]
    );

    // 6. Combine and sort
    const combined = [...companyLeaveNotifs, ...dbRows].sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    res.json({ success: true, notifications: combined });
  } catch (err) {
    console.error("Fetch Notifications Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch("/api/notifications/:id/read", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(`UPDATE notifications SET is_read = TRUE WHERE id = ?`, [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("Mark Notification Read Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch("/api/notifications/read-all", async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ success: false, error: "user_id required" });
  try {
    await pool.query(`UPDATE notifications SET is_read = TRUE WHERE user_id = ?`, [user_id]);
    res.json({ success: true });
  } catch (err) {
    console.error("Mark All Notifications Read Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===============================

app.get("/api/employees/:userId/analytics", async (req, res) => {
  const { userId } = req.params;
  try {
    const [empRows] = await pool.query("SELECT * FROM profiles WHERE user_id = ?", [userId]);
    if (empRows.length === 0) return res.status(404).json({ success: false, error: "Employee not found" });
    const employee = empRows[0];

    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const currentYearStart = startOfYear(now);
    const currentYearEnd = endOfYear(now);

    const [companyLeaves] = await pool.query("SELECT * FROM company_leave_calendar WHERE status = 'Active' AND EXTRACT(YEAR FROM start_date) = ?", [now.getFullYear()]);
    const [allLeaves] = await pool.query("SELECT * FROM leave_requests WHERE user_id = ? AND EXTRACT(YEAR FROM start_date) = ?", [userId, now.getFullYear()]);
    const userLeaves = allLeaves.filter(l => l.status === 'Approved');

    const [attendances] = await pool.query("SELECT clock_in, clock_out FROM attendances WHERE user_id = ? AND EXTRACT(YEAR FROM clock_in) = ?", [userId, now.getFullYear()]);

    const monthEndToUse = isBefore(now, currentMonthEnd) ? now : currentMonthEnd;
    const yearEndToUse = now;

    const monthlyExpected = calculateExpectedWorkingDays(currentMonthStart, monthEndToUse, employee, companyLeaves, userLeaves, malaysiaHolidays);
    const yearlyExpected = calculateExpectedWorkingDays(currentYearStart, yearEndToUse, employee, companyLeaves, userLeaves, malaysiaHolidays);

    let monthlyPresent = 0;
    let monthlyLate = 0;
    let yearlyPresent = 0;
    let yearlyLate = 0;

    attendances.forEach(a => {
      const klTime = new Date(new Date(a.clock_in).getTime() + 8 * 60 * 60 * 1000);
      const d = klTime.toISOString().split('T')[0];
      const hh = klTime.getUTCHours();
      const mm = klTime.getUTCMinutes();
      const lateTimeStr = getLateThresholdTime ? getLateThresholdTime() : '09:00:00';
      const [lhStr, lmStr] = lateTimeStr.split(':');
      const lh = parseInt(lhStr);
      const lm = parseInt(lmStr);
      const isLate = hh > lh || (hh === lh && mm > lm);

      if (d.startsWith(now.toISOString().substring(0, 7))) {
        monthlyPresent++;
        if (isLate) monthlyLate++;
      }
      yearlyPresent++;
      if (isLate) yearlyLate++;
    });

    const monthlyAttendanceRate = monthlyExpected > 0 ? Math.round((monthlyPresent / monthlyExpected) * 100) : 0;
    const yearlyAttendanceRate = yearlyExpected > 0 ? Math.round((yearlyPresent / yearlyExpected) * 100) : 0;
    let monthlyAbsent = Math.max(0, monthlyExpected - monthlyPresent);
    let yearlyAbsent = Math.max(0, yearlyExpected - yearlyPresent);

    let annualTaken = 0, sickTaken = 0, unpaidTaken = 0, emergencyTaken = 0;
    userLeaves.forEach(l => {
      const days = parseInt(l.duration_days || 0);
      if (l.leave_type.toLowerCase().includes('annual')) annualTaken += days;
      else if (l.leave_type.toLowerCase().includes('medical') || l.leave_type.toLowerCase().includes('sick')) sickTaken += days;
      else if (l.leave_type.toLowerCase().includes('emergency')) emergencyTaken += days;
      else unpaidTaken += days;
    });

    let pendingLeaves = 0, rejectedLeaves = 0;
    allLeaves.forEach(l => {
        if (l.status === 'Pending') pendingLeaves++;
        if (l.status === 'Rejected') rejectedLeaves++;
    });

    const totalLeaveBalance = parseInt(employee.annual_leave_balance || 14) + parseInt(employee.medical_leave_balance || 14);
    const totalTaken = annualTaken + sickTaken + emergencyTaken + unpaidTaken;
    const remainingLeaveBalance = totalLeaveBalance - (annualTaken + sickTaken);
    const leaveUtilizationRate = totalLeaveBalance > 0 ? Math.round(((annualTaken + sickTaken) / totalLeaveBalance) * 100) : 0;

    res.json({
      success: true,
      analytics: {
        attendance: {
          monthly: { rate: Math.min(100, monthlyAttendanceRate), present: monthlyPresent, late: monthlyLate, absent: monthlyAbsent },
          yearly: { rate: Math.min(100, yearlyAttendanceRate), present: yearlyPresent, late: yearlyLate, absent: yearlyAbsent }
        },
        leave: {
          annual: { taken: annualTaken, balance: parseInt(employee.annual_leave_balance || 14) },
          sick: { taken: sickTaken, balance: parseInt(employee.medical_leave_balance || 14) },
          unpaid: { taken: unpaidTaken, balance: parseInt(employee.unpaid_leave_balance || 0) },
          emergency: { taken: emergencyTaken, balance: 0 },
          totalTaken,
          remaining: remainingLeaveBalance,
          utilizationRate: leaveUtilizationRate,
          pending: pendingLeaves,
          rejected: rejectedLeaves
        }
      }
    });
  } catch (err) {
    console.error("Analytics Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// EMPLOYEES
// ===============================
app.get("/api/employees", async (req, res) => {
  const { role, branch, date, status } = req.query;

  try {
    const params = [];
    const filters = [];

    if (role === "branch_leader" && branch) {
      filters.push("p.branch = ?");
      params.push(branch);
    } else if (role === "head_of_department" && req.query.department) {
      filters.push("p.department = ?");
      params.push(req.query.department);
    } else if (!["hr_admin", "managing_director", "finance_manager"].includes(role) && branch) {
      filters.push("p.branch = ?");
      params.push(branch);
    }

    if (status) {
      filters.push("p.status = ?");
      params.push(status);
    }

    const branchFilter = filters.length > 0 ? "WHERE " + filters.join(" AND ") : "";

    const [rows] = await pool.query(
      `
      SELECT
        p.user_id,
        p.full_name,
        p.email,
        p.branch,
        p.department,
        p.status,
        COALESCE(ur.role, 'employee') AS role,
        COALESCE(lr.pending_leaves, 0) AS pending_leaves,
        COALESCE(lr.approved_leaves, 0) AS approved_leaves,
        COALESCE(lr.rejected_leaves, 0) AS rejected_leaves,
        COALESCE(lr.total_leave_requests, 0) AS total_leave_requests,
        COALESCE(lr.mc_leaves, 0) AS mc_leaves,
        GREATEST(14 - COALESCE(lr.annual_days_used, 0), 0) AS annual_leave_balance,
        COALESCE(att.days_present, 0) AS days_present,
        ROUND((COALESCE(att.days_present, 0)::numeric / EXTRACT(DAY FROM CURRENT_DATE)) * 100) AS attendance_rate,
        COALESCE(leave_today.is_on_leave_today, 0) AS is_on_leave_today,
        today.clock_in AS today_clock_in,
        today.clock_out AS today_clock_out
      FROM profiles p
      LEFT JOIN user_role ur ON ur.user_id = p.user_id
      LEFT JOIN (
        SELECT
          user_id,
          SUM(CASE WHEN leave_type IN ('Cuti Tahunan', 'Annual/Emergency Leave', 'Cuti Sakit', 'Sick Leave') AND status = 'Approved' THEN days ELSE 0 END) AS annual_days_used,
          SUM(CASE WHEN status LIKE 'Pending%' THEN 1 ELSE 0 END) AS pending_leaves,
          SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) AS approved_leaves,
          SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) AS rejected_leaves,
          SUM(CASE WHEN leave_type IN ('Cuti Sakit', 'Sick Leave') THEN 1 ELSE 0 END) AS mc_leaves,
          COUNT(*) AS total_leave_requests
        FROM leave_requests
        GROUP BY user_id
      ) lr ON lr.user_id = p.user_id
      LEFT JOIN (
        SELECT
          user_id,
          COUNT(DISTINCT DATE(clock_in)) AS days_present
        FROM attendances
        WHERE EXTRACT(YEAR FROM clock_in) = EXTRACT(YEAR FROM ${date ? '?::date' : 'CURRENT_DATE' + '::date'})
        AND EXTRACT(MONTH FROM clock_in) = EXTRACT(MONTH FROM ${date ? '?::date' : 'CURRENT_DATE' + '::date'})
        GROUP BY user_id
      ) att ON att.user_id = p.user_id
      LEFT JOIN (
        SELECT a.user_id, a.clock_in, a.clock_out
        FROM attendances a
        INNER JOIN (
          SELECT user_id, MAX(attendance_id) AS latest_attendance_id
          FROM attendances
          WHERE DATE(clock_in AT TIME ZONE 'Asia/Kuala_Lumpur') = ${date ? '?::date' : 'CURRENT_DATE'}
          GROUP BY user_id
        ) latest ON latest.latest_attendance_id = a.attendance_id
      ) today ON today.user_id = p.user_id
      LEFT JOIN (
        SELECT user_id, 1 AS is_on_leave_today
        FROM leave_requests
        WHERE status = 'Approved' 
        AND ${date ? '?::date' : 'CURRENT_DATE'} BETWEEN DATE(start_date) AND DATE(end_date)
        GROUP BY user_id
      ) leave_today ON leave_today.user_id = p.user_id
      ${branchFilter}
      ORDER BY 
        CASE 
          WHEN ur.role = 'managing_director' THEN 1
          WHEN ur.role = 'finance_manager' THEN 2
          WHEN ur.role = 'hr_admin' THEN 3
          WHEN ur.role = 'head_of_department' THEN 4
          WHEN ur.role = 'branch_leader' THEN 5
          WHEN ur.role = 'branch_officer' THEN 6
          WHEN ur.role = 'employee' THEN 7
          ELSE 8
        END ASC,
        p.full_name ASC
      `,
      [...(date ? [date, date, date, date] : []), ...params]
    );

    const employees = rows.map((employee) => ({
      ...employee,
      today_status: employee.is_on_leave_today
        ? "On Leave"
        : employee.today_clock_in
          ? employee.today_clock_out
            ? "Clocked Out"
            : "Present"
          : "Absent",
    }));

    res.json({ success: true, employees });
  } catch (err) {
    console.error("Employees Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===============================
// UPDATE EMPLOYEE STATUS
// ===============================
app.post("/api/employees/status", async (req, res) => {
  const { user_id, status, changer_role } = req.body;

  if (!user_id || !status) {
    return res.status(400).json({ success: false, error: "Missing required fields: user_id or status" });
  }

  // Security check: Only hr_admin and managing_director can modify employee status
  if (changer_role !== "hr_admin" && changer_role !== "managing_director") {
    return res.status(403).json({ success: false, error: "Unauthorized: Only HR Admins or Managing Directors can change employee status." });
  }

  try {
    await pool.query(
      "UPDATE profiles SET status = ? WHERE user_id = ?",
      [status, user_id]
    );

    if (status === "Inactive") {
      await pool.query(
        "UPDATE user_role SET role = 'employee' WHERE user_id = ?",
        [user_id]
      );
      await pool.query(
        "UPDATE profiles SET role = 'employee' WHERE user_id = ?",
        [user_id]
      );
    }

    res.json({ success: true, message: `Employee status updated to ${status} successfully.` });
    broadcastPresenceUpdate({ type: 'employee-status-change', userId: user_id, status });
  } catch (err) {
    console.error("Update Employee Status Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===============================
// DEPARTMENT HOD TRANSFER
// ===============================
app.post("/api/departments/hod-transfer", async (req, res) => {
  const { departmentName, newHodUserId, changedByUserId, branch } = req.body;

  if (!departmentName || !newHodUserId || !changedByUserId) {
    return res.status(400).json({ success: false, error: "Missing required fields" });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Find the current HOD for this department and branch
    const [currentHodRows] = await connection.query(
      `SELECT ur.user_id 
       FROM user_role ur 
       JOIN profiles p ON p.user_id = ur.user_id 
       WHERE ur.role = 'head_of_department' 
       AND p.department = ? 
       AND p.branch = ?`,
      [departmentName, branch || 'HQ']
    );

    const previousHodId = currentHodRows.length > 0 ? currentHodRows[0].user_id : null;

    // 2. If there's an existing HOD, demote them to 'employee'
    if (previousHodId) {
      await connection.query(
        "UPDATE user_role SET role = 'employee' WHERE user_id = ?",
        [previousHodId]
      );
      await connection.query(
        "UPDATE profiles SET role = 'employee' WHERE user_id = ?",
        [previousHodId]
      );
    }

    // 3. Promote the new user to 'head_of_department'
    await connection.query(
      "UPDATE user_role SET role = 'head_of_department', department = ? WHERE user_id = ?",
      [departmentName, newHodUserId]
    );
    await connection.query(
      "UPDATE profiles SET role = 'head_of_department', department = ? WHERE user_id = ?",
      [departmentName, newHodUserId]
    );

    // 4. Log the transfer in hod_history
    await connection.query(
      `INSERT INTO hod_history (department, previous_hod_id, new_hod_id, changed_by_id) 
       VALUES (?, ?, ?, ?)`,
      [departmentName, previousHodId, newHodUserId, changedByUserId]
    );

    await connection.commit();
    res.json({ success: true, message: "HOD transferred successfully" });
  } catch (err) {
    await connection.rollback();
    console.error("HOD Transfer Error:", err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    connection.release();
  }
});

// ===============================
// LOGIN
// ===============================
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await pool.query(
      "SELECT * FROM profiles WHERE email = ?",
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, error: "User not found", message: "User not found" });
    }

    const user = rows[0];

    // Block login for Inactive users
    if (user.status && user.status.trim().toLowerCase() === 'inactive') {
      return res.status(403).json({ 
        success: false, 
        error: "Your account has been deactivated. Please contact HR.", 
        message: "Your account has been deactivated. Please contact HR." 
      });
    }

    let isMatch = false;
    if (typeof user.password === 'string' && (user.password.startsWith('$2a$') || user.password.startsWith('$2b$') || user.password.startsWith('$2y$'))) {
      isMatch = await bcrypt.compare(password, user.password);
    } else {
      // Fallback for legacy plain-text passwords while new signups are hashed
      isMatch = password === user.password;
    }

    if (!isMatch) {
      return res.status(401).json({ success: false, error: "Wrong password", message: "Wrong password" });
    }

    // get role
    const [roleRows] = await pool.query(
      "SELECT role FROM user_role WHERE user_id = ?",
      [user.user_id]
    );

    const role = roleRows[0]?.role || "employee";

    // create token
    if (!jwtSecret) {
      return res.status(500).json({
        success: false,
        error: "Missing JWT_SECRET backend environment variable",
        message: "Missing JWT_SECRET backend environment variable",
      });
    }

    const token = jwt.sign(
      {
        id: user.user_id,
        role: role
      },
      jwtSecret,
      { expiresIn: "1d" }
    );

    // Fetch additional profile fields needed by the frontend
    const [profileRows] = await pool.query(
      "SELECT full_name, email, branch, department, status FROM profiles WHERE user_id = ? LIMIT 1",
      [user.user_id]
    );
    const profile = profileRows[0] || {};

    res.json({
      success: true,
      token,
      user: {
        user_id: user.user_id,
        id: user.user_id,
        full_name: profile.full_name || user.full_name,
        name: profile.full_name || user.full_name,
        email: profile.email || user.email,
        branch: profile.branch,
        department: profile.department,
        status: profile.status,
        role: role
      }
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===============================
// USER DETAILS
// ===============================
app.get("/api/user-details/:identifier", async (req, res) => {
  const { identifier } = req.params;

  try {
    const [rows] = await pool.query(
      `
      SELECT
        p.user_id,
        p.full_name,
        p.email,
        p.status,
        p.branch,
        p.department,
        COALESCE(ur.role, 'employee') AS role
      FROM profiles p
      LEFT JOIN user_role ur ON ur.user_id = p.user_id
      WHERE p.user_id = ? OR p.email = ?
      LIMIT 1
      `,
      [identifier, identifier]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const user = rows[0];

    res.json({
      success: true,
      profile: {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        status: user.status,
        branch: user.branch,
        department: user.department,
      },
      role: user.role,
    });
  } catch (err) {
    console.error("User Details Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===============================
// ATTENDANCE STATUS
// ===============================
app.get("/api/attendance-status", async (req, res) => {
  const { empId } = req.query;
  if (!empId) {
    return res.status(400).json({ success: false, error: "Missing empId" });
  }
  try {
    const [empProfile] = await pool.query(
      `SELECT branch, department FROM profiles WHERE user_id = ?`,
      [empId]
    );

    const [leaveRows] = await pool.query(`
      SELECT status FROM leave_requests 
      WHERE user_id = ? AND status = 'Approved' AND (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kuala_Lumpur')::date BETWEEN (start_date AT TIME ZONE 'Asia/Kuala_Lumpur')::date AND (end_date AT TIME ZONE 'Asia/Kuala_Lumpur')::date
    `, [empId]);

    const isOnLeave = leaveRows.length > 0;

    const [rows] = await pool.query(`
      SELECT * FROM attendances
      WHERE user_id = ?
      AND DATE(clock_in) = CURRENT_DATE
      AND clock_out IS NULL
      ORDER BY clock_in DESC
      LIMIT 1
      `, [empId]);

    let attendanceStatus = {
      type: "NORMAL",
      name: null,
      attendanceRequired: true,
      clockInAllowed: true
    };

    if (empProfile.length > 0) {
      const p = empProfile[0];
      const [companyLeaveTodayRows] = await pool.query(
        `SELECT * FROM company_leave_calendar WHERE status = 'Active' AND (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kuala_Lumpur')::date BETWEEN (start_date AT TIME ZONE 'Asia/Kuala_Lumpur')::date AND (end_date AT TIME ZONE 'Asia/Kuala_Lumpur')::date`
      );

      const matchingLeave = companyLeaveTodayRows.find(cl => {
        if (cl.applies_to === 'all') return true;
        if (cl.applies_to === 'branch' && cl.branch_id) {
          return cl.branch_id.split(',').map(s => s.trim()).includes(p.branch);
        }
        if (cl.applies_to === 'department' && cl.department_id) {
          const depts = cl.department_id.split(',').map(s => s.trim());
          const normEmpDept = (p.department || '').toLowerCase().replace(/\bdepartment\b/g, '').trim();
          return depts.some(d => {
            const normClDept = d.toLowerCase().replace(/\bdepartment\b/g, '').trim();
            return normEmpDept === normClDept || p.department === d;
          });
        }
        return false;
      });

      if (matchingLeave) {
        attendanceStatus = {
          type: "COMPANY_LEAVE",
          name: matchingLeave.leave_name,
          attendanceRequired: false,
          clockInAllowed: false
        };
      } else if (isOnLeave) {
        attendanceStatus = {
          type: "APPROVED_LEAVE",
          name: "Approved Leave",
          attendanceRequired: false,
          clockInAllowed: true
        };
      }
    }

    res.json({
      success: true,
      active: rows.length > 0,
      record: rows[0] || null,
      isOnLeave: isOnLeave,
      attendanceStatus: attendanceStatus
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===============================
// CLOCK IN
// ===============================
app.post("/api/attendance", async (req, res) => {
  const { user_id } = req.body;

  if (!user_id) {
    return res
      .status(400)
      .json({ success: false, error: "Missing user_id" });
  }

  try {
    const [empProfile] = await pool.query(
      `SELECT branch, department FROM profiles WHERE user_id = ?`,
      [user_id]
    );

    if (empProfile.length > 0) {
      const p = empProfile[0];
      const [companyLeaveTodayRows] = await pool.query(
        `SELECT * FROM company_leave_calendar WHERE status = 'Active' AND (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kuala_Lumpur')::date BETWEEN (start_date AT TIME ZONE 'Asia/Kuala_Lumpur')::date AND (end_date AT TIME ZONE 'Asia/Kuala_Lumpur')::date`
      );

      const matchingLeave = companyLeaveTodayRows.find(cl => {
        if (cl.applies_to === 'all') return true;
        if (cl.applies_to === 'branch' && cl.branch_id) {
          return cl.branch_id.split(',').map(s => s.trim()).includes(p.branch);
        }
        if (cl.applies_to === 'department' && cl.department_id) {
          const depts = cl.department_id.split(',').map(s => s.trim());
          const normEmpDept = (p.department || '').toLowerCase().replace(/\bdepartment\b/g, '').trim();
          return depts.some(d => {
            const normClDept = d.toLowerCase().replace(/\bdepartment\b/g, '').trim();
            return normEmpDept === normClDept || p.department === d;
          });
        }
        return false;
      });

      if (matchingLeave) {
        return res.status(403).json({
          success: false,
          code: "COMPANY_LEAVE",
          message: "Today is designated as Company Leave. Attendance is not required."
        });
      }
    }

    const [result] = await pool.query(
      `INSERT INTO attendances (user_id, clock_in) VALUES (?, NOW())`,
      [user_id]
    );

    const insertedId = result.insertId;

    const [rows] = await pool.query(
      `SELECT * FROM attendances WHERE attendance_id = ?`,
      [insertedId]
    );

    res.json({ success: true, record: rows[0] });
    broadcastPresenceUpdate({ type: 'clock-in', userId: user_id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===============================
// CLOCK OUT
// ===============================
app.post("/api/clock-out", async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) {
    return res.status(400).json({ success: false, error: "Missing user_id" });
  }

  try {
    await pool.query(`
      UPDATE attendances
      SET clock_out = NOW()
      WHERE user_id = ?
      AND DATE(clock_in) = CURRENT_DATE
      AND clock_out IS NULL
      `,
      [user_id]
    );

    const [rows] = await pool.query(`
      SELECT * FROM attendances
      WHERE user_id = ?
      AND DATE(clock_in) = CURRENT_DATE
      ORDER BY clock_in DESC
      LIMIT 1
      `,
      [user_id]
    );

    res.json({ success: true, record: rows[0] });
    broadcastPresenceUpdate({ type: 'clock-out', userId: user_id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===============================
// PERSONAL ATTENDANCE HISTORY
// ===============================
app.get("/api/attendance/history", async (req, res) => {
  const { userId, month, year } = req.query;

  if (!userId) {
    return res.status(400).json({ success: false, error: "Missing userId" });
  }

  const isAllMonth = month === 'all';
  const requestedYear = parseInt(year) || new Date().getFullYear();

  try {
    // 1. Fetch user profile to check branch and department
    const [profileRows] = await pool.query(
      "SELECT branch, department FROM profiles WHERE user_id = ?",
      [userId]
    );
    if (profileRows.length === 0) {
      return res.status(404).json({ success: false, error: "User profile not found" });
    }
    const userProfile = profileRows[0];

    // 2. Fetch all attendance records for this user in requestedYear
    const [clockRows] = await pool.query(
      `SELECT 
        attendance_id,
        clock_in,
        clock_out,
        TO_CHAR(clock_in AT TIME ZONE 'Asia/Kuala_Lumpur', 'HH12:MI AM') AS time_in,
        TO_CHAR(clock_out AT TIME ZONE 'Asia/Kuala_Lumpur', 'HH12:MI AM') AS time_out,
        DATE(clock_in) AS date
      FROM attendances
      WHERE user_id = ?
      AND EXTRACT(YEAR FROM clock_in) = ?
      ORDER BY clock_in DESC`,
      [userId, requestedYear]
    );

    // 3. Fetch approved leaves for this user in requestedYear
    const [leaveRows] = await pool.query(
      `SELECT start_date, end_date, leave_type
      FROM leave_requests
      WHERE user_id = ? AND status = 'Approved'
      AND (
        EXTRACT(YEAR FROM start_date) = ?
        OR EXTRACT(YEAR FROM end_date) = ?
      )`,
      [userId, requestedYear, requestedYear]
    );

    // 4. Fetch active company leaves in requestedYear
    const [companyLeaves] = await pool.query(
      `SELECT start_date, end_date, leave_name, applies_to, branch_id, department_id
      FROM company_leave_calendar
      WHERE status = 'Active'
      AND (
        EXTRACT(YEAR FROM start_date) = ?
        OR EXTRACT(YEAR FROM end_date) = ?
      )`,
      [requestedYear, requestedYear]
    );

    // 5. Generate all relevant dates
    const klNow = new Date(Date.now() + 8 * 60 * 60 * 1000); // Current KL time
    const currentYear = klNow.getUTCFullYear();
    const currentMonth = klNow.getUTCMonth() + 1;
    const currentDay = klNow.getUTCDate();

    let startDate, endDate;
    if (isAllMonth) {
      // From Jan 1st of requestedYear to either Dec 31st (if past year) or today (if current year)
      startDate = new Date(Date.UTC(requestedYear, 0, 1));
      if (requestedYear < currentYear) {
        endDate = new Date(Date.UTC(requestedYear, 11, 31));
      } else if (requestedYear === currentYear) {
        endDate = new Date(Date.UTC(requestedYear, currentMonth - 1, currentDay));
        // Extend to include active Company Leave dates beyond today within this year
        const lastDayOfYear = new Date(Date.UTC(requestedYear, 11, 31));
        companyLeaves.forEach(cl => {
          const clEnd = new Date(cl.end_date);
          const clEndStr = clEnd.toISOString().split('T')[0];
          const clEndYear = parseInt(clEndStr.split('-')[0]);
          if (clEndYear === requestedYear) {
            const clEndUTC = new Date(Date.UTC(clEndYear, parseInt(clEndStr.split('-')[1]) - 1, parseInt(clEndStr.split('-')[2])));
            if (clEndUTC > endDate && clEndUTC <= lastDayOfYear) {
              endDate = clEndUTC;
            }
          }
        });
      } else {
        endDate = new Date(Date.UTC(requestedYear, 0, 1)); // Future year
      }
    } else {
      const requestedMonth = parseInt(month) || currentMonth;
      startDate = new Date(Date.UTC(requestedYear, requestedMonth - 1, 1));
      const lastDayOfMonth = new Date(Date.UTC(requestedYear, requestedMonth, 0));
      
      if (requestedYear < currentYear || (requestedYear === currentYear && requestedMonth < currentMonth)) {
        endDate = lastDayOfMonth; // Last day of month
      } else if (requestedYear === currentYear && requestedMonth === currentMonth) {
        endDate = new Date(Date.UTC(requestedYear, requestedMonth - 1, currentDay)); // Up to today

        // Extend endDate to cover any active Company Leave dates that fall within this month
        // (even if they are in the future), so they appear in month view
        companyLeaves.forEach(cl => {
          const clEnd = new Date(cl.end_date);
          const clEndStr = clEnd.toISOString().split('T')[0];
          const clEndYear = parseInt(clEndStr.split('-')[0]);
          const clEndMonth = parseInt(clEndStr.split('-')[1]);
          // Only extend within the same requested month
          if (clEndYear === requestedYear && clEndMonth === requestedMonth) {
            const clEndUTC = new Date(Date.UTC(clEndYear, clEndMonth - 1, parseInt(clEndStr.split('-')[2])));
            if (clEndUTC > endDate && clEndUTC <= lastDayOfMonth) {
              endDate = clEndUTC;
            }
          }
        });
      } else {
        endDate = null; // Future month (no company leave extension needed)
      }
    }

    const dateStrings = [];
    if (endDate) {
      let curr = new Date(startDate);
      while (curr <= endDate) {
        const yyyy = curr.getUTCFullYear();
        const mm = String(curr.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(curr.getUTCDate()).padStart(2, '0');
        dateStrings.push(`${yyyy}-${mm}-${dd}`);
        curr.setUTCDate(curr.getUTCDate() + 1);
      }
    }
    dateStrings.reverse();

    // Map clock records by date YYYY-MM-DD
    const clockMap = {};
    clockRows.forEach(r => {
      if (r.clock_in) {
        const dateObj = new Date(r.clock_in);
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const dateKey = `${yyyy}-${mm}-${dd}`;
        clockMap[dateKey] = r;
      }
    });

    const lateTimeStr = getLateThresholdTime();
    const [lateH, lateM] = lateTimeStr.split(':').map(Number);

    const formattedHistory = dateStrings.map(dateStr => {
      const clockRow = clockMap[dateStr];
      
      let status = "Absent";
      let time_in = "--";
      let time_out = "--";
      let late = "--";
      let duration = "--";
      let clock_in = null;
      let clock_out = null;
      let location_type = "office";
      let location_name = "Main Office, Floor 4";

      // Match company leave
      const matchingCompanyLeave = companyLeaves.find(cl => {
        const startStr = new Date(cl.start_date).toISOString().split('T')[0];
        const endStr = new Date(cl.end_date).toISOString().split('T')[0];
        if (dateStr < startStr || dateStr > endStr) return false;
        
        if (cl.applies_to === 'all') return true;
        if (cl.applies_to === 'branch' && cl.branch_id) {
          return cl.branch_id.split(',').map(s => s.trim()).includes(userProfile.branch);
        }
        if (cl.applies_to === 'department' && cl.department_id) {
          const depts = cl.department_id.split(',').map(s => s.trim());
          const normEmpDept = (userProfile.department || '').toLowerCase().replace(/\bdepartment\b/g, '').trim();
          return depts.some(d => {
            const normClDept = d.toLowerCase().replace(/\bdepartment\b/g, '').trim();
            return normEmpDept === normClDept || userProfile.department === d;
          });
        }
        return false;
      });

      // Match leave request
      const leaveRow = leaveRows.find(l => {
        const startStr = new Date(l.start_date).toISOString().split('T')[0];
        const endStr = new Date(l.end_date).toISOString().split('T')[0];
        return dateStr >= startStr && dateStr <= endStr;
      });

      // Match holiday
      const matchingHoliday = malaysiaHolidays.find(h => h.date === dateStr);

      // Match weekend
      const dateObj = new Date(dateStr);
      const dayOfWeek = dateObj.getDay();
      const dateNum = dateObj.getDate();
      const isWeekend = (dayOfWeek === 5) || (dayOfWeek === 6 && dateNum <= 7);

      if (matchingCompanyLeave) {
        status = "Company Leave";
      } else if (clockRow) {
        clock_in = clockRow.clock_in;
        clock_out = clockRow.clock_out;
        time_in = clockRow.time_in || "--";
        time_out = clockRow.time_out || "--";
        status = "Present";

        // Calculate late minutes
        const clockInDate = new Date(clock_in);
        const klTime = new Date(clockInDate.getTime() + 8 * 60 * 60 * 1000);
        const clockInHour = klTime.getUTCHours();
        const clockInMinute = klTime.getUTCMinutes();
        const isLate = clockInHour > lateH || (clockInHour === lateH && clockInMinute > lateM);

        if (isLate) {
          const clockInMins = clockInHour * 60 + clockInMinute;
          const thresholdMins = lateH * 60 + lateM;
          const diff = clockInMins - thresholdMins;
          late = `${diff} mins`;
        } else {
          late = "00:00";
        }

        // Calculate Working Hours = Time Out - Time In
        if (clock_out) {
          const clockOutDate = new Date(clock_out);
          const diffMs = clockOutDate.getTime() - clockInDate.getTime();
          const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
          const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          duration = `${diffHrs}h ${diffMins}m`;
        } else {
          duration = "--";
        }

        // Location mapping
        const isRemote = clockRow.attendance_id % 3 === 1;
        location_type = isRemote ? "remote" : "office";
        location_name = isRemote 
          ? "Home Office" 
          : (clockRow.attendance_id % 3 === 2 ? "Innovation Lab" : "Main Office, Floor 4");
      } else if (leaveRow) {
        status = "Leave";
      } else if (matchingHoliday) {
        status = "Holiday";
      } else if (isWeekend) {
        status = "Weekend";
      } else {
        status = "Absent";
      }

      return {
        attendance_id: clockRow ? clockRow.attendance_id : null,
        user_id: userId,
        clock_in: clock_in,
        clock_out: clock_out,
        time_in: time_in,
        time_out: time_out,
        date: dateStr,
        status: status,
        late: late,
        duration: duration,
        location_type: location_type,
        location_name: location_name
      };
    });

    res.json({ success: true, history: formattedHistory });
  } catch (err) {
    console.error("Error fetching personal attendance history:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===============================
// DASHBOARD STATS
// ===============================
app.get("/api/dashboard-stats", async (req, res) => {
  const userId = req.query.userId;
  let role = req.query.role ? req.query.role.toString().trim().toLowerCase() : "";
  if (role === 'hr' || role === 'hr admin') role = 'hr_admin';
  if (role === 'md' || role === 'managing director') role = 'managing_director';
  if (role === 'branch leader') role = 'branch_leader';
  if (role === 'finance manager') role = 'finance_manager';
  if (role === 'head of department' || role === 'hod') role = 'head_of_department';

  const branch = req.query.branch ? req.query.branch.toString().trim() : "";

  if (!userId) {
    return res.status(400).json({ success: false, error: "Missing userId" });
  }

  try {
    let adminStats = null;
    let globalRecentActivities = null;

    if (["hr_admin", "branch_leader", "managing_director", "finance_manager", "head_of_department"].includes(role)) {
      const isBranchLeader = role === "branch_leader";
      const isHOD = role === "head_of_department";
      const department = req.query.department;

      const queryParams = [];
      let profileFilter = "";
      let attendanceFilter = "AND user_id IN (SELECT user_id FROM profiles WHERE status = 'Active')";

      if (isBranchLeader) {
        const safeBranch = (branch && branch !== "All") ? branch : "INVALID_BYPASS";
        profileFilter = "AND branch = ?";
        attendanceFilter = "AND user_id IN (SELECT user_id FROM profiles WHERE branch = ? AND status = 'Active')";
        queryParams.push(safeBranch);
      } else if (isHOD) {
        const safeDept = (department && department !== "All") ? department : "INVALID_BYPASS";
        profileFilter = "AND department = ?";
        attendanceFilter = "AND user_id IN (SELECT user_id FROM profiles WHERE department = ? AND status = 'Active')";
        queryParams.push(safeDept);
      }

      const queryDate = req.query.date ? req.query.date.toString() : null;
      const dateCondition = queryDate ? '?' : 'CURRENT_DATE';
      const profileQueryParams = queryDate ? [queryDate, ...queryParams] : queryParams;

      const [employeeRows] = await pool.query(
        `SELECT COUNT(*) AS total_employees FROM profiles WHERE status = 'Active' AND DATE(created_at) <= ${dateCondition}::date ${profileFilter}`,
        profileQueryParams
      );

      const presentParams = queryDate ? [queryDate, queryDate, ...queryParams] : queryParams;
      const onLeaveParams = queryDate ? [queryDate, ...queryParams] : queryParams;

      const [presentRows] = await pool.query(
        `SELECT COUNT(DISTINCT user_id) AS present_today FROM attendances WHERE DATE(clock_in) = ${dateCondition} 
         AND NOT EXISTS (
           SELECT 1 FROM leave_requests lr 
           WHERE lr.user_id = attendances.user_id AND lr.status = 'Approved' 
           AND ${dateCondition} BETWEEN lr.start_date AND lr.end_date
         )
         ${attendanceFilter}`,
        presentParams
      );

      const [onLeaveRows] = await pool.query(
        `SELECT COUNT(DISTINCT user_id) AS on_leave FROM leave_requests WHERE status = 'Approved' AND ${dateCondition} BETWEEN DATE(start_date) AND DATE(end_date) ${attendanceFilter}`,
        onLeaveParams
      );

      const lateTimeStr = getLateThresholdTime();
      const [lateRows] = await pool.query(
        `SELECT COUNT(DISTINCT user_id) AS late_arrivals FROM attendances WHERE DATE(clock_in) = ${dateCondition} AND (clock_in AT TIME ZONE 'Asia/Kuala_Lumpur')::time > '${lateTimeStr}' 
         AND NOT EXISTS (
           SELECT 1 FROM leave_requests lr 
           WHERE lr.user_id = attendances.user_id AND lr.status = 'Approved' 
           AND ${dateCondition} BETWEEN lr.start_date AND lr.end_date
         )
         ${attendanceFilter}`,
        presentParams
      );

      let statusToCount = "Pending%";
      if (role === "head_of_department") {
        statusToCount = "Pending HOD%";
      } else if (role === "branch_leader") {
        statusToCount = "Pending Branch Leader";
      } else if (role === "finance_manager") {
        statusToCount = "Pending Finance";
      } else if (role === "managing_director") {
        statusToCount = "Pending MD";
      }

      const [pendingRows] = await pool.query(
        `SELECT COUNT(*) AS pending_approvals FROM leave_requests WHERE status LIKE ? ${attendanceFilter}`,
        [statusToCount, ...queryParams]
      );

      const [recentRows] = await pool.query(
        `
        SELECT p.full_name AS name, 'Leave' AS action, CONCAT('Leave ', lr.status) AS status, TO_CHAR(lr.created_at, 'HH12:MI AM') AS time
        FROM leave_requests lr
        JOIN profiles p ON p.user_id = lr.user_id
        ${profileFilter ? "WHERE 1=1 " + profileFilter : ""}
        ORDER BY lr.created_at DESC LIMIT 5
        `,
        queryParams
      );

      const [companyLeaveDays] = await pool.query(
        `SELECT * FROM company_leave_calendar WHERE status = 'Active' AND (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kuala_Lumpur')::date BETWEEN (start_date AT TIME ZONE 'Asia/Kuala_Lumpur')::date AND (end_date AT TIME ZONE 'Asia/Kuala_Lumpur')::date`
      );

      const [upcomingCompanyLeaveRows] = await pool.query(
        `SELECT * FROM company_leave_calendar WHERE status = 'Active' AND DATE(end_date) >= CURRENT_DATE ORDER BY start_date ASC LIMIT 1`
      );

      const [allActiveProfiles] = await pool.query(
        `SELECT user_id, branch, department FROM profiles WHERE status = 'Active' AND DATE(created_at) <= ${dateCondition}::date ${profileFilter}`,
        profileQueryParams
      );

      const [clockedInRows] = await pool.query(
        `SELECT DISTINCT user_id FROM attendances WHERE DATE(clock_in) = ${dateCondition} ${attendanceFilter}`,
        presentParams
      );
      const clockedInSet = new Set(clockedInRows.map(r => r.user_id));

      const [personalLeaveRows] = await pool.query(
        `SELECT DISTINCT user_id FROM leave_requests WHERE status = 'Approved' AND ${dateCondition} BETWEEN DATE(start_date) AND DATE(end_date) ${attendanceFilter}`,
        onLeaveParams
      );
      const personalLeaveSet = new Set(personalLeaveRows.map(r => r.user_id));

      let companyLeaveCount = 0;
      allActiveProfiles.forEach(p => {
        const uid = p.user_id;
        if (!clockedInSet.has(uid) && !personalLeaveSet.has(uid)) {
          const matchesCompanyLeave = companyLeaveDays.some(cl => {
            if (cl.applies_to === 'all') return true;
            if (cl.applies_to === 'branch' && cl.branch_id) {
              return cl.branch_id.split(',').map(s => s.trim()).includes(p.branch);
            }
            if (cl.applies_to === 'department' && cl.department_id) {
              const depts = cl.department_id.split(',').map(s => s.trim());
              const normEmpDept = (p.department || '').toLowerCase().replace(/\bdepartment\b/g, '').trim();
              return depts.some(d => {
                const normClDept = d.toLowerCase().replace(/\bdepartment\b/g, '').trim();
                return normEmpDept === normClDept || p.department === d;
              });
            }
            return false;
          });
          if (matchesCompanyLeave) {
            companyLeaveCount++;
          }
        }
      });

      adminStats = {
        totalEmployees: parseInt(employeeRows[0].total_employees || 0),
        presentToday: parseInt(presentRows[0].present_today || 0),
        onLeave: parseInt(onLeaveRows[0].on_leave || 0),
        lateArrivals: parseInt(lateRows[0].late_arrivals || 0),
        pendingApprovals: parseInt(pendingRows[0].pending_approvals || 0),
        companyLeave: companyLeaveCount,
        activeCompanyLeave: upcomingCompanyLeaveRows.length > 0 ? upcomingCompanyLeaveRows[0] : null,
      };
      globalRecentActivities = recentRows;
    }

    // 1. TODAY ATTENDANCE STATUS
    const [todayRows] = await pool.query(
      `
      SELECT clock_in, clock_out, TO_CHAR(clock_in AT TIME ZONE 'Asia/Kuala_Lumpur', 'HH12:MI AM') AS clock_in_time, TO_CHAR(clock_out AT TIME ZONE 'Asia/Kuala_Lumpur', 'HH12:MI AM') AS clock_out_time
      FROM attendances WHERE user_id = ? AND DATE(clock_in) = CURRENT_DATE ORDER BY clock_in DESC LIMIT 1
      `,
      [userId]
    );

    let todayStatus = "Absent";
    let clockInTime = "--:--";
    let clockOutTime = "--:--";
    let todayStatusTime = "--:--";

    if (todayRows.length > 0) {
      const record = todayRows[0];
      clockInTime = record.clock_in_time || "--:--";
      
      let isLate = false;
      if (record.clock_in) {
        const lateTimeStr = getLateThresholdTime();
        const [lateH, lateM] = lateTimeStr.split(':').map(Number);
        const klTimeIn = new Date(new Date(record.clock_in).getTime() + 8 * 60 * 60 * 1000);
        const clockInHour = klTimeIn.getUTCHours();
        const clockInMinute = klTimeIn.getUTCMinutes();
        isLate = clockInHour > lateH || (clockInHour === lateH && clockInMinute > lateM);
      }

      if (record.clock_in && record.clock_out === null) {
        todayStatus = isLate ? "Present (Late)" : "Present (On Time)";
        todayStatusTime = clockInTime;
      } else if (record.clock_out) {
        // Evaluate work hours for early clock out
        let isEarly = false;
        const diffMs = new Date(record.clock_out).getTime() - new Date(record.clock_in).getTime();
        const workHrsNum = diffMs / (1000 * 60 * 60);
        if (workHrsNum < 8.0) isEarly = true;

        todayStatus = isEarly ? "Clocked Out Early" : "Clocked Out";
        clockOutTime = record.clock_out_time || "--:--";
        todayStatusTime = clockOutTime;
      }
    }

    // OVERRIDE IF ON LEAVE TODAY
    const [onLeaveTodayRows] = await pool.query(
      `SELECT status FROM leave_requests WHERE user_id = ? AND status = 'Approved' AND (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kuala_Lumpur')::date BETWEEN (start_date AT TIME ZONE 'Asia/Kuala_Lumpur')::date AND (end_date AT TIME ZONE 'Asia/Kuala_Lumpur')::date`,
      [userId]
    );

    if (onLeaveTodayRows.length > 0) {
      todayStatus = "On Leave";
      todayStatusTime = "--:--";
    }

    // OVERRIDE IF COMPANY LEAVE TODAY (Highest priority)
    const [empProfile] = await pool.query(
      `SELECT branch, department FROM profiles WHERE user_id = ?`,
      [userId]
    );
    let companyLeaveCountCurrentMonth = 0;
    let isAllStaffCompanyLeaveToday = false;
    
    if (empProfile.length > 0) {
      const p = empProfile[0];
      const [companyLeaveTodayRows] = await pool.query(
        `SELECT * FROM company_leave_calendar WHERE status = 'Active' AND (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kuala_Lumpur')::date BETWEEN (start_date AT TIME ZONE 'Asia/Kuala_Lumpur')::date AND (end_date AT TIME ZONE 'Asia/Kuala_Lumpur')::date`
      );
      const matchingLeave = companyLeaveTodayRows.find(cl => {
        if (cl.applies_to === 'all') return true;
        if (cl.applies_to === 'branch' && cl.branch_id) {
          return cl.branch_id.split(',').map(s => s.trim()).includes(p.branch);
        }
        if (cl.applies_to === 'department' && cl.department_id) {
          const depts = cl.department_id.split(',').map(s => s.trim());
          const normEmpDept = (p.department || '').toLowerCase().replace(/\bdepartment\b/g, '').trim();
          return depts.some(d => {
            const normClDept = d.toLowerCase().replace(/\bdepartment\b/g, '').trim();
            return normEmpDept === normClDept || p.department === d;
          });
        }
        return false;
      });
      if (matchingLeave) {
        todayStatus = "Company Leave";
        todayStatusTime = "--:--";
        if (matchingLeave.applies_to === 'all') {
          isAllStaffCompanyLeaveToday = true;
        }
      }

      // Count Company Leaves in the current month up to today
      const [coLeaves] = await pool.query(
        `SELECT start_date, end_date, applies_to, branch_id, department_id 
         FROM company_leave_calendar 
         WHERE status = 'Active' 
         AND (
           ((start_date AT TIME ZONE 'Asia/Kuala_Lumpur')::date BETWEEN DATE_TRUNC('month', (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kuala_Lumpur')::date) AND (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kuala_Lumpur')::date)
           OR ((end_date AT TIME ZONE 'Asia/Kuala_Lumpur')::date BETWEEN DATE_TRUNC('month', (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kuala_Lumpur')::date) AND (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kuala_Lumpur')::date)
           OR (DATE_TRUNC('month', (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kuala_Lumpur')::date) BETWEEN (start_date AT TIME ZONE 'Asia/Kuala_Lumpur')::date AND (end_date AT TIME ZONE 'Asia/Kuala_Lumpur')::date)
         )`
      );

      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth(); // 0-indexed
      const todayDay = new Date().getDate();

      for (let d = 1; d <= todayDay; d++) {
        const checkDate = new Date(currentYear, currentMonth, d);
        const checkYear = checkDate.getFullYear();
        const checkMonth = String(checkDate.getMonth() + 1).padStart(2, '0');
        const checkDay = String(checkDate.getDate()).padStart(2, '0');
        const checkDateStr = `${checkYear}-${checkMonth}-${checkDay}`;

        const isCoLeave = coLeaves.some(cl => {
          const start = new Date(cl.start_date);
          const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
          const end = new Date(cl.end_date);
          const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
          
          if (checkDateStr >= startStr && checkDateStr <= endStr) {
            if (cl.applies_to === 'all') return true;
            if (cl.applies_to === 'branch' && cl.branch_id) {
              return cl.branch_id.split(',').map(s => s.trim()).includes(p.branch);
            }
            if (cl.applies_to === 'department' && cl.department_id) {
              const depts = cl.department_id.split(',').map(s => s.trim());
              const normEmpDept = (p.department || '').toLowerCase().replace(/\bdepartment\b/g, '').trim();
              return depts.some(d => {
                const normClDept = d.toLowerCase().replace(/\bdepartment\b/g, '').trim();
                return normEmpDept === normClDept || p.department === d;
              });
            }
          }
          return false;
        });

        if (isCoLeave) {
          companyLeaveCountCurrentMonth++;
        }
      }
    }

    // 2. MONTHLY ATTENDANCE RATE
    const [monthlyRows] = await pool.query(
      `SELECT COUNT(DISTINCT DATE(clock_in)) AS days_present FROM attendances WHERE user_id = ? AND EXTRACT(YEAR FROM clock_in) = EXTRACT(YEAR FROM CURRENT_DATE) AND EXTRACT(MONTH FROM clock_in) = EXTRACT(MONTH FROM CURRENT_DATE)`,
      [userId]
    );

    const daysPresent = parseInt(monthlyRows[0].days_present || 0);
    const [todayDayRows] = await pool.query(`SELECT EXTRACT(DAY FROM CURRENT_DATE) AS today_day`);
    const totalDays = parseInt(todayDayRows[0].today_day || 1);
    const totalDaysExcludingCoLeave = Math.max(totalDays - companyLeaveCountCurrentMonth, 1);
    const attendanceRate = totalDaysExcludingCoLeave > 0 ? Math.round((daysPresent / totalDaysExcludingCoLeave) * 100) : 0;

    // 3. PENDING LEAVES & LEAVE BALANCE
    const [leaveRows] = await pool.query(
      `SELECT SUM(days) AS used_days FROM leave_requests 
       WHERE user_id = ? 
       AND status != 'Rejected' 
       AND leave_type IN ('Cuti Tahunan', 'Annual/Emergency Leave', 'Cuti Sakit', 'Sick Leave', 'Kecemasan', 'Emergency')`,
      [userId]
    );
    const quotaLeavesUsed = parseFloat(leaveRows[0].used_days || 0);
    const leaveBalance = Math.max(14 - quotaLeavesUsed, 0);

    const [pendingRows] = await pool.query(
      `SELECT COUNT(*) AS pending FROM leave_requests WHERE user_id = ? AND status LIKE 'Pending%'`,
      [userId]
    );
    const pendingLeaves = parseInt(pendingRows[0].pending || 0);

    // 4. RECENT ACTIVITIES — Role-scoped Activity Intelligence Feed
    // ── Layer 1: MY ACTIVITY (all roles) ────────────────────────────────────
    const [myAttendanceRows] = await pool.query(
      `WITH acts AS (
        SELECT 'attendance' AS type,
          'You' AS actor,
          'Clocked In' AS action,
          NULL AS target,
          NULL AS context,
          TO_CHAR(clock_in AT TIME ZONE 'Asia/Kuala_Lumpur', 'HH12:MI AM') AS time,
          clock_in AS sort_time,
          'Present' AS badge
        FROM attendances
        WHERE user_id = ? AND clock_in IS NOT NULL
          AND DATE(clock_in AT TIME ZONE 'Asia/Kuala_Lumpur') = CURRENT_DATE
        UNION ALL
        SELECT 'attendance', 'You', 'Clocked Out', NULL, NULL,
          TO_CHAR(clock_out AT TIME ZONE 'Asia/Kuala_Lumpur', 'HH12:MI AM'),
          clock_out, 'Clocked Out'
        FROM attendances
        WHERE user_id = ? AND clock_out IS NOT NULL
          AND DATE(clock_out AT TIME ZONE 'Asia/Kuala_Lumpur') = CURRENT_DATE
        UNION ALL
        SELECT 'leave', 'You',
          CASE lr.status
            WHEN 'Approved' THEN 'Leave request approved'
            WHEN 'Rejected' THEN 'Leave request rejected'
            ELSE 'Submitted leave request'
          END,
          NULL,
          CONCAT(lr.leave_type, ' • ', TO_CHAR(lr.start_date, 'DD Mon'), ' – ', TO_CHAR(lr.end_date, 'DD Mon')),
          TO_CHAR(lr.updated_at AT TIME ZONE 'Asia/Kuala_Lumpur', 'HH12:MI AM'),
          lr.updated_at,
          lr.status
        FROM leave_requests lr
        WHERE lr.user_id = ?
          AND lr.updated_at >= NOW() - INTERVAL '7 days'
        UNION ALL
        SELECT
          CASE WHEN type = 'reminder' THEN 'note' ELSE 'note' END,
          'You',
          CASE WHEN type = 'reminder' THEN 'Added a reminder' ELSE 'Added a note' END,
          NULL, NULL,
          TO_CHAR(created_at AT TIME ZONE 'Asia/Kuala_Lumpur', 'HH12:MI AM'),
          created_at,
          CASE WHEN type = 'reminder' THEN 'Reminder' ELSE 'Note' END
        FROM personal_notes WHERE user_id = ?
          AND DATE(created_at AT TIME ZONE 'Asia/Kuala_Lumpur') = CURRENT_DATE
      )
      SELECT type, actor, action, target, context, time, badge FROM acts
      ORDER BY sort_time DESC LIMIT 10`,
      [userId, userId, userId, userId]
    );

    // ── Layer 2: TEAM ACTIVITY (branch_leader, hod, hr_admin, md, finance_manager) ─
    let teamActivityRows = [];
    const isElevatedRole = ["hr_admin", "branch_leader", "managing_director", "finance_manager", "head_of_department"].includes(role);

    if (isElevatedRole) {
      const department = req.query.department ? req.query.department.toString().trim() : "";
      let teamFilter = "";
      let teamParams = [];

      if (role === "branch_leader" && branch) {
        teamFilter = "AND p.branch = ?";
        teamParams = [branch];
      } else if (role === "head_of_department" && department) {
        teamFilter = "AND p.department = ?";
        teamParams = [department];
      }
      // hr_admin, managing_director, finance_manager see all — no filter

      const [teamRows] = await pool.query(
        `WITH team_acts AS (
          -- Late arrivals today
          SELECT 'attendance' AS type,
            p.full_name AS actor,
            'Clocked in late' AS action,
            NULL AS target,
            CONCAT(COALESCE(p.department, ''), ' • ', p.branch) AS context,
            TO_CHAR(a.clock_in AT TIME ZONE 'Asia/Kuala_Lumpur', 'HH12:MI AM') AS time,
            a.clock_in AS sort_time,
            'Late' AS badge
          FROM attendances a
          JOIN profiles p ON p.user_id = a.user_id
          WHERE DATE(a.clock_in AT TIME ZONE 'Asia/Kuala_Lumpur') = CURRENT_DATE
            AND (a.clock_in AT TIME ZONE 'Asia/Kuala_Lumpur')::time > '${getLateThresholdTime()}'
            AND p.status = 'Active' ${teamFilter}

          UNION ALL

          -- Leave approvals last 7 days
          SELECT 'approval', approver.full_name,
            CASE lr.status
              WHEN 'Approved' THEN 'Approved leave request'
              WHEN 'Rejected' THEN 'Rejected leave request'
              WHEN 'Pending HOD Approval' THEN 'Forwarded leave to HOD'
              WHEN 'Pending Finance Approval' THEN 'Forwarded leave to Finance'
              WHEN 'Pending MD Approval' THEN 'Forwarded leave to MD'
              ELSE CONCAT('Updated leave: ', lr.status)
            END,
            emp.full_name,
            CONCAT(lr.leave_type, ' • ', TO_CHAR(lr.start_date, 'DD Mon'), ' – ', TO_CHAR(lr.end_date, 'DD Mon')),
            TO_CHAR(lr.updated_at AT TIME ZONE 'Asia/Kuala_Lumpur', 'HH12:MI AM'),
            lr.updated_at,
            lr.status
          FROM leave_requests lr
          JOIN profiles emp ON emp.user_id = lr.user_id
          LEFT JOIN profiles approver ON approver.user_id = lr.approver_id
          WHERE lr.updated_at >= NOW() - INTERVAL '7 days'
            AND emp.status = 'Active' ${teamFilter.replace(/p\./g, 'emp.')}
        )
        SELECT type, actor, action, target, context, time, badge FROM team_acts
        ORDER BY sort_time DESC LIMIT 10`,
        [...teamParams, ...teamParams]
      );
      teamActivityRows = teamRows;
    }

    // ── Layer 3: SYSTEM ACTIVITY (hr_admin, managing_director, finance_manager; hod limited) ─
    let systemActivityRows = [];
    const canSeeSystem = ["hr_admin", "managing_director", "finance_manager", "head_of_department"].includes(role);

    if (canSeeSystem) {
      const department = req.query.department ? req.query.department.toString().trim() : "";
      let sysFilter = "";
      let sysParams = [];

      if (role === "head_of_department" && department) {
        // HOD sees only company leaves affecting their dept
        sysFilter = "AND (cl.applies_to = 'all' OR (cl.applies_to = 'department' AND cl.department_id ILIKE ?))";
        sysParams = [`%${department}%`];
      }

      const [sysRows] = await pool.query(
        `SELECT 'system' AS type,
          'System' AS actor,
          CASE
            WHEN cl.status = 'Active' THEN 'Activated Company Leave'
            ELSE 'Deactivated Company Leave'
          END AS action,
          cl.leave_name AS target,
          CONCAT('Applies to: ', cl.applies_to,
            CASE WHEN cl.applies_to = 'branch' THEN CONCAT(' (', cl.branch_id, ')') ELSE '' END,
            CASE WHEN cl.applies_to = 'department' THEN CONCAT(' (', cl.department_id, ')') ELSE '' END
          ) AS context,
          TO_CHAR(cl.updated_at AT TIME ZONE 'Asia/Kuala_Lumpur', 'HH12:MI AM') AS time,
          TO_CHAR(cl.updated_at, 'DD Mon YYYY') AS date,
          cl.status AS badge
        FROM company_leave_calendar cl
        WHERE cl.updated_at >= NOW() - INTERVAL '30 days'
          ${sysFilter}
        ORDER BY cl.updated_at DESC LIMIT 10`,
        sysParams
      );
      systemActivityRows = sysRows;
    }

    res.json({
      success: true,
      stats: {
        leaveBalance,
        pendingLeaves,
        todayStatus,
        clockInTime,
        clockOutTime,
        todayStatusTime,
        attendanceRate,
        ...(adminStats || {}),
        presentToday: adminStats ? adminStats.presentToday : 0
      },
      recentActivities: myAttendanceRows,
      activityFeed: {
        my: myAttendanceRows,
        team: teamActivityRows,
        system: systemActivityRows,
      },
    });
  } catch (error) {
    console.error("Dashboard Stats Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===============================
// ABSENT EMPLOYEES REPORT
// ===============================
app.get("/api/reports/absent-employees", async (req, res) => {
  let { date, role, branch, department } = req.query;
  const queryDate = date ? date : new Date().toISOString().split('T')[0];

  try {
    let profileFilter = "";
    let queryParams = [queryDate, queryDate, queryDate, queryDate];

    if (role === 'branch_leader') {
      const safeBranch = (branch && branch !== "All") ? branch : "INVALID_BYPASS";
      branch = safeBranch;
      profileFilter = " AND p.branch = ?";
      queryParams.push(branch);
    } else if (role === 'head_of_department') {
      const safeDept = (department && department !== "All") ? department : "INVALID_BYPASS";
      department = safeDept;
      profileFilter = " AND p.department = ?";
      queryParams.push(department);
    }

    const [rows] = await pool.query(
      `
      SELECT 
        p.user_id,
        p.full_name,
        p.branch,
        p.department,
        COALESCE(ur.role, 'employee') AS role
      FROM profiles p
      LEFT JOIN user_role ur ON ur.user_id = p.user_id
      WHERE p.status = 'Active'
      AND DATE(p.created_at) <= ?::date
      -- 1. No attendance record today
      AND NOT EXISTS (
        SELECT 1 FROM attendances a 
        WHERE a.user_id = p.user_id 
        AND DATE(a.clock_in AT TIME ZONE 'Asia/Kuala_Lumpur') = ?::date
      )
      -- 2. Not on approved leave today
      AND NOT EXISTS (
        SELECT 1 FROM leave_requests lr 
        WHERE lr.user_id = p.user_id AND lr.status = 'Approved' 
        AND ?::date BETWEEN lr.start_date AND lr.end_date
      )
      -- 3. Not on company holiday today
      AND NOT EXISTS (
        SELECT 1 FROM company_leave_calendar cl
        WHERE cl.status = 'Active'
        AND ?::date BETWEEN cl.start_date AND cl.end_date
        AND (
          cl.applies_to = 'all'
          OR (cl.applies_to = 'branch' AND p.branch = ANY(string_to_array(cl.branch_id, ',')))
          OR (
            cl.applies_to = 'department' 
            AND EXISTS (
              SELECT 1 FROM unnest(string_to_array(cl.department_id, ',')) AS d
              WHERE d = p.department 
                 OR LOWER(TRIM(REPLACE(LOWER(p.department), 'department', ''))) = LOWER(TRIM(REPLACE(LOWER(d), 'department', '')))
            )
          )
        )
      )
      ${profileFilter}
      ORDER BY p.full_name ASC
      `,
      queryParams
    );

    res.json({ success: true, report: rows });
  } catch (err) {
    console.error("Absent Employees Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===============================
// DAILY ATTENDANCE REPORT
// ===============================
app.get("/api/reports/daily-attendance", async (req, res) => {
  let { date, role, branch, department } = req.query;
  const queryDate = date ? date.toString() : new Date().toISOString().split('T')[0];

  try {
    let profileFilter = "";
    let queryParams = [];

    if (role === 'branch_leader') {
      const safeBranch = (branch && branch !== "All") ? branch : "INVALID_BYPASS";
      branch = safeBranch;
      profileFilter = " AND p.branch = ?";
      queryParams.push(branch);
    } else if (role === 'head_of_department') {
      const safeDept = (department && department !== "All") ? department : "INVALID_BYPASS";
      department = safeDept;
      profileFilter = " AND p.department = ?";
      queryParams.push(department);
    }

    // 1. Fetch all active employees matching filters
    const [allProfiles] = await pool.query(
      `SELECT p.user_id, p.full_name, p.branch, p.department, COALESCE(ur.role, 'employee') AS role
       FROM profiles p
       LEFT JOIN user_role ur ON ur.user_id = p.user_id
       WHERE p.status = 'Active' AND DATE(p.created_at) <= ?::date ${profileFilter}
       ORDER BY p.full_name ASC`,
      [queryDate, ...queryParams]
    );

    // 2. Fetch all clock-ins for that date
    const [clockRows] = await pool.query(
      `SELECT a.user_id, a.clock_in, a.clock_out,
              TO_CHAR(a.clock_in AT TIME ZONE 'Asia/Kuala_Lumpur', 'HH12:MI AM') AS time_in,
              TO_CHAR(a.clock_out AT TIME ZONE 'Asia/Kuala_Lumpur', 'HH12:MI AM') AS time_out
       FROM attendances a
       JOIN profiles p ON p.user_id = a.user_id
       WHERE DATE(a.clock_in) = ?::date ${profileFilter}`,
      [queryDate, ...queryParams]
    );

    const clockMap = {};
    for (const row of clockRows) {
      clockMap[row.user_id] = row;
    }

    // 3. Fetch approved leaves for that date
    const [leaveRows] = await pool.query(
      `SELECT DISTINCT lr.user_id, lr.leave_type
       FROM leave_requests lr
       JOIN profiles p ON p.user_id = lr.user_id
       WHERE lr.status = 'Approved' AND ?::date BETWEEN lr.start_date AND lr.end_date ${profileFilter}`,
      [queryDate, ...queryParams]
    );
    const leaveMap = {};
    for (const row of leaveRows) {
      leaveMap[row.user_id] = row;
    }

    // 4. Fetch company leaves active on that date
    const [companyLeaves] = await pool.query(
      `SELECT * FROM company_leave_calendar WHERE status = 'Active' AND ?::date BETWEEN DATE(start_date) AND DATE(end_date)`,
      [queryDate]
    );

    const lateTimeStr = getLateThresholdTime();
    const [lateH, lateM] = lateTimeStr.split(':').map(Number);

    // Parse date for weekend check
    const dateObj = new Date(queryDate);
    const dayOfWeek = dateObj.getDay();
    const dateNum = dateObj.getDate();
    const isWeekend = (dayOfWeek === 5) || (dayOfWeek === 6 && dateNum <= 7);

    const formattedReport = allProfiles.map((p) => {
      const uid = p.user_id;
      const clockRow = clockMap[uid];
      const leaveRow = leaveMap[uid];

      let status = "Absent";
      let clock_in = null;
      let clock_out = null;
      let time_in = null;
      let time_out = null;
      let isLate = false;
      let missingClockOut = false;
      let isEarlyLeaver = false;
      let isOvertime = false;

      // Check Company Leave first (Highest priority)
      const matchingLeave = companyLeaves.find(cl => {
        if (cl.applies_to === 'all') return true;
        if (cl.applies_to === 'branch' && cl.branch_id) {
          return cl.branch_id.split(',').map(s => s.trim()).includes(p.branch);
        }
        if (cl.applies_to === 'department' && cl.department_id) {
          const depts = cl.department_id.split(',').map(s => s.trim());
          const normEmpDept = (p.department || '').toLowerCase().replace(/\bdepartment\b/g, '').trim();
          return depts.some(d => {
            const normClDept = d.toLowerCase().replace(/\bdepartment\b/g, '').trim();
            return normEmpDept === normClDept || p.department === d;
          });
        }
        return false;
      });

      const matchingHoliday = malaysiaHolidays.find(h => h.date === queryDate);

      if (matchingLeave) {
        status = "Company Leave";
      } else if (leaveRow) {
        // Second priority: Approved Personal Leave
        status = "Approved Leave";
      } else if (matchingHoliday) {
        status = "Holiday";
      } else if (clockRow) {
        // Third priority: Attendance Record
        clock_in = clockRow.clock_in;
        clock_out = clockRow.clock_out;
        time_in = clockRow.time_in;
        time_out = clockRow.time_out;

        const klTimeIn = new Date(new Date(clock_in).getTime() + 8 * 60 * 60 * 1000);
        const clockInHour = klTimeIn.getUTCHours();
        const clockInMinute = klTimeIn.getUTCMinutes();
        isLate = clockInHour > lateH || (clockInHour === lateH && clockInMinute > lateM);
        status = isLate ? "Present (Late)" : "Present (On Time)";

        if (clock_out) {
          const klTimeOut = new Date(new Date(clock_out).getTime() + 8 * 60 * 60 * 1000);
          const clockOutHour = klTimeOut.getUTCHours();
          if (clockOutHour < 17) {
            isEarlyLeaver = true;
          }
          
          const diffMs = new Date(clock_out).getTime() - new Date(clock_in).getTime();
          if (diffMs > 9 * 60 * 60 * 1000) {
            isOvertime = true;
          }
        } else {
          const nowKl = new Date(Date.now() + 8 * 60 * 60 * 1000);
          const isPastDate = klTimeIn.getUTCDate() !== nowKl.getUTCDate() || klTimeIn.getUTCMonth() !== nowKl.getUTCMonth() || klTimeIn.getUTCFullYear() !== nowKl.getUTCFullYear();
          if (isPastDate) {
            missingClockOut = true;
          }
        }
      } else if (isWeekend) {
        // Fourth priority: Weekend
        status = "Weekend";
      } else {
        // Fifth priority: Absent
        status = "Absent";
      }

      return {
        user_id: p.user_id,
        full_name: p.full_name,
        branch: p.branch,
        department: p.department,
        role: p.role,
        clock_in,
        clock_out,
        time_in,
        time_out,
        status,
        is_late: isLate,
        missing_clock_out: missingClockOut,
        is_early_leaver: isEarlyLeaver,
        is_overtime: isOvertime
      };
    });

    res.json({ success: true, report: formattedReport, data: formattedReport });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===============================
// TOTAL LEAVE REQUESTS
// ===============================
app.get("/api/reports/total-leave-requests", async (req, res) => {
  try {
    let { role, branch, department } = req.query;
    let filter = "";
    let params = [];

    if (role === 'branch_leader') {
      const safeBranch = (branch && branch !== "All") ? branch : "INVALID_BYPASS";
      branch = safeBranch;
      filter = " AND p.branch = ?";
      params.push(branch);
    } else if (role === 'head_of_department') {
      const safeDept = (department && department !== "All") ? department : "INVALID_BYPASS";
      department = safeDept;
      filter = " AND p.department = ?";
      params.push(department);
    }

    const [rows] = await pool.query(
      `SELECT COUNT(*) AS total 
       FROM leave_requests lr
       JOIN profiles p ON p.user_id = lr.user_id
       WHERE lr.status = 'Approved' ${filter}`,
      params
    );
    res.json({ success: true, totalLeaveRequests: rows[0].total });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===============================
// EMPLOYEE RANK API
// ===============================
app.get("/api/reports/employee-rank", async (req, res) => {
  const userId = req.query.userId;
  const isAllMonth = req.query.month === 'all';
  const requestedMonth = parseInt(req.query.month) || (new Date().getMonth() + 1);
  const requestedYear = parseInt(req.query.year) || new Date().getFullYear();

  if (!userId) {
    return res.status(400).json({ success: false, error: "Missing userId" });
  }

  try {
    const lateTimeStr = getLateThresholdTime();
    
    let query = `
      SELECT 
        a.user_id,
        COUNT(a.attendance_id) AS total_days,
        SUM(CASE WHEN (a.clock_in AT TIME ZONE 'Asia/Kuala_Lumpur')::time > ?::time THEN 1 ELSE 0 END) AS late_days
      FROM attendances a
      JOIN profiles p ON p.user_id = a.user_id
      WHERE EXTRACT(YEAR FROM a.clock_in) = ?
        AND p.status = 'Active'
    `;
    let params = [lateTimeStr, requestedYear];

    if (!isAllMonth) {
      query += ` AND EXTRACT(MONTH FROM a.clock_in) = ?`;
      params = [lateTimeStr, requestedMonth, requestedYear];
    }

    query += ` GROUP BY a.user_id`;

    // Fetch all active employees attendance for the month/year
    const [rows] = await pool.query(query, params);

    const rankings = rows.map(row => {
      const total = parseInt(row.total_days);
      const late = parseInt(row.late_days || 0);
      const onTime = total - late;
      const score = total > 0 ? Math.round((onTime / total) * 100) : 0;
      return { user_id: row.user_id, score, total };
    });

    rankings.sort((a, b) => b.score - a.score || b.total - a.total); // higher score first, then more days first

    const rankIndex = rankings.findIndex(r => r.user_id === userId);
    
    // Also get total active employees for "of 58"
    const [empRows] = await pool.query(`SELECT COUNT(*) as total_active FROM profiles WHERE status = 'Active'`);
    const totalActive = parseInt(empRows[0].total_active || rankings.length);
    
    if (rankIndex === -1) {
      // No attendance yet
      return res.json({ success: true, rank: null, total: totalActive, score: 0 });
    }

    res.json({
      success: true,
      rank: rankIndex + 1,
      total: totalActive,
      score: rankings[rankIndex].score
    });
  } catch (err) {
    console.error("Employee Rank Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===============================
// ANALYTICS REPORT API
// ===============================
app.get("/api/reports/analytics", async (req, res) => {
  try {
    const requestedMonth = parseInt(req.query.month) || (new Date().getMonth() + 1);
    const requestedYear = parseInt(req.query.year) || new Date().getFullYear();
    const requestedDateStr = req.query.date || new Date().toISOString().split('T')[0];
    let { role, branch, department } = req.query;
    
    let profileFilter = "";
    let pFilterParams = [];

    if (role === 'branch_leader') {
      const safeBranch = (branch && branch !== "All") ? branch : "INVALID_BYPASS";
      branch = safeBranch;
      profileFilter = " AND p.branch = ?";
      pFilterParams.push(branch);
    } else if (role === 'head_of_department') {
      const safeDept = (department && department !== "All") ? department : "INVALID_BYPASS";
      department = safeDept;
      profileFilter = " AND p.department = ?";
      pFilterParams.push(department);
    }
    
    const now = new Date();
    const isCurrentMonth = requestedMonth === (now.getMonth() + 1) && requestedYear === now.getFullYear();
    const currentDay = isCurrentMonth ? now.getDate() : 30; // Use 30 for past months for estimation

    // 1. Get branch comparison for SELECTED month/year
    const [branchRows] = await pool.query(
      `
      SELECT
        p.branch,
        COUNT(DISTINCT (a.user_id, DATE(a.clock_in))) as total_present,
        COUNT(DISTINCT p.user_id) as total_employees,
        COUNT(DISTINCT CASE WHEN DATE(a.clock_in) = ? THEN a.user_id END) as active_now
      FROM profiles p
      LEFT JOIN attendances a ON p.user_id = a.user_id 
        AND EXTRACT(MONTH FROM a.clock_in) = ? 
        AND EXTRACT(YEAR FROM a.clock_in) = ?
      WHERE p.status = 'Active' AND DATE(p.created_at) <= ?::date ${profileFilter}
      GROUP BY p.branch
      `,
      [requestedDateStr, requestedMonth, requestedYear, requestedDateStr, ...pFilterParams]
    );

    const branchComparison = branchRows.map(row => {
      const daysInPeriod = isCurrentMonth ? currentDay : 22; // Approx working days for past months
      const possibleAttendances = row.total_employees * Math.max(1, daysInPeriod);
      let rate = possibleAttendances > 0
        ? Math.round((row.total_present / possibleAttendances) * 100)
        : 0;

      return {
        branch: row.branch || 'Unknown',
        rate: Math.min(100, rate),
        activeRate: row.total_employees > 0 ? Math.round((row.active_now / row.total_employees) * 100) : 0,
        totalEmployees: row.total_employees
      };
    });

    // 2. Get monthly data for current SELECTED year
    const [attendanceRows] = await pool.query(
      `
      SELECT 
        EXTRACT(MONTH FROM a.clock_in) as month_num,
        COUNT(DISTINCT (a.user_id, DATE(a.clock_in))) as total_present
      FROM attendances a
      JOIN profiles p ON p.user_id = a.user_id
      WHERE EXTRACT(YEAR FROM a.clock_in) = ? AND p.status = 'Active' ${profileFilter}
      GROUP BY EXTRACT(MONTH FROM a.clock_in)
      `,
      [requestedYear, ...pFilterParams]
    );

    const [leaveRows] = await pool.query(
      `
      SELECT
        EXTRACT(MONTH FROM lr.start_date) as month_num,
        COUNT(*) as total_leaves
      FROM leave_requests lr
      JOIN profiles p ON p.user_id = lr.user_id
      WHERE EXTRACT(YEAR FROM lr.start_date) = ? AND lr.status = 'Approved' AND p.status = 'Active' ${profileFilter}
      GROUP BY EXTRACT(MONTH FROM lr.start_date)
      `,
      [requestedYear, ...pFilterParams]
    );

    const [employeeCountRow] = await pool.query(
      `SELECT COUNT(*) as total FROM profiles p WHERE p.status = 'Active' ${profileFilter}`,
      pFilterParams
    );
    const totalActiveEmployees = employeeCountRow[0].total || 1;

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyData = [];

    // Base mock data for past months ONLY if real data is missing
    const baseMockData = [
      { month: "Jan", attendance: 94, leaves: 18 },
      { month: "Feb", attendance: 96, leaves: 12 },
      { month: "Mar", attendance: 93, leaves: 22 },
      { month: "Apr", attendance: 95, leaves: 15 },
    ];

    const maxMonthToShow = requestedYear < now.getFullYear() ? 12 : (now.getMonth() + 1);

    for (let i = 1; i <= maxMonthToShow; i++) {
      const monthStr = months[i - 1];
      const attData = attendanceRows.find(r => parseInt(r.month_num) === i);
      const levData = leaveRows.find(r => parseInt(r.month_num) === i);

      const possibleAttendances = totalActiveEmployees * 20;
      const presentCount = attData ? attData.total_present : 0;
      let attendanceRate = possibleAttendances > 0 ? Math.round((presentCount / possibleAttendances) * 100) : 0;
      
      let finalAttendance = Math.min(100, attendanceRate);
      let finalLeaves = levData ? levData.total_leaves : 0;

      // Use mock data ONLY for previous months in 2026, and ONLY if no real data exists
      if (finalAttendance === 0 && finalLeaves === 0 && i < (now.getMonth() + 1) && requestedYear === 2026) {
        const mock = baseMockData.find(m => m.month === monthStr);
        if (mock) {
          finalAttendance = mock.attendance;
          finalLeaves = mock.leaves;
        }
      }

      monthlyData.push({
        month: monthStr,
        attendance: finalAttendance,
        leave_request: finalLeaves
      });
    }

    res.json({ success: true, branchComparison, monthlyData });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===============================
// WORKFORCE INSIGHTS DASHBOARD API
// ===============================
app.get("/api/reports/workforce-insights", async (req, res) => {
  try {
    const { role, branch, department } = req.query;
    const requestedMonth = parseInt(req.query.month) || (new Date().getMonth() + 1);
    const requestedYear = parseInt(req.query.year) || new Date().getFullYear();
    const todayStr = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Kuala_Lumpur"})).toISOString().split('T')[0];
    const isDayView = !!req.query.date;
    const targetDateStr = req.query.date ? req.query.date : todayStr;
    const lateTimeStr = getLateThresholdTime();

    let profileFilter = "";
    let pFilterParams = [];

    if (role === 'branch_leader') {
      const safeBranch = (branch && branch !== "All") ? branch : "INVALID_BYPASS";
      profileFilter = " AND p.branch = ?";
      pFilterParams.push(safeBranch);
    } else if (role === 'head_of_department') {
      const safeDept = (department && department !== "All") ? department : "INVALID_BYPASS";
      profileFilter = " AND p.department = ?";
      pFilterParams.push(safeDept);
    }

    // 1. Employees & KPI
    const [empRows] = await pool.query(`SELECT COUNT(*) as total, SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as active FROM profiles p WHERE DATE(p.created_at) <= ?::date ${profileFilter}`, [targetDateStr, ...pFilterParams]);
    const totalHeadcount = parseInt(empRows[0].total || 0);
    const activeEmployees = parseInt(empRows[0].active || 0);

    // Fetch active company leaves
    const [companyLeaveRows] = await pool.query(
      `SELECT * FROM company_leave_calendar WHERE status = 'Active' AND start_date <= ? AND end_date >= ?`,
      [targetDateStr, targetDateStr]
    );

    // Calculate company leave exactly
    let companyLeaveCount = 0;
    const [allProfiles] = await pool.query(
      `SELECT * FROM profiles p WHERE p.status = 'Active' ${profileFilter}`, pFilterParams
    );
    
    let isCompanyLeaveDay = false;
    let companyLeaveEmployees = new Set();
    allProfiles.forEach(emp => {
      let onCL = false;
      for (let cl of companyLeaveRows) {
        if (cl.applies_to === 'All' || cl.applies_to === 'all') onCL = true;
        else if ((cl.applies_to === 'Specific Branch' || cl.applies_to === 'branch') && cl.branch_id && cl.branch_id.split(',').includes(emp.branch)) onCL = true;
        else if ((cl.applies_to === 'Specific Department' || cl.applies_to === 'department') && cl.department_id && cl.department_id.split(',').includes(emp.department)) onCL = true;
      }
      if (onCL) {
        companyLeaveCount++;
        companyLeaveEmployees.add(emp.user_id);
      }
    });

    if (companyLeaveCount > 0 && companyLeaveCount === activeEmployees) {
      isCompanyLeaveDay = true;
    }

    // 2. Attendance & Lates
    const [attRows] = await pool.query(
      `SELECT 
        a.user_id, p.full_name as name, p.branch, p.department, a.clock_in, a.clock_out,
        CASE WHEN (a.clock_in AT TIME ZONE 'Asia/Kuala_Lumpur')::time > ?::time THEN 1 ELSE 0 END as is_late
       FROM attendances a
       JOIN profiles p ON p.user_id = a.user_id
       WHERE EXTRACT(MONTH FROM a.clock_in) = ? AND EXTRACT(YEAR FROM a.clock_in) = ? AND p.status = 'Active' ${profileFilter}`,
      [lateTimeStr, requestedMonth, requestedYear, ...pFilterParams]
    );

    let totalLateArrivals = 0;
    let presentToday = 0;
    let lateToday = 0;
    
    const userStats = {};

    attRows.forEach(att => {
      const isLate = parseInt(att.is_late) === 1;
      const dateObj = new Date(att.clock_in);
      const dateStr = new Date(dateObj.getTime() + 8*3600*1000).toISOString().split('T')[0];
      
      if (isLate) totalLateArrivals++;
      if (dateStr === targetDateStr) {
        presentToday++;
        if (isLate) lateToday++;
      }

      if (!userStats[att.user_id]) {
        userStats[att.user_id] = { name: att.name, presentDays: 0, lateDays: 0 };
      }
      userStats[att.user_id].presentDays++;
      if (isLate) userStats[att.user_id].lateDays++;
    });

    const workingDaysInMonth = 22; 
    const possibleAttendances = activeEmployees * workingDaysInMonth;
    let averageAttendance = 0;
    
    if (isDayView) {
      if (isCompanyLeaveDay) {
        averageAttendance = 0;
      } else {
        const expectedToClockIn = activeEmployees - companyLeaveCount;
        averageAttendance = expectedToClockIn > 0 ? Math.round((presentToday / expectedToClockIn) * 100) : 0;
      }
    } else {
      averageAttendance = possibleAttendances > 0 ? Math.round((attRows.length / possibleAttendances) * 100) : 0;
    }

    const absences = Math.max(0, possibleAttendances - attRows.length);

    // 3. Leave Stats
    const [leaveRows] = await pool.query(
      `SELECT lr.status, lr.start_date, lr.end_date, p.full_name as name
       FROM leave_requests lr
       JOIN profiles p ON p.user_id = lr.user_id
       WHERE EXTRACT(MONTH FROM lr.start_date) = ? AND EXTRACT(YEAR FROM lr.start_date) = ? AND p.status = 'Active' ${profileFilter}`,
      [requestedMonth, requestedYear, ...pFilterParams]
    );

    let pendingApproval = 0;
    let approvedThisMonth = 0;
    let onLeaveToday = 0;

    leaveRows.forEach(lr => {
      if (lr.status.startsWith('Pending')) pendingApproval++;
      if (lr.status === 'Approved') approvedThisMonth++;
      
      const startObj = new Date(lr.start_date);
      const endObj = new Date(lr.end_date);
      const start = new Date(startObj.getTime() + 8*3600*1000).toISOString().split('T')[0];
      const end = new Date(endObj.getTime() + 8*3600*1000).toISOString().split('T')[0];
      
      if (targetDateStr >= start && targetDateStr <= end && lr.status === 'Approved') {
        onLeaveToday++;
      }
    });

    // 4. Team Availability today
    const absentToday = Math.max(0, activeEmployees - presentToday - onLeaveToday - companyLeaveCount);

    // 5. Rankings
    const rankings = Object.values(userStats).map(u => ({
      name: u.name,
      attendanceRate: Math.min(100, Math.round((u.presentDays / workingDaysInMonth) * 100)),
      lateCount: u.lateDays
    }));

    const topAttendance = [...rankings].sort((a, b) => b.attendanceRate - a.attendanceRate).slice(0, 5);
    const topLate = [...rankings].sort((a, b) => b.lateCount - a.lateCount).filter(u => u.lateCount > 0).slice(0, 5);

    // 6. Trends (Mock Data for presentation as requested)
    const monthlyTrend = [
      { month: "Jan", rate: 94 }, { month: "Feb", rate: 96 }, { month: "Mar", rate: 92 },
      { month: "Apr", rate: 97 }, { month: "May", rate: 95 }, { month: "Jun", rate: 98 }
    ];
    
    const dailyMap = {};
    attRows.forEach(att => {
      const dateObj = new Date(att.clock_in);
      const dateStr = new Date(dateObj.getTime() + 8*3600*1000).toISOString().split('T')[0];
      const d = dateStr.slice(8, 10); 
      if (!dailyMap[d]) dailyMap[d] = { rate: 0, lates: 0, count: 0 };
      dailyMap[d].count++;
      if (parseInt(att.is_late) === 1) dailyMap[d].lates++;
    });
    
    const dailyTrend = Object.keys(dailyMap).sort().map(d => ({
      date: d,
      rate: activeEmployees > 0 ? Math.round((dailyMap[d].count / activeEmployees) * 100) : 0,
      lates: dailyMap[d].lates
    })).slice(-10);

    // 7. Employees by Department
    const [deptRows] = await pool.query(
      `SELECT p.department, COUNT(*) as count 
       FROM profiles p 
       WHERE p.status = 'Active' AND DATE(p.created_at) <= ?::date AND p.department IS NOT NULL AND p.department != '' ${profileFilter}
       GROUP BY p.department`,
      [targetDateStr, ...pFilterParams]
    );

    // 8. Employees by Branch
    const [branchRows] = await pool.query(
      `SELECT p.branch, COUNT(*) as count 
       FROM profiles p 
       WHERE p.status = 'Active' AND DATE(p.created_at) <= ?::date AND p.branch IS NOT NULL AND p.branch != '' ${profileFilter}
       GROUP BY p.branch`,
      [targetDateStr, ...pFilterParams]
    );

    const branchMonthlyAttendance = {};
    attRows.forEach(a => {
      const b = a.branch || 'HQ';
      if (!branchMonthlyAttendance[b]) branchMonthlyAttendance[b] = 0;
      branchMonthlyAttendance[b]++;
    });

    const [realLeaveAnalyticsRows] = await pool.query(
      `SELECT lr.leave_type, COUNT(*) as count 
       FROM leave_requests lr
       JOIN profiles p ON p.user_id = lr.user_id
       WHERE lr.status = 'APPROVED'
       ${profileFilter}
       GROUP BY lr.leave_type`,
      pFilterParams
    );
    let realLeaveAnalytics = { annual: 0, medical: 0, emergency: 0, unpaid: 0 };
    realLeaveAnalyticsRows.forEach(r => {
      const type = String(r.leave_type || '').toLowerCase();
      const count = parseInt(r.count) || 0;
      if (type.includes('annual')) realLeaveAnalytics.annual += count;
      else if (type.includes('medical') || type.includes('sick')) realLeaveAnalytics.medical += count;
      else if (type.includes('emergency')) realLeaveAnalytics.emergency += count;
      else realLeaveAnalytics.unpaid += count;
    });

    // Populate missing attendees for SSE simulation payload
    const presentUserIds = new Set(attRows.filter(a => {
      const dateObj = new Date(a.clock_in);
      const dateStr = new Date(dateObj.getTime() + 8*3600*1000).toISOString().split('T')[0];
      return dateStr === targetDateStr;
    }).map(a => a.user_id));

    let simulatedAbsent = [];
    let simulatedCompanyLeave = [];
    allProfiles.forEach(p => {
      if (!presentUserIds.has(p.user_id)) {
        if (companyLeaveEmployees.has(p.user_id)) {
          simulatedCompanyLeave.push({
            user_id: p.user_id,
            full_name: p.full_name,
            initials: p.full_name.split(' ').map(n=>n[0]).join('').substring(0,2),
            department: p.department || '—',
            branch: p.branch || '—',
            status: 'companyLeave'
          });
        } else {
          simulatedAbsent.push({
            user_id: p.user_id,
            full_name: p.full_name,
            initials: p.full_name.split(' ').map(n=>n[0]).join('').substring(0,2),
            department: p.department || '—',
            branch: p.branch || '—',
            status: 'absent'
          });
        }
      }
    });

    // Combine them, putting company leaves first
    const finalAbsentList = [...simulatedCompanyLeave, ...simulatedAbsent].slice(0, 10);

    const sseInitialPayload = {
      attendance: attRows.filter(a => {
        const dateObj = new Date(a.clock_in);
        const dateStr = new Date(dateObj.getTime() + 8*3600*1000).toISOString().split('T')[0];
        return dateStr === targetDateStr;
      }).map(a => ({
        user_id: a.user_id,
        full_name: a.name,
        initials: a.name.split(' ').map(n=>n[0]).join('').substring(0,2),
        department: a.department || '—',
        branch: a.branch || '—',
        clock_in: a.clock_in
      })).slice(0, 5),
      late: attRows.filter(a => {
        const dateObj = new Date(a.clock_in);
        const dateStr = new Date(dateObj.getTime() + 8*3600*1000).toISOString().split('T')[0];
        return dateStr === targetDateStr && parseInt(a.is_late) === 1;
      }).map(a => ({
        user_id: a.user_id,
        full_name: a.name,
        initials: a.name.split(' ').map(n=>n[0]).join('').substring(0,2),
        department: a.department || '—',
        branch: a.branch || '—',
        clock_in: a.clock_in
      })).slice(0, 5),
      absent: finalAbsentList
    };

    res.json({
      success: true,
      departmentMetrics: deptRows.map(r => ({ name: r.department, value: parseInt(r.count || 0) })),
      monthlyComparison: {
        attendance: { current: 95.4, previous: 93.3 },
        lateArrivals: { current: 28, previous: 41 },
        absences: { current: 12, previous: 18 },
        leaveRequests: { current: 35, previous: 30 },
        outstation: { current: 15, previous: 11 }
      },
      branchMetrics: branchRows.map(r => {
        const total = parseInt(r.count || 0);
        const monthlyPresent = branchMonthlyAttendance[r.branch] || 0;
        const possibleBranchAttendances = total * workingDaysInMonth;
        const rate = possibleBranchAttendances > 0 
          ? Math.round((monthlyPresent / possibleBranchAttendances) * 100) 
          : 0;
        return {
          name: r.branch, 
          count: total, 
          attendanceRate: Math.min(100, rate)
        }
      }),
      leaveAnalytics: realLeaveAnalytics,
      outstationAnalytics: {
        completed: 25,
        upcoming: 8,
        cancelled: 2,
        popularRoutes: [
          { route: 'KL → Penang', trips: 8 },
          { route: 'KL → Johor', trips: 6 },
          { route: 'KL → Sabah', trips: 4 }
        ]
      },
      workforceMovement: {
        newJoiners: 4,
        resigned: 2,
        transferred: 3,
        promotions: 1
      },
      hrAlerts: [
        { title: '4 Employees', description: 'Absent 3 Consecutive Days', type: 'critical' },
        { title: '2 Contracts', description: 'Expiring in 30 Days', type: 'warning' },
        { title: '7 Leave Requests', description: 'Awaiting Approval', type: 'info' },
        { title: 'Attendance', description: '↑4% vs Last Month', type: 'success' }
      ],
      topKpi: {
        totalHeadcount,
        activeEmployees,
        attendanceRate: Math.min(100, averageAttendance),
        onLeaveToday,
        companyLeaveToday: companyLeaveCount,
        outstationToday: 0
      },
      attendanceOverview: {
        averageAttendance: Math.min(100, averageAttendance),
        lateArrivals: totalLateArrivals,
        absences,
        monthlyTrend,
        dailyTrend
      },
      leaveMonitoring: {
        pendingApproval,
        approvedThisMonth,
        staffOnLeaveToday: onLeaveToday
      },
      teamAvailability: {
        present: presentToday,
        onLeave: onLeaveToday,
        companyLeave: companyLeaveCount,
        absent: absentToday,
        late: lateToday
      },
      performance: {
        topAttendance,
        topLate,
        allAttendance: rankings
      },
      sseInitialPayload
    });
  } catch (err) {
    console.error("workforce-insights error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/branches", async (req, res) => {
  try {
    const queryStr = `
      SELECT 
        b.code, 
        b.name,
        b.location,
        (
          SELECT p.full_name 
          FROM profiles p
          JOIN user_role ur ON p.user_id = ur.user_id
          WHERE p.status = 'Active' AND (
            (b.code = 'HQ' AND ur.role = 'managing_director') 
            OR (b.code != 'HQ' AND p.branch = b.code AND ur.role = 'branch_leader') 
          )
          LIMIT 1
        ) AS leader_name
      FROM branches b 
      ORDER BY 
        CASE WHEN b.code = 'HQ' THEN 0 ELSE 1 END,
        b.name ASC
    `;
    let [rows] = await pool.query(queryStr);
    
    if (rows.length === 0) {
      const fallbackBranches = [
        { code: "HQ", name: "Rayhar HQ", location: "Kemaman,Terengganu" },
        { code: "KMM", name: "Kemaman", location: "Kemaman,Terengganu" },
        { code: "CNH", name: "Cheneh", location: "Kemaman,Terengganu" },
        { code: "KBG", name: "Kuala Berang", location: "Hulu Terengganu,Terengganu" },
        { code: "TGG", name: "Kuala Terengganu", location: "Kuala Terengganu,Terengganu" },
        { code: "DGN", name: "Dungun", location: "Dungun,Terengganu" },
        { code: "JTH", name: "Jertih", location: "Besut,Terengganu" },
        { code: "KBR", name: "Kota Bharu", location: "Kota Bharu,Kelantan" },
        { code: "RMP", name: "Rompin", location: "Rompin,Pahang" },
        { code: "MZM", name: "Muadzam Shah", location: "Muadzam Shah,Pahang" },
        { code: "SHA", name: "Shah Alam", location: "Shah Alam,Selangor" },
        { code: "BBB", name: "Bandar Baru Bangi", location: "Bandar Baru Bangi,Selangor" },
        { code: "KUL", name: "Kuala Lumpur", location: "Kuala Lumpur,Wilayah Persekutuan" },
        { code: "IPH", name: "Ipoh", location: "Ipoh,Perak" },
        { code: "MJG", name: "Manjung", location: "Manjung,Perak" },
        { code: "KKS", name: "Kuala Kangsar", location: "Kuala Kangsar,Perak" },
        { code: "MLK", name: "Melaka", location: "Melaka,Melaka" },
        { code: "AOR", name: "Alor Setar", location: "Alor Setar,Kedah" },
        { code: "BTM", name: "Bertam", location: "Bertam,Pulau Pinang" },
        { code: "SNS", name: "Seremban", location: "Seremban,Negeri Sembilan" },
        { code: "BTP", name: "Batu Pahat", location: "Batu Pahat,Johor" },
        { code: "JB", name: "Johor Bharu", location: "Johor Bharu,Johor" },
        { code: "TWU", name: "Tawau", location: "Tawau,Sabah" }
      ];

      for (const b of fallbackBranches) {
        await pool.query(
          "INSERT INTO branches (branch, code, name, location) VALUES (?, ?, ?, ?)",
          [b.code, b.code, b.name, b.location]
        );
      }
      
      const [reFetch] = await pool.query(queryStr);
      rows = reFetch;
    }

    res.json({
      success: true,
      branches: rows
    });

  } catch (err) {
    console.error("Error fetching branches:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

app.post("/api/branches", async (req, res) => {
  const { code, name, location, operatorName, operatorRole } = req.body;

  if (!code || !name) {
    return res.status(400).json({ success: false, error: "Code and name are required" });
  }

  try {
    const cleanCode = code.trim().toUpperCase();
    const [existing] = await pool.query("SELECT code FROM branches WHERE code = ?", [cleanCode]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, error: "Branch code already exists" });
    }

    const branchLocation = location ? location.trim() : 'RAYHAR BRANCH';

    await pool.query(
      "INSERT INTO branches (branch, code, name, location) VALUES (?, ?, ?, ?)",
      [cleanCode, cleanCode, name.trim(), branchLocation]
    );

    // Broadcast branch registration event via SSE
    broadcastPresenceUpdate({
      type: "config-change",
      timestamp: new Date().toISOString(),
      operatorName: operatorName || "System",
      operatorRole: operatorRole || "admin",
      action: `Registered new branch: ${name.trim()} (${cleanCode})`
    });

    res.json({ success: true, message: "Branch created successfully" });
  } catch (err) {
    console.error("Error creating branch:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete("/api/branches/:id", async (req, res) => {
  const { id } = req.params;
  try {
    // Note: The param name is code
    await pool.query("DELETE FROM branches WHERE code = ?", [id]);
    res.json({ success: true, message: "Branch deleted successfully" });
  } catch (err) {
    console.error("Error deleting branch:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===============================
// GET BRANCHES STATS API
// ===============================
app.get("/api/branches-stats", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        b.code AS branch,
        COUNT(DISTINCT p.user_id) AS total_employees,
        COUNT(DISTINCT att.user_id) AS present_today,
        COUNT(DISTINCT lr.leave_id) AS on_leave
      FROM branches b
      LEFT JOIN profiles p 
        ON p.branch = b.code AND p.status = 'Active'
      LEFT JOIN attendances att 
        ON att.user_id = p.user_id 
        AND DATE(att.clock_in) = CURRENT_DATE
      LEFT JOIN leave_requests lr
        ON lr.user_id = p.user_id
        AND lr.status = 'Approved'
        AND CURRENT_DATE BETWEEN lr.start_date AND lr.end_date
      GROUP BY b.code
    `);
    res.json({ success: true, stats: rows });
  } catch (err) {
    console.error("Error fetching branches stats:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===============================
// DEPARTMENTS API (HQ Departments)
// ===============================
app.get("/api/departments", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM departments ORDER BY id ASC");
    res.json({ success: true, departments: rows });
  } catch (error) {
    console.error("Fetch departments error:", error);
    res.status(500).json({ success: false, error: "Server Error" });
  }
});

app.post("/api/departments", async (req, res) => {
  const { code, name, operatorName, operatorRole } = req.body;
  
  if (!code || !name) {
    return res.status(400).json({ success: false, error: "Code and name are required" });
  }

  try {
    const [existing] = await pool.query(
      "SELECT * FROM departments WHERE code = ? OR name = ?", 
      [code.toUpperCase(), name]
    );

    if (existing.length > 0) {
      return res.status(409).json({ success: false, error: "Department with this code or name already exists" });
    }

    // Broadcast department registration event via SSE
    broadcastPresenceUpdate({
      type: "config-change",
      timestamp: new Date().toISOString(),
      operatorName: operatorName || "System",
      operatorRole: operatorRole || "admin",
      action: `Created department: ${name.trim()} (${code.toUpperCase()})`
    });

    res.json({ success: true, message: "Department registered successfully" });
  } catch (error) {
    console.error("Register department error:", error);
    res.status(500).json({ success: false, error: "Server Error" });
  }
});

app.delete("/api/departments/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM departments WHERE name = ?", [id]);
    res.json({ success: true, message: "Department deleted successfully" });
  } catch (err) {
    console.error("Error deleting department:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===============================
// WHO'S OUT TODAY
// ===============================
app.get("/api/who-out-today", async (req, res) => {
  const { role, branch, department } = req.query;

  try {
    const filters = [];
    const params = [];

    if (role === "branch_leader" && branch) {
      filters.push("p.branch = ?");
      params.push(branch);
    } else if (role === "head_of_department" && department) {
      filters.push("p.department = ?");
      params.push(department);
    } else if (role === "head_of_department") {
      filters.push("1 = 0");
    } else if (!["hr_admin", "managing_director", "finance_manager"].includes(role) && branch) {
      filters.push("p.branch = ?");
      params.push(branch);
    }

    const whereClause = filters.length ? `AND ${filters.join(" AND ")}` : "";

    const [rows] = await pool.query(`
      SELECT
        lr.leave_id,
        lr.user_id,
        lr.leave_type,
        lr.start_date,
        lr.end_date,
        lr.days,
        lr.reason,
        p.full_name,
        p.branch
      FROM leave_requests lr
      JOIN profiles p ON p.user_id = lr.user_id
      WHERE lr.status = 'Approved'
        AND CURRENT_DATE BETWEEN lr.start_date AND lr.end_date
        ${whereClause}
      ORDER BY lr.end_date ASC
    `, params);

    res.json({ success: true, employees: rows });
  } catch (err) {
    console.error("Who Out Today Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===============================
// REPORT GENERATOR API
// ===============================
app.get("/api/reports/generator", async (req, res) => {
  try {
    const { type, month, year, branch, department } = req.query;
    
    let filters = [];
    let params = [];
    
    if (branch && branch !== 'all') {
      filters.push("p.branch = ?");
      params.push(branch);
    }
    
    if (department && department !== 'all') {
      filters.push("p.department = ?");
      params.push(department);
    }
    
    if (month && month !== 'all') {
      filters.push("EXTRACT(MONTH FROM a.clock_in) = ?");
      params.push(month);
    }
    
    if (year && year !== 'all') {
      filters.push("EXTRACT(YEAR FROM a.clock_in) = ?");
      params.push(year);
    }
    
    let whereClause = filters.length > 0 ? "WHERE " + filters.join(" AND ") : "";
    
    if (type === 'trends' || type === 'stability') {
      const [rows] = await pool.query(`
        SELECT 
          p.user_id,
          p.full_name,
          p.branch,
          a.clock_in,
          a.clock_out
        FROM attendances a
        JOIN profiles p ON p.user_id = a.user_id
        ${whereClause}
        ORDER BY a.clock_in DESC
      `, params);
      
      res.json({ success: true, data: rows });
    } else {
      let leaveFilters = [];
      let leaveParams = [];
      
      if (branch && branch !== 'all') {
         leaveFilters.push("p.branch = ?");
         leaveParams.push(branch);
      }
      
      if (department && department !== 'all') {
         leaveFilters.push("p.department = ?");
         leaveParams.push(department);
      }
      
      if (month && month !== 'all') {
         leaveFilters.push("EXTRACT(MONTH FROM lr.start_date) = ?");
         leaveParams.push(month);
      }
      
      if (year && year !== 'all') {
         leaveFilters.push("EXTRACT(YEAR FROM lr.start_date) = ?");
         leaveParams.push(year);
      }
      
      let leaveWhereClause = leaveFilters.length > 0 ? "AND " + leaveFilters.join(" AND ") : "";
      
      const [rows] = await pool.query(`
        SELECT 
          p.user_id,
          p.full_name,
          p.branch,
          lr.leave_type,
          lr.days,
          lr.status
        FROM leave_requests lr
        JOIN profiles p ON p.user_id = lr.user_id
        WHERE lr.status = 'Approved' ${leaveWhereClause}
      `, leaveParams);
      
      res.json({ success: true, data: rows });
    }
  } catch (err) {
    console.error("Generator Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===============================
// LEAVE UTILIZATION ANALYTICS
// ===============================
app.get("/api/reports/leave-utilization", async (req, res) => {
  try {
    let { role, branch, department } = req.query;
    let filter = "";
    let params = [];

    if (role === 'branch_leader') {
      const safeBranch = (branch && branch !== "All") ? branch : "INVALID_BYPASS";
      branch = safeBranch;
      filter = " AND p.branch = ?";
      params.push(branch);
    } else if (role === 'head_of_department') {
      const safeDept = (department && department !== "All") ? department : "INVALID_BYPASS";
      department = safeDept;
      filter = " AND p.department = ?";
      params.push(department);
    }

    // 1. Department Utilization
    const [deptRows] = await pool.query(`
      SELECT 
        COALESCE(p.department, 'GENERAL') as department, 
        lr.leave_type, 
        SUM(lr.days) as total_days
      FROM leave_requests lr
      JOIN profiles p ON p.user_id = lr.user_id
      WHERE lr.status = 'Approved' ${filter}
      GROUP BY p.department, lr.leave_type
    `, params);

    // 2. Leave Type Distribution
    const [distRows] = await pool.query(`
      SELECT 
        lr.leave_type, 
        SUM(lr.days) as total_days
      FROM leave_requests lr
      JOIN profiles p ON p.user_id = lr.user_id
      WHERE lr.status = 'Approved' ${filter}
      GROUP BY lr.leave_type
    `, params);

    // 3. Leader Leaves (Upcoming / Active HOD/Leader Leaves)
    const [leaderRows] = await pool.query(`
      SELECT 
        lr.leave_id, 
        lr.leave_type, 
        lr.start_date, 
        lr.end_date, 
        lr.days, 
        p.full_name, 
        COALESCE(p.department, 'GENERAL') as department, 
        p.branch, 
        ur.role
      FROM leave_requests lr
      JOIN profiles p ON p.user_id = lr.user_id
      JOIN user_role ur ON ur.user_id = p.user_id
      WHERE lr.status = 'Approved' AND ur.role IN ('head_of_department', 'branch_leader') ${filter}
      ORDER BY lr.start_date DESC 
      LIMIT 10
    `, params);

    res.json({
      success: true,
      departmentUtilization: deptRows,
      leaveTypeDistribution: distRows,
      leaderLeaves: leaderRows
    });
  } catch (err) {
    console.error("Leave Utilization Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===============================
// PASSWORD RESET API
// ===============================
app.post("/api/request-password-reset", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, error: "Email is required" });
  }

  try {
    // Look up user by email in profiles table
    const [rows] = await pool.query("SELECT * FROM profiles WHERE email = ?", [email]);
    if (rows.length === 0) {
      // Don't leak that email doesn't exist for security reasons, just pretend success
      return res.json({ success: true, message: "If your email is registered, you will receive a reset link shortly." });
    }

    const user = rows[0];

    // Check JWT secret
    if (!jwtSecret) {
      return res.status(500).json({ success: false, error: "Server misconfiguration: JWT secret missing" });
    }

    // Generate JWT token valid for 15 minutes
    const token = jwt.sign({ user_id: user.user_id, purpose: "password_reset" }, jwtSecret, { expiresIn: "15m" });

    // Determine Frontend URL
    const frontendUrl = req.headers.origin || process.env.FRONTEND_URL || "http://localhost:5173";
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    // Send email
    const subject = "Rayhar Staff Portal - Password Reset";
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="color: #7B0099;">Password Reset Request</h2>
        <p>Hello ${user.full_name},</p>
        <p>We received a request to reset your password for the Rayhar Employee Portal.</p>
        <p>Click the button below to set a new password. This link will expire in 15 minutes.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #7B0099; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
        </div>
        <p>If you did not request a password reset, please ignore this email or contact HR if you have concerns.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #888; text-align: center;">Rayhar Staff Portal</p>
      </div>
    `;

    await sendNotificationEmail(user.email, subject, html);
    
    res.json({ success: true, message: "Reset link sent successfully." });
  } catch (err) {
    console.error("Error requesting password reset:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

app.post("/api/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ success: false, error: "Token and new password are required" });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, error: "Password must be at least 6 characters" });
  }

  try {
    // Verify Token
    const decoded = jwt.verify(token, jwtSecret);

    if (decoded.purpose !== "password_reset") {
      return res.status(400).json({ success: false, error: "Invalid token type" });
    }

    const userId = decoded.user_id;

    // Hash new password
    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await pool.query("UPDATE profiles SET password = ? WHERE user_id = ?", [hashedPassword, userId]);

    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    console.error("Error resetting password:", err);
    if (err.name === "TokenExpiredError") {
      return res.status(400).json({ success: false, error: "Your reset link has expired. Please request a new one." });
    }
    return res.status(400).json({ success: false, error: "Invalid or expired token" });
  }
});

// ===============================
// PERSONAL NOTES & CALENDAR API
// ===============================

// Get personal notes for a user
app.get("/api/personal-notes", async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ success: false, error: "Missing userId" });
    }
    const [rows] = await pool.query(
      "SELECT id, user_id, TO_CHAR(date, 'YYYY-MM-DD') as date, note_text, type, created_at FROM personal_notes WHERE user_id = ? ORDER BY date DESC",
      [userId]
    );
    res.json({ success: true, notes: rows });
  } catch (err) {
    console.error("Error fetching personal notes:", err);
    res.status(500).json({ success: false, error: "Failed to fetch notes" });
  }
});

// Add or update a personal note
app.post("/api/personal-notes", async (req, res) => {
  try {
    const { userId, date, note_text, type } = req.body;
    
    if (!userId || !date || !note_text) {
      return res.status(400).json({ success: false, error: "UserId, Date and note text are required" });
    }
    
    const [result] = await pool.query(
      "INSERT INTO personal_notes (user_id, date, note_text, type) VALUES (?, ?, ?, ?) RETURNING *",
      [userId, date, note_text, type || 'note']
    );
    
    const newNote = result[0] || { id: result.insertId, user_id: userId, date, note_text, type: type || 'note' };
    res.status(201).json({ success: true, note: newNote });
  } catch (err) {
    console.error("Error adding personal note:", err.message, err.stack);
    res.status(500).json({ success: false, error: "Failed to add note: " + err.message });
  }
});

// Delete a personal note
app.delete("/api/personal-notes/:id", async (req, res) => {
  try {
    const userId = req.query.userId;
    const noteId = req.params.id;

    if (!userId) {
      return res.status(400).json({ success: false, error: "Missing userId" });
    }
    
    await pool.query(
      "DELETE FROM personal_notes WHERE id = ? AND user_id = ?",
      [noteId, userId]
    );
    res.json({ success: true, message: "Note deleted successfully" });
  } catch (err) {
    console.error("Error deleting personal note:", err);
    res.status(500).json({ success: false, error: "Failed to delete note" });
  }
});

// Get Malaysian Public Holidays (Static List for 2024-2026)
app.get("/api/holidays", (req, res) => {
  res.json({ success: true, holidays: malaysiaHolidays });
});

// ── COMPANY LEAVE CALENDAR ENDPOINTS ─────────────────────────────────────
app.get("/api/company-leaves", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM company_leave_calendar ORDER BY start_date DESC`
    );
    res.json({ success: true, leaves: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/company-leaves", async (req, res) => {
  const {
    leave_name,
    leave_type,
    start_date,
    end_date,
    applies_to,
    branch_id,
    department_id,
    is_paid,
    attendance_required,
    status,
    remarks,
    created_by
  } = req.body;

  try {
    const [result] = await pool.query(
      `INSERT INTO company_leave_calendar (
        leave_name, leave_type, start_date, end_date, applies_to,
        branch_id, department_id, is_paid, attendance_required, status,
        remarks, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        leave_name, leave_type, start_date, end_date, applies_to,
        branch_id || null, department_id || null, is_paid ?? true, attendance_required ?? false, status || 'Active',
        remarks || '', created_by || 'HR'
      ]
    );
    const newLeaveId = result.insertId;

    // Dynamically generated notification will be served via GET /api/notifications

    res.json({ success: true, id: newLeaveId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put("/api/company-leaves/:id", async (req, res) => {
  const { id } = req.params;
  const {
    leave_name,
    leave_type,
    start_date,
    end_date,
    applies_to,
    branch_id,
    department_id,
    is_paid,
    attendance_required,
    status,
    remarks
  } = req.body;

  try {
    await pool.query(
      `UPDATE company_leave_calendar SET
        leave_name = ?, leave_type = ?, start_date = ?, end_date = ?, applies_to = ?,
        branch_id = ?, department_id = ?, is_paid = ?, attendance_required = ?, status = ?,
        remarks = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
        leave_name, leave_type, start_date, end_date, applies_to,
        branch_id || null, department_id || null, is_paid ?? true, attendance_required ?? false, status || 'Active',
        remarks || '', id
      ]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete("/api/company-leaves/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(`DELETE FROM company_leave_calendar WHERE id = ?`, [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===============================
// ===============================
// USER IC NUMBER — Auto-populate Leave Form
// ===============================

// GET: Fetch saved IC number for a user
app.get("/api/user-ic", async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ success: false, error: "Missing userId" });
  try {
    // Ensure ic_number column exists (safe idempotent migration)
    await pool.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ic_number VARCHAR(20)`);
    const [rows] = await pool.query("SELECT ic_number FROM profiles WHERE user_id = ? LIMIT 1", [userId]);
    const icNumber = rows[0]?.ic_number || null;
    res.json({ success: true, icNumber });
  } catch (err) {
    console.error("GET /api/user-ic error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ROUTES
// ===============================
const PORT = process.env.PORT || 8080;

console.log("PORT FROM ENV:", process.env.PORT);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

// =================================================================
// END OF FILE
// =================================================================







