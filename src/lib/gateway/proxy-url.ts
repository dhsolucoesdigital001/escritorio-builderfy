const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

/** Studio access token required by the office server's access gate for WebSocket upgrades. */
const STUDIO_ACCESS_TOKEN = "claw3d-local-dev";

/**
 * Resolve the WebSocket URL for connecting to the gateway via the Studio proxy.
 *
 * Background: when the gateway URL is a loopback address (localhost:18789), the browser
 * cannot reach it directly — it must route through the office server's proxy at
 * /api/gateway/ws. The proxy connects to the gateway on the server's localhost.
 *
 * Always returns the proxy URL (never the raw loopback URL), including the
 * studio_access token so the office server's access gate allows the upgrade.
 */
export const resolveStudioProxyGatewayUrl = (_upstreamGatewayUrl?: string): string => {
  // Always use the Studio proxy. The upstreamGatewayUrl (e.g. ws://localhost:18789)
  // is the gateway's address on the SERVER — the browser must go through the proxy
  // which runs on the same host as the office app.
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const host = window.location.host;
  return `${protocol}://${host}/api/gateway/ws?studio_access=${STUDIO_ACCESS_TOKEN}`;
};

