import { useRef } from "react";
import { Team, COLS, ROWS, FORMATIONS, mirrorFormation } from "./ActPage";

const CELL_W = 60;
const CELL_H = 52;
const PAD = 32;

interface Props {
  us: Team;
  them: Team;
  showThem: boolean;
  onMove: (team: "us" | "them", id: number, x: number, y: number) => void;
  onSetUs: (team: Team) => void;
  onSetThem: (team: Team) => void;
}

export default function DiagramView({
  us,
  them,
  showThem,
  onMove,
  onSetUs,
  onSetThem,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{
    team: "us" | "them";
    id: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const svgW = PAD * 2 + COLS * CELL_W;
  const svgH = PAD * 2 + ROWS * CELL_H;

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
    const cx =
      PAD + (player.x - 1) * CELL_W + CELL_W / 2 + (team === "us" ? -4 : 4);
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
    onMove(dragRef.current.team, dragRef.current.id, x, y);
  };

  const onMouseUp = () => {
    dragRef.current = null;
  };

  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
        Diagram
      </p>
      <div className="flex flex-col gap-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Us:</span>
          {Object.keys(FORMATIONS).map((f) => (
            <button
              key={f}
              onClick={() => onSetUs(FORMATIONS[f])}
              className="text-xs border border-border rounded px-2 py-0.5 hover:bg-accent text-muted-foreground"
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Them:</span>
          {Object.keys(FORMATIONS).map((f) => (
            <button
              key={f}
              onClick={() => onSetThem(mirrorFormation(FORMATIONS[f]))}
              className="text-xs border border-border rounded px-2 py-0.5 hover:bg-accent text-muted-foreground"
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-auto">
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
            const cx = PAD + (p.x - 1) * CELL_W + CELL_W / 2 - 4;
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
              const cx = PAD + (p.x - 1) * CELL_W + CELL_W / 2 + 4;
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
    </div>
  );
}
