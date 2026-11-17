import React, { useRef, useState } from "react";
import { FileText, Loader2, Paperclip, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const MAX_MESSAGE_LENGTH = 1000;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".docx"];
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

interface LeaveDiscussionComposerProps {
  onSend: (message: string, attachment?: File | null) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
}

export const LeaveDiscussionComposer: React.FC<LeaveDiscussionComposerProps> = ({
  onSend,
  disabled = false,
  placeholder = "Add a clarification note or reply (Ctrl+Enter to send)...",
}) => {
  const [message, setMessage] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
    const hasValidMime = !file.type || ALLOWED_MIME_TYPES.has(file.type.toLowerCase());

    if (!hasValidExt || !hasValidMime) {
      toast.error("Unsupported file format", {
        description: "Only PDF, JPG, PNG, and DOCX files are allowed.",
      });
      e.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error("File too large", {
        description: "Maximum attachment size is 10 MB.",
      });
      e.target.value = "";
      return;
    }

    setAttachment(file);
  };

  const clearAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    const trimmed = message.trim();
    if (!trimmed && !attachment) {
      toast.error("Please enter a message or attach a supporting document.");
      return;
    }
    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      toast.error(`Message cannot exceed ${MAX_MESSAGE_LENGTH} characters.`);
      return;
    }

    setSubmitting(true);
    try {
      await onSend(trimmed, attachment);
      setMessage("");
      clearAttachment();
    } catch (err) {
      toast.error("Failed to post note", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const charCount = message.length;
  const isNearLimit = charCount >= 900 && charCount < MAX_MESSAGE_LENGTH;
  const isAtLimit = charCount >= MAX_MESSAGE_LENGTH;
  const canSubmit = !disabled && !submitting && (message.trim().length > 0 || Boolean(attachment));

  return (
    <div className="space-y-3 pt-3 border-t border-border/50 print:hidden">
      <div className="space-y-1.5">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && canSubmit) {
              e.preventDefault();
              void handleSubmit();
            }
          }}
          placeholder={placeholder}
          maxLength={MAX_MESSAGE_LENGTH}
          disabled={disabled || submitting}
          rows={3}
          className="min-h-[84px] resize-y rounded-2xl border-border/60 bg-muted/20 focus-visible:ring-[#942392] text-xs sm:text-sm"
        />

        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] text-muted-foreground font-medium">
            Supported files: PDF, JPG, PNG, DOCX (max 10 MB)
          </span>
          <span
            className={`text-[10px] font-bold tabular-nums ${
              isAtLimit
                ? "text-rose-600"
                : isNearLimit
                  ? "text-amber-600"
                  : "text-muted-foreground"
            }`}
          >
            {charCount} / {MAX_MESSAGE_LENGTH}
          </span>
        </div>
      </div>

      {attachment && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-[#942392]/25 bg-[#942392]/5 px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-[#942392] shrink-0" />
            <span className="text-xs font-bold text-foreground truncate">
              {attachment.name}
            </span>
            <span className="text-[10px] text-muted-foreground shrink-0">
              ({Math.max(1, Math.round(attachment.size / 1024))} KB)
            </span>
          </div>
          <button
            type="button"
            onClick={clearAttachment}
            disabled={submitting}
            className="text-muted-foreground hover:text-rose-600 transition-colors p-0.5"
            title="Remove attachment"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.docx"
            className="hidden"
            onChange={handleFileChange}
            disabled={disabled || submitting}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || submitting}
            onClick={() => fileInputRef.current?.click()}
            className="group h-9 gap-1.5 rounded-xl border-border/70 bg-background px-3.5 text-xs font-bold hover:bg-[#942392]/10 hover:border-[#942392]/50 hover:text-[#942392] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer"
          >
            <Paperclip className="w-3.5 h-3.5 transition-transform duration-200 group-hover:-rotate-12" />
            Attach File
          </Button>
        </div>

        <Button
          type="button"
          size="sm"
          disabled={!canSubmit}
          onClick={() => void handleSubmit()}
          className="group h-9 gap-2 rounded-xl bg-[#942392] hover:bg-[#7d1b7b] text-white font-black text-[10px] uppercase tracking-wider px-5 shadow-sm hover:shadow-md hover:shadow-[#942392]/25 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
        >
          {submitting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              Send
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
