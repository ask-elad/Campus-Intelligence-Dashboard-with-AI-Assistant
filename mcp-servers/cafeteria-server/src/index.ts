import { randomUUID } from "node:crypto";
import { createMcpExpressApp } from "@modelcontextprotocol/express";
import { NodeStreamableHTTPServerTransport } from "@modelcontextprotocol/node";
import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import cafeteriaData from "../data/cafeteria.json" with { type: "json" };

const PORT = process.env.PORT ? Number(process.env.PORT) : 5004;

function getTodaysMenu() {
  const weekday = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const menu = (cafeteriaData.weeklyMenu as Record<string, { breakfast: string; lunch: string; dinner: string }>)[
    weekday
  ];
  if (!menu) {
    return { day: weekday, error: `No menu found for ${weekday}` };
  }
  return {
    day: weekday,
    breakfast: { special: menu.breakfast, daily: cafeteriaData.dailyItems.breakfast },
    lunch: { special: menu.lunch, daily: cafeteriaData.dailyItems.lunch },
    dinner: { special: menu.dinner, daily: cafeteriaData.dailyItems.dinner }
  };
}

function getMenuByDay(day: string) {
  const weeklyMenu = cafeteriaData.weeklyMenu as Record<
    string,
    { breakfast: string; lunch: string; dinner: string }
  >;
  const matchKey = Object.keys(weeklyMenu).find((d) => d.toLowerCase() === day.toLowerCase());
  if (!matchKey) {
    return { error: `No menu found for '${day}'.`, availableDays: Object.keys(weeklyMenu) };
  }
  const menu = weeklyMenu[matchKey];
  return {
    day: matchKey,
    breakfast: { special: menu.breakfast, daily: cafeteriaData.dailyItems.breakfast },
    lunch: { special: menu.lunch, daily: cafeteriaData.dailyItems.lunch },
    dinner: { special: menu.dinner, daily: cafeteriaData.dailyItems.dinner }
  };
}

function searchEateries(query: string) {
  const q = query.toLowerCase();
  return cafeteriaData.eateries.filter(
    (e) =>
      e.name.toLowerCase().includes(q) ||
      e.type.toLowerCase().includes(q) ||
      e.location.toLowerCase().includes(q) ||
      e.popularItems.some((item) => item.toLowerCase().includes(q))
  );
}

function getEateryDetails(name: string) {
  const q = name.toLowerCase();
  return cafeteriaData.eateries.find((e) => e.name.toLowerCase().includes(q));
}

function createServer(): McpServer {
  const server = new McpServer({ name: "cafeteria-mcp-server", version: "1.0.0" });

  server.registerTool(
    "get_todays_menu",
    {
      description:
        "Get today's mess menu (breakfast, lunch, dinner), including both the day's special items and the always-available daily items.",
      inputSchema: z.object({})
    },
    async () => {
      return { content: [{ type: "text", text: JSON.stringify(getTodaysMenu()) }] };
    }
  );

  server.registerTool(
    "get_menu_by_day",
    {
      description: "Get the mess menu for a specific day of the week (e.g. 'Monday', 'Friday').",
      inputSchema: z.object({ day: z.string().describe("Day of the week, e.g. Monday") })
    },
    async ({ day }) => {
      return { content: [{ type: "text", text: JSON.stringify(getMenuByDay(day)) }] };
    }
  );

  server.registerTool(
    "search_eateries",
    {
      description:
        "Search campus-adjacent eateries by keyword — name, cuisine type, location, or popular menu items.",
      inputSchema: z.object({ query: z.string().describe("Search keyword or phrase") })
    },
    async ({ query }) => {
      const results = searchEateries(query);
      return { content: [{ type: "text", text: JSON.stringify({ query, count: results.length, results }) }] };
    }
  );

  server.registerTool(
    "get_eatery_details",
    {
      description: "Get full details for a specific eatery, including location, timing, and popular items.",
      inputSchema: z.object({ name: z.string().describe("Name of the eatery, e.g. 'Desi Tadka'") })
    },
    async ({ name }) => {
      const eatery = getEateryDetails(name);
      if (!eatery) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: `No eatery found matching '${name}'.`,
                availableEateries: cafeteriaData.eateries.map((e) => e.name)
              })
            }
          ]
        };
      }
      return { content: [{ type: "text", text: JSON.stringify(eatery) }] };
    }
  );

  server.registerTool(
    "get_bhawan_list",
    {
      description: "Get the list of all hostel bhawans (dormitories) on campus.",
      inputSchema: z.object({})
    },
    async () => {
      return { content: [{ type: "text", text: JSON.stringify({ bhawans: cafeteriaData.bhawans }) }] };
    }
  );

  return server;
}

const transports: Record<string, NodeStreamableHTTPServerTransport> = {};

function isInitializeRequest(body: unknown): boolean {
  return typeof body === "object" && body !== null && (body as any).method === "initialize";
}

const app = createMcpExpressApp({
  host: "0.0.0.0",
  allowedHosts: process.env.ALLOWED_HOSTS?.split(",") ?? ["localhost"]
});

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
  res.json({ status: "ok", server: "cafeteria-mcp-server", port: PORT });
});

app.listen(PORT, () => {
  console.log(`Cafeteria MCP Server running on http://localhost:${PORT}`);
  console.log(`  MCP endpoint: http://localhost:${PORT}/mcp`);
});