import { describe, it, expect } from "vitest";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const {
  formatDigestLeaveType,
  buildStaffOnLeaveTodayMessage,
  extractStaffOnLeaveMessageDateIso,
} = require("../../backend/services/telegramService.js");

describe("Telegram Staff On Leave Today digest formatting", () => {
  it("normalizes English and Malay leave type variants consistently", () => {
    expect(formatDigestLeaveType("Annual/Emergency Leave")).toBe("Annual & Emergency Leave");
    expect(formatDigestLeaveType("Annual & Emergency Leave")).toBe("Annual & Emergency Leave");
    expect(formatDigestLeaveType("Annual Leave")).toBe("Annual & Emergency Leave");
    expect(formatDigestLeaveType("Emergency Leave")).toBe("Annual & Emergency Leave");
    expect(formatDigestLeaveType("Cuti Tahunan")).toBe("Annual & Emergency Leave");
    expect(formatDigestLeaveType("Replacement Leave")).toBe("Replacement Leave");
    expect(formatDigestLeaveType("Cuti Ganti")).toBe("Replacement Leave");
    expect(formatDigestLeaveType("Sick Leave")).toBe("Sick Leave");
    expect(formatDigestLeaveType("Cuti Sakit")).toBe("Sick Leave");
    expect(formatDigestLeaveType("Unpaid Leave")).toBe("Unpaid Leave");
    expect(formatDigestLeaveType("Cuti Tanpa Gaji")).toBe("Unpaid Leave");
    expect(formatDigestLeaveType("Maternity Leave")).toBe("Maternity Leave");
    expect(formatDigestLeaveType("Compassionate Leave")).toBe("Compassionate Leave");
  });

  it("groups staff by their applied leave type with clean HTML headings", () => {
    const html = buildStaffOnLeaveTodayMessage(
      [
        {
          full_name: "SITI IZZATI BIN IZZAT",
          company_name: "Ray Rent Travels",
          leave_type: "Replacement Leave",
        },
        {
          full_name: "MUHAMMAD HAFIZ BIN AHMAD",
          company_name: "Ray Rent Travels",
          leave_type: "Annual/Emergency Leave",
        },
      ],
      "2026-11-28"
    );

    expect(html).toBe(
      [
        "🏖️ <b>Staff On Leave Today</b>",
        "<i>28 November 2026</i>",
        "",
        "<b>Annual &amp; Emergency Leave</b>",
        "• MUHAMMAD HAFIZ BIN AHMAD • Ray Rent Travels",
        "",
        "<b>Replacement Leave</b>",
        "• SITI IZZATI BIN IZZAT • Ray Rent Travels",
      ].join("\n")
    );
  });

  it("combines Malay and English variants of the same leave category under one heading", () => {
    const html = buildStaffOnLeaveTodayMessage(
      [
        {
          full_name: "AHMAD BIN ALI",
          company_name: "Rayhar Travels",
          leave_type: "Cuti Tahunan",
        },
        {
          full_name: "MUHAMMAD HAFIZ BIN AHMAD",
          company_name: "Ray Rent Travels",
          leave_type: "Annual/Emergency Leave",
        },
        {
          full_name: "NURUL AINA BINTI ZAINAL",
          company_name: "Rayhar Travels",
          leave_type: "Cuti Sakit",
        },
      ],
      "2026-11-28"
    );

    expect(html).toBe(
      [
        "🏖️ <b>Staff On Leave Today</b>",
        "<i>28 November 2026</i>",
        "",
        "<b>Annual &amp; Emergency Leave</b>",
        "• AHMAD BIN ALI • Rayhar Travels",
        "• MUHAMMAD HAFIZ BIN AHMAD • Ray Rent Travels",
        "",
        "<b>Sick Leave</b>",
        "• NURUL AINA BINTI ZAINAL • Rayhar Travels",
      ].join("\n")
    );
  });

  it("returns empty string when no staff are on leave and preserves pinned date extraction", () => {
    expect(buildStaffOnLeaveTodayMessage([], "2026-11-28")).toBe("");

    const html = buildStaffOnLeaveTodayMessage(
      [
        {
          full_name: "SITI IZZATI BIN IZZAT",
          company_name: "Ray Rent Travels",
          leave_type: "Replacement Leave",
        },
      ],
      "2026-11-28"
    );
    const plainTelegramText = html.replace(/<[^>]+>/g, "");
    expect(extractStaffOnLeaveMessageDateIso({ text: plainTelegramText })).toBe("2026-11-28");
  });
});
