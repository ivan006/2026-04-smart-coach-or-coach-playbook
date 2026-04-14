import { useState } from "react";
import DiagramView from "./DiagramView";
import CoordsView from "./CoordsView";
import AsciiView from "./AsciiView";

export const COLS = 11;
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
    { id: 5, x: 6, y: 1 },
    { id: 6, x: 6, y: 3 },
    { id: 7, x: 6, y: 5 },
    { id: 8, x: 6, y: 7 },
    { id: 9, x: 6, y: 9 },
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
    { id: 6, x: 6, y: 1 },
    { id: 7, x: 6, y: 3 },
    { id: 8, x: 6, y: 5 },
    { id: 9, x: 6, y: 7 },
    { id: 10, x: 6, y: 9 },
    { id: 11, x: 9, y: 5 },
  ],
};

export function mirrorFormation(team: Team): Team {
  return team.map((p) => ({ ...p, x: 12 - p.x }));
}

export const defaultUs = (): Team => FORMATIONS["4-4-2"];
export const defaultThem = (): Team => mirrorFormation(FORMATIONS["4-4-2"]);

export default function ActPage() {
  const [us, setUs] = useState<Team>(defaultUs);
  const [them, setThem] = useState<Team>(defaultThem);
  const [showThem, setShowThem] = useState(true);

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

  return (
    <div className="ml-20 min-h-screen p-6 space-y-10">
      <div className="flex items-center gap-3">
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
      <DiagramView
        us={us}
        them={them}
        showThem={showThem}
        onMove={handleMove}
        onSetUs={setUs}
        onSetThem={setThem}
      />
      <CoordsView
        us={us}
        them={them}
        onUsChange={setUs}
        onThemChange={setThem}
      />
      <AsciiView us={us} them={showThem ? them : []} />
    </div>
  );
}
