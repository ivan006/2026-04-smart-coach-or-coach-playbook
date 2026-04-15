import { Vec2, BipolarPos } from "./types";
import { PITCH_LEFT, PITCH_RIGHT, CY } from "./constants";

// Foci at goal centers. We normalise so a=1 mathematically,
// then scale output to pitch coordinates.
export const CX_BP = (PITCH_LEFT + PITCH_RIGHT) / 2;
export const a = 1; // normalised — scale handles mapping to screen

// Scale: maps normalised bipolar output to pitch half-width
const SCALE = (PITCH_RIGHT - PITCH_LEFT) / 2;

export function toBipolar(pos: Vec2): BipolarPos {
  // Normalise position to [-1..1] range relative to pitch center
  const px = (pos.x - CX_BP) / SCALE;
  const py = (pos.y - CY) / SCALE;
  const d1 = Math.sqrt((px + 1) ** 2 + py ** 2) || 0.001;
  const d2 = Math.sqrt((px - 1) ** 2 + py ** 2) || 0.001;
  const tau = Math.log(d1 / d2);
  const sigma = Math.atan2(2 * py, 1 - px ** 2 - py ** 2);
  return { radial: tau, tangential: sigma };
}

export function fromBipolar(bp: BipolarPos): Vec2 {
  const denom = Math.cosh(bp.radial) - Math.cos(bp.tangential);
  if (Math.abs(denom) < 0.001) return { x: CX_BP, y: CY };
  const px = Math.sinh(bp.radial) / denom;
  const py = Math.sin(bp.tangential) / denom;
  return { x: px * SCALE + CX_BP, y: py * SCALE + CY };
}
