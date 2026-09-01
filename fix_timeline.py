with open('src/components/leave/ApprovalHistoryTimeline.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

old_interface = """interface ApprovalHistoryTimelineProps {
  status: string;
  approverRole?: string;
  approvalHistory?: ApprovalHistoryRecord[];
  branch?: string;
}"""

new_interface = """interface ApprovalHistoryTimelineProps {
  status: string;
  approverRole?: string;
  approvalHistory?: ApprovalHistoryRecord[];
  branch?: string;
  pendingApproverName?: string;
}"""
text = text.replace(old_interface, new_interface)

old_props = """export const ApprovalHistoryTimeline: React.FC<ApprovalHistoryTimelineProps> = ({
  status,
  approverRole,
  approvalHistory = [],
  branch = "HQ",
}) => {"""

new_props = """export const ApprovalHistoryTimeline: React.FC<ApprovalHistoryTimelineProps> = ({
  status,
  approverRole,
  approvalHistory = [],
  branch = "HQ",
  pendingApproverName,
}) => {"""
text = text.replace(old_props, new_props)

old_pending_push_1 = """      displayItems.push({
        status: 'Pending',
        roleLabel: pendingRoleName,
      });
    }
  } else {"""
new_pending_push_1 = """      displayItems.push({
        status: 'Pending',
        name: pendingApproverName || "Approver",
        roleLabel: pendingRoleName,
      });
    }
  } else {"""
text = text.replace(old_pending_push_1, new_pending_push_1)

old_pending_push_2 = """      displayItems.push({
        status: 'Pending',
        roleLabel: pendingRoleName,
      });
    }
  }

  return ("""
new_pending_push_2 = """      displayItems.push({
        status: 'Pending',
        name: pendingApproverName || "Approver",
        roleLabel: pendingRoleName,
      });
    }
  }

  return ("""
text = text.replace(old_pending_push_2, new_pending_push_2)

old_render = """                    {isApproved || isRejected ? (
                      <p className="font-medium text-foreground">
                        by{' '}
                        <span className="font-black text-foreground uppercase">
                          {item.name}
                        </span>{' '}
                        <span className="font-bold text-foreground/80">
                          ({item.roleLabel})
                        </span>
                      </p>
                    ) : (
                      <p className="font-bold text-foreground/80">
                        Pending approval from{' '}
                        <span className="font-black text-foreground">
                          {item.roleLabel}
                        </span>
                      </p>
                    )}"""
new_render = """                    {isApproved || isRejected ? (
                      <p className="font-medium text-foreground">
                        by{' '}
                        <span className="font-black text-foreground uppercase">
                          {item.name}
                        </span>{' '}
                        <span className="font-bold text-foreground/80">
                          ({item.roleLabel})
                        </span>
                      </p>
                    ) : (
                      <p className="font-bold text-foreground/80">
                        Pending approval by{' '}
                        <span className="font-black text-foreground uppercase">
                          {item.name}
                        </span>{' '}
                        <span className="font-bold text-foreground/80">
                          ({item.roleLabel})
                        </span>
                      </p>
                    )}"""
text = text.replace(old_render, new_render)

with open('src/components/leave/ApprovalHistoryTimeline.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
