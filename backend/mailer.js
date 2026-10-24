const nodemailer = require("nodemailer");
const {
  isValidEmailAddress,
  validateEnvelopeRecipients,
} = require("./utils/emailValidator");

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
 * @param {{ cc?: string, bcc?: string }} [options] - Optional validated CC/BCC recipients.
 */
async function sendNotificationEmail(to, subject, html, options = {}) {
  try {
    const validatedRecipients = validateEnvelopeRecipients(
      {
        to,
        cc: options?.cc,
        bcc: options?.bcc,
      },
      { allowArray: false }
    );

    const tp = initMailer();
    if (!tp) {
      console.warn("Mailer not initialized. Please set SMTP credentials in .env. Skipping email to:", validatedRecipients.to);
      throw new Error("SMTP credentials not configured.");
    }

    const safeSmtpUser = isValidEmailAddress(process.env.SMTP_USER)
      ? process.env.SMTP_USER.trim()
      : undefined;
    const fromAddress =
      process.env.SMTP_FROM ||
      (safeSmtpUser ? `"Rayhar Leave Portal" <${safeSmtpUser}>` : undefined);

    const safeSubject = String(subject || "").replace(/[\r\n]+/g, " ").trim();

    const mailOptions = {
      from: fromAddress,
      to: validatedRecipients.to,
      subject: safeSubject,
      html,
    };

    if (validatedRecipients.cc) {
      mailOptions.cc = validatedRecipients.cc;
    }
    if (validatedRecipients.bcc) {
      mailOptions.bcc = validatedRecipients.bcc;
    }

    const info = await tp.sendMail(mailOptions);

    console.log("-----------------------------------------");
    console.log(`Email sent to ${validatedRecipients.to} (Subject: ${safeSubject})`);
    console.log(`Message ID: ${info.messageId}`);
    console.log("-----------------------------------------");
    
    return info;
  } catch (err) {
    console.error(`Failed to send email to ${typeof to === "string" ? to : "[invalid-recipient]"}:`, err);
    throw err;
  }
}

module.exports = {
  sendNotificationEmail,
};
