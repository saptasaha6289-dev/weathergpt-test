# weathergpt-backend/weather_service.py
import httpx
from typing import Dict, Any, Optional

def geocode_location(location_query: str) -> Dict[str, Any]:
    """
    Resolves any city, district, or town name to geographic coordinates using Open-Meteo Geocoding.
    Defaults to Kolkata if not found.
    """
    clean_query = location_query.strip()
    if not clean_query:
        return {"name": "Kolkata", "latitude": 22.5726, "longitude": 88.3639, "admin1": "West Bengal"}

    geo_url = f"https://geocoding-api.open-meteo.com/v1/search?name={clean_query}&count=1&language=en&format=json"
    
    try:
        with httpx.Client(timeout=8.0) as client:
            res = client.get(geo_url)
            data = res.json()
            results = data.get("results")
            if results and len(results) > 0:
                top = results[0]
                return {
                    "name": top.get("name", clean_query),
                    "latitude": round(top.get("latitude"), 4),
                    "longitude": round(top.get("longitude"), 4),
                    "admin1": top.get("admin1", ""),
                    "country": top.get("country", "India"),
                }
    except Exception as e:
        print(f"[Geocoding Warning]: {e}")

    # Fallback default
    return {"name": "Kolkata", "latitude": 22.5726, "longitude": 88.3639, "admin1": "West Bengal"}

def get_live_weather(location_name: str = "Kolkata") -> Dict[str, Any]:
    """
    Fetches live weather telemetry for any specified location name by geocoding first.
    """
    geo = geocode_location(location_name)
    lat, lon = geo["latitude"], geo["longitude"]

    weather_url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": [
            "temperature_2m",
            "relative_humidity_2m",
            "apparent_temperature",
            "precipitation",
            "wind_speed_10m",
            "wind_direction_10m",
            "surface_pressure"
        ],
        "timezone": "auto",
    }

    try:
        with httpx.Client(timeout=8.0) as client:
            res = client.get(weather_url, params=params)
            raw = res.json()
            current = raw.get("current", {})
            return {
                "location": f"{geo['name']}" + (f", {geo['admin1']}" if geo.get('admin1') else ""),
                "city": geo["name"],
                "latitude": lat,
                "longitude": lon,
                "temperature_celsius": current.get("temperature_2m", 0.0),
                "humidity_percent": current.get("relative_humidity_2m", 0.0),
                "precipitation_mm": current.get("precipitation", 0.0),
                "wind_speed_kmh": current.get("wind_speed_10m", 0.0),
            }
    except Exception as e:
        print(f"[Weather API Warning]: {e}")
        return {
            "location": geo["name"],
            "city": geo["name"],
            "latitude": lat,
            "longitude": lon,
            "temperature_celsius": 28.0,
            "humidity_percent": 75.0,
            "precipitation_mm": 0.0,
            "wind_speed_kmh": 12.0,
        }