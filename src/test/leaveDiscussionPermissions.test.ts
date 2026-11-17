import { describe, expect, it } from "vitest";
import {
  getCurrentApproverLabel,
  getLeaveDiscussionPermission,
} from "@/utils/leaveDiscussionPermissions";

describe("getLeaveDiscussionPermission", () => {
  const baseRequest = {
    user_id: "EMP001",
    status: "Pending HOD",
    branch: "HQ",
    department: "IT",
    approvalHistory: [],
    workflowSteps: [
      { step_order: 1, role_name: "Head of Department" },
      { step_order: 2, role_name: "Operation Manager" },
      { step_order: 3, role_name: "Managing Director" },
    ],
  };

  it("allows the applicant employee to view and post while pending", () => {
    const perm = getLeaveDiscussionPermission({
      currentUserId: "EMP001",
      currentUserRole: "employee",
      leaveRequest: baseRequest,
    });
    expect(perm.canView).toBe(true);
    expect(perm.canPost).toBe(true);
    expect(perm.mode).toBe("participant");
    expect(perm.isOwner).toBe(true);
  });

  it("allows the current stage approver (same dept HOD) to view and post", () => {
    const perm = getLeaveDiscussionPermission({
      currentUserId: "HOD001",
      currentUserRole: "head_of_department",
      currentUserDepartment: "IT",
      currentUserBranch: "HQ",
      leaveRequest: baseRequest,
    });
    expect(perm.canView).toBe(true);
    expect(perm.canPost).toBe(true);
    expect(perm.isCurrentApprover).toBe(true);
  });

  it("keeps future approvers read-only until the request reaches their stage", () => {
    const perm = getLeaveDiscussionPermission({
      currentUserId: "MD001",
      currentUserRole: "managing_director",
      leaveRequest: baseRequest,
    });
    expect(perm.canView).toBe(true);
    expect(perm.canPost).toBe(false);
    expect(perm.mode).toBe("read_only");
    expect(perm.reason).toContain("reaches your approval stage");
  });

  it("allows future approver to participate once request reaches their stage", () => {
    const perm = getLeaveDiscussionPermission({
      currentUserId: "MD001",
      currentUserRole: "managing_director",
      leaveRequest: {
        ...baseRequest,
        status: "Pending Managing Director",
        approvalHistory: [{ approver_id: "HOD001", approver_role: "head_of_department" }],
      },
    });
    expect(perm.canView).toBe(true);
    expect(perm.canPost).toBe(true);
    expect(perm.isCurrentApprover).toBe(true);
  });

  it("keeps previous approvers read-only after their stage", () => {
    const perm = getLeaveDiscussionPermission({
      currentUserId: "HOD001",
      currentUserRole: "head_of_department",
      currentUserDepartment: "IT",
      leaveRequest: {
        ...baseRequest,
        status: "Pending Operation Manager",
        approvalHistory: [{ approver_id: "HOD001", approver_role: "head_of_department" }],
      },
    });
    expect(perm.canView).toBe(true);
    expect(perm.canPost).toBe(false);
    expect(perm.mode).toBe("read_only");
    expect(perm.reason).toContain("already completed");
  });

  it("allows HR Admin to view and intervene in any pending stage", () => {
    const perm = getLeaveDiscussionPermission({
      currentUserId: "HR001",
      currentUserRole: "hr_admin",
      leaveRequest: baseRequest,
    });
    expect(perm.canView).toBe(true);
    expect(perm.canPost).toBe(true);
    expect(perm.isHrAdmin).toBe(true);
  });

  it("closes discussion and enforces read-only for everyone once Approved or Rejected", () => {
    for (const finalStatus of ["Approved", "Rejected"]) {
      const empPerm = getLeaveDiscussionPermission({
        currentUserId: "EMP001",
        currentUserRole: "employee",
        leaveRequest: { ...baseRequest, status: finalStatus },
      });
      const hrPerm = getLeaveDiscussionPermission({
        currentUserId: "HR001",
        currentUserRole: "hr_admin",
        leaveRequest: { ...baseRequest, status: finalStatus },
      });
      expect(empPerm.canView).toBe(true);
      expect(empPerm.canPost).toBe(false);
      expect(empPerm.reason).toContain("read-only");
      expect(hrPerm.canView).toBe(true);
      expect(hrPerm.canPost).toBe(false);
    }
  });

  it("allows custom subsidiary Branch Leader (Fleet Supervisor) to participate when status is Pending Fleet Supervisor", () => {
    const perm = getLeaveDiscussionPermission({
      currentUserId: "BL_RAYRENT",
      currentUserRole: "branch_leader",
      currentUserRoleName: "Fleet Supervisor",
      currentUserBranch: "RAYRENT",
      currentUserDepartment: "",
      leaveRequest: {
        user_id: "STAFF_NODEPT",
        status: "Pending Fleet Supervisor",
        branch: "RAYRENT",
        department: "",
        approvalHistory: [],
        workflowSteps: [{ step_order: 1, role_name: "Fleet Supervisor" }],
      },
    });
    expect(perm.canView).toBe(true);
    expect(perm.canPost).toBe(true);
    expect(perm.isCurrentApprover).toBe(true);
    expect(perm.mode).toBe("participant");
  });

  it("allows custom subsidiary HOD (Rental Coordinator) to participate only for matching department", () => {
    const sameDeptPerm = getLeaveDiscussionPermission({
      currentUserId: "HOD_RAYRENT",
      currentUserRole: "head_of_department",
      currentUserRoleName: "Rental Coordinator",
      currentUserBranch: "RAYRENT",
      currentUserDepartment: "Rental Coordinator",
      leaveRequest: {
        user_id: "STAFF_DEPT",
        status: "Pending Rental Coordinator",
        branch: "RAYRENT",
        department: "Rental Coordinator",
        approvalHistory: [],
        workflowSteps: [{ step_order: 1, role_name: "Rental Coordinator" }],
      },
    });
    expect(sameDeptPerm.canPost).toBe(true);
    expect(sameDeptPerm.isCurrentApprover).toBe(true);

    const noDeptPerm = getLeaveDiscussionPermission({
      currentUserId: "HOD_RAYRENT",
      currentUserRole: "head_of_department",
      currentUserRoleName: "Rental Coordinator",
      currentUserBranch: "RAYRENT",
      currentUserDepartment: "Rental Coordinator",
      leaveRequest: {
        user_id: "STAFF_NODEPT",
        status: "Pending Rental Coordinator",
        branch: "RAYRENT",
        department: "-",
        approvalHistory: [],
      },
    });
    expect(noDeptPerm.canPost).toBe(false);
    expect(noDeptPerm.isCurrentApprover).toBe(false);
  });
});

describe("getCurrentApproverLabel", () => {
  it("formats pending roles cleanly", () => {
    expect(getCurrentApproverLabel("Pending HOD", "IT", "HQ")).toBe("Head of Department (IT)");
    expect(getCurrentApproverLabel("Pending HR Admin", "IT", "HQ")).toBe("HR Admin");
    expect(getCurrentApproverLabel("Approved", "IT", "HQ")).toBe("Completed (Approved)");
  });
});
