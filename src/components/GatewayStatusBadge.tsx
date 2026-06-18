"use client";

import { useEffect, useState } from "react";

type GatewayHealth = {
  ok: boolean;
  status: "connected" | "disconnected" | "error";
  url: string;
  adapterType: string;
  latencyMs?: number;
  error?: { code: string; message: string };
  checkedAt: string;
};

type Props = {
  /** Poll interval in ms. Defaults to 15s. Set to 0 to disable polling. */
  pollIntervalMs?: number;
  className?: string;
};

const STATUS_LABEL: Record<GatewayHealth["status"], string> = {
  connected: "Gateway online",
  disconnected: "Gateway offline",
  error: "Gateway error",
};

const STATUS_COLOR: Record<GatewayHealth["status"], string> = {
  connected: "bg-emerald-500",
  disconnected: "bg-amber-500",
  error: "bg-red-500",
};

/**
 * Compact server-side health badge for the gateway. Polls
 * /api/gateway-health and shows live status + latency so operators can
 * see at a glance whether the proxy can reach OpenClaw, independent of
 * the in-browser WebSocket state.
 *
 * Intended for dev / admin surfaces. The badge gracefully degrades to
 * "unknown" when the endpoint is unreachable (e.g. in production builds
 * where the route is not exposed).
 */
export function GatewayStatusBadge({ pollIntervalMs = 15_000, className }: Props) {
  const [health, setHealth] = useState<GatewayHealth | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const fetchHealth = async () => {
      if (cancelled) return;
      setIsLoading(true);
      try {
        const res = await fetch("/api/gateway-health", {
          cache: "no-store",
          // 5s is enough for the probe; the server caps its own at 4s.
          signal: AbortSignal.timeout(5_000),
        });
        const data = (await res.json().catch(() => null)) as GatewayHealth | null;
        if (!cancelled && data) {
          setHealth(data);
        }
      } catch {
        if (!cancelled) {
          setHealth({
            ok: false,
            status: "error",
            url: "",
            adapterType: "",
            error: { code: "fetch_failed", message: "Could not reach /api/gateway-health." },
            checkedAt: new Date().toISOString(),
          });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void fetchHealth();
    if (pollIntervalMs > 0) {
      const schedule = () => {
        if (cancelled) return;
        timer = setTimeout(async () => {
          await fetchHealth();
          schedule();
        }, pollIntervalMs);
      };
      schedule();
    }

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [pollIntervalMs]);

  const status: GatewayHealth["status"] = health?.status ?? "disconnected";
  const label = health ? STATUS_LABEL[status] : isLoading ? "Checking…" : "Unknown";
  const color = health ? STATUS_COLOR[status] : "bg-muted-foreground";

  const tooltip = health
    ? [
        `URL: ${health.url || "(unset)"}`,
        `Adapter: ${health.adapterType || "(unset)"}`,
        health.latencyMs !== undefined ? `Latency: ${health.latencyMs}ms` : null,
        health.error ? `Error: ${health.error.message}` : null,
        `Checked: ${new Date(health.checkedAt).toLocaleTimeString()}`,
      ]
        .filter(Boolean)
        .join("\n")
    : "Gateway status not yet known.";

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1 text-xs${className ? ` ${className}` : ""}`}
      role="status"
      aria-live="polite"
      aria-label={label}
      title={tooltip}
      data-testid="gateway-status-badge"
    >
      <span
        className={`h-2 w-2 shrink-0 rounded-full${status === "connected" ? " animate-pulse" : ""} ${color}`}
        aria-hidden
      />
      <span className="font-medium text-foreground">{label}</span>
      {health?.latencyMs !== undefined && health.latencyMs > 0 && (
        <span className="text-muted-foreground">{health.latencyMs}ms</span>
      )}
    </div>
  );
}
