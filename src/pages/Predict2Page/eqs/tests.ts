import { Candidate, EQSContext, Test } from "./query";
import { PITCH_LEFT, PITCH_W } from "../constants";

/** Radial progress — how far forward toward goal (0..1) */
export const radialProgressTest: Test = (c: Candidate) =>
  (c.x - PITCH_LEFT) / PITCH_W;

/** Opponent distance — prefer positions far from opponents */
export const opponentDistanceTest: Test = (c: Candidate, ctx: EQSContext) => {
  if (!ctx.opponents.length) return 1;
  const minDist = Math.min(...ctx.opponents.map(o =>
    Math.sqrt((c.x - o.position.x) ** 2 + (c.y - o.position.z) ** 2)
  ));
  return Math.min(minDist / 200, 1);
};

/** Teammate spacing — prefer positions spread from teammates */
export const teammateSpacingTest: Test = (c: Candidate, ctx: EQSContext) => {
  if (!ctx.teammates.length) return 1;
  const minDist = Math.min(...ctx.teammates.map(t =>
    Math.sqrt((c.x - t.position.x) ** 2 + (c.y - t.position.z) ** 2)
  ));
  return Math.min(minDist / 150, 1);
};
