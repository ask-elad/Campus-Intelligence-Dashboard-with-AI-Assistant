# Campus Intelligence — Frontend

Plain Vite + React + TypeScript SPA. No SSR, no meta-framework, no shadcn/
Radix — hand-built components kept intentionally lightweight so this drops
into your monorepo with minimal dependencies to reason about.

## Setup

```bash
npm install
cp .env.example .env
```

Confirm `.env` has:
```
VITE_ORCHESTRATOR_URL=http://localhost:5000
```

With your 4 MCP servers + orchestrator already running:
```bash
npm run dev
```
Opens on `http://localhost:8080`.

## ⚠️ Important — verify this yourself before trusting it

Same caveat as before: npm registry access is blocked in the sandbox I
build in (still true this round — even a plain `npm view react versions`
gets a 403). I could not run an actual build this time either. What I
did verify without it: every file's structure, all imports resolve to
files that exist, brace/paren balance across all 27 source files, and
every export `WidgetCard.tsx` now provides (`deriveStatus`, the new
`status` prop, richer `WidgetError`/`EmptyState`) is correctly imported
and used the same way across all four widget files. Run it and watch
real data flow through before trusting it.

## What changed in this round

Two real bugs fixed, requested after the first version:

1. **Light/dark mode now actually works.** The previous version toggled
   a `dark` class on `<html>` with nothing defined to switch to —
   `src/styles.css` only had one palette. Now there are two full
   palettes (dark default, warm-paper light) using CSS custom properties
   that `@theme` tokens reference indirectly, so the existing toggle in
   `Sidebar.tsx` genuinely changes every color across the app.
2. **Type scale and spacing increased throughout** — cards are taller
   (30rem vs 26rem), padding/gaps roughly 20-25% larger, base text sizes
   bumped a step, and the dashboard's max-width widened so it fills a
   normal desktop viewport instead of looking cramped in the center.

Also picked up, based on a reference screenshot: icon badges on each
widget header, a live status dot per widget (not just in the sidebar),
richer bordered error states with retry buttons, hint-chip empty states
on the library search, MCP servers listed sidebar-style as
`library-mcp`/`cafeteria-mcp`/etc., and a centered pill switcher for
Dashboard/AI Assistant in the top bar.

**Not touched**: `src/lib/api.ts`, `src/lib/types.ts`, `src/lib/dates.ts`,
`src/lib/tool-labels.ts`, `src/hooks/useCampusData.ts` — all backend
integration logic is byte-for-byte identical to the version you already
tested end-to-end. This is a visual-layer change only.


## What to check, in order

1. `npm run dev` starts with no errors.
2. All 4 widgets load real data (not stuck on skeletons).
3. Library catalog search returns real books with covers as you type.
4. Cafeteria's Breakfast/Lunch/Dinner tabs show today's actual menu.
5. Chat streams token-by-token (check the Network tab — should NOT arrive
   all at once).
6. Kill one MCP server, confirm only that widget's sidebar dot goes red
   while the other three stay fine.

## Structure

```
src/
├── config/profile.ts       demo student profile (no auth system exists)
├── lib/
│   ├── api.ts                typed client for all 6 REST endpoints + chat stream
│   ├── types.ts                interfaces mirroring the backend contract
│   ├── dates.ts                 upcoming/relative-date helpers (no date-fns dependency)
│   └── tool-labels.ts            MCP tool name -> human-readable chat label
├── hooks/useCampusData.ts   one TanStack Query hook per widget, isolated failure
└── components/
    ├── WidgetCard.tsx        shared card chrome, tabs, loading/error/empty states
    ├── LibraryWidget.tsx / CafeteriaWidget.tsx / EventsWidget.tsx / AcademicsWidget.tsx
    ├── AiAssistant.tsx        chat view, manual SSE parsing (fetch + ReadableStream)
    ├── Markdown.tsx             minimal **bold**/list renderer, no dependency
    ├── Sidebar.tsx / TopBar.tsx / AskBar.tsx / Dashboard.tsx
```

## Design notes

Palette and type choices are in `src/styles.css` as Tailwind v4 `@theme`
tokens — change them there, nowhere else. The corner-tick marks on cards
(`.corner-ticks` utility) are the one deliberate signature element,
referencing technical-drafting registration marks — grounded in IIT
Roorkee's founding discipline (civil engineering), used once, consistently.
