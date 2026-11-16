export type DiscussionMessageType = "comment" | "system";

export type DiscussionParticipantRole =
  | "system"
  | "employee"
  | "head_of_department"
  | "branch_leader"
  | "operation_manager"
  | "hr_admin"
  | "managing_director"
  | "assure_leader"
  | (string & {});

export type DiscussionAccessMode = "participant" | "read_only" | "denied";

export interface LeaveDiscussionMessage {
  id: number;
  leave_request_id: number;
  sender_id: string;
  sender_role: DiscussionParticipantRole;
  message_type: DiscussionMessageType;
  sender_name: string;
  sender_avatar?: string | null;
  sender_department?: string | null;
  sender_branch?: string | null;
  message: string;
  attachment_url: string | null;
  attachment_name?: string | null;
  attachment_mime?: string | null;
  attachment_size?: number | null;
  created_at: string;
  updated_at: string;
}

export interface DiscussionPermissionState {
  canView: boolean;
  canPost: boolean;
  mode: DiscussionAccessMode;
  reason?: string;
  viewerRoleLabel: string;
  isOwner: boolean;
  isHrAdmin: boolean;
  isCurrentApprover: boolean;
}

export interface FetchLeaveDiscussionsResult {
  discussions: LeaveDiscussionMessage[];
  permission?: DiscussionPermissionState;
  currentApproverLabel?: string;
  unreadCount?: number;
}
