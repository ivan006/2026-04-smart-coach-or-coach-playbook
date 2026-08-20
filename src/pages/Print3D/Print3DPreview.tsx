interface Print3DPreviewProps {
  stripLength: number;
  stripWidth: number;
  stripThickness: number;
  bristleLength: number;
  bristleSpacing: number;
  bristleThickness: number;
}

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
   * ============================
   * TOP VIEW
   * ============================
   *
   * Looking DOWN the Z axis.
   *
   * X = horizontal
   * Y = vertical
   *
   * Therefore this view shows:
   *
   *       X = LENGTH
   *
   *   ┌──────────────────────┐
   *   │                      │
   *   └──────────────────────┘
   *
   *          Y = 2 mm
   *
   * Bristles extend in Y.
   */

  const topWidth = Math.min(650, Math.max(150, stripLength * 3));

  const topStripHeight = Math.max(8, stripThickness * 8);

  const topBristleHeight = Math.max(20, Math.min(180, bristleLength * 3));

  /*
   * ============================
   * SIDE VIEW
   * ============================
   *
   * Looking along Y.
   *
   * X = horizontal
   * Z = vertical
   *
   * Therefore this view shows:
   *
   *       X = LENGTH
   *
   *   ┌──────────────────────┐
   *   │                      │
   *   │       Z = WIDTH      │
   *   │                      │
   *   └──────────────────────┘
   *
   * Bristles aren't visible here
   * because they project along Y.
   */

  const sideWidth = Math.min(650, Math.max(150, stripLength * 3));

  const sideHeight = Math.min(400, Math.max(30, stripWidth * 3));

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Preview</h2>

        <p className="mt-1 text-sm text-gray-500">
          X = length · Y = thickness / bristle direction · Z = width
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* ================= TOP VIEW ================= */}

        <ViewBox title="Top view — X × Y">
          <div
            className="relative shrink-0"
            style={{
              width: `${topWidth}px`,
              paddingTop: `${topBristleHeight}px`,
            }}
          >
            {/* BRISTLES */}

            <div
              className="absolute left-0 top-0 flex w-full justify-between"
              style={{
                height: `${topBristleHeight}px`,
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
              className="w-full rounded bg-gray-700"
              style={{
                height: `${topStripHeight}px`,
              }}
            />
          </div>
        </ViewBox>

        {/* ================= SIDE VIEW ================= */}

        <ViewBox title="Side view — X × Z">
          <div
            className="relative shrink-0 rounded border-2 border-gray-700 bg-gray-300"
            style={{
              width: `${sideWidth}px`,
              height: `${sideHeight}px`,
            }}
          />
        </ViewBox>
      </div>

      {/* DIMENSIONS */}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
        <Dimension label="Length (X)" value={`${stripLength} mm`} />

        <Dimension label="Width (Z)" value={`${stripWidth} mm`} />

        <Dimension label="Thickness (Y)" value={`${stripThickness} mm`} />

        <Dimension label="Bristle length (Y)" value={`${bristleLength} mm`} />

        <Dimension label="Bristles" value={bristleCount} />
      </div>
    </section>
  );
}
