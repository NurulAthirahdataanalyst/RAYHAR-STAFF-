const nodemailer = require("nodemailer");

let testAccount = null;
let transporter = null;

// Initialize the Nodemailer transport with Ethereal (for testing)
async function initMailer() {
  if (transporter) return transporter;

  try {
    // Generate a test account on the fly
    testAccount = await nodemailer.createTestAccount();

    // Create reusable transporter object using the default SMTP transport
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: testAccount.user, // generated ethereal user
        pass: testAccount.pass, // generated ethereal password
      },
    });

    console.log("Nodemailer: Ethereal test account initialized.");
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
    const tp = await initMailer();
    if (!tp) {
      console.warn("Mailer not initialized, skipping email.");
      return;
    }

    const info = await tp.sendMail({
      from: '"Rayhar Leave Portal" <no-reply@rayhar.com>',
      to,
      subject,
      html,
    });

    console.log("-----------------------------------------");
    console.log(`Email sent to ${to} (Subject: ${subject})`);
    console.log(`Message ID: ${info.messageId}`);
    // Preview URL is specifically for Ethereal
    console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    console.log("-----------------------------------------");
    
    return info;
  } catch (err) {
    console.error(`Failed to send email to ${to}:`, err);
  }
}

module.exports = {
  sendNotificationEmail,
};
