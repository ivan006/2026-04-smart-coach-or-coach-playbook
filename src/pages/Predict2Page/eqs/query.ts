import { Ball } from "../world/Ball";
import { Player } from "../world/Player";

export type Candidate = { x: number; y: number };
export type EQSContext = { ball: Ball; opponents: Player[]; teammates: Player[] };
export type Test = (c: Candidate, ctx: EQSContext) => number;

/** Core EQS loop — generate candidates, score with tests, return best */
export function query(
  generator: (ctx: EQSContext) => Candidate[],
  ctx: EQSContext,
  tests: Test[]
): Candidate | null {
  const candidates = generator(ctx);
  if (!candidates.length) return null;
  return candidates
    .map(c => ({ c, score: tests.reduce((s, t) => s + t(c, ctx), 0) }))
    .sort((a, b) => b.score - a.score)[0].c;
}
