import express from "express";
import cors from "cors";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const eventsData = require("../data/events.json");

const PORT = process.env.PORT || 5003;

// --- Helpers ---
function parseDateRange(dateStr: string): { start: Date; end: Date } {
  if (dateStr.includes(" to ")) {
    const [startStr, endStr] = dateStr.split(" to ");
    return { start: new Date(startStr.trim()), end: new Date(endStr.trim()) };
  }
  const d = new Date(dateStr.trim());
  return { start: d, end: d };
}

function getUpcomingClubEvents(daysAhead: number) {
  const now = new Date();
  const cutoff = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  return eventsData.upcomingClubEvents.filter((event: any) => {
    const eventDate = new Date(event.date);
    return eventDate >= now && eventDate <= cutoff;
  });
}

function searchAllEvents(query: string) {
  const q = query.toLowerCase();
  const clubMatches = eventsData.upcomingClubEvents.filter((e: any) =>
    e.eventName.toLowerCase().includes(q) ||
    e.clubName.toLowerCase().includes(q) ||
    e.description.toLowerCase().includes(q) ||
    e.venue.toLowerCase().includes(q)
  );
  const festMatches = eventsData.fests.filter((f: any) =>
    f.name.toLowerCase().includes(q) ||
    f.type.toLowerCase().includes(q) ||
    f.description.toLowerCase().includes(q) ||
    f.eventsList.some((ev: any) => ev.name.toLowerCase().includes(q))
  );
  return { clubEvents: clubMatches, fests: festMatches };
}

// --- MCP Server ---
const mcpServer = new McpServer({
  name: "events-mcp-server",
  version: "1.0.0"
});

mcpServer.tool(
  "get_upcoming_club_events",
  "Get upcoming club and society events on campus within a specified number of days. Returns event name, club, date, time, venue, and description.",
  { days_ahead: z.number().optional().describe("Number of days to look ahead (default: 30)") },
  async ({ days_ahead = 30 }) => {
    const events = getUpcomingClubEvents(days_ahead);
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          daysAhead: days_ahead,
          totalFound: events.length,
          events: events.map((e: any) => ({
            id: e.id,
            club: e.clubName,
            eventName: e.eventName,
            date: e.date,
            time: e.time,
            venue: e.venue,
            description: e.description
          }))
        })
      }]
    };
  }
);

mcpServer.tool(
  "get_all_club_events",
  "Get all upcoming club events without any date filter. Useful for a full overview of what clubs are organizing.",
  {},
  async () => {
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          totalEvents: eventsData.upcomingClubEvents.length,
          events: eventsData.upcomingClubEvents
        })
      }]
    };
  }
);

mcpServer.tool(
  "get_fests",
  "Get information about all annual campus festivals (Thomso, Cognizance, Sangram, etc.) including dates, description, and sub-events.",
  {},
  async () => {
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          totalFests: eventsData.fests.length,
          fests: eventsData.fests.map((f: any) => ({
            name: f.name,
            type: f.type,
            dates: f.dates,
            description: f.description,
            eventsList: f.eventsList
          }))
        })
      }]
    };
  }
);

mcpServer.tool(
  "search_events",
  "Search across all campus events (club events and annual fests) by keyword — event name, club name, venue, or description.",
  { query: z.string().describe("Search keyword or phrase") },
  async ({ query }) => {
    const { clubEvents, fests } = searchAllEvents(query);
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          query,
          results: {
            clubEvents: {
              count: clubEvents.length,
              items: clubEvents
            },
            fests: {
              count: fests.length,
              items: fests.map((f: any) => ({
                name: f.name,
                type: f.type,
                dates: f.dates,
                description: f.description
              }))
            }
          }
        })
      }]
    };
  }
);

mcpServer.tool(
  "get_events_by_club",
  "Get all upcoming events organized by a specific club or society.",
  { club_name: z.string().describe("Club or society name (e.g., SDSLabs, PAG, InfoSec IITR)") },
  async ({ club_name }) => {
    const q = club_name.toLowerCase();
    const events = eventsData.upcomingClubEvents.filter((e: any) =>
      e.clubName.toLowerCase().includes(q)
    );
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          club: club_name,
          eventsFound: events.length,
          events
        })
      }]
    };
  }
);

mcpServer.tool(
  "get_fest_details",
  "Get detailed information about a specific annual campus festival including all its sub-events.",
  { fest_name: z.string().describe("Name of the festival (e.g., Thomso, Cognizance, Sangram)") },
  async ({ fest_name }) => {
    const q = fest_name.toLowerCase();
    const fest = eventsData.fests.find((f: any) => f.name.toLowerCase().includes(q));
    if (!fest) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            error: `No festival found matching '${fest_name}'.`,
            availableFests: eventsData.fests.map((f: any) => f.name)
          })
        }]
      };
    }
    return {
      content: [{
        type: "text",
        text: JSON.stringify(fest)
      }]
    };
  }
);

// --- Express server ---
const app = express();
app.use(cors());
app.use(express.json());

const transports: Record<string, SSEServerTransport> = {};

app.get("/sse", async (req, res) => {
  console.log("[Events MCP] New SSE connection");
  const transport = new SSEServerTransport("/messages", res);
  transports[transport.sessionId] = transport;

  res.on("close", () => {
    console.log(`[Events MCP] SSE connection closed: ${transport.sessionId}`);
    delete transports[transport.sessionId];
  });

  await mcpServer.connect(transport);
});

app.post("/messages", async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports[sessionId];

  if (!transport) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  try {
    await transport.handlePostMessage(req, res, req.body);
  } catch (err: any) {
    console.error("[Events MCP] POST /messages failed:", err);
    res.status(500).json({ error: err?.message || "Internal server error" });
  }
});

app.get("/health", (_, res) => {
  res.json({ status: "ok", server: "events-mcp-server", port: PORT });
});

app.listen(PORT, () => {
  console.log(`Events MCP Server running on http://localhost:${PORT}`);
  console.log(`  SSE endpoint: http://localhost:${PORT}/sse`);
});