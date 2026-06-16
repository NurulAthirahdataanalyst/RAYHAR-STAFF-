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

    doc.fontSize(22).font("Helvetica-Bold").fillColor("#7B0099").text("RAYHAR GROUP", { align: "center" });
    doc.fontSize(14).font("Helvetica-Bold").fillColor("#333333").text("PERMOHONAN CUTI KAKITANGAN", { align: "center", characterSpacing: 1 });
    doc.moveDown();

    doc.moveTo(50, doc.y).lineTo(562, doc.y).strokeColor("#7B0099").lineWidth(2).stroke();
    doc.moveDown(1.5);

    const leftCol = 50;
    const rightCol = 180;
    
    const drawRow = (label, value, isStatus = false) => {
      doc.fontSize(10).font("Helvetica-Bold").fillColor("#666666").text(label.toUpperCase(), leftCol, doc.y);
      doc.font("Helvetica-Bold");
      if (isStatus) {
        doc.fillColor("#7B0099").text(String(value).toUpperCase(), rightCol, doc.y - 12);
      } else {
        doc.fillColor("#111111").text(String(value), rightCol, doc.y - 12);
      }
      doc.moveDown(0.8);
    };

    drawRow("Nama Penuh", employeeName);
    drawRow("Cawangan", employeeBranch);
    drawRow("Jenis Cuti", leave.leave_type);
    drawRow("Status", leave.status || "PENDING", true);

    const boxY = doc.y;
    doc.rect(leftCol, boxY, 512, 50).fillAndStroke("#f3e8ff", "#e9d5ff");
    
    doc.fontSize(9).font("Helvetica-Bold").fillColor("#7B0099");
    doc.text("DARI", leftCol + 20, boxY + 12, { width: 100, align: "center" });
    doc.text("HINGGA", leftCol + 150, boxY + 12, { width: 100, align: "center" });
    doc.text("HARI", leftCol + 350, boxY + 12, { width: 100, align: "center" });

    const startDateStr = leave.start_date instanceof Date ? leave.start_date.toISOString().slice(0, 10) : String(leave.start_date).slice(0, 10);
    const endDateStr = leave.end_date instanceof Date ? leave.end_date.toISOString().slice(0, 10) : String(leave.end_date).slice(0, 10);

    doc.fontSize(12).font("Helvetica-Bold").fillColor("#111111");
    doc.text(startDateStr, leftCol + 20, boxY + 26, { width: 100, align: "center" });
    doc.text(endDateStr, leftCol + 150, boxY + 26, { width: 100, align: "center" });
    doc.fontSize(16).fillColor("#7B0099").text(String(leave.days), leftCol + 350, boxY + 23, { width: 100, align: "center" });

    doc.y = boxY + 70;
    doc.moveDown();

    doc.fontSize(10).font("Helvetica-Bold").fillColor("#666666").text("SEBAB / TUJUAN");
    doc.moveDown(0.4);
    doc.fontSize(11).font("Helvetica-Oblique").fillColor("#333333").text(`"${leave.reason || '-'}"`, { indent: 15 });
    doc.moveDown(1.5);

    doc.fontSize(10).font("Helvetica-Bold").fillColor("#7B0099").text("MAKLUMAT WARIS (KECEMASAN)");
    doc.moveTo(leftCol, doc.y).lineTo(562, doc.y).strokeColor("#cccccc").lineWidth(1).stroke();
    doc.moveDown(0.8);

    const drawWarisRow = (label, value) => {
      doc.fontSize(9).font("Helvetica-Bold").fillColor("#666666").text(label, leftCol, doc.y);
      doc.font("Helvetica").fillColor("#111111").text(String(value), leftCol + 120, doc.y - 11);
      doc.moveDown(0.6);
    };

    drawWarisRow("Nama Waris", leave.waris_nama || "N/A");
    drawWarisRow("Hubungan", leave.waris_hubungan || "N/A");
    drawWarisRow("No. Telefon", leave.waris_phone || "N/A");
    drawWarisRow("Alamat Waris", leave.waris_alamat || "N/A");
    doc.moveDown();

    const sigY = Math.max(doc.y, 620);
    doc.moveTo(leftCol + 10, sigY).lineTo(leftCol + 180, sigY).strokeColor("#333333").lineWidth(1).stroke();
    doc.moveTo(leftCol + 320, sigY).lineTo(leftCol + 490, sigY).stroke();

    doc.fontSize(9).font("Helvetica-Bold").fillColor("#555555");
    doc.text("Tandatangan Kakitangan", leftCol + 10, sigY + 5, { width: 170, align: "center" });
    doc.text("Kelulusan Pengurus / HR", leftCol + 320, sigY + 5, { width: 170, align: "center" });

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
      `SELECT lr.*, p.full_name, p.branch 
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
