const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { format } = require("date-fns");

const TELEGRAM_CAPTION_MAX_LENGTH = 1024;
const UPLOADS_ROOT = path.resolve(__dirname, "..", "uploads");

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

function isSickLeave(leaveType) {
  const normalized = String(leaveType || "").trim().toLowerCase();
  return [
    "sick leave",
    "sick leave (mc)",
    "medical leave",
    "cuti sakit",
  ].includes(normalized);
}

function isReplacementLeave(leaveType) {
  const normalized = String(leaveType || "").trim().toLowerCase();
  return (
    normalized === "replacement leave" ||
    normalized === "cuti ganti" ||
    normalized.includes("replacement") ||
    normalized.includes("cuti ganti")
  );
}

function formatTelegramTimeMYT(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kuala_Lumpur",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

function formatWorkingHoursDuration(hoursOrFormatted) {
  if (typeof hoursOrFormatted === "string" && /^\d+h\s+\d+m$/i.test(hoursOrFormatted.trim())) {
    return hoursOrFormatted.trim();
  }
  const num = Number(hoursOrFormatted);
  if (!Number.isFinite(num) || num <= 0) return "0h 0m";
  const totalMinutes = Math.round(num * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
}

function formatRequiredHoursLabel(hours) {
  const num = Number(hours);
  const safeNum = Number.isFinite(num) && num > 0 ? num : 4;
  const formatted = Number.isInteger(safeNum) ? String(safeNum) : String(Number(safeNum.toFixed(2)));
  return `${formatted} ${safeNum === 1 ? "Hour" : "Hours"}`;
}

function extractReplacementDates(leaveData) {
  if (!leaveData) return [];
  const rawDates = [];

  if (Array.isArray(leaveData.replacement_dates) && leaveData.replacement_dates.length > 0) {
    rawDates.push(...leaveData.replacement_dates);
  } else if (leaveData.replacement_date) {
    rawDates.push(leaveData.replacement_date);
  }

  if (rawDates.length === 0 && typeof leaveData.reason === "string") {
    const match = leaveData.reason.match(/\[CUTI_GANTI_DATA:([\s\S]*?)\]\]/);
    if (match) {
      try {
        const startIdx = leaveData.reason.indexOf("[CUTI_GANTI_DATA:") + 17;
        const endIdx = leaveData.reason.lastIndexOf("]]") + 1;
        const parsed = JSON.parse(leaveData.reason.substring(startIdx, endIdx));
        if (Array.isArray(parsed)) {
          for (const row of parsed) {
            if (row?.tarikhGanti) rawDates.push(row.tarikhGanti);
          }
        }
      } catch (_parseErr) {
        // Ignore malformed embedded JSON
      }
    }
  }

  if (rawDates.length === 0 && leaveData.cuti_ganti_hari) {
    const candidate = String(leaveData.cuti_ganti_hari).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(candidate) || !Number.isNaN(new Date(candidate).getTime())) {
      rawDates.push(candidate);
    }
  }

  const formattedSet = new Set();
  for (const val of rawDates) {
    if (!val) continue;
    const formatted = formatTelegramDate(val);
    if (formatted && formatted !== "-") {
      formattedSet.add(formatted);
    }
  }
  return Array.from(formattedSet);
}

function formatReplacementValidationStatus(status) {
  const raw = String(status || "").trim();
  const lower = raw.toLowerCase();
  if (lower === "passed" || lower === "validated") return "Passed ✅";
  if (lower === "failed") return "Failed ❌";
  if (lower === "cancelled" || lower === "canceled") return "Cancelled";
  if (
    !raw ||
    lower === "pending" ||
    lower === "awaiting replacement date" ||
    lower === "waiting for replacement date"
  ) {
    return "Pending";
  }
  return raw;
}

function getMimeTypeFromExtension(ext) {
  switch (String(ext || "").toLowerCase()) {
    case ".pdf":
      return "application/pdf";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".doc":
      return "application/msword";
    case ".docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    default:
      return "application/octet-stream";
  }
}

function isTelegramPhotoCandidate(filenameOrPath, mimeType) {
  const ext = path.extname(String(filenameOrPath || "")).toLowerCase();
  const normalizedMime = String(mimeType || "").split(";")[0].trim().toLowerCase();
  if ([".jpg", ".jpeg", ".png"].includes(ext)) return true;
  if (["image/jpeg", "image/jpg", "image/png"].includes(normalizedMime)) return true;
  return false;
}

function sanitizeDownloadFilenamePart(value, fallback = "") {
  const cleaned = String(value ?? "")
    .replace(/[\\/:*?"<>|\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || fallback;
}

function buildMcDisplayFilename(leaveData, ext = ".pdf") {
  const safeExt = /^\.[a-z0-9]{1,8}$/i.test(String(ext || "")) ? String(ext).toLowerCase() : ".pdf";
  const empName = sanitizeDownloadFilenamePart(
    leaveData?.full_name || leaveData?.employee_name || leaveData?.user_id,
    "Staff"
  );
  const branch = sanitizeDownloadFilenamePart(leaveData?.branch, "");
  const rawDate = leaveData?.start_date ? new Date(leaveData.start_date) : null;
  const datePart =
    rawDate && !Number.isNaN(rawDate.getTime()) ? format(rawDate, "dd MMM yyyy") : "";

  const parts = [`MC - ${empName}${branch ? ` (${branch})` : ""}`];
  if (datePart) parts.push(datePart);

  const baseName = parts.join(" - ").slice(0, 120).trim();
  return `${baseName || "MC_Attachment"}${safeExt}`;
}

function getSupabasePublicMcUrl(mcFileUrl) {
  const raw = String(mcFileUrl || "").trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (!raw.startsWith("/uploads/")) return null;

  const subpath = raw.slice("/uploads/".length);
  if (!subpath || subpath.includes("..")) return null;

  const envUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseUrl =
    envUrl && !envUrl.includes("lhgfzerdekwxppzjngyg")
      ? envUrl.replace(/\/+$/, "")
      : "https://xvpebtompjcjfvuzeumo.supabase.co";

  const encodedSubpath = subpath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${supabaseUrl}/storage/v1/object/public/mc-attachments/${encodedSubpath}`;
}

function resolveLocalMcFilePath(leaveData) {
  const explicitPath = String(leaveData?.mc_file_path || "").trim();
  if (explicitPath) {
    const resolvedExplicit = path.resolve(explicitPath);
    if (fs.existsSync(resolvedExplicit) && fs.statSync(resolvedExplicit).isFile()) {
      return resolvedExplicit;
    }
  }

  const rawUrl = String(leaveData?.mc_file_url || "").trim();
  if (rawUrl.startsWith("/uploads/")) {
    const relativeSubpath = rawUrl.slice("/uploads/".length);
    if (relativeSubpath && !relativeSubpath.includes("..") && !relativeSubpath.includes("\0")) {
      const resolvedFromUrl = path.resolve(UPLOADS_ROOT, relativeSubpath);
      if (
        resolvedFromUrl.startsWith(UPLOADS_ROOT + path.sep) &&
        fs.existsSync(resolvedFromUrl) &&
        fs.statSync(resolvedFromUrl).isFile()
      ) {
        return resolvedFromUrl;
      }
    }
  }

  return null;
}

function resolveMcAttachmentFile(leaveData) {
  if (!leaveData) return null;
  const hasMcRef = Boolean(
    String(leaveData.mc_file_path || "").trim() || String(leaveData.mc_file_url || "").trim()
  );
  if (!hasMcRef) return null;

  const localPath = resolveLocalMcFilePath(leaveData);
  const referenceForExt =
    localPath || String(leaveData.mc_original_name || leaveData.mc_file_url || "");
  const ext = path.extname(referenceForExt.split("?")[0]).toLowerCase() || ".pdf";
  const mimeType =
    String(leaveData.mc_mime_type || "").split(";")[0].trim().toLowerCase() ||
    getMimeTypeFromExtension(ext);
  const filename = buildMcDisplayFilename(leaveData, ext);
  const isPhoto = isTelegramPhotoCandidate(referenceForExt, mimeType);

  if (localPath) {
    try {
      const buffer = fs.readFileSync(localPath);
      if (buffer && buffer.length > 0) {
        return { buffer, url: null, filename, mimeType, isPhoto };
      }
    } catch (readErr) {
      console.warn("[Telegram] Could not read local MC file:", readErr.message);
    }
  }

  const remoteUrl = getSupabasePublicMcUrl(leaveData.mc_file_url);
  if (remoteUrl) {
    return { buffer: null, url: remoteUrl, filename, mimeType, isPhoto };
  }

  return null;
}

function formatTelegramLeaveStatus(status, { isAutoApproved = false } = {}) {
  const raw = String(status || "").trim();
  const lower = raw.toLowerCase();
  if (!raw || lower.startsWith("pending")) return "Pending";
  if (lower === "approved") {
    return isAutoApproved ? "Approved (Auto-Approved)" : "Approved";
  }
  if (lower === "rejected") {
    return "Rejected";
  }
  if (lower === "cancelled" || lower === "canceled") {
    return "Cancelled";
  }
  return raw;
}

function getTelegramLeaveHeader(status, { isUpdated = false } = {}) {
  if (isUpdated) return "🔄 <b>Leave Request Updated</b>";
  const lower = String(status || "").trim().toLowerCase();
  if (lower === "approved") return "✅ <b>Leave Request Approved</b>";
  if (lower === "rejected") return "❌ <b>Leave Request Rejected</b>";
  if (lower === "cancelled" || lower === "canceled") return "⚪ <b>Leave Request Cancelled</b>";
  return "🟡 <b>Leave Request Submitted</b>";
}

let migratedChatIdOverride = null;

function getTelegramConfig() {
  const token = String(process.env.TELEGRAM_BOT_TOKEN || "").trim();
  const chatId = migratedChatIdOverride || String(process.env.TELEGRAM_CHAT_ID || "").trim();
  return { token, chatId };
}

/**
 * Send a raw HTML-formatted message to the configured HR Telegram group.
 * Automatically retries with `migrate_to_chat_id` if Telegram upgraded the group to a supergroup.
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
  const buildPayload = (targetChatId) => {
    const payload = {
      chat_id: targetChatId,
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
    return payload;
  };

  let response;
  let activeChatId = chatId;
  try {
    response = await axios.post(url, buildPayload(activeChatId), { timeout: 10000 });
  } catch (err) {
    const migratedId = err?.response?.data?.parameters?.migrate_to_chat_id;
    if (migratedId && String(migratedId) !== String(activeChatId)) {
      console.warn(
        `[Telegram] Group ${activeChatId} migrated to supergroup ${migratedId}; retrying automatically.`
      );
      migratedChatIdOverride = String(migratedId);
      activeChatId = migratedChatIdOverride;
      response = await axios.post(url, buildPayload(activeChatId), { timeout: 10000 });
    } else {
      throw err;
    }
  }

  const messageId = response.data?.result?.message_id ?? null;

  console.log(
    `[Telegram] Notification sent to chat ${activeChatId} (message_id: ${messageId ?? "ok"})`
  );
  return { ...response.data, messageId };
}

/**
 * Send a photo or document (e.g., MC attachment) to the configured HR Telegram group.
 * Automatically retries with `migrate_to_chat_id` on supergroup upgrade, and falls back
 * from `sendPhoto` to `sendDocument` if Telegram rejects an image as a photo.
 * @param {{ buffer?: Buffer|null, url?: string|null, filename?: string, mimeType?: string, isPhoto?: boolean, caption?: string, replyToMessageId?: number|string|null }} filePayload
 */
async function sendTelegramFile(filePayload = {}) {
  const { token, chatId } = getTelegramConfig();

  if (!token || !chatId) {
    console.warn(
      "[Telegram] Skipping file notification: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set."
    );
    return { skipped: true };
  }

  const {
    buffer = null,
    url: fileUrl = null,
    filename = "MC_Attachment.pdf",
    mimeType = "application/octet-stream",
    isPhoto = false,
    caption = "",
    replyToMessageId = null,
  } = filePayload;

  if (!buffer && !fileUrl) {
    return { skipped: true };
  }

  const postToMethod = async (method, fieldName) => {
    const endpoint = `https://api.telegram.org/bot${token}/${method}`;
    const buildFormData = (targetChatId) => {
      const formData = new FormData();
      formData.append("chat_id", String(targetChatId));
      if (caption) {
        formData.append("caption", caption);
        formData.append("parse_mode", "HTML");
      }
      const replyId = Number(replyToMessageId);
      if (Number.isFinite(replyId) && replyId > 0) {
        formData.append(
          "reply_parameters",
          JSON.stringify({
            message_id: replyId,
            allow_sending_without_reply: true,
          })
        );
      }
      if (buffer) {
        formData.append(fieldName, new Blob([buffer], { type: mimeType }), filename);
      } else {
        formData.append(fieldName, fileUrl);
      }
      return formData;
    };

    const axiosConfig = {
      timeout: 30000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    };

    let activeChatId = chatId;
    let response;
    try {
      response = await axios.post(endpoint, buildFormData(activeChatId), axiosConfig);
    } catch (err) {
      const migratedId = err?.response?.data?.parameters?.migrate_to_chat_id;
      if (migratedId && String(migratedId) !== String(activeChatId)) {
        console.warn(
          `[Telegram] Group ${activeChatId} migrated to supergroup ${migratedId}; retrying ${method} automatically.`
        );
        migratedChatIdOverride = String(migratedId);
        activeChatId = migratedChatIdOverride;
        response = await axios.post(endpoint, buildFormData(activeChatId), axiosConfig);
      } else {
        throw err;
      }
    }

    const messageId = response.data?.result?.message_id ?? null;
    console.log(
      `[Telegram] ${method} (${filename}) sent to chat ${activeChatId} (message_id: ${messageId ?? "ok"})`
    );
    return { ...response.data, messageId, mediaType: fieldName };
  };

  if (isPhoto) {
    try {
      return await postToMethod("sendPhoto", "photo");
    } catch (photoErr) {
      console.warn(
        `[Telegram] sendPhoto failed for ${filename}, falling back to sendDocument:`,
        photoErr?.response?.data || photoErr.message
      );
    }
  }

  return postToMethod("sendDocument", "document");
}

/**
 * Edit an existing Telegram message in place (used to keep the original request status live).
 * Automatically falls back to `editMessageCaption` if the target message is a photo/document with caption.
 * @param {number|string} messageId
 * @param {string} message
 */
async function editTelegramMessage(messageId, message) {
  const { token, chatId } = getTelegramConfig();
  const numericMessageId = Number(messageId);

  if (!token || !chatId || !Number.isFinite(numericMessageId) || numericMessageId <= 0) {
    return { skipped: true };
  }

  const editTextUrl = `https://api.telegram.org/bot${token}/editMessageText`;
  const editCaptionUrl = `https://api.telegram.org/bot${token}/editMessageCaption`;

  const postEditText = (targetChatId) =>
    axios.post(
      editTextUrl,
      {
        chat_id: targetChatId,
        message_id: numericMessageId,
        text: message,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      },
      { timeout: 10000 }
    );

  const postEditCaption = (targetChatId) =>
    axios.post(
      editCaptionUrl,
      {
        chat_id: targetChatId,
        message_id: numericMessageId,
        caption: message,
        parse_mode: "HTML",
      },
      { timeout: 10000 }
    );

  const runEdit = async (targetChatId) => {
    try {
      const response = await postEditText(targetChatId);
      console.log(`[Telegram] Updated message ${numericMessageId} in chat ${targetChatId}`);
      return response.data;
    } catch (err) {
      const desc = String(err?.response?.data?.description || "").toLowerCase();
      if (desc.includes("there is no text in the message to edit")) {
        const capRes = await postEditCaption(targetChatId);
        console.log(`[Telegram] Updated message caption ${numericMessageId} in chat ${targetChatId}`);
        return capRes.data;
      }
      throw err;
    }
  };

  try {
    return await runEdit(chatId);
  } catch (err) {
    const migratedId = err?.response?.data?.parameters?.migrate_to_chat_id;
    if (migratedId && String(migratedId) !== String(chatId)) {
      migratedChatIdOverride = String(migratedId);
      return await runEdit(migratedChatIdOverride);
    }
    const desc = String(err?.response?.data?.description || "");
    if (desc.toLowerCase().includes("message is not modified")) {
      return { ok: true, unmodified: true };
    }
    throw err;
  }
}

/**
 * Pin a message in the configured HR Telegram group (requires bot admin "Pin Messages" permission).
 * Never throws on missing permission; logs a clear warning instead.
 * @param {number|string} messageId
 * @param {{ disableNotification?: boolean }} [options]
 */
async function pinTelegramMessage(messageId, { disableNotification = true } = {}) {
  const { token, chatId } = getTelegramConfig();
  const numericMessageId = Number(messageId);

  if (!token || !chatId || !Number.isFinite(numericMessageId) || numericMessageId <= 0) {
    return { skipped: true, pinned: false };
  }

  const url = `https://api.telegram.org/bot${token}/pinChatMessage`;
  const postPin = (targetChatId) =>
    axios.post(
      url,
      {
        chat_id: targetChatId,
        message_id: numericMessageId,
        disable_notification: Boolean(disableNotification),
      },
      { timeout: 10000 }
    );

  try {
    const response = await postPin(chatId);
    console.log(`[Telegram] Pinned message ${numericMessageId} in chat ${chatId}`);
    return { ...response.data, pinned: true };
  } catch (err) {
    const migratedId = err?.response?.data?.parameters?.migrate_to_chat_id;
    if (migratedId && String(migratedId) !== String(chatId)) {
      try {
        migratedChatIdOverride = String(migratedId);
        const response = await postPin(migratedChatIdOverride);
        console.log(
          `[Telegram] Pinned message ${numericMessageId} in migrated chat ${migratedChatIdOverride}`
        );
        return { ...response.data, pinned: true };
      } catch (retryErr) {
        console.warn(
          "[Telegram] Could not pin message (ensure bot is admin with Pin Messages permission):",
          retryErr?.response?.data || retryErr.message
        );
        return { ok: false, pinned: false };
      }
    }
    console.warn(
      "[Telegram] Could not pin message (ensure bot is admin with Pin Messages permission):",
      err?.response?.data || err.message
    );
    return { ok: false, pinned: false };
  }
}

/**
 * Unpin a specific message in the configured HR Telegram group.
 * Silently ignores errors if the message was already unpinned or deleted.
 * @param {number|string} messageId
 */
async function unpinTelegramMessage(messageId) {
  const { token, chatId } = getTelegramConfig();
  const numericMessageId = Number(messageId);

  if (!token || !chatId || !Number.isFinite(numericMessageId) || numericMessageId <= 0) {
    return { skipped: true, unpinned: false };
  }

  const url = `https://api.telegram.org/bot${token}/unpinChatMessage`;
  const postUnpin = (targetChatId) =>
    axios.post(
      url,
      {
        chat_id: targetChatId,
        message_id: numericMessageId,
      },
      { timeout: 10000 }
    );

  try {
    const response = await postUnpin(chatId);
    console.log(`[Telegram] Unpinned message ${numericMessageId} in chat ${chatId}`);
    return { ...response.data, unpinned: true };
  } catch (err) {
    const migratedId = err?.response?.data?.parameters?.migrate_to_chat_id;
    if (migratedId && String(migratedId) !== String(chatId)) {
      try {
        migratedChatIdOverride = String(migratedId);
        const response = await postUnpin(migratedChatIdOverride);
        console.log(
          `[Telegram] Unpinned message ${numericMessageId} in migrated chat ${migratedChatIdOverride}`
        );
        return { ...response.data, unpinned: true };
      } catch (retryErr) {
        console.warn(
          "[Telegram] Could not unpin previous message:",
          retryErr?.response?.data || retryErr.message
        );
        return { ok: false, unpinned: false };
      }
    }
    console.warn(
      "[Telegram] Could not unpin previous message:",
      err?.response?.data || err.message
    );
    return { ok: false, unpinned: false };
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

  const header =
    meta.header ||
    getTelegramLeaveHeader(leaveData?.status, { isUpdated: Boolean(meta.isUpdated) });

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
    escapeTelegramHtml(leavePeriod)
  );

  const isRepLeave = isReplacementLeave(leaveData?.leave_type);
  if (isRepLeave) {
    const replacementDates = extractReplacementDates(leaveData);
    if (replacementDates.length > 0) {
      lines.push(
        "",
        "<b>Replacement Date:</b>",
        escapeTelegramHtml(replacementDates.join(", "))
      );
    }
  }

  lines.push(
    "",
    "<b>Total Leave:</b>",
    escapeTelegramHtml(totalLeave)
  );

  const warisPhone = String(leaveData?.waris_phone || "").trim();
  if (warisPhone) {
    lines.push("", "<b>No. Telefon Waris:</b>", escapeTelegramHtml(warisPhone));
  }

  lines.push(
    "",
    "<b>Approval Status:</b>",
    statusLabel
  );

  const statusLower = String(leaveData?.status || "").trim().toLowerCase();
  if (isRepLeave) {
    const rawValidationStatus =
      leaveData?.replacement_validation_status ??
      (statusLower === "rejected" || statusLower === "cancelled" || statusLower === "canceled"
        ? "Cancelled"
        : "Pending");
    lines.push(
      "",
      "<b>Replacement Validation:</b>",
      escapeTelegramHtml(formatReplacementValidationStatus(rawValidationStatus))
    );
  }

  const actorName = String(meta.approverName || "").trim();
  const actorRole = String(meta.approverRole || "").trim();
  const actorDisplay = actorName
    ? actorRole && !actorName.toLowerCase().includes(actorRole.toLowerCase())
      ? `${actorName} (${actorRole})`
      : actorName
    : actorRole;

  if (actorDisplay) {
    lines.push("", "<b>Processed By:</b>", escapeTelegramHtml(actorDisplay));
  }

  const remarks = String(meta.remarks || "").trim();
  if (remarks && (statusLower === "rejected" || statusLower === "cancelled" || statusLower === "canceled")) {
    lines.push("", "<b>Reason:</b>", escapeTelegramHtml(remarks));
  }

  return lines.join("\n");
}

function buildNewLeaveRequestMessage(leaveData) {
  const isAutoApproved = String(leaveData?.status || "").trim().toLowerCase() === "approved";
  return buildLeaveRequestMessage(leaveData, {
    header: getTelegramLeaveHeader(leaveData?.status),
    isAutoApproved,
  });
}

function buildMcAttachmentMessage(leaveData) {
  const employeeName = escapeTelegramHtml(
    leaveData?.full_name || leaveData?.employee_name || leaveData?.user_id || "Unknown Staff"
  );
  const employeeId = escapeTelegramHtml(
    leaveData?.employee_id || leaveData?.user_id || "-"
  );
  const leaveType = escapeTelegramHtml(leaveData?.leave_type || "Sick Leave");
  const startDate = formatTelegramDate(leaveData?.start_date);
  const endDate = formatTelegramDate(leaveData?.end_date);
  const leavePeriod = `${startDate} – ${endDate}`;

  const lines = [
    "📎 <b>MC Attachment Uploaded</b>",
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

  lines.push(
    "",
    "<b>Leave Type:</b>",
    leaveType,
    "",
    "<b>Leave Period:</b>",
    escapeTelegramHtml(leavePeriod)
  );

  return lines.join("\n");
}

function getTelegramPlainTextLength(htmlText) {
  return String(htmlText || "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;|&lt;|&gt;|&quot;/g, "X")
    .length;
}

async function sendNewLeaveRequestTelegramNotification(leaveData) {
  if (!leaveData) return { skipped: true };
  const message = buildNewLeaveRequestMessage(leaveData);
  const mcFile = resolveMcAttachmentFile(leaveData);

  if (!mcFile) {
    return sendTelegramMessage(message);
  }

  const fitsCaption =
    getTelegramPlainTextLength(message) <= TELEGRAM_CAPTION_MAX_LENGTH &&
    message.length <= TELEGRAM_CAPTION_MAX_LENGTH;

  if (fitsCaption) {
    try {
      return await sendTelegramFile({
        ...mcFile,
        caption: message,
      });
    } catch (fileErr) {
      console.warn(
        "[Telegram] Failed to send MC attachment with leave notification, falling back to text message:",
        fileErr?.response?.data || fileErr.message
      );
      return sendTelegramMessage(message);
    }
  }

  const textRes = await sendTelegramMessage(message);
  try {
    const employeeName = escapeTelegramHtml(
      leaveData?.full_name || leaveData?.employee_name || leaveData?.user_id || "Unknown Staff"
    );
    await sendTelegramFile({
      ...mcFile,
      caption: `📎 <b>MC Attachment</b>\n${employeeName}`,
      replyToMessageId: textRes?.messageId ?? null,
    });
  } catch (fileErr) {
    console.warn(
      "[Telegram] Failed to send MC attachment reply:",
      fileErr?.response?.data || fileErr.message
    );
  }
  return textRes;
}

async function sendLeaveMcAttachmentTelegramNotification(
  leaveData,
  { replyToMessageId = null } = {}
) {
  if (!leaveData) return { skipped: true };
  const mcFile = resolveMcAttachmentFile(leaveData);
  if (!mcFile) return { skipped: true };

  const caption = buildMcAttachmentMessage(leaveData);
  return sendTelegramFile({
    ...mcFile,
    caption:
      getTelegramPlainTextLength(caption) <= TELEGRAM_CAPTION_MAX_LENGTH
        ? caption
        : "📎 <b>MC Attachment Uploaded</b>",
    replyToMessageId: replyToMessageId ?? leaveData.telegram_message_id ?? null,
  });
}

/**
 * Notify HR Telegram group when a leave request changes status:
 * - On final Approved / Rejected / Cancelled (or Updated): keeps the original
 *   "Leave Request Submitted" message untouched and sends a reply so HR gets
 *   an instant alert without duplicating the card.
 * - On intermediate multi-stage endorsement (still Pending next approver): updates the
 *   original Pending message in place without sending an extra reply.
 */
async function sendLeaveStatusUpdateTelegramNotification(
  leaveData,
  { nextStatus, approverName = "", approverRole = "", remarks = "", telegramMessageId = null, isUpdated = false } = {}
) {
  if (!leaveData) return { skipped: true };

  const updatedData = {
    ...leaveData,
    status: nextStatus || leaveData.status,
  };
  const statusLower = String(updatedData.status || "").trim().toLowerCase();

  // Final status or explicit update: keep original Submitted message as-is and reply to it
  if (
    isUpdated ||
    statusLower === "approved" ||
    statusLower === "rejected" ||
    statusLower === "cancelled" ||
    statusLower === "canceled"
  ) {
    const replyMessage = buildLeaveRequestMessage(updatedData, {
      header: getTelegramLeaveHeader(updatedData.status, { isUpdated }),
      approverName,
      approverRole,
      remarks,
      isUpdated,
    });

    return sendTelegramMessage(replyMessage, {
      replyToMessageId: telegramMessageId,
    });
  }

  // Intermediate stage (still Pending next approver): update original Pending message in place
  if (telegramMessageId) {
    const pendingMessage = buildLeaveRequestMessage(updatedData, {
      header: getTelegramLeaveHeader(updatedData.status),
      approverName,
      approverRole,
      remarks,
    });
    try {
      await editTelegramMessage(telegramMessageId, pendingMessage);
    } catch (editErr) {
      console.warn(
        "[Telegram] Could not edit original leave message:",
        editErr?.response?.data || editErr.message
      );
    }
    return { updated: true };
  }

  return { updated: false };
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

async function sendStaffOnLeaveTodayTelegramNotification(
  staffList = [],
  dateValue = new Date(),
  { autoPin = true, existingMessageId = null, previousMessageId = null } = {}
) {
  const message = buildStaffOnLeaveTodayMessage(staffList, dateValue);
  if (!message) return { skipped: true };

  // If today's digest was already sent, update it in place so the pinned banner stays live without spam
  const numericExistingId = Number(existingMessageId);
  if (Number.isFinite(numericExistingId) && numericExistingId > 0) {
    try {
      const editRes = await editTelegramMessage(numericExistingId, message);
      if (editRes && !editRes.skipped) {
        let pinned = false;
        if (autoPin) {
          const pinRes = await pinTelegramMessage(numericExistingId, { disableNotification: true });
          pinned = Boolean(pinRes?.pinned);
        }
        return { ...editRes, updated: true, messageId: numericExistingId, pinned };
      }
    } catch (editErr) {
      console.warn(
        "[Telegram] Could not edit today's Staff On Leave message, sending a fresh one:",
        editErr?.response?.data || editErr.message
      );
    }
  }

  const sendRes = await sendTelegramMessage(message);
  if (sendRes?.skipped) return sendRes;

  const numericPrevId = Number(previousMessageId);
  if (
    Number.isFinite(numericPrevId) &&
    numericPrevId > 0 &&
    numericPrevId !== Number(sendRes?.messageId)
  ) {
    await unpinTelegramMessage(numericPrevId);
  }

  let pinned = false;
  if (autoPin && sendRes?.messageId) {
    const pinRes = await pinTelegramMessage(sendRes.messageId, { disableNotification: true });
    pinned = Boolean(pinRes?.pinned);
  }

  return { ...sendRes, pinned };
}

/**
 * Build structured HR Telegram compliance message for Replacement Leave working-hours validation.
 * @param {object} validationData
 */
function buildReplacementValidationMessage(validationData) {
  const statusLower = String(validationData?.validation_status || "").trim().toLowerCase();
  const isPassed = statusLower === "passed" || statusLower === "validated";

  const header = isPassed
    ? "🟢 <b>Replacement Leave Requirement Completed</b>"
    : "🔴 <b>Replacement Leave Requirement Not Fulfilled</b>";

  const employeeName = escapeTelegramHtml(
    validationData?.full_name || validationData?.employee_name || validationData?.employee_id || "Unknown Staff"
  );
  const employeeId = escapeTelegramHtml(
    validationData?.employee_id || validationData?.user_id || "-"
  );
  const replacementDate = escapeTelegramHtml(formatTelegramDate(validationData?.replacement_date));
  const attendanceStatus = escapeTelegramHtml(
    String(
      validationData?.attendance_status || (validationData?.clock_in_at ? "Present" : "Absent")
    ).trim()
  );
  const clockInStr = escapeTelegramHtml(formatTelegramTimeMYT(validationData?.clock_in_at));
  const clockOutStr = escapeTelegramHtml(formatTelegramTimeMYT(validationData?.clock_out_at));
  const workingHoursStr = escapeTelegramHtml(
    validationData?.working_hours_formatted ||
      formatWorkingHoursDuration(validationData?.actual_hours)
  );
  const reqHoursNum = Number(validationData?.required_hours);
  const safeReqHours = Number.isFinite(reqHoursNum) && reqHoursNum > 0 ? reqHoursNum : 4;
  const minReqLabel = escapeTelegramHtml(formatRequiredHoursLabel(safeReqHours));
  const validationLabel = isPassed ? "Passed ✅" : "Failed ❌";

  const lines = [
    header,
    "",
    "<b>Employee:</b>",
    employeeName,
    "",
    "<b>Employee ID:</b>",
    employeeId,
  ];

  if (validationData?.company_name && String(validationData.company_name).trim()) {
    lines.push("", "<b>Company:</b>", escapeTelegramHtml(String(validationData.company_name).trim()));
  }

  if (validationData?.branch || validationData?.department) {
    const locationParts = [validationData.branch, validationData.department]
      .map((v) => String(v || "").trim())
      .filter(Boolean);
    if (locationParts.length > 0) {
      lines.push("", "<b>Branch / Department:</b>", escapeTelegramHtml(locationParts.join(" • ")));
    }
  }

  lines.push(
    "",
    "<b>Replacement Date:</b>",
    replacementDate,
    "",
    "<b>Attendance:</b>",
    attendanceStatus,
    "",
    "<b>Clock In:</b>",
    clockInStr,
    "",
    "<b>Clock Out:</b>",
    clockOutStr,
    "",
    "<b>Working Hours:</b>",
    workingHoursStr,
    "",
    "<b>Minimum Requirement:</b>",
    minReqLabel,
    "",
    "<b>Replacement Validation:</b>",
    validationLabel
  );

  if (!isPassed) {
    const formattedReqNum = Number.isInteger(safeReqHours)
      ? String(safeReqHours)
      : String(Number(safeReqHours.toFixed(2)));
    const defaultNotes = `Staff did not fulfill the minimum ${formattedReqNum} working hours required for Replacement Leave.`;
    const notes = String(validationData?.validation_notes || "").trim() || defaultNotes;
    lines.push("", "<b>Notes:</b>", escapeTelegramHtml(notes));
  }

  return lines.join("\n");
}

async function sendReplacementLeaveValidationTelegramNotification(
  validationData,
  { replyToMessageId = null } = {}
) {
  if (!validationData) return { skipped: true };
  const message = buildReplacementValidationMessage(validationData);
  return sendTelegramMessage(message, {
    replyToMessageId: replyToMessageId ?? validationData.telegram_message_id ?? null,
  });
}

module.exports = {
  isAnnualOrEmergencyLeave,
  isSickLeave,
  isReplacementLeave,
  formatTelegramLeaveStatus,
  formatTelegramTimeMYT,
  formatWorkingHoursDuration,
  formatRequiredHoursLabel,
  extractReplacementDates,
  formatReplacementValidationStatus,
  getTelegramLeaveHeader,
  buildMcDisplayFilename,
  resolveMcAttachmentFile,
  sendTelegramMessage,
  sendTelegramFile,
  editTelegramMessage,
  pinTelegramMessage,
  unpinTelegramMessage,
  buildLeaveRequestMessage,
  buildNewLeaveRequestMessage,
  buildMcAttachmentMessage,
  buildReplacementValidationMessage,
  sendNewLeaveRequestTelegramNotification,
  sendLeaveMcAttachmentTelegramNotification,
  sendLeaveStatusUpdateTelegramNotification,
  sendReplacementLeaveValidationTelegramNotification,
  buildStaffOnLeaveTodayMessage,
  sendStaffOnLeaveTodayTelegramNotification,
};
