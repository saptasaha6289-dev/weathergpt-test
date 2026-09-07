"use client";

import React, { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  Send,
  Mic,
  MicOff,
  AlertTriangle,
  CloudRain,
  Wind,
  Droplets,
  Compass,
  Cpu,
  ShieldCheck,
  User,
  Bot,
  Map as MapIcon,
  MessageSquare,
  Sprout,
  Anchor,
  Building2,
} from "lucide-react";
import { HazardPin } from "./components/RiskMap";

// Dynamic import with SSR disabled for Leaflet map component
const RiskMap = dynamic(() => import("./components/RiskMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-[#090d16] text-slate-400 text-sm">
      Loading Doppler GIS Engine...
    </div>
  ),
});

// Browser Web Speech API declarations for TypeScript
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  sourceTag?: string;
}

interface TelemetryState {
  location: string;
  temp: number;
  precip: number;
  wind: number;
  humidity: number;
  alertLevel: string;
  lat: number;
  lon: number;
}

export default function WeatherDashboard() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hello! I am WeatherGPT, connected to the MoES & IMD telemetry pipeline. Select your target persona below and ask about live weather, flood risks, sea states, or crop advisories for any Indian city. You can also click the microphone to speak.",
      timestamp: "11:40 AM",
      sourceTag: "IMD Telemetry Pipeline • Online",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [viewMode, setViewMode] = useState<"split" | "chat" | "map">("split");
  const [activePersona, setActivePersona] = useState<"kisan" | "maritime" | "urban">("kisan");

  const [telemetry, setTelemetry] = useState<TelemetryState>({
    location: "Kolkata, West Bengal",
    temp: 28.5,
    precip: 0.0,
    wind: 12.0,
    humidity: 78,
    alertLevel: "GREEN",
    lat: 22.5726,
    lon: 88.3639,
  });

  // Dynamic Hazard Pins Collection for the Map
  const [hazardPins, setHazardPins] = useState<HazardPin[]>([
    {
      id: "init-pin",
      city: "Kolkata",
      lat: 22.5726,
      lon: 88.3639,
      temp: 28.5,
      wind: 12.0,
      precip: 0.0,
      alertLevel: "GREEN",
      timestamp: "Active",
    },
  ]);

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize Native Browser Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-IN";

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        let currentTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setInput(currentTranscript);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Brave.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setInput("");
      recognitionRef.current.start();
    }
  };

  // Poll Initial Telemetry on Mount
  useEffect(() => {
    async function fetchInitialTelemetry() {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/telemetry?location=Kolkata");
        if (res.ok) {
          const data = await res.json();
          const assessment = data.assessment;
          const t = data.telemetry;
          setTelemetry({
            location: t.location || "Kolkata, West Bengal",
            temp: assessment.temperature,
            precip: assessment.precipitation,
            wind: assessment.wind_speed,
            humidity: assessment.humidity,
            alertLevel: assessment.alert_level || "GREEN",
            lat: t.latitude || 22.5726,
            lon: t.longitude || 88.3639,
          });
        }
      } catch (err) {
        console.warn("Backend not yet reachable on port 8000; using initial baseline readings.");
      }
    }
    fetchInitialTelemetry();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    const userText = input.trim();
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          latitude: telemetry.lat,
          longitude: telemetry.lon,
          persona: activePersona,
        }),
      });

      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      const data = await res.json();

      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        sourceTag: data.source_tag || "MoES Early Warning API",
      };

      if (data.telemetry) {
        const t = data.telemetry;
        const newLat = t.latitude ?? telemetry.lat;
        const newLon = t.longitude ?? telemetry.lon;
        const alertLvl = data.alert_level || "GREEN";

        setTelemetry({
          location: t.location || "Active Station",
          temp: t.temp,
          precip: t.precip,
          wind: t.wind,
          humidity: t.humidity,
          alertLevel: alertLvl,
          lat: newLat,
          lon: newLon,
        });

        // Add or update hazard pin on GIS map
        setHazardPins((prev) => [
          ...prev.filter((p) => p.city !== (t.city || t.location)),
          {
            id: Date.now().toString(),
            city: t.city || t.location || "Observation Site",
            lat: newLat,
            lon: newLon,
            temp: t.temp,
            wind: t.wind,
            precip: t.precip,
            alertLevel: alertLvl,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }

      setMessages((prev) => [...prev, botResponse]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Backend Connection Notice: ${err.message || "Unable to reach server"}. Ensure FastAPI backend is running on http://127.0.0.1:8000.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        sourceTag: "System Gateway",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#090d16] text-slate-100 antialiased overflow-hidden">
      {/* Sidebar */}
      <aside className="w-80 border-r border-slate-800 bg-[#0d1322] hidden lg:flex flex-col justify-between p-5 shrink-0">
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/30">
              W
            </div>
            <div>
              <h1 className="font-bold text-base tracking-wide text-white">WeatherGPT</h1>
              <p className="text-xs text-slate-400">MoES Decision Engine</p>
            </div>
          </div>

          {/* Dynamic Alert Banner */}
          <div
            className={`rounded-xl border p-3 flex gap-3 items-start ${
              telemetry.alertLevel === "RED"
                ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
                : telemetry.alertLevel === "ORANGE"
                ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
            }`}
          >
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider">
                {telemetry.alertLevel} STATUS
              </p>
              <p className="text-xs mt-1">
                {telemetry.alertLevel === "RED"
                  ? "Extreme hazard advisory triggered by meteorological telemetry."
                  : telemetry.alertLevel === "ORANGE"
                  ? "Elevated conditions require sector-specific monitoring."
                  : "Atmospheric parameters within standard thresholds."}
              </p>
            </div>
          </div>

          {/* Telemetry Metrics */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Live Station</p>
              <span className="text-[11px] font-medium text-blue-400 truncate max-width: 140px;">
                {telemetry.location}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-slate-900/80 border border-slate-800 p-3">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <CloudRain className="h-4 w-4 text-blue-400" />
                  <span className="text-xs">Precip</span>
                </div>
                <p className="text-lg font-semibold text-white">{telemetry.precip} mm</p>
              </div>

              <div className="rounded-lg bg-slate-900/80 border border-slate-800 p-3">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <Wind className="h-4 w-4 text-teal-400" />
                  <span className="text-xs">Wind</span>
                </div>
                <p className="text-lg font-semibold text-white">{telemetry.wind} km/h</p>
              </div>

              <div className="rounded-lg bg-slate-900/80 border border-slate-800 p-3">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <Droplets className="h-4 w-4 text-sky-400" />
                  <span className="text-xs">Humidity</span>
                </div>
                <p className="text-lg font-semibold text-white">{telemetry.humidity}%</p>
              </div>

              <div className="rounded-lg bg-slate-900/80 border border-slate-800 p-3">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <Compass className="h-4 w-4 text-indigo-400" />
                  <span className="text-xs">Temp</span>
                </div>
                <p className="text-lg font-semibold text-white">{telemetry.temp}°C</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800/80 pt-4 text-xs text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            GIS Radar Online
          </span>
          <span>FastAPI Engine</span>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="flex flex-1 flex-col h-full bg-[#090d16] overflow-hidden">
        {/* Top Header with View Switcher */}
        <header className="h-16 border-b border-slate-800 px-6 flex items-center justify-between bg-[#0d1322]/50 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-blue-500"></div>
            <span className="text-sm font-medium text-slate-200">
              Autonomous Meteorological Agent & Risk Radar
            </span>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs gap-1">
            <button
              onClick={() => setViewMode("chat")}
              className={`px-3 py-1 rounded-md flex items-center gap-1.5 transition-all ${
                viewMode === "chat" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" /> Chat Only
            </button>
            <button
              onClick={() => setViewMode("split")}
              className={`hidden md:flex px-3 py-1 rounded-md items-center gap-1.5 transition-all ${
                viewMode === "split" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              <Cpu className="h-3.5 w-3.5" /> Split GIS
            </button>
            <button
              onClick={() => setViewMode("map")}
              className={`px-3 py-1 rounded-md flex items-center gap-1.5 transition-all ${
                viewMode === "map" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              <MapIcon className="h-3.5 w-3.5" /> Full Map
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden p-4 gap-4">
          {/* Chat Panel */}
          {(viewMode === "chat" || viewMode === "split") && (
            <div
              className={`flex flex-col h-full bg-[#0d1322]/40 rounded-2xl border border-slate-800/80 overflow-hidden ${
                viewMode === "split" ? "w-full md:w-1/2" : "w-full"
              }`}
            >
              {/* Message Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 max-w-xl ${
                      msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                    }`}
                  >
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                        msg.role === "assistant"
                          ? "bg-blue-600/20 border border-blue-500/40 text-blue-400"
                          : "bg-slate-700 text-slate-300"
                      }`}
                    >
                      {msg.role === "assistant" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                    </div>

                    <div className="space-y-1">
                      <div
                        className={`p-3.5 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                          msg.role === "user"
                            ? "bg-blue-600 text-white rounded-tr-none"
                            : "bg-[#131b2e] border border-slate-800 text-slate-200 rounded-tl-none"
                        }`}
                      >
                        {msg.content}
                      </div>
                      <div
                        className={`flex items-center gap-2 text-[11px] text-slate-500 px-1 ${
                          msg.role === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        <span>{msg.timestamp}</span>
                        {msg.sourceTag && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-slate-400">
                              <ShieldCheck className="h-3 w-3 text-emerald-400" />
                              {msg.sourceTag}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex items-center gap-2 text-xs text-slate-400 italic">
                    <Bot className="h-4 w-4 animate-spin text-blue-400" />
                    Analyzing atmospheric radar & telemetry...
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Persona Toggles + Chat Input */}
              <div className="p-3 border-t border-slate-800 bg-[#0d1322]/90 backdrop-blur-md space-y-2">
                {/* Multi-Persona Selection Toggles */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
                    Persona:
                  </span>
                  
                  <button
                    type="button"
                    onClick={() => setActivePersona("kisan")}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      activePersona === "kisan"
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                        : "bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-700/80"
                    }`}
                  >
                    <Sprout className="h-3.5 w-3.5" />
                    Kisan (Agro)
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivePersona("maritime")}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      activePersona === "maritime"
                        ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/30"
                        : "bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-700/80"
                    }`}
                  >
                    <Anchor className="h-3.5 w-3.5" />
                    Maritime & Fishery
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivePersona("urban")}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      activePersona === "urban"
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                        : "bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-700/80"
                    }`}
                  >
                    <Building2 className="h-3.5 w-3.5" />
                    Urban & Commuter
                  </button>
                </div>

                {/* Form Input */}
                <form
                  onSubmit={handleSend}
                  className={`flex items-center gap-2 rounded-xl border bg-[#121929] px-3 py-2 transition-all ${
                    isListening
                      ? "border-rose-500 shadow-lg shadow-rose-500/20 ring-1 ring-rose-500"
                      : "border-slate-700/60 focus-within:border-blue-500"
                  }`}
                >
                  <button
                    type="button"
                    onClick={toggleListening}
                    title={isListening ? "Stop listening" : "Click to speak"}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                      isListening
                        ? "bg-rose-600 text-white animate-pulse"
                        : "text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </button>

                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={
                      isListening
                        ? "Listening... Speak your weather query now."
                        : activePersona === "kisan"
                        ? "Ask about crop spraying, soil moisture, or sowing in any city..."
                        : activePersona === "maritime"
                        ? "Ask about boat safety, port danger signals, or sea swells..."
                        : "Ask about waterlogging, transit disruption, or lightning..."
                    }
                    className="flex-1 bg-transparent px-2 py-1 text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
                  />

                  <button
                    type="submit"
                    disabled={!input.trim() || loading}
                    className="p-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg transition-colors cursor-pointer"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Interactive Geospatial Risk Map Panel */}
          {(viewMode === "map" || viewMode === "split") && (
            <div className={`h-full ${viewMode === "split" ? "hidden md:block md:w-1/2" : "w-full"}`}>
              <RiskMap
                pins={hazardPins}
                center={[telemetry.lat, telemetry.lon]}
                showRadar={true}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}