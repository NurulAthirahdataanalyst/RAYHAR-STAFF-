import { WorkSchedule } from "@/modules/multi-company/types/multiCompany.types";
import { normalizeZoneCode, getScheduleBranchCodes } from "@/utils/scheduleZoneUtils";

const CALENDAR_DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

const FALLBACK_ZONE_A_BRANCHES = new Set([
  "AOR",
  "CNH",
  "DGN",
  "HQ",
  "JTH",
  "KBG",
  "KBR",
  "KMN",
  "KMM",
  "TGG",
]);

export function resolveEffectiveZoneCode(
  explicitZone: string | null | undefined,
  branchCode: string
): string {
  const normBranch = (branchCode || "").trim().toUpperCase();
  const rawZone = (explicitZone || "").trim();
  if (rawZone) {
    const normalized = normalizeZoneCode(rawZone);
    if (normalized) return normalized;
  }
  return FALLBACK_ZONE_A_BRANCHES.has(normBranch) ? "ZONE_A" : "ZONE_B";
}

export function resolveScheduleForCalendar(
  schedules: WorkSchedule[],
  branchCode: string,
  zone: string,
  department?: string | null
): WorkSchedule | null {
  const activeSchedules = (schedules || []).filter((s) => !s.status || s.status === "active");
  if (activeSchedules.length === 0) return null;

  const normBranch = (branchCode || "").trim().toUpperCase();
  const normDept = (department || "").trim().toLowerCase();
  const matchesDept = (s: WorkSchedule) => {
    if (!s.department_id) return true;
    return Boolean(normDept) && s.department_id.trim().toLowerCase() === normDept;
  };
  const getSchedZone = (s: WorkSchedule) =>
    s.operating_zone && s.operating_zone.trim() ? normalizeZoneCode(s.operating_zone) : "";

  if (normBranch) {
    const branchDeptMatch = activeSchedules.find(
      (s) => Boolean(s.department_id) && matchesDept(s) && getScheduleBranchCodes(s).includes(normBranch)
    );
    if (branchDeptMatch) return branchDeptMatch;

    const branchMatch = activeSchedules.find(
      (s) => !s.department_id && getScheduleBranchCodes(s).includes(normBranch)
    );
    if (branchMatch) return branchMatch;
  }

  if (zone) {
    const zoneDeptMatch = activeSchedules.find(
      (s) => Boolean(s.department_id) && matchesDept(s) && getSchedZone(s) === zone
    );
    if (zoneDeptMatch) return zoneDeptMatch;

    const zoneMatch = activeSchedules.find(
      (s) => !s.department_id && getSchedZone(s) === zone
    );
    if (zoneMatch) return zoneMatch;
  }

  return (
    activeSchedules.find(
      (s) => matchesDept(s) && getScheduleBranchCodes(s).length === 0 && !getSchedZone(s)
    ) || null
  );
}

/**
 * Determine whether `date` is a rest day under active Work Schedules / Zone A & Zone B rules.
 */
export function isDateRestDayBySchedule(
  date: Date,
  branchCode: string,
  explicitZone: string | null | undefined,
  schedules: WorkSchedule[],
  department?: string | null
): boolean {
  const dayIdx = date.getDay();
  const dateNum = date.getDate();
  const isFirstSaturday = dayIdx === 6 && dateNum <= 7;
  const zone = resolveEffectiveZoneCode(explicitZone, branchCode);
  const matchedSchedule = resolveScheduleForCalendar(schedules, branchCode, zone, department);

  if (matchedSchedule) {
    const rawRules = Array.isArray(matchedSchedule.special_rules) ? matchedSchedule.special_rules : [];
    const effectiveRules =
      rawRules.length > 0
        ? rawRules
        : zone === "ZONE_A"
          ? ["first_thursday_full", "first_saturday_closed"]
          : zone === "ZONE_B"
            ? ["first_saturday_closed"]
            : [];
    if (isFirstSaturday && effectiveRules.includes("first_saturday_closed")) {
      return true;
    }

    const dayName = CALENDAR_DAY_NAMES[dayIdx].toLowerCase();
    const dayCfg = (matchedSchedule.days || []).find(
      (d) => d.day_of_week?.toLowerCase() === dayName
    );
    if (dayCfg && typeof dayCfg.is_working_day === "boolean") {
      return !dayCfg.is_working_day;
    }
  } else if (isFirstSaturday) {
    return true;
  }

  if (zone === "ZONE_A") {
    return dayIdx === 5 || isFirstSaturday;
  }
  return dayIdx === 0 || isFirstSaturday;
}
