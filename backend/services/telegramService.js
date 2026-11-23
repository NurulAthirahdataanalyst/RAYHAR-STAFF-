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
  return format(d, "dd MMMM yyyy");
}

function formatDaysTitleCase(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "-";
  const formatted = Number.isInteger(num) ? String(num) : String(Number(num.toFixed(2)));
  return `${formatted} ${num === 1 ? "Day" : "Days"}`;
}

function isAnnualOrEmergencyLeave(leaveType) {
  const normalized = String(leaveType || "").trim().toLowerCase();
  return [
    "annual leave",
    "annual/emergency leave",
    "annual & emergency leave",
    "emergency leave",
    "cuti tahunan",
  ].includes(normalized);
}

function formatTelegramLeaveStatus(status, { isAutoApproved = false } = {}) {
  const raw = String(status || "").trim();
  if (!raw) return "Pending Approval";
  if (raw.toLowerCase() === "approved") {
    return isAutoApproved ? "Approved (Auto-Approved)" : "Approved";
  }
  if (raw.toLowerCase() === "rejected") {
    return "Rejected";
  }
  if (/^pending\b/i.test(raw) && !/approval$/i.test(raw)) {
    return `${raw} Approval`;
  }
  return raw;
}

function getTelegramConfig() {
  const token = String(process.env.TELEGRAM_BOT_TOKEN || "").trim();
  const chatId = String(process.env.TELEGRAM_CHAT_ID || "").trim();
  return { token, chatId };
}

/**
 * Send a raw HTML-formatted message to the configured HR Telegram group.
 * @param {string} message
 * @param {{ replyToMessageId?: number|string|null }} [options]
 */
async function sendTelegramMessage(message, options = {}) {
  const { token, chatId } = getTelegramConfig();

  if (!token || !chatId) {
    console.warn(
      "[Telegram] Skipping notification: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set."
    );
    return { skipped: true };
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const payload = {
    chat_id: chatId,
    text: message,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  };

  const replyId = Number(options?.replyToMessageId);
  if (Number.isFinite(replyId) && replyId > 0) {
    payload.reply_parameters = {
      message_id: replyId,
      allow_sending_without_reply: true,
    };
  }

  const response = await axios.post(url, payload, { timeout: 10000 });
  const messageId = response.data?.result?.message_id ?? null;

  console.log(
    `[Telegram] Notification sent to chat ${chatId} (message_id: ${messageId ?? "ok"})`
  );
  return { ...response.data, messageId };
}

/**
 * Edit an existing Telegram message in place (used to keep the original request status live).
 * @param {number|string} messageId
 * @param {string} message
 */
async function editTelegramMessage(messageId, message) {
  const { token, chatId } = getTelegramConfig();
  const numericMessageId = Number(messageId);

  if (!token || !chatId || !Number.isFinite(numericMessageId) || numericMessageId <= 0) {
    return { skipped: true };
  }

  const url = `https://api.telegram.org/bot${token}/editMessageText`;
  try {
    const response = await axios.post(
      url,
      {
        chat_id: chatId,
        message_id: numericMessageId,
        text: message,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      },
      { timeout: 10000 }
    );
    console.log(`[Telegram] Updated message ${numericMessageId} in chat ${chatId}`);
    return response.data;
  } catch (err) {
    const desc = String(err?.response?.data?.description || "");
    if (desc.toLowerCase().includes("message is not modified")) {
      return { ok: true, unmodified: true };
    }
    throw err;
  }
}

/**
 * Build structured HR Telegram message for a leave request or status update.
 * @param {object} leaveData
 * @param {{ header?: string, isAutoApproved?: boolean, approverName?: string, approverRole?: string, remarks?: string }} [meta]
 */
function buildLeaveRequestMessage(leaveData, meta = {}) {
  const employeeName = escapeTelegramHtml(
    leaveData?.full_name || leaveData?.employee_name || leaveData?.user_id || "Unknown Staff"
  );
  const employeeId = escapeTelegramHtml(
    leaveData?.employee_id || leaveData?.user_id || "-"
  );
  const leaveType = escapeTelegramHtml(leaveData?.leave_type || "Leave");
  const startDate = formatTelegramDate(leaveData?.start_date);
  const endDate = formatTelegramDate(leaveData?.end_date);
  const leavePeriod = `${startDate} – ${endDate}`;
  const totalLeave = formatDaysTitleCase(leaveData?.days);
  const statusLabel = escapeTelegramHtml(
    formatTelegramLeaveStatus(leaveData?.status, {
      isAutoApproved: Boolean(meta.isAutoApproved),
    })
  );

  const header = meta.header || "🔔 <b>New Leave Request Notification</b>";

  const lines = [
    header,
    "",
    "<b>Employee:</b>",
    employeeName,
    "",
    "<b>Employee ID:</b>",
    employeeId,
  ];

  if (leaveData?.company_name && String(leaveData.company_name).trim()) {
    lines.push("", "<b>Company:</b>", escapeTelegramHtml(String(leaveData.company_name).trim()));
  }

  if (leaveData?.branch || leaveData?.department) {
    const locationParts = [leaveData.branch, leaveData.department]
      .map((v) => String(v || "").trim())
      .filter(Boolean);
    if (locationParts.length > 0) {
      lines.push("", "<b>Branch / Department:</b>", escapeTelegramHtml(locationParts.join(" • ")));
    }
  }

  lines.push("", "<b>Leave Type:</b>", leaveType);

  if (
    isAnnualOrEmergencyLeave(leaveData?.leave_type) &&
    leaveData?.balance_days !== undefined &&
    leaveData?.balance_days !== null &&
    Number.isFinite(Number(leaveData.balance_days))
  ) {
    lines.push(
      "",
      "<b>Leave Balance:</b>",
      `${escapeTelegramHtml(formatDaysTitleCase(leaveData.balance_days))} Remaining`
    );
  }

  lines.push(
    "",
    "<b>Leave Period:</b>",
    escapeTelegramHtml(leavePeriod),
    "",
    "<b>Total Leave:</b>",
    escapeTelegramHtml(totalLeave),
    "",
    "<b>Approval Status:</b>",
    statusLabel
  );

  const actorName = String(meta.approverName || "").trim();
  const actorRole = String(meta.approverRole || "").trim();
  const actorDisplay = actorName
    ? actorRole && !actorName.toLowerCase().includes(actorRole.toLowerCase())
      ? `${actorName} (${actorRole})`
      : actorName
    : actorRole;

  const statusLower = String(leaveData?.status || "").trim().toLowerCase();
  if (actorDisplay) {
    if (statusLower === "approved") {
      lines.push("", "<b>Approved By:</b>", escapeTelegramHtml(actorDisplay));
    } else if (statusLower === "rejected") {
      lines.push("", "<b>Rejected By:</b>", escapeTelegramHtml(actorDisplay));
    } else if (statusLower.startsWith("pending")) {
      lines.push("", "<b>Last Endorsed By:</b>", escapeTelegramHtml(actorDisplay));
    }
  }

  const remarks = String(meta.remarks || "").trim();
  if (remarks && statusLower === "rejected") {
    lines.push("", "<b>Reason:</b>", escapeTelegramHtml(remarks));
  }

  return lines.join("\n");
}

function buildNewLeaveRequestMessage(leaveData) {
  const isAutoApproved = String(leaveData?.status || "").trim().toLowerCase() === "approved";
  return buildLeaveRequestMessage(leaveData, {
    header: "🔔 <b>New Leave Request Notification</b>",
    isAutoApproved,
  });
}

async function sendNewLeaveRequestTelegramNotification(leaveData) {
  if (!leaveData) return { skipped: true };
  const message = buildNewLeaveRequestMessage(leaveData);
  return sendTelegramMessage(message);
}

/**
 * Sync HR Telegram group when a leave request is approved, rejected, or forwarded to the next stage:
 * 1. Edits the original Telegram message in place (if telegramMessageId exists) so Approval Status stays live.
 * 2. Sends a reply alert on final Approved / Rejected so HR receives an instant notification.
 */
async function sendLeaveStatusUpdateTelegramNotification(
  leaveData,
  { nextStatus, approverName = "", approverRole = "", remarks = "", telegramMessageId = null } = {}
) {
  if (!leaveData) return { skipped: true };

  const updatedData = {
    ...leaveData,
    status: nextStatus || leaveData.status,
  };
  const statusLower = String(updatedData.status || "").trim().toLowerCase();

  let header = "🔔 <b>New Leave Request Notification</b>";
  if (statusLower === "approved") {
    header = "✅ <b>Leave Request Approved</b>";
  } else if (statusLower === "rejected") {
    header = "❌ <b>Leave Request Rejected</b>";
  }

  const formattedMessage = buildLeaveRequestMessage(updatedData, {
    header,
    approverName,
    approverRole,
    remarks,
  });

  // 1. Update original message in place so its Approval Status is never stale
  if (telegramMessageId) {
    try {
      await editTelegramMessage(telegramMessageId, formattedMessage);
    } catch (editErr) {
      console.warn(
        "[Telegram] Could not edit original leave message:",
        editErr?.response?.data || editErr.message
      );
    }
  }

  // 2. Send a live notification reply on final approval or rejection
  if (statusLower === "approved" || statusLower === "rejected") {
    return sendTelegramMessage(formattedMessage, {
      replyToMessageId: telegramMessageId,
    });
  }

  return { updated: Boolean(telegramMessageId) };
}

/**
 * Build the "Staff On Leave Today" digest message.
 * @param {Array<{ full_name?: string, company_name?: string, branch?: string }>} staffList
 * @param {string|Date} [dateValue]
 */
function buildStaffOnLeaveTodayMessage(staffList = [], dateValue = new Date()) {
  if (!Array.isArray(staffList) || staffList.length === 0) return "";

  const dateHeader = formatTelegramDate(dateValue);
  const lines = [
    "🏖️ <b>Staff On Leave Today</b>",
    `<i>${escapeTelegramHtml(dateHeader)}</i>`,
    "",
  ];

  for (const item of staffList) {
    const name = escapeTelegramHtml(
      String(item?.full_name || item?.employee_name || item?.user_id || "Unknown Staff").trim()
    );
    const company = String(item?.company_name || item?.branch || "").trim();
    if (company) {
      lines.push(`• ${name} • ${escapeTelegramHtml(company)}`);
    } else {
      lines.push(`• ${name}`);
    }
  }

  return lines.join("\n");
}

async function sendStaffOnLeaveTodayTelegramNotification(staffList = [], dateValue = new Date()) {
  const message = buildStaffOnLeaveTodayMessage(staffList, dateValue);
  if (!message) return { skipped: true };
  return sendTelegramMessage(message);
}

module.exports = {
  isAnnualOrEmergencyLeave,
  sendTelegramMessage,
  editTelegramMessage,
  buildLeaveRequestMessage,
  buildNewLeaveRequestMessage,
  sendNewLeaveRequestTelegramNotification,
  sendLeaveStatusUpdateTelegramNotification,
  buildStaffOnLeaveTodayMessage,
  sendStaffOnLeaveTodayTelegramNotification,
};
