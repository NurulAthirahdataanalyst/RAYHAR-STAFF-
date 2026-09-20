const axios = require('axios');
let mailer = null;
try {
  mailer = require('../mailer');
} catch (e) {
  // mailer optional
}

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM || 'Rayhar HR Portal <onboarding@resend.dev>';
const PORTAL_URL = process.env.PORTAL_URL || 'https://rayhar-staff.vercel.app';

/**
 * Sends an email using Resend API (primary) with fallback to SMTP
 */
async function sendEmail({ to, subject, html }) {
  if (!to) {
    console.warn('⚠️ sendEmail: Missing recipient email address.');
    return null;
  }

  // 1. Try Resend if API key is present
  if (process.env.RESEND_API_KEY) {
    try {
      const response = await axios.post(
        'https://api.resend.com/emails',
        {
          from: process.env.RESEND_FROM || 'Rayhar Leave Portal <onboarding@resend.dev>',
          to: Array.isArray(to) ? to : [to],
          subject,
          html,
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );
      console.log(`📧 [Resend] Email sent to ${to} (Subject: "${subject}") - ID: ${response.data?.id}`);
      return response.data;
    } catch (err) {
      console.error(`❌ [Resend] Error sending to ${to}:`, err.response?.data || err.message);
    }
  }

  // 2. Fallback to Nodemailer
  if (mailer && typeof mailer.sendNotificationEmail === 'function') {
    try {
      return await mailer.sendNotificationEmail(to, subject, html);
    } catch (smtpErr) {
      console.warn(`⚠️ [EmailService] SMTP fallback failed:`, smtpErr.message);
    }
  }

  console.log(`ℹ️ [EmailService simulated] Email to ${to} | Subject: "${subject}"`);
  return { simulated: true };
}

/**
 * Send New Leave Application Email to Approver (HOD / Branch Leader)
 */
async function sendLeaveRequestEmail({ approverEmail, approverName, employeeName, leaveType, startDate, endDate, days, reason, leaveId }) {
  const subject = `🔔 New Leave Request: ${employeeName} - ${leaveType}`;
  const actionUrl = `${PORTAL_URL}/leave/admin?leaveId=${leaveId}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
      <div style="background-color: #0f766e; padding: 16px; border-radius: 6px 6px 0 0; color: white; text-align: center;">
        <h2 style="margin: 0; font-size: 20px;">Rayhar Leave Portal</h2>
        <p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.9;">New Leave Application Requires Your Action</p>
      </div>
      
      <div style="padding: 20px;">
        <p style="font-size: 15px; color: #334155;">Hello <strong>${approverName || 'Approver'}</strong>,</p>
        <p style="font-size: 14px; color: #475569;">A new leave application has been submitted and is pending your approval:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px 0; color: #64748b; width: 140px;">Employee</td>
            <td style="padding: 8px 0; color: #0f172a; font-weight: bold;">${employeeName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px 0; color: #64748b;">Leave Type</td>
            <td style="padding: 8px 0; color: #0f172a; font-weight: bold;">${leaveType}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px 0; color: #64748b;">Duration</td>
            <td style="padding: 8px 0; color: #0f172a;">${startDate} to ${endDate} (<strong>${days} day(s)</strong>)</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Reason</td>
            <td style="padding: 8px 0; color: #0f172a;">${reason || '-'}</td>
          </tr>
        </table>
        
        <div style="text-align: center; margin: 30px 0 10px 0;">
          <a href="${actionUrl}" style="background-color: #0f766e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 14px;">Review & Approve in Portal</a>
        </div>
      </div>
      
      <div style="border-top: 1px solid #e2e8f0; padding-top: 15px; text-align: center; color: #94a3b8; font-size: 12px;">
        <p style="margin: 0;">Rayhar Travels Sdn. Bhd. • Employee Attendance & Leave Portal</p>
      </div>
    </div>
  `;

  return sendEmail({ to: approverEmail, subject, html });
}

/**
 * Send Leave Approved Email to Employee
 */
async function sendLeaveApprovedEmail({ employeeEmail, employeeName, leaveType, startDate, endDate, days, approverName }) {
  const subject = `🟢 Leave Approved: ${leaveType} (${startDate} - ${endDate})`;
  const portalUrl = `${PORTAL_URL}/leave`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
      <div style="background-color: #16a34a; padding: 16px; border-radius: 6px 6px 0 0; color: white; text-align: center;">
        <h2 style="margin: 0; font-size: 20px;">Rayhar Leave Portal</h2>
        <p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.9;">Leave Application Approved</p>
      </div>
      
      <div style="padding: 20px;">
        <p style="font-size: 15px; color: #334155;">Hello <strong>${employeeName}</strong>,</p>
        <p style="font-size: 14px; color: #475569;">Good news! Your leave request has been <strong>approved</strong>.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px 0; color: #64748b; width: 140px;">Leave Type</td>
            <td style="padding: 8px 0; color: #0f172a; font-weight: bold;">${leaveType}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px 0; color: #64748b;">Approved Dates</td>
            <td style="padding: 8px 0; color: #0f172a;">${startDate} to ${endDate} (<strong>${days} day(s)</strong>)</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Approved By</td>
            <td style="padding: 8px 0; color: #0f172a;">${approverName || 'Management'}</td>
          </tr>
        </table>
        
        <div style="text-align: center; margin: 30px 0 10px 0;">
          <a href="${portalUrl}" style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 14px;">View Leave Balance</a>
        </div>
      </div>
      
      <div style="border-top: 1px solid #e2e8f0; padding-top: 15px; text-align: center; color: #94a3b8; font-size: 12px;">
        <p style="margin: 0;">Rayhar Travels Sdn. Bhd. • Employee Attendance & Leave Portal</p>
      </div>
    </div>
  `;

  return sendEmail({ to: employeeEmail, subject, html });
}

/**
 * Send Leave Rejected Email to Employee
 */
async function sendLeaveRejectedEmail({ employeeEmail, employeeName, leaveType, startDate, endDate, approverName, remarks }) {
  const subject = `🔴 Leave Request Rejected: ${leaveType}`;
  const portalUrl = `${PORTAL_URL}/leave`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
      <div style="background-color: #dc2626; padding: 16px; border-radius: 6px 6px 0 0; color: white; text-align: center;">
        <h2 style="margin: 0; font-size: 20px;">Rayhar Leave Portal</h2>
        <p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.9;">Leave Application Not Approved</p>
      </div>
      
      <div style="padding: 20px;">
        <p style="font-size: 15px; color: #334155;">Hello <strong>${employeeName}</strong>,</p>
        <p style="font-size: 14px; color: #475569;">Your leave application for <strong>${leaveType}</strong> (${startDate} to ${endDate}) was not approved.</p>
        
        <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; color: #991b1b; font-size: 14px;">
            <strong>Approver Remarks / Reason:</strong><br/>
            ${remarks || 'No specific remarks provided.'}
          </p>
        </div>
        
        <p style="font-size: 13px; color: #64748b;">Reviewed by: <strong>${approverName || 'Management'}</strong></p>
        
        <div style="text-align: center; margin: 30px 0 10px 0;">
          <a href="${portalUrl}" style="background-color: #475569; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 14px;">Open Portal</a>
        </div>
      </div>
      
      <div style="border-top: 1px solid #e2e8f0; padding-top: 15px; text-align: center; color: #94a3b8; font-size: 12px;">
        <p style="margin: 0;">Rayhar Travels Sdn. Bhd. • Employee Attendance & Leave Portal</p>
      </div>
    </div>
  `;

  return sendEmail({ to: employeeEmail, subject, html });
}

/**
 * Send Leave Submitted Email to Employee
 */
async function sendLeaveSubmittedEmailToUser({ employeeEmail, employeeName, leaveType, startDate, endDate }) {
  const subject = `dY"" Leave Request Submitted: ${leaveType}`;
  const portalUrl = `${PORTAL_URL}/leave`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
      <div style="background-color: #0ea5e9; padding: 16px; border-radius: 6px 6px 0 0; color: white; text-align: center;">
        <h2 style="margin: 0; font-size: 20px;">Rayhar Leave Portal</h2>
        <p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.9;">Leave Application Submitted Successfully</p>
      </div>
      
      <div style="padding: 20px;">
        <p style="font-size: 15px; color: #334155;">Hello <strong>${employeeName}</strong>,</p>
        <p style="font-size: 14px; color: #475569;">Your leave request has been submitted and is currently pending approval.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px 0; color: #64748b; width: 140px;">Leave Type</td>
            <td style="padding: 8px 0; color: #0f172a; font-weight: bold;">${leaveType}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Dates</td>
            <td style="padding: 8px 0; color: #0f172a;">${startDate} to ${endDate}</td>
          </tr>
        </table>
        
        <div style="text-align: center; margin: 30px 0 10px 0;">
          <a href="${portalUrl}" style="background-color: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 14px;">View Leave Status</a>
        </div>
      </div>
      
      <div style="border-top: 1px solid #e2e8f0; padding-top: 15px; text-align: center; color: #94a3b8; font-size: 12px;">
        <p style="margin: 0;">Rayhar Travels Sdn. Bhd. ? Employee Attendance & Leave Portal</p>
      </div>
    </div>
  `;

  return sendEmail({ to: employeeEmail, subject, html });
}

module.exports = {
  sendEmail,
  sendLeaveRequestEmail,
  sendLeaveApprovedEmail,
  sendLeaveRejectedEmail,
  sendLeaveSubmittedEmailToUser,
};
