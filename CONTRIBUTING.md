# Contributing

This repo is a loose monorepo — each package installs and runs on its
own. There's no shared build; the root-level config files are only for
lint and format tooling.

## Layout

```
.
├── mcp-servers/
│   ├── events-server/         TypeScript, static JSON
│   ├── cafeteria-server/      TypeScript, static JSON
│   ├── library-server/        Python/FastMCP, scraped + live
│   └── academics-server/      Python/FastMCP, RAG over PDFs
├── orchestrator/              Express + MCP client + Groq
└── frontend/                  Vite + React
```

Each package has its own README with run / env / data instructions.

## Dev loop

Per-package commands:

```bash
# TypeScript packages
cd <pkg>
npm install
npm run dev
npm run typecheck   # orchestrator, frontend
npm test            # orchestrator, frontend

# Python packages
cd mcp-servers/<pkg>-server
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python main.py
pytest tests/       # academics-server
```

## Lint & format

Shared tooling lives at the repo root. Install once:

```bash
npm install                        # at the repo root
pip install black ruff             # in whichever venv you prefer
```

Then from the repo root:

```bash
npm run format        # Prettier write
npm run format:check  # Prettier check (CI-friendly)
npm run lint          # ESLint across all TS/TSX
npm run py:format     # Black write
npm run py:lint       # Ruff check
```

## Conventions

- No `console.log` in orchestrator source; use the structured logger in
  `orchestrator/src/log.ts`.
- Keep each MCP server's data under its own `data/` directory — never
  share data across servers.
- When adding a new tool to an MCP server, keep the input schema narrow
  (zod on the TS side, type hints + docstring on the Python side); the
  LLM relies on the schema and description.

## Secrets

Never commit `.env` files. `.env.example` is the only env file that
belongs in git. The root `.gitignore` enforces this, but double-check
`git status` before committing.
