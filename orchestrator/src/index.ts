import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectAllServers, callMcpTool } from "./mcp/clients.js";
import { runAgentLoopStreaming } from "./agent.js";
import { getSession } from "./sessions.js";

const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;

async function main() {
  const allTools = await connectAllServers();
  console.log(`\nOrchestrator ready — ${allTools.length} tools available.\n`);

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.post("/api/chat", async (req, res) => {
    const { sessionId, message } = req.body as { sessionId?: string; message?: string };

    if (!sessionId || !message) {
      res.status(400).json({ error: "sessionId and message are required" });
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
      res.write(`data: ${JSON.stringify({ type: "error", message: (err as Error).message })}\n\n`);
    }

    res.end();
  });

  app.get("/api/dashboard/library", async (_req, res) => {
    try {
      const raw = await callMcpTool("get_library_info", {});
      res.json(JSON.parse(raw));
    } catch (err) {
      res.status(502).json({ error: (err as Error).message });
    }
  });

  app.get("/api/dashboard/todays-menu", async (_req, res) => {
    try {
      const raw = await callMcpTool("get_todays_menu", {});
      res.json(JSON.parse(raw));
    } catch (err) {
      res.status(502).json({ error: (err as Error).message });
    }
  });

  app.get("/api/dashboard/events", async (_req, res) => {
    try {
      const eventsRaw = await callMcpTool("get_upcoming_club_events", { days_ahead: 7 });
      const eventsData = JSON.parse(eventsRaw);

      const festsRaw = await callMcpTool("get_fests", {});
      const festsData = JSON.parse(festsRaw);

      const now = new Date();
      const cutoff = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const upcomingFests = (festsData.fests || []).filter((f: { dates?: string }) => {
        const startStr = f.dates?.split(" to ")[0];
        if (!startStr) return false;
        const start = new Date(startStr);
        return start >= now && start <= cutoff;
      });

      res.json({ events: eventsData.events || [], fests: upcomingFests });
    } catch (err) {
      res.status(502).json({ error: (err as Error).message });
    }
  });

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", toolsAvailable: allTools.length });
  });

  app.listen(PORT, () => {
    console.log(`Orchestrator listening on http://localhost:${PORT}`);
    console.log(`  Chat endpoint (SSE): POST http://localhost:${PORT}/api/chat`);
    console.log(`  Dashboard endpoints: GET /api/dashboard/{library,todays-menu,events}`);
  });
}

main();