const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
const dotenv = require("dotenv");
const { Pool } = require("pg");

// Load backend environment variables
dotenv.config({ path: path.join(__dirname, ".env") });

const connectionString = process.env.DATABASE_URL;
const dbConfig = {
  host: process.env.DB_HOST || process.env.MYSQLHOST,
  user: process.env.DB_USER || process.env.MYSQLUSER,
  password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD,
  database: process.env.DB_NAME || process.env.MYSQLDATABASE,
  port: Number(process.env.DB_PORT || process.env.MYSQLPORT || 5432),
  ssl: { rejectUnauthorized: false }
};

const pgPool = connectionString ? new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 10
}) : new Pool(dbConfig);

function sanitizeParams(params) {
  if (!params || params.length === 0) return params;
  return params.map(p => {
    if (p === null || p === undefined) return null;
    if (typeof p === 'boolean') return p;
    return String(p);
  });
}

function mysqlToPostgres(sql, params) {
  if (params && params.length > 0) {
    let i = 1;
    sql = sql.replace(/\?/g, () => `$${i++}`);
  }
  return sql;
}

const pool = {
  query: async (sql, params) => {
    params = sanitizeParams(params);
    sql = mysqlToPostgres(sql, params);
    const res = await pgPool.query(sql, params);
    const rows = res.rows;
    return [rows, res.fields];
  }
};

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

async function uploadToSupabaseStorage(filePath, filename, mimeType) {
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

    await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let body = "";
        res.on("data", (chunk) => body += chunk);
        res.on("end", () => {
          if (res.statusCode === 200 || res.statusCode === 201) {
            console.log(`☁️ Uploaded ${filename} to Supabase!`);
            resolve(true);
          } else {
            console.error(`❌ Upload failed: status ${res.statusCode}`, body);
            resolve(false);
          }
        });
      });
      req.on("error", reject);
      req.write(fileContent);
      req.end();
    });
  } catch (err) {
    console.error("❌ Supabase upload failed:", err);
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

async function generatePDF(leave) {
  const PDFDocument = require("pdfkit");
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

  console.log(`📄 Generated: ${filename}`);
  const supabaseStoragePath = `${folderName}/${filename}`;
  await uploadToSupabaseStorage(filePath, supabaseStoragePath, "application/pdf");
}

(async () => {
  console.log("⚙️ Starting offline PDF generation script...");
  try {
    const [leaves] = await pool.query(
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
       JOIN profiles p ON p.user_id = lr.user_id`
    );

    console.log(`Total leave requests in database: ${leaves.length}`);

    for (const leave of leaves) {
      await generatePDF(leave);
    }

    console.log("🎉 PDF generation completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Script failed:", err);
    process.exit(1);
  }
})();
