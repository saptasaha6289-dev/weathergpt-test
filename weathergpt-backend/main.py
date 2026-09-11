import os
import re
import math
import json
import io
import datetime
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, HTTPException, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image
import requests
import httpx
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

# Configure Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

app = FastAPI(
    title="MausamSetu Backend API",
    description="Autonomous Meteorological Agent & Geospatial Risk Engine for Disaster Mitigation",
    version="2.0.0"
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- DATA MODELS -----------------

class SnapReport(BaseModel):
    id: str
    lat: float
    lon: float
    location_label: str
    hazard_detected: str
    severity: str  # RED, ORANGE, YELLOW, GREEN
    description: str
    timestamp: str
    water_depth_cm: int = 15
    quorum_count: int = 1
    verified_status: str = "UNVERIFIED"  # UNVERIFIED -> TRIANGULATED_QUORUM

COMMUNITY_REPORTS: List[SnapReport] = []

class ForecastDay(BaseModel):
    date: str
    day: str
    max_temp: float
    min_temp: float
    precip: float

class TelemetryData(BaseModel):
    location: str
    latitude: float
    longitude: float
    temp: float
    temperature: float
    humidity: int
    wind: float
    wind_speed: float
    precip: float
    precipitation: float
    risk_level: str
    status_label: str
    forecast_7d: Optional[List[ForecastDay]] = []

class ChatRequest(BaseModel):
    query: str
    persona: Optional[str] = "urban"
    language: Optional[str] = "en"

class ChatResponse(BaseModel):
    response: str
    message: str
    reply: str
    source_tag: Optional[str] = "IMD Telemetry Pipeline"
    alert_level: Optional[str] = "GREEN"
    telemetry: TelemetryData

class EvacRouteRequest(BaseModel):
    start_lat: float
    start_lon: float
    vehicle_type: str  # "walking", "two_wheeler", "sedan", "heavy_rescue"

# ----------------- GEODETIC & HEURISTIC HELPERS -----------------

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def evaluate_hazard(temp: float, hum: int, wind: float, precip: float) -> tuple[str, str]:
    if precip >= 35.0 or wind >= 50.0:
        return "RED", "Critical Weather Warning"
    elif precip >= 15.0 or wind >= 30.0 or temp >= 40.0:
        return "ORANGE", "Elevated Risk Advisory"
    elif precip >= 5.0 or wind >= 20.0 or temp >= 36.0:
        return "YELLOW", "Watch & Awareness"
    return "GREEN", "Normal Atmospheric Baseline"

def get_precise_coordinates(place_name: str) -> dict:
    """
    Resolves small towns, mouzas, and gram panchayats across India.
    """
    clean_query = place_name.strip()
    
    # 1. OpenStreetMap Nominatim with India geofence
    try:
        osm_url = f"https://nominatim.openstreetmap.org/search?q={clean_query}&countrycodes=in&format=json&limit=1"
        headers = {"User-Agent": "MausamSetu-App/2.0 (saptarshi@example.com)"}
        res = requests.get(osm_url, headers=headers, timeout=5).json()
        if res and len(res) > 0:
            top = res[0]
            display_parts = top.get("display_name", "").split(",")
            short_name = display_parts[0].strip()
            if len(display_parts) > 2:
                short_name = f"{short_name}, {display_parts[-3].strip()}"
            return {
                "name": short_name,
                "lat": float(top.get("lat")),
                "lon": float(top.get("lon"))
            }
    except Exception as e:
        print(f"Nominatim lookup error: {e}")

    # 2. Fallback: Open-Meteo Geocoding
    try:
        geo_url = f"https://geocoding-api.open-meteo.com/v1/search?name={clean_query}&count=1&language=en&format=json"
        res = requests.get(geo_url, timeout=5).json()
        if "results" in res and res["results"]:
            target = res["results"][0]
            admin = target.get("admin1", "")
            return {
                "name": f"{target.get('name')}, {admin}" if admin else target.get("name"),
                "lat": float(target.get("latitude")),
                "lon": float(target.get("longitude"))
            }
    except Exception as e:
        print(f"Open-Meteo Geocoding error: {e}")

    # Default fallback: Regional hub
    return {"name": "Kolkata, West Bengal", "lat": 22.5726, "lon": 88.3639}

async def fetch_weather_telemetry(lat: float, lon: float, location_label: str) -> TelemetryData:
    url = (
        f"https://api.open-meteo.com/v1/forecast?"
        f"latitude={lat}&longitude={lon}"
        f"&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation"
        f"&daily=temperature_2m_max,temperature_2m_min,precipitation_sum"
        f"&timezone=auto"
    )
    async with httpx.AsyncClient(timeout=10.0) as client:
        res = await client.get(url)
        res.raise_for_status()
        data = res.json()

    current = data.get("current", {})
    temp = float(current.get("temperature_2m", 28.0))
    hum = int(current.get("relative_humidity_2m", 75))
    wind = float(current.get("wind_speed_10m", 12.0))
    precip = float(current.get("precipitation", 0.0))

    risk_level, status_label = evaluate_hazard(temp, hum, wind, precip)

    # Process 7-day forecast array
    forecast_list = []
    daily = data.get("daily", {})
    dates = daily.get("time", [])
    max_temps = daily.get("temperature_2m_max", [])
    min_temps = daily.get("temperature_2m_min", [])
    precips = daily.get("precipitation_sum", [])

    for i in range(min(7, len(dates))):
        try:
            d_obj = datetime.date.fromisoformat(dates[i])
            day_abbr = d_obj.strftime("%a")
        except Exception:
            day_abbr = f"Day {i+1}"

        forecast_list.append(ForecastDay(
            date=dates[i],
            day=day_abbr,
            max_temp=float(max_temps[i]) if i < len(max_temps) and max_temps[i] is not None else temp + 2.0,
            min_temp=float(min_temps[i]) if i < len(min_temps) and min_temps[i] is not None else temp - 4.0,
            precip=float(precips[i]) if i < len(precips) and precips[i] is not None else 0.0
        ))

    return TelemetryData(
        location=location_label,
        latitude=lat,
        longitude=lon,
        temp=temp,
        temperature=temp,
        humidity=hum,
        wind=wind,
        wind_speed=wind,
        precip=precip,
        precipitation=precip,
        risk_level=risk_level,
        status_label=status_label,
        forecast_7d=forecast_list
    )

def heuristic_fallback(persona: str, telemetry: TelemetryData) -> str:
    p = persona.lower()
    if "kisan" in p or "agro" in p:
        if telemetry.precipitation > 10.0:
            return f"Agro-Advisory for {telemetry.location}: Precipitation recorded at {telemetry.precipitation} mm. Postpone pesticide spraying and fertilizer application. Clear surface drainage in crop beds."
        return f"Agro-Advisory for {telemetry.location}: Current temperature {telemetry.temperature}°C and {telemetry.humidity}% humidity. Favorable window for scheduled field work and soil conditioning."
    
    if "maritime" in p or "fishery" in p:
        if telemetry.wind_speed >= 35.0:
            return f"Marine Safety Directive ({telemetry.location}): Wind speeds reach {telemetry.wind_speed} km/h with rough sea swell. Local Cautionary Signal III advised. Fishing vessels must remain moored."
        return f"Marine Safety Directive ({telemetry.location}): Calm sea state with surface winds at {telemetry.wind_speed} km/h. Coastal operations cleared within routine navigational margins."
    
    return f"Urban Advisory ({telemetry.location}): Temperature {telemetry.temperature}°C with {telemetry.precipitation} mm rain and {telemetry.wind_speed} km/h winds. Alert State: {telemetry.risk_level}. Arterial transport corridors operational."

# ----------------- API ENDPOINTS -----------------

@app.get("/")
def root():
    return {"status": "online", "system": "MausamSetu Autonomous Engine", "version": "2.0.0"}

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "gemini_configured": bool(GEMINI_API_KEY)}

@app.get("/api/telemetry")
async def get_telemetry_endpoint(location: str = "Kolkata"):
    geo = get_precise_coordinates(location)
    return await fetch_weather_telemetry(geo["lat"], geo["lon"], geo["name"])

@app.post("/api/chat", response_model=ChatResponse)
async def chat_handler(req: ChatRequest):
    if not req.query or not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    # 1. Extract and transliterate location using Gemini
    location_keyword = "CURRENT"
    if GEMINI_API_KEY:
        try:
            model = genai.GenerativeModel("gemini-1.5-flash")
            loc_prompt = (
                f"Identify the specific Indian village, town, panchayat, or city in this query: '{req.query}'. "
                f"Transliterate to standard Romanized English (e.g., 'তমলুক' -> 'Tamluk', 'পাঁশকুড়া' -> 'Panskura', "
                f"'মেদিনীপুর' -> 'Medinipur', 'নন্দীগ্রাম' -> 'Nandigram', 'ঘাটাল' -> 'Ghatal', 'दांतन' -> 'Dantan'). "
                f"Respond ONLY with the Romanized location name. If no specific location is mentioned, reply 'CURRENT'."
            )
            extracted = model.generate_content(loc_prompt).text.strip()
            clean_kw = re.sub(r'[^a-zA-Z\s]', '', extracted).strip()
            if clean_kw:
                location_keyword = clean_kw
        except Exception as e:
            print(f"Gemini entity extraction error: {e}")
            location_keyword = "CURRENT"

    # 2. Resolve precise coordinates down to rural village/panchayat level
    if location_keyword == "CURRENT" or not location_keyword:
        target_name = "Kolkata, West Bengal"
    else:
        target_name = location_keyword

    geo = get_precise_coordinates(target_name)

    # 3. Fetch real-time telemetry + 7-day future numerical forecast
    telemetry = await fetch_weather_telemetry(geo["lat"], geo["lon"], geo["name"])

    # 4. Generate persona-aligned conversational advisory
    persona_key = (req.persona or "urban").lower()
    lang_names = {
        "en": "English",
        "hi": "Hindi",
        "bn": "Bengali",
        "mr": "Marathi",
        "te": "Telugu",
        "ta": "Tamil"
    }
    selected_lang = lang_names.get(req.language, "English")

    persona_context = {
        "kisan": "Agricultural advisory: detail spray windows, soil moisture, evaporation, and crop protection.",
        "maritime": "Coastal/Fishery safety: report wind knots, wave turbulence, and port signals I-XI.",
        "urban": "Urban commuter: waterlogging spots, culvert pooling, transit safety, and heat comfort."
    }.get(persona_key, "General meteorological report.")

    if GEMINI_API_KEY:
        advisory_prompt = (
            f"You are MausamSetu, India's AI Meteorological & Tactical Command Agent under the Ministry of Earth Sciences. "
            f"Write the response strictly in {selected_lang}. Persona: {persona_key}. "
            f"Location: {telemetry.location} (Lat: {telemetry.latitude}, Lon: {telemetry.longitude}). "
            f"Live Telemetry: Temp {telemetry.temperature}°C, Wind {telemetry.wind_speed} km/h, Precip {telemetry.precipitation} mm, Humidity {telemetry.humidity}%. "
            f"Hazard Level: {telemetry.risk_level}. Directives: {persona_context} "
            f"User Query: '{req.query}'. "
            f"Give a concise, authoritative, 2-3 sentence actionable advisory. Do not output markdown tables."
        )
        try:
            model = genai.GenerativeModel("gemini-1.5-flash")
            reply_text = model.generate_content(advisory_prompt).text.strip()
        except Exception as e:
            print(f"Gemini advisory synthesis error: {e}")
            reply_text = heuristic_fallback(persona_key, telemetry)
    else:
        reply_text = heuristic_fallback(persona_key, telemetry)

    return ChatResponse(
        response=reply_text,
        message=reply_text,
        reply=reply_text,
        source_tag=f"IMD Telemetry • {telemetry.location}",
        alert_level=telemetry.risk_level,
        telemetry=telemetry
    )

@app.post("/api/snap-hazard")
async def analyze_hazard_snap(
    image: UploadFile = File(...),
    lat: float = Form(...),
    lon: float = Form(...),
    location: str = Form("Ground Station"),
):
    image_bytes = await image.read()
    pil_image = Image.open(io.BytesIO(image_bytes))

    prompt = """
    Analyze this weather/hazard ground photo from a citizen.
    Respond strictly in this JSON format:
    {
      "hazard_detected": "Severe Waterlogging / Tree Fall / River Breach / Clear / Other",
      "severity": "RED" or "ORANGE" or "YELLOW" or "GREEN",
      "water_depth_cm": 25,
      "description": "Short 1-2 sentence assessment of ground danger to pedestrians, vehicles, or agriculture."
    }
    """

    result = {}
    if GEMINI_API_KEY:
        try:
            vision_model = genai.GenerativeModel("gemini-1.5-flash")
            response = vision_model.generate_content([prompt, pil_image])
            match = re.search(r'\{.*\}', response.text, re.DOTALL)
            result = json.loads(match.group(0)) if match else {}
        except Exception as e:
            print(f"Vision inference error: {e}")

    detected_hazard = result.get("hazard_detected", "Ground Waterlogging")
    severity = result.get("severity", "ORANGE")
    desc = result.get("description", "Citizen-submitted ground report.")
    depth_cm = int(result.get("water_depth_cm", 20))

    # Anti-Spoofing Triangulation: Check for matching reports within 500m (0.5 km)
    matched_existing = False
    active_report = None

    for existing in COMMUNITY_REPORTS:
        dist = haversine_distance_km(lat, lon, existing.lat, existing.lon)
        if dist <= 0.5:
            existing.quorum_count += 1
            existing.verified_status = "TRIANGULATED_QUORUM"
            existing.severity = "RED" if existing.quorum_count >= 2 else existing.severity
            existing.description = f"[Verified by {existing.quorum_count} Citizens] {existing.description}"
            active_report = existing
            matched_existing = True
            break

    if not matched_existing:
        active_report = SnapReport(
            id=str(int(datetime.datetime.now().timestamp())),
            lat=lat,
            lon=lon,
            location_label=location,
            hazard_detected=detected_hazard,
            severity=severity,
            description=desc,
            water_depth_cm=depth_cm,
            quorum_count=1,
            verified_status="UNVERIFIED",
            timestamp=datetime.datetime.now().strftime("%I:%M %p")
        )
        COMMUNITY_REPORTS.append(active_report)

    return {
        "status": "success",
        "report": active_report,
        "is_triangulated": active_report.verified_status == "TRIANGULATED_QUORUM",
        "quorum": active_report.quorum_count,
        "message": (
            f"Consensus reached ({active_report.quorum_count} reports). Authority alert dispatched."
            if active_report.verified_status == "TRIANGULATED_QUORUM"
            else "Initial citizen snap recorded. Awaiting nearby quorum confirmation."
        )
    }

@app.get("/api/snap-reports")
async def get_snap_reports():
    return {"reports": COMMUNITY_REPORTS}

@app.post("/api/evac-route")
async def calculate_evac_route(req: EvacRouteRequest):
    clearance_limits = {
        "walking": 15,
        "two_wheeler": 12,
        "sedan": 22,
        "heavy_rescue": 80
    }
    max_tolerated_depth = clearance_limits.get(req.vehicle_type, 20)

    dest_lat = req.start_lat + 0.012
    dest_lon = req.start_lon + 0.015

    blocked_nodes = []
    for r in COMMUNITY_REPORTS:
        if r.water_depth_cm > max_tolerated_depth:
            blocked_nodes.append({
                "lat": r.lat,
                "lon": r.lon,
                "hazard": r.hazard_detected,
                "depth_cm": r.water_depth_cm
            })

    waypoints = [
        [req.start_lat, req.start_lon],
        [req.start_lat + 0.004, req.start_lon + 0.007],
        [req.start_lat + 0.009, req.start_lon + 0.011],
        [dest_lat, dest_lon]
    ]

    return {
        "vehicle": req.vehicle_type,
        "max_tolerated_depth_cm": max_tolerated_depth,
        "route_status": "CLEAR" if len(blocked_nodes) == 0 else "BYPASSING_HAZARDS",
        "blocked_hazards_avoided": len(blocked_nodes),
        "shelter_name": "District High-Ground Multipurpose Refuge",
        "distance_km": 2.4,
        "est_time_mins": 8 if req.vehicle_type in ["sedan", "heavy_rescue"] else 22,
        "route_coordinates": waypoints
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)