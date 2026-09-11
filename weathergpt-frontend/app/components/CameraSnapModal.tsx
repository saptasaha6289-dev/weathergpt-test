"use client";

import React, { useRef, useState } from "react";
import { Camera, RefreshCw, Send, X, AlertTriangle, ShieldCheck } from "lucide-react";

interface CameraSnapModalProps {
  isOpen: boolean;
  onClose: () => void;
  lat: number;
  lon: number;
  locationName: string;
  onAlertBroadcasted: (report: any) => void;
}

export default function CameraSnapModal({
  isOpen,
  onClose,
  lat,
  lon,
  locationName,
  onAlertBroadcasted,
}: CameraSnapModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [streamStarted, setStreamStarted] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [alertResult, setAlertResult] = useState<any | null>(null);

  if (!isOpen) return null;

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setStreamStarted(true);
      }
    } catch (err) {
      alert("Unable to access device camera. Check permissions.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setStreamStarted(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg");
      setCapturedImage(dataUrl);
      stopCamera();
    }
  };

  const handleUploadAndAnalyze = async () => {
    if (!capturedImage) return;
    setAnalyzing(true);

    try {
      // Convert DataURL to Blob
      const resBlob = await fetch(capturedImage);
      const blob = await resBlob.blob();

      const formData = new FormData();
      formData.append("image", blob, "hazard_snap.jpg");
      formData.append("lat", lat.toString());
      formData.append("lon", lon.toString());
      formData.append("location", locationName);

      const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

      const res = await fetch(`${backendUrl}/api/snap-hazard`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Analysis failed");
      const data = await res.json();
      setAlertResult(data);
      onAlertBroadcasted(data.report);

      // Trigger standard browser native push notification if supported
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(`⚠️ Local Hazard: ${data.report.hazard_detected}`, {
          body: data.report.description,
        });
      }
    } catch (err: any) {
      alert(`Error submitting snap: ${err.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    setAlertResult(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-index:[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-md bg-[#0d1322] border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-blue-400" />
            <span className="text-xs font-bold text-white tracking-wide">
              Crowdsourced Hazard Snap & Broadcast
            </span>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* Camera View / Preview */}
          <div className="relative aspect-video w-full bg-black rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
            {!capturedImage && !streamStarted && (
              <button
                type="button"
                onClick={startCamera}
                className="flex flex-col items-center gap-2 text-slate-400 hover:text-white"
              >
                <Camera className="h-8 w-8 text-blue-500" />
                <span className="text-xs">Tap to Open Camera</span>
              </button>
            )}

            <video
              ref={videoRef}
              playsInline
              className={`h-full w-full object-cover ${!capturedImage && streamStarted ? "block" : "hidden"}`}
            />

            {capturedImage && (
              <img src={capturedImage} alt="Snap preview" className="h-full w-full object-cover" />
            )}

            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {streamStarted && !capturedImage && (
              <button
                type="button"
                onClick={capturePhoto}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2"
              >
                <Camera className="h-4 w-4" /> Snap Photo
              </button>
            )}

            {capturedImage && !alertResult && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setCapturedImage(null);
                    startCamera();
                  }}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Retake
                </button>
                <button
                  type="button"
                  disabled={analyzing}
                  onClick={handleUploadAndAnalyze}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  {analyzing ? "AI Analyzing..." : "Verify & Alert"}
                </button>
              </>
            )}
          </div>

          {/* AI Result Card */}
          {alertResult && (
            <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  AI Vision Verified
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded text-white ${
                    alertResult.report.severity === "RED"
                      ? "bg-rose-600"
                      : alertResult.report.severity === "ORANGE"
                      ? "bg-amber-600"
                      : "bg-yellow-600"
                  }`}
                >
                  {alertResult.report.severity}
                </span>
              </div>
              <p className="text-xs text-slate-300">{alertResult.report.description}</p>
              <div className="text-[11px] text-blue-400 font-medium pt-1 border-t border-slate-800">
                📢 {alertResult.message}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}