import { describe, it, expect } from "vitest";
import { createRequire } from "module";
import { canUserActOnLeaveStage } from "@/utils/leaveDiscussionPermissions";

const require = createRequire(import.meta.url);
const {
  resolveEffectiveWorkflowForApplicant,
  findStepIndexForStatus,
} = require("../../backend/utils/leaveWorkflowResolver.js");

describe("Subsidiary leave workflow resolver (Branch Leader vs Head of Department)", () => {
  const companyRoles = [
    {
      id: "r-emp",
      company_id: 4,
      name: "Employee - Ray Rent",
      role_type: "Employee Role",
      scope_type: "Own Data Only",
      copied_from_role_name: "Employee",
    },
    {
      id: "r-emp2",
      company_id: 4,
      name: "Employee - Rental",
      role_type: "Employee Role",
      scope_type: "Own Data Only",
      copied_from_role_name: "Employee",
    },
    {
      id: "r-bl",
      company_id: 4,
      name: "Fleet Supervisor",
      role_type: "Operational Role",
      scope_type: "Branch Data Only",
      copied_from_role_name: "Branch Leader",
    },
    {
      id: "r-hod",
      company_id: 4,
      name: "Rental Coordinator",
      role_type: "Management Role",
      scope_type: "Company Staff Data",
      copied_from_role_name: "Head of Department",
    },
  ];

  const companyDepartments = [{ id: 10, name: "Rental Coordinator", company_id: 4 }];

  const activeStaff = [
    {
      user_id: "u-bl",
      full_name: "MUHAMMAD AIMAN BIN ZULKIFLI",
      branch: "RAYRENT",
      department: null,
      status: "Active",
      company_id: 4,
      role_id: "r-bl",
      role_name: "Fleet Supervisor",
      copied_from_role_name: "Branch Leader",
      role_type: "Operational Role",
      scope_type: "Branch Data Only",
    },
    {
      user_id: "u-hod",
      full_name: "AMIR HAKIM BIN ROSLI",
      branch: "RAYRENT",
      department: "Rental Coordinator",
      status: "Active",
      company_id: 4,
      role_id: "r-hod",
      role_name: "Rental Coordinator",
      copied_from_role_name: "Head of Department",
      role_type: "Management Role",
      scope_type: "Company Staff Data",
    },
    {
      user_id: "u-staff-dept",
      full_name: "NUR IZZATI BINTI HASSAN",
      branch: "RAYRENT",
      department: "Rental Coordinator",
      status: "Active",
      company_id: 4,
      role_id: "r-emp",
      role_name: "Employee - Ray Rent",
      copied_from_role_name: "Employee",
    },
    {
      user_id: "u-staff-nodept-1",
      full_name: "MUHAMMAD HAFIZ BIN AHMAD",
      branch: "RAYRENT",
      department: null,
      status: "Active",
      company_id: 4,
      role_id: "r-emp",
      role_name: "Employee - Ray Rent",
      copied_from_role_name: "Employee",
    },
  ];

  it("routes subsidiary staff WITHOUT a department to Branch Leader (Fleet Supervisor), skipping HOD", () => {
    const wfRows = [
      {
        company_id: 4,
        branch_scope: "ALL",
        step_order: 1,
        approver_role_id: "r-hod",
        step_label: "Department Review",
      },
      {
        company_id: 4,
        branch_scope: "ALL",
        step_order: 2,
        approver_role_id: "r-bl",
        step_label: "Branch Leader Approval",
      },
    ];

    const res = resolveEffectiveWorkflowForApplicant({
      companyId: 4,
      wfRows,
      companyRoles,
      companyDepartments,
      activeStaff,
      applicant: activeStaff[3], // MUHAMMAD HAFIZ (no department)
    });

    expect(res.initialStatus).toBe("Pending Fleet Supervisor");
    expect(res.effectiveSteps).toHaveLength(1);
    expect(res.firstStep.approver_name).toBe("MUHAMMAD AIMAN BIN ZULKIFLI");
    expect(res.firstStep.approver_context).toBe("RAYRENT");
  });

  it("routes subsidiary staff WITH a department to Head of Department (Rental Coordinator) first", () => {
    const wfRows = [
      {
        company_id: 4,
        branch_scope: "ALL",
        step_order: 1,
        approver_role_id: "r-hod",
        step_label: "Department Review",
      },
      {
        company_id: 4,
        branch_scope: "ALL",
        step_order: 2,
        approver_role_id: "r-bl",
        step_label: "Branch Leader Approval",
      },
    ];

    const res = resolveEffectiveWorkflowForApplicant({
      companyId: 4,
      wfRows,
      companyRoles,
      companyDepartments,
      activeStaff,
      applicant: activeStaff[2], // NUR IZZATI (dept: Rental Coordinator)
    });

    expect(res.initialStatus).toBe("Pending Rental Coordinator");
    expect(res.effectiveSteps).toHaveLength(2);
    expect(res.effectiveSteps[0].approver_name).toBe("AMIR HAKIM BIN ROSLI");
    expect(res.effectiveSteps[0].approver_context).toBe("Rental Coordinator");
    expect(res.effectiveSteps[1].role_name).toBe("Fleet Supervisor");
    expect(findStepIndexForStatus(res.effectiveSteps, "Pending Rental Coordinator")).toBe(0);
  });

  it("ignores legacy Employee-role steps in broken overlapping workflows", () => {
    const brokenWfRows = [
      {
        company_id: 4,
        branch_scope: "ALL",
        step_order: 1,
        approver_role_id: "r-emp", // Broken Employee - Ray Rent
        step_label: "Employee",
      },
      {
        company_id: 4,
        branch_scope: "ALL",
        step_order: 2,
        approver_role_id: "r-hod",
        step_label: "Highest Approval",
      },
    ];

    const resNoDept = resolveEffectiveWorkflowForApplicant({
      companyId: 4,
      wfRows: brokenWfRows,
      companyRoles,
      companyDepartments,
      activeStaff,
      applicant: activeStaff[3],
    });

    expect(resNoDept.initialStatus).toBe("Pending Fleet Supervisor");
    expect(resNoDept.firstStep.approver_name).toBe("MUHAMMAD AIMAN BIN ZULKIFLI");

    const resWithDept = resolveEffectiveWorkflowForApplicant({
      companyId: 4,
      wfRows: brokenWfRows,
      companyRoles,
      companyDepartments,
      activeStaff,
      applicant: activeStaff[2],
    });

    expect(resWithDept.initialStatus).toBe("Pending Rental Coordinator");
    expect(resWithDept.firstStep.approver_name).toBe("AMIR HAKIM BIN ROSLI");
  });

  it("routes subsidiary HOD applying for own leave to Branch Leader (no self-approval)", () => {
    const wfRows = [
      {
        company_id: 4,
        branch_scope: "ALL",
        step_order: 1,
        approver_role_id: "r-hod",
        step_label: "Department Review",
      },
      {
        company_id: 4,
        branch_scope: "ALL",
        step_order: 2,
        approver_role_id: "r-bl",
        step_label: "Branch Leader Approval",
      },
    ];

    const resHod = resolveEffectiveWorkflowForApplicant({
      companyId: 4,
      wfRows,
      companyRoles,
      companyDepartments,
      activeStaff,
      applicant: activeStaff[1], // AMIR HAKIM (Rental Coordinator)
    });

    expect(resHod.initialStatus).toBe("Pending Fleet Supervisor");
    expect(resHod.firstStep.approver_name).toBe("MUHAMMAD AIMAN BIN ZULKIFLI");
  });

  it("keeps Main Company (companyId = 1) HQ & non-HQ workflows unchanged", () => {
    const mainRoles = [
      { id: "m-hod", company_id: 1, name: "Head of Department" },
      { id: "m-om", company_id: 1, name: "Operation Manager" },
      { id: "m-bl", company_id: 1, name: "Branch Leader" },
      { id: "m-md", company_id: 1, name: "Managing Director" },
    ];
    const mainWf = [
      { company_id: 1, branch_scope: "HQ", step_order: 1, approver_role_id: "m-hod", step_label: "Department Review" },
      { company_id: 1, branch_scope: "HQ", step_order: 2, approver_role_id: "m-om", step_label: "Highest Approval" },
      { company_id: 1, branch_scope: "OTHER_BRANCHES", step_order: 1, approver_role_id: "m-bl", step_label: "Branch Endorsement" },
      { company_id: 1, branch_scope: "OTHER_BRANCHES", step_order: 2, approver_role_id: "m-md", step_label: "Highest Approval" },
    ];

    const hqRes = resolveEffectiveWorkflowForApplicant({
      companyId: 1,
      wfRows: mainWf,
      companyRoles: mainRoles,
      companyDepartments: [{ id: 1, name: "IT", company_id: 1 }],
      activeStaff: [],
      applicant: { user_id: "e1", branch: "HQ", department: "IT", role: "employee" },
    });
    expect(hqRes.initialStatus).toBe("Pending Head of Department");
    expect(hqRes.effectiveSteps.map((s: any) => s.role_name)).toEqual(["Head of Department", "Operation Manager"]);

    const branchRes = resolveEffectiveWorkflowForApplicant({
      companyId: 1,
      wfRows: mainWf,
      companyRoles: mainRoles,
      companyDepartments: [],
      activeStaff: [],
      applicant: { user_id: "e2", branch: "KMM", department: "", role: "employee" },
    });
    expect(branchRes.initialStatus).toBe("Pending Branch Leader");
    expect(branchRes.effectiveSteps.map((s: any) => s.role_name)).toEqual(["Branch Leader", "Managing Director"]);
  });

  it("checks frontend action permissions accurately for custom Branch Leader & HOD roles", () => {
    expect(
      canUserActOnLeaveStage({
        userRole: "branch_leader",
        userRoleName: "Fleet Supervisor",
        userBranch: "RAYRENT",
        userDepartment: "",
        reqStatus: "Pending Fleet Supervisor",
        reqBranch: "RAYRENT",
        reqDepartment: "",
      })
    ).toBe(true);

    expect(
      canUserActOnLeaveStage({
        userRole: "head_of_department",
        userRoleName: "Rental Coordinator",
        userBranch: "RAYRENT",
        userDepartment: "Rental Coordinator",
        reqStatus: "Pending Rental Coordinator",
        reqBranch: "RAYRENT",
        reqDepartment: "Rental Coordinator",
      })
    ).toBe(true);

    // HOD cannot approve staff with no department
    expect(
      canUserActOnLeaveStage({
        userRole: "head_of_department",
        userRoleName: "Rental Coordinator",
        userBranch: "RAYRENT",
        userDepartment: "Rental Coordinator",
        reqStatus: "Pending Rental Coordinator",
        reqBranch: "RAYRENT",
        reqDepartment: "-",
      })
    ).toBe(false);
  });
});
