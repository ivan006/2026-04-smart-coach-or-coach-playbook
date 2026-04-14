interface Props {
  ascii: string;
}

export default function AsciiView({ ascii }: Props) {
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
