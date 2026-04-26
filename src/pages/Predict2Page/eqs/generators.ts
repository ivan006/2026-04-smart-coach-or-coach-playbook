import { Candidate, EQSContext } from "./query";
import { PITCH_LEFT, PITCH_RIGHT, PITCH_TOP, PITCH_BOTTOM } from "../constants";

/** Forward cone — samples positions ahead of ball in attacking direction */
export function forwardConeGenerator(ctx: EQSContext, isHome: boolean): Candidate[] {
  const candidates: Candidate[] = [];
  const bx = ctx.ball.position.x;
  const by = ctx.ball.position.z;
  const dir = isHome ? 1 : -1;

  for (let dx = 80; dx <= 320; dx += 80) {
    for (let dy = -200; dy <= 200; dy += 80) {
      const x = bx + dx * dir;
      const y = by + dy;
      if (x < PITCH_LEFT + 20 || x > PITCH_RIGHT - 20) continue;
      if (y < PITCH_TOP  + 20 || y > PITCH_BOTTOM - 20) continue;
      candidates.push({ x, y });
    }
  }
  return candidates;
}
