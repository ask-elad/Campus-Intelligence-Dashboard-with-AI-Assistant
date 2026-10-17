import "dotenv/config";
import { randomUUID } from "node:crypto";
import express from "express";
import cors from "cors";
import { connectAllServers, callMcpTool } from "./mcp/clients.js";
import { runAgentLoopStreaming } from "./agent.js";
import { getSession } from "./sessions.js";
import { log } from "./log.js";
import type { DiscoveredTool } from "./types.js";

const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;

const DEFAULT_ORIGINS = ["http://localhost:8080", "http://localhost:5173"];
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
const CORS_ORIGINS = ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS : DEFAULT_ORIGINS;

const MAX_MESSAGE_CHARS = 4000;
const MAX_SESSION_ID_CHARS = 128;
const MAX_LIBRARY_QUERY_CHARS = 200;

type ParseResult<T> = { ok: true; data: T } | { ok: false; error: string };

function safeParseToolResult<T = unknown>(raw: string, toolName: string): ParseResult<T> {
  try {
    return { ok: true, data: JSON.parse(raw) as T };
  } catch (err) {
    return {
      ok: false,
      error: `Tool "${toolName}" returned malformed JSON: ${(err as Error).message}`,
    };
  }
}

async function main() {
  const allTools: DiscoveredTool[] = [];

  const app = express();
  app.use(
    cors({
      origin: (origin, cb) => {
        // Same-origin / non-browser requests (curl, server-to-server) have no Origin header.
        if (!origin) return cb(null, true);
        if (CORS_ORIGINS.includes(origin)) return cb(null, true);
        return cb(new Error(`Origin ${origin} not allowed by CORS policy`));
      },
    })
  );
  app.use(express.json({ limit: "16kb" }));

  app.use((req, res, next) => {
    const reqId = randomUUID();
    (req as express.Request & { id: string }).id = reqId;
    res.setHeader("x-request-id", reqId);
    log.info("http.request", { reqId, method: req.method, path: req.path });
    next();
  });

  app.post("/api/chat", async (req, res) => {
    const reqId = (req as express.Request & { id: string }).id;
    const { sessionId, message } = req.body as { sessionId?: unknown; message?: unknown };

    if (
      typeof sessionId !== "string" ||
      sessionId.length === 0 ||
      sessionId.length > MAX_SESSION_ID_CHARS
    ) {
      res.status(400).json({ error: "sessionId must be a non-empty string ≤ 128 chars" });
      return;
    }
    if (
      typeof message !== "string" ||
      message.length === 0 ||
      message.length > MAX_MESSAGE_CHARS
    ) {
      res.status(400).json({ error: `message must be a non-empty string ≤ ${MAX_MESSAGE_CHARS} chars` });
      return;
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    const history = getSession(sessionId);
    history.push({ role: "user", content: message });

    try {
      for await (const event of runAgentLoopStreaming(history, allTools)) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    } catch (err) {
      log.error("chat.stream_failed", { reqId, error: (err as Error).message });
      res.write(
        `data: ${JSON.stringify({
          type: "error",
          code: "stream_failed",
          message: (err as Error).message,
          reqId,
        })}\n\n`
      );
    }

    res.end();
  });

  const dashboardJson = async (
    res: express.Response,
    toolName: string,
    args: Record<string, unknown> = {}
  ) => {
    try {
      const raw = await callMcpTool(toolName, args);
      const parsed = safeParseToolResult(raw, toolName);
      if (!parsed.ok) {
        log.error("dashboard.parse_failed", { tool: toolName, error: parsed.error });
        res.status(502).json({ error: parsed.error });
        return;
      }
      res.json(parsed.data);
    } catch (err) {
      log.error("dashboard.tool_failed", { tool: toolName, error: (err as Error).message });
      res.status(502).json({ error: (err as Error).message });
    }
  };

  app.get("/api/dashboard/library", (_req, res) => {
    void dashboardJson(res, "get_library_info");
  });

  app.get("/api/dashboard/library/search", (req, res) => {
    const query = req.query.q;
    if (typeof query !== "string" || query.length === 0) {
      res.status(400).json({ error: "Query parameter 'q' is required" });
      return;
    }
    if (query.length > MAX_LIBRARY_QUERY_CHARS) {
      res.status(400).json({ error: `'q' must be ≤ ${MAX_LIBRARY_QUERY_CHARS} chars` });
      return;
    }
    void dashboardJson(res, "search_books", { query });
  });

  app.get("/api/dashboard/todays-menu", (_req, res) => {
    void dashboardJson(res, "get_todays_menu");
  });

  app.get("/api/dashboard/cafeteria/eateries", (_req, res) => {
    void dashboardJson(res, "search_eateries", { query: "" });
  });

  app.get("/api/dashboard/events", async (_req, res) => {
    try {
      const eventsRaw = await callMcpTool("get_upcoming_club_events", { days_ahead: 7 });
      const eventsParsed = safeParseToolResult<{ events?: unknown[] }>(
        eventsRaw,
        "get_upcoming_club_events"
      );
      if (!eventsParsed.ok) {
        res.status(502).json({ error: eventsParsed.error });
        return;
      }

      const festsRaw = await callMcpTool("get_fests", {});
      const festsParsed = safeParseToolResult<{ fests?: { dates?: string }[] }>(
        festsRaw,
        "get_fests"
      );
      if (!festsParsed.ok) {
        res.status(502).json({ error: festsParsed.error });
        return;
      }

      const now = new Date();
      const cutoff = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const upcomingFests = (festsParsed.data.fests ?? []).filter((f) => {
        const startStr = f.dates?.split(" to ")[0];
        if (!startStr) return false;
        const start = new Date(startStr);
        return start >= now && start <= cutoff;
      });

      res.json({ events: eventsParsed.data.events ?? [], fests: upcomingFests });
    } catch (err) {
      log.error("dashboard.events_failed", { error: (err as Error).message });
      res.status(502).json({ error: (err as Error).message });
    }
  });

  app.get("/api/dashboard/academics", (_req, res) => {
    void dashboardJson(res, "get_academic_facts");
  });

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", toolsAvailable: allTools.length });
  });

  app.listen(PORT, () => {
    log.info("http.listening", {
      port: PORT,
      corsOrigins: CORS_ORIGINS,
    });
  });

  // Connect to MCP servers after the HTTP server has started.
  // Failed connections will be retried automatically.
  await connectAllServers(allTools);
}

main();
