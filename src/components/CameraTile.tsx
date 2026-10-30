import React, { useEffect, useRef, useState } from "react";
import { CameraOff, Minus, Maximize2, GripHorizontal } from "lucide-react";

interface CameraTileProps {
  stream?: MediaStream | null;
  onPermissionChange?: (hasPermission: boolean) => void;
  className?: string;
}

export const CameraTile: React.FC<CameraTileProps> = ({
  stream: externalStream,
  onPermissionChange,
  className = "",
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
  } | null>(null);
  const tileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // If an external stream is provided from CameraGuard
    if (externalStream !== undefined) {
      if (videoRef.current && externalStream) {
        videoRef.current.srcObject = externalStream;
      }
      const isLive = Boolean(
        externalStream &&
          externalStream.active &&
          externalStream.getVideoTracks().some((t) => t.readyState === "live")
      );
      setHasPermission(isLive);
      if (!isLive) {
        setErrorMsg("Webcam feed inactive.");
      }
      onPermissionChange?.(isLive);
      return;
    }

    // Fallback: self-managed stream if no external stream is provided
    let localStream: MediaStream | null = null;

    async function initCamera() {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: "user" },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = localStream;
        }

        setHasPermission(true);
        onPermissionChange?.(true);
      } catch (err: any) {
        console.error("Camera access error:", err);
        setHasPermission(false);
        setErrorMsg("Camera permission denied. Camera is mandatory.");
        onPermissionChange?.(false);
      }
    }

    initCamera();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [externalStream, onPermissionChange]);

  // Keep video track attached when expanding/minimizing
  useEffect(() => {
    if (externalStream && videoRef.current) {
      videoRef.current.srcObject = externalStream;
    }
  }, [isMinimized, externalStream]);

  // Handle Dragging via Mouse
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    const rect = tileRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: rect.left,
      initialY: rect.top,
    };
    setIsDragging(true);
  };

  // Handle Dragging via Touchscreen
  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    const touch = e.touches[0];
    if (!touch) return;
    const rect = tileRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragStartRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      initialX: rect.left,
      initialY: rect.top,
    };
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;
      const dx = e.clientX - dragStartRef.current.startX;
      const dy = e.clientY - dragStartRef.current.startY;
      const width = isMinimized ? 160 : 180;
      const height = isMinimized ? 40 : 150;
      const newX = Math.max(10, Math.min(window.innerWidth - width - 10, dragStartRef.current.initialX + dx));
      const newY = Math.max(10, Math.min(window.innerHeight - height - 10, dragStartRef.current.initialY + dy));
      setPosition({ x: newX, y: newY });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!dragStartRef.current) return;
      const touch = e.touches[0];
      if (!touch) return;
      const dx = touch.clientX - dragStartRef.current.startX;
      const dy = touch.clientY - dragStartRef.current.startY;
      const width = isMinimized ? 160 : 180;
      const height = isMinimized ? 40 : 150;
      const newX = Math.max(10, Math.min(window.innerWidth - width - 10, dragStartRef.current.initialX + dx));
      const newY = Math.max(10, Math.min(window.innerHeight - height - 10, dragStartRef.current.initialY + dy));
      setPosition({ x: newX, y: newY });
    };

    const handleDragEnd = () => {
      setIsDragging(false);
      dragStartRef.current = null;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleDragEnd);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleDragEnd);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleDragEnd);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleDragEnd);
    };
  }, [isDragging, isMinimized]);

  // MINIMIZED STATE: Compact, non-intrusive pill
  if (isMinimized) {
    return (
      <div
        ref={tileRef}
        style={position ? { left: `${position.x}px`, top: `${position.y}px` } : undefined}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        className={`fixed ${!position ? "bottom-6 right-6" : ""} z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/95 border-2 border-[#16499c] shadow-2xl backdrop-blur-md cursor-grab active:cursor-grabbing select-none text-white transition-all`}
        title="Live Proctor Active • Drag to reposition anywhere • Click expand to view camera feed"
      >
        {/* Hidden video keeps stream actively reading without resource interruption */}
        <video ref={videoRef} autoPlay playsInline muted className="hidden" />

        <GripHorizontal className="w-3 h-3 text-slate-500 shrink-0" />
        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
        <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-200">
          Live Proctor
        </span>
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          title="Expand camera preview"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // EXPANDED STATE: Draggable, stylish video card with minimize option
  return (
    <div
      ref={tileRef}
      style={position ? { left: `${position.x}px`, top: `${position.y}px` } : undefined}
      className={`fixed ${!position ? "bottom-6 right-6" : ""} z-40 w-44 rounded-2xl overflow-hidden bg-slate-900 border-2 ${
        hasPermission ? "border-[#16499c] shadow-2xl shadow-black/80" : "border-rose-500 shadow-2xl"
      } select-none transition-shadow ${className}`}
    >
      {/* Drag Bar & Minimize Header */}
      <div
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        className="px-2.5 py-1.5 bg-slate-950/95 border-b border-slate-800/80 flex items-center justify-between cursor-grab active:cursor-grabbing"
        title="Drag to reposition anywhere on screen"
      >
        <div className="flex items-center gap-1.5">
          <GripHorizontal className="w-3.5 h-3.5 text-slate-500" />
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          <span className="text-[10px] font-bold text-slate-200 tracking-wider uppercase">
            Live Proctor
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsMinimized(true)}
          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          title="Minimize preview (proctoring stays actively running)"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Video Stream Container */}
      <div className="relative w-full h-28 bg-slate-950">
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
            <CameraOff className="w-6 h-6 text-rose-500 mb-1" />
            <p className="text-[11px] font-bold text-rose-400">Camera Inactive</p>
            <p className="text-[9px] text-slate-400 mt-0.5 max-w-[130px] leading-tight">
              {errorMsg || "Requesting camera..."}
            </p>
          </div>
        )}

        {/* Watermark badge */}
        <div className="absolute bottom-1 right-2 text-[8px] font-mono font-semibold text-slate-400/90 select-none bg-slate-950/60 px-1 py-0.5 rounded">
          AI-MONITORED
        </div>
      </div>
    </div>
  );
};
