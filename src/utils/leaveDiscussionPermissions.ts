import { formatRoleDisplayName, normalizeRole } from "@/contexts/RoleContext";
import type { DiscussionPermissionState } from "@/types/leaveDiscussion";

export interface LeaveDiscussionPermissionInput {
  currentUserId?: string;
  currentEmployeeId?: string;
  currentUserRole: string;
  currentUserBranch?: string;
  currentUserDepartment?: string;
  leaveRequest: {
    user_id?: string;
    userId?: string;
    employee_id?: string;
    employeeId?: string;
    created_by?: string;
    createdBy?: string;
    status: string;
    branch?: string;
    department?: string;
    approvalHistory?: Array<{ approver_id?: string; approver_role?: string }>;
    workflowSteps?: Array<{ step_order?: number; role_name?: string; step_label?: string }>;
  };
}

const normalizeToken = (val?: string): string =>
  String(val || "")
    .toLowerCase()
    .replace(/[\s_-]+/g, "")
    .trim();

export const matchesStageRole = (
  userRole: string,
  pendingStatus: string,
  userRoleName?: string
): boolean => {
  const normUser = normalizeToken(normalizeRole(userRole));
  const normDisplay = normalizeToken(userRoleName);
  const pendingPart = normalizeToken(String(pendingStatus || "").replace(/^Pending\s+/i, ""));
  if (!pendingPart) return false;

  if (normUser === pendingPart) return true;
  if (normDisplay && normDisplay === pendingPart) return true;
  if (pendingPart === "hod" && normUser === "headofdepartment") return true;
  if (pendingPart === "headofdepartment" && normUser === "headofdepartment") return true;
  if (pendingPart === "branchleader" && normUser === "branchleader") return true;
  if (pendingPart.includes("supervisor") && normUser === "branchleader") return true;
  if (pendingPart === "md" && normUser === "managingdirector") return true;
  if ((pendingPart === "operation" || pendingPart === "finance" || pendingPart === "financemanager") && normUser === "operationmanager") {
    return true;
  }
  if ((pendingPart === "hr" || pendingPart === "admin") && normUser === "hradmin") return true;
  if (pendingPart.includes("assure") && normUser.includes("assure")) return true;
  return false;
};

/**
 * Checks whether the current approver can approve/reject a specific leave request,
 * supporting both system role names and custom subsidiary role names (e.g. Fleet Supervisor, Rental Coordinator)
 * while enforcing branch/department scope.
 */
export function canUserActOnLeaveStage(params: {
  userRole: string;
  userRoleName?: string;
  userBranch?: string;
  userDepartment?: string;
  reqStatus: string;
  reqBranch?: string;
  reqDepartment?: string;
}): boolean {
  const { userRole, userRoleName, userBranch, userDepartment, reqStatus, reqBranch, reqDepartment } = params;
  const trimmedStatus = String(reqStatus || "").trim();
  if (!trimmedStatus.startsWith("Pending")) return false;

  const normUser = normalizeToken(normalizeRole(userRole));
  if (normUser === "hradmin") return true;

  if (!matchesStageRole(userRole, trimmedStatus, userRoleName)) return false;

  const cleanUserDept = String(userDepartment || "").trim().toLowerCase();
  const cleanReqDept = String(reqDepartment || "").trim().toLowerCase();
  const isEmptyReqDept = !cleanReqDept || cleanReqDept === "-" || cleanReqDept === "—" || cleanReqDept === "n/a";

  if (normUser === "headofdepartment") {
    if (!cleanUserDept || isEmptyReqDept) return false;
    return cleanUserDept === cleanReqDept;
  }

  if (normUser === "branchleader") {
    const cleanUserBranch = String(userBranch || "").trim().toLowerCase();
    const cleanReqBranch = String(reqBranch || "").trim().toLowerCase();
    if (cleanUserBranch && cleanReqBranch) {
      return cleanUserBranch === cleanReqBranch;
    }
  }

  return true;
}

/**
 * Formats a human-readable label for the current approver stage in Leave Discussion.
 */
export function getCurrentApproverLabel(
  status: string,
  department?: string,
  branch?: string,
  pendingApproverName?: string
): string {
  const s = String(status || "").trim();
  const sUpper = s.toUpperCase();

  if (sUpper === "APPROVED") return "Completed (Approved)";
  if (sUpper === "REJECTED") return "Closed (Rejected)";
  if (sUpper === "CANCELLED") return "Closed (Cancelled)";

  let roleLabel = "Approver";
  if (sUpper.includes("HOD") || sUpper.includes("HEAD OF DEPARTMENT")) {
    roleLabel = department ? `Head of Department (${department})` : "Head of Department";
  } else if (sUpper.includes("BRANCH LEADER")) {
    roleLabel = branch ? `Branch Leader (${branch})` : "Branch Leader";
  } else if (sUpper.includes("OPERATION") || sUpper.includes("FINANCE")) {
    roleLabel = "Operation Manager";
  } else if (sUpper.includes("MANAGING DIRECTOR") || sUpper === "PENDING MD" || sUpper === "MD") {
    roleLabel = "Managing Director";
  } else if (sUpper.includes("HR")) {
    roleLabel = "HR Admin";
  } else if (sUpper.includes("ASSURE")) {
    roleLabel = "Assure Leader";
  } else if (s.startsWith("Pending ")) {
    roleLabel = s.replace(/^Pending\s+/i, "").trim();
  }

  return pendingApproverName ? `${roleLabel} — ${pendingApproverName}` : roleLabel;
}

export function formatDiscussionSenderRole(
  senderRole?: string,
  department?: string | null,
  branch?: string | null
): string {
  const r = String(senderRole || "").toLowerCase().trim();
  if (r === "system") return "System";
  if (r === "employee" || r === "applicant") return "Employee";
  const norm = normalizeRole(r);
  if (norm === "head_of_department") {
    return department ? `HOD (${department})` : "Head of Department";
  }
  if (norm === "branch_leader") {
    return branch ? `Branch Leader (${branch})` : "Branch Leader";
  }
  return formatRoleDisplayName(norm);
}

/**
 * Evaluates Leave Discussion permissions:
 * - Applicant (Employee) can view & post while request is pending.
 * - Current stage approver can view & post while request is pending.
 * - HR Admin can view complete history and can intervene/post while request is pending (unless finalized).
 * - Previous and future approvers have read-only access until/after their stage.
 * - Once Approved / Rejected / Cancelled, discussion is permanently read-only for everyone.
 */
export function getLeaveDiscussionPermission(
  ctx: LeaveDiscussionPermissionInput
): DiscussionPermissionState {
  const uid = String(ctx.currentUserId || "").trim().toLowerCase();
  const eid = String(ctx.currentEmployeeId || "").trim().toLowerCase();
  const req = ctx.leaveRequest;

  const ownerIds = [
    req.user_id,
    req.userId,
    req.employee_id,
    req.employeeId,
    req.created_by,
    req.createdBy,
  ]
    .filter(Boolean)
    .map((v) => String(v).trim().toLowerCase());

  const isOwner = Boolean((uid && ownerIds.includes(uid)) || (eid && ownerIds.includes(eid)));
  const normRole = normalizeRole(ctx.currentUserRole);
  const isHrAdmin = normRole === "hr_admin";
  const isPending = String(req.status || "").trim().toLowerCase().startsWith("pending");

  const sameDept =
    !ctx.currentUserDepartment ||
    !req.department ||
    ctx.currentUserDepartment.trim().toLowerCase() === req.department.trim().toLowerCase();
  const sameBranch =
    !ctx.currentUserBranch ||
    !req.branch ||
    ctx.currentUserBranch.trim().toLowerCase() === req.branch.trim().toLowerCase();

  const isScopedApprover =
    normRole === "head_of_department"
      ? sameDept
      : normRole === "branch_leader"
        ? sameBranch
        : true;

  const isCurrentApprover =
    !isOwner &&
    isPending &&
    isScopedApprover &&
    matchesStageRole(normRole, req.status);

  const isPreviousApprover =
    !isOwner &&
    (req.approvalHistory || []).some(
      (h) =>
        (uid && String(h.approver_id || "").trim().toLowerCase() === uid) ||
        normalizeRole(h.approver_role) === normRole
    );

  const isFutureApprover =
    !isOwner &&
    !isCurrentApprover &&
    !isPreviousApprover &&
    (req.workflowSteps || []).some((step) =>
      matchesStageRole(normRole, `Pending ${step.role_name || step.step_label || ""}`)
    );

  const canView =
    isOwner ||
    isCurrentApprover ||
    isPreviousApprover ||
    isFutureApprover ||
    isHrAdmin ||
    ["managing_director", "operation_manager", "assure_leader", "head_of_department", "branch_leader"].includes(
      normRole
    );

  if (!canView) {
    return {
      canView: false,
      canPost: false,
      mode: "denied",
      reason: "You do not have permission to view this leave discussion.",
      viewerRoleLabel: "Restricted",
      isOwner,
      isHrAdmin,
      isCurrentApprover,
    };
  }

  if (!isPending) {
    const statusLower = String(req.status || "finalized").toLowerCase();
    return {
      canView: true,
      canPost: false,
      mode: "read_only",
      reason: `This leave request has been ${statusLower}. The discussion is now read-only.`,
      viewerRoleLabel: isOwner ? "Employee" : formatRoleDisplayName(normRole),
      isOwner,
      isHrAdmin,
      isCurrentApprover,
    };
  }

  // Active participants while pending:
  // 1) Applicant (Employee)
  // 2) Current stage approver
  // 3) HR Admin (can intervene/assist in any pending leave discussion)
  if (isOwner || isCurrentApprover || isHrAdmin) {
    return {
      canView: true,
      canPost: true,
      mode: "participant",
      viewerRoleLabel: isOwner ? "Employee" : formatRoleDisplayName(normRole),
      isOwner,
      isHrAdmin,
      isCurrentApprover,
    };
  }

  let readOnlyReason =
    "Read-only: Only the applicant, current stage approver, and HR Admin can reply right now.";
  if (isPreviousApprover) {
    readOnlyReason = "Read-only: You have already completed your approval stage.";
  } else if (isFutureApprover) {
    readOnlyReason = `Read-only: You can participate once this request reaches your approval stage (currently ${req.status}).`;
  }

  return {
    canView: true,
    canPost: false,
    mode: "read_only",
    reason: readOnlyReason,
    viewerRoleLabel: formatRoleDisplayName(normRole),
    isOwner,
    isHrAdmin,
    isCurrentApprover,
  };
}
