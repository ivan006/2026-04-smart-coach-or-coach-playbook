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

export const defaultUs = (): Team => [
  { id: 1, x: 1, y: 5 },
  { id: 2, x: 3, y: 2 },
  { id: 3, x: 3, y: 4 },
  { id: 4, x: 3, y: 6 },
  { id: 5, x: 3, y: 8 },
  { id: 6, x: 5, y: 2 },
  { id: 7, x: 5, y: 5 },
  { id: 8, x: 5, y: 8 },
  { id: 9, x: 7, y: 3 },
  { id: 10, x: 7, y: 7 },
  { id: 11, x: 9, y: 5 },
];

export const defaultThem = (): Team => [
  { id: 1, x: 11, y: 5 },
  { id: 2, x: 9, y: 2 },
  { id: 3, x: 9, y: 4 },
  { id: 4, x: 9, y: 6 },
  { id: 5, x: 9, y: 8 },
  { id: 6, x: 7, y: 2 },
  { id: 7, x: 7, y: 5 },
  { id: 8, x: 7, y: 8 },
  { id: 9, x: 5, y: 3 },
  { id: 10, x: 5, y: 7 },
  { id: 11, x: 3, y: 5 },
];

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
