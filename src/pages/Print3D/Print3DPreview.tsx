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
   * ==========================================
   * TOP VIEW
   * ==========================================
   *
   * Looking down Z.
   *
   * X = length
   * Y = thickness
   *
   * Bristles extend along Y.
   */

  const topWidth = Math.min(650, Math.max(150, stripLength * 3));

  const topStripDepth = Math.max(8, stripThickness * 8);

  const topBristleLength = Math.max(25, Math.min(180, bristleLength * 3));

  /*
   * ==========================================
   * SIDE VIEW
   * ==========================================
   *
   * Looking along Z.
   *
   * X = length
   * Z = width
   *
   * Y is depth.
   *
   * We therefore draw a pseudo-3D extrusion:
   *
   *                 BRISTLES
   *              ────────────
   *             /
   *            /
   *   ┌───────────────────────┐
   *   │                       │
   *   │                       │
   *   └───────────────────────┘
   *       ↗ 2 mm Y depth
   *
   */

  const sideWidth = Math.min(650, Math.max(150, stripLength * 3));

  const sideHeight = Math.min(350, Math.max(40, stripWidth * 3));

  // Exaggerated visually so 2 mm is actually visible.
  const depthPx = 24;

  // Bristle projection is also exaggerated.
  const bristleProjectionPx = Math.max(30, Math.min(180, bristleLength * 3));

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Preview</h2>

        <p className="mt-1 text-sm text-gray-500">
          X = length · Y = thickness/bristle direction · Z = width
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* ======================================
            TOP VIEW
        ====================================== */}

        <ViewBox title="Top view — X × Y">
          <div
            className="relative shrink-0"
            style={{
              width: `${topWidth}px`,
              paddingTop: `${topBristleLength}px`,
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

            {/* 2 MM STRIP THICKNESS */}

            <div
              className="w-full rounded border-2 border-gray-700 bg-gray-400"
              style={{
                height: `${topStripDepth}px`,
              }}
            />
          </div>
        </ViewBox>

        {/* ======================================
            SIDE VIEW
        ====================================== */}

        <ViewBox title="Side view — X × Z with Y depth">
          <div
            className="relative shrink-0"
            style={{
              width: `${sideWidth + depthPx}px`,
              height: `${sideHeight + depthPx + bristleProjectionPx}px`,
            }}
          >
            {/* BRISTLES */}

            <div
              className="absolute"
              style={{
                left: 0,
                top: 0,
                width: `${sideWidth}px`,
                height: `${bristleProjectionPx}px`,
              }}
            >
              {Array.from({
                length: bristleCount,
              }).map((_, index) => {
                const x =
                  bristleCount <= 1
                    ? 0
                    : (index / (bristleCount - 1)) * sideWidth;

                return (
                  <div
                    key={index}
                    className="absolute bg-gray-900"
                    style={{
                      left: `${x}px`,
                      top: 0,
                      width: `${Math.max(1, bristleThickness)}px`,
                      height: `${bristleProjectionPx}px`,
                    }}
                  />
                );
              })}
            </div>

            {/* FRONT FACE */}

            <div
              className="absolute border-2 border-gray-700 bg-gray-400"
              style={{
                left: 0,
                top: `${bristleProjectionPx}px`,
                width: `${sideWidth}px`,
                height: `${sideHeight}px`,
              }}
            />

            {/* TOP / DEPTH FACE */}

            <div
              className="absolute border-2 border-gray-700 bg-gray-300"
              style={{
                left: `${depthPx}px`,
                top: `${bristleProjectionPx - depthPx}px`,
                width: `${sideWidth}px`,
                height: `${sideHeight}px`,
                transform: "skewY(-20deg)",
                transformOrigin: "bottom left",
                pointerEvents: "none",
              }}
            />

            {/* DEPTH INDICATOR */}

            <div
              className="absolute text-xs font-semibold text-gray-500"
              style={{
                left: `${sideWidth + 5}px`,
                top: `${bristleProjectionPx + sideHeight / 2}px`,
              }}
            >
              2 mm Y
            </div>
          </div>
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
