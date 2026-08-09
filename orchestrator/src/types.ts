export interface McpServerConfig {
  name: string;
  url: string;
}

export interface DiscoveredTool {
  serverName: string;
  toolName: string;
  description: string;
  inputSchema: unknown;
}
