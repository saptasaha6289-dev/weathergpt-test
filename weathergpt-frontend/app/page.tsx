"use client";

import React, { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  Send,
  Mic,
  MicOff,
  AlertTriangle,
  AlertOctagon,
  CloudRain,
  Waypoints,
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
  Volume2,
  Camera,
  SlidersHorizontal,
} from "lucide-react";
import EmergencyBroadcastModal from "./components/EmergencyBroadcastModal";
import { HazardPin } from "./components/RiskMap";
import { ForecastItem } from "./components/WeatherCharts";
import CameraSnapModal from "./components/CameraSnapModal";
import AdvancedFeaturesDrawer from "./components/AdvancedFeaturesDrawer";

type LangKey = "en" | "hi" | "bn" | "mr" | "te" | "ta";

const LANGUAGES: { code: LangKey; label: string; speechCode: string }[] = [
  { code: "en", label: "English", speechCode: "en-IN" },
  { code: "hi", label: "हिंदी (Hindi)", speechCode: "hi-IN" },
  { code: "bn", label: "বাংলা (Bengali)", speechCode: "bn-IN" },
  { code: "mr", label: "मराठी (Marathi)", speechCode: "mr-IN" },
  { code: "te", label: "తెలుగు (Telugu)", speechCode: "te-IN" },
  { code: "ta", label: "தமிழ் (Tamil)", speechCode: "ta-IN" },
];

const UI_STRINGS: Record<LangKey, Record<string, string>> = {
  en: {
    title: "Autonomous Meteorological Agent & Risk Radar",
    precip: "Precip",
    wind: "Wind",
    humidity: "Humidity",
    temp: "Temp",
    kisan: "Kisan (Agro)",
    maritime: "Maritime & Fishery",
    urban: "Urban & Commuter",
    kisanPlaceholder: "Ask about crop spraying, soil moisture, or sowing in any city...",
    maritimePlaceholder: "Ask about boat safety, port danger signals, or sea swells...",
    urbanPlaceholder: "Ask about waterlogging, transit disruption, or lightning...",
    speakBtn: "Listen Advisory",
    speaking: "Playing Audio...",
    analyzing: "Analyzing atmospheric radar & telemetry...",
    listening: "Listening... Speak your weather query now.",
  },
  hi: {
    title: "स्वायत्त मौसम पूर्वानुमान एजेंट और जोखिम रडार",
    precip: "वर्षा",
    wind: "हवा",
    humidity: "आर्द्रता",
    temp: "तापमान",
    kisan: "किसान (कृषि)",
    maritime: "समुद्री व मत्स्य पालन",
    urban: "शहरी व यात्री",
    kisanPlaceholder: "फसल छिड़काव, मिट्टी की नमी या बुआई के बारे में पूछें...",
    maritimePlaceholder: "नौका सुरक्षा, बंदरगाह चेतावनी या समुद्री लहरों के बारे में पूछें...",
    urbanPlaceholder: "जलभराव, यातायात व्यवधान या बिजली गिरने के बारे में पूछें...",
    speakBtn: "सलाह सुनें",
    speaking: "ऑडियो चल रहा है...",
    analyzing: "मौसम रडार और टेलीमेट्री का विश्लेषण जारी है...",
    listening: "सुन रहे हैं... अपना प्रश्न बोलें।",
  },
  bn: {
    title: "স্বয়ংক্রিয় আবহাওয়া উপদেষ্টা ও ঝুঁকি রাডার",
    precip: "বৃষ্টিপাত",
    wind: "বাতাস",
    humidity: "আর্দ্রতা",
    temp: "তাপমাত্রা",
    kisan: "কিষাণ (কৃষি)",
    maritime: "সামুদ্রিক ও মৎস্যজীবী",
    urban: "শহুরে ও যাত্রী",
    kisanPlaceholder: "কীটনাশক প্রয়োগ, মাটির আর্দ্রতা বা বপন সম্পর্কে জিজ্ঞাসা করুন...",
    maritimePlaceholder: "নৌকা নিরাপত্তা, সমুদ্রের ঢেউ বা বিপৎসংকেত সম্পর্কে জিজ্ঞাসা করুন...",
    urbanPlaceholder: "জল জমা, যাতায়াত সমস্যা বা বজ্রপাত সম্পর্কে জিজ্ঞাসা করুন...",
    speakBtn: "পরামর্শ শুনুন",
    speaking: "অডিও বাজছে...",
    analyzing: "আবহাওয়া রাডার এবং তথ্য বিশ্লেষণ করা হচ্ছে...",
    listening: "শুনছি... আপনার প্রশ্ন বলুন।",
  },
  mr: {
    title: "हवामान सल्लागार आणि जोखीम रडार",
    precip: "पाऊस",
    wind: "वारा",
    humidity: "आर्द्रता",
    temp: "तापमान",
    kisan: "शेतकरी (कृषी)",
    maritime: "सागरी व मत्स्यव्यवसाय",
    urban: "शहरी व प्रवासी",
    kisanPlaceholder: "पीक फवारणी, मातीचा ओलावा किंवा पेरणीबद्दल विचारा...",
    maritimePlaceholder: "बोट सुरक्षा, बंदरावरील धोक्याचे इशारे किंवा लाटांबद्दल विचारा...",
    urbanPlaceholder: "पाणी साचणे, वाहतूक अडथळे किंवा विजांबद्दल विचारा...",
    speakBtn: "सल्ला ऐका",
    speaking: "ऑडिओ सुरू आहे...",
    analyzing: "हवामान रडारचे विश्लेषण सुरू आहे...",
    listening: "ऐकत आहे... तुमचा प्रश्न विचारा.",
  },
  te: {
    title: "వాతావరణ సలహాదారు మరియు ముప్పు రాడార్",
    precip: "వర్షపాతం",
    wind: "గాలి",
    humidity: "తేమ",
    temp: "ఉష్ణోగ్రత",
    kisan: "రైతు (వ్యవసాయం)",
    maritime: "సముద్ర మరియు మత్స్యకార",
    urban: "పట్టణ మరియు ప్రయాణికులు",
    kisanPlaceholder: "పంటల రక్షణ, నేల తేమ లేదా విత్తనాల గురించి అడగండి...",
    maritimePlaceholder: "పడవల భద్రత, పోర్ట్ హెచ్చరికలు లేదా అలల గురించి అడగండి...",
    urbanPlaceholder: "నీరు నిలవడం, రవాణా ఇబ్బందులు లేదా పిడుగుల గురించి అడగండి...",
    speakBtn: "సలహా వినండి",
    speaking: "ప్లే అవుతోంది...",
    analyzing: "వాతావరణ డేటా విశ్లేషించబడుతోంది...",
    listening: "వింటున్నాం... మాట్లాడండి.",
  },
  ta: {
    title: "வானிலை வழிகாட்டி மற்றும் இடர் ரேடார்",
    precip: "மழைப்பொழிவு",
    wind: "காற்று",
    humidity: "ஈரப்பதம்",
    temp: "வெப்பநிலை",
    kisan: "உழவர் (விவசாயம்)",
    maritime: "கடல் மற்றும் மீன்பிடி",
    urban: "நகர்ப்புற மற்றும் பயணிகள்",
    kisanPlaceholder: "பயிர் பாதுகாப்பு, மண் ஈரப்பதம் அல்லது விதைப்பு பற்றி கேளுங்கள்...",
    maritimePlaceholder: "படகு பாதுகாப்பு, துறைமுக எச்சரிக்கைகள் அல்லது அலைகள் பற்றி கேளுங்கள்...",
    urbanPlaceholder: "வெள்ளப்பெருக்கு, போக்குவரத்து தடைகள் அல்லது இடிமின்னல் பற்றி கேளுங்கள்...",
    speakBtn: "ஆலோசனையைக் கேளுங்கள்",
    speaking: "ஆடியோ ஒலிக்கிறது...",
    analyzing: "வானிலை ரேடார் பகுப்பாய்வு செய்யப்படுகிறது...",
    listening: "கேட்கிறது... உங்கள் கேள்வியைக் கூறுங்கள்.",
  },
};

const RiskMap = dynamic(() => import("./components/RiskMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-[#090d16] text-slate-400 text-sm">
      Loading Doppler GIS Engine...
    </div>
  ),
});

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "https://weathergpt-backend-mo9e.onrender.com";

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
  forecast_7d?: ForecastItem[];
}

export default function WeatherDashboard() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hello! I am MausamSetu, connected to the MoES & IMD telemetry pipeline. Select your target persona and language to ask about live weather, flood risks, sea states, or crop advisories for any Indian city. You can also click the microphone to speak.",
      timestamp: "11:40 AM",
      sourceTag: "IMD Telemetry Pipeline • Online",
    },
  ]);

  const [input, setInput] = useState("");
  const [currentLang, setCurrentLang] = useState<LangKey>("en");
  const [activeSpeakingId, setActiveSpeakingId] = useState<string | null>(null);
  const [isSosOpen, setIsSosOpen] = useState(false);
  const [isSnapOpen, setIsSnapOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [floodSurge, setFloodSurge] = useState<number>(0);
  const [evacRoute, setEvacRoute] = useState<any | null>(null);

  const speakAdvisory = (text: string, msgId: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("Speech audio synthesis is not supported on this browser.");
      return;
    }

    if (activeSpeakingId === msgId) {
      window.speechSynthesis.cancel();
      setActiveSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();

    const cleanText = text.replace(/[*#_`]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const langObj = LANGUAGES.find((l) => l.code === currentLang);
    utterance.lang = langObj ? langObj.speechCode : "en-IN";
    utterance.rate = 0.95;

    utterance.onstart = () => setActiveSpeakingId(msgId);
    utterance.onend = () => setActiveSpeakingId(null);
    utterance.onerror = () => setActiveSpeakingId(null);

    window.speechSynthesis.speak(utterance);
  };

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
    forecast_7d: [
      { date: "2026-09-08", day: "Tue", max_temp: 29.5, min_temp: 25.0, precip: 0.0 },
      { date: "2026-09-09", day: "Wed", max_temp: 30.0, min_temp: 25.5, precip: 2.1 },
      { date: "2026-09-10", day: "Thu", max_temp: 28.0, min_temp: 24.5, precip: 8.4 },
      { date: "2026-09-11", day: "Fri", max_temp: 27.5, min_temp: 24.0, precip: 14.0 },
      { date: "2026-09-12", day: "Sat", max_temp: 29.0, min_temp: 25.0, precip: 4.2 },
      { date: "2026-09-13", day: "Sun", max_temp: 31.0, min_temp: 26.0, precip: 0.5 },
      { date: "2026-09-14", day: "Mon", max_temp: 30.5, min_temp: 25.8, precip: 0.0 },
    ],
  });

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

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      const langObj = LANGUAGES.find((l) => l.code === currentLang);
      recognition.lang = langObj ? langObj.speechCode : "en-IN";

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
  }, [currentLang]);

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

  useEffect(() => {
    async function fetchInitialTelemetry() {
      try {
        const res = await fetch(`${BACKEND_URL}/api/telemetry?location=Kolkata`);
        if (res.ok) {
          const data = await res.json();
          const assessment = data.assessment || {};
          const t = data.telemetry || data;
          setTelemetry({
            location: t.location || "Kolkata, West Bengal",
            temp: assessment.temperature ?? t.temp ?? t.temperature ?? 28.5,
            precip: assessment.precipitation ?? t.precip ?? t.precipitation ?? 0.0,
            wind: assessment.wind_speed ?? t.wind ?? t.wind_speed ?? 12.0,
            humidity: assessment.humidity ?? t.humidity ?? 78,
            alertLevel: (assessment.alert_level || t.risk_level || "GREEN").toUpperCase(),
            lat: t.latitude || 22.5726,
            lon: t.longitude || 88.3639,
          });
        }
      } catch (err) {
        console.warn("Backend not yet reachable; using initial baseline readings.");
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
      const res = await fetch(`${BACKEND_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: userText,
          persona: activePersona,
          language: currentLang,
        }),
      });

      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      const data = await res.json();
      console.log("RAW BACKEND RESPONSE:", data);
console.log("TELEMETRY RECEIVED:", data.telemetry);
console.log("FORECAST ARRAY:", data.telemetry?.forecast_7d);

      const botReply = data.reply || data.response || data.message || "Advisory received.";
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: botReply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        sourceTag: data.source_tag || "MoES Early Warning API",
      };

    if (data.telemetry) {
        const t = data.telemetry;
        const newLat = Number(t.latitude ?? telemetry.lat);
        const newLon = Number(t.longitude ?? telemetry.lon);
        const alertLvl = (data.alert_level || t.risk_level || "GREEN").toUpperCase();
        const curTemp = Number(t.temp ?? telemetry.temp);
        const curPrecip = Number(t.precip ?? telemetry.precip);
        const curWind = Number(t.wind ?? telemetry.wind);
        const curHum = Number(t.humidity ?? telemetry.humidity);

        // 1. Updates live station metrics AND 7-day tactical charts
        // ✅ FIX: Pass forecast_7d to state
setTelemetry((prev) => ({
  ...prev,
  location: t.location || "Active Station",
  temp: Number(t.temp ?? prev.temp),
  precip: Number(t.precip ?? prev.precip),
  wind: Number(t.wind ?? prev.wind),
  humidity: Number(t.humidity ?? prev.humidity),
  alertLevel: (data.alert_level || t.risk_level || "GREEN").toUpperCase(),
  lat: Number(t.latitude ?? prev.lat),
  lon: Number(t.longitude ?? prev.lon),
  forecast_7d: t.forecast_7d && t.forecast_7d.length > 0 ? t.forecast_7d : prev.forecast_7d,
}));

        // 2. Pins the newly queried village and smoothly centers the GIS map
        setHazardPins((prev) => [
          ...prev.filter((p) => p.city !== t.location),
          {
            id: Date.now().toString(),
            city: t.location || "Observation Site",
            lat: newLat,
            lon: newLon,
            temp: curTemp,
            wind: curWind,
            precip: curPrecip,
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
        content: `Backend Connection Notice: ${err.message || "Unable to reach server"}. Ensure FastAPI backend is running on ${BACKEND_URL}.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        sourceTag: "System Gateway",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const t = UI_STRINGS[currentLang];

  return (
    <div className="flex h-screen w-full bg-[#090d16] text-slate-100 antialiased overflow-hidden">
      {/* Sidebar */}
      <aside className="w-80 border-r border-slate-800 bg-[#0d1322] hidden lg:flex flex-col justify-between p-5 shrink-0">
        <div className="space-y-4">
          
          {/* MausamSetu Brand Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="relative h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-cyan-500/25 border border-cyan-400/30">
                <CloudRain className="h-5 w-5 text-white" />
                <div className="absolute -bottom-1 -right-1 bg-[#051124] p-0.5 rounded-full border border-cyan-400/40">
                  <Waypoints className="h-3 w-3 text-cyan-300" />
                </div>
              </div>
              
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="font-bold text-lg tracking-tight text-white font-sans">
                    Mausam<span className="text-cyan-400">Setu</span>
                  </h1>
                  <span className="text-[9px] font-mono uppercase bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.5 rounded-md">
                    MoES v2.6
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium tracking-wide">
                  Weather • Alerts • Safer Tomorrow
                </p>
              </div>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 rounded-xl p-2 gap-2">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <span className="text-xs text-slate-400">🌐</span>
              <select
                value={currentLang}
                onChange={(e) => {
                  if (typeof window !== "undefined" && "speechSynthesis" in window) {
                    window.speechSynthesis.cancel();
                    setActiveSpeakingId(null);
                  }
                  setCurrentLang(e.target.value as LangKey);
                }}
                aria-label="Select Language"
                className="bg-slate-800 text-white text-xs border border-slate-700 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer w-full truncate"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-blue-600/30 to-cyan-600/30 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 hover:text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-cyan-950/30 cursor-pointer shrink-0"
              title="Open Advanced Tactical Features"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
              <span>Tactical Ops</span>
            </button>
          </div>

          {/* Alert Status Banner */}
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

          {/* Emergency SOS Broadcast Button */}
          <button
            type="button"
            onClick={() => setIsSosOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/50 text-rose-300 hover:text-rose-100 rounded-xl text-xs font-semibold tracking-wide transition-all shadow-lg shadow-rose-950/40 cursor-pointer"
          >
            <AlertOctagon className="h-4 w-4 text-rose-400 animate-pulse" />
            <span>Broadcast Panchayat SOS</span>
          </button>

          {/* Live Station Metrics */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Live Station</p>
              <span className="text-[11px] font-medium text-blue-400 truncate max-w-[130px]">
                {telemetry.location}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-slate-900/80 border border-slate-800 p-2.5">
                <div className="flex items-center gap-1.5 text-slate-400 mb-0.5">
                  <CloudRain className="h-3.5 w-3.5 text-blue-400" />
                  <span className="text-[11px]">{t.precip}</span>
                </div>
                <p className="text-base font-semibold text-white">{telemetry.precip} mm</p>
              </div>

              <div className="rounded-lg bg-slate-900/80 border border-slate-800 p-2.5">
                <div className="flex items-center gap-1.5 text-slate-400 mb-0.5">
                  <Wind className="h-3.5 w-3.5 text-teal-400" />
                  <span className="text-[11px]">{t.wind}</span>
                </div>
                <p className="text-base font-semibold text-white">{telemetry.wind} km/h</p>
              </div>

              <div className="rounded-lg bg-slate-900/80 border border-slate-800 p-2.5">
                <div className="flex items-center gap-1.5 text-slate-400 mb-0.5">
                  <Droplets className="h-3.5 w-3.5 text-sky-400" />
                  <span className="text-[11px]">{t.humidity}</span>
                </div>
                <p className="text-base font-semibold text-white">{telemetry.humidity}%</p>
              </div>

              <div className="rounded-lg bg-slate-900/80 border border-slate-800 p-2.5">
                <div className="flex items-center gap-1.5 text-slate-400 mb-0.5">
                  <Compass className="h-3.5 w-3.5 text-indigo-400" />
                  <span className="text-[11px]">{t.temp}</span>
                </div>
                <p className="text-base font-semibold text-white">{telemetry.temp}°C</p>
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
        {/* Top Header */}
        <header className="h-16 border-b border-slate-800 px-6 flex items-center justify-between bg-[#0d1322]/50 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-blue-500"></div>
            <span className="text-sm font-medium text-slate-200">
              {t.title}
            </span>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs gap-1">
            <button
              onClick={() => setViewMode("chat")}
              className={`px-3 py-1 rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "chat" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" /> Chat Only
            </button>
            <button
              onClick={() => setViewMode("split")}
              className={`hidden md:flex px-3 py-1 rounded-md items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "split" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              <Cpu className="h-3.5 w-3.5" /> Split GIS
            </button>
            <button
              onClick={() => setViewMode("map")}
              className={`px-3 py-1 rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
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
                        <div>{msg.content}</div>

                        {msg.role === "assistant" && (
                          <div className="mt-2.5 pt-2 border-t border-slate-800/60">
                            <button
                              type="button"
                              onClick={() => speakAdvisory(msg.content, msg.id)}
                              className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
                                activeSpeakingId === msg.id
                                  ? "bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-500/20"
                                  : "bg-blue-950/40 hover:bg-blue-900/60 border-blue-500/30 text-blue-300"
                              }`}
                            >
                              <Volume2 className={`h-3.5 w-3.5 ${activeSpeakingId === msg.id ? "animate-pulse text-white" : "text-blue-400"}`} />
                              {activeSpeakingId === msg.id ? t.speaking : t.speakBtn}
                            </button>
                          </div>
                        )}
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
                    {t.analyzing}
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Persona Toggles + Chat Input */}
              <div className="p-3 border-t border-slate-800 bg-[#0d1322]/90 backdrop-blur-md space-y-2">
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
                    {t.kisan}
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
                    {t.maritime}
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
                    {t.urban}
                  </button>
                </div>

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

                  <button
                    type="button"
                    onClick={() => setIsSnapOpen(true)}
                    title="Snap Ground Hazard"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    <Camera className="h-4 w-4 text-blue-400" />
                  </button>

                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={
                      isListening
                        ? t.listening
                        : activePersona === "kisan"
                        ? t.kisanPlaceholder
                        : activePersona === "maritime"
                        ? t.maritimePlaceholder
                        : t.urbanPlaceholder
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

          {/* Interactive Geospatial Risk Map */}
          {(viewMode === "map" || viewMode === "split") && (
            <div className={`h-full ${viewMode === "split" ? "hidden md:block md:w-1/2" : "w-full"}`}>
              <RiskMap
                pins={hazardPins}
                center={[telemetry.lat, telemetry.lon]}
                showRadar={true}
                floodSurge={floodSurge}
                evacRoute={evacRoute}
              />
            </div>
          )}
        </div>
      </main>

      {/* Emergency SOS Broadcast Modal */}
      <EmergencyBroadcastModal
        isOpen={isSosOpen}
        onClose={() => setIsSosOpen(false)}
        telemetry={telemetry}
        currentLang={currentLang}
      />

      {/* Snap-Hazard Inspection Modal */}
      <CameraSnapModal
        isOpen={isSnapOpen}
        onClose={() => setIsSnapOpen(false)}
        lat={telemetry.lat}
        lon={telemetry.lon}
        locationName={telemetry.location}
        onAlertBroadcasted={(report) => {
          setHazardPins((prev) => [
            ...prev,
            {
              id: report.id,
              city: `Crowd Report: ${report.hazard_detected}`,
              lat: report.lat,
              lon: report.lon,
              temp: telemetry.temp,
              wind: telemetry.wind,
              precip: telemetry.precip,
              alertLevel: report.severity,
              timestamp: report.timestamp,
            },
          ]);
        }}
      />

      {/* Advanced Features Drawer */}
      <AdvancedFeaturesDrawer
      key={`${telemetry.location}-${telemetry.temp}`}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        telemetry={telemetry}
        floodSurge={floodSurge}
        onSurgeChange={setFloodSurge}
        onTriggerEvacuationRoute={(routeData) => {
          setEvacRoute(routeData);
          if (routeData?.coordinates) {
            const shelterCoord = routeData.coordinates[routeData.coordinates.length - 1];
            setHazardPins((prev) => [
              ...prev,
              {
                id: `evac-target-${Date.now()}`,
                city: routeData.shelterName,
                lat: shelterCoord[0],
                lon: shelterCoord[1],
                temp: telemetry.temp,
                wind: telemetry.wind,
                precip: telemetry.precip,
                alertLevel: "GREEN",
                timestamp: "SAFE REFUGE ZONE",
              },
            ]);
          }
        }}
      />
    </div>
  );
}