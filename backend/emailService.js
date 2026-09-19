const { BrevoClient } = require('@getbrevo/brevo');
require('dotenv').config();

const apiInstance = new BrevoClient({
  apiKey: process.env.BREVO_API_KEY || ''
});
if (!process.env.BREVO_API_KEY) {
  console.warn("BREVO_API_KEY is not set in environment variables");
}

function getLeaveApprovalHtml(data) {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body {
    margin: 0;
    padding: 0;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background-color: #f4f5f7;
    color: #333333;
  }
  .container {
    max-width: 600px;
    margin: 40px auto;
    background-color: #ffffff;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  }
  .header {
    background-color: #7B0099;
    padding: 24px;
    text-align: center;
    color: #ffffff;
  }
  .header h1 {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
    letter-spacing: 0.5px;
  }
  .content {
    padding: 32px 24px;
  }
  .greeting {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 16px;
    color: #1a1a1a;
  }
  .message {
    font-size: 15px;
    line-height: 1.6;
    margin-bottom: 24px;
    color: #4a4a4a;
  }
  .card {
    background-color: #fafafa;
    border: 1px solid #eaeaea;
    border-radius: 6px;
    padding: 20px;
    margin-bottom: 32px;
  }
  .card-row {
    display: flex;
    margin-bottom: 12px;
    font-size: 14px;
  }
  .card-row:last-child {
    margin-bottom: 0;
  }
  .card-label {
    font-weight: 600;
    color: #7B0099;
    width: 130px;
    flex-shrink: 0;
  }
  .card-value {
    color: #333333;
    font-weight: 500;
  }
  .button-container {
    text-align: center;
    margin-top: 32px;
    margin-bottom: 16px;
  }
  .action-button {
    display: inline-block;
    background-color: #7B0099;
    color: #ffffff !important;
    text-decoration: none;
    padding: 14px 28px;
    border-radius: 4px;
    font-weight: 600;
    font-size: 15px;
  }
  .footer {
    background-color: #f9f9f9;
    padding: 24px;
    text-align: center;
    border-top: 1px solid #eaeaea;
    font-size: 12px;
    color: #888888;
    line-height: 1.5;
  }
  .footer p {
    margin: 4px 0;
  }
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Rayhar Staff Portal</h1>
    </div>
    <div class="content">
      <div class="greeting">Hello ${data.approverName},</div>
      <div class="message">
        A new leave application has been submitted and requires your review and approval.
      </div>
      
      <div class="card">
        <div class="card-row">
          <div class="card-label">👤 Employee Name:</div>
          <div class="card-value">${data.employeeName}</div>
        </div>
        <div class="card-row">
          <div class="card-label">🆔 Employee ID:</div>
          <div class="card-value">${data.employeeId || '-'}</div>
        </div>
        <div class="card-row">
          <div class="card-label">🏢 Department:</div>
          <div class="card-value">${data.department || '-'}</div>
        </div>
        <div class="card-row">
          <div class="card-label">📍 Branch:</div>
          <div class="card-value">${data.branch || '-'}</div>
        </div>
        <div class="card-row">
          <div class="card-label">🏷️ Leave Type:</div>
          <div class="card-value">${data.leaveType}</div>
        </div>
        <div class="card-row">
          <div class="card-label">📅 Leave Period:</div>
          <div class="card-value">${data.startDate} - ${data.endDate}</div>
        </div>
        <div class="card-row">
          <div class="card-label">⏳ Total Days:</div>
          <div class="card-value">${data.totalDays}</div>
        </div>
        <div class="card-row">
          <div class="card-label">📝 Reason:</div>
          <div class="card-value">${data.leaveReason || 'N/A'}</div>
        </div>
      </div>

      <div class="button-container">
        <a href="${data.approvalUrl}" class="action-button">Review Leave Application</a>
      </div>
    </div>
    <div class="footer">
      <p>This is an automated notification from <strong>Rayhar Staff Portal</strong>.</p>
      <p>Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
  `;
}

async function sendLeaveApprovalEmail(data) {
  if (!process.env.BREVO_API_KEY) return;

  const email = {};
  
  email.sender = {
    name: "Rayhar Staff Portal",
    email: "noreply@rayhar.com"
  };
  
  email.to = [
    {
      email: data.approverEmail,
      name: data.approverName
    }
  ];

  email.subject = `Leave Approval Required: ${data.employeeName} (${data.leaveType})`;
  email.htmlContent = getLeaveApprovalHtml(data);
  
  try {
    const result = await apiInstance.transactionalEmails.sendTransacEmail(email);
    console.log("Leave approval email sent successfully.", result);
    return result;
  } catch (err) {
    console.error("Error sending leave approval email:", err);
  }
}

async function sendLateEmail(data) {
  if (!process.env.BREVO_API_KEY) return;

  const email = {};
  email.sender = { name: "Rayhar Staff Portal", email: "noreply@rayhar.com" };
  email.to = [{ email: data.employeeEmail, name: data.employeeName }];
  email.subject = "Attendance Notice: Late Clock-In";
  email.htmlContent = `
    <div style="font-family: sans-serif; color: #333;">
      <h2 style="color: #7B0099;">Rayhar Staff Portal</h2>
      <p>Hello ${data.employeeName},</p>
      <p>This is an automated notice that your clock-in today at <strong>${data.clockInTime}</strong> was marked as <strong>LATE</strong>.</p>
      <p>Please ensure you adhere to the scheduled working hours. If you have an approved reason, please notify your manager.</p>
      <p style="font-size: 12px; color: #888;">This is an automated notification. Please do not reply.</p>
    </div>
  `;
  try {
    await apiInstance.transactionalEmails.sendTransacEmail(email);
  } catch (err) {
    console.error("Error sending late email:", err);
  }
}

async function sendLeaveApprovedEmail(data) {
  if (!process.env.BREVO_API_KEY) return;

  const email = {};
  email.sender = { name: "Rayhar Staff Portal", email: "noreply@rayhar.com" };
  email.to = [{ email: data.employeeEmail, name: data.employeeName }];
  email.subject = "Leave Request Approved";
  email.htmlContent = `
    <div style="font-family: sans-serif; color: #333;">
      <h2 style="color: #7B0099;">Rayhar Staff Portal</h2>
      <p>Hello ${data.employeeName},</p>
      <p>Your leave request for <strong>${data.leaveType}</strong> from <strong>${data.startDate}</strong> to <strong>${data.endDate}</strong> has been <strong>Approved</strong>.</p>
      <p style="font-size: 12px; color: #888;">This is an automated notification. Please do not reply.</p>
    </div>
  `;
  try {
    await apiInstance.transactionalEmails.sendTransacEmail(email);
  } catch (err) {
    console.error("Error sending leave approved email:", err);
  }
}

async function sendLeaveRejectedEmail(data) {
  if (!process.env.BREVO_API_KEY) return;

  const email = {};
  email.sender = { name: "Rayhar Staff Portal", email: "noreply@rayhar.com" };
  email.to = [{ email: data.employeeEmail, name: data.employeeName }];
  email.subject = "Leave Request Rejected";
  email.htmlContent = `
    <div style="font-family: sans-serif; color: #333;">
      <h2 style="color: #7B0099;">Rayhar Staff Portal</h2>
      <p>Hello ${data.employeeName},</p>
      <p>Your leave request for <strong>${data.leaveType}</strong> from <strong>${data.startDate}</strong> to <strong>${data.endDate}</strong> has been <strong>Rejected</strong>.</p>
      <p>Reason: ${data.rejectionReason || 'No reason provided.'}</p>
      <p>Please contact your manager for further details.</p>
      <p style="font-size: 12px; color: #888;">This is an automated notification. Please do not reply.</p>
    </div>
  `;
  try {
    await apiInstance.transactionalEmails.sendTransacEmail(email);
  } catch (err) {
    console.error("Error sending leave rejected email:", err);
  }
}

async function sendPasswordResetEmail(data) {
  if (!process.env.BREVO_API_KEY) return;

  const email = {};
  email.sender = { name: "Rayhar Staff Portal", email: "noreply@rayhar.com" };
  email.to = [{ email: data.employeeEmail, name: data.employeeName }];
  email.subject = "Rayhar Staff Portal - Password Reset";
  email.htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
      <h2 style="color: #7B0099;">Password Reset Request</h2>
      <p>Hello ${data.employeeName || 'Staff'},</p>
      <p>We received a request to reset your password for the Rayhar Employee Portal.</p>
      <p>Click the button below to set a new password. This link will expire in 15 minutes.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.resetLink}" style="background-color: #7B0099; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
      </div>
      <p>If you did not request a password reset, please ignore this email or contact HR if you have concerns.</p>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #888; text-align: center;">Rayhar Staff Portal</p>
    </div>
  `;
  try {
    await apiInstance.transactionalEmails.sendTransacEmail(email);
  } catch (err) {
    console.error("Error sending password reset email:", err);
  }
}

async function sendOutstationAssignedEmail(data) {
  if (!process.env.BREVO_API_KEY) return;

  const email = {};
  email.sender = { name: "Rayhar Staff Portal", email: "noreply@rayhar.com" };
  email.to = [{ email: data.employeeEmail, name: data.employeeName }];
  email.subject = `Temporary Branch Assignment: ${data.destination}`;
  email.htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
      <h2 style="color: #7B0099;">Temporary Branch Assignment</h2>
      <p>Hello ${data.employeeName},</p>
      <p>You have been assigned to a temporary branch/outstation duties.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Destination:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.destination}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Start Date:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.startDate}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>End Date:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.endDate}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Purpose:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.purpose || 'N/A'}</td></tr>
      </table>
      <p>Please log in to the Employee Portal for more details.</p>
      <p style="font-size: 12px; color: #888; text-align: center; margin-top: 30px;">Rayhar Staff Portal</p>
    </div>
  `;
  try {
    await apiInstance.transactionalEmails.sendTransacEmail(email);
  } catch (err) {
    console.error("Error sending outstation assigned email:", err);
  }
}

async function sendOutstationUpdatedEmail(data) {
  if (!process.env.BREVO_API_KEY) return;

  const email = {};
  email.sender = { name: "Rayhar Staff Portal", email: "noreply@rayhar.com" };
  email.to = [{ email: data.employeeEmail, name: data.employeeName }];
  email.subject = `Update: Temporary Branch Assignment to ${data.destination}`;
  email.htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
      <h2 style="color: #7B0099;">Temporary Branch Update</h2>
      <p>Hello ${data.employeeName},</p>
      <p>Your temporary branch/outstation assignment has been <strong>Updated</strong>.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Destination:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.destination}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Start Date:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.startDate}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>End Date:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.endDate}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Purpose:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.purpose || 'N/A'}</td></tr>
      </table>
      <p>Please log in to the Employee Portal to view the updated details.</p>
      <p style="font-size: 12px; color: #888; text-align: center; margin-top: 30px;">Rayhar Staff Portal</p>
    </div>
  `;
  try {
    await apiInstance.transactionalEmails.sendTransacEmail(email);
  } catch (err) {
    console.error("Error sending outstation updated email:", err);
  }
}

async function sendLeaveSubmittedEmailToUser(data) {
  if (!process.env.BREVO_API_KEY) return;
  const email = {
    sender: { name: "Rayhar Staff Portal", email: "noreply@rayhar.com" },
    to: [{ email: data.employeeEmail, name: data.employeeName }],
    subject: `Leave Request Submitted: ${data.leaveType}`,
    htmlContent: `
      <div style="font-family: sans-serif; color: #333;">
        <h2 style="color: #7B0099;">Rayhar Staff Portal</h2>
        <p>Hello ${data.employeeName},</p>
        <p>Your leave request has been successfully submitted and is pending approval.</p>
        <p><strong>Leave Type:</strong> ${data.leaveType}</p>
        <p><strong>Date:</strong> ${data.startDate} to ${data.endDate}</p>
        <p>You can check the status of your request in the Staff Portal dashboard.</p>
        <p style="font-size: 12px; color: #888; margin-top: 20px;">This is an automated notification. Please do not reply.</p>
      </div>
    `
  };
  try {
    await apiInstance.transactionalEmails.sendTransacEmail(email);
  } catch (err) {
    console.error("Error sending leave submitted email to user:", err);
  }
}

module.exports = {
  sendLeaveSubmittedEmailToUser,
  sendLeaveApprovalEmail,
  sendLateEmail,
  sendLeaveApprovedEmail,
  sendLeaveRejectedEmail,
  sendPasswordResetEmail,
  sendOutstationAssignedEmail,
  sendOutstationUpdatedEmail
};
