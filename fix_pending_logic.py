with open('src/components/leave/ApprovalHistoryTimeline.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

old_logic = """    // If overall leave status is still Pending, append current pending step
    if (status && status.startsWith("Pending")) {
      let pendingRoleName = "";
      if (approverRole) {
        pendingRoleName = formatRoleWithContext(approverRole);
      } else if (status === "Pending HOD") {
        pendingRoleName = "Head of Department";
      } else if (status === "Pending Branch Leader") {
        pendingRoleName = `Branch Leader (${branch})`;
      } else if (status === "Pending Operation Manager" || status === "Pending Finance") {
        pendingRoleName = "Operation Manager";
      } else if (status === "Pending MD") {
        pendingRoleName = "Managing Director";
      } else {
        pendingRoleName = isHQ ? "Head of Department" : `Branch Leader (${branch})`;
      }"""

new_logic = """    // If overall leave status is still Pending, append current pending step
    if (status && status.startsWith("Pending")) {
      let pendingRoleName = "";
      if (status === "Pending HOD") {
        pendingRoleName = "Head of Department";
      } else if (status === "Pending Branch Leader") {
        pendingRoleName = `Branch Leader (${branch})`;
      } else if (status === "Pending Operation Manager" || status === "Pending Finance") {
        pendingRoleName = "Operation Manager";
      } else if (status === "Pending MD") {
        pendingRoleName = "Managing Director";
      } else if (approverRole) {
        pendingRoleName = formatRoleWithContext(approverRole);
      } else {
        pendingRoleName = isHQ ? "Head of Department" : `Branch Leader (${branch})`;
      }"""

if old_logic in text:
    text = text.replace(old_logic, new_logic)
    with open('src/components/leave/ApprovalHistoryTimeline.tsx', 'w', encoding='utf-8') as f:
        f.write(text)
    print("Fixed pending logic in Timeline (with history)!")
else:
    print("Failed to find first logic block")

old_logic_2 = """    } else {
      // Pending
      let pendingRoleName = isHQ ? "Head of Department" : `Branch Leader (${branch})`;
      if (status === "Pending Operation Manager" || status === "Pending Finance") {
        pendingRoleName = "Operation Manager";
      } else if (status === "Pending MD") {
        pendingRoleName = "Managing Director";
      }
      displayItems.push({
        status: 'Pending',
        name: pendingApproverName || "Approver",
        roleLabel: pendingRoleName,
      });
    }"""

new_logic_2 = """    } else {
      // Pending
      let pendingRoleName = "";
      if (status === "Pending HOD") {
        pendingRoleName = "Head of Department";
      } else if (status === "Pending Branch Leader") {
        pendingRoleName = `Branch Leader (${branch})`;
      } else if (status === "Pending Operation Manager" || status === "Pending Finance") {
        pendingRoleName = "Operation Manager";
      } else if (status === "Pending MD") {
        pendingRoleName = "Managing Director";
      } else if (approverRole) {
        pendingRoleName = formatRoleWithContext(approverRole);
      } else {
        pendingRoleName = isHQ ? "Head of Department" : `Branch Leader (${branch})`;
      }
      displayItems.push({
        status: 'Pending',
        name: pendingApproverName || "Approver",
        roleLabel: pendingRoleName,
      });
    }"""

if old_logic_2 in text:
    text = text.replace(old_logic_2, new_logic_2)
    with open('src/components/leave/ApprovalHistoryTimeline.tsx', 'w', encoding='utf-8') as f:
        f.write(text)
    print("Fixed pending logic in Timeline (no history)!")
else:
    print("Failed to find second logic block")
