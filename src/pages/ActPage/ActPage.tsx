import { useState, useEffect } from "react";
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

export function teamToText(team: Team, prefix: string): string {
  return team.map((p) => `${prefix}${p.id}(${p.x},${p.y})`).join("\n");
}

export function parseTeamText(text: string, prefix: string): Team | null {
  const lines = text
    .trim()
    .split("\n")
    .filter((l) => l.trim());
  const result: Team = [];
  for (const line of lines) {
    const m = line
      .trim()
      .match(new RegExp(`${prefix}(\\d+)\\((\\d+),(\\d+)\\)`, "i"));
    if (!m) continue;
    const id = parseInt(m[1]),
      x = parseInt(m[2]),
      y = parseInt(m[3]);
    if (id >= 1 && id <= 11 && x >= 1 && x <= COLS && y >= 1 && y <= ROWS)
      result.push({ id, x, y });
  }
  return result.length > 0 ? result : null;
}

export function buildAscii(us: Team, them: Team): string {
  const template = [
    "           |           ",
    "  + - +    |    + - +  ",
    "  |   |    |    |   |  ",
    "+ + + |  + + +  | + + +",
    "| | | |  | | |  | | | |",
    "+ + + |  + + +  | + + +",
    "  |   |    |    |   |  ",
    "  + - +    |    + - +  ",
    "           |           ",
  ];
  const rows = template.map((r) => r.split(""));
  const place = (team: Team, char: string) => {
    team.forEach((p) => {
      const row = p.y - 1,
        col = (p.x - 1) * 2;
      if (row >= 0 && row < 9 && col >= 0 && col < 23) rows[row][col] = char;
    });
  };
  place(us, "U");
  place(them, "T");
  const border = "+ - - - - - - - - - - - +";
  return [border, ...rows.map((r) => "| " + r.join("") + " |"), border].join(
    "\n",
  );
}

export default function ActPage() {
  const [us, setUs] = useState<Team>(defaultUs);
  const [them, setThem] = useState<Team>(defaultThem);
  const [usText, setUsText] = useState(() => teamToText(defaultUs(), "U"));
  const [themText, setThemText] = useState(() =>
    teamToText(defaultThem(), "T"),
  );
  const [showThem, setShowThem] = useState(true);

  const ascii = buildAscii(us, showThem ? them : []);

  useEffect(() => {
    setUsText(teamToText(us, "U"));
  }, [us]);
  useEffect(() => {
    setThemText(teamToText(them, "T"));
  }, [them]);

  const handleUsText = (val: string) => {
    setUsText(val);
    const parsed = parseTeamText(val, "U");
    if (parsed) setUs(parsed);
  };

  const handleThemText = (val: string) => {
    setThemText(val);
    const parsed = parseTeamText(val, "T");
    if (parsed) setThem(parsed);
  };

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
        usText={usText}
        themText={themText}
        onUsChange={handleUsText}
        onThemChange={handleThemText}
      />
      <AsciiView ascii={ascii} />
    </div>
  );
}
