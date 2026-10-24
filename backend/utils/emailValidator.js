"use strict";

/**
 * Strict email validation utility to mitigate CWE-436 (Interpretation Conflict)
 * and RFC5322 header/recipient injection in Nodemailer and transactional email services.
 */

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const strictAddrSpecRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Characters that can be abused in RFC5322 group syntax, quoted strings, comments, or header injection
const FORBIDDEN_EMAIL_CHARS = /[\r\n\0"'<>():;,\\]/;

/**
 * Validates that an input is a single, well-formed email address string
 * free of RFC5322 group syntax, comments, quoted local-parts, or control characters.
 *
 * @param {unknown} email
 * @returns {boolean}
 */
function isValidEmailAddress(email) {
  if (typeof email !== "string") {
    return false;
  }

  const trimmed = email.trim();
  if (!trimmed || trimmed.length < 3 || trimmed.length > 254) {
    return false;
  }

  // Reject any whitespace inside the address
  if (/\s/.test(trimmed)) {
    return false;
  }

  // Reject RFC5322 group/comment/quote/header injection characters
  // e.g. `G: (x; <evil@example.com>) <victim@example.com>` or `"test@example.com"@evil.com`
  if (FORBIDDEN_EMAIL_CHARS.test(trimmed)) {
    return false;
  }

  // Reject control characters (ASCII 0-31 and 127)
  for (let i = 0; i < trimmed.length; i++) {
    const code = trimmed.charCodeAt(i);
    if (code <= 31 || code === 127) {
      return false;
    }
  }

  // Must contain at least one '@' and satisfy baseline regex
  if (!emailRegex.test(trimmed)) {
    return false;
  }

  // Ensure exactly one '@' symbol (prevents `"user@inner"@outer.com`)
  const parts = trimmed.split("@");
  if (parts.length !== 2) {
    return false;
  }

  const [localPart, domainPart] = parts;
  if (!localPart || localPart.length > 64 || !domainPart || domainPart.length > 253) {
    return false;
  }

  // Reject leading, trailing, or consecutive dots in local or domain parts
  if (
    localPart.startsWith(".") ||
    localPart.endsWith(".") ||
    localPart.includes("..") ||
    domainPart.startsWith(".") ||
    domainPart.endsWith(".") ||
    domainPart.includes("..")
  ) {
    return false;
  }

  // Reject leading or trailing hyphens in domain labels
  const domainLabels = domainPart.split(".");
  if (
    domainLabels.length < 2 ||
    domainLabels.some((label) => !label || label.startsWith("-") || label.endsWith("-"))
  ) {
    return false;
  }

  return strictAddrSpecRegex.test(trimmed);
}

/**
 * Validates and normalizes a single email address, throwing a descriptive error if invalid.
 *
 * @param {unknown} email
 * @param {string} [fieldName="to"]
 * @returns {string}
 */
function validateEmailAddress(email, fieldName = "to") {
  if (typeof email !== "string") {
    throw new Error(`Invalid '${fieldName}' email address: expected a string.`);
  }

  const normalized = email.trim();
  if (!isValidEmailAddress(normalized)) {
    throw new Error(`Invalid or unsafe '${fieldName}' email address rejected.`);
  }

  return normalized;
}

/**
 * Validates a recipient field (`to`, `cc`, `bcc`).
 * By default, arrays and objects are rejected to prevent unexpected recipient expansion.
 *
 * @param {unknown} value
 * @param {string} fieldName
 * @param {boolean} [allowArray=false]
 * @returns {string | string[] | undefined}
 */
function validateRecipientField(value, fieldName, allowArray = false) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (Array.isArray(value)) {
    if (!allowArray) {
      throw new Error(`Invalid '${fieldName}' email field: arrays are not permitted.`);
    }
    if (value.length === 0) {
      throw new Error(`Invalid '${fieldName}' email field: recipient array cannot be empty.`);
    }
    return value.map((item, idx) => validateEmailAddress(item, `${fieldName}[${idx}]`));
  }

  if (typeof value === "object") {
    throw new Error(`Invalid '${fieldName}' email field: objects are not permitted.`);
  }

  return validateEmailAddress(value, fieldName);
}

/**
 * Validates an envelope/message recipient configuration (`to`, `cc`, `bcc`).
 *
 * @param {{ to?: unknown, cc?: unknown, bcc?: unknown }} recipients
 * @param {{ allowArray?: boolean }} [options]
 * @returns {{ to: string | string[], cc?: string | string[], bcc?: string | string[] }}
 */
function validateEnvelopeRecipients(recipients = {}, options = {}) {
  if (!recipients || typeof recipients !== "object" || Array.isArray(recipients)) {
    throw new Error("Invalid recipients payload.");
  }

  const allowArray = Boolean(options.allowArray);
  const to = validateRecipientField(recipients.to, "to", allowArray);
  if (!to) {
    throw new Error("Missing required 'to' email address.");
  }

  const validated = { to };

  const cc = validateRecipientField(recipients.cc, "cc", allowArray);
  if (cc !== undefined) {
    validated.cc = cc;
  }

  const bcc = validateRecipientField(recipients.bcc, "bcc", allowArray);
  if (bcc !== undefined) {
    validated.bcc = bcc;
  }

  return validated;
}

module.exports = {
  emailRegex,
  isValidEmailAddress,
  validateEmailAddress,
  validateRecipientField,
  validateEnvelopeRecipients,
};
