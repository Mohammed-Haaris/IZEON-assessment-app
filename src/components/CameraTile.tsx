import React, { useEffect, useRef, useState } from "react";
import { CameraOff } from "lucide-react";

interface CameraTileProps {
  onPermissionChange?: (hasPermission: boolean) => void;
  className?: string;
}

export const CameraTile: React.FC<CameraTileProps> = ({ onPermissionChange, className = "" }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    let stream: MediaStream | null = null;

    async function initCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: "user" },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        setHasPermission(true);
        onPermissionChange?.(true);
      } catch (err: any) {
        console.error("Camera access error:", err);
        setHasPermission(false);
        setErrorMsg("Camera permission denied. Camera is mandatory for Round 2.");
        onPermissionChange?.(false);
      }
    }

    initCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <div
      className={`relative rounded-xl overflow-hidden bg-slate-900 border-2 ${
        hasPermission ? "border-[#16499c] shadow-lg shadow-[#16499c]/10" : "border-rose-500"
      } ${className}`}
    >
      {/* Video feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover -scale-x-100 ${!hasPermission ? "hidden" : "block"}`}
      />

      {/* Permission Fallback */}
      {!hasPermission && (
        <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-slate-950 text-slate-300">
          <CameraOff className="w-8 h-8 text-rose-500 mb-1" />
          <p className="text-xs font-semibold text-rose-400">Camera Inactive</p>
          <p className="text-[10px] text-slate-400 mt-1 max-w-[140px]">{errorMsg || "Requesting camera..."}</p>
        </div>
      )}

      {/* Live Badge Overlay */}
      {hasPermission && (
        <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-md text-[10px] font-semibold text-white border border-slate-700">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          LIVE PROCTOR
        </div>
      )}

      {/* Watermark */}
      <div className="absolute bottom-1 right-2 text-[9px] font-mono text-slate-400/80 select-none">
        AI-MONITORED
      </div>
    </div>
  );
};
