# weathergpt-backend/advisory_engine.py
from typing import Dict, Any, List

def evaluate_disaster_risk(telemetry: Dict[str, Any]) -> Dict[str, Any]:
    """
    Parses telemetry and generates domain-specific risk alerts and sector advisories.
    """
    current = telemetry.get("current", {})
    temp = current.get("temperature_2m", 0.0)
    precip = current.get("precipitation", 0.0)
    wind = current.get("wind_speed_10m", 0.0)
    humidity = current.get("relative_humidity_2m", 0.0)

    advisories: List[str] = []
    alert_level = "GREEN"  # GREEN, YELLOW, ORANGE, RED

    # Precipitation / Flood logic
    if precip >= 15.0:
        alert_level = "ORANGE"
        advisories.append("Flash Flood Watch: Heavy localized rainfall detected. Clear drainage systems and avoid arterial underpasses.")
    elif precip > 2.5:
        alert_level = "YELLOW"
        advisories.append("Precipitation Alert: Moderate rain ongoing. Farmers should delay open fertilizer applications.")

    # High wind / Cyclone logic
    if wind >= 45.0:
        alert_level = "RED"
        advisories.append("Severe Gale Warning: Secure rooftop structures and halt maritime coastal operations.")
    elif wind >= 25.0 and alert_level != "RED":
        alert_level = "YELLOW"
        advisories.append("Breezy conditions: Wind gusts may affect light standing crops.")

    # Heatwave & Wet-Bulb stress logic
    if temp >= 40.0:
        alert_level = "RED"
        advisories.append("Heatwave Warning: Critical heat indices. Avoid outdoor labor between 12:00 PM and 3:00 PM.")
    elif temp >= 35.0 and humidity > 70.0:
        if alert_level == "GREEN":
            alert_level = "YELLOW"
        advisories.append("High Heat Index: Elevated heat stress risk due to ambient humidity.")

    return {
        "alert_level": alert_level,
        "advisories": advisories,
        "temperature": temp,
        "precipitation": precip,
        "wind_speed": wind,
        "humidity": humidity,
    }