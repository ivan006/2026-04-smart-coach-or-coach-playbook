import { useState } from "react";
import { Team, COLS, ROWS } from "./ActPage";
function buildAscii(
  us: Team,
  them: Team,
  usChar: string,
  themChar: string,
): string {
  const template = [
    "+-----------+",
    "|     |     |",
    "+-+   |   +-+",
    "| |   |   | |",
    "++|  +++  |++",
    "|||  |||  |||",
    "++|  +++  |++",
    "| |   |   | |",
    "+-+   |   +-+",
    "|     |     |",
    "+-----------+",
  ];
  const rows = template.map((r) => r.split(""));
  const place = (team: Team, char: string) => {
    team.forEach((p) => {
      const row = p.y;
      const col = p.x;
      if (row >= 1 && row <= ROWS && col >= 1 && col <= COLS)
        rows[row][col] = char;
    });
  };
  place(us, usChar);
  place(them, themChar);
  const inflate = (row: string[]) =>
    row
      .map((c) => c + " ")
      .join("")
      .trimEnd();
  return rows.map((r) => inflate(r)).join("\n");
}
// get first grapheme (handles emoji as single char)
function firstGrapheme(str: string): string {
  const seg = new Intl.Segmenter().segment(str);
  const first = seg[Symbol.iterator]().next().value;
  return first ? first.segment : str[0] || "U";
}
interface Props {
  us: Team;
  them: Team;
}
export default function AsciiView({ us, them }: Props) {
  const [usChar, setUsChar] = useState("🔵");
  const [themChar, setThemChar] = useState("🔴");
  const ascii = buildAscii(us, them, usChar, themChar);
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
        ASCII
      </p>
      <div className="flex items-center gap-4 mb-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Us char</label>
          <input
            value={usChar}
            onChange={(e) => setUsChar(firstGrapheme(e.target.value) || "U")}
            className="w-12 text-center font-mono text-sm bg-background border border-border rounded px-2 py-1 text-foreground"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Them char</label>
          <input
            value={themChar}
            onChange={(e) => setThemChar(firstGrapheme(e.target.value) || "T")}
            className="w-12 text-center font-mono text-sm bg-background border border-border rounded px-2 py-1 text-foreground"
          />
        </div>
      </div>
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
  );
}
