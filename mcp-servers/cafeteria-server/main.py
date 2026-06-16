"""
Cafeteria MCP Server
Serves campus bhawan (hostel mess) menu and campus eatery information.
Transport: SSE via FastMCP
Port: 5002
"""

import json
import os
from datetime import datetime
from pathlib import Path
from fastmcp import FastMCP

# --- Load data ---
DATA_FILE = Path(__file__).parent / "data" / "cafeteria.json"
with open(DATA_FILE, "r", encoding="utf-8") as f:
    CAFETERIA_DATA = json.load(f)

PORT = int(os.environ.get("PORT", 5002))

# Standard mess timings
MESS_TIMINGS = {
    "breakfast": "7:30 AM – 9:30 AM",
    "lunch": "12:30 PM – 2:30 PM",
    "snacks": "5:00 PM – 6:00 PM",
    "dinner": "7:30 PM – 9:30 PM"
}

def get_today_day_name() -> str:
    """Return the current day name (matches the weeklyMenu keys)."""
    return datetime.now().strftime("%A")  # e.g., "Monday"

def parse_meal_items(meal_string: str) -> list[str]:
    """Split a comma-separated meal string into a clean list."""
    if not meal_string:
        return []
    return [item.strip() for item in meal_string.split(",") if item.strip()]

# --- FastMCP Server ---
mcp = FastMCP(name="cafeteria-mcp-server")

@mcp.tool()
def get_today_menu() -> str:
    """
    Get the complete mess menu for today (breakfast, lunch, and dinner).
    Also includes standard daily items available at every meal.
    """
    day = get_today_day_name()
    day_menu = CAFETERIA_DATA["weeklyMenu"].get(day, {})
    daily = CAFETERIA_DATA.get("dailyItems", {})

    result = {
        "day": day,
        "menu": {
            "breakfast": {
                "specialItems": parse_meal_items(day_menu.get("breakfast", "")),
                "dailyItems": parse_meal_items(daily.get("breakfast", ""))
            },
            "lunch": {
                "specialItems": parse_meal_items(day_menu.get("lunch", "")),
                "dailyItems": parse_meal_items(daily.get("lunch", ""))
            },
            "dinner": {
                "specialItems": parse_meal_items(day_menu.get("dinner", "")),
                "dailyItems": parse_meal_items(daily.get("dinner", ""))
            }
        },
        "timings": MESS_TIMINGS,
        "bhawans": CAFETERIA_DATA.get("bhawans", [])
    }
    return json.dumps(result)


@mcp.tool()
def get_menu_by_day(day: str) -> str:
    """
    Get the mess menu for a specific day of the week.
    
    Args:
        day: Day name (e.g., Monday, Tuesday, ..., Sunday)
    """
    # Normalize capitalization
    day_normalized = day.strip().capitalize()
    valid_days = list(CAFETERIA_DATA["weeklyMenu"].keys())

    if day_normalized not in valid_days:
        return json.dumps({
            "error": f"Invalid day '{day}'. Valid days are: {', '.join(valid_days)}"
        })

    day_menu = CAFETERIA_DATA["weeklyMenu"][day_normalized]
    daily = CAFETERIA_DATA.get("dailyItems", {})

    result = {
        "day": day_normalized,
        "menu": {
            "breakfast": {
                "specialItems": parse_meal_items(day_menu.get("breakfast", "")),
                "dailyItems": parse_meal_items(daily.get("breakfast", ""))
            },
            "lunch": {
                "specialItems": parse_meal_items(day_menu.get("lunch", "")),
                "dailyItems": parse_meal_items(daily.get("lunch", ""))
            },
            "dinner": {
                "specialItems": parse_meal_items(day_menu.get("dinner", "")),
                "dailyItems": parse_meal_items(daily.get("dinner", ""))
            }
        },
        "timings": MESS_TIMINGS
    }
    return json.dumps(result)


@mcp.tool()
def get_weekly_menu() -> str:
    """
    Get the complete weekly mess menu for all 7 days.
    Returns breakfast, lunch, and dinner for each day.
    """
    daily = CAFETERIA_DATA.get("dailyItems", {})
    weekly = {}

    for day, meals in CAFETERIA_DATA["weeklyMenu"].items():
        weekly[day] = {
            "breakfast": {
                "specialItems": parse_meal_items(meals.get("breakfast", "")),
                "dailyItems": parse_meal_items(daily.get("breakfast", ""))
            },
            "lunch": {
                "specialItems": parse_meal_items(meals.get("lunch", "")),
                "dailyItems": parse_meal_items(daily.get("lunch", ""))
            },
            "dinner": {
                "specialItems": parse_meal_items(meals.get("dinner", "")),
                "dailyItems": parse_meal_items(daily.get("dinner", ""))
            }
        }

    return json.dumps({
        "weeklyMenu": weekly,
        "timings": MESS_TIMINGS,
        "bhawans": CAFETERIA_DATA.get("bhawans", [])
    })


@mcp.tool()
def get_eateries() -> str:
    """
    Get a list of campus eateries and off-campus food spots near IIT Roorkee,
    including their type, location, popular items, price rating, and timings.
    """
    return json.dumps({
        "totalEateries": len(CAFETERIA_DATA.get("eateries", [])),
        "eateries": CAFETERIA_DATA.get("eateries", [])
    })


@mcp.tool()
def get_mess_timings() -> str:
    """
    Get the standard mess (cafeteria) meal timings for breakfast, lunch, snacks, and dinner.
    """
    return json.dumps({
        "timings": MESS_TIMINGS,
        "note": "Timings may vary on holidays and special occasions."
    })


@mcp.tool()
def get_bhawan_list() -> str:
    """
    Get the list of all student hostels (bhawans) at IIT Roorkee that share the common mess menu.
    """
    return json.dumps({
        "bhawans": CAFETERIA_DATA.get("bhawans", []),
        "menuNote": "All bhawans generally follow the same central weekly menu."
    })


if __name__ == "__main__":
    print(f"Cafeteria MCP Server starting on port {PORT}...")
    mcp.run(transport="sse", host="0.0.0.0", port=PORT)
