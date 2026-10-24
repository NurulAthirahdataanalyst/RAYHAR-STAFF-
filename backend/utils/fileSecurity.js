"use strict";

const path = require("path");

/**
 * File upload security helpers to mitigate Multer uncaught exceptions (CWE-248)
 * and path traversal / unrestricted file upload vulnerabilities (CWE-23 / CWE-434).
 */

const MAX_UPLOAD_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_EXTENSIONS = Object.freeze([
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".doc",
  ".docx",
]);

const ALLOWED_MIME_TYPES = Object.freeze([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

/**
 * Maps an uploaded filename's extension to a hardcoded string literal.
 * Using a switch returning constant literals breaks static taint propagation (CWE-23).
 *
 * @param {unknown} originalname
 * @returns {string}
 */
function getSafeUploadExtension(originalname) {
  const rawExt = path.extname(path.basename(String(originalname || ""))).toLowerCase();
  switch (rawExt) {
    case ".pdf":
      return ".pdf";
    case ".jpg":
      return ".jpg";
    case ".jpeg":
      return ".jpeg";
    case ".png":
      return ".png";
    case ".webp":
      return ".webp";
    case ".doc":
      return ".doc";
    case ".docx":
      return ".docx";
    default:
      return ".pdf";
  }
}

/**
 * Validates that a client-supplied filename is well-formed and free of null bytes,
 * control characters, or path traversal sequences.
 *
 * @param {unknown} originalname
 * @returns {boolean}
 */
function isValidUploadFilename(originalname) {
  if (typeof originalname !== "string") {
    return false;
  }

  const trimmed = originalname.trim();
  if (!trimmed || trimmed.length > 255) {
    return false;
  }

  if (trimmed.includes("\0") || trimmed.includes("..")) {
    return false;
  }

  for (let i = 0; i < trimmed.length; i++) {
    const code = trimmed.charCodeAt(i);
    if (code <= 31 || code === 127) {
      return false;
    }
  }

  const base = path.basename(trimmed);
  return Boolean(base && base !== "." && base !== "..");
}

/**
 * Checks whether the file's extension is in the allowed list.
 *
 * @param {unknown} originalname
 * @returns {boolean}
 */
function isAllowedExtension(originalname) {
  if (typeof originalname !== "string") {
    return false;
  }
  const ext = path.extname(path.basename(originalname)).toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext);
}

/**
 * Checks whether the file's MIME type is in the allowed list.
 *
 * @param {unknown} mimetype
 * @returns {boolean}
 */
function isAllowedMimeType(mimetype) {
  if (typeof mimetype !== "string") {
    return false;
  }
  const normalized = mimetype.split(";")[0].trim().toLowerCase();
  return ALLOWED_MIME_TYPES.includes(normalized);
}

/**
 * Creates a safe Multer fileFilter that catches any synchronous or asynchronous errors
 * and forwards them to Multer's callback without causing an uncaught exception.
 *
 * @returns {(req: any, file: any, cb: (error: Error | null, acceptFile?: boolean) => void) => Promise<void>}
 */
function createSafeFileFilter() {
  return async function safeFileFilter(req, file, cb) {
    try {
      if (!file || typeof file !== "object") {
        const err = new Error("Invalid file upload payload.");
        err.status = 400;
        err.code = "INVALID_FILE_UPLOAD";
        return cb(err, false);
      }

      if (!isValidUploadFilename(file.originalname)) {
        const err = new Error("Invalid file name.");
        err.status = 400;
        err.code = "INVALID_FILE_NAME";
        return cb(err, false);
      }

      if (!isAllowedExtension(file.originalname)) {
        const err = new Error(
          `Unsupported file extension. Allowed extensions: ${ALLOWED_EXTENSIONS.join(", ")}`
        );
        err.status = 400;
        err.code = "INVALID_FILE_EXTENSION";
        return cb(err, false);
      }

      if (!isAllowedMimeType(file.mimetype)) {
        const err = new Error("Unsupported file MIME type.");
        err.status = 400;
        err.code = "INVALID_FILE_MIMETYPE";
        return cb(err, false);
      }

      return cb(null, true);
    } catch (filterErr) {
      const safeErr =
        filterErr instanceof Error
          ? filterErr
          : new Error("File upload validation failed.");
      safeErr.status = 400;
      return cb(safeErr, false);
    }
  };
}

/**
 * Validates a populated `req.file` object inside a route handler as defense-in-depth.
 *
 * @param {any} file
 * @param {number} [maxSizeBytes=MAX_UPLOAD_FILE_SIZE]
 * @returns {{ valid: boolean, error?: string, safeExt?: string }}
 */
function validateUploadedFile(file, maxSizeBytes = MAX_UPLOAD_FILE_SIZE) {
  if (!file || typeof file !== "object") {
    return { valid: false, error: "No file uploaded" };
  }

  if (!isValidUploadFilename(file.originalname)) {
    return { valid: false, error: "Invalid filename" };
  }

  if (!isAllowedExtension(file.originalname)) {
    return { valid: false, error: "Unsupported file extension" };
  }

  if (!isAllowedMimeType(file.mimetype)) {
    return { valid: false, error: "Unsupported file MIME type" };
  }

  if (typeof file.size === "number" && (file.size <= 0 || file.size > maxSizeBytes)) {
    return { valid: false, error: "Uploaded file size is invalid or exceeds limit" };
  }

  return {
    valid: true,
    safeExt: getSafeUploadExtension(file.originalname),
  };
}

module.exports = {
  MAX_UPLOAD_FILE_SIZE,
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  getSafeUploadExtension,
  isValidUploadFilename,
  isAllowedExtension,
  isAllowedMimeType,
  createSafeFileFilter,
  validateUploadedFile,
};
