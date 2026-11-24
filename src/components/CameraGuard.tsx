import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  CameraOff,
  RotateCw,
  ArrowLeft,
  ShieldAlert,
  Bell,
  CheckCircle2,
} from "lucide-react";
import interviewLogo from "../assets/interview logo.png";
import { useAuth } from "../context/AuthContext";
import { getSocket } from "../services/socket";

interface CameraGuardProps {
  children: (cameraStream: MediaStream | null) => React.ReactNode;
  roundName: string;
}

type CameraStatus = "CHECKING" | "ACTIVE" | "DENIED" | "NO_HARDWARE" | "IN_USE_OR_ERROR";

export const CameraGuard: React.FC<CameraGuardProps> = ({ children, roundName }) => {
  const { user, refreshUser, updateUserLocally } = useAuth();
  const [isExemptOverride, setIsExemptOverride] = useState<boolean>(false);
  const isExempt = Boolean(user?.allowWithoutCamera) || isExemptOverride;
  const navigate = useNavigate();
  const [status, setStatus] = useState<CameraStatus>(isExempt ? "ACTIVE" : "CHECKING");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [isHelpRequested, setIsHelpRequested] = useState<boolean>(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState<boolean>(false);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Real-time listener: unlocks immediately when admin clicks "Allow Candidate (No Camera)"
  useEffect(() => {
    const socket = getSocket();
    if (user?.id) {
      socket.emit("join:student", user.id);
    }

    const handleExemptionGranted = (data: { studentId: string; allowWithoutCamera: boolean }) => {
      if (data.studentId === user?.id && data.allowWithoutCamera) {
        setIsExemptOverride(true);
        updateUserLocally({ allowWithoutCamera: true });
        setStatus("ACTIVE");
      }
    };

    socket.on("student:camera_exemption_granted", handleExemptionGranted);

    return () => {
      socket.off("student:camera_exemption_granted", handleExemptionGranted);
    };
  }, [user?.id, updateUserLocally]);

  // Background sync check in case student is waiting for admin approval
  useEffect(() => {
    if (isExempt) return;
    const interval = setInterval(async () => {
      try {
        await refreshUser();
      } catch {
        // ignore
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [isExempt, refreshUser]);

  const handleRequestAdminExemption = () => {
    if (!user) return;
    setIsHelpRequested(true);
    const socket = getSocket();
    socket.emit("student:camera_help_request", {
      studentId: user.id,
      studentName: user.name,
      studentEmail: user.email,
      college: user.college,
      reason: errorMessage || "Webcam failed to start or blocked in browser",
    });
  };

  const handleCheckExemptionStatus = async () => {
    setIsCheckingStatus(true);
    try {
      await refreshUser();
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const stopActiveStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
    setStream(null);
  };

  const verifyAndStartCamera = useCallback(async () => {
    setIsRetrying(true);
    setErrorMessage("");

    // 1. Check browser mediaDevices support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus("NO_HARDWARE");
      setErrorMessage("Your browser does not support webcam media capture or is running in an insecure context (HTTP).");
      setIsRetrying(false);
      return;
    }

    try {
      // Stop any prior stream to avoid resource conflicts
      stopActiveStream();

      // 2. Request user media stream
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
        audio: false,
      });

      const videoTrack = newStream.getVideoTracks()[0];
      if (!videoTrack) {
        throw new Error("No video track found from device.");
      }

      // 3. Attach track disconnect/unplug/disable listeners
      videoTrack.onended = () => {
        setStatus("IN_USE_OR_ERROR");
        setErrorMessage("Webcam was disconnected or turned off. Camera stream must remain live.");
        stopActiveStream();
      };

      videoTrack.onmute = () => {
        setStatus("IN_USE_OR_ERROR");
        setErrorMessage("Webcam video feed is muted or covered. Please resume camera feed.");
      };

      streamRef.current = newStream;
      setStream(newStream);
      setStatus("ACTIVE");

      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = newStream;
      }
    } catch (err: any) {
      console.warn("Camera verification failed:", err);
      stopActiveStream();

      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setStatus("DENIED");
        setErrorMessage(
          "Camera access permission was blocked. Please click the lock 🔒 or camera icon in your browser address bar, set Camera to 'Allow', and click Retry."
        );
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setStatus("NO_HARDWARE");
        setErrorMessage("No physical webcam or video capture device was detected on your machine.");
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        setStatus("IN_USE_OR_ERROR");
        setErrorMessage(
          "Camera is currently being used by another application (e.g. Zoom, MS Teams, Google Meet, or another browser tab). Please close other apps and try again."
        );
      } else {
        setStatus("IN_USE_OR_ERROR");
        setErrorMessage(err.message || "Failed to initialize webcam. Please verify camera hardware.");
      }
    } finally {
      setIsRetrying(false);
    }
  }, []);

  // Continuous heartbeat to ensure camera stream hasn't died silently
  useEffect(() => {
    if (isExempt) {
      setStatus("ACTIVE");
      return;
    }

    verifyAndStartCamera();

    const interval = setInterval(() => {
      if (status === "ACTIVE" && streamRef.current) {
        const activeTrack = streamRef.current.getVideoTracks()[0];
        if (!activeTrack || activeTrack.readyState !== "live" || !streamRef.current.active) {
          setStatus("IN_USE_OR_ERROR");
          setErrorMessage("Webcam signal was lost. Camera stream must remain active throughout the assessment.");
          stopActiveStream();
        }
      }
    }, 2000);

    return () => {
      clearInterval(interval);
      stopActiveStream();
    };
  }, [verifyAndStartCamera, isExempt]);

  // Connect stream to preview video element when modal is shown
  useEffect(() => {
    if (previewVideoRef.current && stream) {
      previewVideoRef.current.srcObject = stream;
    }
  }, [stream, status]);

  // If candidate is exempted by administrator, allow immediate access without camera
  if (isExempt) {
    return (
      <>
        <div className="bg-amber-50 border-b border-amber-200 text-amber-800 text-xs py-1.5 px-4 text-center font-semibold flex items-center justify-center gap-2 select-none">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          Camera Exemption Active — Allowed to take assessment without webcam (Authorized by Administrator)
        </div>
        {children(null)}
      </>
    );
  }

  // If camera is ACTIVE, render the examination page with the stream provided
  if (status === "ACTIVE") {
    return <>{children(stream)}</>;
  }

  // Otherwise, render the Fullscreen Security Lockout Modal
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header Bar */}
        <div className="bg-[#eff5ff] border-b border-[#16499c]/20 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={interviewLogo} alt="IZEON" className="h-7 w-auto object-contain" />
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">IZEON Secure Proctoring</h2>
              <span className="text-[10px] font-semibold text-[#16499c] uppercase tracking-wider">{roundName}</span>
            </div>
          </div>
          <div className="px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            Camera Locked
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 border-2 border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
            <CameraOff className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-xl font-black text-slate-900">Webcam Required to Continue</h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed font-medium">
              Under IZEON Proctoring regulations, candidates must maintain an active video feed. You cannot access or answer questions without an active camera.
            </p>
          </div>

          {/* Diagnostic Info Box */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Diagnostic Status:</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              {errorMessage || (status === "CHECKING" ? "Requesting camera hardware access from browser..." : "Waiting for camera confirmation.")}
            </p>
            {status === "DENIED" && (
              <div className="pt-2 text-[11px] text-[#16499c] font-semibold">
                Tip: Click the lock / settings icon 🔒 beside <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">http://localhost:4000</span> in your URL bar, change Camera to <strong>Allow</strong>, and click Retry.
              </div>
            )}
          </div>

          {/* 1-Click Admin Exemption Request */}
          <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-2xl text-left space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-amber-600 shrink-0" />
                Camera Not Working in Google Chrome?
              </span>
              {isHelpRequested && (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Admin Alerted
                </span>
              )}
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
              If your camera cannot turn on or is blocked, click below. The administrator will instantly allow you to take the exam without camera.
            </p>
            <div className="pt-1 flex gap-2">
              <button
                type="button"
                onClick={handleRequestAdminExemption}
                disabled={isHelpRequested}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:bg-amber-500 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
              >
                <Bell className={`w-3.5 h-3.5 ${isHelpRequested ? "animate-bounce" : ""}`} />
                {isHelpRequested ? "Exemption Requested • Waiting for 1-Click Approval..." : "Request Admin to Allow (No Camera)"}
              </button>
              <button
                type="button"
                onClick={handleCheckExemptionStatus}
                disabled={isCheckingStatus}
                className="px-3 py-2.5 rounded-xl bg-white border border-amber-300 hover:bg-amber-50 text-amber-800 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1"
                title="Check if admin has already approved"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isCheckingStatus ? "animate-spin" : ""}`} />
                <span className="text-[10px]">Sync</span>
              </button>
            </div>
            {isHelpRequested && (
              <p className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 mt-1">
                <CheckCircle2 className="w-3 h-3 shrink-0" />
                Notification sent to Admin live monitor. Your exam will unlock automatically when approved.
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-2.5">
            <button
              onClick={verifyAndStartCamera}
              disabled={isRetrying}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#16499c] hover:bg-[#123c80] disabled:opacity-50 text-white font-bold text-sm transition-all shadow-md shadow-[#16499c]/25 cursor-pointer"
            >
              <RotateCw className={`w-4 h-4 ${isRetrying ? "animate-spin" : ""}`} />
              {isRetrying ? "Checking Camera Connection..." : "Verify & Enable Camera"}
            </button>

            <button
              onClick={() => navigate("/dashboard")}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Return to Student Dashboard
            </button>
          </div>
        </div>

        {/* Footer Security Watermark */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-medium">
          <span>AI Supervised Assessment Security</span>
          <span>Proctor Status: Disarmed (Awaiting Video)</span>
        </div>
      </div>
    </div>
  );
};
