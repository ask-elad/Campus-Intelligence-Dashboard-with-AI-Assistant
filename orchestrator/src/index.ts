import "dotenv/config";
import { Client } from "@modelcontextprotocol/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/client";

interface McpServerConfig {
  name: string;
  url: string;
}

const SERVERS: McpServerConfig[] = [
  { name: "events", url: process.env.EVENTS_MCP_URL || "" },
  { name: "cafeteria", url: process.env.CAFETERIA_MCP_URL || "" },
  { name: "library", url: process.env.LIBRARY_MCP_URL || "" },
  { name: "academics", url: process.env.ACADEMICS_MCP_URL || "" },
];

interface DiscoveredTool {
  serverName: string;
  toolName: string;
  description: string;
}

async function connectAndListTools(server: McpServerConfig): Promise<DiscoveredTool[]> {
  if (!server.url) {
    console.warn(`  [${server.name}] SKIPPED — no URL configured in .env`);
    return [];
  }

  const client = new Client({ name: "orchestrator", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(server.url));

  try {
    await client.connect(transport);
    const { tools } = await client.listTools();

    console.log(`  [${server.name}] connected — ${tools.length} tools:`);
    for (const tool of tools) {
      console.log(`      - ${tool.name}`);
    }

    return tools.map((tool) => ({
      serverName: server.name,
      toolName: tool.name,
      description: tool.description ?? "",
    }));
  } catch (err) {
    console.error(`  [${server.name}] FAILED to connect:`, (err as Error).message);
    return [];
  }
}

async function main() {
  console.log("Connecting to all MCP servers...\n");

  const results = await Promise.all(SERVERS.map(connectAndListTools));
  const allTools = results.flat();

  console.log(`\nTotal tools discovered: ${allTools.length}`);
  console.log("Combined tool list:");
  for (const tool of allTools) {
    console.log(`  ${tool.serverName} :: ${tool.toolName}`);
  }
}

main();