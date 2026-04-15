import { Player, Vec2 } from "./types";
import { PLAYER_RADIUS } from "./constants";
import { clampToPitch } from "./physics";

const MIN_DIST = PLAYER_RADIUS * 2 - 6; // 14px — opponents can get close enough to tackle
const SQUAD_MIN_DIST = PLAYER_RADIUS * 2 + 40; // 60px preferred spacing within same team
const STEER_RADIUS = PLAYER_RADIUS * 2 + 20; // 44px lookahead for general steering
const SQUAD_STEER_RADIUS = PLAYER_RADIUS * 2 + 80; // 100px lookahead for same-team members
const STEER_STRENGTH = 0.4;
const SQUAD_STEER_STRENGTH = 1.2;

/**
 * Steering avoidance — bends movement target away from nearby players.
 * Applies stronger repulsion from same-squad members.
 */
export function steerAroundPlayers(
  pos: Vec2,
  target: Vec2,
  allPlayers: Player[],
  selfId: number,
  selfTeamId: string,
  selfSquadRole: string,
): Vec2 {
  let tx = target.x;
  let ty = target.y;

  for (const other of allPlayers) {
    if (other.id === selfId && other.teamId === selfTeamId) continue;

    const dx = pos.x - other.pos.x;
    const dy = pos.y - other.pos.y;
    const d = Math.sqrt(dx * dx + dy * dy);

    const isSameTeam = other.teamId === selfTeamId;
    const radius = isSameTeam ? SQUAD_STEER_RADIUS : STEER_RADIUS;
    const strength = isSameTeam ? SQUAD_STEER_STRENGTH : STEER_STRENGTH;

    if (d < radius && d > 0) {
      const push = strength * (1 - d / radius);
      tx += (dx / d) * push * radius;
      ty += (dy / d) * push * radius;
    }
  }

  return { x: tx, y: ty };
}

/**
 * Post-movement separation pass — pushes apart overlapping players.
 * Ball carrier has right of way.
 */
export function resolveSeparation(players: Player[]): Player[] {
  const result = players.map((p) => ({ ...p }));

  for (let i = 0; i < result.length; i++) {
    for (let j = i + 1; j < result.length; j++) {
      const a = result[i];
      const b = result[j];

      const bothTackling =
        (a.action === "tackle" || a.action === "prep-tackle") &&
        (b.action === "tackle" || b.action === "prep-tackle");
      const isSameTeam = a.teamId === b.teamId;
      const minDist = isSameTeam && !bothTackling ? SQUAD_MIN_DIST : MIN_DIST;

      const dx = a.pos.x - b.pos.x;
      const dy = a.pos.y - b.pos.y;
      const d = Math.sqrt(dx * dx + dy * dy);

      if (d < minDist && d > 0) {
        const overlap = (minDist - d) / 2;
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
