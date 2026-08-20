function ViewBox({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-700">{title}</h3>

      <div className="flex min-h-64 items-center justify-center overflow-auto rounded-md bg-white p-8">
        {children}
      </div>
    </div>
  );
}

function Dimension({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <div className="text-sm text-gray-500">{label}</div>

      <div className="font-semibold text-gray-900">{value}</div>
    </div>
  );
}

interface Print3DPreviewProps {
  stripLength: number;
  stripWidth: number;
  stripThickness: number;
  bristleLength: number;
  bristleSpacing: number;
  bristleThickness: number;
}

export default function Print3DPreview({
  stripLength,
  stripWidth,
  stripThickness,
  bristleLength,
  bristleSpacing,
  bristleThickness,
}: Print3DPreviewProps) {
  const safeSpacing = Math.max(bristleSpacing, 0.1);

  const bristleCount = Math.min(Math.floor(stripLength / safeSpacing) + 1, 500);

  /*
   * TOP VIEW
   *
   * Looking down at the print bed.
   *
   *             BRISTLES
   *                ↓
   *   ─────────────────────────
   *   ┌────────────────────────┐
   *   │                        │
   *   │         STRIP          │
   *   │                        │
   *   └────────────────────────┘
   *
   * The bristles originate at the outer
   * long edge of the strip.
   */

  const topWidth = Math.min(650, Math.max(150, stripLength * 3));

  const topHeight = Math.min(300, Math.max(30, stripWidth * 3));

  const topBristleLength = Math.max(20, Math.min(180, bristleLength * 3));

  /*
   * SIDE VIEW
   *
   * Looking along the width axis.
   *
   *             BRISTLE
   *                ↑
   *                │
   *                │
   *   ─────────────┼────────────
   *   ┌────────────────────────┐
   *   │       STRIP            │
   *   └────────────────────────┘
   *
   * Here we see length × thickness.
   */

  const sideWidth = Math.min(650, Math.max(150, stripLength * 3));

  const sideThickness = Math.max(8, stripThickness * 8);

  const sideBristleHeight = Math.max(20, Math.min(180, bristleLength * 3));

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Preview</h2>

        <p className="mt-1 text-sm text-gray-500">
          Top view shows length × width. Side view shows length × thickness.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* TOP VIEW */}

        <ViewBox title="Top view — length × width">
          <div
            className="relative shrink-0"
            style={{
              width: `${topWidth}px`,
              paddingTop: `${topBristleLength}px`,
              paddingBottom: "8px",
            }}
          >
            {/* BRISTLES */}

            <div
              className="absolute left-0 top-0 flex w-full justify-between"
              style={{
                height: `${topBristleLength}px`,
              }}
            >
              {Array.from({
                length: bristleCount,
              }).map((_, index) => (
                <div
                  key={index}
                  className="bg-gray-900"
                  style={{
                    width: `${Math.max(1, bristleThickness)}px`,
                    height: "100%",
                  }}
                />
              ))}
            </div>

            {/* STRIP */}

            <div
              className="relative w-full rounded border-2 border-gray-700 bg-gray-300"
              style={{
                height: `${topHeight}px`,
              }}
            />
          </div>
        </ViewBox>

        {/* SIDE VIEW */}

        <ViewBox title="Side view — length × thickness">
          <div
            className="relative shrink-0"
            style={{
              width: `${sideWidth}px`,
              paddingTop: `${sideBristleHeight}px`,
            }}
          >
            {/* BRISTLES */}

            <div
              className="absolute left-0 top-0 flex w-full justify-between"
              style={{
                height: `${sideBristleHeight}px`,
              }}
            >
              {Array.from({
                length: bristleCount,
              }).map((_, index) => (
                <div
                  key={index}
                  className="bg-gray-900"
                  style={{
                    width: `${Math.max(1, bristleThickness)}px`,
                    height: "100%",
                  }}
                />
              ))}
            </div>

            {/* STRIP */}

            <div
              className="relative w-full rounded bg-gray-700"
              style={{
                height: `${sideThickness}px`,
              }}
            />
          </div>
        </ViewBox>
      </div>

      {/* DIMENSIONS */}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
        <Dimension label="Length" value={`${stripLength} mm`} />

        <Dimension label="Width" value={`${stripWidth} mm`} />

        <Dimension label="Thickness" value={`${stripThickness} mm`} />

        <Dimension label="Bristle length" value={`${bristleLength} mm`} />

        <Dimension label="Bristles" value={bristleCount} />
      </div>
    </section>
  );
}
