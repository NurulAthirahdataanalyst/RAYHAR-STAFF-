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
 * Builds a link to an uploaded file served by the backend or Supabase storage.
 */
export const safeFileUrl = (file: string | null | undefined, fallback: string = "#"): string => {
  if (!file || typeof file !== "string") return fallback;
  if (file.startsWith("blob:") || file.startsWith("data:image/")) return file;
  // Accept absolute https URLs that contain /uploads/ or Supabase storage
  if (file.startsWith("https://") || file.startsWith("http://")) {
    try {
      const parsed = new URL(file);
      if (ALLOWED_PROTOCOLS.has(parsed.protocol)) {
        if (parsed.hostname.endsWith(".supabase.co") && parsed.pathname.startsWith("/storage/")) {
          return file;
        }
        if (parsed.pathname.includes("/uploads/") && !file.includes("..") && !file.includes("\\")) {
          return file;
        }
      }
    } catch {
      return fallback;
    }
    return fallback;
  }
  if (!file.startsWith("/uploads/") || file.includes("..") || file.includes("\\")) return fallback;
  return safeUrl(`${API_BASE_URL}${file}`, fallback);
};

/**
 * Resolves an MC attachment path into a direct, fast URL.
 * Automatically prefers the Supabase storage CDN bucket for instant loading,
 * avoiding Render cold-start sleeps and redirect delays.
 */
export const getMcAttachmentUrl = (file: string | null | undefined): string => {
  if (!file || typeof file !== "string") return "";
  if (file.startsWith("blob:") || file.startsWith("data:image/")) return file;
  if (file.startsWith("http://") || file.startsWith("https://")) {
    return safeFileUrl(file, "");
  }
  if (file.startsWith("/uploads/")) {
    if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
      return `${API_BASE_URL}${file}`;
    }
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://xvpebtompjcjfvuzeumo.supabase.co";
    const subpath = file.replace(/^\/uploads\//, "");
    const encoded = subpath.split("/").map(encodeURIComponent).join("/");
    return `${supabaseUrl}/storage/v1/object/public/mc-attachments/${encoded}`;
  }
  return "";
};

/**
 * Checks if a URL or file path points to a PDF document.
 */
export const isPdfUrl = (url: string | null | undefined): boolean => {
  if (!url || typeof url !== "string") return false;
  const clean = url.split("?")[0].toLowerCase();
  return clean.endsWith(".pdf");
};

/**
 * Preloads an image into memory, converting it into a base64 Data URL
 * so that window.print() and print preview can render it synchronously and reliably
 * without broken image icons or CORS issues.
 */
export const preloadImage = async (url: string): Promise<string> => {
  if (!url || url === "#" || url === "about:blank" || isPdfUrl(url)) return url;
  if (url.startsWith("data:image/")) return url;

  try {
    const res = await fetch(url);
    if (res.ok) {
      const blob = await res.blob();
      return await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === "string") {
            resolve(reader.result);
          } else {
            resolve(url);
          }
        };
        reader.onerror = () => resolve(url);
        reader.readAsDataURL(blob);
      });
    }
  } catch (err) {
    console.warn("Failed to fetch image as data URL, trying image preloader fallback:", err);
  }

  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(url);
    img.onerror = () => resolve(url);
    img.src = url;
    if (img.complete) resolve(url);
    setTimeout(() => resolve(url), 2000);
  });
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
