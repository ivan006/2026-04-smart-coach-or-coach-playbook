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
  /*
   * ============================================
   * AXIS RULES
   * ============================================
   *
   * X = strip length
   * Y = strip thickness / bristle direction
   * Z = strip width
   *
   * TOP VIEW:
   * Looking along Z
   * Shows X × Y
   *
   * SIDE VIEW:
   * Looking along X
   * Shows Y × Z
   */

  const spacing = Math.max(bristleSpacing, 0.1);

  const bristleCount = Math.min(Math.floor(stripLength / spacing) + 1, 500);

  /*
   * ============================================
   * TOP VIEW — X × Y
   * ============================================
   *
   * IMPORTANT:
   *
   * stripWidth is NOT used anywhere here.
   *
   * Therefore changing Z/width cannot change
   * this view.
   */

  const topScale = 3;

  const topLengthPx = Math.max(150, Math.min(700, stripLength * topScale));

  const topThicknessPx = Math.max(1, stripThickness * topScale);

  const topBristleLengthPx = Math.max(
    30,
    Math.min(400, bristleLength * topScale),
  );

  /*
   * ============================================
   * SIDE VIEW — Y × Z
   * ============================================
   *
   * IMPORTANT:
   *
   * stripLength is NOT used to determine
   * the physical dimensions of the base here.
   *
   * Width controls Z.
   * Thickness controls Y.
   */

  const sideScale = 4;

  const sideWidthPx = Math.max(30, Math.min(500, stripWidth * sideScale));

  const sideThicknessPx = Math.max(1, stripThickness * sideScale);

  const sideBristleLengthPx = Math.max(
    30,
    Math.min(400, bristleLength * sideScale),
  );

  /*
   * ============================================
   * TOP VIEW
   * X × Y
   * ============================================
   */

  const topBristles = Array.from({
    length: bristleCount,
  });

  /*
   * ============================================
   * SIDE VIEW
   * Y × Z
   *
   * Since we're looking along X, all the
   * bristles positioned at different X
   * positions overlap in this projection.
   *
   * We therefore show their projected
   * envelope rather than pretending X
   * changes the side-view geometry.
   */

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Preview</h2>

        <p className="mt-1 text-sm text-gray-500">Top: X × Y · Side: Y × Z</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* ========================================
            TOP VIEW
            X × Y
        ======================================== */}

        <ViewBox title="Top view — X × Y">
          <div
            className="relative shrink-0"
            style={{
              width: `${topLengthPx}px`,
              height: `${topBristleLengthPx + topThicknessPx}px`,
            }}
          >
            {/* BRISTLES
                distributed along X
                and extending in Y */}

            {topBristles.map((_, index) => {
              const x =
                bristleCount <= 1
                  ? 0
                  : (index / (bristleCount - 1)) * topLengthPx;

              return (
                <div
                  key={index}
                  className="absolute bg-gray-900"
                  style={{
                    left: `${x}px`,
                    bottom: `${topThicknessPx}px`,
                    width: `${Math.max(1, bristleThickness * topScale)}px`,
                    height: `${topBristleLengthPx}px`,
                  }}
                />
              );
            })}

            {/* STRIP
                X × fixed 2 mm Y */}

            <div
              className="absolute bottom-0 left-0 w-full rounded border-2 border-gray-700 bg-gray-400"
              style={{
                height: `${topThicknessPx}px`,
              }}
            />
          </div>
        </ViewBox>

        {/* ========================================
            SIDE VIEW
            Y × Z
        ======================================== */}

        <ViewBox title="Side view — Y × Z">
          <div
            className="relative shrink-0"
            style={{
              width: `${sideThicknessPx + sideBristleLengthPx}px`,
              height: `${sideWidthPx}px`,
            }}
          >
            {/* ==================================
                STRIP BASE

                Y = 2 mm
                Z = USER WIDTH

                ONE rectangle.
                ================================== */}

            <div
              className="absolute left-0 top-0 rounded border-2 border-gray-700 bg-gray-400"
              style={{
                width: `${sideThicknessPx}px`,
                height: `${sideWidthPx}px`,
              }}
            />

            {/* ==================================
                BRISTLE PROJECTION

                Starts at Y = 2 mm and extends
                further in Y.

                Because this view looks along X,
                the individual X positions overlap.
                ================================== */}

            <div
              className="absolute top-0"
              style={{
                left: `${sideThicknessPx}px`,
                width: `${sideBristleLengthPx}px`,
                height: `${sideWidthPx}px`,
              }}
            >
              {/* Projected bristle field */}

              {Array.from({
                length: Math.max(
                  1,
                  Math.min(
                    100,
                    Math.floor(
                      sideWidthPx / Math.max(bristleThickness * sideScale, 2),
                    ),
                  ),
                ),
              }).map((_, index, array) => {
                const rowHeight = sideWidthPx / array.length;

                return (
                  <div
                    key={index}
                    className="absolute left-0 bg-gray-900"
                    style={{
                      top: `${index * rowHeight}px`,
                      width: `${sideBristleLengthPx}px`,
                      height: `${Math.max(
                        1,
                        Math.min(
                          rowHeight * 0.35,
                          bristleThickness * sideScale,
                        ),
                      )}px`,
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
