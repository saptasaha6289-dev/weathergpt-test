import os
import re
from typing import Optional, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
from dotenv import load_dotenv
from google import genai

load_dotenv()

app = FastAPI(
    title="WeatherGPT Backend API",
    description="Autonomous Meteorological Agent & Geospatial Risk Engine for Disaster Mitigation",
    version="1.0.0"
)

# CORS setup for public access and Vercel frontend connectivity
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Gemini API Client Setup
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
gemini_client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

# Pre-defined Coordinate Fallbacks for Major Indian Hubs
FALLBACK_COORDINATES: Dict[str, Dict[str, float]] = {
    "kolkata": {"latitude": 22.5726, "longitude": 88.3639},
    "mumbai": {"latitude": 19.0760, "longitude": 72.8777},
    "delhi": {"latitude": 28.6139, "longitude": 77.2090},
    "chennai": {"latitude": 13.0827, "longitude": 80.2707},
    "bengaluru": {"latitude": 12.9716, "longitude": 77.5946},
    "bangalore": {"latitude": 12.9716, "longitude": 77.5946},
    "hyderabad": {"latitude": 17.3850, "longitude": 78.4867},
    "puri": {"latitude": 19.8135, "longitude": 85.8312},
    "kochi": {"latitude": 9.9312, "longitude": 76.2673},
    "patna": {"latitude": 25.5941, "longitude": 85.1376},
}

# Request & Response Schemas
class ChatRequest(BaseModel):
    query: str
    persona: Optional[str] = "urban"

class TelemetryData(BaseModel):
    location: str
    latitude: float
    longitude: float
    temperature: float
    humidity: int
    wind_speed: float
    precipitation: float
    risk_level: str
    status_label: str

class ChatResponse(BaseModel):
    response: str
    telemetry: TelemetryData

# Helper 1: Dynamic Geocoding
async def get_coordinates(location_name: str) -> Dict[str, Any]:
    norm_name = location_name.strip().lower()
    if norm_name in FALLBACK_COORDINATES:
        return {
            "name": location_name.title(),
            "latitude": FALLBACK_COORDINATES[norm_name]["latitude"],
            "longitude": FALLBACK_COORDINATES[norm_name]["longitude"]
        }

    geocoding_url = f"https://geocoding-api.open-meteo.com/v1/search?name={location_name}&count=1&language=en&format=json"
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(geocoding_url)
            if resp.status_code == 200:
                data = resp.json()
                if "results" in data and len(data["results"]) > 0:
                    result = data["results"][0]
                    return {
                        "name": result.get("name", location_name.title()),
                        "latitude": result["latitude"],
                        "longitude": result["longitude"]
                    }
    except Exception as e:
        print(f"Geocoding lookup failed: {e}")

    # Default to Kolkata if unresolvable
    return {"name": "Kolkata", "latitude": 22.5726, "longitude": 88.3639}

# Helper 2: Fetch Live Open-Meteo Telemetry
async def fetch_weather_telemetry(lat: float, lon: float, location_label: str) -> TelemetryData:
    weather_url = (
        f"https://api.open-meteo.com/v1/forecast?"
        f"latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m"
    )

    temp, hum, wind, precip = 28.0, 75, 12.0, 0.0

    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(weather_url)
            if resp.status_code == 200:
                curr = resp.json().get("current", {})
                temp = curr.get("temperature_2m", temp)
                hum = int(curr.get("relative_humidity_2m", hum))
                wind = curr.get("wind_speed_10m", wind)
                precip = curr.get("precipitation", precip)
    except Exception as e:
        print(f"Weather API fetch failed: {e}")

    # Deterministic MoES / IMD Hazard Grading
    if wind >= 50.0 or precip >= 35.0:
        risk_level = "red"
        status_label = "RED ALERT: Severe Squalls / Extreme Precipitation"
    elif wind >= 35.0 or precip >= 15.0:
        risk_level = "orange"
        status_label = "ORANGE ALERT: Moderate-to-Heavy Convective Activity"
    elif wind >= 25.0 or precip >= 5.0 or temp >= 38.0:
        risk_level = "yellow"
        status_label = "YELLOW WATCH: Elevated Weather Vigilance Advised"
    else:
        risk_level = "green"
        status_label = "GREEN STATUS: Atmospheric Parameters Nominal"

    return TelemetryData(
        location=location_label,
        latitude=lat,
        longitude=lon,
        temperature=temp,
        humidity=hum,
        wind_speed=wind,
        precipitation=precip,
        risk_level=risk_level,
        status_label=status_label
    )

# Helper 3: Entity Extraction from Natural Language
def extract_city(query: str) -> str:
    cleaned = query.strip()
    match = re.search(r'\b(?:in|at|around|for|near)\s+([a-zA-Z\s]+)', cleaned, re.IGNORECASE)
    if match:
        extracted = match.group(1).split()[0].strip()
        if len(extracted) > 2:
            return extracted

    words = re.findall(r'[a-zA-Z]+', cleaned)
    for w in words:
        if w.lower() in FALLBACK_COORDINATES:
            return w

    for w in reversed(words):
        if len(w) > 3 and w.lower() not in ["weather", "report", "today", "tomorrow", "rain", "please", "what", "tell"]:
            return w

    return "Kolkata"

# Helper 4: Heuristic Synthesizer Fallback
def heuristic_fallback(persona: str, telemetry: TelemetryData) -> str:
    p = persona.lower()
    if "kisan" in p or "agro" in p:
        if telemetry.precipitation > 10.0:
            return f"**Agro-Advisory for {telemetry.location}:** Rain recorded at {telemetry.precipitation} mm. Postpone irrigation and fertilizer application. Ensure immediate surface drainage in low-lying crop beds."
        return f"**Agro-Advisory for {telemetry.location}:** Current conditions ({telemetry.temperature}°C, {telemetry.humidity}% RH) favor scheduled fieldwork. Soil evaporation is steady."
    
    if "maritime" in p or "fishery" in p:
        if telemetry.wind_speed >= 35.0:
            return f"**Marine Safety Directive ({telemetry.location}):** Wind speeds reach {telemetry.wind_speed} km/h with high swells. Hoist Local Cautionary Signal III. Small fishing vessels and trawlers must remain docked."
        return f"**Marine Safety Directive ({telemetry.location}):** Calm sea state with surface winds at {telemetry.wind_speed} km/h. Coastal operations cleared within routine navigational margins."
    
    return f"**Urban Advisory ({telemetry.location}):** Temperature is {telemetry.temperature}°C with {telemetry.precipitation} mm precipitation and winds at {telemetry.wind_speed} km/h. {telemetry.status_label}. Transit routes remain operational."

# API Endpoints
@app.get("/")
def root():
    return {"status": "online", "system": "WeatherGPT Autonomous Engine", "version": "1.0.0"}

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "gemini_configured": gemini_client is not None}

@app.get("/api/telemetry")
async def get_telemetry(location: str = "Kolkata"):
    coords = await get_coordinates(location)
    return await fetch_weather_telemetry(coords["latitude"], coords["longitude"], coords["name"])

@app.post("/api/chat", response_model=ChatResponse)
async def chat_advisory(payload: ChatRequest):
    if not payload.query or not payload.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    target_city = extract_city(payload.query)
    coords = await get_coordinates(target_city)
    telemetry = await fetch_weather_telemetry(coords["latitude"], coords["longitude"], coords["name"])

    persona_key = (payload.persona or "urban").lower()

    if gemini_client:
        system_instruction = (
            "You are WeatherGPT, an authoritative AI meteorological advisor for the Ministry of Earth Sciences (MoES), India. "
            "Translate technical observations into actionable insights strictly matching the selected persona.\n"
            "- If persona is Kisan: Focus on field drainage, soil moisture, spraying windows, and crop safety.\n"
            "- If persona is Maritime: Focus on port danger signals (Signals I to XI), sea swell state, squalls, and trawler clearance.\n"
            "- If persona is Urban: Focus on underpass waterlogging, transit delays, lightning protection, and thermal comfort.\n"
            "STRICT RULE: Do not hallucinate or modify the numerical telemetry provided below. Keep your advice concise (3-4 bullet points max)."
        )

        user_content = (
            f"User Query: {payload.query}\n"
            f"Selected Persona: {persona_key}\n\n"
            f"LIVE VERIFIED TELEMETRY FOR {telemetry.location.upper()}:\n"
            f"- Temperature: {telemetry.temperature}°C\n"
            f"- Relative Humidity: {telemetry.humidity}%\n"
            f"- 10m Wind Speed: {telemetry.wind_speed} km/h\n"
            f"- Precipitation Rate: {telemetry.precipitation} mm\n"
            f"- Evaluated Alert State: {telemetry.status_label}\n"
        )

        try:
            response = gemini_client.models.generate_content(
                model="gemini-2.5-flash",
                contents=user_content,
                config={"system_instruction": system_instruction, "temperature": 0.25}
            )
            llm_text = response.text
        except Exception as e:
            print(f"Gemini API generation error: {e}")
            llm_text = heuristic_fallback(persona_key, telemetry)
    else:
        llm_text = heuristic_fallback(persona_key, telemetry)

    return ChatResponse(response=llm_text, telemetry=telemetry)

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)