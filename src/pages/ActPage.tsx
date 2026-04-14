import { useState, useRef, useCallback } from "react";

const COLS = 11;
const ROWS = 7;
const EMPTY = ".";

interface Player {
  id: number;
  x: number;
  y: number;
}

type Team = Player[];

const defaultUs = (): Team => [
  { id: 1, x: 1, y: 4 },
  { id: 2, x: 3, y: 2 },
  { id: 3, x: 3, y: 3 },
  { id: 4, x: 3, y: 5 },
  { id: 5, x: 3, y: 6 },
  { id: 6, x: 5, y: 2 },
  { id: 7, x: 5, y: 4 },
  { id: 8, x: 5, y: 6 },
  { id: 9, x: 7, y: 3 },
  { id: 10, x: 7, y: 5 },
  { id: 11, x: 9, y: 4 },
];

const defaultThem = (): Team => [
  { id: 1, x: 11, y: 4 },
  { id: 2, x: 9, y: 2 },
  { id: 3, x: 9, y: 3 },
  { id: 4, x: 9, y: 5 },
  { id: 5, x: 9, y: 6 },
  { id: 6, x: 7, y: 2 },
  { id: 7, x: 7, y: 4 },
  { id: 8, x: 7, y: 6 },
  { id: 9, x: 5, y: 3 },
  { id: 10, x: 5, y: 5 },
  { id: 11, x: 3, y: 4 },
];

function buildGrid(us: Team, them: Team): string[][] {
  const grid: string[][] = Array.from({ length: ROWS }, () =>
    Array(COLS).fill(EMPTY),
  );
  us.forEach((p) => {
    const row = p.y - 1,
      col = p.x - 1;
    if (row >= 0 && row < ROWS && col >= 0 && col < COLS) grid[row][col] = "U";
  });
  them.forEach((p) => {
    const row = p.y - 1,
      col = p.x - 1;
    if (row >= 0 && row < ROWS && col >= 0 && col < COLS) grid[row][col] = "T";
  });
  return grid;
}

function buildAscii(grid: string[][]): string {
  const top = "+" + Array(COLS).fill("-").join("-") + "+";
  const rows = grid.map((row) => "|" + row.join(" ") + "|");
  return [top, ...rows, top].join("\n");
}

const CELL_W = 60;
const CELL_H = 52;
const PAD = 32;

export default function ActPage() {
  const [us, setUs] = useState<Team>(defaultUs);
  const [them, setThem] = useState<Team>(defaultThem);
  const [showThem, setShowThem] = useState(true);
  const dragRef = useRef<{
    team: "us" | "them";
    id: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const grid = buildGrid(us, them);
  const ascii = buildAscii(grid);

  const updateUs = useCallback((id: number, field: "x" | "y", val: number) => {
    setUs((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: val } : p)),
    );
  }, []);

  const updateThem = useCallback(
    (id: number, field: "x" | "y", val: number) => {
      setThem((prev) =>
        prev.map((p) => (p.id === id ? { ...p, [field]: val } : p)),
      );
    },
    [],
  );

  const onMouseDown = (
    team: "us" | "them",
    id: number,
    e: React.MouseEvent,
  ) => {
    e.preventDefault();
    const svg = svgRef.current;
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    const player = (team === "us" ? us : them).find((p) => p.id === id)!;
    const cx = PAD + (player.x - 1) * CELL_W + CELL_W / 2;
    const cy = PAD + (player.y - 1) * CELL_H + CELL_H / 2;
    dragRef.current = { team, id, offsetX: svgP.x - cx, offsetY: svgP.y - cy };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current || !svgRef.current) return;
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    const rawX = svgP.x - dragRef.current.offsetX - PAD;
    const rawY = svgP.y - dragRef.current.offsetY - PAD;
    const x = Math.max(1, Math.min(COLS, Math.round(rawX / CELL_W) + 1));
    const y = Math.max(1, Math.min(ROWS, Math.round(rawY / CELL_H) + 1));
    const { team, id } = dragRef.current;
    if (team === "us") (updateUs(id, "x", x), updateUs(id, "y", y));
    else (updateThem(id, "x", x), updateThem(id, "y", y));
  };

  const onMouseUp = () => {
    dragRef.current = null;
  };

  const svgW = PAD * 2 + COLS * CELL_W;
  const svgH = PAD * 2 + ROWS * CELL_H;

  return (
    <div className="ml-20 min-h-screen p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">
          Tactical Board
        </span>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer ml-auto">
          <input
            type="checkbox"
            checked={showThem}
            onChange={(e) => setShowThem(e.target.checked)}
          />
          Show them
        </label>
      </div>

      <div className="overflow-auto mb-8">
        <svg
          ref={svgRef}
          width={svgW}
          height={svgH}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          style={{ cursor: "default", userSelect: "none" }}
        >
          <rect
            x={PAD}
            y={PAD}
            width={COLS * CELL_W}
            height={ROWS * CELL_H}
            fill="#2d5a1b"
            rx={4}
          />
          {Array.from({ length: ROWS + 1 }, (_, i) => (
            <line
              key={`h${i}`}
              x1={PAD}
              y1={PAD + i * CELL_H}
              x2={PAD + COLS * CELL_W}
              y2={PAD + i * CELL_H}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth={0.5}
            />
          ))}
          {Array.from({ length: COLS + 1 }, (_, i) => (
            <line
              key={`v${i}`}
              x1={PAD + i * CELL_W}
              y1={PAD}
              x2={PAD + i * CELL_W}
              y2={PAD + ROWS * CELL_H}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth={0.5}
            />
          ))}
          <line
            x1={PAD + (COLS / 2) * CELL_W}
            y1={PAD}
            x2={PAD + (COLS / 2) * CELL_W}
            y2={PAD + ROWS * CELL_H}
            stroke="rgba(255,255,255,0.3)"
            strokeWidth={1}
          />
          <ellipse
            cx={PAD + (COLS / 2) * CELL_W}
            cy={PAD + (ROWS / 2) * CELL_H}
            rx={CELL_W * 1.5}
            ry={CELL_H * 1.2}
            fill="none"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth={1}
          />
          <rect
            x={PAD}
            y={PAD + CELL_H * 2}
            width={CELL_W * 1.5}
            height={CELL_H * 3}
            fill="none"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth={1}
          />
          <rect
            x={PAD + COLS * CELL_W - CELL_W * 1.5}
            y={PAD + CELL_H * 2}
            width={CELL_W * 1.5}
            height={CELL_H * 3}
            fill="none"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth={1}
          />

          {us.map((p) => {
            const cx = PAD + (p.x - 1) * CELL_W + CELL_W / 2;
            const cy = PAD + (p.y - 1) * CELL_H + CELL_H / 2;
            return (
              <g
                key={p.id}
                onMouseDown={(e) => onMouseDown("us", p.id, e)}
                style={{ cursor: "grab" }}
              >
                <circle
                  cx={cx}
                  cy={cy}
                  r={18}
                  fill="#3b82f6"
                  stroke="white"
                  strokeWidth={1.5}
                />
                <text
                  x={cx}
                  y={cy}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="white"
                  fontSize={12}
                  fontWeight={600}
                >
                  {p.id}
                </text>
              </g>
            );
          })}

          {showThem &&
            them.map((p) => {
              const cx = PAD + (p.x - 1) * CELL_W + CELL_W / 2;
              const cy = PAD + (p.y - 1) * CELL_H + CELL_H / 2;
              return (
                <g
                  key={p.id}
                  onMouseDown={(e) => onMouseDown("them", p.id, e)}
                  style={{ cursor: "grab" }}
                >
                  <circle
                    cx={cx}
                    cy={cy}
                    r={18}
                    fill="#ef4444"
                    stroke="white"
                    strokeWidth={1.5}
                  />
                  <text
                    x={cx}
                    y={cy}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="white"
                    fontSize={12}
                    fontWeight={600}
                  >
                    {p.id}
                  </text>
                </g>
              );
            })}
        </svg>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
            Us
          </p>
          <div className="space-y-2">
            {us.map((p) => (
              <div key={p.id} className="flex items-center gap-3">
                <span className="w-6 text-xs text-muted-foreground text-right">
                  {p.id}
                </span>
                <div className="flex items-center gap-1">
                  <label className="text-xs text-muted-foreground">x</label>
                  <input
                    type="number"
                    min={1}
                    max={COLS}
                    value={p.x}
                    onChange={(e) =>
                      updateUs(
                        p.id,
                        "x",
                        Math.max(1, Math.min(COLS, Number(e.target.value))),
                      )
                    }
                    className="w-14 bg-background border border-border rounded px-2 py-1 text-sm text-foreground"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <label className="text-xs text-muted-foreground">y</label>
                  <input
                    type="number"
                    min={1}
                    max={ROWS}
                    value={p.y}
                    onChange={(e) =>
                      updateUs(
                        p.id,
                        "y",
                        Math.max(1, Math.min(ROWS, Number(e.target.value))),
                      )
                    }
                    className="w-14 bg-background border border-border rounded px-2 py-1 text-sm text-foreground"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
            Them
          </p>
          <div className="space-y-2">
            {them.map((p) => (
              <div key={p.id} className="flex items-center gap-3">
                <span className="w-6 text-xs text-muted-foreground text-right">
                  {p.id}
                </span>
                <div className="flex items-center gap-1">
                  <label className="text-xs text-muted-foreground">x</label>
                  <input
                    type="number"
                    min={1}
                    max={COLS}
                    value={p.x}
                    onChange={(e) =>
                      updateThem(
                        p.id,
                        "x",
                        Math.max(1, Math.min(COLS, Number(e.target.value))),
                      )
                    }
                    className="w-14 bg-background border border-border rounded px-2 py-1 text-sm text-foreground"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <label className="text-xs text-muted-foreground">y</label>
                  <input
                    type="number"
                    min={1}
                    max={ROWS}
                    value={p.y}
                    onChange={(e) =>
                      updateThem(
                        p.id,
                        "y",
                        Math.max(1, Math.min(ROWS, Number(e.target.value))),
                      )
                    }
                    className="w-14 bg-background border border-border rounded px-2 py-1 text-sm text-foreground"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
          ASCII
        </p>
        <p className="text-xs text-muted-foreground mb-2">
          Read-only · copy and share on WhatsApp
        </p>
        <pre className="font-mono text-sm bg-card border border-border rounded-xl p-4 leading-6 select-all">
          {ascii}
        </pre>
        <button
          onClick={() => navigator.clipboard.writeText(ascii)}
          className="mt-3 text-xs border border-border rounded px-3 py-1.5 hover:bg-accent text-muted-foreground"
        >
          Copy to clipboard
        </button>
      </div>
    </div>
  );
}
