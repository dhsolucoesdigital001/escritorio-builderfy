const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

/** Studio access token required by the office server's access gate for WebSocket upgrades. */
const STUDIO_ACCESS_TOKEN = "claw3d-local-dev";

export const resolveStudioProxyGatewayUrl = (upstreamGatewayUrl?: string): string => {
  const raw = typeof upstreamGatewayUrl === "string" ? upstreamGatewayUrl.trim() : "";
  if (raw) {
    try {
      const parsed = new URL(raw);
      if (LOOPBACK_HOSTS.has(parsed.hostname)) {
        return raw;
      }
    } catch {
      // Fall through to the Studio proxy for malformed or non-URL values.
    }
  }

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const host = window.location.host;
  // Include studio_access token so the office server's access gate allows the upgrade.
  return `${protocol}://${host}/api/gateway/ws?studio_access=${STUDIO_ACCESS_TOKEN}`;
};

