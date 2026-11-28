import { describe, it, expect } from "vitest";
import {
  computeHalfAwareLeaveDays,
  formatLeaveBalance,
  formatLeaveDays,
  formatSignedLeaveDays,
  getCompactSessionBadge,
  getLeaveSessionLabel,
  roundLeaveDays,
} from "@/utils/leaveFormat";

describe("Leave 14.0 Days formatting & Idea A + B Half-Day calculations", () => {
  it("formats whole and half-day balances consistently to 1 decimal place (14.0 Days)", () => {
    expect(formatLeaveDays(14)).toBe("14.0");
    expect(formatLeaveDays(13.5)).toBe("13.5");
    expect(formatLeaveDays(0.5)).toBe("0.5");
    expect(formatLeaveDays(0)).toBe("0.0");

    expect(formatLeaveBalance(14)).toBe("14.0 Days");
    expect(formatLeaveBalance(1)).toBe("1.0 Days");
    expect(formatLeaveBalance(0.5)).toBe("0.5 Days");
    expect(formatLeaveBalance(roundLeaveDays(14 - 0.5))).toBe("13.5 Days");

    expect(formatSignedLeaveDays(0.5, "Days")).toBe("+0.5 Days");
    expect(formatSignedLeaveDays(-0.5, "Days")).toBe("-0.5 Days");
  });

  it("calculates Idea A single half-day leave as 0.5 days", () => {
    expect(
      computeHalfAwareLeaveDays({
        baseDays: 1,
        durationMode: "half",
        halfDaySession: "AM",
      })
    ).toBe(0.5);

    expect(
      computeHalfAwareLeaveDays({
        baseDays: 1,
        durationMode: "half",
        halfDaySession: "PM",
      })
    ).toBe(0.5);
  });

  it("calculates Idea B multi-day + half-day boundary combinations (e.g. 1.5, 2.5 days)", () => {
    // 2 calendar working days: Full Day 1 + Morning (AM) Day 2 = 1.5 Days
    expect(
      computeHalfAwareLeaveDays({
        baseDays: 2,
        durationMode: "full",
        startSession: "FULL",
        endSession: "AM",
      })
    ).toBe(1.5);

    // 3 calendar working days: Afternoon (PM) Day 1 + Full Day 2 + Full Day 3 = 2.5 Days
    expect(
      computeHalfAwareLeaveDays({
        baseDays: 3,
        durationMode: "full",
        startSession: "PM",
        endSession: "FULL",
      })
    ).toBe(2.5);

    // 2 calendar working days: Afternoon (PM) Day 1 + Morning (AM) Day 2 = 1.0 Day
    expect(
      computeHalfAwareLeaveDays({
        baseDays: 2,
        durationMode: "full",
        startSession: "PM",
        endSession: "AM",
      })
    ).toBe(1.0);
  });

  it("renders descriptive and compact session labels for Idea A and Idea B requests", () => {
    expect(
      getLeaveSessionLabel({
        leaveSession: "HALF_AM",
        from: "2026-12-01",
        to: "2026-12-01",
        days: 0.5,
      })
    ).toBe("Half Day • Morning (AM)");
    expect(getCompactSessionBadge({ leaveSession: "HALF_PM" })).toBe("HALF • PM");

    expect(
      getLeaveSessionLabel({
        leaveSession: "MULTI_HALF",
        startSession: "FULL",
        endSession: "AM",
        from: "2026-12-01",
        to: "2026-12-02",
        days: 1.5,
      })
    ).toBe("End: Morning (AM)");
    expect(
      getCompactSessionBadge({
        leaveSession: "MULTI_HALF",
        startSession: "FULL",
        endSession: "AM",
        from: "2026-12-01",
        to: "2026-12-02",
        days: 1.5,
      })
    ).toBe("END AM");
  });
});
