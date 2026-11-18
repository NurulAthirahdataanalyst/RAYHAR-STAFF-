import React, { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, RefreshCw, CheckCircle2, RotateCcw, Loader2, ShieldCheck, MapPin } from "lucide-react";
import { buildSubmittedDeviceInfo, getCompactDeviceInfo } from "@/utils/deviceInfo";

interface MYTTimeParts {
  timeStr: string;
  dateStr: string;
  weekdayStr: string;
}

function getMYTTimeParts(date = new Date()): MYTTimeParts {
  const timeStr = date.toLocaleTimeString("en-US", {
    timeZone: "Asia/Kuala_Lumpur",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const dateStr = date.toLocaleDateString("en-GB", {
    timeZone: "Asia/Kuala_Lumpur",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const weekdayStr = date.toLocaleDateString("en-US", {
    timeZone: "Asia/Kuala_Lumpur",
    weekday: "long",
  });
  return { timeStr, dateStr, weekdayStr };
}

function truncateCanvasText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  const ellipsis = "...";
  let low = 0;
  let high = text.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (ctx.measureText(text.slice(0, mid) + ellipsis).width <= maxWidth) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }
  return text.slice(0, low) + ellipsis;
}

function fillRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

interface RayharCameraModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionType: "CLOCK IN" | "CLOCK OUT";
  staffName: string;
  staffId: string;
  companyName: string;
  branchName: string;
  latitude?: number;
  longitude?: number;
  submitting?: boolean;
  onSubmitPhoto: (photoDataUrl: string, deviceInfo: string) => void;
}

export const RayharCameraModal: React.FC<RayharCameraModalProps> = ({
  open,
  onOpenChange,
  actionType,
  staffName,
  staffId,
  companyName,
  branchName,
  latitude,
  longitude,
  submitting = false,
  onSubmitPhoto,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [timeParts, setTimeParts] = useState<MYTTimeParts>(() => getMYTTimeParts());
  const deviceLabel = getCompactDeviceInfo();

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  };

  const startCamera = async (mode: "user" | "environment") => {
    stopCamera();
    setCameraError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Live camera is not supported on this browser or insecure connection.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraReady(true);
    } catch (err: any) {
      setCameraError(
        err?.name === "NotAllowedError"
          ? "Camera permission denied. Please allow live camera access to clock in."
          : "Unable to access live camera. Please ensure no other app is using it."
      );
    }
  };

  useEffect(() => {
    if (!open) {
      stopCamera();
      setCapturedPhoto(null);
      setCameraError(null);
      return;
    }
    if (!capturedPhoto) {
      void startCamera(facingMode);
    }
    const timer = setInterval(() => {
      setTimeParts(getMYTTimeParts());
    }, 1000);
    return () => {
      clearInterval(timer);
      stopCamera();
    };
  }, [open, facingMode]);

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;

    const maxWidth = 960;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    const width = Math.round(video.videoWidth * scale);
    const height = Math.round(video.videoHeight * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Mirror selfie view naturally if using front camera
    if (facingMode === "user") {
      ctx.save();
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, width, height);
      ctx.restore();
    } else {
      ctx.drawImage(video, 0, 0, width, height);
    }

    // Marki-style floating watermark card (no distance/radius numbers shown)
    const liveParts = getMYTTimeParts();
    const currentDevice = getCompactDeviceInfo();
    const margin = Math.max(10, Math.round(width * 0.025));
    const cardW = width < 640 ? width - margin * 2 : Math.min(width - margin * 2, 460);
    const scaleBase = Math.max(340, Math.min(cardW, 500));

    const padX = Math.max(12, Math.round(scaleBase * 0.032));
    const headerH = Math.max(24, Math.round(scaleBase * 0.064));
    const headerFont = Math.max(10, Math.round(scaleBase * 0.026));
    const timeFont = Math.max(20, Math.round(scaleBase * 0.06));
    const dateFont = Math.max(10, Math.round(scaleBase * 0.026));
    const metaFont = Math.max(10, Math.round(scaleBase * 0.024));
    const gapY = Math.max(6, Math.round(scaleBase * 0.018));
    const timeBlockH = Math.max(timeFont + 2, dateFont * 2 + 5);
    const cardH = headerH + padX + timeBlockH + gapY + metaFont + 6 + metaFont + padX;
    const cardX = margin;
    const cardY = Math.max(margin, height - margin - cardH);

    const accentColor = actionType === "CLOCK IN" ? "#942392" : "#059669";
    const dividerColor = actionType === "CLOCK IN" ? "#e879f9" : "#34d399";

    ctx.save();
    fillRoundedRect(ctx, cardX, cardY, cardW, cardH, 10);
    ctx.clip();

    ctx.fillStyle = "rgba(15, 23, 42, 0.84)";
    ctx.fillRect(cardX, cardY, cardW, cardH);

    // Header bar
    ctx.fillStyle = accentColor;
    ctx.fillRect(cardX, cardY, cardW, headerH);

    ctx.textBaseline = "middle";
    ctx.font = `bold ${headerFont}px sans-serif`;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText("RAYHAR STAFF PORTAL", cardX + padX, cardY + headerH / 2);

    const actionW = ctx.measureText(actionType).width;
    ctx.fillText(actionType, cardX + cardW - padX - actionW, cardY + headerH / 2);

    // Time + Date/Weekday row
    const row1Y = cardY + headerH + padX;
    ctx.textBaseline = "top";
    ctx.font = `bold ${timeFont}px sans-serif`;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(liveParts.timeStr, cardX + padX, row1Y);
    const timeW = ctx.measureText(liveParts.timeStr).width;

    const divX = cardX + padX + timeW + 10;
    ctx.fillStyle = dividerColor;
    ctx.fillRect(divX, row1Y + 2, 2, timeBlockH - 4);

    const dateX = divX + 10;
    ctx.font = `bold ${dateFont}px sans-serif`;
    ctx.fillStyle = "#F8FAFC";
    ctx.fillText(`${liveParts.dateStr} MYT`, dateX, row1Y + 1);
    ctx.font = `${dateFont}px sans-serif`;
    ctx.fillStyle = "#CBD5E1";
    ctx.fillText(liveParts.weekdayStr, dateX, row1Y + dateFont + 4);

    // Location & GPS row
    const row2Y = row1Y + timeBlockH + gapY;
    const coordText =
      latitude !== undefined && longitude !== undefined
        ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
        : "GPS Verified";
    ctx.font = `${metaFont}px sans-serif`;
    const coordW = ctx.measureText(coordText).width;
    ctx.fillStyle = "#E2E8F0";
    ctx.fillText(coordText, cardX + cardW - padX - coordW, row2Y);

    const branchMaxW = Math.max(80, cardW - padX * 2 - coordW - 12);
    ctx.fillStyle = "#F8FAFC";
    ctx.fillText(truncateCanvasText(ctx, `${branchName} • ${companyName}`, branchMaxW), cardX + padX, row2Y);

    // Staff & Device row
    const row3Y = row2Y + metaFont + 6;
    ctx.fillStyle = "#CBD5E1";
    const staffLine = truncateCanvasText(
      ctx,
      `${staffName} (${staffId}) • ${currentDevice}`,
      cardW - padX * 2
    );
    ctx.fillText(staffLine, cardX + padX, row3Y);

    ctx.restore();

    // Subtle crisp card border
    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 10);
    ctx.stroke();
    ctx.restore();

    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setCapturedPhoto(dataUrl);
    stopCamera();
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    void startCamera(facingMode);
  };

  const handleConfirm = () => {
    if (!capturedPhoto) return;
    onSubmitPhoto(capturedPhoto, buildSubmittedDeviceInfo());
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!submitting) onOpenChange(next); }}>
      <DialogContent className="sm:max-w-lg p-4 sm:p-5">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <Camera className="w-4 h-4 text-[#942392]" />
            Rayhar Staff Portal — Live {actionType === "CLOCK IN" ? "Clock-In" : "Clock-Out"} Verification
          </DialogTitle>
          <DialogDescription className="text-xs">
            Capture a live photo to submit for HR verification. Gallery uploads are disabled.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative rounded-xl overflow-hidden border border-border bg-slate-950 min-h-[240px] max-h-[58vh] flex items-center justify-center">
            {cameraError ? (
              <div className="p-4 text-center space-y-2">
                <p className="text-xs text-rose-400 font-medium">{cameraError}</p>
                <Button size="sm" variant="outline" onClick={() => void startCamera(facingMode)}>
                  Retry Camera
                </Button>
              </div>
            ) : capturedPhoto ? (
              <img src={capturedPhoto} alt="Captured verification proof" className="w-full max-h-[58vh] object-contain" />
            ) : (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  className={`w-full max-h-[58vh] object-cover ${facingMode === "user" ? "-scale-x-100" : ""}`}
                />
                {!cameraReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 text-white text-xs gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Starting live camera...
                  </div>
                )}
                {/* Live Marki-Style Rayhar Watermark Preview Card */}
                <div className="absolute left-2.5 right-2.5 sm:right-auto sm:w-[360px] bottom-2.5 rounded-lg overflow-hidden bg-slate-950/85 border border-white/20 shadow-lg text-white pointer-events-none">
                  <div
                    className={`flex items-center justify-between px-2.5 py-1 text-[10px] font-extrabold tracking-wider ${
                      actionType === "CLOCK IN" ? "bg-[#942392]" : "bg-emerald-600"
                    }`}
                  >
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      RAYHAR STAFF PORTAL
                    </span>
                    <span>{actionType}</span>
                  </div>
                  <div className="px-2.5 py-2 space-y-1">
                    <div className="flex items-center gap-2.5">
                      <div className="text-lg sm:text-xl font-black leading-none tracking-tight tabular-nums">
                        {timeParts.timeStr}
                      </div>
                      <div
                        className={`w-0.5 self-stretch rounded-full ${
                          actionType === "CLOCK IN" ? "bg-fuchsia-400" : "bg-emerald-400"
                        }`}
                      />
                      <div className="text-[10px] leading-tight">
                        <div className="font-bold text-slate-100">{timeParts.dateStr} MYT</div>
                        <div className="text-slate-300">{timeParts.weekdayStr}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[10px] text-slate-200 pt-0.5">
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-fuchsia-300 shrink-0" />
                        <span className="truncate">{branchName} • {companyName}</span>
                      </span>
                      <span className="font-mono shrink-0 text-[9.5px] text-slate-300">
                        {latitude !== undefined && longitude !== undefined
                          ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
                          : "GPS Ready"}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-300 truncate">
                      {staffName} ({staffId}) • {deviceLabel}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            {!capturedPhoto ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFacingMode((m) => (m === "user" ? "environment" : "user"))}
                  disabled={submitting}
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Switch Camera
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={!cameraReady || !!cameraError || submitting}
                  onClick={handleCapture}
                  className="bg-[#942392] hover:bg-[#800A7A] text-white font-semibold"
                >
                  <Camera className="w-3.5 h-3.5 mr-1.5" />
                  Capture Photo
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="outline" size="sm" onClick={handleRetake} disabled={submitting}>
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                  Retake
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleConfirm}
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />}
                  Submit Attendance
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
