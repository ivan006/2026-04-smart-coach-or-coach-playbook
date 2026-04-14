import { useState, useEffect } from "react";
import { Team, COLS, ROWS } from "./ActPage";

function teamToText(team: Team, prefix: string): string {
  return team.map((p) => `${prefix}${p.id}(${p.x},${p.y})`).join("\n");
}

function parseTeamText(text: string, prefix: string): Team | null {
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

interface Props {
  us: Team;
  them: Team;
  onUsChange: (team: Team) => void;
  onThemChange: (team: Team) => void;
}

export default function CoordsView({
  us,
  them,
  onUsChange,
  onThemChange,
}: Props) {
  const [usText, setUsText] = useState(() => teamToText(us, "U"));
  const [themText, setThemText] = useState(() => teamToText(them, "T"));

  useEffect(() => {
    setUsText(teamToText(us, "U"));
  }, [us]);
  useEffect(() => {
    setThemText(teamToText(them, "T"));
  }, [them]);

  const handleUs = (val: string) => {
    setUsText(val);
    const parsed = parseTeamText(val, "U");
    if (parsed) onUsChange(parsed);
  };

  const handleThem = (val: string) => {
    setThemText(val);
    const parsed = parseTeamText(val, "T");
    if (parsed) onThemChange(parsed);
  };

  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
        Coordinates
      </p>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="text-xs text-muted-foreground mb-2">
            Us — format: U1(x,y)
          </p>
          <textarea
            value={usText}
            onChange={(e) => handleUs(e.target.value)}
            rows={11}
            spellCheck={false}
            className="w-full font-mono text-sm bg-background border border-border rounded-lg px-3 py-2 text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-border"
          />
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-2">
            Them — format: T1(x,y)
          </p>
          <textarea
            value={themText}
            onChange={(e) => handleThem(e.target.value)}
            rows={11}
            spellCheck={false}
            className="w-full font-mono text-sm bg-background border border-border rounded-lg px-3 py-2 text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-border"
          />
        </div>
      </div>
    </div>
  );
}
