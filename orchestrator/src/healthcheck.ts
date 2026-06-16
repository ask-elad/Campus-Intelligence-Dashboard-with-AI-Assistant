import {
  SERVER_CONFIGS,
  serverStatuses,
  refreshServerStatus
} from "./mcpClients/manager.js";

const HEALTH_CHECK_INTERVAL_MS = 30_000;

export function startHealthCheckLoop(): void {
  setInterval(async () => {
    const disconnectedServers = SERVER_CONFIGS.filter(config => {
      const status = serverStatuses.get(config.name);
      return !status?.connected;
    });

    if (disconnectedServers.length === 0) {
      return;
    }

    console.log(
      `[Health] Retrying ${disconnectedServers.length} disconnected server(s)...`
    );

    await refreshServerStatus();
  }, HEALTH_CHECK_INTERVAL_MS);

  console.log(
    `[Health] Health-check loop started (every ${
      HEALTH_CHECK_INTERVAL_MS / 1000
    }s)`
  );
}