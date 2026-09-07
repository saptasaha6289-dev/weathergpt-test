import traceback
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from weather_service import get_live_weather
from advisory_engine import evaluate_disaster_risk
from agent_service import run_weather_agent

app = FastAPI(title="WeatherGPT MoES Agent Backend", version="1.0.0")

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    latitude: float = 22.5726
    longitude: float = 88.3639
    persona: str = "kisan"  # "kisan" | "maritime" | "urban"

@app.get("/api/health")
async def health_check():
    return {"status": "operational", "system": "WeatherGPT Multi-Persona Orchestrator"}

@app.get("/api/telemetry")
async def get_telemetry(location: str = "Kolkata"):
    raw_data = get_live_weather(location)
    fake_telemetry_format = {
        "current": {
            "temperature_2m": raw_data["temperature_celsius"],
            "precipitation": raw_data["precipitation_mm"],
            "wind_speed_10m": raw_data["wind_speed_kmh"],
            "relative_humidity_2m": raw_data["humidity_percent"],
        }
    }
    assessment = evaluate_disaster_risk(fake_telemetry_format)
    return {"telemetry": raw_data, "assessment": assessment}

@app.post("/api/chat")
async def handle_chat(payload: ChatRequest):
    try:
        agent_result = await run_weather_agent(payload.message, payload.persona)
        return {
            "reply": agent_result["reply"],
            "source_tag": agent_result["source_tag"],
            "alert_level": agent_result["alert_level"],
            "telemetry": agent_result["telemetry"],
        }
    except Exception as exc:
        print("\n--- DETAILED BACKEND ERROR TRACEBACK ---")
        traceback.print_exc()
        print("----------------------------------------\n")
        raise HTTPException(status_code=500, detail=str(exc))