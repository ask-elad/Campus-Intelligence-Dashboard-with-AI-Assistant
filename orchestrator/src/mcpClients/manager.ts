import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

export interface ServerConfig {
  name: string;
  url: string;
  label: string;
}

export interface ServerStatus {
  name: string;
  label: string;
  url: string;
  connected: boolean;
  tools: string[];
  latencyMs: number | null;
  lastChecked: string;
  error?: string;
}

export const SERVER_CONFIGS: ServerConfig[] = [
  {
    name: "library",
    url: process.env.LIBRARY_MCP_URL || "http://localhost:5001/sse",
    label: "Library (MGCL)"
  },
  {
    name: "cafeteria",
    url: process.env.CAFETERIA_MCP_URL || "http://localhost:5002/sse",
    label: "Cafeteria"
  },
  {
    name: "events",
    url: process.env.EVENTS_MCP_URL || "http://localhost:5003/sse",
    label: "Campus Events"
  },
  {
    name: "academics",
    url: process.env.ACADEMICS_MCP_URL || "http://localhost:5004/sse",
    label: "Academics"
  }
];

export const clients: Map<string, Client> = new Map();

export const toolOwnerMap: Map<string, string> = new Map();

export const serverStatuses: Map<string, ServerStatus> = new Map();

async function connectToServer(config: ServerConfig): Promise<void> {
  const startTime = Date.now();
  try {
    const transport = new SSEClientTransport(new URL(config.url));
    const client = new Client({ name: "campus-orchestrator", version: "1.0.0" }, {
      capabilities: {}
    });

    await client.connect(transport);

    const { tools } = await client.listTools();
    const toolNames = tools.map(t => t.name);

    for (const tool of toolNames) {
      toolOwnerMap.set(tool, config.name);
    }

    clients.set(config.name, client);
    const latency = Date.now() - startTime;

    serverStatuses.set(config.name, {
      name: config.name,
      label: config.label,
      url: config.url,
      connected: true,
      tools: toolNames,
      latencyMs: latency,
      lastChecked: new Date().toISOString()
    });

    console.log(`[MCP] ✓ Connected to ${config.label} (${toolNames.length} tools, ${latency}ms)`);
  } catch (err: any) {
    const latency = Date.now() - startTime;
    serverStatuses.set(config.name, {
      name: config.name,
      label: config.label,
      url: config.url,
      connected: false,
      tools: [],
      latencyMs: latency,
      lastChecked: new Date().toISOString(),
      error: err?.message || "Connection failed"
    });
    console.warn(`[MCP] ✗ Failed to connect to ${config.label}: ${err?.message}`);
  }
}

export async function initializeMcpClients(): Promise<void> {
  console.log("[MCP] Initialising MCP client connections...");
  await Promise.allSettled(SERVER_CONFIGS.map(connectToServer));
  console.log(
    `[MCP] ${clients.size}/${SERVER_CONFIGS.length} servers connected. ` +
    `Registered ${toolOwnerMap.size} tools.`
  );
}

export async function refreshServerStatus(): Promise<void> {
  await Promise.allSettled(SERVER_CONFIGS.map(connectToServer));
}

export async function callTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const serverName = toolOwnerMap.get(toolName);
  if (!serverName) {
    throw new Error(`No MCP server registered for tool: '${toolName}'`);
  }

  const client = clients.get(serverName);
  if (!client) {
    throw new Error(
      `MCP server '${serverName}' is not connected. ` +
      `Please ensure the server is running and try again.`
    );
  }

  const result = await client.callTool({ name: toolName, arguments: args });
  return result;
}

export function getAvailableTools(): Array<{
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  serverName: string;
}> {
  const tools: ReturnType<typeof getAvailableTools> = [];

  for (const [serverName, client] of clients.entries()) {
    const status = serverStatuses.get(serverName);
    if (!status || !status.connected) continue;
  }

  return tools;
}
