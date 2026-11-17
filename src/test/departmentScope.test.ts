import { describe, it, expect } from "vitest";
import { normalizeScopeType } from "@/contexts/RoleContext";
import { ScopeType } from "@/modules/multi-company/types/multiCompany.types";

describe("Department Data Only authorization scope", () => {
  it("preserves exact 'Department Data Only' scope for custom and standard roles", () => {
    const scope: ScopeType = "Department Data Only";
    expect(normalizeScopeType(scope, "Rental Coordinator")).toBe("Department Data Only");
    expect(normalizeScopeType(scope, "head_of_department")).toBe("Department Data Only");
    expect(normalizeScopeType(scope, "branch_leader")).toBe("Department Data Only");
  });

  it("normalizes department-like scope strings to 'Department Data Only'", () => {
    expect(normalizeScopeType("department data only", "custom_role")).toBe("Department Data Only");
    expect(normalizeScopeType("Same Department", "coordinator")).toBe("Department Data Only");
  });

  it("still enforces Own Data Only for base employee role", () => {
    expect(normalizeScopeType("Department Data Only", "employee")).toBe("Own Data Only");
  });

  it("keeps other scopes intact alongside Department Data Only", () => {
    expect(normalizeScopeType("Branch Data Only", "Rental Coordinator")).toBe("Branch Data Only");
    expect(normalizeScopeType("Company Staff Data", "Rental Coordinator")).toBe("Company Staff Data");
    expect(normalizeScopeType("Parent Group Data", "Rental Coordinator")).toBe("Parent Group Data");
  });
});
