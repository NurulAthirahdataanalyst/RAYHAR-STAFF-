import { describe, it, expect } from "vitest";
import { getVerificationBadgeProps } from "@/components/attendance/AttendanceVerificationModal";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const verificationService = require("../../backend/services/attendanceVerificationService");

describe("Attendance Verification Workflow", () => {
  it("maps verification statuses to the required badge colors", () => {
    expect(getVerificationBadgeProps("Pending Verification").className).toContain("yellow");
    expect(getVerificationBadgeProps("Approved").className).toContain("emerald");
    expect(getVerificationBadgeProps("Rejected").className).toContain("red");
    expect(getVerificationBadgeProps("Absent (Rejected)").className).toContain("red");
    expect(getVerificationBadgeProps("Expired").className).toContain("zinc");
    expect(getVerificationBadgeProps("Absent (Expired)").className).toContain("zinc");
    expect(getVerificationBadgeProps("Overridden").className).toContain("blue");
    expect(getVerificationBadgeProps("Present (Override)").className).toContain("blue");
  });

  it("evaluates Clock-In x Clock-Out final status matrix accurately", () => {
    const { resolveVerificationSummary } = verificationService;

    expect(
      resolveVerificationSummary(
        { verification_status: "Approved", clock_in_verification_status: "Approved", clock_out_verification_status: "Approved", clock_out: "2026-11-17T09:30:00Z" },
        "Present (On Time)"
      )
    ).toEqual({ verificationStatus: "Approved", attendanceStatus: "Present (On Time)" });

    expect(
      resolveVerificationSummary(
        { verification_status: "Pending Verification", clock_in_verification_status: "Approved", clock_out_verification_status: "Pending Verification", clock_out: "2026-11-17T09:30:00Z" },
        "Present (On Time)"
      )
    ).toEqual({ verificationStatus: "Pending Verification", attendanceStatus: "Pending Verification" });

    expect(
      resolveVerificationSummary(
        { verification_status: "Rejected", clock_in_verification_status: "Approved", clock_out_verification_status: "Rejected", clock_out: "2026-11-17T09:30:00Z" },
        "Present (On Time)"
      )
    ).toEqual({ verificationStatus: "Rejected", attendanceStatus: "Absent (Rejected)" });

    expect(
      resolveVerificationSummary(
        { verification_status: "Expired", clock_in_verification_status: "Expired", clock_out_verification_status: null },
        "Present (On Time)"
      )
    ).toEqual({ verificationStatus: "Expired", attendanceStatus: "Absent (Expired)" });

    expect(
      resolveVerificationSummary(
        { verification_status: "Overridden", clock_in_verification_status: "Overridden" },
        "Absent (Expired)"
      )
    ).toEqual({ verificationStatus: "Overridden", attendanceStatus: "Present (Override)" });
  });

  it("enforces geofence-only policy for main company and never requires photo", async () => {
    const mockPgPool = {
      query: async () => ({
        rows: [
          {
            user_id: "E001",
            full_name: "Main Staff",
            branch: "HQ",
            company_id: 1,
            company_type: "main",
            company_name: "Rayhar Travels",
            verification_rule: "geofence_photo", // Even if DB row had this set, Main must clamp to geofence!
            approval_expiry_mode: "days",
            approval_expiry_days: 3,
            photo_retention_days: 30,
          },
        ],
      }),
    };

    const policy = await verificationService.getEffectiveCompanyPolicy(mockPgPool, "E001", 1);
    expect(policy.isSubsidiary).toBe(false);
    expect(policy.verification_rule).toBe("geofence");
  });

  it("allows photo verification rules for subsidiary companies", async () => {
    const mockPgPool = {
      query: async () => ({
        rows: [
          {
            user_id: "RR01",
            full_name: "Sub Staff",
            branch: "RAYRENT",
            company_id: 2,
            company_type: "subsidiary",
            company_name: "RayRent Travels Sdn Bhd",
            verification_rule: "geofence_photo",
            approval_expiry_mode: "after_working_hours",
            approval_expiry_days: 3,
            photo_retention_days: 30,
          },
        ],
      }),
    };

    const policy = await verificationService.getEffectiveCompanyPolicy(mockPgPool, "RR01", 2);
    expect(policy.isSubsidiary).toBe(true);
    expect(policy.verification_rule).toBe("geofence_photo");
    expect(policy.approval_expiry_mode).toBe("after_working_hours");
  });
});
