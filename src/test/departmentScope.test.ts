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

  it("defaults empty or legacy scope on base employee role to Own Data Only, while letting explicit scope win", () => {
    expect(normalizeScopeType("", "employee")).toBe("Own Data Only");
    expect(normalizeScopeType("Current Company Only", "employee")).toBe("Own Data Only");
    expect(normalizeScopeType("Department Data Only", "employee")).toBe("Department Data Only");
    expect(normalizeScopeType("Branch Data Only", "head_of_department")).toBe("Branch Data Only");
  });

  it("keeps other scopes intact alongside Department Data Only", () => {
    expect(normalizeScopeType("Branch Data Only", "Rental Coordinator")).toBe("Branch Data Only");
    expect(normalizeScopeType("Company Staff Data", "Rental Coordinator")).toBe("Company Staff Data");
    expect(normalizeScopeType("Parent Group Data", "Rental Coordinator")).toBe("Parent Group Data");
  });
});
