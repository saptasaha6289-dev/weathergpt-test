"use client";

import React, { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  Polygon,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { CloudRain, Wind, Flame, Layers } from "lucide-react";

// Fix standard Leaflet pin icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
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
  showRadar?: boolean;
  floodSurge?: number; // 3D DEM simulated water surge (+0.5m to +6.0m)
  evacRoute?: any;
}

// Smoothly re-centers map when the user queries a new location
function MapRecenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, 11, { duration: 1.8 });
    }
  }, [center, map]);
  return null;
}

// Generates dynamic polygonal risk zones around the target coordinates
function generateRiskPolygon(lat: number, lon: number, delta: number) {
  return [
    [lat + delta, lon - delta],
    [lat + delta * 1.3, lon + delta],
    [lat - delta * 0.7, lon + delta * 1.4],
    [lat - delta * 1.2, lon - delta * 0.8],
  ] as [number, number][];
}

export default function RiskMap({
  pins,
  center,
  floodSurge = 0,
  evacRoute,
}: RiskMapProps) {
  // Layer switcher: 'rain' | 'wind' | 'temp' | 'none'
  const [activeWeatherLayer, setActiveWeatherLayer] = useState<
    "rain" | "wind" | "temp" | "none"
  >("rain");

  // Free OpenWeatherMap Tile Key
  const OWM_KEY =
    process.env.NEXT_PUBLIC_OWM_KEY || "b1b15e88fa797225412429c1c50c122a1";

  const activePin = pins[pins.length - 1];
  const alertColor =
    activePin?.alertLevel === "RED"
      ? "#ef4444"
      : activePin?.alertLevel === "ORANGE"
      ? "#f97316"
      : activePin?.alertLevel === "YELLOW"
      ? "#eab308"
      : "#10b981";

  // Dynamic calculations for 3D DEM surge simulation layer
  const floodRadius = floodSurge > 0 ? 500 + floodSurge * 750 : 0;
  const getSurgeColor = (surge: number) => {
    if (surge >= 4.0) return "#f43f5e"; // Critical red
    if (surge >= 2.0) return "#f59e0b"; // Warning amber
    return "#06b6d4"; // Cyan buffer
  };

  return (
    <div className="relative h-full w-full rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-[#080c14]">
      {/* Tactical Top Floating Controls: Rain Radar, Wind Flow, Heatmap */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-1.5 bg-[#0d1322]/90 backdrop-blur-md border border-slate-700/60 p-2 rounded-xl text-xs text-white shadow-xl">
        <span className="font-semibold text-[10px] text-slate-400 uppercase tracking-wider px-1">
          📡 Atmospheric Overlays
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setActiveWeatherLayer("rain")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeWeatherLayer === "rain"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/30"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            <CloudRain className="h-3 w-3" /> Rain Radar
          </button>
          <button
            type="button"
            onClick={() => setActiveWeatherLayer("wind")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeWeatherLayer === "wind"
                ? "bg-teal-600 text-white shadow-md shadow-teal-500/30"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            <Wind className="h-3 w-3" /> Wind Flow
          </button>
          <button
            type="button"
            onClick={() => setActiveWeatherLayer("temp")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeWeatherLayer === "temp"
                ? "bg-amber-600 text-white shadow-md shadow-amber-500/30"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            <Flame className="h-3 w-3" /> Heatmap
          </button>
          <button
            type="button"
            onClick={() => setActiveWeatherLayer("none")}
            className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
              activeWeatherLayer === "none"
                ? "bg-slate-700 text-white"
                : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
            title="Hide Weather Layers"
          >
            <Layers className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Bottom IMD Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-[#090d16]/90 backdrop-blur-md border border-slate-800 px-3 py-2 rounded-xl text-[11px] text-slate-300 flex items-center gap-3">
        <span className="font-semibold text-white">IMD Alert Scale:</span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span> Green
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-500"></span> Yellow
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span> Orange
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse"></span> Red Alert
        </span>
      </div>

      {/* Floating Indicator for Live 3D DEM Inundation Simulation */}
      {floodSurge > 0 && (
        <div className="absolute top-3 left-3 z-[1000] bg-[#0d1322]/95 border border-slate-700/80 backdrop-blur-md px-3 py-2 rounded-xl text-xs text-white shadow-2xl flex items-center gap-2.5">
          <span
            className="h-2.5 w-2.5 rounded-full animate-ping"
            style={{ backgroundColor: getSurgeColor(floodSurge) }}
          />
          <div>
            <div className="font-bold uppercase tracking-wider text-[10px] text-slate-300">
              3D DEM Surge Active
            </div>
            <div className="font-mono text-cyan-300 text-[11px]">
              +{floodSurge.toFixed(1)}m | Spread: {(floodRadius / 1000).toFixed(1)} km
            </div>
          </div>
        </div>
      )}

      <MapContainer
        center={center}
        zoom={11}
        minZoom={3}
        maxZoom={18}
        scrollWheelZoom={true}
        className="h-full w-full"
      >
        <MapRecenter center={center} />

        {/* 1. OpenStreetMap Dark Carto Tiles */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          maxZoom={19}
        />

        {/* 2. Dynamic Real-time Weather Radar Tiles */}
        {activeWeatherLayer === "rain" && (
          <TileLayer
            attribution="OpenWeatherMap Precipitation Radar"
            url={`https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${OWM_KEY}`}
            opacity={0.7}
            zIndex={500}
          />
        )}

        {activeWeatherLayer === "wind" && (
          <TileLayer
            attribution="OpenWeatherMap Wind Velocity"
            url={`https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${OWM_KEY}`}
            opacity={0.65}
            zIndex={500}
          />
        )}

        {activeWeatherLayer === "temp" && (
          <TileLayer
            attribution="OpenWeatherMap Surface Temperature"
            url={`https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${OWM_KEY}`}
            opacity={0.6}
            zIndex={500}
          />
        )}

        {/* 3. Evacuation Route Path */}
        {evacRoute?.coordinates && (
          <Polyline
            positions={evacRoute.coordinates}
            pathOptions={{
              color: "#10b981",
              weight: 4,
              dashArray: "8, 6",
            }}
          />
        )}

        {/* 4. 3D DEM Simulated Flood Inundation Contour Layers */}
        {floodSurge > 0 && (
          <>
            {/* Outer Spread Contour */}
            <Circle
              center={center}
              radius={floodRadius}
              pathOptions={{
                color: getSurgeColor(floodSurge),
                fillColor: getSurgeColor(floodSurge),
                fillOpacity: Math.min(0.2 + floodSurge * 0.08, 0.6),
                weight: 2,
                dashArray: floodSurge >= 4.0 ? "6, 6" : undefined,
              }}
            >
              <Popup>
                <div className="p-1 text-slate-900 font-sans text-xs">
                  <p className="font-bold">DEM Simulated Surge Contour</p>
                  <p className="text-slate-700 mt-0.5">
                    Surge Level: <strong>+{floodSurge.toFixed(1)} m</strong>
                  </p>
                  <p className="text-slate-700">
                    Estimated Reach: <strong>{(floodRadius / 1000).toFixed(1)} km</strong>
                  </p>
                </div>
              </Popup>
            </Circle>

            {/* Core Deep Channel Surge */}
            <Circle
              center={center}
              radius={floodRadius * 0.4}
              pathOptions={{
                color: getSurgeColor(floodSurge),
                fillColor: getSurgeColor(floodSurge),
                fillOpacity: 0.5,
                weight: 1.5,
              }}
            />
          </>
        )}

        {/* 5. Microclimate Heat, Rain, and Wind Halos around Query Location */}
        {pins.map((pin) => {
          if (activeWeatherLayer === "temp") {
            const isHighHeat = pin.temp > 35;
            return (
              <React.Fragment key={`temp-halo-${pin.id}`}>
                <Circle
                  center={[pin.lat, pin.lon]}
                  radius={5000}
                  pathOptions={{
                    color: isHighHeat ? "#f43f5e" : "#f59e0b",
                    fillColor: isHighHeat ? "#f43f5e" : "#f59e0b",
                    fillOpacity: 0.25,
                    weight: 1,
                  }}
                />
                <Circle
                  center={[pin.lat, pin.lon]}
                  radius={2500}
                  pathOptions={{
                    color: isHighHeat ? "#ef4444" : "#fbbf24",
                    fillColor: isHighHeat ? "#ef4444" : "#fbbf24",
                    fillOpacity: 0.4,
                    weight: 2,
                  }}
                />
              </React.Fragment>
            );
          }

          if (activeWeatherLayer === "rain") {
            const rainIntensity = Math.min(Math.max(pin.precip * 800, 1500), 6000);
            return (
              <Circle
                key={`rain-halo-${pin.id}`}
                center={[pin.lat, pin.lon]}
                radius={rainIntensity}
                pathOptions={{
                  color: pin.precip > 10 ? "#3b82f6" : "#06b6d4",
                  fillColor: pin.precip > 10 ? "#2563eb" : "#0891b2",
                  fillOpacity: pin.precip > 0 ? 0.35 : 0.12,
                  weight: 1.5,
                  dashArray: "4, 6",
                }}
              />
            );
          }

          if (activeWeatherLayer === "wind") {
            return (
              <Circle
                key={`wind-halo-${pin.id}`}
                center={[pin.lat, pin.lon]}
                radius={pin.wind * 120}
                pathOptions={{
                  color: "#14b8a6",
                  fillColor: "#0d9488",
                  fillOpacity: 0.22,
                  weight: 1.5,
                }}
              />
            );
          }

          return null;
        })}

        {/* 6. Dynamic Hazard Polygon and Perimeter Rings */}
        {pins.map((pin) => {
          const isRed = pin.alertLevel === "RED";
          const isOrange = pin.alertLevel === "ORANGE";

          return (
            <React.Fragment key={`overlay-${pin.id}`}>
              {/* Outer Inundation Buffer Zone */}
              <Circle
                center={[pin.lat, pin.lon]}
                radius={isRed ? 25000 : isOrange ? 16000 : 9000}
                pathOptions={{
                  color: alertColor,
                  fillColor: alertColor,
                  fillOpacity: 0.15,
                  weight: 2,
                  dashArray: "6, 8",
                }}
              />

              {/* Core Flooding / Storm Risk Polygon */}
              <Polygon
                positions={generateRiskPolygon(
                  pin.lat,
                  pin.lon,
                  isRed ? 0.16 : isOrange ? 0.11 : 0.06
                )}
                pathOptions={{
                  color: alertColor,
                  fillColor: alertColor,
                  fillOpacity: isRed ? 0.4 : 0.25,
                  weight: 2.5,
                }}
              >
                <Popup>
                  <div className="p-1 text-slate-900">
                    <p className="font-bold text-xs">{pin.city} Inundation Zone</p>
                    <p className="text-[11px] text-slate-700 mt-1">
                      IMD Warning: <strong>{pin.alertLevel}</strong>
                    </p>
                    <p className="text-[11px] text-slate-700">
                      Telemetry: <strong>{pin.precip} mm</strong> |{" "}
                      <strong>{pin.wind} km/h</strong>
                    </p>
                  </div>
                </Popup>
              </Polygon>

              {/* Observation Station Marker */}
              <Marker position={[pin.lat, pin.lon]}>
                <Popup>
                  <div className="p-1 text-slate-900">
                    <h3 className="font-bold text-sm">{pin.city}</h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Temperature: <strong>{pin.temp}°C</strong>
                    </p>
                    <p className="text-xs text-slate-600">
                      Precipitation: <strong>{pin.precip} mm</strong>
                    </p>
                    <p className="text-xs text-slate-600">
                      Wind: <strong>{pin.wind} km/h</strong>
                    </p>
                    <span
                      className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase"
                      style={{ backgroundColor: alertColor }}
                    >
                      {pin.alertLevel} STATUS
                    </span>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
}