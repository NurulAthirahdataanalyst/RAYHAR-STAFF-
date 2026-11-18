import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { API_BASE_URL } from "@/config/api";
import { formatDeviceDisplay } from "@/utils/deviceInfo";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  Loader2,
  ExternalLink,
  History,
  ImageOff,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Smartphone,
} from "lucide-react";

interface PhotoPreviewItem {
  label: string;
  actionBadge: "CLOCK IN" | "CLOCK OUT";
  src: string;
  lat?: number | null;
  lng?: number | null;
  device?: string | null;
  timestamp?: string | null;
}

interface AttendanceVerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attendanceId: number | null;
  canReview?: boolean;
  reviewerId?: string;
  reviewerName?: string;
  reviewerRole?: string;
  onActionCompleted?: () => void;
}

export function getVerificationBadgeProps(status?: string | null) {
  switch (status) {
    case "Pending Verification":
      return {
        label: "Pending Verification",
        className: "bg-yellow-50 text-yellow-700 border-yellow-300 dark:bg-yellow-500/15 dark:text-yellow-300 dark:border-yellow-500/40",
      };
    case "Approved":
      return {
        label: "Approved",
        className: "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/40",
      };
    case "Rejected":
    case "Absent (Rejected)":
      return {
        label: status,
        className: "bg-red-50 text-red-700 border-red-300 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/40",
      };
    case "Expired":
    case "Absent (Expired)":
      return {
        label: status,
        className: "bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-600",
      };
    case "Overridden":
    case "Present (Override)":
      return {
        label: status,
        className: "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/40",
      };
    default:
      return {
        label: status || "Approved",
        className: "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/40",
      };
  }
}

function formatDateTimeMYT(val?: string | null) {
  if (!val) return "--";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleString("en-GB", {
    timeZone: "Asia/Kuala_Lumpur",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatTimePartsMYT(val?: string | null) {
  if (!val) return { timeStr: "--:--", dateStr: "--", weekdayStr: "" };
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return { timeStr: "--:--", dateStr: "--", weekdayStr: "" };
  return {
    timeStr: d.toLocaleTimeString("en-US", {
      timeZone: "Asia/Kuala_Lumpur",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }),
    dateStr: d.toLocaleDateString("en-GB", {
      timeZone: "Asia/Kuala_Lumpur",
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    weekdayStr: d.toLocaleDateString("en-US", {
      timeZone: "Asia/Kuala_Lumpur",
      weekday: "long",
    }),
  };
}

function formatCountdown(expiresAt?: string | null) {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Approval window elapsed (awaiting scheduler)";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `${days}d ${hours}h ${mins}m remaining`;
  return `${hours}h ${mins}m remaining`;
}

export const AttendanceVerificationModal: React.FC<AttendanceVerificationModalProps> = ({
  open,
  onOpenChange,
  attendanceId,
  canReview = false,
  reviewerId,
  reviewerName,
  reviewerRole,
  onActionCompleted,
}) => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [record, setRecord] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [remarks, setRemarks] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [previewPhoto, setPreviewPhoto] = useState<PhotoPreviewItem | null>(null);
  const [zoomed, setZoomed] = useState(false);

  const loadDetails = async () => {
    if (!attendanceId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/attendance/details/${attendanceId}`);
      const data = await res.json();
      if (data.success) {
        setRecord(data.record);
        setAuditLogs(data.audit_logs || []);
      }
    } catch (err) {
      console.error("Failed to load attendance details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && attendanceId) {
      setRemarks("");
      setOverrideReason("");
      setPreviewPhoto(null);
      setZoomed(false);
      void loadDetails();
    } else if (!open) {
      setPreviewPhoto(null);
      setZoomed(false);
    }
  }, [open, attendanceId]);

  const handleReview = async (decision: "approve" | "reject") => {
    if (!attendanceId) return;
    if (decision === "reject" && !remarks.trim()) {
      toast.error("Please enter remarks explaining why this attendance is rejected.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/attendance/${attendanceId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          remarks: remarks.trim(),
          reviewer_id: reviewerId || "HR_ADMIN",
          reviewer_name: reviewerName || "HR Admin",
          reviewer_role: reviewerRole || "hr_admin",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Review failed");
      }
      toast.success(decision === "approve" ? "Attendance approved." : "Attendance rejected.");
      await loadDetails();
      onActionCompleted?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOverride = async () => {
    if (!attendanceId) return;
    if (!overrideReason.trim()) {
      toast.error("Override reason is mandatory.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/attendance/${attendanceId}/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          override_reason: overrideReason.trim(),
          override_by: reviewerId || "HR_ADMIN",
          override_by_name: reviewerName || "HR Admin",
          override_role: reviewerRole || "hr_admin",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Override failed");
      }
      toast.success("Attendance overridden to Present (Override).");
      await loadDetails();
      onActionCompleted?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to override attendance");
    } finally {
      setSubmitting(false);
    }
  };

  const vBadge = getVerificationBadgeProps(record?.verification_status);
  const aBadge = getVerificationBadgeProps(record?.resolved_attendance_status);

  const renderPhotoCard = (
    label: string,
    actionBadge: "CLOCK IN" | "CLOCK OUT",
    photoUrl?: string | null,
    deleted?: boolean,
    lat?: number | null,
    lng?: number | null,
    device?: string | null,
    timestamp?: string | null
  ) => {
    const resolvedSrc = photoUrl
      ? photoUrl.startsWith("http")
        ? photoUrl
        : `${API_BASE_URL}${photoUrl}`
      : null;

    const cleanDevice = formatDeviceDisplay(device);

    return (
      <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
        <div className="flex items-center justify-between text-xs font-bold">
          <span>{label}</span>
          {lat != null && lng != null && (
            <a
              href={`https://www.google.com/maps?q=${lat},${lng}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#942392] hover:underline"
            >
              <MapPin className="w-3 h-3" />
              View Map
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
        </div>
        {deleted ? (
          <div className="h-36 rounded-lg border border-dashed border-border flex flex-col items-center justify-center text-xs text-muted-foreground gap-1.5 bg-background/60">
            <ImageOff className="w-5 h-5 opacity-60" />
            <span>Photo soft-deleted after retention window</span>
          </div>
        ) : resolvedSrc ? (
          <button
            type="button"
            onClick={() => {
              setZoomed(false);
              setPreviewPhoto({
                label,
                actionBadge,
                src: resolvedSrc,
                lat,
                lng,
                device,
                timestamp,
              });
            }}
            className="group relative w-full rounded-lg overflow-hidden border border-border bg-slate-950 focus:outline-none focus:ring-2 focus:ring-[#942392] cursor-zoom-in"
            title="Click to inspect full photo"
          >
            <img
              src={resolvedSrc}
              alt={label}
              className="w-full max-h-72 object-contain mx-auto transition-transform duration-200 group-hover:scale-[1.01]"
            />
            <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-slate-950/85 border border-white/25 px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm backdrop-blur-xs group-hover:bg-[#942392] transition-colors">
              <Maximize2 className="w-3 h-3" />
              View Full Photo
            </span>
          </button>
        ) : (
          <div className="h-24 rounded-lg border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground bg-background/60">
            No photo submitted for this punch
          </div>
        )}
        <div className="text-[11px] text-muted-foreground space-y-0.5">
          {lat != null && lng != null && (
            <div>GPS: <span className="font-mono text-foreground">{Number(lat).toFixed(5)}, {Number(lng).toFixed(5)}</span></div>
          )}
          {cleanDevice && (
            <div className="truncate" title={device || undefined}>
              Device: <span className="text-foreground font-medium">{cleanDevice}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const previewTimeParts = formatTimePartsMYT(previewPhoto?.timestamp);
  const previewDeviceDisplay = formatDeviceDisplay(previewPhoto?.device);

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden sm:rounded-2xl border-border/50 [&>button]:text-white [&>button]:hover:bg-white/20">
        <DialogHeader className="bg-[#942392] px-6 py-5 sm:rounded-t-2xl m-0 text-left shrink-0 border-b border-white/25 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-6">
            <div>
              <DialogTitle className="text-base sm:text-lg font-black uppercase tracking-tight text-white">
                Attendance Details &amp; Verification
              </DialogTitle>
              <DialogDescription className="text-xs font-bold uppercase tracking-wider text-white/80 mt-1">
                {record ? `${record.full_name || record.user_id} • ${record.company_name || "Subsidiary"} • ${record.location || record.permanent_branch || ""}` : "Loading verification record..."}
              </DialogDescription>
            </div>
            {record && (
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-extrabold uppercase tracking-wider shadow-2xs ${vBadge.className}`}>
                  {vBadge.label}
                </span>
                {record.resolved_attendance_status &&
                  record.resolved_attendance_status.toLowerCase() !== vBadge.label.toLowerCase() && (
                    <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-extrabold uppercase tracking-wider shadow-2xs ${aBadge.className}`}>
                      {record.resolved_attendance_status}
                    </span>
                  )}
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
        {loading || !record ? (
          <div className="py-10 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading attendance verification details...
          </div>
        ) : (
          <div className="space-y-4">
            {/* Key Dates & Countdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
              <div className="p-2.5 rounded-lg border border-border bg-muted/20">
                <div className="text-[10px] uppercase font-bold text-muted-foreground">Submitted At</div>
                <div className="font-semibold mt-0.5">{formatDateTimeMYT(record.clock_in)}</div>
              </div>
              <div className="p-2.5 rounded-lg border border-border bg-muted/20">
                <div className="text-[10px] uppercase font-bold text-muted-foreground">Clock-Out At</div>
                <div className="font-semibold mt-0.5">{formatDateTimeMYT(record.clock_out)}</div>
              </div>
              <div className="p-2.5 rounded-lg border border-border bg-muted/20">
                <div className="text-[10px] uppercase font-bold text-muted-foreground">
                  {record.verification_status === "Pending Verification" ? "Expiry Countdown" : "Processed At"}
                </div>
                <div className="font-semibold mt-0.5 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                  <span>
                    {record.verification_status === "Pending Verification"
                      ? formatCountdown(record.approval_expires_at) || "Active"
                      : formatDateTimeMYT(record.override_at || record.reviewed_at || record.expired_at)}
                  </span>
                </div>
              </div>
              <div className="p-2.5 rounded-lg border border-border bg-muted/20">
                <div className="text-[10px] uppercase font-bold text-muted-foreground">Reviewer / Actor</div>
                <div className="font-semibold mt-0.5">
                  {record.override_by_name || record.reviewed_by_name || (record.expired_by ? "System Scheduler" : "Awaiting HR")}
                </div>
              </div>
            </div>

            {/* Override / Rejection / Expiry Summary Banners */}
            {record.verification_status === "Expired" && (
              <div className="p-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-100/70 dark:bg-zinc-900/60 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                  Expired Automatically — Marked Absent (Expired)
                </div>
                <div className="text-muted-foreground">{record.expiry_reason || "HR did not verify within the configured approval window."}</div>
              </div>
            )}

            {record.verification_status === "Overridden" && (
              <div className="p-3 rounded-lg border border-blue-300 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/40 text-xs space-y-1">
                <div className="font-bold text-blue-700 dark:text-blue-300">
                  Manual Override: {record.original_status_before_override || "Absent (Expired)"} → Present (Override)
                </div>
                <div>Override By: <strong>{record.override_by_name || record.override_by}</strong> on {formatDateTimeMYT(record.override_at)}</div>
                <div>Reason: {record.override_reason}</div>
              </div>
            )}

            {record.review_remarks && (
              <div className="p-2.5 rounded-lg border border-border bg-muted/20 text-xs">
                <strong>HR Remarks:</strong> {record.review_remarks}
              </div>
            )}

            {/* Clock-In & Clock-Out Photo Proofs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {renderPhotoCard(
                "Clock-In Proof",
                "CLOCK IN",
                record.clock_in_photo_url,
                Boolean(record.clock_in_photo_deleted),
                record.clock_in_latitude,
                record.clock_in_longitude,
                record.clock_in_device_info,
                record.clock_in
              )}
              {(record.clock_out || record.clock_out_photo_url) &&
                renderPhotoCard(
                  "Clock-Out Proof",
                  "CLOCK OUT",
                  record.clock_out_photo_url,
                  Boolean(record.clock_out_photo_deleted),
                  record.clock_out_latitude,
                  record.clock_out_longitude,
                  record.clock_out_device_info,
                  record.clock_out
                )}
            </div>

            {/* HR Review & Override Actions */}
            {canReview && record.verification_status === "Pending Verification" && (
              <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20 p-3 space-y-2.5">
                <Label className="text-xs font-bold">HR Verification Decision</Label>
                <Textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Optional remarks for approval (mandatory if rejecting)..."
                  rows={2}
                  className="text-xs"
                />
                <div className="flex flex-wrap gap-2 justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={submitting}
                    onClick={() => void handleReview("reject")}
                  >
                    {submitting ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <XCircle className="w-3.5 h-3.5 mr-1" />}
                    Reject (Absent)
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={submitting}
                    onClick={() => void handleReview("approve")}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {submitting ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
                    Approve (Present)
                  </Button>
                </div>
              </div>
            )}

            {canReview && record.verification_status === "Expired" && (
              <div className="rounded-xl border border-blue-300 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-950/20 p-3 space-y-2.5">
                <Label className="text-xs font-bold text-blue-700 dark:text-blue-300">
                  Manual Override (Absent (Expired) → Present (Override))
                </Label>
                <Textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Mandatory override reason (e.g. Verified physical presence via photo; HR missed cutoff)..."
                  rows={2}
                  className="text-xs"
                />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    disabled={submitting}
                    onClick={() => void handleOverride()}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {submitting ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
                    Confirm Manual Override
                  </Button>
                </div>
              </div>
            )}

            {/* Permanent Audit Timeline */}
            <div className="rounded-xl border border-border bg-muted/10 p-3 space-y-2">
              <div className="text-xs font-bold flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-[#942392]" />
                Audit Timeline
              </div>
              {auditLogs.length === 0 ? (
                <div className="text-xs text-muted-foreground">No audit events recorded yet.</div>
              ) : (
                <ul className="space-y-1.5 text-xs">
                  {auditLogs.map((log) => (
                    <li key={log.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border-b border-border/50 pb-1.5 last:border-none last:pb-0">
                      <div>
                        <span className="font-semibold text-foreground">{log.action}</span>
                        <span className="text-muted-foreground"> • by {log.actor_name || log.actor_id}</span>
                        {log.remarks && <div className="text-[11px] text-muted-foreground">{log.remarks}</div>}
                      </div>
                      <span className="text-[11px] font-mono text-muted-foreground shrink-0">
                        {formatDateTimeMYT(log.created_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Fullscreen Marki-Style Proof Lightbox */}
    <Dialog
      open={Boolean(previewPhoto)}
      onOpenChange={(next) => {
        if (!next) {
          setPreviewPhoto(null);
          setZoomed(false);
        }
      }}
    >
      <DialogContent className="sm:max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden sm:rounded-2xl bg-slate-950 text-white border border-white/15 [&>button]:text-white [&>button]:hover:bg-white/20">
        <DialogHeader className="px-4 sm:px-5 py-3.5 bg-slate-900/95 border-b border-white/10 shrink-0 pr-12 text-left">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <DialogTitle className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>{previewPhoto?.label || "Attendance Photo"}</span>
                {previewPhoto && (
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wider ${
                      previewPhoto.actionBadge === "CLOCK IN" ? "bg-[#942392] text-white" : "bg-emerald-600 text-white"
                    }`}
                  >
                    {previewPhoto.actionBadge}
                  </span>
                )}
              </DialogTitle>
              <DialogDescription className="text-[11px] text-slate-300 mt-0.5">
                {record ? `${record.full_name || record.user_id} • ${record.company_name || "Subsidiary"}` : ""}
              </DialogDescription>
            </div>
            {previewPhoto && (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setZoomed((z) => !z)}
                  className="h-7 px-2.5 text-[11px] bg-slate-800 border-white/20 text-white hover:bg-slate-700 hover:text-white"
                >
                  {zoomed ? <ZoomOut className="w-3.5 h-3.5 mr-1" /> : <ZoomIn className="w-3.5 h-3.5 mr-1" />}
                  {zoomed ? "Fit Screen" : "Zoom In"}
                </Button>
                <a
                  href={previewPhoto.src}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-white/20 bg-slate-800 text-[11px] font-medium text-white hover:bg-slate-700 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  Open Original
                </a>
              </div>
            )}
          </div>
        </DialogHeader>

        {previewPhoto && (
          <>
            <div className="flex-1 overflow-auto bg-black flex items-center justify-center p-2 sm:p-4">
              <img
                src={previewPhoto.src}
                alt={previewPhoto.label}
                onClick={() => setZoomed((z) => !z)}
                className={
                  zoomed
                    ? "w-[175%] max-w-none h-auto rounded-lg cursor-zoom-out"
                    : "max-h-[58vh] w-auto max-w-full object-contain rounded-lg cursor-zoom-in"
                }
                title={zoomed ? "Click to fit screen" : "Click to zoom in"}
              />
            </div>

            {/* Marki-style Verification Metadata Bar */}
            <div className="bg-slate-900 border-t border-white/10 shrink-0">
              <div
                className={`flex items-center justify-between px-4 py-1.5 text-[10px] font-extrabold tracking-wider ${
                  previewPhoto.actionBadge === "CLOCK IN" ? "bg-[#942392]" : "bg-emerald-600"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  RAYHAR VERIFICATION STAMP
                </span>
                <span>{vBadge.label.toUpperCase()}</span>
              </div>
              <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="text-xl sm:text-2xl font-black leading-none tracking-tight tabular-nums text-white">
                    {previewTimeParts.timeStr}
                  </div>
                  <div
                    className={`w-0.5 self-stretch rounded-full ${
                      previewPhoto.actionBadge === "CLOCK IN" ? "bg-fuchsia-400" : "bg-emerald-400"
                    }`}
                  />
                  <div className="text-xs leading-tight">
                    <div className="font-bold text-slate-100">{previewTimeParts.dateStr} MYT</div>
                    <div className="text-slate-300 text-[11px]">{previewTimeParts.weekdayStr}</div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-300 space-y-1 sm:text-right">
                  <div className="flex flex-wrap items-center sm:justify-end gap-2">
                    <span className="inline-flex items-center gap-1 text-slate-100 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-fuchsia-300 shrink-0" />
                      {record?.location || record?.permanent_branch || "Branch"}
                    </span>
                    {previewPhoto.lat != null && previewPhoto.lng != null && (
                      <a
                        href={`https://www.google.com/maps?q=${previewPhoto.lat},${previewPhoto.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-fuchsia-300 hover:underline"
                      >
                        {Number(previewPhoto.lat).toFixed(5)}, {Number(previewPhoto.lng).toFixed(5)}
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                  {previewDeviceDisplay && (
                    <div className="inline-flex items-center gap-1 text-slate-300" title={previewPhoto.device || undefined}>
                      <Smartphone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{previewDeviceDisplay}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
};
