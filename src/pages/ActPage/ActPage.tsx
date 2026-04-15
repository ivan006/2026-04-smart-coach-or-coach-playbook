import { useState } from "react";
import DiagramView from "./DiagramView";
import CoordsView from "./CoordsView";
import AsciiView from "./AsciiView";

export const COLS = 12;
export const ROWS = 9;

export interface Player {
  id: number;
  x: number;
  y: number;
}
export type Team = Player[];

export const FORMATIONS: Record<string, Team> = {
  "4-4-2": [
    { id: 1, x: 1, y: 5 },
    { id: 2, x: 3, y: 2 },
    { id: 3, x: 3, y: 4 },
    { id: 4, x: 3, y: 6 },
    { id: 5, x: 3, y: 8 },
    { id: 6, x: 6, y: 2 },
    { id: 7, x: 6, y: 4 },
    { id: 8, x: 6, y: 6 },
    { id: 9, x: 6, y: 8 },
    { id: 10, x: 9, y: 4 },
    { id: 11, x: 9, y: 6 },
  ],
  "4-3-3": [
    { id: 1, x: 1, y: 5 },
    { id: 2, x: 3, y: 2 },
    { id: 3, x: 3, y: 4 },
    { id: 4, x: 3, y: 6 },
    { id: 5, x: 3, y: 8 },
    { id: 6, x: 6, y: 3 },
    { id: 7, x: 6, y: 5 },
    { id: 8, x: 6, y: 7 },
    { id: 9, x: 9, y: 2 },
    { id: 10, x: 9, y: 5 },
    { id: 11, x: 9, y: 8 },
  ],
  "4-2-3-1": [
    { id: 1, x: 1, y: 5 },
    { id: 2, x: 3, y: 2 },
    { id: 3, x: 3, y: 4 },
    { id: 4, x: 3, y: 6 },
    { id: 5, x: 3, y: 8 },
    { id: 6, x: 5, y: 4 },
    { id: 7, x: 5, y: 6 },
    { id: 8, x: 7, y: 2 },
    { id: 9, x: 7, y: 5 },
    { id: 10, x: 7, y: 8 },
    { id: 11, x: 9, y: 5 },
  ],
  "3-5-2": [
    { id: 1, x: 1, y: 5 },
    { id: 2, x: 3, y: 3 },
    { id: 3, x: 3, y: 5 },
    { id: 4, x: 3, y: 7 },
    { id: 5, x: 5, y: 1 },
    { id: 6, x: 5, y: 3 },
    { id: 7, x: 5, y: 5 },
    { id: 8, x: 5, y: 7 },
    { id: 9, x: 5, y: 9 },
    { id: 10, x: 9, y: 4 },
    { id: 11, x: 9, y: 6 },
  ],
  "5-3-2": [
    { id: 1, x: 1, y: 5 },
    { id: 2, x: 3, y: 1 },
    { id: 3, x: 3, y: 3 },
    { id: 4, x: 3, y: 5 },
    { id: 5, x: 3, y: 7 },
    { id: 6, x: 3, y: 9 },
    { id: 7, x: 6, y: 3 },
    { id: 8, x: 6, y: 5 },
    { id: 9, x: 6, y: 7 },
    { id: 10, x: 9, y: 4 },
    { id: 11, x: 9, y: 6 },
  ],
  "4-5-1": [
    { id: 1, x: 1, y: 5 },
    { id: 2, x: 3, y: 2 },
    { id: 3, x: 3, y: 4 },
    { id: 4, x: 3, y: 6 },
    { id: 5, x: 3, y: 8 },
    { id: 6, x: 5, y: 1 },
    { id: 7, x: 5, y: 3 },
    { id: 8, x: 5, y: 5 },
    { id: 9, x: 5, y: 7 },
    { id: 10, x: 5, y: 9 },
    { id: 11, x: 9, y: 5 },
  ],
};

export function mirrorFormation(team: Team): Team {
  return team.map((p) => ({ ...p, x: 13 - p.x }));
}

export const defaultUs = (): Team => FORMATIONS["4-4-2"];
export const defaultThem = (): Team => mirrorFormation(FORMATIONS["4-4-2"]);

// For each x-line, push the outermost players (min/max y) one x forward
function applyStagger(team: Team, direction: 1 | -1 = 1): Team {
  return team.map((p) => {
    if (p.y <= 3 || p.y >= 7)
      return { ...p, x: Math.max(1, Math.min(COLS, p.x + direction)) };
    return p;
  });
}

function applyCompact(team: Team, direction: 1 | -1 = 1): Team {
  const origin = direction === 1 ? 3 : 10;
  return team.map((p) => {
    if (p.id === 1) return p;
    const dist = p.x - origin;
    const newX = Math.round(origin + dist * (2 / 3));
    return { ...p, x: Math.max(1, Math.min(COLS, newX)) };
  });
}

function matchesFormation(team: Team, formation: Team): boolean {
  const sorted = (t: Team) =>
    [...t]
      .sort((a, b) => a.id - b.id)
      .map((p) => `${p.x},${p.y}`)
      .join("|");
  return sorted(team) === sorted(formation);
}

export default function ActPage() {
  const [us, setUs] = useState<Team>(defaultUs);
  const [them, setThem] = useState<Team>(defaultThem);
  const [showUs, setShowUs] = useState(true);
  const [showThem, setShowThem] = useState(true);
  const [stagger, setStagger] = useState(false);
  const [compress, setCompress] = useState<"back" | "fwd" | null>(null);
  const [compressY, setCompressY] = useState<"left" | "right" | null>(null);
  const [tiltTop, setTiltTop] = useState(false);
  const [tiltBottom, setTiltBottom] = useState(false);

  const handleMove = (
    team: "us" | "them",
    id: number,
    x: number,
    y: number,
  ) => {
    if (team === "us")
      setUs((prev) => prev.map((p) => (p.id === id ? { ...p, x, y } : p)));
    else setThem((prev) => prev.map((p) => (p.id === id ? { ...p, x, y } : p)));
  };

  const applyTransforms = (team: Team, dir: 1 | -1) => {
    const backOrigin = dir === 1 ? 3 : 10;
    const fwdOrigin = dir === 1 ? 10 : 3;

    const tiltOffset = (y: number) =>
      Math.round(Math.tan((15 * Math.PI) / 180) * (9 - y));
    return team.map((p) => {
      let x = p.x;
      if (compress === "back" && p.id !== 1)
        x = Math.round(backOrigin + (x - backOrigin) * (2 / 3));
      if (compress === "fwd" && p.id !== 1)
        x = Math.round(fwdOrigin + (x - fwdOrigin) * (2 / 3));
      if (stagger && (p.y <= 3 || p.y >= 7)) x = x + dir;
      if (tiltTop && p.id !== 1) x = x + tiltOffset(p.y) * dir;
      if (tiltBottom && p.id !== 1) x = x + tiltOffset(9 - p.y) * dir;
      let y = p.y;
      if (compressY === "left" && p.id !== 1)
        y = Math.round(2 + (y - 2) * (2 / 3));
      if (compressY === "right" && p.id !== 1)
        y = Math.round(8 + (y - 8) * (2 / 3));
      return {
        ...p,
        x: Math.max(1, Math.min(COLS, x)),
        y: Math.max(1, Math.min(ROWS, y)),
      };
    });
  };
  const displayUs = showUs ? applyTransforms(us, 1) : [];
  const displayThem = showThem ? applyTransforms(them, -1) : [];

  return (
    <div className="ml-20 min-h-screen p-6 space-y-10">
      <div className="flex items-center gap-4">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">
          Tactical Board
        </span>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer ml-auto">
          <input
            type="checkbox"
            checked={showUs}
            onChange={(e) => setShowUs(e.target.checked)}
          />
          Us
        </label>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={showThem}
            onChange={(e) => setShowThem(e.target.checked)}
          />
          Them
        </label>
        <div className="flex items-center gap-3 ml-auto">
          <span className="text-xs text-muted-foreground">Transforms:</span>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={stagger}
              onChange={(e) => setStagger(e.target.checked)}
            />
            Stagger
          </label>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={compress === "back"}
              onChange={(e) => setCompress(e.target.checked ? "back" : null)}
            />
            Compress back
          </label>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={compress === "fwd"}
              onChange={(e) => setCompress(e.target.checked ? "fwd" : null)}
            />
            Compress fwd
          </label>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={tiltTop}
              onChange={(e) => setTiltTop(e.target.checked)}
            />
            Tilt top
          </label>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={tiltBottom}
              onChange={(e) => setTiltBottom(e.target.checked)}
            />
            Tilt bottom
          </label>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={compressY === "left"}
              onChange={(e) => setCompressY(e.target.checked ? "left" : null)}
            />
            Compress left
          </label>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={compressY === "right"}
              onChange={(e) => setCompressY(e.target.checked ? "right" : null)}
            />
            Compress right
          </label>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground w-10">Us:</span>
          {Object.keys(FORMATIONS).map((f) => {
            const active = matchesFormation(us, FORMATIONS[f]);
            return (
              <button
                key={f}
                onClick={() => setUs(FORMATIONS[f])}
                className={`text-xs border rounded px-2 py-0.5 ${active ? "border-foreground text-foreground bg-accent" : "border-border text-muted-foreground hover:bg-accent"}`}
              >
                {f}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground w-10">Them:</span>
          {Object.keys(FORMATIONS).map((f) => {
            const active = matchesFormation(
              them,
              mirrorFormation(FORMATIONS[f]),
            );
            return (
              <button
                key={f}
                onClick={() => setThem(mirrorFormation(FORMATIONS[f]))}
                className={`text-xs border rounded px-2 py-0.5 ${active ? "border-foreground text-foreground bg-accent" : "border-border text-muted-foreground hover:bg-accent"}`}
              >
                {f}
              </button>
            );
          })}
        </div>
      </div>
      <DiagramView us={displayUs} them={displayThem} onMove={handleMove} />
      <CoordsView
        us={displayUs}
        them={displayThem}
        onUsChange={setUs}
        onThemChange={setThem}
      />
      <AsciiView us={displayUs} them={displayThem} />
    </div>
  );
}
