"use client";

import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix default Leaflet icon paths in Next.js bundler
const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export interface HazardPin {
  id: string;
  city: string;
  lat: number;
  lon: number;
  temp: number;
  wind: number;
  precip: number;
  alertLevel: string;
  timestamp: string;
}

interface RiskMapProps {
  pins: HazardPin[];
  center: [number, number];
  zoom?: number;
  showRadar?: boolean;
}

// Controller component to smoothly fly map to newly queried coordinates
function MapRecenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 9, { duration: 1.5 });
  }, [center, map]);
  return null;
}

export default function RiskMap({ pins, center, showRadar = true }: RiskMapProps) {
  return (
    <div className="relative h-full w-full rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
      <MapContainer
        center={center}
        zoom={6}
        scrollWheelZoom={true}
        className="h-full w-full z-0 bg-[#090d16]"
      >
        {/* Dark CartoDB base tile layer */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* Live Weather Radar Overlay (RainViewer Open Doppler Tile Server) */}
        {showRadar && (
          <TileLayer
            attribution='&copy; <a href="https://www.rainviewer.com/">RainViewer</a>'
            url="https://tilecache.rainviewer.com/v2/radar/nowcast_0/256/{z}/{x}/{y}/2/1_1.png"
            opacity={0.65}
          />
        )}

        <MapRecenter center={center} />

        {/* Dynamic Hazard Pins */}
        {pins.map((pin) => {
          const color =
            pin.alertLevel === "RED"
              ? "#f43f5e"
              : pin.alertLevel === "ORANGE"
              ? "#f59e0b"
              : "#10b981";

          return (
            <React.Fragment key={pin.id}>
              {/* Geofence Risk Boundary Ring */}
              <Circle
                center={[pin.lat, pin.lon]}
                radius={25000} // 25km impact radius
                pathOptions={{
                  color: color,
                  fillColor: color,
                  fillOpacity: 0.15,
                  weight: 1.5,
                  dashArray: pin.alertLevel !== "GREEN" ? "6, 6" : undefined,
                }}
              />

              {/* Station Marker */}
              <Marker position={[pin.lat, pin.lon]} icon={markerIcon}>
                <Popup className="custom-popup">
                  <div className="p-1 text-slate-900 leading-snug">
                    <div className="flex items-center justify-between gap-2 border-b pb-1 mb-1">
                      <span className="font-bold text-sm">{pin.city}</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded text-white ${
                          pin.alertLevel === "RED"
                            ? "bg-rose-600"
                            : pin.alertLevel === "ORANGE"
                            ? "bg-amber-600"
                            : "bg-emerald-600"
                        }`}
                      >
                        {pin.alertLevel}
                      </span>
                    </div>
                    <p className="text-xs">🌡️ <b>Temp:</b> {pin.temp}°C</p>
                    <p className="text-xs">🌧️ <b>Precip:</b> {pin.precip} mm</p>
                    <p className="text-xs">💨 <b>Wind:</b> {pin.wind} km/h</p>
                    <p className="text-[10px] text-slate-500 mt-1">Logged: {pin.timestamp}</p>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}
      </MapContainer>

      {/* Floating Map Legend & Radar Status */}
      <div className="absolute top-4 right-4 z-index:1000 bg-[#0d1322]/90 backdrop-blur-md border border-slate-800 p-3 rounded-xl shadow-lg text-xs space-y-2 pointer-events-auto">
        <div className="flex items-center gap-2 font-semibold text-slate-200">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Doppler Radar Overlay
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500"></span> Red
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span> Orange
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span> Nominal
          </span>
        </div>
      </div>
    </div>
  );
}