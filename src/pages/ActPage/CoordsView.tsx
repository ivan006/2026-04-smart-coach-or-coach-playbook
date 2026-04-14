import { useState, useEffect } from "react";
import { Team, COLS, ROWS } from "./ActPage";

function teamToText(team: Team, prefix: string): string {
  return team
    .map((p) => `${prefix}${p.id}(${p.x}/${COLS},${p.y}/${ROWS})`)
    .join("\n");
}

function buildText(us: Team, them: Team): string {
  return `# Us\n${teamToText(us, "U")}\n\n# Them\n${teamToText(them, "T")}`;
}

function parseTeamText(text: string, prefix: string): Team | null {
  const lines = text
    .trim()
    .split("\n")
    .filter((l) => l.trim() && !l.trim().startsWith("#"));
  const result: Team = [];
  for (const line of lines) {
    const m = line
      .trim()
      .match(
        new RegExp(
          `${prefix}(\\d+)\\((\\d+)(?:/${COLS})?,\\s*(\\d+)(?:/${ROWS})?\\)`,
          "i",
        ),
      );
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
  const [text, setText] = useState(() => buildText(us, them));

  useEffect(() => {
    setText(buildText(us, them));
  }, [us, them]);

  const handleChange = (val: string) => {
    setText(val);
    const parsedUs = parseTeamText(val, "U");
    const parsedThem = parseTeamText(val, "T");
    if (parsedUs) onUsChange(parsedUs);
    if (parsedThem) onThemChange(parsedThem);
  };

  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
        Coordinates
      </p>
      <p className="text-xs text-muted-foreground mb-2">
        Format: U1(x/{COLS},y/{ROWS})
      </p>
      <textarea
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        rows={26}
        spellCheck={false}
        className="w-full font-mono text-sm bg-background border border-border rounded-lg px-3 py-2 text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-border"
      />
    </div>
  );
}
