import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Info, Loader2, Lock, MessageSquare, ShieldAlert, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { API_BASE_URL } from "@/config/api";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/contexts/RoleContext";
import {
  fetchLeaveDiscussions,
  markLeaveDiscussionRead,
  postLeaveDiscussionMessage,
} from "@/services/leaveDiscussionApi";
import type { LeaveDiscussionMessage } from "@/types/leaveDiscussion";
import {
  getCurrentApproverLabel,
  getLeaveDiscussionPermission,
} from "@/utils/leaveDiscussionPermissions";
import { LeaveDiscussionTimeline } from "./LeaveDiscussionTimeline";
import { LeaveDiscussionComposer } from "./LeaveDiscussionComposer";

interface LeaveDiscussionCardProps {
  leaveRequest: {
    id: number | string;
    user_id?: string;
    userId?: string;
    employee_id?: string;
    employeeId?: string;
    created_by?: string;
    createdBy?: string;
    status: string;
    branch?: string;
    department?: string;
    pendingApproverName?: string;
    pending_approver_name?: string;
    unreadDiscussionCount?: number;
    approvalHistory?: Array<{ approver_id?: string; approver_role?: string }>;
    workflowSteps?: Array<{ step_order?: number; role_name?: string; step_label?: string }>;
  };
  role?: string;
  onMarkedRead?: (leaveId: number) => void;
}

export const LeaveDiscussionCard: React.FC<LeaveDiscussionCardProps> = ({
  leaveRequest,
  role: propRole,
  onMarkedRead,
}) => {
  const { user } = useAuth();
  const { role: contextRole, userId, userBranch, userDepartment } = useRole();

  const leaveId = Number(leaveRequest.id);
  const currentUserId = String(userId || user?.user_id || user?.id || "").trim();
  const currentEmployeeId = String(
    user?.employee_id || user?.user_id || user?.id || userId || ""
  ).trim();
  const effectiveRole = propRole || contextRole || "employee";

  const [messages, setMessages] = useState<LeaveDiscussionMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadBannerCount, setUnreadBannerCount] = useState<number>(
    Number(leaveRequest.unreadDiscussionCount || 0)
  );
  const [serverApproverLabel, setServerApproverLabel] = useState<string>("");
  const onMarkedReadRef = useRef(onMarkedRead);
  onMarkedReadRef.current = onMarkedRead;

  const permission = useMemo(
    () =>
      getLeaveDiscussionPermission({
        currentUserId,
        currentEmployeeId,
        currentUserRole: effectiveRole,
        currentUserBranch: userBranch,
        currentUserDepartment: userDepartment,
        leaveRequest,
      }),
    [
      currentUserId,
      currentEmployeeId,
      effectiveRole,
      userBranch,
      userDepartment,
      leaveRequest,
    ]
  );

  const loadDiscussions = useCallback(async () => {
    if (!leaveId || Number.isNaN(leaveId)) return;
    try {
      setError(null);
      const result = await fetchLeaveDiscussions(leaveId, currentUserId, effectiveRole);
      setMessages(result.discussions || []);
      if (result.currentApproverLabel) {
        setServerApproverLabel(result.currentApproverLabel);
      }
      if (typeof result.unreadCount === "number" && result.unreadCount > 0) {
        setUnreadBannerCount(result.unreadCount);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load leave discussion");
    } finally {
      setLoading(false);
    }
  }, [leaveId, currentUserId, effectiveRole]);

  useEffect(() => {
    setLoading(true);
    setUnreadBannerCount(Number(leaveRequest.unreadDiscussionCount || 0));
    void loadDiscussions();
  }, [loadDiscussions, leaveRequest.unreadDiscussionCount]);

  // Mark discussion as read when opened by this user
  useEffect(() => {
    if (!leaveId || !currentUserId || loading || !permission.canView) return;
    markLeaveDiscussionRead(leaveId, currentUserId)
      .then(() => {
        onMarkedReadRef.current?.(leaveId);
      })
      .catch(() => {});
  }, [leaveId, currentUserId, loading, permission.canView, messages.length]);

  // Live updates via existing SSE stream when another participant posts or status changes
  useEffect(() => {
    if (!leaveId) return;
    const sse = new EventSource(`${API_BASE_URL}/api/presence/stream`);
    sse.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (
          (data.type === "leave-discussion" || data.type === "leave-status") &&
          Number(data.leaveId) === leaveId
        ) {
          void loadDiscussions();
        }
      } catch {
        // Ignore malformed SSE events
      }
    };
    return () => {
      sse.close();
    };
  }, [leaveId, loadDiscussions]);

  const handleSend = async (text: string, attachment?: File | null) => {
    if (!currentUserId) {
      throw new Error("Unable to identify current user.");
    }
    const senderRole = permission.isOwner ? "employee" : effectiveRole;
    const created = await postLeaveDiscussionMessage({
      leaveRequestId: leaveId,
      senderId: currentUserId,
      senderRole,
      message: text,
      attachment,
    });
    setMessages((prev) => [...prev, created]);
    setUnreadBannerCount(0);
    onMarkedReadRef.current?.(leaveId);
  };

  if (!permission.canView) {
    return null;
  }

  const isPending = String(leaveRequest.status || "")
    .trim()
    .toLowerCase()
    .startsWith("pending");
  const currentApproverText =
    serverApproverLabel ||
    getCurrentApproverLabel(
      leaveRequest.status,
      leaveRequest.department,
      leaveRequest.branch,
      leaveRequest.pendingApproverName || leaveRequest.pending_approver_name
    );

  const userCommentCount = messages.filter((m) => m.message_type !== "system").length;

  return (
    <div
      id="leave-discussion-section"
      className="pt-4 border-t border-border/50 space-y-4 print:hidden"
    >
      <div className="rounded-[20px] border border-border/60 bg-card/60 p-4 sm:p-5 space-y-4 shadow-xs">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border/50">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#942392]" />
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-foreground">
                Leave Discussion
              </h3>
              {userCommentCount > 0 && (
                <Badge
                  variant="secondary"
                  className="text-[10px] font-bold px-2 py-0 h-5 rounded-full"
                >
                  {userCommentCount} {userCommentCount === 1 ? "Note" : "Notes"}
                </Badge>
              )}
              {unreadBannerCount > 0 && (
                <Badge className="text-[10px] font-black px-2 py-0 h-5 rounded-full bg-[#942392] text-white border-none">
                  {unreadBannerCount} New
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Pre-approval clarification thread &bull; Permanently recorded for audit
            </p>
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-center rounded-xl border border-border/60 bg-muted/30 px-3 py-1.5">
            <UserCheck className="w-3.5 h-3.5 text-[#942392] shrink-0" />
            <div className="text-left">
              <span className="block text-[9px] font-black uppercase tracking-wider text-muted-foreground leading-none">
                {isPending ? "Current Approver" : "Workflow Status"}
              </span>
              <span className="block text-[11px] font-bold text-foreground mt-0.5">
                {currentApproverText}
              </span>
            </div>
          </div>
        </div>

        {/* HR Intervention Notice when HR participates during another stage */}
        {permission.canPost && permission.isHrAdmin && !permission.isCurrentApprover && !permission.isOwner && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] font-semibold text-amber-800 dark:text-amber-200">
            <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              HR Admin Override: You can participate in this thread and also approve or reject
              this request at any stage.
            </span>
          </div>
        )}

        {/* Timeline */}
        {loading ? (
          <div className="py-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin text-[#942392]" />
            Loading leave discussion...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-600">
            {error}
          </div>
        ) : (
          <LeaveDiscussionTimeline messages={messages} currentUserId={currentUserId} />
        )}

        {/* Composer OR Closed / Read-Only Banner */}
        {permission.canPost ? (
          <LeaveDiscussionComposer
            onSend={handleSend}
            placeholder={
              permission.isOwner
                ? "Reply to the approver or attach supporting documents..."
                : "Ask a question or request supporting documents from the employee..."
            }
          />
        ) : (
          <div
            className={`rounded-2xl border px-4 py-3 flex items-start gap-2.5 ${
              !isPending
                ? "border-slate-300/70 bg-slate-100/70 dark:border-slate-700 dark:bg-slate-800/50"
                : "border-border/60 bg-muted/30"
            }`}
          >
            {!isPending ? (
              <Lock className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            ) : (
              <Info className="w-4 h-4 text-[#942392] shrink-0 mt-0.5" />
            )}
            <div className="space-y-0.5">
              <p className="text-xs font-black uppercase tracking-wider text-foreground">
                {!isPending ? "Discussion Closed" : "Read-Only Access"}
              </p>
              <p className="text-[11px] text-muted-foreground">{permission.reason}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
