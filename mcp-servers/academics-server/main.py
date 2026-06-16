"""
Academics MCP Server
Serves academic calendar, holidays, branch cutoffs, handbook rules, and academic policies.
Transport: SSE via FastMCP
Port: 5004
"""

import json
import os
from datetime import datetime
from pathlib import Path
from fastmcp import FastMCP

# --- Load data ---
DATA_FILE = Path(__file__).parent / "data" / "academics.json"
with open(DATA_FILE, "r", encoding="utf-8") as f:
    ACADEMICS_DATA = json.load(f)

PORT = int(os.environ.get("PORT", 5004))

def search_in_text(query: str, text: str) -> bool:
    return query.lower().strip() in text.lower()

# --- FastMCP Server ---
mcp = FastMCP(name="academics-mcp-server")

@mcp.tool()
def get_academic_calendar() -> str:
    """
    Get the full academic calendar for the current semester/year including
    key dates: registration, exams, orientation, convocation, etc.
    """
    today = datetime.now().date()
    calendar = ACADEMICS_DATA.get("academicCalendar", [])

    # Tag events as upcoming or past
    enriched = []
    for event in calendar:
        # Try to determine if event is upcoming
        date_str = event.get("date", "")
        is_upcoming = None
        if " to " in date_str:
            end_date_str = date_str.split(" to ")[-1].strip()
            try:
                end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date()
                is_upcoming = end_date >= today
            except ValueError:
                pass
        else:
            try:
                event_date = datetime.strptime(date_str.strip(), "%Y-%m-%d").date()
                is_upcoming = event_date >= today
            except ValueError:
                pass

        enriched.append({
            **event,
            "isUpcoming": is_upcoming
        })

    return json.dumps({
        "academicYear": "2026-27",
        "totalEvents": len(enriched),
        "events": enriched
    })


@mcp.tool()
def get_upcoming_academic_events(days_ahead: int = 60) -> str:
    """
    Get only the upcoming academic calendar events within the next N days.

    Args:
        days_ahead: Number of days to look ahead (default: 60)
    """
    today = datetime.now().date()
    cutoff = datetime.now().date().__class__.fromordinal(today.toordinal() + days_ahead)
    calendar = ACADEMICS_DATA.get("academicCalendar", [])

    upcoming = []
    for event in calendar:
        date_str = event.get("date", "")
        try:
            if " to " in date_str:
                start_str = date_str.split(" to ")[0].strip()
                event_start = datetime.strptime(start_str, "%Y-%m-%d").date()
            else:
                event_start = datetime.strptime(date_str.strip(), "%Y-%m-%d").date()

            if today <= event_start <= cutoff:
                upcoming.append(event)
        except ValueError:
            continue

    return json.dumps({
        "daysAhead": days_ahead,
        "upcomingEvents": len(upcoming),
        "events": upcoming
    })


@mcp.tool()
def get_holidays() -> str:
    """
    Get the list of all official gazetted holidays in the academic year at IIT Roorkee.
    """
    today = datetime.now().date()
    holidays = ACADEMICS_DATA.get("holidays", [])

    enriched = []
    for h in holidays:
        try:
            hdate = datetime.strptime(h["date"], "%Y-%m-%d").date()
            enriched.append({
                **h,
                "daysUntil": (hdate - today).days
            })
        except (ValueError, KeyError):
            enriched.append(h)

    # Sort by date
    enriched.sort(key=lambda x: x.get("date", ""))

    return json.dumps({
        "totalHolidays": len(enriched),
        "holidays": enriched
    })


@mcp.tool()
def get_branch_cutoffs() -> str:
    """
    Get the branch change CPI cutoffs for the 2024 cycle at IIT Roorkee.
    Shows the minimum CGPA required to change to each branch.
    """
    return json.dumps({
        "year": 2024,
        "description": "Minimum CPI (CGPA) required for branch change. Students must meet or exceed the cutoff for their desired branch.",
        "cutoffs": ACADEMICS_DATA.get("branchChangeCutoffs2024", []),
        "note": "Cutoffs may vary each year based on the pool of eligible students."
    })


@mcp.tool()
def search_handbook(query: str) -> str:
    """
    Search the campus academic handbook and informal rule book.
    Searches through official rules, academic policies, grading info, and attendance policies.

    Args:
        query: Search term or question keyword
    """
    results = []

    # Search inane rules
    for rule in ACADEMICS_DATA.get("inaneRules", []):
        if (search_in_text(query, rule.get("title", "")) or
                search_in_text(query, rule.get("description", ""))):
            results.append({
                "source": "Campus Rules",
                "type": "rule",
                "ruleId": rule.get("ruleId"),
                "title": rule.get("title"),
                "description": rule.get("description")
            })

    # Search acads101 fields
    acads = ACADEMICS_DATA.get("acads101", {})
    for key, value in acads.items():
        if search_in_text(query, str(value)) or search_in_text(query, key):
            results.append({
                "source": "Academics 101",
                "type": "policy",
                "topic": key,
                "content": value
            })

    # Search SPARK fellowship
    spark = ACADEMICS_DATA.get("sparkFellowship", {})
    for key, value in spark.items():
        if search_in_text(query, str(value)) or search_in_text(query, "spark"):
            results.append({
                "source": "SPARK Fellowship",
                "type": "program",
                "topic": key,
                "content": value
            })
            break  # avoid duplicate spark entries

    return json.dumps({
        "query": query,
        "totalResults": len(results),
        "results": results
    })


@mcp.tool()
def get_acads_basics() -> str:
    """
    Get core academic information: grading system, attendance/backs policy,
    extracurricular requirements (NCC/NSS/NSO), and how credits work at IIT Roorkee.
    """
    return json.dumps({
        "source": "Academics 101 – IIT Roorkee",
        "policies": ACADEMICS_DATA.get("acads101", {}),
        "sparkFellowship": ACADEMICS_DATA.get("sparkFellowship", {})
    })


@mcp.tool()
def get_all_rules() -> str:
    """
    Get all campus rules and informal guidelines — the 'inane rules' every student at IIT Roorkee should know.
    """
    return json.dumps({
        "totalRules": len(ACADEMICS_DATA.get("inaneRules", [])),
        "rules": ACADEMICS_DATA.get("inaneRules", [])
    })


if __name__ == "__main__":
    print(f"Academics MCP Server starting on port {PORT}...")
    mcp.run(transport="sse", host="0.0.0.0", port=PORT)
