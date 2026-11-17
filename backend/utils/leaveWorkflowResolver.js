"use strict";

/**
 * Shared leave approval workflow resolution helpers.
 *
 * Ensures consistent department-aware and branch-aware routing across:
 * - Leave submission (POST /api/leave-requests)
 * - Leave approval advancement (PATCH /api/leave-requests/:leaveId/status)
 * - Leave listing enrichment (GET /api/leave-requests)
 * - Workflow save alignment (POST /companies/:companyId/approval-workflow)
 */

const EMPTY_DEPT_TOKENS = new Set([
  "",
  "-",
  "—",
  "n/a",
  "na",
  "none",
  "null",
  "undefined",
  "unassigned",
  "no department",
]);

function normalizeDeptValue(dept) {
  if (dept === null || dept === undefined) return null;
  const trimmed = String(dept).trim();
  if (!trimmed || EMPTY_DEPT_TOKENS.has(trimmed.toLowerCase())) {
    return null;
  }
  return trimmed;
}

function normalizeToken(val) {
  return String(val || "")
    .toLowerCase()
    .replace(/[\s_-]+/g, "")
    .trim();
}

/**
 * Classifies a role into a canonical system category using its name,
 * copied template name, role_type, and scope_type.
 */
function classifyRoleCategory(roleName, copiedFromRoleName, roleType, scopeType) {
  const r = String(roleName || "").trim().toLowerCase();
  const c = String(copiedFromRoleName || "").trim().toLowerCase();
  const rt = String(roleType || "").trim().toLowerCase();
  const st = String(scopeType || "").trim().toLowerCase();

  if (
    r === "hr" ||
    r === "admin" ||
    r.includes("hr admin") ||
    r.includes("hr_admin") ||
    c.includes("hr admin") ||
    c === "hr_admin"
  ) {
    return "hr_admin";
  }
  if (
    r === "md" ||
    r.includes("managing director") ||
    r.includes("managing_director") ||
    c.includes("managing director") ||
    c === "md"
  ) {
    return "managing_director";
  }
  if (
    r.includes("operation manager") ||
    r.includes("operations manager") ||
    r.includes("operation_manager") ||
    r.includes("finance manager") ||
    r.includes("finance_manager") ||
    c.includes("operation manager") ||
    c.includes("finance manager")
  ) {
    return "operation_manager";
  }
  if (r.includes("assure") || c.includes("assure")) {
    return "assure_leader";
  }
  if (
    r === "hod" ||
    r.includes("head of department") ||
    r.includes("head_of_department") ||
    r.includes("head department") ||
    c === "hod" ||
    c.includes("head of department") ||
    c.includes("head_of_department")
  ) {
    return "head_of_department";
  }
  if (
    r.includes("branch leader") ||
    r.includes("branch_leader") ||
    r.includes("branch manager") ||
    r.includes("supervisor") ||
    c.includes("branch leader") ||
    c === "branch_leader"
  ) {
    return "branch_leader";
  }
  if (r === "gm" || r.includes("general manager") || c.includes("general manager")) {
    return "general_manager";
  }
  if (r.includes("administrative") || c.includes("administrative")) {
    return "administrative_assistant";
  }
  if (
    r.includes("employee") ||
    r.includes("staff") ||
    r.includes("driver") ||
    r === "user" ||
    c === "employee" ||
    rt === "employee role" ||
    st === "own data only"
  ) {
    return "employee";
  }

  if (st.includes("branch")) return "branch_leader";
  if (st.includes("company")) return "operation_manager";
  if (st.includes("parent") || st.includes("group")) return "managing_director";

  return "other";
}

function getRoleMeta(step, rolesById, rolesByName) {
  const byId = step.approver_role_id ? rolesById.get(String(step.approver_role_id)) : null;
  const rawName = byId?.name || step.role_name || step.approver_role_name || "";
  const byName = rawName ? rolesByName.get(String(rawName).trim().toLowerCase()) : null;
  const roleObj = byId || byName || {};
  const roleName = roleObj.name || rawName || step.step_label || "Approver";
  const category = classifyRoleCategory(
    roleName,
    roleObj.copied_from_role_name || step.copied_from_role_name,
    roleObj.role_type || step.role_type,
    roleObj.scope_type || step.scope_type
  );

  return {
    roleId: roleObj.id || step.approver_role_id || "",
    roleName,
    copiedFromRoleName: roleObj.copied_from_role_name || step.copied_from_role_name || null,
    roleType: roleObj.role_type || step.role_type || null,
    scopeType: roleObj.scope_type || step.scope_type || null,
    category,
  };
}

function isHodStep(step, roleMeta, companyDeptNamesSet, deptMatchedRolesSet) {
  if (roleMeta.category === "head_of_department") return true;
  if (roleMeta.category === "employee" || roleMeta.category === "branch_leader") return false;

  const labelLower = String(step.step_label || "").toLowerCase();
  if (
    labelLower.includes("head of department") ||
    labelLower.includes("department review") ||
    /\bhod\b/i.test(labelLower)
  ) {
    return true;
  }

  const rNameLower = String(roleMeta.roleName || "").trim().toLowerCase();
  if (companyDeptNamesSet && companyDeptNamesSet.has(rNameLower)) {
    return true;
  }
  if (deptMatchedRolesSet && deptMatchedRolesSet.has(rNameLower)) {
    return true;
  }

  return false;
}

function isBranchLeaderStep(step, roleMeta) {
  if (roleMeta.category === "branch_leader") return true;
  if (roleMeta.category === "employee" || roleMeta.category === "head_of_department") return false;

  const labelLower = String(step.step_label || "").toLowerCase();
  return (
    labelLower.includes("branch leader") ||
    labelLower.includes("branch endorsement") ||
    labelLower.includes("branch approval")
  );
}

/**
 * Selects the single best workflow track for an employee's branch.
 * Never mixes steps across overlapping tracks.
 */
function selectBestTrackSteps(wfRows, branchCode, rolesById, rolesByName) {
  if (!Array.isArray(wfRows) || wfRows.length === 0) return [];

  const cleanBranch = String(branchCode || "").trim().toUpperCase();
  const trackMap = new Map();

  for (const row of wfRows) {
    const scopeKey = String(row.branch_scope || "ALL").trim() || "ALL";
    if (!trackMap.has(scopeKey)) trackMap.set(scopeKey, []);
    trackMap.get(scopeKey).push(row);
  }

  const scoredTracks = [];
  let orderIdx = 0;

  for (const [scopeKey, rawSteps] of trackMap.entries()) {
    const steps = [...rawSteps].sort((a, b) => (a.step_order || 0) - (b.step_order || 0));
    const scopeUpper = scopeKey.toUpperCase();
    const scopeBranches = scopeUpper
      .replace(/^BRANCHES:/, "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

    let priority = 99;
    if (cleanBranch && (scopeUpper === cleanBranch || (scopeUpper.startsWith("BRANCHES:") && scopeBranches.includes(cleanBranch)) || (scopeUpper.includes(",") && scopeBranches.includes(cleanBranch)))) {
      priority = 1;
    } else if (cleanBranch === "HQ" && scopeUpper === "HQ") {
      priority = 2;
    } else if (cleanBranch && cleanBranch !== "HQ" && scopeUpper === "OTHER_BRANCHES") {
      priority = 2;
    } else if (scopeUpper === "ALL" || scopeUpper.startsWith("ALL_TRACK_")) {
      priority = 3;
    } else if (cleanBranch && steps.some((s) => String(s.routing_rule || "").toUpperCase().includes(cleanBranch))) {
      priority = 4;
    } else if (trackMap.size === 1) {
      priority = 5;
    }

    if (priority < 99) {
      let validCount = 0;
      let employeeCount = 0;
      for (const st of steps) {
        const meta = getRoleMeta(st, rolesById, rolesByName);
        if (meta.category === "employee") employeeCount++;
        else validCount++;
      }

      scoredTracks.push({
        scopeKey,
        steps,
        priority,
        validCount,
        employeeCount,
        orderIdx: orderIdx++,
      });
    }
  }

  if (scoredTracks.length === 0) {
    // Fallback to the first track if none matched explicitly
    const firstSteps = Array.from(trackMap.values())[0] || [];
    return [...firstSteps].sort((a, b) => (a.step_order || 0) - (b.step_order || 0));
  }

  scoredTracks.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    // Prefer tracks that have valid non-employee approvers and zero employee roles
    const aHasOnlyValid = a.validCount > 0 && a.employeeCount === 0 ? 0 : 1;
    const bHasOnlyValid = b.validCount > 0 && b.employeeCount === 0 ? 0 : 1;
    if (aHasOnlyValid !== bHasOnlyValid) return aHasOnlyValid - bHasOnlyValid;
    if (a.employeeCount !== b.employeeCount) return a.employeeCount - b.employeeCount;
    if (b.validCount !== a.validCount) return b.validCount - a.validCount;
    return a.orderIdx - b.orderIdx;
  });

  return scoredTracks[0].steps;
}

/**
 * Finds the best matching active approver from activeStaff for a given step.
 */
function findApproverForStep({
  step,
  activeStaff,
  applicantUserId,
  applicantBranch,
  applicantDept,
  companyId,
}) {
  const cleanApplicantId = String(applicantUserId || "").trim().toLowerCase();
  const cleanBranch = String(applicantBranch || "").trim().toUpperCase();
  const cleanDept = normalizeDeptValue(applicantDept);
  const stepRoleLower = String(step.role_name || "").trim().toLowerCase();
  const stepRoleId = step.role_id ? String(step.role_id) : "";

  const candidates = (activeStaff || []).filter((emp) => {
    const uid = String(emp.user_id || "").trim().toLowerCase();
    if (!uid || uid === cleanApplicantId) return false;
    if (emp.status && String(emp.status).trim().toLowerCase() !== "active") return false;
    return true;
  });

  const matchesStepRole = (emp) => {
    if (stepRoleId && emp.role_id && String(emp.role_id) === stepRoleId) return true;
    const empRoleName = String(emp.role_name || emp.role || "").trim().toLowerCase();
    if (stepRoleLower && empRoleName === stepRoleLower) return true;
    const empCat = classifyRoleCategory(
      emp.role_name || emp.role,
      emp.copied_from_role_name,
      emp.role_type,
      emp.scope_type
    );
    if (step.role_category && step.role_category !== "other" && empCat === step.role_category) {
      return true;
    }
    return false;
  };

  const roleMatches = candidates.filter(matchesStepRole);

  if (step.is_hod) {
    if (!cleanDept) return null;
    const deptMatches = roleMatches.filter((emp) => {
      const eDept = normalizeDeptValue(emp.department);
      return eDept && eDept.toLowerCase() === cleanDept.toLowerCase();
    });
    if (deptMatches.length > 0) {
      // Prefer same company and same branch if multiple
      deptMatches.sort((a, b) => {
        const aComp = Number(a.company_id) === Number(companyId) ? 0 : 1;
        const bComp = Number(b.company_id) === Number(companyId) ? 0 : 1;
        if (aComp !== bComp) return aComp - bComp;
        const aBr = String(a.branch || "").trim().toUpperCase() === cleanBranch ? 0 : 1;
        const bBr = String(b.branch || "").trim().toUpperCase() === cleanBranch ? 0 : 1;
        return aBr - bBr;
      });
      return deptMatches[0];
    }
    return null;
  }

  if (step.is_branch_leader) {
    const branchMatches = roleMatches.filter(
      (emp) => String(emp.branch || "").trim().toUpperCase() === cleanBranch
    );
    if (branchMatches.length > 0) {
      branchMatches.sort((a, b) => {
        const aComp = Number(a.company_id) === Number(companyId) ? 0 : 1;
        const bComp = Number(b.company_id) === Number(companyId) ? 0 : 1;
        return aComp - bComp;
      });
      return branchMatches[0];
    }
    return null;
  }

  if (roleMatches.length > 0) {
    // Prefer same company, then same branch, then same department
    roleMatches.sort((a, b) => {
      const aComp = Number(a.company_id) === Number(companyId) ? 0 : 1;
      const bComp = Number(b.company_id) === Number(companyId) ? 0 : 1;
      if (aComp !== bComp) return aComp - bComp;

      const aBr = String(a.branch || "").trim().toUpperCase() === cleanBranch ? 0 : 1;
      const bBr = String(b.branch || "").trim().toUpperCase() === cleanBranch ? 0 : 1;
      if (aBr !== bBr) return aBr - bBr;

      if (cleanDept) {
        const aDept = String(a.department || "").trim().toLowerCase() === cleanDept.toLowerCase() ? 0 : 1;
        const bDept = String(b.department || "").trim().toLowerCase() === cleanDept.toLowerCase() ? 0 : 1;
        if (aDept !== bDept) return aDept - bDept;
      }
      return 0;
    });
    return roleMatches[0];
  }

  return null;
}

/**
 * Resolves the effective approval workflow steps and current approver for an applicant.
 */
function resolveEffectiveWorkflowForApplicant({
  companyId = 1,
  wfRows = [],
  companyRoles = [],
  companyDepartments = [],
  activeStaff = [],
  applicant = {},
}) {
  const cId = parseInt(companyId, 10) || 1;
  const cleanBranch = String(applicant.branch || "").trim().toUpperCase();
  const cleanDept = normalizeDeptValue(applicant.department);
  const cleanApplicantId = String(applicant.user_id || "").trim().toLowerCase();

  const rolesById = new Map();
  const rolesByName = new Map();
  for (const r of companyRoles || []) {
    if (r.id !== undefined && r.id !== null) rolesById.set(String(r.id), r);
    if (r.name) rolesByName.set(String(r.name).trim().toLowerCase(), r);
  }

  const companyDeptNamesSet = new Set(
    (companyDepartments || [])
      .map((d) => String(d.name || "").trim().toLowerCase())
      .filter(Boolean)
  );

  // Also detect custom roles that are assigned exclusively to staff who lead a department
  // (e.g., Rental Coordinator with department = 'Rental Coordinator')
  const deptMatchedRolesSet = new Set();
  for (const emp of activeStaff || []) {
    const empRoleName = String(emp.role_name || emp.role || "").trim().toLowerCase();
    const empDept = normalizeDeptValue(emp.department);
    const empCat = classifyRoleCategory(
      emp.role_name || emp.role,
      emp.copied_from_role_name,
      emp.role_type,
      emp.scope_type
    );
    if (
      empDept &&
      empRoleName &&
      empCat !== "employee" &&
      empCat !== "branch_leader" &&
      empCat !== "hr_admin" &&
      empCat !== "managing_director" &&
      empCat !== "operation_manager" &&
      (empCat === "head_of_department" || empRoleName === empDept.toLowerCase())
    ) {
      deptMatchedRolesSet.add(empRoleName);
    }
  }

  const companyStaff = (activeStaff || []).filter(
    (emp) => Number(emp.company_id || cId) === cId || (cId === 1 && !emp.company_id)
  );

  // Locate Branch Leader role & active Branch Leader for applicant's branch
  const activeBranchLeader = companyStaff.find((emp) => {
    if (String(emp.user_id || "").trim().toLowerCase() === cleanApplicantId) return false;
    if (String(emp.branch || "").trim().toUpperCase() !== cleanBranch) return false;
    const cat = classifyRoleCategory(
      emp.role_name || emp.role,
      emp.copied_from_role_name,
      emp.role_type,
      emp.scope_type
    );
    return cat === "branch_leader";
  });

  const branchLeaderRoleObj =
    (activeBranchLeader &&
      (rolesById.get(String(activeBranchLeader.role_id)) ||
        rolesByName.get(String(activeBranchLeader.role_name || activeBranchLeader.role || "").trim().toLowerCase()))) ||
    (companyRoles || []).find(
      (r) =>
        Number(r.company_id || cId) === cId &&
        classifyRoleCategory(r.name, r.copied_from_role_name, r.role_type, r.scope_type) === "branch_leader"
    ) ||
    (companyRoles || []).find(
      (r) => classifyRoleCategory(r.name, r.copied_from_role_name, r.role_type, r.scope_type) === "branch_leader"
    );

  // Locate active HOD for applicant's department (if applicant has a department)
  const activeDeptHod = cleanDept
    ? companyStaff.find((emp) => {
        if (String(emp.user_id || "").trim().toLowerCase() === cleanApplicantId) return false;
        const eDept = normalizeDeptValue(emp.department);
        if (!eDept || eDept.toLowerCase() !== cleanDept.toLowerCase()) return false;
        const cat = classifyRoleCategory(
          emp.role_name || emp.role,
          emp.copied_from_role_name,
          emp.role_type,
          emp.scope_type
        );
        const rLower = String(emp.role_name || emp.role || "").trim().toLowerCase();
        return cat === "head_of_department" || deptMatchedRolesSet.has(rLower);
      })
    : null;

  const hodRoleObj =
    (activeDeptHod &&
      (rolesById.get(String(activeDeptHod.role_id)) ||
        rolesByName.get(String(activeDeptHod.role_name || activeDeptHod.role || "").trim().toLowerCase()))) ||
    (companyRoles || []).find(
      (r) =>
        Number(r.company_id || cId) === cId &&
        (classifyRoleCategory(r.name, r.copied_from_role_name, r.role_type, r.scope_type) === "head_of_department" ||
          (cleanDept && String(r.name || "").trim().toLowerCase() === cleanDept.toLowerCase()))
    );

  // Select best matching track from configured approval_workflow
  const rawTrackSteps = selectBestTrackSteps(wfRows, cleanBranch, rolesById, rolesByName);

  // Build normalized step objects, removing invalid employee-only steps
  let normalizedSteps = [];
  for (const st of rawTrackSteps) {
    const meta = getRoleMeta(st, rolesById, rolesByName);
    if (meta.category === "employee") continue;

    const hodFlag = isHodStep(st, meta, companyDeptNamesSet, deptMatchedRolesSet);
    const blFlag = !hodFlag && isBranchLeaderStep(st, meta);

    normalizedSteps.push({
      role_id: meta.roleId,
      role_name: meta.roleName,
      role_category: hodFlag ? "head_of_department" : blFlag ? "branch_leader" : meta.category,
      step_label: st.step_label || meta.roleName,
      branch_scope: st.branch_scope || "ALL",
      is_hod: hodFlag,
      is_branch_leader: blFlag,
      auto_escalate_hours: st.auto_escalate_hours || 48,
    });
  }

  // Fallback when no workflow is configured at all (or all configured steps were Employee roles)
  if (normalizedSteps.length === 0) {
    if (cId === 3 || cleanBranch.startsWith("RV")) {
      normalizedSteps = [
        {
          role_id: "",
          role_name: "Administrative Assistant",
          role_category: "administrative_assistant",
          step_label: "Administrative Assistant",
          branch_scope: "ALL",
          is_hod: false,
          is_branch_leader: false,
        },
        {
          role_id: "",
          role_name: "General Manager",
          role_category: "general_manager",
          step_label: "Highest Approval (General Manager)",
          branch_scope: "ALL",
          is_hod: false,
          is_branch_leader: false,
        },
      ];
    } else if (cId === 1 && cleanBranch === "HQ") {
      normalizedSteps = [
        {
          role_id: hodRoleObj?.id || "",
          role_name: hodRoleObj?.name || "Head of Department",
          role_category: "head_of_department",
          step_label: "Department Review",
          branch_scope: "HQ",
          is_hod: true,
          is_branch_leader: false,
        },
        {
          role_id: "",
          role_name: "Operation Manager",
          role_category: "operation_manager",
          step_label: "Highest Approval (Operation Manager)",
          branch_scope: "HQ",
          is_hod: false,
          is_branch_leader: false,
        },
      ];
    } else if (cId === 1) {
      normalizedSteps = [
        {
          role_id: branchLeaderRoleObj?.id || "",
          role_name: branchLeaderRoleObj?.name || "Branch Leader",
          role_category: "branch_leader",
          step_label: "Branch Endorsement",
          branch_scope: "OTHER_BRANCHES",
          is_hod: false,
          is_branch_leader: true,
        },
        {
          role_id: "",
          role_name: "Managing Director",
          role_category: "managing_director",
          step_label: "Highest Approval (Managing Director)",
          branch_scope: "OTHER_BRANCHES",
          is_hod: false,
          is_branch_leader: false,
        },
      ];
    } else {
      // Subsidiary / new company default
      if (cleanDept && activeDeptHod) {
        normalizedSteps.push({
          role_id: hodRoleObj?.id || activeDeptHod.role_id || "",
          role_name: hodRoleObj?.name || activeDeptHod.role_name || "Head of Department",
          role_category: "head_of_department",
          step_label: "Department Review",
          branch_scope: "ALL",
          is_hod: true,
          is_branch_leader: false,
        });
      }
      if (activeBranchLeader || branchLeaderRoleObj) {
        normalizedSteps.push({
          role_id: branchLeaderRoleObj?.id || activeBranchLeader?.role_id || "",
          role_name: branchLeaderRoleObj?.name || activeBranchLeader?.role_name || "Branch Leader",
          role_category: "branch_leader",
          step_label: "Branch Leader Approval",
          branch_scope: "ALL",
          is_hod: false,
          is_branch_leader: true,
        });
      }
    }
  }

  // Apply Department vs No-Department Routing Rules
  // Note: Main Company (companyId === 1) keeps its existing dual-track (HQ vs Other Branches) workflow untouched.
  const isSubsidiary = cId !== 1;
  const applicantRoleCat = classifyRoleCategory(
    applicant.role_name || applicant.role,
    applicant.copied_from_role_name,
    applicant.role_type,
    applicant.scope_type
  );
  const applicantRoleLower = String(applicant.role_name || applicant.role || "").trim().toLowerCase();

  let effectiveSteps = [];
  if (!isSubsidiary) {
    // Main Company (company_id = 1): preserve configured steps without subsidiary auto-skip/prepend
    effectiveSteps = [...normalizedSteps];
  } else if (!cleanDept) {
    // Subsidiary staff WITHOUT a department: skip any HOD step!
    effectiveSteps = normalizedSteps.filter((st) => !st.is_hod);

    // If skipping HOD left no steps (e.g. workflow only had HOD), fall back to Branch Leader
    if (effectiveSteps.length === 0) {
      effectiveSteps = [
        {
          role_id: branchLeaderRoleObj?.id || activeBranchLeader?.role_id || "",
          role_name: branchLeaderRoleObj?.name || activeBranchLeader?.role_name || "Branch Leader",
          role_category: "branch_leader",
          step_label: "Branch Leader Approval",
          branch_scope: cleanBranch || "ALL",
          is_hod: false,
          is_branch_leader: true,
        },
      ];
    }
  } else {
    // Subsidiary staff WITH a department:
    effectiveSteps = [...normalizedSteps];
    const hasHodInTrack = effectiveSteps.some((st) => st.is_hod);

    // If the track didn't explicitly include an HOD step, yet the company has an active HOD for this department,
    // prepend the department's HOD as Step 1 so department staff go to HOD first.
    if (!hasHodInTrack && activeDeptHod) {
      effectiveSteps.unshift({
        role_id: hodRoleObj?.id || activeDeptHod.role_id || "",
        role_name: hodRoleObj?.name || activeDeptHod.role_name || "Head of Department",
        role_category: "head_of_department",
        step_label: "Department Review",
        branch_scope: cleanBranch || "ALL",
        is_hod: true,
        is_branch_leader: false,
      });
    }
  }

  // Prevent self-approval if the applicant holds the exact role of a step (e.g. HOD or Branch Leader applying for own leave)
  const nonSelfSteps = effectiveSteps.filter((st) => {
    const stRoleLower = String(st.role_name || "").trim().toLowerCase();
    if (st.is_hod && applicantRoleCat === "head_of_department") {
      return false;
    }
    if (st.is_branch_leader && applicantRoleCat === "branch_leader") {
      return false;
    }
    if (stRoleLower && applicantRoleLower && stRoleLower === applicantRoleLower && st.role_category !== "hr_admin") {
      return false;
    }
    return true;
  });

  if (nonSelfSteps.length > 0) {
    effectiveSteps = nonSelfSteps;
  } else if (applicantRoleCat === "head_of_department" && (activeBranchLeader || branchLeaderRoleObj)) {
    effectiveSteps = [
      {
        role_id: branchLeaderRoleObj?.id || activeBranchLeader?.role_id || "",
        role_name: branchLeaderRoleObj?.name || activeBranchLeader?.role_name || "Branch Leader",
        role_category: "branch_leader",
        step_label: "Branch Leader Approval",
        branch_scope: cleanBranch || "ALL",
        is_hod: false,
        is_branch_leader: true,
      },
    ];
  } else {
    // Final escalation fallback (e.g. Branch Leader applying when no higher step is configured)
    const higherRole =
      (companyRoles || []).find((r) =>
        ["managing_director", "operation_manager", "hr_admin"].includes(
          classifyRoleCategory(r.name, r.copied_from_role_name, r.role_type, r.scope_type)
        )
      ) || null;
    effectiveSteps = [
      {
        role_id: higherRole?.id || "",
        role_name: higherRole?.name || "HR Admin",
        role_category: higherRole
          ? classifyRoleCategory(higherRole.name, higherRole.copied_from_role_name, higherRole.role_type, higherRole.scope_type)
          : "hr_admin",
        step_label: higherRole?.name || "HR Admin",
        branch_scope: "ALL",
        is_hod: false,
        is_branch_leader: false,
      },
    ];
  }

  // Attach resolved approver & sequential step_order
  const resolvedSteps = effectiveSteps.map((st, idx) => {
    const approver = findApproverForStep({
      step: st,
      activeStaff,
      applicantUserId: applicant.user_id,
      applicantBranch: cleanBranch,
      applicantDept: cleanDept,
      companyId: cId,
    });

    const contextLabel = st.is_hod
      ? cleanDept || cleanBranch || "Department"
      : st.is_branch_leader
      ? cleanBranch || "Branch"
      : st.role_category === "managing_director" || st.role_category === "operation_manager"
      ? "HQ"
      : approver?.branch || cleanBranch || "Branch";

    return {
      ...st,
      step_order: idx + 1,
      approver: approver || null,
      approver_name: approver?.full_name ? String(approver.full_name).toUpperCase() : null,
      approver_context: contextLabel,
    };
  });

  const firstStep = resolvedSteps[0];
  const initialStatus = firstStep ? `Pending ${firstStep.role_name}` : "Pending HR Admin";

  return {
    effectiveSteps: resolvedSteps,
    initialStatus,
    firstStep,
    workflowStepsForUi: resolvedSteps.map((s) => ({
      step_order: s.step_order,
      step_label: s.step_label,
      role_name: s.role_name,
      role_category: s.role_category,
      branch_scope: s.branch_scope,
      approver_name: s.approver_name,
      approver_context: s.approver_context,
    })),
  };
}

/**
 * Matches a leave request's current Pending status string to one of the resolved steps.
 */
function findStepIndexForStatus(effectiveSteps, currentStatus) {
  if (!Array.isArray(effectiveSteps) || effectiveSteps.length === 0) return -1;
  const rawPending = String(currentStatus || "").replace(/^Pending\s+/i, "").trim();
  const cleanPending = rawPending.toLowerCase();
  const tokenPending = normalizeToken(rawPending);

  return effectiveSteps.findIndex((s) => {
    const rLower = String(s.role_name || "").trim().toLowerCase();
    const lLower = String(s.step_label || "").trim().toLowerCase();
    const rToken = normalizeToken(s.role_name);
    const lToken = normalizeToken(s.step_label);

    if (cleanPending === rLower || cleanPending === lLower) return true;
    if (tokenPending && (tokenPending === rToken || tokenPending === lToken)) return true;
    if ((cleanPending === "hod" || tokenPending === "headofdepartment") && s.is_hod) return true;
    if (tokenPending === "branchleader" && s.is_branch_leader) return true;
    if (tokenPending === "md" && s.role_category === "managing_director") return true;
    if ((tokenPending === "operation" || tokenPending === "finance" || tokenPending === "financemanager") && s.role_category === "operation_manager") {
      return true;
    }
    if ((cleanPending.includes("administrative") || cleanPending.includes("travel")) && s.role_category === "administrative_assistant") {
      return true;
    }
    if (cleanPending.includes("general") && s.role_category === "general_manager") {
      return true;
    }
    return false;
  });
}

module.exports = {
  normalizeDeptValue,
  normalizeToken,
  classifyRoleCategory,
  isHodStep,
  isBranchLeaderStep,
  selectBestTrackSteps,
  findApproverForStep,
  resolveEffectiveWorkflowForApplicant,
  findStepIndexForStatus,
};
