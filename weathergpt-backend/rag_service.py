# weathergpt-backend/rag_service.py
from typing import List

# Knowledge corpus of standard MoES/IMD disaster advisories
DISASTER_BULLETINS = [
    {
        "keywords": ["flood", "drainage", "waterlogging", "rain", "paddy"],
        "content": "MoES Agro-Advisory: When rainfall exceeds 20mm/hr, clear all field excess run-off channels. Delay pesticide spray until 24 hours post-downpour.",
    },
    {
        "keywords": ["heat", "heatwave", "summer", "temperature", "sun"],
        "content": "MoES Heat Action Plan: For heatwave conditions (temperatures above 40°C), ensure shaded hydration points, adjust working shifts for outdoor workers, and mist poultry sheds.",
    },
    {
        "keywords": ["cyclone", "wind", "storm", "boat", "sea", "fisherman"],
        "content": "IMD Coastal Safety Protocol: Small vessel marine warnings are enforced when sustained wind speeds exceed 35 km/h. Coastal operations must remain within 5 nautical miles.",
    },
]

def search_advisories(query: str) -> List[str]:
    """
    Finds relevant MoES standard operating procedures based on user query keywords.
    """
    normalized_query = query.lower()
    matches = []
    
    for item in DISASTER_BULLETINS:
        if any(keyword in normalized_query for keyword in item["keywords"]):
            matches.append(item["content"])
            
    return matches