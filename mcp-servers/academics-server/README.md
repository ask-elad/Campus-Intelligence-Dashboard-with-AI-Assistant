# Academics MCP Server

MCP server for IIT Roorkee academic data — a RAG index over the official
Programme Structure PDFs plus a static facts table (academic calendar,
holidays, policies).

## Why it looks like this

Programme Structure documents are real PDFs published by the institute.
They're chunked along their actual `Year`/`Semester` boundaries — not
arbitrary fixed-size chunks, which would cut a course table in half —
embedded via Google's Gemini embedding model, and stored in a committed
local Chroma vector database.

A separate `get_academic_facts` tool serves static data (calendar,
holidays, campus rules) directly from JSON. RAG is used only where the
question is genuinely semantic ("what does a 3rd year CS student study"),
not for data that has one exact right answer.

## Tools exposed

| Tool | Purpose |
|---|---|
| `get_academic_facts` | Academic calendar, holidays, policies, Spark Fellowship info |
| `search_program_structure` | Semantic search over Programme Structure PDFs, with branch/year/semester filters |

## Run locally

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in GOOGLE_API_KEY
python main.py         # :5006 by default
```

## Env vars

| Name | Default | Purpose |
|---|---|---|
| `PORT` | `5006` | HTTP port |
| `GOOGLE_API_KEY` | — | Gemini API key for `gemini-embedding-001` |

## Adding a branch

1. Drop a correctly-named PDF into `data/raw_pdfs/` (naming matches
   `scrapper/branch_aliases.py`).
2. Re-run the ingestion script: `python -m scrapper.ingest`.
3. Validate: `python -m scrapper.validate_chunks`.
4. Commit the updated `data/chroma_db/`.

## Tests

```bash
pytest tests/
```

Covers the pure branch-alias resolver and the static facts JSON shape;
RAG-level tests would need a live Gemini key and are intentionally out of
scope for the unit suite.
