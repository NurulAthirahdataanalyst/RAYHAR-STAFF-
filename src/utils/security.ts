import DOMPurify from "dompurify";
import { API_BASE_URL } from "@/config/api";

/* ------------------------------------------------------------------ */
/* URL helpers                                                         */
/* ------------------------------------------------------------------ */

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

/**
 * Returns a safe absolute URL (http/https only). Anything else —
 * `javascript:`, `data:`, `vbscript:`, malformed URLs — returns `fallback`.
 */
export const safeUrl = (url: string | null | undefined, fallback: string = "#"): string => {
  if (!url || typeof url !== "string") return fallback;
  const trimmed = url.trim();
  if (!trimmed) return fallback;
  try {
    const parsed = new URL(trimmed, window.location.origin);
    return ALLOWED_PROTOCOLS.has(parsed.protocol) ? parsed.href : fallback;
  } catch {
    return fallback;
  }
};

/**
 * Builds a link to an uploaded file served by the backend.
 * Only paths under `/uploads/` are accepted (no traversal, no external hosts).
 */
export const safeFileUrl = (file: string | null | undefined, fallback: string = "#"): string => {
  if (!file || typeof file !== "string") return fallback;
  if (!file.startsWith("/uploads/") || file.includes("..") || file.includes("\\")) return fallback;
  return safeUrl(`${API_BASE_URL}${file}`, fallback);
};

/**
 * Only allows internal, relative app routes to prevent open redirects.
 * Rejects absolute URLs, protocol-relative URLs (`//evil.com`) and `/\evil.com`.
 */
export const safeRedirectUrl = (url: string | null | undefined, fallback: string = "/"): string => {
  if (!url || typeof url !== "string") return fallback;
  if (!url.startsWith("/") || url.startsWith("//") || url.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001F]/.test(url)) return fallback;
  return url;
};

/* ------------------------------------------------------------------ */
/* Downloads (no DOM injection — the anchor is never attached)         */
/* ------------------------------------------------------------------ */

/** Strips characters that are invalid/dangerous in file names. */
export const sanitizeFilename = (name: string): string =>
  String(name ?? "download")
    .replace(/[\\/:*?"<>|\u0000-\u001F]/g, "_")
    .replace(/\.{2,}/g, ".")
    .slice(0, 200) || "download";

/** Triggers a download for a blob: or validated http(s) URL. */
export const triggerDownload = (href: string, filename: string): void => {
  const isBlob = typeof href === "string" && href.startsWith("blob:");
  const target = isBlob ? href : safeUrl(href, "");
  if (!target) return;
  const link = document.createElement("a");
  link.href = target;
  link.download = sanitizeFilename(filename);
  link.rel = "noopener";
  link.click();
};

/** Downloads a Blob as a file. */
export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  triggerDownload(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
};

/** Fetches an uploaded file (must live under /uploads/) and downloads it. */
export const downloadUploadedFile = async (file: string | null | undefined, filename: string): Promise<void> => {
  const url = safeFileUrl(file, "");
  if (!url) throw new Error("Invalid file path");
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed (${response.status})`);
  downloadBlob(await response.blob(), filename);
};

/* ------------------------------------------------------------------ */
/* Print windows                                                        */
/* ------------------------------------------------------------------ */

export interface PrintOptions {
  /** Automatically open the print dialog after the document loads. */
  autoPrint?: boolean;
  /** Close the window once printing finishes. */
  closeAfterPrint?: boolean;
  /** Delay (ms) before printing so fonts/images can render. */
  delay?: number;
}

/**
 * Writes an HTML report into a print window after sanitizing it with DOMPurify
 * (removes <script>, inline event handlers, javascript: URLs, etc.).
 * Printing is triggered from the opener instead of inline scripts.
 */
export const writePrintDocument = (win: Window | null, html: string, options: PrintOptions = {}): void => {
  if (!win) return;
  const clean = DOMPurify.sanitize(html, {
    WHOLE_DOCUMENT: true,
    ADD_TAGS: ["style", "meta", "title", "link"],
    ADD_ATTR: ["charset", "rel", "media", "target"],
  });
  win.document.open();
  win.document.write(`<!DOCTYPE html>${clean}`);
  win.document.close();

  if (options.autoPrint) {
    const { closeAfterPrint = false, delay = 500 } = options;
    setTimeout(() => {
      win.focus();
      win.print();
      if (closeAfterPrint) win.close();
    }, delay);
  }
};

/** Escapes a value for safe interpolation into an HTML string. */
export const escapeHtml = (value: unknown): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/* ------------------------------------------------------------------ */
/* Prototype-pollution guards                                           */
/* ------------------------------------------------------------------ */

const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);

/** True when a key is safe to use as a dynamic object property. */
export const isSafeKey = (key: unknown): key is string =>
  typeof key === "string" && !FORBIDDEN_KEYS.has(key);

/** True when `index` is a valid integer index for `arr`. */
export const isValidIndex = (arr: unknown[], index: unknown): index is number =>
  Number.isInteger(index) && (index as number) >= 0 && (index as number) < arr.length;
