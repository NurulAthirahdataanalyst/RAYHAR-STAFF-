import React, { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, RefreshCw, CheckCircle2, RotateCcw, Loader2, ShieldCheck } from "lucide-react";

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
  const [nowText, setNowText] = useState<string>(() =>
    new Date().toLocaleString("en-GB", {
      timeZone: "Asia/Kuala_Lumpur",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    })
  );

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
      setNowText(
        new Date().toLocaleString("en-GB", {
          timeZone: "Asia/Kuala_Lumpur",
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    }, 1000);
    return () => {
      clearInterval(timer);
      stopCamera();
    };
  }, [open, facingMode]);

  const getCompactDeviceInfo = () => {
    const ua = navigator.userAgent || "Browser";
    if (/iPhone/i.test(ua)) return "iPhone Mobile";
    if (/Android/i.test(ua)) return "Android Mobile";
    if (/Windows/i.test(ua)) return "Windows Desktop";
    if (/Mac/i.test(ua)) return "Mac Desktop";
    return ua.slice(0, 60);
  };

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

    // Rayhar Staff Portal Watermark Footer (no distance/radius numbers shown)
    const barHeight = Math.max(88, Math.round(height * 0.22));
    const barY = height - barHeight;
    ctx.fillStyle = "rgba(15, 23, 42, 0.78)";
    ctx.fillRect(0, barY, width, barHeight);

    ctx.fillStyle = "#942392";
    ctx.fillRect(0, barY, width, 4);

    const padX = 16;
    const titleSize = Math.max(14, Math.round(width * 0.022));
    const bodySize = Math.max(11, Math.round(width * 0.016));

    // Top line: Brand + Action Badge
    ctx.font = `bold ${titleSize}px sans-serif`;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText("RAYHAR STAFF PORTAL", padX, barY + Math.round(barHeight * 0.28));

    const badgeText = actionType;
    ctx.font = `bold ${bodySize}px sans-serif`;
    const badgeW = ctx.measureText(badgeText).width + 18;
    const badgeH = bodySize + 10;
    const badgeX = width - padX - badgeW;
    const badgeY = barY + Math.round(barHeight * 0.12);
    ctx.fillStyle = actionType === "CLOCK IN" ? "#942392" : "#059669";
    ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(badgeText, badgeX + 9, badgeY + bodySize + 2);

    // Middle line: Staff & Company + MYT Time
    ctx.font = `${bodySize}px sans-serif`;
    ctx.fillStyle = "#E2E8F0";
    ctx.fillText(`${staffName} (${staffId}) • ${companyName}`, padX, barY + Math.round(barHeight * 0.56));

    const timeLabel = `${nowText} MYT`;
    const timeW = ctx.measureText(timeLabel).width;
    ctx.fillText(timeLabel, width - padX - timeW, barY + Math.round(barHeight * 0.56));

    // Bottom line: Branch & Device + Coordinates
    ctx.fillStyle = "#CBD5E1";
    ctx.fillText(`${branchName} • ${getCompactDeviceInfo()}`, padX, barY + Math.round(barHeight * 0.82));

    const coordText =
      latitude !== undefined && longitude !== undefined
        ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
        : "GPS Verified";
    const coordW = ctx.measureText(coordText).width;
    ctx.fillText(coordText, width - padX - coordW, barY + Math.round(barHeight * 0.82));

    const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
    setCapturedPhoto(dataUrl);
    stopCamera();
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    void startCamera(facingMode);
  };

  const handleConfirm = () => {
    if (!capturedPhoto) return;
    onSubmitPhoto(capturedPhoto, navigator.userAgent || getCompactDeviceInfo());
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
          <div className="relative rounded-xl overflow-hidden border border-border bg-slate-950 aspect-video flex items-center justify-center">
            {cameraError ? (
              <div className="p-4 text-center space-y-2">
                <p className="text-xs text-rose-400 font-medium">{cameraError}</p>
                <Button size="sm" variant="outline" onClick={() => void startCamera(facingMode)}>
                  Retry Camera
                </Button>
              </div>
            ) : capturedPhoto ? (
              <img src={capturedPhoto} alt="Captured verification proof" className="w-full h-full object-cover" />
            ) : (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  className={`w-full h-full object-cover ${facingMode === "user" ? "-scale-x-100" : ""}`}
                />
                {!cameraReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 text-white text-xs gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Starting live camera...
                  </div>
                )}
                {/* Live Rayhar Staff Portal Watermark Preview Overlay */}
                <div className="absolute inset-x-0 bottom-0 bg-slate-950/80 border-t-2 border-[#942392] px-3 py-2 text-white space-y-0.5 pointer-events-none">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-300" />
                      RAYHAR STAFF PORTAL
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-[#942392] text-[10px] font-extrabold">{actionType}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-200">
                    <span className="truncate">{staffName} ({staffId}) • {companyName}</span>
                    <span className="font-mono shrink-0 ml-2">{nowText} MYT</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-300">
                    <span className="truncate">{branchName} • {getCompactDeviceInfo()}</span>
                    <span className="font-mono shrink-0 ml-2">
                      {latitude !== undefined && longitude !== undefined ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}` : "GPS Ready"}
                    </span>
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
