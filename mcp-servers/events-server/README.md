# Events MCP Server

MCP server for IIT Roorkee campus events — club events and institute-level
fests. Pure search/filter logic over a hand-curated JSON dataset.

## Why it looks like this

Club event listings and fest schedules aren't published anywhere machine-
readable. The data lives in `data/events.json` and is updated by hand. The
server is TypeScript because every operation here is structural (search,
filter, date-window logic) — typed records earn their keep.

## Tools exposed

| Tool | Purpose |
|---|---|
| `search_events` | Full-text search across both club events and fests |
| `get_upcoming_club_events` | Club events within the next N days |
| `get_fests` | All fests (any date) |
| `get_events_by_club` | Events for a given club |
| `get_fest_details` | Details for one fest by name |

## Run locally

```bash
npm install
npm run dev        # :5003 by default
```

## Env vars

| Name | Default | Purpose |
|---|---|---|
| `PORT` | `5003` | HTTP port the server listens on |

## Adding events

Edit `data/events.json`. The schema is self-describing — follow the shape
of the existing entries. The server reads the file at startup, so restart
after changes.
