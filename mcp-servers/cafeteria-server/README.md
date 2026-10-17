# Cafeteria MCP Server

MCP server for IIT Roorkee's mess menus and campus eateries. Static JSON
data plus day/time-aware menu lookup.

## Why it looks like this

Mess menus aren't machine-readable anywhere. The data lives in
`data/cafeteria.json` as typed records; the server is pure TypeScript
search/filter.

## Tools exposed

| Tool | Purpose |
|---|---|
| `get_todays_menu` | Mess menu for today, resolved from the weekly rotation |
| `get_menu_by_day` | Mess menu for a given day of the week |
| `search_eateries` | Full-text search across cafés / canteens / outlets |
| `get_eatery_details` | Details for one eatery by name |
| `get_bhawan_list` | List of all hostel mess bhawans |

## Run locally

```bash
npm install
npm run dev        # :5004 by default
```

## Env vars

| Name | Default | Purpose |
|---|---|---|
| `PORT` | `5004` | HTTP port the server listens on |

## Adding data

Edit `data/cafeteria.json`. Restart the server after changes.
