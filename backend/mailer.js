const nodemailer = require("nodemailer");

let transporter = null;

// Initialize the Nodemailer transport with real SMTP
function initMailer() {
  if (transporter) return transporter;

  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  const smtpPort = process.env.SMTP_PORT || 465;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpUser || !smtpPass) {
    console.warn("⚠️ SMTP_USER or SMTP_PASS is missing in environment variables. Email sending will fail.");
    return null;
  }

  try {
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(smtpPort),
      secure: Number(smtpPort) === 465, // true for 465, false for other ports (like 587)
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      connectionTimeout: 5000, // 5 seconds to prevent infinite hanging
      greetingTimeout: 5000,
      socketTimeout: 5000
    });

    console.log("Nodemailer: SMTP initialized successfully.");
    return transporter;
  } catch (err) {
    console.error("Failed to initialize Nodemailer:", err);
    return null;
  }
}

/**
 * Sends an email notification.
 * @param {string} to - The recipient email address.
 * @param {string} subject - The subject of the email.
 * @param {string} html - The HTML content of the email.
 */
async function sendNotificationEmail(to, subject, html) {
  try {
    const tp = initMailer();
    if (!tp) {
      console.warn("Mailer not initialized. Please set SMTP credentials in .env. Skipping email to:", to);
      throw new Error("SMTP credentials not configured.");
    }

    const fromAddress = process.env.SMTP_FROM || `"Rayhar Leave Portal" <${process.env.SMTP_USER}>`;

    const info = await tp.sendMail({
      from: fromAddress,
      to,
      subject,
      html,
    });

    console.log("-----------------------------------------");
    console.log(`Email sent to ${to} (Subject: ${subject})`);
    console.log(`Message ID: ${info.messageId}`);
    console.log("-----------------------------------------");
    
    return info;
  } catch (err) {
    console.error(`Failed to send email to ${to}:`, err);
    throw err;
  }
}

module.exports = {
  sendNotificationEmail,
};
