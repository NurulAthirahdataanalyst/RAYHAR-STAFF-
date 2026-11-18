export interface ClientDeviceEnv {
  userAgent?: string;
  maxTouchPoints?: number;
  screenWidth?: number;
  screenHeight?: number;
  platform?: string;
}

function getDefaultEnv(): Required<ClientDeviceEnv> {
  if (typeof navigator === "undefined") {
    return {
      userAgent: "",
      maxTouchPoints: 0,
      screenWidth: 0,
      screenHeight: 0,
      platform: "",
    };
  }
  const scr = typeof window !== "undefined" ? window.screen : undefined;
  return {
    userAgent: navigator.userAgent || "",
    maxTouchPoints: navigator.maxTouchPoints || 0,
    screenWidth: scr?.width || 0,
    screenHeight: scr?.height || 0,
    platform: navigator.platform || "",
  };
}

export function detectBrowserName(ua: string): string {
  if (!ua) return "";
  if (/EdgA|EdgiOS|Edg\//i.test(ua)) return "Edge";
  if (/OPR\/|Opera/i.test(ua)) return "Opera";
  if (/CriOS|Chrome\//i.test(ua)) return "Chrome";
  if (/FxiOS|Firefox\//i.test(ua)) return "Firefox";
  if (/SamsungBrowser/i.test(ua)) return "Samsung Browser";
  if (/Safari\//i.test(ua)) return "Safari";
  return "";
}

/**
 * Detects the client device accurately, including iPhone/iPad browsers
 * running in "Request Desktop Website" mode where Safari spoofs a Macintosh UA.
 */
export function getCompactDeviceInfo(customEnv?: ClientDeviceEnv): string {
  const env = { ...getDefaultEnv(), ...customEnv };
  const ua = env.userAgent || "Browser";
  const minScreenDim =
    env.screenWidth > 0 && env.screenHeight > 0
      ? Math.min(env.screenWidth, env.screenHeight)
      : 0;

  if (/iPhone/i.test(ua)) return "iPhone Mobile";
  if (/iPad/i.test(ua)) return "iPad Tablet";
  if (/Android/i.test(ua)) {
    if (/Mobile/i.test(ua) || minScreenDim === 0 || minScreenDim <= 600) {
      return "Android Mobile";
    }
    return "Android Tablet";
  }

  if (/Macintosh|Mac OS X|Mac/i.test(ua)) {
    const isTouchDevice =
      env.maxTouchPoints > 1 || /iPhone|iPad|iPod/i.test(env.platform);
    if (isTouchDevice) {
      if (minScreenDim > 0 && minScreenDim <= 520) {
        return "iPhone (Desktop Mode)";
      }
      return "iPad / iOS (Desktop Mode)";
    }
    return "Mac Desktop";
  }

  if (/Windows/i.test(ua)) return "Windows Desktop";
  if (/Linux/i.test(ua)) return "Linux Desktop";
  return ua.slice(0, 60);
}

/**
 * Builds the device string stored on attendance submission:
 * includes the client-verified device label (with touch detection) + raw UA.
 */
export function buildSubmittedDeviceInfo(customEnv?: ClientDeviceEnv): string {
  const env = { ...getDefaultEnv(), ...customEnv };
  const compact = getCompactDeviceInfo(env);
  const browser = detectBrowserName(env.userAgent);
  const label = browser ? `${compact} • ${browser}` : compact;
  return env.userAgent ? `${label} | ${env.userAgent}` : label;
}

/**
 * Formats stored `clock_in_device_info` / `clock_out_device_info` for HR display.
 * Supports both new "Label | UA" values and legacy raw User-Agent strings.
 */
export function formatDeviceDisplay(raw?: string | null): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";

  const pipeIdx = trimmed.indexOf(" | ");
  if (pipeIdx > 0) {
    return trimmed.slice(0, pipeIdx);
  }

  // Legacy raw User-Agent string fallback
  const browser = detectBrowserName(trimmed);
  let osLabel = "";
  if (/iPhone/i.test(trimmed)) osLabel = "iPhone Mobile";
  else if (/iPad/i.test(trimmed)) osLabel = "iPad Tablet";
  else if (/Android/i.test(trimmed)) osLabel = "Android Mobile";
  else if (/Windows/i.test(trimmed)) osLabel = "Windows Desktop";
  else if (/Macintosh|Mac OS X/i.test(trimmed)) osLabel = "Mac / iOS Desktop Mode";
  else if (/Linux/i.test(trimmed)) osLabel = "Linux Desktop";

  if (osLabel && browser) return `${osLabel} • ${browser}`;
  if (osLabel) return osLabel;
  return trimmed.slice(0, 60);
}
