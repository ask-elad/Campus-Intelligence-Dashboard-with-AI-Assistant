import { randomUUID } from "node:crypto";
import { createMcpExpressApp } from "@modelcontextprotocol/express";
import { NodeStreamableHTTPServerTransport } from "@modelcontextprotocol/node";
import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import eventsData from "../data/events.json" with { type: "json" };

const PORT = process.env.PORT ? Number(process.env.PORT) : 5003;

function getUpcomingClubEvents(daysAhead: number) {
  const now = new Date();
  const cutoff = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  return eventsData.upcomingClubEvents.filter((event) => {
    const eventDate = new Date(event.date);
    return eventDate >= now && eventDate <= cutoff;
  });
}

function searchAllEvents(query: string) {
  const q = query.toLowerCase();
  const clubMatches = eventsData.upcomingClubEvents.filter((e) =>
    e.eventName.toLowerCase().includes(q) ||
    e.clubName.toLowerCase().includes(q) ||
    e.description.toLowerCase().includes(q) ||
    e.venue.toLowerCase().includes(q)
  );
  const festMatches = eventsData.fests.filter((f) =>
    f.name.toLowerCase().includes(q) ||
    f.type.toLowerCase().includes(q) ||
    f.description.toLowerCase().includes(q) ||
    f.eventsList.some((ev) => ev.name.toLowerCase().includes(q))
  );
  return { clubMatches, festMatches };
}

function createServer(): McpServer {
  const server = new McpServer({ name: "events-mcp-server", version: "1.0.0" });

  server.registerTool(
    "search_events",
    {
      description:
        "Search across all campus events (club events and annual fests) by keyword — event name, club name, venue, or description.",
      inputSchema: z.object({ query: z.string().describe("Search keyword or phrase") })
    },
    async ({ query }) => {
      const { clubMatches, festMatches } = searchAllEvents(query);
      return {
        content: [
          { type: "text", text: JSON.stringify({ query, clubEvents: clubMatches, fests: festMatches }) }
        ]
      };
    }
  );

  server.registerTool(
    "get_upcoming_club_events",
    {
      description: "Get upcoming club and society events within a given number of days (default 30).",
      inputSchema: z.object({
        days_ahead: z.number().optional().describe("Number of days ahead to look, default 30")
      })
    },
    async ({ days_ahead }) => {
      const events = getUpcomingClubEvents(days_ahead ?? 30);
      return {
        content: [{ type: "text", text: JSON.stringify({ daysAhead: days_ahead ?? 30, events }) }]
      };
    }
  );

  server.registerTool(
    "get_fests",
    {
      description: "Get information about all annual campus festivals (Thomso, Cognizance, Sangram, etc.).",
      inputSchema: z.object({})
    },
    async () => {
      return { content: [{ type: "text", text: JSON.stringify({ fests: eventsData.fests }) }] };
    }
  );

  server.registerTool(
    "get_events_by_club",
    {
      description: "Get all upcoming events organized by a specific club or society.",
      inputSchema: z.object({ club_name: z.string().describe("Club or society name, e.g. SDSLabs") })
    },
    async ({ club_name }) => {
      const q = club_name.toLowerCase();
      const events = eventsData.upcomingClubEvents.filter((e) => e.clubName.toLowerCase().includes(q));
      return { content: [{ type: "text", text: JSON.stringify({ club: club_name, events }) }] };
    }
  );

  server.registerTool(
    "get_fest_details",
    {
      description: "Get detailed information about a specific annual campus festival, including sub-events.",
      inputSchema: z.object({ fest_name: z.string().describe("Name of the festival, e.g. Thomso") })
    },
    async ({ fest_name }) => {
      const q = fest_name.toLowerCase();
      const fest = eventsData.fests.find((f) => f.name.toLowerCase().includes(q));
      if (!fest) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: `No festival found matching '${fest_name}'.`,
                availableFests: eventsData.fests.map((f) => f.name)
              })
            }
          ]
        };
      }
      return { content: [{ type: "text", text: JSON.stringify(fest) }] };
    }
  );

  return server;
}

// ---------- Session store ----------
// MCP's handshake is stateful: `initialize` creates a session, every request
// after that must be routed back to the SAME transport instance (matched by
// the Mcp-Session-Id header), not a fresh one.
const transports: Record<string, NodeStreamableHTTPServerTransport> = {};

function isInitializeRequest(body: unknown): boolean {
  return typeof body === "object" && body !== null && (body as any).method === "initialize";
}

const app = createMcpExpressApp();

app.post("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  let transport: NodeStreamableHTTPServerTransport;

  if (sessionId && transports[sessionId]) {
    transport = transports[sessionId];
  } else if (!sessionId && isInitializeRequest(req.body)) {
    transport = new NodeStreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sid) => {
        transports[sid] = transport;
      }
    });

    transport.onclose = () => {
      if (transport.sessionId) delete transports[transport.sessionId];
    };

    const server = createServer();
    await server.connect(transport);
  } else {
    res.status(400).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Bad Request: No valid session ID provided" },
      id: null
    });
    return;
  }

  await transport.handleRequest(req, res, req.body);
});

app.get("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send("Invalid or missing session ID");
    return;
  }
  await transports[sessionId].handleRequest(req, res);
});

app.delete("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send("Invalid or missing session ID");
    return;
  }
  await transports[sessionId].handleRequest(req, res);
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", server: "events-mcp-server", port: PORT });
});

app.listen(PORT, () => {
  console.log(`Events MCP Server running on http://localhost:${PORT}`);
  console.log(`  MCP endpoint: http://localhost:${PORT}/mcp`);
});