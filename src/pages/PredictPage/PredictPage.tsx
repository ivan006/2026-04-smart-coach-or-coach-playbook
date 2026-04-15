import { useEffect, useRef, useCallback } from "react";
import { GameState } from "./types";
import { initState } from "./init";
import { tickState } from "./tick";
import { render } from "./render";
import { W, H, TEAM_COLOURS } from "./constants";

const TICK_MS = 1000 / 60;

export default function PredictPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(initState());
  const pausedRef = useRef(false);
  const rafRef = useRef<number>(0);

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
      render(ctx, stateRef.current);
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
      </div>

      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="rounded-lg border border-white/10"
        style={{ maxWidth: "100%", background: "#1a1a2e" }}
      />

      <div className="flex gap-6 text-xs text-white/60">
        <span>
          <span style={{ color: TEAM_COLOURS["home"] }}>■</span> Home
        </span>
        <span>
          <span style={{ color: TEAM_COLOURS["away"] }}>■</span> Away
        </span>
        <span className="text-white/30">Ball carrier shown in white</span>
      </div>
    </div>
  );
}
