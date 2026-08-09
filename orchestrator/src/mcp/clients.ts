import { Client } from "@modelcontextprotocol/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import type { McpServerConfig, DiscoveredTool } from "../types.js";

const SERVERS: McpServerConfig[] = [
  { name: "events", url: process.env.EVENTS_MCP_URL || "" },
  { name: "cafeteria", url: process.env.CAFETERIA_MCP_URL || "" },
  { name: "library", url: process.env.LIBRARY_MCP_URL || "" },
  { name: "academics", url: process.env.ACADEMICS_MCP_URL || "" },
];

// Populated once, at startup, by connectAllServers().
// toolName -> the connected Client instance that owns it.
export const toolRoutingTable = new Map<string, Client>();

async function connectOneServer(server: McpServerConfig): Promise<DiscoveredTool[]> {
  if (!server.url) {
    console.warn(`  [${server.name}] SKIPPED — no URL configured in .env`);
    return [];
  }

  const client = new Client({ name: "orchestrator", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(server.url));

  try {
    await client.connect(transport);
    const { tools } = await client.listTools();

    console.log(`  [${server.name}] connected — ${tools.length} tools`);

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

    return discovered;
  } catch (err) {
    console.error(`  [${server.name}] FAILED to connect:`, (err as Error).message);
    return [];
  }
}

/**
 * Connects to all configured MCP servers concurrently, populates the
 * module-level toolRoutingTable, and returns the combined flat list of
 * every discovered tool (used to build Groq's tool-definitions payload).
 */
export async function connectAllServers(): Promise<DiscoveredTool[]> {
  console.log("Connecting to all MCP servers...\n");
  const results = await Promise.all(SERVERS.map(connectOneServer));
  return results.flat();
}

/**
 * Calls a tool on whichever MCP server owns it (via toolRoutingTable),
 * and returns its raw text content, joined. Throws if the tool name is
 * unknown or the call fails — callers decide how to handle that
 * (agent.ts catches and returns an error string to the LLM; the
 * dashboard routes catch and return an HTTP error).
 */
export async function callMcpTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<string> {
  const client = toolRoutingTable.get(toolName);
  if (!client) {
    throw new Error(`No server found for tool "${toolName}"`);
  }

  const result = await client.callTool({ name: toolName, arguments: args });
  const content = result.content as Array<{ type: string; text?: string }>;
  const textParts = content.filter((c) => c.type === "text").map((c) => c.text ?? "");
  return textParts.join("\n");
}