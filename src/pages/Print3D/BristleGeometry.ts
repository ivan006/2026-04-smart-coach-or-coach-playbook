/**
 * Shared geometry + physics model for the bristle strip.
 *
 * This is the single source of truth for bristle placement and
 * shape. Both the preview and the G-code generator consume this
 * module so they can never disagree about what actually prints.
 *
 * MACHINE AXES (real printer space):
 *   X = strip length   (along the strip)
 *   Y = strip width     (across the strip)
 *   Z = vertical / up   (height off the bed)
 *
 * A bristle is NOT a vertical needle — FDM cannot print an
 * unsupported vertical filament out of thin air. Instead each
 * bristle is a short multi-segment path that rises in Z while
 * drifting a small amount in X (or X+Y), at a shallow-enough
 * angle from vertical that the extruded strand can cool and
 * self-support before gravity pulls it down. This is the same
 * trick used in "hairy" FDM fabrication techniques: print fast,
 * short, steeply-angled strands, tip-first cooling.
 */

export type Point3D = { x: number; y: number; z: number };

export type Bristle = {
  /** Base anchor point on top of the strip (x, y, z = strip top) */
  base: Point3D;
  /** Ordered path from base to tip, in real machine space */
  path: Point3D[];
};

export type StripParams = {
  stripLength: number; // X, mm
  stripWidth: number; // Y, mm
  stripThickness: number; // Z, mm (height of base slab)
};

export type BristleParams = {
  bristleLength: number; // total path length along its rise, mm
  bristleSpacingX: number; // pitch along X, mm (center-to-center)
  bristleSpacingY: number; // pitch along Y, mm (center-to-center)
  bristleThickness: number; // strand "diameter" / extrusion width, mm
  /**
   * Max lean angle from vertical (degrees) a single unsupported
   * segment can hold before drooping. ~35-45deg is a safe default
   * for most PLA at reasonable print speed. Kept as a tunable
   * constant rather than user input to avoid footguns; expose it
   * later if needed.
   */
  maxLeanAngleDeg?: number;
  /** How many straight segments make up one bristle's rise */
  segmentsPerBristle?: number;
};

export type PrinterParams = {
  filamentDiameter: number; // mm, e.g. 1.75
  nozzleDiameter: number; // mm, e.g. 0.4
  extrusionWidth: number; // mm, typically ~nozzleDiameter or slightly more
  layerHeight: number; // mm, for the base slab
};

export const DEFAULT_PRINTER: PrinterParams = {
  filamentDiameter: 1.75,
  nozzleDiameter: 0.4,
  extrusionWidth: 0.42,
  layerHeight: 0.2,
};

const MAX_BRISTLES_HARD_CAP = 4000;

/**
 * Compute how far a bristle can drift laterally per unit of Z rise
 * given the max lean angle, so a single segment stays self-supporting.
 */
function maxLateralPerZ(maxLeanAngleDeg: number): number {
  const rad = (maxLeanAngleDeg * Math.PI) / 180;
  return Math.tan(rad);
}

/**
 * Build the 2D (X,Y) tiling of bristle base positions across the
 * available strip area. This is real dense tiling: bristles are
 * placed on a grid (optionally staggered) across BOTH length and
 * width, clamped so every bristle's footprint stays fully inside
 * the strip, and capped at a hard sanity limit.
 */
export function getBristleBasePositions(
  strip: StripParams,
  bristles: BristleParams,
): { x: number; y: number }[] {
  const length = Math.max(0, strip.stripLength);
  const width = Math.max(0, strip.stripWidth);
  const thickness = Math.max(0.05, bristles.bristleThickness);
  const spacingX = Math.max(thickness, bristles.bristleSpacingX);
  const spacingY = Math.max(thickness, bristles.bristleSpacingY);

  if (length < thickness || width < thickness) {
    return [];
  }

  // Center the grid with a half-margin so bristles aren't flush
  // against the strip edges (edge bristles are the most likely to
  // rip off the base — a small margin meaningfully improves yield).
  const marginX = thickness / 2;
  const marginY = thickness / 2;

  const usableLength = length - thickness - marginX * 2;
  const usableWidth = width - thickness - marginY * 2;

  if (usableLength < 0 || usableWidth < 0) {
    return [];
  }

  const countX = Math.floor(usableLength / spacingX) + 1;
  const countY = Math.floor(usableWidth / spacingY) + 1;

  const positions: { x: number; y: number }[] = [];

  for (let iy = 0; iy < countY; iy++) {
    const y = marginY + thickness / 2 + iy * spacingY;

    // Stagger every other row along X for denser, more even
    // coverage (hexagonal-ish packing) — this is the "correctly
    // tiled" density improvement over a naive rectangular grid.
    const rowOffset = iy % 2 === 1 ? spacingX / 2 : 0;

    for (let ix = 0; ix < countX; ix++) {
      const x = marginX + thickness / 2 + ix * spacingX + rowOffset;

      if (x + thickness / 2 > length - marginX) continue;

      positions.push({ x, y });

      if (positions.length >= MAX_BRISTLES_HARD_CAP) {
        return positions;
      }
    }
  }

  return positions;
}

/**
 * Build the full 3D path for one bristle, rising from its base
 * on top of the strip. The path leans within the printable angle
 * limit, drifting laterally in X as it rises, ending in a tip.
 * Direction of lean alternates per-bristle-index so neighboring
 * bristles don't all fall the same way (reduces visual clumping
 * and slightly improves mechanical interlock/stiffness).
 */
export function buildBristlePath(
  base: { x: number; y: number },
  strip: StripParams,
  bristles: BristleParams,
  index: number,
): Bristle {
  const segments = bristles.segmentsPerBristle ?? 4;
  const totalLength = Math.max(0.5, bristles.bristleLength);

  // The lean angle is capped by TWO independent constraints, and
  // we must use whichever is stricter:
  //
  //  1. Print-physics limit (maxLeanAngleDeg): how far a strand
  //     can lean before it droops/fails to self-support.
  //  2. Available lateral clearance: the bristle must not drift
  //     laterally more than ~half the X spacing before hitting
  //     its neighbor. Without this, dense tiling + a generous
  //     lean angle causes tips to overlap or even cross behind
  //     the adjacent bristle's base (a real bug found by testing
  //     this against realistic spacing).
  //
  // Max lateral drift allowed by spacing, leaving a small margin
  // so tips don't just barely touch:
  const clearanceMargin = 0.85; // use 85% of available half-pitch
  const maxLateralBySpacing =
    (bristles.bristleSpacingX / 2 - bristles.bristleThickness / 2) *
    clearanceMargin;

  // Convert that lateral budget into an equivalent max lean angle
  // for THIS bristle's length: sin(theta) = lateral / length.
  const maxLeanBySpacingDeg =
    maxLateralBySpacing > 0
      ? (Math.asin(
          Math.min(1, maxLateralBySpacing / Math.max(totalLength, 0.001)),
        ) *
          180) /
        Math.PI
      : 0;

  const maxLeanDeg = Math.min(
    bristles.maxLeanAngleDeg ?? 35,
    maxLeanBySpacingDeg,
  );

  const zBase = strip.stripThickness;

  // Approximate: for a path of fixed total arc length rising at
  // angle theta from vertical, vertical rise per unit arc length
  // is cos(theta); lateral drift per unit arc length is sin(theta).
  // We ramp the lean in over the segments (steeper drift near the
  // tip is where hairs naturally curve) while never exceeding the
  // max printable lean per segment.
  const leanDir = index % 2 === 0 ? 1 : -1;
  const segLen = totalLength / segments;

  const path: Point3D[] = [{ x: base.x, y: base.y, z: zBase }];

  let cur = { x: base.x, y: base.y, z: zBase };

  for (let s = 1; s <= segments; s++) {
    // Lean ramps from 0 (base, vertical, for adhesion strength)
    // up to maxLeanDeg by the tip.
    const t = s / segments;
    const leanDeg = maxLeanDeg * t;
    const leanRad = (leanDeg * Math.PI) / 180;

    const dz = segLen * Math.cos(leanRad);
    const dx = segLen * Math.sin(leanRad) * leanDir;

    cur = {
      x: cur.x + dx,
      y: cur.y,
      z: cur.z + dz,
    };

    path.push({ ...cur });
  }

  return { base: { x: base.x, y: base.y, z: zBase }, path };
}

export function buildAllBristles(
  strip: StripParams,
  bristles: BristleParams,
): Bristle[] {
  const basePositions = getBristleBasePositions(strip, bristles);
  return basePositions.map((pos, i) =>
    buildBristlePath(pos, strip, bristles, i),
  );
}

/**
 * Real extrusion physics: given a path length and the filament /
 * nozzle geometry, compute how much filament (mm of filament,
 * i.e. E-axis distance) must be pushed through to deposit a bead
 * of `extrusionWidth` x `layerHeightOrStrandDiameter` cross-section
 * over that path length.
 *
 * volume_deposited = pathLength * extrusionWidth * beadHeight
 * volume_filament_per_mm = pi * (filamentDiameter/2)^2
 * E = volume_deposited / volume_filament_per_mm
 */
export function computeExtrusionForPath(
  pathLength: number,
  beadWidth: number,
  beadHeight: number,
  printer: PrinterParams,
): number {
  const filamentArea = Math.PI * Math.pow(printer.filamentDiameter / 2, 2);
  const depositedVolume = pathLength * beadWidth * beadHeight;
  return depositedVolume / filamentArea;
}

export function distance3D(a: Point3D, b: Point3D): number {
  return Math.sqrt(
    Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2) + Math.pow(a.z - b.z, 2),
  );
}
