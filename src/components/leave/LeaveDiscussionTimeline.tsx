import React, { useEffect, useRef } from "react";
import { format } from "date-fns";
import {
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  MessageSquare,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import type { LeaveDiscussionMessage } from "@/types/leaveDiscussion";
import { formatDiscussionSenderRole } from "@/utils/leaveDiscussionPermissions";
import {
  downloadUploadedFile,
  getMcAttachmentUrl,
  isPdfUrl,
  safeFileUrl,
  sanitizeUrl,
} from "@/utils/security";
import { toast } from "sonner";

interface LeaveDiscussionTimelineProps {
  messages: LeaveDiscussionMessage[];
  currentUserId?: string;
}

const SystemBotIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    {/* Left & Right Antennas */}
    <line x1="8.5" y1="7" x2="6.5" y2="3.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="6.2" cy="3.5" r="1.4" fill="currentColor" />
    <line x1="15.5" y1="7" x2="17.5" y2="3.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="17.8" cy="3.5" r="1.4" fill="currentColor" />
    {/* Side Ears */}
    <rect x="2" y="11" width="2.5" height="5" rx="1.25" fill="currentColor" />
    <rect x="19.5" y="11" width="2.5" height="5" rx="1.25" fill="currentColor" />
    {/* Robot Head */}
    <rect
      x="4.5"
      y="7"
      width="15"
      height="13"
      rx="3.8"
      className="fill-[#e9d5ff] dark:fill-[#942392]/30"
      stroke="currentColor"
      strokeWidth="1.8"
    />
    {/* Eyes */}
    <circle cx="9.2" cy="12" r="1.45" fill="currentColor" />
    <circle cx="14.8" cy="12" r="1.45" fill="currentColor" />
    {/* Mouth */}
    <rect x="8.2" y="15.5" width="7.6" height="1.8" rx="0.9" fill="currentColor" />
  </svg>
);

const getInitials = (name?: string): string => {
  const parts = String(name || "User")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const formatTimestamp = (iso: string): string => {
  try {
    return format(new Date(iso), "dd MMM yyyy • h:mm a");
  } catch {
    return iso || "";
  }
};

const formatFileSize = (bytes?: number | null): string => {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const isImageAttachment = (url?: string | null, mime?: string | null): boolean => {
  if (mime && mime.toLowerCase().startsWith("image/")) return true;
  const clean = String(url || "").split("?")[0].toLowerCase();
  return clean.endsWith(".jpg") || clean.endsWith(".jpeg") || clean.endsWith(".png");
};

const getAttachmentFilename = (msg: LeaveDiscussionMessage): string => {
  if (msg.attachment_name) return msg.attachment_name;
  if (!msg.attachment_url) return "attachment";
  const seg = msg.attachment_url.split("?")[0].split("/").pop();
  return seg || "attachment";
};

export const LeaveDiscussionTimeline: React.FC<LeaveDiscussionTimelineProps> = ({
  messages,
  currentUserId,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const prevCountRef = useRef<number>(0);

  useEffect(() => {
    if (messages.length > 0 && messages.length !== prevCountRef.current) {
      const behavior: ScrollBehavior = prevCountRef.current === 0 ? "auto" : "smooth";
      requestAnimationFrame(() => {
        const container = scrollContainerRef.current;
        if (container) {
          container.scrollTo({ top: container.scrollHeight, behavior });
        }
      });
    }
    prevCountRef.current = messages.length;
  }, [messages.length]);

  if (!messages || messages.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 bg-muted/15 py-8 px-4 text-center space-y-2">
        <div className="w-10 h-10 rounded-full bg-[#942392]/10 text-[#942392] mx-auto flex items-center justify-center">
          <MessageSquare className="w-5 h-5" />
        </div>
        <p className="text-xs font-bold text-foreground">No discussion notes yet</p>
        <p className="text-[11px] text-muted-foreground max-w-md mx-auto">
          Use this thread to request clarification or share supporting documents before a final
          decision is made.
        </p>
      </div>
    );
  }

  return (
    <div ref={scrollContainerRef} className="max-h-[360px] overflow-y-auto custom-scrollbar pr-2 space-y-0">
      {messages.map((msg, idx) => {
        const isSystem =
          msg.message_type === "system" ||
          String(msg.sender_role).toLowerCase() === "system";
        const isOwn =
          Boolean(currentUserId) &&
          String(msg.sender_id || "").trim().toLowerCase() ===
            String(currentUserId).trim().toLowerCase();
        const isEmployee =
          String(msg.sender_role || "").toLowerCase() === "employee" ||
          String(msg.sender_role || "").toLowerCase() === "applicant";
        const isHr = String(msg.sender_role || "").toLowerCase().includes("hr");

        const attachmentHref = msg.attachment_url
          ? sanitizeUrl(
              getMcAttachmentUrl(msg.attachment_url) ||
                safeFileUrl(msg.attachment_url, "about:blank")
            )
          : "";
        const isImg = isImageAttachment(msg.attachment_url, msg.attachment_mime);
        const isPdf = isPdfUrl(msg.attachment_url) || msg.attachment_mime === "application/pdf";
        const fileName = getAttachmentFilename(msg);
        const fileSizeLabel = formatFileSize(msg.attachment_size);

        return (
          <React.Fragment key={msg.id}>
            {idx > 0 && <Separator className="my-3.5 bg-border/50" />}

            <div className="flex items-start gap-3 py-1 px-1">
              {isSystem ? (
                <div className="w-8 h-8 rounded-full bg-[#942392]/12 border border-[#942392]/25 flex items-center justify-center shrink-0 mt-0.5 text-[#701a75] dark:text-[#e9d5ff]">
                  <SystemBotIcon className="w-4 h-4" />
                </div>
              ) : (
                <Avatar className="w-8 h-8 border border-border/60 shrink-0 mt-0.5">
                  {msg.sender_avatar && (
                    <AvatarImage src={sanitizeUrl(msg.sender_avatar, "")} alt={msg.sender_name} />
                  )}
                  <AvatarFallback
                    className={`text-[10px] font-black ${
                      isEmployee
                        ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        : "bg-[#942392]/12 text-[#942392]"
                    }`}
                  >
                    {getInitials(msg.sender_name)}
                  </AvatarFallback>
                </Avatar>
              )}

              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <span className="text-xs font-black text-foreground truncate uppercase">
                      {isSystem ? "WORKFLOW SYSTEM" : msg.sender_name || msg.sender_id}
                      {!isSystem && isOwn && (
                        <span className="ml-1 text-[10px] font-bold text-muted-foreground normal-case">
                          (You)
                        </span>
                      )}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-[1px] text-[9px] leading-4 tracking-wider font-black uppercase rounded-full border shadow-2xs ${
                        isSystem
                          ? "bg-[#942392]/10 text-[#942392] border-[#942392]/25 dark:text-[#f3a8f1]"
                          : isEmployee
                            ? "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                            : isHr
                              ? "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-300"
                              : "bg-[#942392]/10 text-[#942392] border-[#942392]/25 dark:text-[#f3a8f1]"
                      }`}
                    >
                      {isSystem
                        ? "System"
                        : formatDiscussionSenderRole(
                            msg.sender_role,
                            msg.sender_department,
                            msg.sender_branch
                          )}
                    </span>
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">
                    {formatTimestamp(msg.created_at)}
                  </span>
                </div>

                {msg.message && (
                  <p className="text-xs sm:text-[13px] text-foreground/90 leading-relaxed whitespace-pre-wrap break-words">
                    {msg.message}
                  </p>
                )}

                {!isSystem && msg.attachment_url && attachmentHref !== "about:blank" && (
                  <div className="mt-2 rounded-xl border border-border/60 bg-muted/25 px-3 py-2 flex flex-wrap items-center justify-between gap-2 max-w-lg">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[#942392]/10 text-[#942392] flex items-center justify-center shrink-0">
                        {isImg ? (
                          <ImageIcon className="w-4 h-4" />
                        ) : (
                          <FileText className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate max-w-[210px] sm:max-w-[260px]">
                          {fileName}
                        </p>
                        {fileSizeLabel && (
                          <p className="text-[10px] text-muted-foreground font-medium">
                            {fileSizeLabel}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 print:hidden">
                      {(isImg || isPdf) && (
                        <a
                          href={attachmentHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg bg-[#942392] text-white hover:bg-[#5e0080] text-[10px] font-bold uppercase tracking-wider transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          try {
                            await downloadUploadedFile(msg.attachment_url!, fileName);
                          } catch {
                            toast.error("Failed to download attachment");
                          }
                        }}
                        className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg border border-[#942392]/30 text-[#942392] hover:bg-[#942392] hover:text-white text-[10px] font-bold uppercase tracking-wider transition-colors"
                      >
                        <Download className="w-3 h-3" />
                        Download
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};
