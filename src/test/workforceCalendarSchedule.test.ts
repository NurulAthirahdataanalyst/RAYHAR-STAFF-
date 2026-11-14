import { describe, it, expect } from "vitest";
import { WorkSchedule } from "@/modules/multi-company/types/multiCompany.types";
import { isDateRestDayBySchedule } from "@/utils/workforceCalendarSchedule";

const ZONE_A_SCHEDULE: WorkSchedule = {
  id: 1,
  company_id: 1,
  schedule_name: "Standard Office Hours (Zone A)",
  operating_zone: "ZONE_A",
  branch_ids: ["AOR", "CNH", "DGN", "HQ", "JTH", "KBG", "KBR", "KMN", "TGG"],
  special_rules: ["first_thursday_full", "first_saturday_closed"],
  effective_date: "2026-01-01",
  status: "active",
  days: [
    { day_of_week: "Monday", start_time: "08:30:00", end_time: "17:30:00", is_working_day: true },
    { day_of_week: "Tuesday", start_time: "08:30:00", end_time: "17:30:00", is_working_day: true },
    { day_of_week: "Wednesday", start_time: "08:30:00", end_time: "17:30:00", is_working_day: true },
    { day_of_week: "Thursday", start_time: "08:30:00", end_time: "13:00:00", is_working_day: true },
    { day_of_week: "Friday", start_time: null, end_time: null, is_working_day: false },
    { day_of_week: "Saturday", start_time: "08:30:00", end_time: "17:30:00", is_working_day: true },
    { day_of_week: "Sunday", start_time: "08:30:00", end_time: "17:30:00", is_working_day: true },
  ],
};

const ZONE_B_SCHEDULE: WorkSchedule = {
  id: 2,
  company_id: 1,
  schedule_name: "Standard Office Hours (Zone B)",
  operating_zone: "ZONE_B",
  branch_ids: ["BTM", "BTP", "IPH", "JHB", "KKS", "KUA", "KUL", "MJG", "MLK", "MZM", "RMP", "SEP", "SHA", "SNS", "TWU"],
  special_rules: ["first_saturday_closed"],
  effective_date: "2026-01-01",
  status: "active",
  days: [
    { day_of_week: "Monday", start_time: "08:30:00", end_time: "17:30:00", is_working_day: true },
    { day_of_week: "Tuesday", start_time: "08:30:00", end_time: "17:30:00", is_working_day: true },
    { day_of_week: "Wednesday", start_time: "08:30:00", end_time: "17:30:00", is_working_day: true },
    { day_of_week: "Thursday", start_time: "08:30:00", end_time: "17:30:00", is_working_day: true },
    { day_of_week: "Friday", start_time: "08:30:00", end_time: "17:30:00", is_working_day: true },
    { day_of_week: "Saturday", start_time: "08:30:00", end_time: "13:00:00", is_working_day: true },
    { day_of_week: "Sunday", start_time: null, end_time: null, is_working_day: false },
  ],
};

describe("isDateRestDayBySchedule", () => {
  const schedules = [ZONE_A_SCHEDULE, ZONE_B_SCHEDULE];

  it("marks Fridays and 1st Saturday as Rest Days for HQ (Zone A) in Nov/Dec 2026", () => {
    // Fridays in Nov & Dec 2026
    expect(isDateRestDayBySchedule(new Date(2026, 10, 6), "HQ", "ZONE_A", schedules)).toBe(true);
    expect(isDateRestDayBySchedule(new Date(2026, 10, 13), "HQ", "ZONE_A", schedules)).toBe(true);
    expect(isDateRestDayBySchedule(new Date(2026, 10, 20), "HQ", "ZONE_A", schedules)).toBe(true);
    expect(isDateRestDayBySchedule(new Date(2026, 10, 27), "HQ", "ZONE_A", schedules)).toBe(true);
    expect(isDateRestDayBySchedule(new Date(2026, 11, 4), "HQ", "ZONE_A", schedules)).toBe(true);

    // 1st Saturdays in Nov & Dec 2026
    expect(isDateRestDayBySchedule(new Date(2026, 10, 7), "HQ", "ZONE_A", schedules)).toBe(true);
    expect(isDateRestDayBySchedule(new Date(2026, 11, 5), "HQ", "ZONE_A", schedules)).toBe(true);
  });

  it("treats Sundays, Thursdays, and 2nd+ Saturdays as working days for HQ (Zone A)", () => {
    // Sundays
    expect(isDateRestDayBySchedule(new Date(2026, 10, 1), "HQ", "ZONE_A", schedules)).toBe(false);
    expect(isDateRestDayBySchedule(new Date(2026, 10, 15), "HQ", "ZONE_A", schedules)).toBe(false);
    expect(isDateRestDayBySchedule(new Date(2026, 10, 22), "HQ", "ZONE_A", schedules)).toBe(false);
    expect(isDateRestDayBySchedule(new Date(2026, 10, 29), "HQ", "ZONE_A", schedules)).toBe(false);

    // 2nd, 3rd, 4th Saturdays
    expect(isDateRestDayBySchedule(new Date(2026, 10, 14), "HQ", "ZONE_A", schedules)).toBe(false);
    expect(isDateRestDayBySchedule(new Date(2026, 10, 21), "HQ", "ZONE_A", schedules)).toBe(false);
    expect(isDateRestDayBySchedule(new Date(2026, 10, 28), "HQ", "ZONE_A", schedules)).toBe(false);

    // 1st and 2nd Thursdays
    expect(isDateRestDayBySchedule(new Date(2026, 10, 5), "HQ", "ZONE_A", schedules)).toBe(false);
    expect(isDateRestDayBySchedule(new Date(2026, 10, 12), "HQ", "ZONE_A", schedules)).toBe(false);
  });

  it("marks Sundays and 1st Saturday as Rest Days for Zone B branches (e.g. KUL), while Fridays and 2nd+ Saturdays are working", () => {
    expect(isDateRestDayBySchedule(new Date(2026, 10, 15), "KUL", "ZONE_B", schedules)).toBe(true);
    expect(isDateRestDayBySchedule(new Date(2026, 10, 7), "KUL", "ZONE_B", schedules)).toBe(true);
    expect(isDateRestDayBySchedule(new Date(2026, 11, 5), "KUL", "ZONE_B", schedules)).toBe(true);

    expect(isDateRestDayBySchedule(new Date(2026, 10, 6), "KUL", "ZONE_B", schedules)).toBe(false);
    expect(isDateRestDayBySchedule(new Date(2026, 10, 13), "KUL", "ZONE_B", schedules)).toBe(false);
    expect(isDateRestDayBySchedule(new Date(2026, 10, 21), "KUL", "ZONE_B", schedules)).toBe(false);
  });

  it("respects custom edited Work Schedule working-day overrides", () => {
    const customSaturdayOffZoneB: WorkSchedule = {
      ...ZONE_B_SCHEDULE,
      days: ZONE_B_SCHEDULE.days!.map((d) =>
        d.day_of_week === "Saturday" ? { ...d, is_working_day: false, start_time: null, end_time: null } : d
      ),
    };
    expect(isDateRestDayBySchedule(new Date(2026, 10, 21), "KUL", "ZONE_B", [customSaturdayOffZoneB])).toBe(true);
    expect(isDateRestDayBySchedule(new Date(2026, 10, 20), "KUL", "ZONE_B", [customSaturdayOffZoneB])).toBe(false);
  });
});
