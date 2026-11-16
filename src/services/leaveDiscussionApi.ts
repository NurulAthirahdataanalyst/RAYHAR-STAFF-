import { API_BASE_URL } from "@/config/api";
import type {
  FetchLeaveDiscussionsResult,
  LeaveDiscussionMessage,
} from "@/types/leaveDiscussion";

export async function fetchLeaveDiscussions(
  leaveRequestId: number | string,
  userId?: string,
  role?: string
): Promise<FetchLeaveDiscussionsResult> {
  const params = new URLSearchParams();
  if (userId) params.set("userId", userId);
  if (role) params.set("role", role);
  const qs = params.toString() ? `?${params.toString()}` : "";

  const res = await fetch(
    `${API_BASE_URL}/api/leave-requests/${encodeURIComponent(String(leaveRequestId))}/discussions${qs}`
  );
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to load leave discussion");
  }
  return {
    discussions: data.discussions || [],
    permission: data.permission,
    currentApproverLabel: data.currentApproverLabel,
    unreadCount: typeof data.unreadCount === "number" ? data.unreadCount : 0,
  };
}

export async function postLeaveDiscussionMessage(params: {
  leaveRequestId: number | string;
  senderId: string;
  senderRole: string;
  message: string;
  attachment?: File | null;
}): Promise<LeaveDiscussionMessage> {
  const formData = new FormData();
  formData.append("sender_id", params.senderId);
  formData.append("sender_role", params.senderRole);
  formData.append("message", params.message.trim());
  if (params.attachment) {
    formData.append("attachment", params.attachment);
  }

  const res = await fetch(
    `${API_BASE_URL}/api/leave-requests/${encodeURIComponent(String(params.leaveRequestId))}/discussions`,
    {
      method: "POST",
      body: formData,
    }
  );
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to send discussion note");
  }
  return data.discussion;
}

export async function markLeaveDiscussionRead(
  leaveRequestId: number | string,
  userId: string
): Promise<void> {
  if (!userId) return;
  const res = await fetch(
    `${API_BASE_URL}/api/leave-requests/${encodeURIComponent(String(leaveRequestId))}/discussions/read`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    }
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to mark discussion as read");
  }
}
