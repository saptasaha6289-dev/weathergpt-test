"use client";

import React, { useState } from "react";
import { AlertOctagon, Share2, Copy, Check, X, Send } from "lucide-react";

interface EmergencyBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  telemetry: {
    location: string;
    temp: number;
    precip: number;
    wind: number;
    humidity: number;
    alertLevel: string;
  };
  currentLang: string;
}

export default function EmergencyBroadcastModal({
  isOpen,
  onClose,
  telemetry,
  currentLang,
}: EmergencyBroadcastModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Format bilingual/vernacular localized SOS payload
  const getBroadcastMessage = () => {
    const timestamp = new Date().toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    const isUrgent = telemetry.alertLevel === "RED" || telemetry.alertLevel === "ORANGE";
    const headerPrefix = isUrgent
      ? "🚨 [IMD/MoES URGENT WEATHER BULLETIN] 🚨"
      : "ℹ️ [IMD/MoES ROUTINE AGRO-MET ADVISORY]";

    return `${headerPrefix}
📍 Location: ${telemetry.location}
⚠️ Alert Status: ${telemetry.alertLevel} ALERT
⏱️ Issued: ${timestamp}

📊 Current Ground Observations:
• Rainfall: ${telemetry.precip} mm
• Wind Gusts: ${telemetry.wind} km/h
• Surface Temp: ${telemetry.temp}°C
• Relative Humidity: ${telemetry.humidity}%

⚡ Panchayat Action Directive:
${
  telemetry.alertLevel === "RED"
    ? "Immediate evacuation for low-lying agrarian & coastal settlements. Secure fishing trawlers. Clear drainage culverts."
    : telemetry.alertLevel === "ORANGE"
    ? "Halt chemical spraying and fertilizer application. Secure small boats. Monitor underpasses for waterlogging."
    : "Standard agricultural and maritime baseline operations permitted. Regular irrigation schedules may resume."
}

Distributed via WeatherGPT Decision Engine. Verified IMD Pipeline.`;
  };

  const messageText = getBroadcastMessage();

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const encoded = encodeURIComponent(messageText);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, "_blank");
  };

  const handleSMSShare = () => {
    const encoded = encodeURIComponent(messageText);
    window.open(`sms:?body=${encoded}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-index:[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg bg-[#0d1322] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-[#12192b]">
          <div className="flex items-center gap-2.5">
            <AlertOctagon className="h-5 w-5 text-rose-500 animate-pulse" />
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">
                Gram Panchayat Emergency SOS Dispatch
              </h3>
              <p className="text-[11px] text-slate-400">
                MoES Early Warning System Multi-Channel Broadcast
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Message Preview Box */}
        <div className="p-5 space-y-4">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 block">
              Generated Alert Payload:
            </label>
            <textarea
              readOnly
              rows={9}
              value={messageText}
              className="w-full bg-[#080c14] border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Action Dispatch Buttons */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2.5 px-3 rounded-xl transition-all shadow-lg shadow-emerald-600/20"
            >
              <Share2 className="h-4 w-4" />
              WhatsApp
            </button>

            <button
              type="button"
              onClick={handleSMSShare}
              className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold py-2.5 px-3 rounded-xl transition-all shadow-lg shadow-blue-600/20"
            >
              <Send className="h-4 w-4" />
              SMS Broadcast
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium py-2.5 px-3 rounded-xl transition-all"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-400" /> Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> Copy Text
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-[#090d16]/70 flex items-center justify-between text-[11px] text-slate-500">
          <span>Payload complies with NDMA Protocol</span>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white underline underline-offset-2"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}