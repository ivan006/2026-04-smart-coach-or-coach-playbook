import { Vec2, BipolarPos } from "./types";
import { PITCH_LEFT, PITCH_RIGHT, CY } from "./constants";

// Foci = goal centers on horizontal pitch
// GeoGebra formula rotated 90°:
//   x = -a*sinh(τ) / (cosh(τ) - cos(σ))
//   y =  a*sin(σ)  / (cosh(τ) - cos(σ))
// τ (tau)   = radial   — equipotential shell (distance ratio to goals)
// σ (sigma) = tangential — field line (arc between goals)

export const CX = (PITCH_LEFT + PITCH_RIGHT) / 2;
export const a = (PITCH_RIGHT - PITCH_LEFT) / 2;

/** Convert Cartesian to bipolar coordinates */
export function toBipolar(pos: Vec2): BipolarPos {
  const px = pos.x - CX;
  const py = pos.y - CY;

  // Foci at (0, ±a) in translated space (rotated 90°)
  const d1 = Math.sqrt(px ** 2 + (py + a) ** 2) || 0.001;
  const d2 = Math.sqrt(px ** 2 + (py - a) ** 2) || 0.001;

  const tau = Math.log(d1 / d2);
  const sigma = Math.atan2(2 * a * px, a ** 2 - px ** 2 - py ** 2);

  return { radial: tau, tangential: sigma };
}

/** Convert bipolar back to Cartesian */
export function fromBipolar(bp: BipolarPos): Vec2 {
  const denom = Math.cosh(bp.radial) - Math.cos(bp.tangential);
  if (Math.abs(denom) < 0.001) return { x: CX, y: CY };
  const px = (-a * Math.sinh(bp.radial)) / denom;
  const py = (a * Math.sin(bp.tangential)) / denom;
  return { x: px + CX, y: py + CY };
}
