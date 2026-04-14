import { Team, COLS, ROWS } from "./ActPage";

function buildAscii(us: Team, them: Team): string {
  const template = [
    "     |     ",
    " +-+ | +-+ ",
    " | | | | | ",
    "++ | +++ | ++",
    "|| | ||| | ||",
    "++ | +++ | ++",
    " | | | | | ",
    " +-+ | +-+ ",
    "     |     ",
  ];
  const rows = template.map((r) => r.split(""));
  const place = (team: Team, char: string) => {
    team.forEach((p) => {
      const row = p.y - 1,
        col = p.x - 1;
      if (row >= 0 && row < ROWS && col >= 0 && col < COLS)
        rows[row][col] = char;
    });
  };
  place(us, "U");
  place(them, "T");
  const inflate = (row: string[]) =>
    row
      .map((c) => c + " ")
      .join("")
      .trimEnd();
  const border = "+ - - - - - - - - - - +";
  return [border, ...rows.map((r) => "| " + inflate(r) + " |"), border].join(
    "\n",
  );
}

interface Props {
  us: Team;
  them: Team;
}

export default function AsciiView({ us, them }: Props) {
  const ascii = buildAscii(us, them);
  return (
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
  );
}
