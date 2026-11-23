const axios = require("axios");
const { format } = require("date-fns");

function escapeTelegramHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatTelegramDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return format(d, "dd MMM yyyy");
}

function formatTelegramLeaveStatus(status) {
  const raw = String(status || "").trim();
  if (!raw) return "Pending Approval";
  if (raw.toLowerCase() === "approved") return "Approved (Auto-Approved)";
  if (/^pending\b/i.test(raw) && !/approval$/i.test(raw)) {
    return `${raw} Approval`;
  }
  return raw;
}

/**
 * Send a raw HTML-formatted message to the configured HR Telegram group.
 * @param {string} message
 */
async function sendTelegramMessage(message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn(
      "[Telegram] Skipping notification: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set."
    );
    return { skipped: true };
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  const response = await axios.post(
    url,
    {
      chat_id: chatId,
      text: message,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    },
    { timeout: 10000 }
  );

  return response.data;
}

/**
 * Build and send a notification-only HR Telegram alert for a newly submitted leave request.
 * @param {object} leaveData
 */
function buildNewLeaveRequestMessage(leaveData) {
  const employeeName = escapeTelegramHtml(
    leaveData?.full_name || leaveData?.employee_name || leaveData?.user_id || "Unknown Staff"
  );
  const leaveType = escapeTelegramHtml(leaveData?.leave_type || "Leave");
  const startDate = formatTelegramDate(leaveData?.start_date);
  const endDate = formatTelegramDate(leaveData?.end_date);
  const dateRange =
    startDate === endDate ? startDate : `${startDate} - ${endDate}`;
  const days = Number(leaveData?.days);
  const daysSuffix =
    Number.isFinite(days) && days > 0
      ? ` (${days} ${days === 1 ? "day" : "days"})`
      : "";
  const statusLabel = escapeTelegramHtml(
    formatTelegramLeaveStatus(leaveData?.status)
  );

  const lines = [
    "🔔 <b>New Leave Request</b>",
    "",
    "<b>Employee:</b>",
    employeeName,
  ];

  if (leaveData?.branch || leaveData?.department) {
    const locationParts = [leaveData.branch, leaveData.department]
      .map((v) => String(v || "").trim())
      .filter(Boolean);
    if (locationParts.length > 0) {
      lines.push("", "<b>Branch / Dept:</b>", escapeTelegramHtml(locationParts.join(" • ")));
    }
  }

  lines.push(
    "",
    "<b>Leave Type:</b>",
    leaveType,
    "",
    "<b>Date:</b>",
    `${escapeTelegramHtml(dateRange)}${escapeTelegramHtml(daysSuffix)}`,
    "",
    "<b>Status:</b>",
    statusLabel
  );

  return lines.join("\n");
}

async function sendNewLeaveRequestTelegramNotification(leaveData) {
  if (!leaveData) return { skipped: true };
  const message = buildNewLeaveRequestMessage(leaveData);
  return sendTelegramMessage(message);
}

module.exports = {
  sendTelegramMessage,
  buildNewLeaveRequestMessage,
  sendNewLeaveRequestTelegramNotification,
};
