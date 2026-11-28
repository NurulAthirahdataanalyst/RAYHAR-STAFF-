export type BoundarySession = "FULL" | "AM" | "PM";
export type LeaveSessionCode = "FULL" | "HALF_AM" | "HALF_PM" | "MULTI_HALF" | string;

/**
 * Safely rounds any numeric leave value to 1 decimal place (e.g., 0.5-day increments)
 * avoiding IEEE-754 float artifacts like 13.500000000000002.
 */
export function roundLeaveDays(value: unknown, fallback = 0): number {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.round(num * 10) / 10;
}

/**
 * Formats a numeric leave value to 1 decimal place (e.g. 14 -> "14.0", 13.5 -> "13.5", 0.5 -> "0.5").
 */
export function formatLeaveDays(value: unknown, fallback = "0.0"): string {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  return (Math.round(num * 10) / 10).toFixed(1);
}

/**
 * Formats nullable/optional leave values, preserving "-" when unknown or non-numeric.
 */
export function formatNullableLeaveDays(value: unknown, emptyFallback = "-"): string {
  if (value === null || value === undefined || value === "" || value === "-") {
    return emptyFallback;
  }
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return emptyFallback;
  return (Math.round(num * 10) / 10).toFixed(1);
}

/**
 * Formats a leave balance or quota with unit (default "Days"), e.g. "14.0 Days", "0.5 Days".
 * Always uses plural unit (e.g. "14.0 Days" instead of "14 Day") for consistent decimal display.
 */
export function formatLeaveBalance(value: unknown, unit = "Days"): string {
  return `${formatLeaveDays(value)} ${unit}`;
}

/**
 * Formats signed adjustments with 1 decimal place, e.g. "+0.5 Days", "-1.0 Days".
 */
export function formatSignedLeaveDays(value: unknown, unit?: string): string {
  const rounded = roundLeaveDays(value, 0);
  const sign = rounded > 0 ? "+" : "";
  const formatted = `${sign}${rounded.toFixed(1)}`;
  return unit ? `${formatted} ${unit}` : formatted;
}

/**
 * Computes leave days for Idea A (Single Half-Day) + Idea B (Multi-Day with Start/End Half-Day sessions).
 */
export function computeHalfAwareLeaveDays(params: {
  baseDays: number;
  durationMode: "full" | "half";
  halfDaySession?: "AM" | "PM";
  startSession?: BoundarySession;
  endSession?: BoundarySession;
}): number {
  const {
    baseDays,
    durationMode,
    startSession = "FULL",
    endSession = "FULL",
  } = params;

  if (!Number.isFinite(baseDays) || baseDays <= 0) return 0;
  if (durationMode === "half") return 0.5;

  if (baseDays === 1) {
    return startSession === "AM" || startSession === "PM" ? 0.5 : 1.0;
  }

  let deduction = 0;
  if (startSession === "AM" || startSession === "PM") deduction += 0.5;
  if (endSession === "AM" || endSession === "PM") deduction += 0.5;

  return Math.max(0.5, roundLeaveDays(baseDays - deduction));
}

export interface SessionBearingRequest {
  leave_session?: string | null;
  leaveSession?: string | null;
  start_session?: string | null;
  startSession?: string | null;
  end_session?: string | null;
  endSession?: string | null;
  days?: number | string | null;
  from?: string | null;
  to?: string | null;
  start_date?: string | null;
  end_date?: string | null;
}

/**
 * Returns a descriptive human-readable label for Half-Day or Multi-Day boundary sessions, or null if full-day.
 */
export function getLeaveSessionLabel(req?: SessionBearingRequest | null): string | null {
  if (!req) return null;
  const sess = String(req.leave_session || req.leaveSession || "").trim().toUpperCase();
  const sSess = String(req.start_session || req.startSession || "").trim().toUpperCase();
  const eSess = String(req.end_session || req.endSession || "").trim().toUpperCase();

  if (sess === "HALF_AM") return "Half Day • Morning (AM)";
  if (sess === "HALF_PM") return "Half Day • Afternoon (PM)";

  const startStr = String(req.from || req.start_date || "").slice(0, 10);
  const endStr = String(req.to || req.end_date || "").slice(0, 10);
  const isSingleDate = Boolean(startStr && endStr && startStr === endStr);

  if (isSingleDate) {
    if (sSess === "AM") return "Half Day • Morning (AM)";
    if (sSess === "PM") return "Half Day • Afternoon (PM)";
  }

  const parts: string[] = [];
  if (sSess === "AM") parts.push("Start: Morning (AM)");
  else if (sSess === "PM") parts.push("Start: Afternoon (PM)");

  if (!isSingleDate) {
    if (eSess === "AM") parts.push("End: Morning (AM)");
    else if (eSess === "PM") parts.push("End: Afternoon (PM)");
  }

  if (parts.length > 0) return parts.join(" • ");

  const numericDays = Number(req.days);
  if (Number.isFinite(numericDays) && numericDays === 0.5) {
    return "Half Day (0.5)";
  }
  return null;
}

/**
 * Returns a compact pill label for tables (e.g. "HALF • AM", "HALF • PM", "START PM", "END AM").
 */
export function getCompactSessionBadge(req?: SessionBearingRequest | null): string | null {
  if (!req) return null;
  const sess = String(req.leave_session || req.leaveSession || "").trim().toUpperCase();
  const sSess = String(req.start_session || req.startSession || "").trim().toUpperCase();
  const eSess = String(req.end_session || req.endSession || "").trim().toUpperCase();

  if (sess === "HALF_AM") return "HALF • AM";
  if (sess === "HALF_PM") return "HALF • PM";

  const startStr = String(req.from || req.start_date || "").slice(0, 10);
  const endStr = String(req.to || req.end_date || "").slice(0, 10);
  const isSingleDate = Boolean(startStr && endStr && startStr === endStr);

  if (isSingleDate && (sSess === "AM" || sSess === "PM")) {
    return `HALF • ${sSess}`;
  }

  if ((sSess === "AM" || sSess === "PM") && (eSess === "AM" || eSess === "PM")) {
    return `${sSess} → ${eSess}`;
  }
  if (sSess === "AM" || sSess === "PM") return `START ${sSess}`;
  if (eSess === "AM" || eSess === "PM") return `END ${eSess}`;

  const numericDays = Number(req.days);
  if (Number.isFinite(numericDays) && numericDays % 1 !== 0) {
    return "HALF DAY";
  }
  return null;
}
