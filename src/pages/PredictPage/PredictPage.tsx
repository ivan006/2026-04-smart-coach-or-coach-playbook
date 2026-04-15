import { useEffect, useRef, useCallback, useState } from "react";
import { GameState, Player } from "./types";
import { initState } from "./init";
import { tickState } from "./tick";
import { render } from "./render";
import { W, H, TEAM_COLOURS, PLAYER_RADIUS } from "./constants";

const TICK_MS = 1000 / 60;

export default function PredictPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(initState());
  const pausedRef = useRef(false);
  const rafRef = useRef<number>(0);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    player: Player;
  } | null>(null);
  const [showGrid, setShowGrid] = useState(false);
  const showGridRef = useRef(false);

  useEffect(() => {
    showGridRef.current = showGrid;
  }, [showGrid]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let last = performance.now();

    function loop(now: number) {
      rafRef.current = requestAnimationFrame(loop);
      if (pausedRef.current) return;
      if (now - last >= TICK_MS) {
        last = now;
        stateRef.current = tickState(stateRef.current);
      }
      render(ctx, stateRef.current, showGridRef.current);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const togglePause = useCallback(() => {
    pausedRef.current = !pausedRef.current;
  }, []);
  const reset = useCallback(() => {
    stateRef.current = initState();
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    const hovered = stateRef.current.players.find((p) => {
      const dx = p.pos.x - mx;
      const dy = p.pos.y - my;
      return Math.sqrt(dx * dx + dy * dy) < PLAYER_RADIUS + 6;
    });

    if (hovered) {
      pausedRef.current = true;
      setTooltip({ x: e.clientX, y: e.clientY, player: hovered });
    } else {
      setTooltip(null);
      pausedRef.current = false;
    }
  }, []);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (tooltip) {
        setTooltip(null);
        return;
      }
      handleClick(e);
    },
    [tooltip, handleClick],
  );

  return (
    <div className="flex flex-col items-center gap-3 p-4">
      <div className="flex gap-3">
        <button
          onClick={togglePause}
          className="px-4 py-1.5 text-sm border border-white/20 rounded hover:bg-white/10 text-white"
        >
          Pause / Resume
        </button>
        <button
          onClick={reset}
          className="px-4 py-1.5 text-sm border border-white/20 rounded hover:bg-white/10 text-white"
        >
          Reset
        </button>
        <button
          onClick={() => setShowGrid((g) => !g)}
          className={`px-4 py-1.5 text-sm border rounded text-white ${showGrid ? "border-blue-400/60 bg-blue-400/10" : "border-white/20 hover:bg-white/10"}`}
        >
          {showGrid ? "Hide Grid" : "Show Grid"}
        </button>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          onClick={handleCanvasClick}
          className="rounded-lg border border-white/10 cursor-pointer"
          style={{ maxWidth: "100%", background: "#1a1a2e" }}
        />

        {tooltip && (
          <div
            className="fixed z-50 pointer-events-none"
            style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}
          >
            <div className="bg-black/90 border border-white/20 rounded px-3 py-2 text-xs text-white space-y-0.5 min-w-[160px]">
              <div
                className="font-bold text-sm"
                style={{ color: TEAM_COLOURS[tooltip.player.teamId] }}
              >
                #{tooltip.player.id} — {tooltip.player.teamId}
              </div>
              <div>
                <span className="text-white/50">squad:</span>{" "}
                {tooltip.player.squadRole}
              </div>
              <div>
                <span className="text-white/50">action:</span>{" "}
                {tooltip.player.action}
              </div>
              <div>
                <span className="text-white/50">has ball:</span>{" "}
                {tooltip.player.hasBall ? "yes" : "no"}
              </div>
              <div>
                <span className="text-white/50">pressure:</span>{" "}
                {tooltip.player.pressure}
              </div>
              <div>
                <span className="text-white/50">deferring:</span>{" "}
                {tooltip.player.deferring ? "yes" : "no"}
              </div>
              <div>
                <span className="text-white/50">cooldown:</span>{" "}
                {tooltip.player.tackleCooldown}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-6 text-xs text-white/60">
        <span>
          <span style={{ color: TEAM_COLOURS["home"] }}>■</span> Home
        </span>
        <span>
          <span style={{ color: TEAM_COLOURS["away"] }}>■</span> Away
        </span>
        {showGrid && (
          <span>
            <span style={{ color: "rgba(100,180,255,0.8)" }}>—</span> radial (τ){" "}
            <span style={{ color: "rgba(255,140,80,0.8)" }}>—</span> tangential
            (σ)
          </span>
        )}
        <span className="text-white/30">Hover player for debug info</span>
      </div>
    </div>
  );
}
