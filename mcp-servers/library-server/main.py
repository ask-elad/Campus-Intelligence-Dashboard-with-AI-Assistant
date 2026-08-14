import json
import time
from pathlib import Path
from typing import Any

import requests
from fastmcp import FastMCP

DATA_PATH = Path(__file__).resolve().parent / "data" / "library.json"
OPEN_LIBRARY_SEARCH_URL = "https://openlibrary.org/search.json"
CACHE_TTL_SECONDS = 5 * 60  # 5 minutes

mcp = FastMCP("library-mcp-server")

# In-memory cache: normalized query string -> (cached_at_timestamp, result_dict)
_book_search_cache: dict[str, tuple[float, dict[str, Any]]] = {}


def _load_library_info() -> dict[str, Any]:
    with DATA_PATH.open("r", encoding="utf-8") as f:
        return json.load(f)


@mcp.tool
def get_library_info() -> dict[str, Any]:
    """Get static information about the Mahatma Gandhi Central Library (MGCL)
    at IIT Roorkee: opening hours, building facts, floors, and contact details.
    This information changes rarely, so it is served from a local file, not fetched live."""
    return _load_library_info()


@mcp.tool
def search_books(query: str) -> dict[str, Any]:
    """Search a live, general book catalog (Open Library) by title, author, or subject
    keyword. Returns up to 5 matching books with title, author(s), first publish year,
    and a cover image URL. A book appearing in these results means it exists in a public
    catalog — this does not confirm physical availability at any specific library."""
    normalized_query = query.strip().lower()

    cached = _book_search_cache.get(normalized_query)
    if cached is not None:
        cached_at, cached_result = cached
        if time.time() - cached_at < CACHE_TTL_SECONDS:
            return {**cached_result, "fromCache": True}

    try:
        response = requests.get(
            OPEN_LIBRARY_SEARCH_URL,
            params={
                "q": query,
                "limit": 5,
                "fields": "key,title,author_name,first_publish_year,cover_i",
            },
            headers={"User-Agent": "replaceCampus-library-mcp/1.0 (learning project)"},
            timeout=10,
        )
        response.raise_for_status()
    except requests.RequestException as e:
        return {"error": f"Failed to reach Library: {e}", "query": query}

    data = response.json()
    docs = data.get("docs", [])

    results = []
    for doc in docs:
        cover_id = doc.get("cover_i")
        results.append(
            {
                "title": doc.get("title"),
                "authors": doc.get("author_name", []),
                "firstPublishYear": doc.get("first_publish_year"),
                "coverImageUrl": (
                    f"https://covers.openlibrary.org/b/id/{cover_id}-M.jpg" if cover_id else None
                ),
            }
        )

    result = {
        "query": query,
        "totalFound": data.get("numFound", 0),
        "results": results,
    }

    _book_search_cache[normalized_query] = (time.time(), result)
    return {**result, "fromCache": False}


if __name__ == "__main__":
    import os

    mcp.run(
        transport="http",
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5005)),
        path="/mcp",
    )