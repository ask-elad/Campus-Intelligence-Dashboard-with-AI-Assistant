import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { McpServerConfig, DiscoveredTool } from "../types.js";
import { log } from "../log.js";

const SERVERS: McpServerConfig[] = [
  { name: "events", url: process.env.EVENTS_MCP_URL || "" },
  { name: "cafeteria", url: process.env.CAFETERIA_MCP_URL || "" },
  { name: "library", url: process.env.LIBRARY_MCP_URL || "" },
  { name: "academics", url: process.env.ACADEMICS_MCP_URL || "" },
];

// Populated once, at startup, by connectAllServers().
// toolName -> the connected Client instance that owns it.
export const toolRoutingTable = new Map<string, Client>();

// Keep track of servers that have successfully connected.
const connectedServers = new Set<string>();

async function connectOneServer(server: McpServerConfig): Promise<DiscoveredTool[]> {
  if (!server.url) {
    log.warn("mcp.skip", { server: server.name, reason: "no URL configured" });
    return [];
  }

  const client = new Client({ name: "orchestrator", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(server.url));

  try {
    // The MCP SDK (@modelcontextprotocol/sdk 1.26.0) ships two overlapping
    // Transport interfaces across its subpath exports; the streamable-HTTP
    // transport is structurally compatible but doesn't nominally extend the
    // one Client.connect accepts. Cast is scoped to this single call.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await client.connect(transport as any);
    const { tools } = await client.listTools();

    log.info("mcp.connected", { server: server.name, tools: tools.length });

    const discovered: DiscoveredTool[] = [];

    for (const tool of tools) {
      toolRoutingTable.set(tool.name, client);

      discovered.push({
        serverName: server.name,
        toolName: tool.name,
        description: tool.description ?? "",
        inputSchema: tool.inputSchema,
      });
    }

    connectedServers.add(server.name);

    return discovered;
  } catch (err) {
    log.error("mcp.connect_failed", {
      server: server.name,
      error: (err as Error).message,
    });
    return [];
  }
}

export async function connectAllServers(
  allTools: DiscoveredTool[]
): Promise<void> {
  log.info("mcp.connecting_all");

  const results = await Promise.all(SERVERS.map(connectOneServer));
  allTools.push(...results.flat());

  log.info("mcp.ready", { tools: allTools.length });

  // Retry MCP servers that failed to connect.
  setInterval(async () => {
    const disconnectedServers = SERVERS.filter(
      (server) => server.url && !connectedServers.has(server.name)
    );

    if (disconnectedServers.length === 0) {
      return;
    }

    log.info("mcp.retry", {
      servers: disconnectedServers.map((s) => s.name),
    });

    const retryResults = await Promise.all(
      disconnectedServers.map(connectOneServer)
    );

    const newTools = retryResults.flat();

    if (newTools.length > 0) {
      allTools.push(...newTools);
      log.info("mcp.reconnect_success", { tools: allTools.length });
    }
  }, 30_000);
}

export async function callMcpTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<string> {
  const client = toolRoutingTable.get(toolName);

  if (!client) {
    throw new Error(`No server found for tool "${toolName}"`);
  }

  const result = await client.callTool({
    name: toolName,
    arguments: args,
  });

  const content = result.content as Array<{
    type: string;
    text?: string;
  }>;

  const textParts = content
    .filter((c) => c.type === "text")
    .map((c) => c.text ?? "");

  return textParts.join("\n");
}
