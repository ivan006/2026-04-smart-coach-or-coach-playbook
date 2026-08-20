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
   * ==========================================
   * TOP VIEW — X × Z
   * ==========================================
   *
   * Looking DOWN along Y.
   *
   * X = strip length
   * Z = strip width
   *
   * The strip therefore appears as:
   *
   *   ┌─────────────────────────────┐
   *   │                             │
   *   │                             │
   *   │           STRIP             │
   *   │                             │
   *   └─────────────────────────────┘
   *
   * Bristles are travelling in Y, so
   * they are NOT visible in this view.
   */

  const topWidth = Math.min(700, Math.max(180, stripLength * 3));

  const topHeight = Math.max(30, Math.min(400, stripWidth * 3));

  /*
   * ==========================================
   * SIDE VIEW — Y × Z
   * ==========================================
   *
   * Looking along X.
   *
   * Y = horizontal
   * Z = vertical
   *
   * This is the view you were describing:
   *
   *                BRISTLES
   *             ────────────────→
   *
   *       ┌───┬─────────────────
   *       │   │
   *       │   │
   *       │   │
   *       └───┴─────────────────
   *
   *       ↑
   *      2 mm
   *
   * The BASE is exactly:
   *
   *       Z = user-defined width
   *       Y = fixed 2 mm
   *
   * Bristles extend from its Y-facing side.
   *
   * X / strip length is NOT shown here.
   */

  const sideScale = 3;

  const sideBaseHeight = Math.max(30, Math.min(500, stripWidth * sideScale));

  const sideBaseThickness = Math.max(1, stripThickness * sideScale);

  const sideBristleLength = Math.max(
    30,
    Math.min(400, bristleLength * sideScale),
  );

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Preview</h2>

        <p className="mt-1 text-sm text-gray-500">
          X = length · Y = thickness / bristle direction · Z = width
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* ======================================
            TOP VIEW
        ====================================== */}

        <ViewBox title="Top view — X × Z">
          <div
            className="relative shrink-0 rounded border-2 border-gray-700 bg-gray-400"
            style={{
              width: `${topWidth}px`,
              height: `${topHeight}px`,
            }}
          />
        </ViewBox>

        {/* ======================================
            SIDE VIEW
        ====================================== */}

        <ViewBox title="Side view — Y × Z">
          <div
            className="relative shrink-0"
            style={{
              width: `${sideBaseThickness + sideBristleLength}px`,
              height: `${sideBaseHeight}px`,
            }}
          >
            {/* ==================================
                STRIP BASE

                Y = EXACTLY 2 mm
                Z = USER-DEFINED WIDTH

                This is ONE rectangle.
                ================================== */}

            <div
              className="absolute left-0 top-0 rounded border-2 border-gray-700 bg-gray-400"
              style={{
                width: `${sideBaseThickness}px`,
                height: `${sideBaseHeight}px`,
              }}
            />

            {/* ==================================
                BRISTLES

                They start at the OUTER Y FACE
                of the 2 mm strip and travel
                horizontally in Y.
                ================================== */}

            <div
              className="absolute top-0"
              style={{
                left: `${sideBaseThickness}px`,
                width: `${sideBristleLength}px`,
                height: `${sideBaseHeight}px`,
              }}
            >
              {Array.from({
                length: bristleCount,
              }).map((_, index) => {
                const z =
                  bristleCount <= 1
                    ? sideBaseHeight / 2
                    : (index / (bristleCount - 1)) * sideBaseHeight;

                return (
                  <div
                    key={index}
                    className="absolute bg-gray-900"
                    style={{
                      left: 0,
                      top: `${z}px`,
                      width: `${sideBristleLength}px`,
                      height: `${Math.max(1, bristleThickness * sideScale)}px`,
                    }}
                  />
                );
              })}
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
