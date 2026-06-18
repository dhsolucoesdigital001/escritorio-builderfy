"use client";

/**
 * DebugOverlay — visual status panel for the 3D office.
 *
 * Renders a small floating panel in the top-right corner of the canvas that
 * reports:
 *   - Canvas mounted state (lifecycle)
 *   - WebGL context health (live `webglcontextlost` / `webglcontextrestored`)
 *   - Gateway connection status (passed in as a prop)
 *   - Live FPS (sampled inside the Canvas via useFrame)
 *
 * Usage:
 *   <DebugOverlay
 *     gatewayStatus={gatewayStatus}
 *     activeAdapterType={activeAdapterType}
 *     roomStats={roomStats}            // optional
 *     canvasKey={canvasResetKey}       // optional, for remount visibility
 *   />
 *
 * The overlay is a pure DOM component (HTML <div>), but it accepts a child
 * <DebugFpsProbe /> placed inside the Canvas tree to feed it FPS data via
 * the shared `debugStoreRef`.
 */

import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useFrame, useThree } from "@react-three/fiber";

export type DebugRoomStats = {
  gymFloorWidth: number;
  qaFloorWidth: number;
  roomFloorHeight: number;
  districtWidth: number;
  districtHeight: number;
  showRemoteOffice: boolean;
  wallCount: number;
  furnitureCount: number;
};

export type DebugStore = {
  fps: number;
  frameMs: number;
  drawCalls: number;
  triangles: number;
  webglContextLost: boolean;
  canvasMounted: boolean;
  lastResetAt: number;
  roomStats: DebugRoomStats | null;
  gatewayStatus: string;
  activeAdapterType: string;
  lastUpdated: number;
};

const EMPTY_ROOM_STATS: DebugRoomStats = {
  gymFloorWidth: 0,
  qaFloorWidth: 0,
  roomFloorHeight: 0,
  districtWidth: 0,
  districtHeight: 0,
  showRemoteOffice: false,
  wallCount: 0,
  furnitureCount: 0,
};

const EMPTY_DEBUG_STORE: DebugStore = {
  fps: 0,
  frameMs: 0,
  drawCalls: 0,
  triangles: 0,
  webglContextLost: false,
  canvasMounted: false,
  lastResetAt: 0,
  roomStats: null,
  gatewayStatus: "unknown",
  activeAdapterType: "unknown",
  lastUpdated: 0,
};

export const createDebugStore = (): { current: DebugStore } => ({
  current: { ...EMPTY_DEBUG_STORE },
});

type DebugOverlayProps = {
  store: { current: DebugStore };
  children?: ReactNode;
  hidden?: boolean;
};

const GATEWAY_STATUS_COLOR: Record<string, string> = {
  connected: "#4ade80",
  connecting: "#fbbf24",
  disconnected: "#f87171",
  error: "#f87171",
  unknown: "#94a3b8",
};

const StatusDot = ({ color, label }: { color: string; label: string }) => (
  <div className="flex items-center gap-1.5">
    <span
      className="inline-block h-2 w-2 rounded-full"
      style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
    />
    <span className="text-[10px] uppercase tracking-wider text-white/80">
      {label}
    </span>
  </div>
);

const StatLine = ({ label, value, color }: { label: string; value: string; color?: string }) => (
  <div className="flex items-baseline justify-between gap-3 text-[10px] font-mono">
    <span className="text-white/55">{label}</span>
    <span
      className="text-right tabular-nums"
      style={{ color: color ?? "#fef3c7" }}
    >
      {value}
    </span>
  </div>
);

const DebugPanelContent = memo(function DebugPanelContent({
  store,
}: {
  store: { current: DebugStore };
}) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => (t + 1) % 1_000_000), 500);
    return () => window.clearInterval(id);
  }, []);

  const data = store.current;
  // Re-read `lastUpdated` so the interval tick triggers a re-render of fresh values.
  void tick;
  void data.lastUpdated;

  const gatewayColor =
    GATEWAY_STATUS_COLOR[data.gatewayStatus] ?? GATEWAY_STATUS_COLOR.unknown;
  const webglColor = data.webglContextLost ? "#f87171" : "#4ade80";
  const canvasColor = data.canvasMounted ? "#4ade80" : "#f87171";
  const fpsColor =
    data.fps >= 50
      ? "#4ade80"
      : data.fps >= 30
        ? "#fbbf24"
        : data.fps > 0
          ? "#f87171"
          : "#94a3b8";

  return (
    <div
      className="pointer-events-none select-none rounded-lg border border-amber-700/40 bg-[#1a1008]/85 px-3 py-2 font-mono text-white shadow-2xl backdrop-blur"
      style={{ minWidth: 200 }}
      data-testid="debug-overlay-panel"
    >
      <div className="mb-1.5 flex items-center justify-between border-b border-amber-700/30 pb-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-300/90">
          3D Debug
        </span>
        <span className="text-[9px] text-white/40">AGENT-1</span>
      </div>

      <div className="space-y-1">
        <StatusDot
          color={canvasColor}
          label={`Canvas ${data.canvasMounted ? "mounted" : "NOT mounted"}`}
        />
        <StatusDot
          color={webglColor}
          label={`WebGL ${data.webglContextLost ? "LOST" : "healthy"}`}
        />
        <StatusDot
          color={gatewayColor}
          label={`Gateway ${data.gatewayStatus} (${data.activeAdapterType})`}
        />
      </div>

      <div className="mt-2 space-y-0.5 border-t border-amber-700/30 pt-1.5">
        <StatLine label="FPS" value={data.fps.toFixed(1)} color={fpsColor} />
        <StatLine label="Frame" value={`${data.frameMs.toFixed(2)} ms`} />
        <StatLine
          label="Draw calls"
          value={data.drawCalls.toLocaleString()}
        />
        <StatLine
          label="Triangles"
          value={data.triangles.toLocaleString()}
        />
      </div>

      {data.roomStats ? (
        <div className="mt-2 space-y-0.5 border-t border-amber-700/30 pt-1.5">
          <StatLine
            label="Gym floor W"
            value={data.roomStats.gymFloorWidth.toFixed(3)}
            color={data.roomStats.gymFloorWidth > 0 ? "#4ade80" : "#f87171"}
          />
          <StatLine
            label="QA floor W"
            value={data.roomStats.qaFloorWidth.toFixed(3)}
            color={data.roomStats.qaFloorWidth > 0 ? "#4ade80" : "#f87171"}
          />
          <StatLine
            label="Room H"
            value={data.roomStats.roomFloorHeight.toFixed(3)}
          />
          <StatLine
            label="District"
            value={`${data.roomStats.districtWidth.toFixed(1)}×${data.roomStats.districtHeight.toFixed(1)}`}
          />
          <StatLine
            label="Remote"
            value={data.roomStats.showRemoteOffice ? "ON" : "OFF"}
            color={data.roomStats.showRemoteOffice ? "#4ade80" : "#94a3b8"}
          />
          <StatLine
            label="Walls"
            value={String(data.roomStats.wallCount)}
          />
          <StatLine
            label="Furniture"
            value={String(data.roomStats.furnitureCount)}
          />
        </div>
      ) : null}

      <div className="mt-1.5 border-t border-amber-700/30 pt-1 text-[9px] text-white/35">
        Updates every 500ms
      </div>
    </div>
  );
});

/**
 * DebugOverlay — the DOM half of the debug HUD.
 *
 * Mount this anywhere outside the Canvas. It uses a setInterval (not
 * useFrame) so it can render from a normal React tree.
 */
export const DebugOverlay = memo(function DebugOverlay({
  store,
  hidden = false,
}: {
  store: { current: DebugStore };
  hidden?: boolean;
}) {
  if (hidden) return null;
  return (
    <div
      className="pointer-events-none absolute right-3 top-3 z-50"
      style={{ maxWidth: 240 }}
    >
      <DebugPanelContent store={store} />
    </div>
  );
});

/**
 * DebugFpsProbe — the in-Canvas half of the debug HUD.
 *
 * Place this INSIDE the <Canvas> tree. It uses useFrame to sample FPS and
 * pulls the live WebGL info from the renderer. It also detects canvas mount
 * state via useEffect and listens for context loss events on the gl DOM
 * element.
 */
export const DebugFpsProbe = memo(function DebugFpsProbe({
  store,
}: {
  store: { current: DebugStore };
}) {
  const { gl } = useThree();
  const fpsRef = useRef({ last: performance.now(), frames: 0, fps: 0 });
  const lostRef = useRef(false);

  useEffect(() => {
    store.current.canvasMounted = true;
    store.current.lastUpdated = Date.now();
    const handleLost = (event: Event) => {
      event.preventDefault();
      lostRef.current = true;
      store.current.webglContextLost = true;
      store.current.lastUpdated = Date.now();
      console.warn(
        "[DebugFpsProbe] WebGL context lost event observed by probe.",
      );
    };
    const handleRestored = () => {
      lostRef.current = false;
      store.current.webglContextLost = false;
      store.current.lastUpdated = Date.now();
      console.log(
        "[DebugFpsProbe] WebGL context restored event observed by probe.",
      );
    };
    const el = gl.domElement;
    el.addEventListener("webglcontextlost", handleLost);
    el.addEventListener("webglcontextrestored", handleRestored);
    return () => {
      store.current.canvasMounted = false;
      store.current.lastUpdated = Date.now();
      el.removeEventListener("webglcontextlost", handleLost);
      el.removeEventListener("webglcontextrestored", handleRestored);
    };
  }, [gl, store]);

  useFrame(() => {
    const now = performance.now();
    const dt = now - fpsRef.current.last;
    fpsRef.current.frames += 1;
    if (dt >= 500) {
      const fps = (fpsRef.current.frames * 1000) / dt;
      fpsRef.current.fps = fps;
      fpsRef.current.frames = 0;
      fpsRef.current.last = now;
      store.current.fps = fps;
      store.current.frameMs = dt / Math.max(1, fpsRef.current.frames || 1);
      try {
        const info = gl.info;
        store.current.drawCalls = info.render.calls;
        store.current.triangles = info.render.triangles;
      } catch {
        // ignore — gl.info not available in some contexts
      }
      store.current.lastUpdated = Date.now();
    }
  });

  return null;
});

/**
 * useDebugStore — convenience hook that allocates a stable store ref.
 */
export const useDebugStore = () =>
  useMemo(() => createDebugStore(), []);

/**
 * updateDebugRoomStats — helper to push room stats from anywhere (e.g. from
 * FloorAndWalls during render) into the shared store.
 */
export const updateDebugRoomStats = (
  store: { current: DebugStore },
  roomStats: DebugRoomStats,
  gatewayStatus: string,
  activeAdapterType: string,
) => {
  store.current.roomStats = roomStats;
  store.current.gatewayStatus = gatewayStatus;
  store.current.activeAdapterType = activeAdapterType;
  store.current.lastUpdated = Date.now();
};

export const markDebugCanvasReset = (store: { current: DebugStore }) => {
  store.current.lastResetAt = Date.now();
  store.current.lastUpdated = Date.now();
};

export { EMPTY_ROOM_STATS, EMPTY_DEBUG_STORE };

/**
 * DebugOverlayGate — small wrapper that only mounts DebugOverlay when the
 * user opts in via `?debug=3d` in the URL. This keeps the overlay off the
 * default code path so it can't accidentally leak into production renders.
 */
export const DebugOverlayGate = memo(function DebugOverlayGate({
  store,
}: {
  store: { current: DebugStore };
}) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("debug") === "3d") {
      setEnabled(true);
      return;
    }
    // Honour the studio's DEBUG env var too (already enabled at runtime).
    try {
      const debug = (window as unknown as { __DEBUG?: boolean }).__DEBUG;
      if (debug) setEnabled(true);
    } catch {
      /* ignore */
    }
  }, []);

  if (!enabled) return null;
  return <DebugOverlay store={store} />;
});
