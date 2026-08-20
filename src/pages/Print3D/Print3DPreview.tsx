interface Print3DPreviewProps {
  stripLength: number;
  stripWidth: number;
  stripThickness: number;
  bristleLength: number;
  bristleSpacing: number;
  bristleThickness: number;
  bristlePositions: number[];
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
  bristlePositions,
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

  const bristleCount = bristlePositions.length;

  /*
   * ============================================
   * TOP VIEW
   * X × Y
   * ============================================
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
   * SIDE VIEW
   * Y × Z
   * ============================================
   */

  const sideScale = 4;

  const sideWidthPx = Math.max(30, Math.min(500, stripWidth * sideScale));

  const sideThicknessPx = Math.max(1, stripThickness * sideScale);

  const sideBristleLengthPx = Math.max(
    30,
    Math.min(400, bristleLength * sideScale),
  );

  /*
   * The side view looks along X.
   *
   * Therefore all bristles overlap in this
   * projection.
   *
   * Their X spacing does NOT create Z spacing.
   *
   * Instead, the actual X positions determine
   * how much of the projected bristle field
   * exists across the X direction.
   *
   * We calculate the occupied X envelope from
   * the same physical positions used above.
   */

  const projectedBristleCoverage =
    bristlePositions.length > 0
      ? Math.min(
          stripLength,
          bristlePositions[bristlePositions.length - 1] + bristleThickness,
        )
      : 0;

  /*
   * Fraction of the X strip occupied by actual
   * bristle footprints.
   *
   * This lets the side-view projection reflect
   * spacing rather than inventing Z rows.
   */
  const bristleCoverageRatio =
    stripLength > 0 ? projectedBristleCoverage / stripLength : 0;

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
            {bristlePositions.map((x, index) => (
              <div
                key={index}
                className="absolute bg-gray-900"
                style={{
                  left: `${x * topScale}px`,
                  bottom: `${topThicknessPx}px`,
                  width: `${Math.max(1, bristleThickness * topScale)}px`,
                  height: `${topBristleLengthPx}px`,
                }}
              />
            ))}

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
            {/* BASE */}

            <div
              className="absolute left-0 top-0 rounded border-2 border-gray-700 bg-gray-400"
              style={{
                width: `${sideThicknessPx}px`,
                height: `${sideWidthPx}px`,
              }}
            />

            {/* BRISTLE PROJECTION */}

            <div
              className="absolute top-0"
              style={{
                left: `${sideThicknessPx}px`,
                width: `${sideBristleLengthPx}px`,
                height: `${sideWidthPx}px`,
              }}
            >
              {bristlePositions.length > 0 && (
                <div
                  className="absolute left-0 top-0 bg-gray-900"
                  style={{
                    width: `${sideBristleLengthPx}px`,
                    height: `${Math.max(
                      1,
                      sideWidthPx * bristleCoverageRatio,
                    )}px`,
                  }}
                />
              )}
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
