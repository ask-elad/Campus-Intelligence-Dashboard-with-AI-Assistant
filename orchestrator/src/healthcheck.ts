import {
  SERVER_CONFIGS,
  serverStatuses,
  clients,
  toolOwnerMap
} from "./mcpClients/manager.js";

const HEALTH_CHECK_INTERVAL_MS = 30_000; // 30 seconds

async function probeServer(config: (typeof SERVER_CONFIGS)[0]): Promise<void> {
  try {
    const client = clients.get(config.name);

    if (!client) {
      throw new Error("Client not connected");
    }

    const { tools } = await client.listTools();

    serverStatuses.set(config.name, {
      name: config.name,
      label: config.label,
      url: config.url,
      connected: true,
      tools: tools.map(t => t.name),
      latencyMs: null,
      lastChecked: new Date().toISOString()
    });
  } catch (err: any) {
    const existing = serverStatuses.get(config.name);

    serverStatuses.set(config.name, {
      name: config.name,
      label: config.label,
      url: config.url,
      connected: false,
      tools: existing?.tools || [],
      latencyMs: null,
      lastChecked: new Date().toISOString(),
      error: err?.message || "Unreachable"
    });
  }
}

export function startHealthCheckLoop(): void {
  setInterval(async () => {
    await Promise.allSettled(SERVER_CONFIGS.map(probeServer));
  }, HEALTH_CHECK_INTERVAL_MS);
  console.log(`[Health] Health-check loop started (every ${HEALTH_CHECK_INTERVAL_MS / 1000}s)`);
}
