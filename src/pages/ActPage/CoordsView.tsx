import { Team } from "./ActPage";

interface Props {
  usText: string;
  themText: string;
  onUsChange: (val: string) => void;
  onThemChange: (val: string) => void;
}

export default function CoordsView({
  usText,
  themText,
  onUsChange,
  onThemChange,
}: Props) {
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
            onChange={(e) => onUsChange(e.target.value)}
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
            onChange={(e) => onThemChange(e.target.value)}
            rows={11}
            spellCheck={false}
            className="w-full font-mono text-sm bg-background border border-border rounded-lg px-3 py-2 text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-border"
          />
        </div>
      </div>
    </div>
  );
}
