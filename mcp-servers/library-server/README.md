# Library MCP Server

MCP server for IIT Roorkee's MGCL library — building info plus live book
search.

## Why it looks like this

Static facts (hours, floors, building details) are scraped once from
MGCL's own site (respecting `robots.txt` at scrape time) and committed as
JSON — this data barely changes, so re-fetching it live would be wasted
work.

Book search is genuinely live: it queries the public **Open Library API**
on every request with a short in-memory cache. MGCL's own OPAC catalog
disallows automated access via `robots.txt`, so using a public bot-
friendly book API is the honest alternative, not a workaround.

## Tools exposed

| Tool | Purpose |
|---|---|
| `get_library_info` | Static library info (hours, floors, services) |
| `search_books` | Live book search against Open Library |

## Run locally

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py     # :5005 by default
```

## Env vars

| Name | Default | Purpose |
|---|---|---|
| `PORT` | `5005` | HTTP port the server listens on |

## Updating static library data

Static data lives in `data/`. If it ever needs refreshing, re-run the
scrape (see scraper notes inside the server) and commit the updated JSON.
