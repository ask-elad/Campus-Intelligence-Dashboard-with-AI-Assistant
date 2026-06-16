import "dotenv/config";
import express from "express";
import cors from "cors";
import { initializeMcpClients, serverStatuses, toolOwnerMap } from "./mcpClients/manager.js";
import { startHealthCheckLoop } from "./healthcheck.js";
import { runAgentLoop } from "./router/agent.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: "*" }));
app.use(express.json());

// ---- Health / Status ----
app.get("/api/status", (_req, res) => {
  const statuses = Array.from(serverStatuses.values());
  const allConnected = statuses.every(s => s.connected);
  res.json({
    orchestrator: "online",
    allServersConnected: allConnected,
    connectedCount: statuses.filter(s => s.connected).length,
    totalServers: statuses.length,
    servers: statuses
  });
});

// ---- AI Chat (SSE streaming) ----
app.post("/api/chat", async (req, res) => {
  const { message, studentProfile } = req.body as {
    message: string;
    studentProfile?: { name: string; id: string; branch: string; year: string };
  };

  if (!message?.trim()) {
    res.status(400).json({ error: "Message is required" });
    return;
  }

  // Setup SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  try {
    await runAgentLoop(message, res, studentProfile);
  } catch (err: any) {
    res.write(`event: error\ndata: ${JSON.stringify({ message: err?.message || "Unknown error" })}\n\n`);
  } finally {
    res.end();
  }
});

// ---- Library endpoints (for widget fast-path) ----
app.get("/api/library/info", async (_req, res) => {
  try {
    const { callTool } = await import("./mcpClients/manager.js");
    const result = await callTool("get_library_info", {});
    const content = (result as any)?.content?.[0]?.text;
    res.json(content ? JSON.parse(content) : result);
  } catch (err: any) {
    res.status(503).json({ error: err?.message });
  }
});

app.get("/api/library/search", async (req, res) => {
  const query = (req.query.q as string) || "";
  try {
    const { callTool } = await import("./mcpClients/manager.js");
    const result = await callTool("search_books", { query });
    const content = (result as any)?.content?.[0]?.text;
    res.json(content ? JSON.parse(content) : result);
  } catch (err: any) {
    res.status(503).json({ error: err?.message });
  }
});

app.get("/api/library/borrowed", async (req, res) => {
  const studentId = req.query.student_id as string;
  if (!studentId) { res.status(400).json({ error: "student_id required" }); return; }
  try {
    const { callTool } = await import("./mcpClients/manager.js");
    const result = await callTool("get_borrowed_books", { student_id: studentId });
    const content = (result as any)?.content?.[0]?.text;
    res.json(content ? JSON.parse(content) : result);
  } catch (err: any) {
    res.status(503).json({ error: err?.message });
  }
});

app.get("/api/library/hours", async (_req, res) => {
  try {
    const { callTool } = await import("./mcpClients/manager.js");
    const result = await callTool("get_library_hours", {});
    const content = (result as any)?.content?.[0]?.text;
    res.json(content ? JSON.parse(content) : result);
  } catch (err: any) {
    res.status(503).json({ error: err?.message });
  }
});

// ---- Cafeteria endpoints ----
app.get("/api/cafeteria/today", async (_req, res) => {
  try {
    const { callTool } = await import("./mcpClients/manager.js");
    const result = await callTool("get_today_menu", {});
    const content = (result as any)?.content?.[0]?.text;
    res.json(content ? JSON.parse(content) : result);
  } catch (err: any) {
    res.status(503).json({ error: err?.message });
  }
});

app.get("/api/cafeteria/eateries", async (_req, res) => {
  try {
    const { callTool } = await import("./mcpClients/manager.js");
    const result = await callTool("get_eateries", {});
    const content = (result as any)?.content?.[0]?.text;
    res.json(content ? JSON.parse(content) : result);
  } catch (err: any) {
    res.status(503).json({ error: err?.message });
  }
});

app.get("/api/cafeteria/weekly", async (_req, res) => {
  try {
    const { callTool } = await import("./mcpClients/manager.js");
    const result = await callTool("get_weekly_menu", {});
    const content = (result as any)?.content?.[0]?.text;
    res.json(content ? JSON.parse(content) : result);
  } catch (err: any) {
    res.status(503).json({ error: err?.message });
  }
});

// ---- Events endpoints ----
app.get("/api/events/upcoming", async (req, res) => {
  const days = parseInt(req.query.days as string) || 30;
  try {
    const { callTool } = await import("./mcpClients/manager.js");
    const result = await callTool("get_upcoming_club_events", { days_ahead: days });
    const content = (result as any)?.content?.[0]?.text;
    res.json(content ? JSON.parse(content) : result);
  } catch (err: any) {
    res.status(503).json({ error: err?.message });
  }
});

app.get("/api/events/fests", async (_req, res) => {
  try {
    const { callTool } = await import("./mcpClients/manager.js");
    const result = await callTool("get_fests", {});
    const content = (result as any)?.content?.[0]?.text;
    res.json(content ? JSON.parse(content) : result);
  } catch (err: any) {
    res.status(503).json({ error: err?.message });
  }
});

// ---- Academics endpoints ----
app.get("/api/academics/calendar", async (_req, res) => {
  try {
    const { callTool } = await import("./mcpClients/manager.js");
    const result = await callTool("get_academic_calendar", {});
    const content = (result as any)?.content?.[0]?.text;
    res.json(content ? JSON.parse(content) : result);
  } catch (err: any) {
    res.status(503).json({ error: err?.message });
  }
});

app.get("/api/academics/rules", async (_req, res) => {
  try {
    const { callTool } = await import("./mcpClients/manager.js");
    const result = await callTool("get_all_rules", {});
    const content = (result as any)?.content?.[0]?.text;
    res.json(content ? JSON.parse(content) : result);
  } catch (err: any) {
    res.status(503).json({ error: err?.message });
  }
});

app.get("/api/academics/holidays", async (_req, res) => {
  try {
    const { callTool } = await import("./mcpClients/manager.js");
    const result = await callTool("get_holidays", {});
    const content = (result as any)?.content?.[0]?.text;
    res.json(content ? JSON.parse(content) : result);
  } catch (err: any) {
    res.status(503).json({ error: err?.message });
  }
});

// ---- Boot ----
async function boot() {
  await initializeMcpClients();
  //startHealthCheckLoop();

  app.listen(PORT, () => {
    console.log(`\n🚀 Campus Intelligence Orchestrator running on http://localhost:${PORT}`);
    console.log(`   POST /api/chat          — AI assistant (SSE streaming)`);
    console.log(`   GET  /api/status        — MCP server health status`);
    console.log(`   GET  /api/library/*     — Library data endpoints`);
    console.log(`   GET  /api/cafeteria/*   — Cafeteria data endpoints`);
    console.log(`   GET  /api/events/*      — Events data endpoints`);
    console.log(`   GET  /api/academics/*   — Academics data endpoints\n`);
  });
}

boot().catch(err => {
  console.error("Failed to start orchestrator:", err);
  process.exit(1);
});
