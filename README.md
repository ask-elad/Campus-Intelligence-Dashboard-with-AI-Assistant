# Campus Intelligence Dashboard

An AI-assisted dashboard for IIT Roorkee students — live library, mess menu,
club/fest, and academic information, plus an assistant that can answer
across all four domains in natural language.

This is a rebuild of an earlier version of this project. The first version
was a single file, generated in one shot and never really understood by me.
This one was built piece by piece, with each architectural decision made
deliberately and each piece tested before the next was added. The sections
below explain not just what this is, but why it's built the way it is.

## Live

|---|---|
| **Dashboard (frontend)** | https://campusbrains.vercel.app/ |
| **Orchestrator API** | https://campus-orchestrator.onrender.com |
| **Events MCP server** | https://campus-events-mcp-glba.onrender.com |
| **Cafeteria MCP server** | https://campus-cafeteria-cqx7.onrender.com |
| **Library MCP server** | https://campus-intelligence-dashboard-with-ai-sx7m.onrender.com |
| **Academics MCP server** | https://campus-academics-mcp-acad.onrender.com |


## What this actually is

Four independent MCP servers, each owning one domain of campus data. An
orchestrator that connects to all four as an MCP client, hands their tools
to an LLM (Groq, running Llama 3.3), and lets the model decide which tools
to call to answer a question. A frontend that shows the same four domains
as live widgets, plus a chat interface backed by that orchestrator.

No shared database. No single monolith. Each server is independently
buildable, testable, and — if this ever needed to scale — independently
deployable and ownable by a different person.

## Architecture

```
                    ┌─────────────┐
                    │  Frontend   │  Vite + React SPA
                    │  (widgets + │  4 REST reads, 1 streaming chat endpoint
                    │   chat UI)  │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ Orchestrator │  Express + MCP client + Groq
                    │              │  Tool-calling agent loop, SSE streaming,
                    │              │  in-memory per-session conversation history
                    └──────┬──────┘
          ┌────────┬───────┼───────┬────────┐
          ▼        ▼       ▼       ▼
     ┌────────┐┌────────┐┌────────┐┌────────┐
     │ Events ││Cafeteria││Library ││Academics│
     │  MCP   ││  MCP    ││  MCP   ││  MCP    │
     └────────┘└────────┘└────────┘└────────┘
```

## Why each MCP server is built the way it is

The four servers don't share a stack, and that split was made on purpose,
not by accident:

**Events & Cafeteria — TypeScript, static hand-written data.**
Neither domain has a real external source worth scraping (club event
listings and mess menus aren't published anywhere machine-readable), so
the data lives in versioned JSON files, and the servers are pure
search/filter logic over typed records. TypeScript's static typing earns
its keep here specifically because the operation is structural (search,
filter, date-window logic) — there's nothing this domain needs from
Python that TypeScript doesn't already do well.

**Library — Python, hybrid live + static.**
Static facts (hours, floors, building details) are scraped once from
MGCL's own site, respecting `robots.txt` at scrape time, and committed as
JSON — this data barely changes, so re-fetching it live would be wasted
work. Book search is genuinely live: it queries the Open Library API on
every request (with a short in-memory cache), because a static book list
would go stale immediately and MGCL's own OPAC catalog disallows
automated access via its `robots.txt` — using a public, bot-friendly book
API was the honest alternative, not a workaround.

**Academics — Python, RAG over embedded PDFs.**
Programme structure documents (which courses a branch takes, by year and
semester) are real PDFs published by the institute, chunked along their
actual `Year`/`Semester` boundaries (not arbitrary fixed-size chunks,
which would cut a course table in half), embedded via Google's Gemini
embedding model, and stored in a committed local Chroma vector database.
A separate `get_academic_facts` tool serves static data (calendar,
holidays, campus rules) directly from JSON — RAG is used only where the
underlying question is genuinely semantic ("what does a 3rd year CS
student study"), not for data that has one exact right answer.

## Why the orchestrator is built the way it is

The agent loop is a real loop, not a single request/response: the LLM can
call more than one tool in a single turn, see the results, and decide to
call more before producing a final answer. Tool results are fed back as
`tool` role messages, and the loop continues (capped at a small iteration
limit) until the model stops requesting tools.

Streaming is implemented over `fetch` + `ReadableStream`, not
`EventSource` — the chat endpoint is `POST`, and `EventSource` only
supports `GET`. Groq's streamed tool-call arguments arrive across many
chunks and have to be reassembled by index before they're valid JSON;
this is handled explicitly rather than trusting a naive single-chunk
accumulation.

Conversation memory is a per-`sessionId` in-memory array on the
orchestrator — genuinely simple, and honestly a known limitation (see
below), not a hidden one.

## Repository structure

```
.
├── mcp-servers/
│   ├── events-server/         TypeScript, static JSON
│   ├── cafeteria-server/      TypeScript, static JSON
│   ├── library-server/        Python/FastMCP, scraped facts + live search
│   └── academics-server/      Python/FastMCP, RAG over embedded PDFs
├── orchestrator/               Express + MCP client + Groq agent loop
└── frontend/                    Vite + React dashboard + chat UI
```

Each `mcp-servers/*` and `orchestrator/` has its own `README.md` and
`.env.example` with more specific setup notes than what's below.

## Running locally

Requires Node 20+, Python 3.11+, and API keys for Groq and Google
(Gemini embeddings) — both have usable free tiers.

```bash
# each MCP server, in its own terminal
cd mcp-servers/events-server && npm install && npm run dev       # :5003
cd mcp-servers/cafeteria-server && npm install && npm run dev    # :5004
cd mcp-servers/library-server && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt && python main.py   # :5005
cd mcp-servers/academics-server && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt && python main.py # :5006

# orchestrator
cd orchestrator && npm install && cp .env.example .env   # fill in GROQ_API_KEY and the 4 MCP URLs
npm run dev   # :5000

# frontend
cd frontend && npm install && cp .env.example .env   # VITE_ORCHESTRATOR_URL=http://localhost:5000
npm run dev   # :8080
```

Bring the MCP servers up before the orchestrator — it connects to all
four on startup and will log a warning per server it can't reach.

## Known limitations

Being upfront about these rather than letting someone discover them:

- **No authentication, no real user accounts.** The student profile shown
  in the UI is a hardcoded demo object (`frontend/src/config/profile.ts`).
- **Conversation memory is in-process and non-persistent.** Restarting
  the orchestrator loses every active session. There's no reason this
  couldn't move to Redis or a database — it just hasn't needed to yet.
- **Academics currently covers 4 UG branches** (CS, EE, ME, CE) as a
  pilot set. Adding a branch means dropping a correctly-named PDF into
  `academics-server/data/raw_pdfs/` and re-running the ingestion script —
  no code changes required, but it is a manual step.
- **Library search reflects a general public book catalog** (Open
  Library), not MGCL's actual real-time holdings — MGCL's own catalog
  system disallows automated access, so this is the honest scope of what
  "search books" means here.