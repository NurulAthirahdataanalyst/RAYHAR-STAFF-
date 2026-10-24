import DOMPurify from "dompurify";
import { API_BASE_URL } from "@/config/api";

/* ------------------------------------------------------------------ */
/* URL Validation & Sanitization                                       */
/* ------------------------------------------------------------------ */

const ALLOWED_HTTP_PROTOCOLS = new Set(["https:", "http:"]);
const ALLOWED_ALL_PROTOCOLS = new Set(["https:", "http:", "blob:"]);

export interface SanitizeUrlOptions {
  /** Safe fallback returned when a URL is invalid or disallowed (default: "about:blank"). */
  fallback?: string;
  /** Whether http:// is permitted in addition to https:// (default: true). */
  allowHttp?: boolean;
  /** Whether external domains outside the application allowlist are permitted (default: false). */
  allowExternal?: boolean;
  /** Optional extra hostnames permitted for this specific check. */
  allowedHosts?: string[];
}

/**
 * Builds the set of trusted application, API, and storage hostnames.
 */
const getTrustedHosts = (extraHosts?: string[]): Set<string> => {
  const hosts = new Set<string>([
    "localhost",
    "127.0.0.1",
    "xvpebtompjcjfvuzeumo.supabase.co",
    "rayhar-staff.onrender.com",
  ]);

  if (typeof window !== "undefined" && window.location?.hostname) {
    hosts.add(window.location.hostname.toLowerCase());
  }

  try {
    if (API_BASE_URL) {
      hosts.add(new URL(API_BASE_URL).hostname.toLowerCase());
    }
  } catch {
    // Ignore malformed env URL
  }

  try {
    const envSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (envSupabaseUrl && typeof envSupabaseUrl === "string") {
      hosts.add(new URL(envSupabaseUrl).hostname.toLowerCase());
    }
  } catch {
    // Ignore malformed env URL
  }

  if (Array.isArray(extraHosts)) {
    for (const h of extraHosts) {
      if (typeof h === "string" && h.trim()) {
        hosts.add(h.trim().toLowerCase());
      }
    }
  }

  return hosts;
};

/**
 * Checks if a parsed hostname belongs to the trusted host allowlist.
 */
const isTrustedHostname = (hostname: string, extraHosts?: string[]): boolean => {
  if (!hostname) return false;
  const lower = hostname.toLowerCase();
  const trusted = getTrustedHosts(extraHosts);
  if (trusted.has(lower)) return true;
  if (lower.endsWith(".supabase.co") && lower !== "lhgfzerdekwxppzjngyg.supabase.co") {
    return true;
  }
  if (
    typeof window !== "undefined" &&
    window.location?.hostname?.startsWith("192.168.") &&
    lower.startsWith("192.168.")
  ) {
    return true;
  }
  return false;
};

/**
 * Reusable OWASP-compliant URL validator & sanitizer.
 *
 * - Rejects `javascript:`, `data:`, `vbscript:`, `file:`, `ftp:`, and malformed URLs
 * - Rejects protocol-relative URLs (`//evil.com`, `/\evil.com`) and backslash tricks
 * - Rejects external domains unless `allowExternal: true` is explicitly configured
 * - Allows only `https://`, `http://` (when configured), `blob:` (same/trusted origin),
 *   and relative URLs beginning with a single `/`
 * - Uses the browser `URL()` parser exclusively instead of string comparisons
 * - Returns `"about:blank"` (or the configured safe fallback) for invalid URLs
 */
export const sanitizeUrl = (
  rawUrl: string | null | undefined,
  optionsOrFallback: SanitizeUrlOptions | string = "about:blank"
): string => {
  const options: SanitizeUrlOptions =
    typeof optionsOrFallback === "string"
      ? { fallback: optionsOrFallback }
      : optionsOrFallback ?? {};

  const fallback = options.fallback !== undefined ? options.fallback : "about:blank";
  const allowHttp = options.allowHttp !== undefined ? options.allowHttp : true;
  const allowExternal = options.allowExternal !== undefined ? options.allowExternal : false;

  if (!rawUrl || typeof rawUrl !== "string") return fallback;

  const trimmed = rawUrl.trim();
  if (!trimmed) return fallback;

  // Reject ASCII control characters and whitespace tricks inside the scheme/authority
  if (/[\u0000-\u001F\u007F]/.test(trimmed)) return fallback;

  if (trimmed === "about:blank") return "about:blank";

  // Reject protocol-relative URLs (//evil.com, /\evil.com) and backslashes
  if (trimmed.startsWith("//") || trimmed.startsWith("/\\") || trimmed.includes("\\")) {
    return fallback;
  }

  const baseOrigin =
    typeof window !== "undefined" && window.location?.origin && window.location.origin !== "null"
      ? window.location.origin
      : "https://localhost";

  // 1. Relative URLs beginning with a single `/`
  if (trimmed.startsWith("/")) {
    if (trimmed.includes("..")) return fallback;
    try {
      const parsed = new URL(trimmed, baseOrigin);
      if (parsed.origin !== baseOrigin || parsed.pathname.includes("..")) {
        return fallback;
      }
      if (!ALLOWED_HTTP_PROTOCOLS.has(parsed.protocol)) {
        return fallback;
      }
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      return fallback;
    }
  }

  // 2. Absolute URLs (https:, http:, blob:) parsed strictly via URL() without base
  try {
    const parsed = new URL(trimmed);

    if (!ALLOWED_ALL_PROTOCOLS.has(parsed.protocol)) {
      return fallback;
    }

    if (parsed.protocol === "blob:") {
      try {
        const innerOriginUrl = new URL(parsed.pathname);
        if (
          !ALLOWED_HTTP_PROTOCOLS.has(innerOriginUrl.protocol) ||
          (!allowExternal && !isTrustedHostname(innerOriginUrl.hostname, options.allowedHosts))
        ) {
          return fallback;
        }
        return parsed.href;
      } catch {
        return fallback;
      }
    }

    if (parsed.protocol === "http:" && !allowHttp) {
      return fallback;
    }

    if (!allowExternal && !isTrustedHostname(parsed.hostname, options.allowedHosts)) {
      return fallback;
    }

    return parsed.href;
  } catch {
    return fallback;
  }
};

/**
 * Returns a safe absolute URL (http/https only). Anything else —
 * `javascript:`, `data:`, `vbscript:`, malformed URLs — returns `fallback`.
 */
export const safeUrl = (url: string | null | undefined, fallback: string = "about:blank"): string => {
  return sanitizeUrl(url, { fallback, allowHttp: true, allowExternal: true });
};

/**
 * Builds a validated link to an uploaded file served by the backend or Supabase storage.
 */
export const safeFileUrl = (file: string | null | undefined, fallback: string = "about:blank"): string => {
  if (!file || typeof file !== "string") return fallback;
  let normalized = file.trim();
  if (!normalized || /[\u0000-\u001F\u007F]/.test(normalized)) return fallback;

  if (normalized.startsWith("blob:")) {
    return sanitizeUrl(normalized, fallback);
  }

  if (normalized.includes("lhgfzerdekwxppzjngyg.supabase.co")) {
    normalized = normalized.replace("lhgfzerdekwxppzjngyg.supabase.co", "xvpebtompjcjfvuzeumo.supabase.co");
  }

  if (normalized.startsWith("https://") || normalized.startsWith("http://")) {
    try {
      const parsed = new URL(normalized);
      if (ALLOWED_HTTP_PROTOCOLS.has(parsed.protocol)) {
        if (parsed.hostname.endsWith(".supabase.co") && parsed.pathname.startsWith("/storage/")) {
          return sanitizeUrl(parsed.href, fallback);
        }
        if (
          isTrustedHostname(parsed.hostname) &&
          parsed.pathname.includes("/uploads/") &&
          !normalized.includes("..") &&
          !normalized.includes("\\")
        ) {
          return sanitizeUrl(parsed.href, fallback);
        }
      }
    } catch {
      return fallback;
    }
    return fallback;
  }

  if (!normalized.startsWith("/uploads/") || normalized.includes("..") || normalized.includes("\\")) {
    return fallback;
  }
  return sanitizeUrl(`${API_BASE_URL}${normalized}`, fallback);
};

/**
 * Resolves an MC attachment path into a direct, validated URL.
 * Automatically prefers the Supabase storage CDN bucket for instant loading,
 * avoiding Render cold-start sleeps and redirect delays.
 */
export const getMcAttachmentUrl = (file: string | null | undefined): string => {
  if (!file || typeof file !== "string") return "";
  let normalized = file.trim();
  if (!normalized || /[\u0000-\u001F\u007F]/.test(normalized)) return "";

  if (normalized.startsWith("blob:")) {
    return sanitizeUrl(normalized, "");
  }

  if (normalized.includes("lhgfzerdekwxppzjngyg.supabase.co")) {
    normalized = normalized.replace("lhgfzerdekwxppzjngyg.supabase.co", "xvpebtompjcjfvuzeumo.supabase.co");
  }

  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    return safeFileUrl(normalized, "");
  }

  if (normalized.startsWith("/uploads/") && !normalized.includes("..") && !normalized.includes("\\")) {
    if (
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ) {
      return sanitizeUrl(`${API_BASE_URL}${normalized}`, "");
    }
    const envUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseUrl =
      envUrl && !envUrl.includes("lhgfzerdekwxppzjngyg")
        ? envUrl
        : "https://xvpebtompjcjfvuzeumo.supabase.co";
    const subpath = normalized.replace(/^\/uploads\//, "");
    const encoded = subpath.split("/").map(encodeURIComponent).join("/");
    return sanitizeUrl(`${supabaseUrl}/storage/v1/object/public/mc-attachments/${encoded}`, "");
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
 * Preloads an image into memory, converting it into a validated `blob:` Object URL
 * so that window.print() and print preview can render it synchronously and reliably
 * without `data:` URLs, broken image icons, or CORS issues.
 */
export const preloadImage = async (url: string, fallbackUrl?: string): Promise<string> => {
  const safePrimary = sanitizeUrl(url, "");
  const safeFallback = fallbackUrl ? sanitizeUrl(fallbackUrl, "") : "";

  if (!safePrimary || safePrimary === "about:blank" || isPdfUrl(safePrimary)) {
    return safePrimary || "about:blank";
  }
  if (safePrimary.startsWith("blob:")) {
    return safePrimary;
  }

  const tryFetchBlobUrl = async (targetUrl: string): Promise<string | null> => {
    const validatedTarget = sanitizeUrl(targetUrl, "");
    if (!validatedTarget || validatedTarget === "about:blank") return null;
    try {
      const res = await fetch(validatedTarget);
      if (res.ok) {
        const blob = await res.blob();
        if (blob.type && !blob.type.startsWith("image/")) {
          return validatedTarget;
        }
        const objectUrl = URL.createObjectURL(blob);
        return sanitizeUrl(objectUrl, validatedTarget);
      }
    } catch (err) {
      console.warn("Failed to fetch image as blob URL from:", validatedTarget, err);
    }
    return null;
  };

  const loadedPrimary = await tryFetchBlobUrl(safePrimary);
  if (loadedPrimary) return loadedPrimary;

  if (safeFallback && safeFallback !== safePrimary && !isPdfUrl(safeFallback)) {
    const loadedFallback = await tryFetchBlobUrl(safeFallback);
    if (loadedFallback) return loadedFallback;
  }

  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(safePrimary);
    img.onerror = () => {
      if (safeFallback && safeFallback !== safePrimary) {
        const imgFallback = new Image();
        imgFallback.onload = () => resolve(safeFallback);
        imgFallback.onerror = () => resolve(safePrimary);
        imgFallback.src = safeFallback;
      } else {
        resolve(safePrimary);
      }
    };
    img.src = safePrimary;
    if (img.complete) resolve(safePrimary);
    setTimeout(() => resolve(safePrimary), 2000);
  });
};

const ALLOWED_INTERNAL_ROUTES = [
  "/",
  "/login",
  "/reset-password",
  "/tracking-test",
  "/attendance",
  "/attendance/team",
  "/team-attendance",
  "/calendar",
  "/calendar/company-leave",
  "/leave",
  "/leave/apply",
  "/leave/admin",
  "/leave/calendar",
  "/leave/entitlement",
  "/leave/forms",
  "/leave/team",
  "/employees",
  "/branches",
  "/branches/temporary-assignment",
  "/branches/temporary-assignments",
  "/reports",
  "/reports/attendance",
  "/reports/leave",
  "/reports/department",
  "/gps-location-tracker",
  "/gps-location-tracker/history",
  "/settings",
  "/notifications",
  "/analytics",
  "/hr-analytics",
  "/hr-analytics/attendance",
  "/hr-analytics/leave",
  "/hr-analytics/workforce",
  "/hr-analytics/calendar",
  "/profile",
  "/master",
  "/master/department",
  "/master/leave-entitlement",
  "/master/designation",
  "/master/role",
  "/outstation",
  "/outstation/assignment",
  "/outstation/my",
  "/outstation/my-calendar",
  "/outstation/my_calendar",
  "/outstation/calendar",
  "/outstation/analytics",
  "/outstation/reports",
] as const;

/**
 * Validates and returns a safe internal route path starting with `/`.
 * Blocks external URLs, protocol URLs (`http:`, `https:`, `javascript:`),
 * and protocol-relative (`//`, `/\`) redirects (CWE-601).
 */
export const sanitizeInternalPath = (
  path: string | null | undefined,
  fallback: string = "/"
): string => {
  if (!path || typeof path !== "string") return fallback;
  const trimmed = path.trim();
  if (!trimmed) return fallback;
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
    return fallback;
  }
  if (/[\u0000-\u001F\u007F\\:]/.test(trimmed) || trimmed.includes("..")) {
    return fallback;
  }

  const exactMatch = ALLOWED_INTERNAL_ROUTES.find((route) => route === trimmed);
  if (exactMatch) {
    return exactMatch;
  }

  try {
    const baseOrigin =
      typeof window !== "undefined" && window.location?.origin && window.location.origin !== "null"
        ? window.location.origin
        : "https://localhost";
    const parsed = new URL(trimmed, baseOrigin);
    if (parsed.origin !== baseOrigin || !parsed.pathname.startsWith("/") || parsed.pathname.startsWith("//")) {
      return fallback;
    }
    const matchedPathname = ALLOWED_INTERNAL_ROUTES.find((route) => route === parsed.pathname);
    if (matchedPathname) {
      return `${matchedPathname}${parsed.search}${parsed.hash}`;
    }
    if (parsed.pathname.startsWith("/master/department/")) {
      const deptSegment = parsed.pathname.slice("/master/department/".length);
      if (deptSegment && !deptSegment.includes("/") && !deptSegment.includes("..")) {
        return `/master/department/${encodeURIComponent(decodeURIComponent(deptSegment))}${parsed.search}${parsed.hash}`;
      }
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
};

/**
 * Only allows internal, relative app routes to prevent open redirects.
 * Rejects absolute URLs, protocol-relative URLs (`//evil.com`) and `/\evil.com`.
 */
export const safeRedirectUrl = (url: string | null | undefined, fallback: string = "/"): string => {
  return sanitizeInternalPath(url, fallback);
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
  const target = sanitizeUrl(href, "");
  if (!target || target === "about:blank") return;
  const link = document.createElement("a");
  link.href = target;
  link.download = sanitizeFilename(filename);
  link.rel = "noopener noreferrer";
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
  if (!url || url === "about:blank") throw new Error("Invalid file path");
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
/* Prototype-pollution & Immutable State Guards                         */
/* ------------------------------------------------------------------ */

const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);

/** True when a key is safe to use as a dynamic object property. */
export const isSafeKey = (key: unknown): key is string =>
  typeof key === "string" && !FORBIDDEN_KEYS.has(key);

/** True when `index` is a valid integer index for `arr`. */
export const isValidIndex = (arr: readonly unknown[], index: unknown): index is number =>
  Number.isInteger(index) && (index as number) >= 0 && (index as number) < arr.length;

/**
 * Immutably updates an element at a validated index in an array without
 * direct indexed assignment (`arr[index].prop = val`), preventing CWE-1321.
 */
export const updateArrayItemAt = <T>(
  arr: readonly T[],
  index: number,
  updater: (item: T) => T
): T[] => {
  if (!isValidIndex(arr, index)) {
    return [...arr];
  }
  return arr.map((item, i) => (i === index ? updater(item) : item));
};
