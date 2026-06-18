import { NextResponse } from "next/server";

import { loadStudioSettings } from "@/lib/studio/settings-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Gateway health-check endpoint.
 *
 * Probes the configured upstream gateway (or the env-overridden URL) by
 * opening a short-lived WebSocket and waiting for the connect challenge.
 * The probe does NOT send a full connect frame — that would require the
 * upstream token and would show up in gateway audit logs. We only verify
 * the WebSocket handshake completes within a tight timeout.
 *
 * Response shape (200 or 503):
 *   {
 *     ok: boolean,
 *     status: "connected" | "disconnected" | "error",
 *     url: string,
 *     adapterType: string,
 *     latencyMs?: number,
 *     error?: { code: string, message: string }
 *     checkedAt: string (ISO timestamp)
 *   }
 */
export async function GET() {
  const checkedAt = new Date().toISOString();
  const settings = loadStudioSettings();
  const gateway = settings.gateway;
  const url = typeof gateway?.url === "string" ? gateway.url.trim() : "";
  const adapterType =
    typeof gateway?.adapterType === "string" && gateway.adapterType.trim()
      ? gateway.adapterType.trim()
      : "openclaw";

  if (!url) {
    return NextResponse.json(
      {
        ok: false,
        status: "error",
        adapterType,
        error: { code: "url_missing", message: "Upstream gateway URL is not configured." },
        checkedAt,
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  // Lazy import to avoid loading `ws` into the client bundle and to keep
  // the import out of the global module graph (so it never blocks the
  // app from starting if ws is missing for any reason).
  let WebSocket: typeof import("ws").WebSocket;
  try {
    ({ WebSocket } = await import("ws"));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load ws library.";
    return NextResponse.json(
      {
        ok: false,
        status: "error",
        url,
        adapterType,
        error: { code: "ws_unavailable", message },
        checkedAt,
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  const probeTimeoutMs = 4_000;
  const startedAt = Date.now();
  const wsOrigin = (() => {
    try {
      const u = new URL(url);
      const proto = u.protocol === "wss:" ? "https:" : "http:";
      const host = u.hostname === "127.0.0.1" || u.hostname === "::1" || u.hostname === "0.0.0.0"
        ? "localhost"
        : u.hostname;
      return `${proto}//${host}${u.port ? `:${u.port}` : ""}`;
    } catch {
      return "http://localhost";
    }
  })();

  const result = await new Promise<{
    ok: boolean;
    status: "connected" | "disconnected" | "error";
    latencyMs?: number;
    error?: { code: string; message: string };
  }>((resolve) => {
    let settled = false;
    const settle = (value: typeof result) => {
      if (settled) return;
      settled = true;
      try {
        ws.terminate();
      } catch {}
      resolve(value);
    };
    const timer = setTimeout(() => {
      settle({
        ok: false,
        status: "error",
        error: { code: "timeout", message: `Gateway did not respond within ${probeTimeoutMs}ms.` },
      });
    }, probeTimeoutMs);

    let ws: import("ws").WebSocket;
    try {
      ws = new WebSocket(url, { origin: wsOrigin, handshakeTimeout: probeTimeoutMs });
    } catch (err) {
      clearTimeout(timer);
      const message = err instanceof Error ? err.message : "Failed to construct WebSocket.";
      settle({
        ok: false,
        status: "error",
        error: { code: "construct_failed", message },
      });
      return;
    }

    ws.on("open", () => {
      // The socket is open. We consider that "connected enough" for the
      // health probe — it means the gateway is listening, the Origin
      // allowlist accepted us, and the protocol handshake reached the
      // OpenClaw server. We do NOT send a full connect frame because that
      // would require the token and would be observable from the gateway.
      clearTimeout(timer);
      settle({
        ok: true,
        status: "connected",
        latencyMs: Date.now() - startedAt,
      });
    });
    ws.on("close", (code: number, reasonBuf: Buffer | string) => {
      clearTimeout(timer);
      const reason =
        typeof reasonBuf === "string"
          ? reasonBuf
          : Buffer.isBuffer(reasonBuf)
            ? reasonBuf.toString()
            : "";
      // 1006 with no reason is typical when the gateway closes an
      // unauthenticated / pre-connect socket (e.g. Origin policy or
      // device-identity check). Surface that as "disconnected" with the
      // raw close info so operators can see it in the UI.
      settle({
        ok: false,
        status: "disconnected",
        error: {
          code: "closed",
          message: `Gateway closed probe (${code})${reason ? `: ${reason}` : ""}`,
        },
      });
    });
    ws.on("error", (err: Error) => {
      clearTimeout(timer);
      settle({
        ok: false,
        status: "error",
        error: { code: "socket_error", message: err.message },
      });
    });
  });

  const status = result.status === "connected" ? 200 : 503;
  return NextResponse.json(
    {
      ok: result.ok,
      status: result.status,
      url,
      adapterType,
      ...(result.latencyMs !== undefined ? { latencyMs: result.latencyMs } : {}),
      ...(result.error ? { error: result.error } : {}),
      checkedAt,
    },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}
