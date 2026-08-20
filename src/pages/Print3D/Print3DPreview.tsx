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
  const spacing = Math.max(bristleSpacing, 0.1);

  const bristleCount = Math.min(Math.floor(stripLength / spacing) + 1, 500);

  /*
   * ==================================================
   * TOP VIEW
   * ==================================================
   *
   * Looking down Z.
   *
   * X → length
   * Y → thickness / bristle direction
   *
   *             BRISTLES
   *                ↑
   *                │
   *                │
   *   ┌────────────┴─────────────┐
   *   │       2 mm THICK         │
   *   └──────────────────────────┘
   *
   */

  const topWidth = Math.min(650, Math.max(150, stripLength * 3));

  const topScale = topWidth / Math.max(stripLength, 1);

  const topStripDepth = Math.max(8, stripThickness * topScale);

  const topBristleLength = Math.max(
    25,
    Math.min(200, bristleLength * topScale),
  );

  /*
   * ==================================================
   * SIDE VIEW
   * ==================================================
   *
   * Looking along Z.
   *
   * X → horizontal
   * Z → vertical
   *
   * Y projects horizontally OUT OF THE SIDE.
   *
   * Therefore the bristles are shown horizontally,
   * NOT vertically.
   *
   *             ← BRISTLES →
   *
   *   ┌─────────────────────┐
   *   │                     │
   *   │       STRIP         │
   *   │                     │
   *   └─────────────────────┘
   *        ↑
   *       2 mm
   *
   */

  const sideWidth = Math.min(650, Math.max(150, stripLength * 3));

  const sideHeight = Math.min(350, Math.max(40, stripWidth * 3));

  /*
   * The 2 mm thickness is deliberately
   * exaggerated visually so it can be seen.
   */

  const thicknessPx = 16;

  const sideBristleLength = Math.max(30, Math.min(220, bristleLength * 3));

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Preview</h2>

        <p className="mt-1 text-sm text-gray-500">
          X = length · Y = thickness / bristle direction · Z = width
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* =========================================
            TOP VIEW
        ========================================= */}

        <ViewBox title="Top view — X × Y">
          <div
            className="relative shrink-0"
            style={{
              width: `${topWidth}px`,
              height: `${topBristleLength + topStripDepth}px`,
            }}
          >
            {/* BRISTLES — EXTEND UPWARD IN Y
                ON THIS PARTICULAR VIEW */}

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
                    width: `${Math.max(1, bristleThickness * topScale)}px`,
                    height: "100%",
                  }}
                />
              ))}
            </div>

            {/* 2 MM STRIP */}

            <div
              className="absolute bottom-0 left-0 w-full rounded border-2 border-gray-700 bg-gray-400"
              style={{
                height: `${topStripDepth}px`,
              }}
            />
          </div>
        </ViewBox>

        {/* =========================================
            SIDE VIEW
        ========================================= */}

        <ViewBox title="Side view — X × Z + Y projection">
          <div
            className="relative shrink-0"
            style={{
              width: `${sideWidth + sideBristleLength}px`,
              height: `${sideHeight}px`,
            }}
          >
            {/* STRIP FRONT FACE */}

            <div
              className="absolute border-2 border-gray-700 bg-gray-400"
              style={{
                left: 0,
                top: 0,
                width: `${sideWidth}px`,
                height: `${sideHeight}px`,
              }}
            />

            {/* 2 MM THICKNESS INDICATOR */}

            <div
              className="absolute border-y-2 border-r-2 border-gray-700 bg-gray-300"
              style={{
                left: `${sideWidth}px`,
                top: 0,
                width: `${thicknessPx}px`,
                height: `${sideHeight}px`,
              }}
            />

            {/* BRISTLES PROJECTING SIDEWAYS IN Y */}

            <div
              className="absolute flex items-center"
              style={{
                left: `${sideWidth}px`,
                top: 0,
                width: `${sideBristleLength}px`,
                height: `${sideHeight}px`,
              }}
            >
              {Array.from({
                length: bristleCount,
              }).map((_, index) => {
                const z =
                  bristleCount <= 1
                    ? sideHeight / 2
                    : (index / (bristleCount - 1)) * sideHeight;

                return (
                  <div
                    key={index}
                    className="absolute bg-gray-900"
                    style={{
                      left: 0,
                      top: `${z}px`,
                      width: `${sideBristleLength}px`,
                      height: `${Math.max(2, bristleThickness * 4)}px`,
                    }}
                  />
                );
              })}
            </div>

            {/* DIMENSION LABEL */}

            <div
              className="absolute text-xs font-semibold text-gray-500"
              style={{
                left: `${sideWidth + 5}px`,
                bottom: "-22px",
              }}
            >
              Y → {bristleLength} mm bristles
            </div>
          </div>
        </ViewBox>
      </div>

      {/* DIMENSIONS */}

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-5">
        <Dimension label="Length (X)" value={`${stripLength} mm`} />

        <Dimension label="Width (Z)" value={`${stripWidth} mm`} />

        <Dimension label="Thickness (Y)" value={`${stripThickness} mm`} />

        <Dimension label="Bristle length (Y)" value={`${bristleLength} mm`} />

        <Dimension label="Bristles" value={bristleCount} />
      </div>
    </section>
  );
}
