# weathergpt-backend/agent_service.py
import os
import re
from dotenv import load_dotenv
from weather_service import get_live_weather
from advisory_engine import evaluate_disaster_risk
from rag_service import search_advisories

load_dotenv()

PERSONA_INSTRUCTIONS = {
    "kisan": """
    Persona: Kisan / Agricultural Advisor (MoES Gramin Krishi Mausam Sewa)
    Focus Exclusively On:
    - Soil moisture, waterlogging risk in fields, and standing crop protection.
    - Explicit sowing, weeding, and harvesting windows.
    - Fertilizer, urea, and pesticide scheduling (e.g., hold spraying if rain > 2.5mm or wind > 15km/h).
    - Livestock and poultry thermal protection if heat/humidity is high.
    Tone: Direct, practical, farmer-accessible advisory.
    """,
    "maritime": """
    Persona: Maritime & Fisheries Warning Officer (INCOIS / IMD Marine Dispatch)
    Focus Exclusively On:
    - Offshore wind vectors, gust hazards, and estimated wave swell/rough sea conditions.
    - Direct advisories for artisanal boats, motorized craft, and deep-sea trawlers.
    - Port Danger Signals (e.g., Distant Cautionary Signal I/II, Local Warning Signal III/IV, Danger Signal V+).
    - Coastal safety zones (distance limits in nautical miles).
    Tone: Critical maritime navigation bulletin style.
    """,
    "urban": """
    Persona: Urban Disaster & Commuter Alert Officer (NDMA / Municipal Incident Command)
    Focus Exclusively On:
    - Arterial road waterlogging, underpass flooding risks, and storm drain capacity.
    - Public transit and rail disruption likelihood.
    - Thunderstorm, lightning safety protocols (seek safe shelter, avoid open trees/poles).
    - Urban Heat Island / wet-bulb discomfort index for outdoor workers.
    Tone: Clear urban safety dispatch with immediate travel precautions.
    """,
}

def extract_target_city(text: str) -> str:
    match = re.search(r'\b(?:in|at|for|around|near|of)\s+([A-Z][a-z]+|[a-z]{3,})\b', text, re.IGNORECASE)
    if match:
        potential = match.group(1).strip()
        if potential.lower() not in ["the", "today", "tomorrow", "this", "danger", "hazard", "flood", "rain", "kisan", "urban", "marine"]:
            return potential.capitalize()

    known_cities = [
        "mumbai", "delhi", "kolkata", "chennai", "bengaluru", "bangalore",
        "hyderabad", "ahmedabad", "pune", "surat", "jaipur", "lucknow",
        "kanpur", "nagpur", "indore", "patna", "bhopal", "visakhapatnam",
        "vadodara", "ludhiana", "agra", "nashik", "varanasi", "srinagar",
        "guwahati", "chandigarh", "bhubaneswar", "cuttack", "puri", "kochi"
    ]
    for token in re.findall(r"\b[a-zA-Z]+\b", text.lower()):
        if token in known_cities:
            return token.capitalize()

    return "Kolkata"

async def run_weather_agent(user_prompt: str, persona: str = "kisan") -> dict:
    target_city = extract_target_city(user_prompt)
    weather_data = get_live_weather(target_city)

    fake_telemetry = {
        "current": {
            "temperature_2m": weather_data["temperature_celsius"],
            "precipitation": weather_data["precipitation_mm"],
            "wind_speed_10m": weather_data["wind_speed_kmh"],
            "relative_humidity_2m": weather_data["humidity_percent"],
        }
    }
    risk_assessment = evaluate_disaster_risk(fake_telemetry)
    matched_sops = search_advisories(user_prompt)
    sop_context = "\n".join(f"- {s}" for s in matched_sops) if matched_sops else "- Standard MoES hazard guidelines apply."

    persona_prompt = PERSONA_INSTRUCTIONS.get(persona, PERSONA_INSTRUCTIONS["kisan"])

    telemetry_summary = (
        f"Location: {weather_data['location']} ({weather_data['latitude']}°N, {weather_data['longitude']}°E)\n"
        f"Temperature: {weather_data['temperature_celsius']}°C\n"
        f"Relative Humidity: {weather_data['humidity_percent']}%\n"
        f"Precipitation: {weather_data['precipitation_mm']} mm\n"
        f"Wind Speed: {weather_data['wind_speed_kmh']} km/h\n"
        f"Hazard Rating: {risk_assessment['alert_level']}\n"
    )

    full_prompt = (
        f"System Role:\n{persona_prompt}\n\n"
        f"User Query: {user_prompt}\n\n"
        f"[Live Geocoded Meteorological Feed]:\n{telemetry_summary}\n"
        f"[Official MoES Guidelines Knowledge]:\n{sop_context}\n\n"
        f"Format your response specifically for the {persona.upper()} audience. Highlight operational instructions clearly."
    )

    api_key = os.getenv("GEMINI_API_KEY")
    reply_text = None

    if api_key:
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=api_key)
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=full_prompt,
                config=types.GenerateContentConfig(temperature=0.3),
            )
            if response.text:
                reply_text = response.text
        except Exception as err:
            print(f"[Gemini API Notice]: {err}")

    # Heuristic fallback if LLM is unavailable
    if not reply_text:
        if persona == "kisan":
            sector_advice = (
                f"• Field Irrigation: {'Hold irrigation due to active precipitation' if weather_data['precipitation_mm'] > 0 else 'Nominal soil moisture conditions'}.\n"
                f"• Spraying Window: {'Unfavorable - wind speed exceeds 15 km/h' if weather_data['wind_speed_kmh'] > 15 else 'Favorable spraying conditions'}.\n"
                f"• Standing Crop Advisory: Check bunds and drainage outlets in low-lying plots."
            )
        elif persona == "maritime":
            danger_signal = "Local Cautionary Signal III" if weather_data['wind_speed_kmh'] > 30 else "Signal I (Nominal)"
            sector_advice = (
                f"• Port Danger Signal: {danger_signal}\n"
                f"• Coastal Navigation: {'Rough sea state advisory - keep small craft ashore' if weather_data['wind_speed_kmh'] > 25 else 'Safe for coastal operations within 10 nautical miles'}.\n"
                f"• Wind Conditions: {weather_data['wind_speed_kmh']} km/h off-shore gusts."
            )
        else: # urban
            transit_risk = "High probability of arterial waterlogging" if weather_data['precipitation_mm'] > 5 else "Nominal transit conditions"
            sector_advice = (
                f"• Commuter Transit: {transit_risk}.\n"
                f"• Drainage & Underpasses: Exercise caution in low-lying subways and road corridors.\n"
                f"• Heat & Lightning Risk: {'Seek enclosed shelter immediately' if risk_assessment['alert_level'] != 'GREEN' else 'No acute weather disruption flagged'}."
            )

        reply_text = (
            f"**[{persona.upper()} ADVISORY] Live Feed: {weather_data['location']}**\n"
            f"• Temp: {weather_data['temperature_celsius']}°C | Wind: {weather_data['wind_speed_kmh']} km/h | Rain: {weather_data['precipitation_mm']} mm\n\n"
            f"{sector_advice}\n\n"
            f"**MoES Standard Guidelines:**\n{sop_context}"
        )

    tag_titles = {
        "kisan": "MoES Gramin Krishi Mausam Sewa",
        "maritime": "INCOIS / IMD Marine Warning Hub",
        "urban": "NDMA / Municipal Incident Command",
    }

    return {
        "reply": reply_text,
        "source_tag": f"{tag_titles.get(persona, 'MoES Grounded')} • {weather_data['city']}",
        "alert_level": risk_assessment["alert_level"],
        "telemetry": {
            "location": weather_data["location"],
            "city": weather_data["city"],
            "latitude": weather_data["latitude"],
            "longitude": weather_data["longitude"],
            "temp": weather_data["temperature_celsius"],
            "precip": weather_data["precipitation_mm"],
            "wind": weather_data["wind_speed_kmh"],
            "humidity": weather_data["humidity_percent"],
        },
    }