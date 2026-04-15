import { Player, Vec2 } from "./types";
import { PLAYER_RADIUS } from "./constants";
import { clampToPitch } from "./physics";

const MIN_DIST = PLAYER_RADIUS * 2 + 4; // 24px hard separation
const STEER_RADIUS = PLAYER_RADIUS * 2 + 20; // 44px lookahead
const STEER_STRENGTH = 0.4;

/**
 * Steering avoidance — bends a movement target away from nearby players.
 * Call before moveToward so the player steers around others naturally.
 */
export function steerAroundPlayers(
  pos: Vec2,
  target: Vec2,
  allPlayers: Player[],
  selfId: number,
  selfTeamId: string,
): Vec2 {
  let tx = target.x;
  let ty = target.y;

  for (const other of allPlayers) {
    if (other.id === selfId && other.teamId === selfTeamId) continue;

    const dx = pos.x - other.pos.x;
    const dy = pos.y - other.pos.y;
    const d = Math.sqrt(dx * dx + dy * dy);

    if (d < STEER_RADIUS && d > 0) {
      const strength = STEER_STRENGTH * (1 - d / STEER_RADIUS);
      tx += (dx / d) * strength * STEER_RADIUS;
      ty += (dy / d) * strength * STEER_RADIUS;
    }
  }

  return { x: tx, y: ty };
}

/**
 * Separation pass — pushes apart any players still overlapping after movement.
 * Ball carrier has right of way and is never pushed.
 */
export function resolveSeparation(players: Player[]): Player[] {
  const result = players.map((p) => ({ ...p }));

  for (let i = 0; i < result.length; i++) {
    for (let j = i + 1; j < result.length; j++) {
      const a = result[i];
      const b = result[j];

      const dx = a.pos.x - b.pos.x;
      const dy = a.pos.y - b.pos.y;
      const d = Math.sqrt(dx * dx + dy * dy);

      if (d < MIN_DIST && d > 0) {
        const overlap = (MIN_DIST - d) / 2;
        const nx = dx / d;
        const ny = dy / d;

        if (!a.hasBall) {
          result[i] = {
            ...a,
            pos: clampToPitch({
              x: a.pos.x + nx * overlap,
              y: a.pos.y + ny * overlap,
            }),
          };
        }
        if (!b.hasBall) {
          result[j] = {
            ...b,
            pos: clampToPitch({
              x: b.pos.x - nx * overlap,
              y: b.pos.y - ny * overlap,
            }),
          };
        }
      }
    }
  }

  return result;
}
