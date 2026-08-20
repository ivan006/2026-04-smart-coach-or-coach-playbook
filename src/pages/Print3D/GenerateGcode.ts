import {
  Bristle,
  BristleParams,
  DEFAULT_PRINTER,
  PrinterParams,
  StripParams,
  buildAllBristles,
  computeExtrusionForPath,
  distance3D,
} from "./bristleGeometry";

type GenerateOptions = {
  strip: StripParams;
  bristles: BristleParams;
  printer?: PrinterParams;
  nozzleTempC?: number;
  bedTempC?: number;
  travelFeedrate?: number; // mm/min
  extrudeFeedrateBase?: number; // mm/min, for the base slab
  extrudeFeedrateBristle?: number; // mm/min, for bristle strands (slower = better hair fidelity)
  retractDistance?: number; // mm of filament
  retractFeedrate?: number; // mm/min
  zHop?: number; // mm
};

function fmt(n: number, dp = 3): string {
  return n.toFixed(dp);
}

/**
 * Print the base slab as an actually-filled solid: multiple
 * layers to reach stripThickness, each layer filled with parallel
 * passes across the width, not a single perimeter stroke.
 */
function generateBaseSlabGCode(
  strip: StripParams,
  printer: PrinterParams,
  feedrate: number,
  travelFeedrate: number,
): { lines: string[]; endE: number } {
  const lines: string[] = [];
  let e = 0;

  const layerHeight = printer.layerHeight;
  const numLayers = Math.max(1, Math.round(strip.stripThickness / layerHeight));
  const passWidth = printer.extrusionWidth;
  const numPasses = Math.max(1, Math.round(strip.stripWidth / passWidth));

  lines.push("; ----- BASE SLAB -----");

  for (let layer = 0; layer < numLayers; layer++) {
    const z = layerHeight * (layer + 1);
    lines.push(`; layer ${layer + 1}/${numLayers} (z=${fmt(z, 3)})`);

    for (let pass = 0; pass < numPasses; pass++) {
      const y = Math.min(strip.stripWidth, pass * passWidth + passWidth / 2);
      const goingRight = pass % 2 === 0;
      const xStart = goingRight ? 0 : strip.stripLength;
      const xEnd = goingRight ? strip.stripLength : 0;

      lines.push(
        `G0 F${fmt(travelFeedrate, 0)} X${fmt(xStart)} Y${fmt(y)} Z${fmt(z)}`,
      );

      const segLen = Math.abs(xEnd - xStart);
      e += computeExtrusionForPath(segLen, passWidth, layerHeight, printer);

      lines.push(
        `G1 F${fmt(feedrate, 0)} X${fmt(xEnd)} Y${fmt(y)} E${fmt(e, 4)}`,
      );
    }
  }

  return { lines, endE: e };
}

function generateBristleGCode(
  bristle: Bristle,
  printer: PrinterParams,
  strandDiameter: number,
  startE: number,
  opts: Required<
    Pick<
      GenerateOptions,
      | "travelFeedrate"
      | "extrudeFeedrateBristle"
      | "retractDistance"
      | "retractFeedrate"
      | "zHop"
    >
  >,
): { lines: string[]; endE: number } {
  const lines: string[] = [];
  let e = startE;

  const base = bristle.base;
  const hopZ = base.z + opts.zHop;

  // Travel to bristle base with a Z-hop to clear previously
  // printed bristles, then drop down and un-retract.
  lines.push(
    `G0 F${fmt(opts.travelFeedrate, 0)} X${fmt(base.x)} Y${fmt(base.y)} Z${fmt(hopZ)}`,
  );
  lines.push(`G0 X${fmt(base.x)} Y${fmt(base.y)} Z${fmt(base.z)}`);

  // Un-retract (push filament back to the nozzle tip) before
  // starting the strand.
  e += opts.retractDistance;
  lines.push(`G1 F${fmt(opts.retractFeedrate, 0)} E${fmt(e, 4)}`);

  let prev = base;

  for (const pt of bristle.path.slice(1)) {
    const segLen = distance3D(prev, pt);

    // Strand cross-section: approximate the bristle as a round
    // strand of diameter `bristleThickness`. Passing the same
    // value for both width and height into the rectangular-bead
    // formula slightly overestimates a true round cross-section
    // (rectangle vs. circle of the same diameter), so scale by
    // pi/4 to correct for that.
    const roundnessCorrection = Math.PI / 4;
    e +=
      computeExtrusionForPath(segLen, strandDiameter, strandDiameter, printer) *
      roundnessCorrection;

    lines.push(
      `G1 F${fmt(opts.extrudeFeedrateBristle, 0)} X${fmt(pt.x)} Y${fmt(pt.y)} Z${fmt(pt.z)} E${fmt(e, 4)}`,
    );

    prev = pt;
  }

  // Retract before leaving the tip, so travel to the next bristle
  // doesn't string filament across the strip.
  e -= opts.retractDistance;
  lines.push(`G1 F${fmt(opts.retractFeedrate, 0)} E${fmt(e, 4)}`);

  return { lines, endE: e };
}

export function generateGCode(options: GenerateOptions): string {
  const printer = options.printer ?? DEFAULT_PRINTER;
  const nozzleTempC = options.nozzleTempC ?? 215;
  const bedTempC = options.bedTempC ?? 60;
  const travelFeedrate = options.travelFeedrate ?? 6000;
  const extrudeFeedrateBase = options.extrudeFeedrateBase ?? 1200;
  const extrudeFeedrateBristle = options.extrudeFeedrateBristle ?? 600;
  const retractDistance = options.retractDistance ?? 1.2;
  const retractFeedrate = options.retractFeedrate ?? 2400;
  const zHop =
    options.zHop ?? Math.max(1, options.bristles.bristleLength * 0.15);

  const bristleList = buildAllBristles(options.strip, options.bristles);

  const header: string[] = [
    "; 3D BRISTLE GENERATOR",
    ";",
    `; Strip: ${options.strip.stripLength} x ${options.strip.stripWidth} x ${options.strip.stripThickness} mm (L x W x T)`,
    `; Bristle length: ${options.bristles.bristleLength} mm`,
    `; Bristle spacing: ${options.bristles.bristleSpacingX} x ${options.bristles.bristleSpacingY} mm (X x Y)`,
    `; Bristle thickness: ${options.bristles.bristleThickness} mm`,
    `; Bristle count: ${bristleList.length}`,
    ";",
    "G21 ; mm units",
    "G90 ; absolute positioning",
    "M82 ; absolute extrusion (E values are absolute, not relative)",
    "G28 ; home all axes",
    "",
    `M104 S${nozzleTempC} ; set nozzle temp`,
    `M140 S${bedTempC} ; set bed temp`,
    `M109 S${nozzleTempC} ; wait for nozzle`,
    `M190 S${bedTempC} ; wait for bed`,
    "G92 E0",
    "",
  ];

  const { lines: baseLines, endE: eAfterBase } = generateBaseSlabGCode(
    options.strip,
    printer,
    extrudeFeedrateBase,
    travelFeedrate,
  );

  let e = eAfterBase;
  const bristleLines: string[] = ["", "; ----- BRISTLES -----"];

  for (const bristle of bristleList) {
    const { lines, endE } = generateBristleGCode(
      bristle,
      printer,
      options.bristles.bristleThickness,
      e,
      {
        travelFeedrate,
        extrudeFeedrateBristle,
        retractDistance,
        retractFeedrate,
        zHop,
      },
    );
    bristleLines.push(...lines);
    e = endE;
  }

  const footer: string[] = [
    "",
    "; ----- END -----",
    "M104 S0 ; nozzle off",
    "M140 S0 ; bed off",
    `G0 F${travelFeedrate} Z${fmt(options.strip.stripThickness + options.bristles.bristleLength + 10, 2)}`,
    "G28 X0 Y0",
    "M84 ; disable motors",
  ];

  return [...header, ...baseLines, ...bristleLines, ...footer].join("\n");
}

export function downloadGCode(gcode: string, filename = "bristle-strip.gcode") {
  const blob = new Blob([gcode], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
