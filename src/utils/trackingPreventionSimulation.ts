// This code exists only to simulate browser tracking prevention behavior.

/**
 * Edge Tracking Prevention Test Simulation
 * 
 * Purpose:
 * Safely simulates third-party storage access from an external CDN script
 * to trigger Microsoft Edge's Tracking Prevention warning in the console:
 * 
 * "Tracking Prevention blocked access to storage for:
 *  https://cdn.jsdelivr.net/npm/meta-capi-param-builder-clientjs/dist/clientParamBuilder.bundle.js"
 * 
 * Safety & Privacy Guarantees:
 * - Does NOT use real advertising trackers or conversion pixels.
 * - Does NOT collect or transmit any employee or user data.
 * - Does NOT send any network payloads or analytics beacons externally.
 * - Completely isolated from Rayhar authentication, attendance, leave, and database flows.
 * - Easy to remove by deleting this file and the /tracking-test route.
 */

export const CDN_TRACKER_SCRIPT_URL =
  "https://cdn.jsdelivr.net/npm/meta-capi-param-builder-clientjs/dist/clientParamBuilder.bundle.js";

export const SIMULATION_SCRIPT_ID = "edge-tracking-simulation-script";

export interface SimulationLog {
  timestamp: string;
  type: "info" | "warn" | "error" | "success";
  message: string;
}

export interface SimulationResult {
  scriptLoaded: boolean;
  scriptUrl: string;
  bundleDetected: boolean;
  cookieAttempted: boolean;
  cookieSuccess: boolean;
  localStorageAttempted: boolean;
  localStorageSuccess: boolean;
  sessionStorageAttempted: boolean;
  sessionStorageSuccess: boolean;
  logs: SimulationLog[];
  error?: string;
}

declare global {
  interface Window {
    clientParamBuilder?: {
      processAndCollectParams?: (options?: unknown) => Record<string, unknown>;
      processAndCollectAllParams?: (options?: unknown) => Promise<Record<string, unknown>>;
      getFbc?: () => string | null;
      getFbp?: () => string | null;
      getClientIpAddress?: () => string | null;
    };
    __EDGE_TRACKING_SIMULATION_ACTIVE__?: boolean;
  }
}

/**
 * Loads the third-party CDN script and initiates simulated storage accesses
 * to trigger Microsoft Edge Tracking Prevention.
 */
export async function runTrackingPreventionSimulation(
  onLog?: (log: SimulationLog) => void
): Promise<SimulationResult> {
  // This code exists only to simulate browser tracking prevention behavior.
  const logs: SimulationLog[] = [];

  const addLog = (type: SimulationLog["type"], message: string) => {
    const entry: SimulationLog = {
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
    };
    logs.push(entry);
    if (onLog) {
      onLog(entry);
    }
  };

  addLog(
    "info",
    "Initializing safe third-party tracking prevention simulation..."
  );

  const result: SimulationResult = {
    scriptLoaded: false,
    scriptUrl: CDN_TRACKER_SCRIPT_URL,
    bundleDetected: false,
    cookieAttempted: false,
    cookieSuccess: false,
    localStorageAttempted: false,
    localStorageSuccess: false,
    sessionStorageAttempted: false,
    sessionStorageSuccess: false,
    logs,
  };

  try {
    // 1. Inject the external CDN script tag if not already in document
    let script = document.getElementById(
      SIMULATION_SCRIPT_ID
    ) as HTMLScriptElement | null;

    if (!script) {
      addLog("info", `Injecting external CDN script: ${CDN_TRACKER_SCRIPT_URL}`);
      script = document.createElement("script");
      script.id = SIMULATION_SCRIPT_ID;
      script.src = CDN_TRACKER_SCRIPT_URL;
      script.async = true;
      script.crossOrigin = "anonymous";

      const scriptLoadPromise = new Promise<void>((resolve, reject) => {
        if (!script) return reject(new Error("Script element missing"));
        script.onload = () => resolve();
        script.onerror = () =>
          reject(new Error(`Failed to load external script from CDN domain: ${CDN_TRACKER_SCRIPT_URL}`));
      });

      document.head.appendChild(script);
      await scriptLoadPromise;
    } else {
      addLog("info", "External CDN script is already loaded in DOM.");
    }

    result.scriptLoaded = true;
    addLog("success", "External CDN script loaded successfully.");

    // 2. Verify window.clientParamBuilder from the CDN bundle
    if (window.clientParamBuilder) {
      result.bundleDetected = true;
      addLog("success", "Detected clientParamBuilder bundle on global window object.");

      // 3. Trigger storage / cookie access from the CDN bundle
      // This is the specific call that Edge Tracking Prevention intercepts!
      addLog(
        "info",
        "Executing clientParamBuilder.processAndCollectParams() to trigger third-party cookie access..."
      );
      try {
        result.cookieAttempted = true;
        if (typeof window.clientParamBuilder.processAndCollectParams === "function") {
          const params = window.clientParamBuilder.processAndCollectParams();
          result.cookieSuccess = true;
          addLog("info", `clientParamBuilder executed safely. Captured keys: ${Object.keys(params || {}).join(", ") || "none"}`);
        } else if (typeof window.clientParamBuilder.getFbp === "function") {
          window.clientParamBuilder.getFbp();
          result.cookieSuccess = true;
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        result.cookieSuccess = false;
        addLog(
          "warn",
          `Storage access restricted by browser: ${errorMsg}`
        );
      }
    } else {
      addLog("warn", "clientParamBuilder was not found on window object.");
    }

    // 4. Test explicit cookie access (document.cookie)
    try {
      result.cookieAttempted = true;
      // This code exists only to simulate browser tracking prevention behavior.
      const testKey = "edge_tracking_sim_test";
      document.cookie = `${testKey}=1; path=/; SameSite=Lax; max-age=60`;
      const cookieAllowed = document.cookie.includes(testKey);
      result.cookieSuccess = cookieAllowed;
      addLog("info", `Cookie access test: ${cookieAllowed ? "Allowed" : "Blocked / Restricted"}`);
    } catch (err: unknown) {
      result.cookieSuccess = false;
      addLog("warn", `Cookie access blocked: ${err instanceof Error ? err.message : String(err)}`);
    }

    // 5. Test localStorage access
    try {
      result.localStorageAttempted = true;
      // This code exists only to simulate browser tracking prevention behavior.
      const testKey = "edge_tracking_sim_local";
      window.localStorage.setItem(testKey, Date.now().toString());
      const val = window.localStorage.getItem(testKey);
      window.localStorage.removeItem(testKey);
      result.localStorageSuccess = val !== null;
      addLog("info", `localStorage access test: ${val !== null ? "Allowed" : "Blocked / Restricted"}`);
    } catch (err: unknown) {
      result.localStorageSuccess = false;
      addLog("warn", `localStorage access blocked: ${err instanceof Error ? err.message : String(err)}`);
    }

    // 6. Test sessionStorage access
    try {
      result.sessionStorageAttempted = true;
      // This code exists only to simulate browser tracking prevention behavior.
      const testKey = "edge_tracking_sim_session";
      window.sessionStorage.setItem(testKey, Date.now().toString());
      const val = window.sessionStorage.getItem(testKey);
      window.sessionStorage.removeItem(testKey);
      result.sessionStorageSuccess = val !== null;
      addLog("info", `sessionStorage access test: ${val !== null ? "Allowed" : "Blocked / Restricted"}`);
    } catch (err: unknown) {
      result.sessionStorageSuccess = false;
      addLog("warn", `sessionStorage access blocked: ${err instanceof Error ? err.message : String(err)}`);
    }

    addLog(
      "info",
      "Simulation execution complete. Check Microsoft Edge DevTools Console (F12) for Tracking Prevention notices."
    );
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    result.error = errorMsg;
    addLog("error", `Simulation encountered an error: ${errorMsg}`);
  }

  return result;
}

/**
 * Completely removes the simulation script and cleans up any test storage keys.
 */
export function cleanupTrackingSimulation(): void {
  // This code exists only to simulate browser tracking prevention behavior.
  try {
    const script = document.getElementById(SIMULATION_SCRIPT_ID);
    if (script && script.parentNode) {
      script.parentNode.removeChild(script);
    }

    // Clean up test cookies
    document.cookie = "edge_tracking_sim_test=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

    // Clean up localStorage
    try {
      window.localStorage.removeItem("edge_tracking_sim_local");
    } catch {
      // Ignore if blocked
    }

    // Clean up sessionStorage
    try {
      window.sessionStorage.removeItem("edge_tracking_sim_session");
    } catch {
      // Ignore if blocked
    }

    // Clean up global window object
    if ("clientParamBuilder" in window) {
      delete window.clientParamBuilder;
    }
  } catch {
    // Cleanup failure is harmless
  }
}
