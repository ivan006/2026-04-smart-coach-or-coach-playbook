import { Vec2, BipolarPos, TeamId } from "./types";
import { PITCH_LEFT, PITCH_RIGHT, CY } from "./constants";

/** Convert Cartesian position to bipolar coordinates for a given team */
export function toBipolar(pos: Vec2, teamId: TeamId): BipolarPos {
  const radial = teamId === "home" ? pos.x - PITCH_LEFT : PITCH_RIGHT - pos.x;
  const tangential = pos.y - CY;
  return { radial, tangential };
}

/** Convert bipolar coordinates back to Cartesian for a given team */
export function fromBipolar(bp: BipolarPos, teamId: TeamId): Vec2 {
  const x =
    teamId === "home" ? PITCH_LEFT + bp.radial : PITCH_RIGHT - bp.radial;
  const y = CY + bp.tangential;
  return { x, y };
}

/** Bipolar distance — weighted so radial and tangential are comparable */
export function bipolarDist(a: BipolarPos, b: BipolarPos): number {
  const dr = a.radial - b.radial;
  const dt = a.tangential - b.tangential;
  return Math.sqrt(dr * dr + dt * dt);
}
