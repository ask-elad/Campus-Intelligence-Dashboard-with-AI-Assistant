# Orchestrator

Express service that connects to all four campus MCP servers as a client,
hands their tools to Groq (Llama 3.3), and streams the agent loop back to
the frontend over Server-Sent Events.

## What it does

- Connects to all 4 MCP servers at startup (with background retry for any
  that fail).
- Exposes 6 REST endpoints under `/api/dashboard/*` for the widget data.
- Exposes `POST /api/chat` (SSE) for the chat UI; runs a real tool-calling
  agent loop (max 5 iterations) and streams token / tool-call /
  tool-result / error / done events.

## Tools exposed to the LLM

Whichever tools the connected MCP servers advertise at startup. See each
server's README for the catalogue.

## Run locally

```bash
npm install
cp .env.example .env   # fill in GROQ_API_KEY and the 4 MCP URLs
npm run dev            # :5000 by default
```

Bring the MCP servers up first — the orchestrator connects to all four on
startup and logs a warning per unreachable server, retrying every 30s.

## Env vars

| Name | Default | Purpose |
|---|---|---|
| `PORT` | `5000` | HTTP port |
| `GROQ_API_KEY` | — | Groq API key (console.groq.com) |
| `EVENTS_MCP_URL` | — | Events MCP server URL |
| `CAFETERIA_MCP_URL` | — | Cafeteria MCP server URL |
| `LIBRARY_MCP_URL` | — | Library MCP server URL |
| `ACADEMICS_MCP_URL` | — | Academics MCP server URL |
| `CORS_ORIGINS` | `localhost:8080,localhost:5173` | Comma-separated allowed browser origins |
| `SESSION_TTL_MS` | `1800000` (30 min) | Per-session conversation TTL |
| `MAX_SESSIONS` | `1000` | Max in-memory sessions (LRU evicted) |

## Logging

All server logs are structured JSON on stdout (`log.info / log.warn /
log.error`), one entry per line, so they stream cleanly into Render's log
viewer and any downstream log tooling.

## Health

```
GET /health → { "status": "ok", "toolsAvailable": <n> }
```

## Tests

```bash
npm test
```

Covers the agent streaming loop (tool-call reassembly, max-iter cap,
malformed-arg handling, MCP error pass-through) and session TTL/LRU
eviction.
