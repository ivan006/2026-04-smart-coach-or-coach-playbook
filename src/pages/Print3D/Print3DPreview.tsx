import { Bristle, StripParams } from "./bristleGeometry";

interface Print3DPreviewProps {
  strip: StripParams;
  bristles: Bristle[];
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

/**
 * Renders a bristle's real path (from the shared geometry module)
 * as an SVG polyline, projected onto the requested plane.
 *
 * plane "top"  -> project (X, Y), viewed from above
 * plane "side" -> project (X, Z), viewed from the side
 */
function pathToSvgPoints(
  bristle: Bristle,
  plane: "top" | "side",
  scale: number,
  originX: number,
  originY: number,
): string {
  return bristle.path
    .map((p) => {
      const px = plane === "top" ? p.x : p.x;
      const py = plane === "top" ? p.y : p.z;
      return `${(originX + px * scale).toFixed(2)},${(
        originY -
        py * scale
      ).toFixed(2)}`;
    })
    .join(" ");
}

export default function Print3DPreview({
  strip,
  bristles,
  bristleThickness,
}: Print3DPreviewProps) {
  const bristleCount = bristles.length;
  const maxTipZ = bristles.reduce(
    (max, b) => Math.max(max, b.path[b.path.length - 1]?.z ?? 0),
    strip.stripThickness,
  );

  // Both views share one scale function so they stay visually
  // consistent (e.g. bristle thickness reads the same in both).
  // Clamped so very short or very long strips still render at a
  // sane pixel size instead of collapsing to ~0px or overflowing.
  const computeScale = (spanMm: number) =>
    Math.max(1, Math.min(6, 600 / Math.max(spanMm, 1)));

  // ---- TOP VIEW: looking down the Z axis, plotting X vs Y ----
  const topScale = computeScale(strip.stripLength);
  const topSvgWidth = strip.stripLength * topScale + 20;
  const topSvgHeight = strip.stripWidth * topScale + 20;

  // ---- SIDE VIEW: looking down the Y axis, plotting X vs Z ----
  const sideScale = computeScale(strip.stripLength);
  const sideSvgWidth = strip.stripLength * sideScale + 20;
  const sideSvgHeight = maxTipZ * sideScale + 20;

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Preview</h2>

        <p className="mt-1 text-sm text-gray-500">
          Rendered directly from the same geometry used to generate G-code.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* TOP VIEW: X (length) x Y (width), looking down */}
        <ViewBox title="Top view — looking down (X × Y)">
          <svg
            width={topSvgWidth}
            height={topSvgHeight}
            viewBox={`0 0 ${topSvgWidth} ${topSvgHeight}`}
          >
            {/* strip outline */}
            <rect
              x={10}
              y={10}
              width={strip.stripLength * topScale}
              height={strip.stripWidth * topScale}
              fill="#d1d5db"
              stroke="#374151"
              strokeWidth={2}
            />

            {/* bristle footprints, viewed from above — radius
                reflects actual bristle thickness at this scale */}
            {bristles.map((b, i) => (
              <circle
                key={i}
                cx={10 + b.base.x * topScale}
                cy={10 + b.base.y * topScale}
                r={Math.max(0.75, (bristleThickness / 2) * topScale)}
                fill="#111827"
              />
            ))}
          </svg>
        </ViewBox>

        {/* SIDE VIEW: X (length) x Z (height), looking from the side */}
        <ViewBox title="Side view — looking from the side (X × Z)">
          <svg
            width={sideSvgWidth}
            height={sideSvgHeight}
            viewBox={`0 0 ${sideSvgWidth} ${sideSvgHeight}`}
          >
            {/* strip base (drawn from the bottom, since Z=0 is the bed) */}
            <rect
              x={10}
              y={sideSvgHeight - 10 - strip.stripThickness * sideScale}
              width={strip.stripLength * sideScale}
              height={strip.stripThickness * sideScale}
              fill="#d1d5db"
              stroke="#374151"
              strokeWidth={2}
            />

            {/* actual bristle paths, exactly as they'll be printed */}
            {bristles.map((b, i) => (
              <polyline
                key={i}
                points={pathToSvgPoints(
                  b,
                  "side",
                  sideScale,
                  10,
                  sideSvgHeight - 10,
                )}
                fill="none"
                stroke="#111827"
                strokeWidth={Math.max(1, 0.4 * sideScale * 0.6)}
                strokeLinecap="round"
              />
            ))}
          </svg>
        </ViewBox>
      </div>

      {/* DIMENSIONS */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-6">
        <Dimension label="Length (X)" value={`${strip.stripLength} mm`} />
        <Dimension label="Width (Y)" value={`${strip.stripWidth} mm`} />
        <Dimension label="Thickness (Z)" value={`${strip.stripThickness} mm`} />
        <Dimension
          label="Max bristle height"
          value={`${(maxTipZ - strip.stripThickness).toFixed(1)} mm`}
        />
        <Dimension label="Bristles" value={bristleCount} />
      </div>
    </section>
  );
}
