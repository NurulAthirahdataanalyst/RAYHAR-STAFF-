/**
 * Sends an email notification using Brevo (Sendinblue) HTTP API
 * This bypasses hosting firewalls that block standard SMTP ports.
 * @param {string} to - The recipient email address.
 * @param {string} subject - The subject of the email.
 * @param {string} html - The HTML content of the email.
 */
async function sendNotificationEmail(to, subject, html) {
  try {
    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.SMTP_USER; // E.g., your verified Gmail address

    if (!apiKey || !senderEmail) {
      console.warn("Mailer not initialized. Please set BREVO_API_KEY and SMTP_USER in .env. Skipping email to:", to);
      throw new Error("Brevo credentials not configured.");
    }

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "accept": "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: "Rayhar Staff Portal",
          email: senderEmail,
        },
        to: [
          {
            email: to,
          },
        ],
        subject: subject,
        htmlContent: html,
      }),
    });

    // Handle responses that don't return JSON body properly (e.g. 204 or errors)
    let data = {};
    try {
      data = await response.json();
    } catch (e) {
      // Ignore JSON parse errors if response was empty
    }

    if (!response.ok) {
      console.error("Brevo API error response:", data);
      throw new Error(`Brevo API Error: ${data.message || "Failed to send email"}`);
    }

    console.log("-----------------------------------------");
    console.log(`Email sent via Brevo to ${to} (Subject: ${subject})`);
    console.log(`Message ID: ${data.messageId || 'N/A'}`);
    console.log("-----------------------------------------");

    return data;
  } catch (err) {
    console.error(`Failed to send email to ${to}:`, err);
    throw err;
  }
}

module.exports = {
  sendNotificationEmail,
};
