with open('src/components/leave/ApprovalHistoryTimeline.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

old_interface = """interface ApprovalHistoryTimelineProps {
  status: string;
  approverRole?: string;
  approvalHistory?: ApprovalHistoryRecord[];
  branch?: string;
  pendingApproverName?: string;
}"""

new_interface = """interface ApprovalHistoryTimelineProps {
  status: string;
  approverRole?: string;
  approvalHistory?: ApprovalHistoryRecord[];
  branch?: string;
  department?: string;
  pendingApproverName?: string;
}"""

text = text.replace(old_interface, new_interface)

old_props = """export const ApprovalHistoryTimeline: React.FC<ApprovalHistoryTimelineProps> = ({
  status,
  approverRole,
  approvalHistory = [],
  branch = "HQ",
  pendingApproverName,
}) => {"""

new_props = """export const ApprovalHistoryTimeline: React.FC<ApprovalHistoryTimelineProps> = ({
  status,
  approverRole,
  approvalHistory = [],
  branch = "HQ",
  department = "",
  pendingApproverName,
}) => {"""

text = text.replace(old_props, new_props)

old_logic = """      let pendingRoleName = "";
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

new_logic = """      let pendingRoleName = "";
      if (status === "Pending HOD") {
        pendingRoleName = `Head of Department (${department}) (${branch})`;
      } else if (status === "Pending Branch Leader") {
        pendingRoleName = `Branch Leader (${branch})`;
      } else if (status === "Pending Operation Manager" || status === "Pending Finance") {
        pendingRoleName = "Operation Manager";
      } else if (status === "Pending MD") {
        pendingRoleName = "Managing Director";
      } else if (approverRole) {
        pendingRoleName = formatRoleWithContext(approverRole, department, branch);
      } else {
        pendingRoleName = isHQ ? `Head of Department (${department}) (${branch})` : `Branch Leader (${branch})`;
      }
      pendingRoleName = pendingRoleName.replace(' ()', '').trim();"""

text = text.replace(old_logic, new_logic)

old_logic_2 = """      let pendingRoleName = "";
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

new_logic_2 = """      let pendingRoleName = "";
      if (status === "Pending HOD") {
        pendingRoleName = `Head of Department (${department}) (${branch})`;
      } else if (status === "Pending Branch Leader") {
        pendingRoleName = `Branch Leader (${branch})`;
      } else if (status === "Pending Operation Manager" || status === "Pending Finance") {
        pendingRoleName = "Operation Manager";
      } else if (status === "Pending MD") {
        pendingRoleName = "Managing Director";
      } else if (approverRole) {
        pendingRoleName = formatRoleWithContext(approverRole, department, branch);
      } else {
        pendingRoleName = isHQ ? `Head of Department (${department}) (${branch})` : `Branch Leader (${branch})`;
      }
      pendingRoleName = pendingRoleName.replace(' ()', '').trim();"""

text = text.replace(old_logic_2, new_logic_2)

with open('src/components/leave/ApprovalHistoryTimeline.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Updated Timeline!")
