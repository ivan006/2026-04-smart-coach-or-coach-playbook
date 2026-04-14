import { useEffect, useRef, useState, useCallback } from "react";
import {
  decodeRLEEdges,
  drawRLEEdges,
  RLEEdges,
  RLESegmentation,
} from "@/lib/rle";

const COLORS = [
  "#e74c3c",
  "#3498db",
  "#2ecc71",
  "#f39c12",
  "#9b59b6",
  "#1abc9c",
  "#e67e22",
  "#34495e",
  "#e91e63",
  "#00bcd4",
];
const FRAME_OFFSET = 1;

interface CocoAnnotation {
  id: number;
  image_id: number;
  category_id: number;
  bbox?: [number, number, number, number];
  segmentation?: RLESegmentation | number[][];
  _rleEdges?: RLEEdges;
}

interface CocoImage {
  id: number;
  file_name: string;
  width: number;
  height: number;
  extra?: { name?: string };
}

interface CocoCategory {
  id: number;
  name: string;
}

interface CocoData {
  images: CocoImage[];
  annotations: CocoAnnotation[];
  categories: CocoCategory[];
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

function extractVideoId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

function parseFrameFromFilename(filename: string): number {
  const roboflow = filename.match(/mp4-(\d+)/i);
  if (roboflow) return parseInt(roboflow[1], 10);
  const generic = filename.match(/(\d+)(?:\.[^.]+)?$/);
  if (generic) return parseInt(generic[1], 10);
  return 0;
}

const ThinkPage = () => {
  const params = new URLSearchParams(window.location.search);

  const [ytUrl, setYtUrl] = useState(params.get("yt") || "");
  const [jsonUrl, setJsonUrl] = useState(params.get("json") || "");
  const [fps, setFps] = useState(60);
  const [refW, setRefW] = useState(1280);
  const [refH, setRefH] = useState(590);
  const [showLabels, setShowLabels] = useState(true);
  const [showMasks, setShowMasks] = useState(true);
  const [showBoxes, setShowBoxes] = useState(true);
  const [showConfig, setShowConfig] = useState(
    !params.get("yt") || !params.get("json"),
  );
  const [status, setStatus] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [seekVal, setSeekVal] = useState(0);
  const [frameInfo, setFrameInfo] = useState("frame —");

  const playerRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const seekingRef = useRef(false);
  const ytReadyRef = useRef(false);
  const cocoDataRef = useRef<CocoData | null>(null);
  const annsByFrameRef = useRef<Record<number, CocoAnnotation[]>>({});
  const catMapRef = useRef<Record<number, string>>({});
  const colorMapRef = useRef<Record<string, string>>({});
  const fpsRef = useRef(fps);
  const refWRef = useRef(refW);
  const refHRef = useRef(refH);
  const showLabelsRef = useRef(showLabels);
  const showMasksRef = useRef(showMasks);
  const showBoxesRef = useRef(showBoxes);

  useEffect(() => {
    fpsRef.current = fps;
  }, [fps]);
  useEffect(() => {
    refWRef.current = refW;
    syncPlayerSize();
  }, [refW]);
  useEffect(() => {
    refHRef.current = refH;
    syncPlayerSize();
  }, [refH]);
  useEffect(() => {
    showLabelsRef.current = showLabels;
  }, [showLabels]);
  useEffect(() => {
    showMasksRef.current = showMasks;
  }, [showMasks]);
  useEffect(() => {
    showBoxesRef.current = showBoxes;
  }, [showBoxes]);

  const syncPlayerSize = useCallback(() => {
    if (!playerRef.current) return;
    const iframe = playerRef.current.getIframe?.();
    if (iframe) {
      iframe.style.width = refWRef.current + "px";
      iframe.style.height = refHRef.current + "px";
    }
  }, []);

  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
    window.onYouTubeIframeAPIReady = () => {
      ytReadyRef.current = true;
    };
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const drawFrame = useCallback((frameIdx: number) => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap || !cocoDataRef.current) return;

    canvas.width = wrap.offsetWidth;
    canvas.height = wrap.offsetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let anns = annsByFrameRef.current[frameIdx];
    if (!anns) {
      const keys = Object.keys(annsByFrameRef.current).map(Number);
      if (!keys.length) return;
      const closest = keys.reduce((a, b) =>
        Math.abs(b - frameIdx) < Math.abs(a - frameIdx) ? b : a,
      );
      anns = annsByFrameRef.current[closest];
    }

    const annW = cocoDataRef.current.images?.[0]?.width || 512;
    const annH = cocoDataRef.current.images?.[0]?.height || 512;
    const targetW = refWRef.current;
    const targetH = refHRef.current;
    const scaleX = targetW / annW;
    const scaleY = targetH / annH;
    const vidX = (canvas.width - targetW) / 2;
    const vidY = (canvas.height - targetH) / 2;

    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(vidX, vidY, targetW, targetH);
    ctx.setLineDash([]);

    if (!anns?.length) {
      setFrameInfo(`frame ${frameIdx}`);
      return;
    }

    anns.forEach((a) => {
      const cat = catMapRef.current[a.category_id] || String(a.category_id);
      const col = colorMapRef.current[cat] || "#fff";
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;

      if (a.bbox && showBoxesRef.current) {
        const [x, y, w, h] = a.bbox;
        const dx = vidX + x * scaleX,
          dy = vidY + y * scaleY;
        ctx.fillStyle = col + "28";
        ctx.fillRect(dx, dy, w * scaleX, h * scaleY);
        ctx.strokeRect(dx, dy, w * scaleX, h * scaleY);
      }
      if (a.bbox && showLabelsRef.current) {
        const [x, y] = a.bbox;
        const dx = vidX + x * scaleX,
          dy = vidY + y * scaleY;
        const fs = Math.max(11, Math.round(12 * Math.min(scaleX, scaleY)));
        ctx.font = `bold ${fs}px monospace`;
        ctx.fillStyle = col;
        ctx.fillText(cat, dx + 3, dy > 14 ? dy - 4 : dy + fs + 2);
      }
      if (Array.isArray(a.segmentation) && a.segmentation.length) {
        const segs = Array.isArray((a.segmentation as number[][])[0])
          ? (a.segmentation as number[][])
          : [a.segmentation as number[]];
        segs.forEach((seg) => {
          if (!Array.isArray(seg) || seg.length < 6) return;
          ctx.beginPath();
          ctx.moveTo(vidX + seg[0] * scaleX, vidY + seg[1] * scaleY);
          for (let i = 2; i < seg.length; i += 2)
            ctx.lineTo(vidX + seg[i] * scaleX, vidY + seg[i + 1] * scaleY);
          ctx.closePath();
          ctx.fillStyle = col + "44";
          ctx.fill();
          ctx.stroke();
        });
      }
      if (a._rleEdges && showMasksRef.current) {
        drawRLEEdges(ctx, a._rleEdges, col, vidX, vidY, targetW, targetH);
      }
    });

    setFrameInfo(`frame ${frameIdx} · ${anns.length} ann`);
  }, []);

  const tick = useCallback(() => {
    const player = playerRef.current;
    if (!player || typeof player.getCurrentTime !== "function") {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    const t = player.getCurrentTime();
    drawFrame(Math.round(t * fpsRef.current) + FRAME_OFFSET);
    if (!seekingRef.current)
      setSeekVal((t / (player.getDuration() || 1)) * 100);
    rafRef.current = requestAnimationFrame(tick);
  }, [drawFrame]);

  const handleLoad = useCallback(async () => {
    if (!ytUrl || !jsonUrl) {
      setStatus("Please fill in both URLs.");
      return;
    }
    const vid = extractVideoId(ytUrl);
    if (!vid) {
      setStatus("Could not parse YouTube video ID.");
      return;
    }

    const p = new URLSearchParams({ yt: ytUrl, json: jsonUrl });
    history.replaceState(null, "", "?" + p.toString());

    setStatus("Fetching COCO JSON...");
    try {
      const res = await fetch(jsonUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: CocoData = await res.json();
      cocoDataRef.current = data;

      const catMap: Record<number, string> = {};
      const colorMap: Record<string, string> = {};
      const annsByFrame: Record<number, CocoAnnotation[]> = {};

      data.categories.forEach((c) => {
        catMap[c.id] = c.name;
      });
      Object.values(catMap).forEach((c, i) => {
        colorMap[c] = COLORS[i % COLORS.length];
      });

      const imgMap: Record<number, number> = {};
      data.images.forEach((img) => {
        const fname = img.extra?.name || img.file_name || "";
        imgMap[img.id] = parseFrameFromFilename(fname);
      });

      data.annotations.forEach((a) => {
        const f = imgMap[a.image_id] != null ? imgMap[a.image_id] : a.image_id;
        if (!annsByFrame[f]) annsByFrame[f] = [];
        if (
          a.segmentation &&
          !Array.isArray(a.segmentation) &&
          (a.segmentation as RLESegmentation).counts
        ) {
          a._rleEdges = decodeRLEEdges(a.segmentation as RLESegmentation);
        }
        annsByFrame[f].push(a);
      });

      catMapRef.current = catMap;
      colorMapRef.current = colorMap;
      annsByFrameRef.current = annsByFrame;

      const frameNums = Object.keys(annsByFrame)
        .map(Number)
        .sort((a, b) => a - b);
      const maxFrame = frameNums[frameNums.length - 1];
      setStatus(
        `Loaded ${data.annotations.length} annotations · ${frameNums.length} frames · range ${frameNums[0]}–${maxFrame}`,
      );
      setLoaded(true);
      setShowConfig(false);

      const tryInit = () => {
        if (!ytReadyRef.current || typeof window.YT === "undefined") {
          setTimeout(tryInit, 200);
          return;
        }
        if (playerRef.current) playerRef.current.destroy();
        playerRef.current = new window.YT.Player("yt-player", {
          videoId: vid,
          playerVars: { controls: 1, rel: 0, modestbranding: 1 },
          events: {
            onReady: () => {
              syncPlayerSize();
              if (rafRef.current) cancelAnimationFrame(rafRef.current);
              tick();
            },
          },
        });
      };
      tryInit();
    } catch (e: any) {
      setStatus("Failed to load JSON: " + e.message);
    }
  }, [ytUrl, jsonUrl, syncPlayerSize, tick]);

  useEffect(() => {
    if (params.get("yt") && params.get("json")) {
      setTimeout(() => handleLoad(), 300);
    }
  }, []);

  const handleSeekChange = (val: number) => {
    setSeekVal(val);
    const player = playerRef.current;
    if (!player || typeof player.getDuration !== "function") return;
    const t = (val / 100) * player.getDuration();
    player.seekTo(t, true);
    drawFrame(Math.round(t * fpsRef.current) + FRAME_OFFSET);
  };

  return (
    <div className="ml-20 min-h-screen p-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          COCO Video Annotation Tool
        </p>
        <button
          onClick={() => setShowConfig((v) => !v)}
          className="text-xs text-muted-foreground border border-border rounded px-2 py-1 hover:bg-accent"
        >
          {showConfig ? "Hide config" : "Config"}
        </button>
      </div>

      {showConfig && (
        <div className="bg-card border border-border rounded-xl p-4 mb-4 space-y-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground w-28">
              YouTube URL
            </label>
            <input
              value={ytUrl}
              onChange={(e) => setYtUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="flex-1 bg-background border border-border rounded px-2 py-1 text-sm text-foreground"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground w-28">
              COCO JSON URL
            </label>
            <input
              value={jsonUrl}
              onChange={(e) => setJsonUrl(e.target.value)}
              placeholder="https://raw.githubusercontent.com/..."
              className="flex-1 bg-background border border-border rounded px-2 py-1 text-sm text-foreground"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground w-28">FPS</label>
            <input
              type="range"
              min={1}
              max={120}
              value={fps}
              onChange={(e) => setFps(Number(e.target.value))}
              className="flex-1"
            />
            <input
              type="number"
              value={fps}
              onChange={(e) => setFps(Number(e.target.value))}
              className="w-16 bg-background border border-border rounded px-2 py-1 text-sm text-foreground"
            />
          </div>
          <p className="text-xs text-muted-foreground pl-28">
            Right-click video → <em>Stats for nerds</em> →{" "}
            <em>Current / Optimal Res</em> → number after @ e.g. "1280x590@
            <strong>27</strong>". Note: if using Roboflow, try{" "}
            <strong>60</strong>.
          </p>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground w-28">
              Output width px
            </label>
            <input
              type="range"
              min={100}
              max={3840}
              value={refW}
              onChange={(e) => setRefW(Number(e.target.value))}
              className="flex-1"
            />
            <input
              type="number"
              value={refW}
              onChange={(e) => setRefW(Number(e.target.value))}
              className="w-16 bg-background border border-border rounded px-2 py-1 text-sm text-foreground"
            />
          </div>
          <p className="text-xs text-muted-foreground pl-28">
            Right-click video → <em>Stats for nerds</em> →{" "}
            <em>Current / Optimal Res</em> → first number e.g. "
            <strong>1280</strong>x590"
          </p>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground w-28">
              Output height px
            </label>
            <input
              type="range"
              min={100}
              max={2160}
              value={refH}
              onChange={(e) => setRefH(Number(e.target.value))}
              className="flex-1"
            />
            <input
              type="number"
              value={refH}
              onChange={(e) => setRefH(Number(e.target.value))}
              className="w-16 bg-background border border-border rounded px-2 py-1 text-sm text-foreground"
            />
          </div>
          <p className="text-xs text-muted-foreground pl-28">
            Right-click video → <em>Stats for nerds</em> →{" "}
            <em>Current / Optimal Res</em> → second number e.g. "1280x
            <strong>590</strong>"
          </p>
          <div className="flex items-center justify-end gap-4">
            <button
              onClick={handleLoad}
              className="bg-foreground text-background text-xs rounded px-3 py-1.5 hover:opacity-90"
            >
              Load
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 mb-3 text-sm text-muted-foreground">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={showLabels}
            onChange={(e) => setShowLabels(e.target.checked)}
          />{" "}
          Labels
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={showMasks}
            onChange={(e) => setShowMasks(e.target.checked)}
          />{" "}
          Masks
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={showBoxes}
            onChange={(e) => setShowBoxes(e.target.checked)}
          />{" "}
          Boxes
        </label>
      </div>

      {status && <p className="text-xs text-muted-foreground mb-3">{status}</p>}

      {loaded && (
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => playerRef.current?.playVideo()}
            className="text-xs border border-border rounded px-2 py-1 hover:bg-accent"
          >
            Play
          </button>
          <button
            onClick={() => playerRef.current?.pauseVideo()}
            className="text-xs border border-border rounded px-2 py-1 hover:bg-accent"
          >
            Pause
          </button>
          <input
            type="range"
            min={0}
            max={100}
            step={0.1}
            value={seekVal}
            onMouseDown={() => {
              seekingRef.current = true;
            }}
            onChange={(e) => handleSeekChange(Number(e.target.value))}
            onMouseUp={() => {
              seekingRef.current = false;
            }}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {frameInfo}
          </span>
        </div>
      )}

      <div
        ref={wrapRef}
        className={`relative w-full bg-black rounded-xl overflow-hidden ${loaded ? "" : "hidden"}`}
        style={{ height: 720 }}
      >
        <div
          id="yt-player"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%)",
          }}
        />
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            border: "2px dashed rgba(255,255,255,0.4)",
            boxSizing: "border-box",
          }}
        />
      </div>

      {!loaded && (
        <div className="bg-card border border-border rounded-xl p-8">
          <p className="text-muted-foreground text-sm">
            Enter a YouTube URL and COCO JSON URL above, then click Load.
          </p>
        </div>
      )}
    </div>
  );
};

export default ThinkPage;
