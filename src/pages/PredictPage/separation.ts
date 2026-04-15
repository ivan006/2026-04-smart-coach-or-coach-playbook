import { Player, Vec2 } from "./types";
import { PLAYER_RADIUS } from "./constants";
import { clampToPitch } from "./physics";

const TEAMMATE_MIN_DIST = 60; // all teammates keep this distance
const OPPONENT_MIN_DIST = 14; // opponents can get close to tackle
const TEAMMATE_STEER_RADIUS = 100;
const OPPONENT_STEER_RADIUS = 44;
const TEAMMATE_STEER_STRENGTH = 1.2;
const OPPONENT_STEER_STRENGTH = 0.4;

/**
 * Bends movement target away from nearby players.
 * Stronger repulsion from teammates, weaker from opponents.
 */
export function steerAroundPlayers(
  pos: Vec2,
  target: Vec2,
  allPlayers: Player[],
  selfId: number,
  selfTeamId: string,
  selfSquadRole: string,
  selfAction?: string,
): Vec2 {
  if (
    selfAction === "prep-tackle" ||
    selfAction === "prep-intercept" ||
    selfAction === "defend"
  )
    return target;

  let tx = target.x;
  let ty = target.y;

  for (const other of allPlayers) {
    if (other.id === selfId && other.teamId === selfTeamId) continue;
    if (
      other.action === "prep-tackle" ||
      other.action === "prep-intercept" ||
      other.action === "defend"
    )
      continue;

    const dx = pos.x - other.pos.x;
    const dy = pos.y - other.pos.y;
    const d = Math.sqrt(dx * dx + dy * dy);

    const isTeammate = other.teamId === selfTeamId;
    const radius = isTeammate ? TEAMMATE_STEER_RADIUS : OPPONENT_STEER_RADIUS;
    const strength = isTeammate
      ? TEAMMATE_STEER_STRENGTH
      : OPPONENT_STEER_STRENGTH;

    if (d < radius && d > 0) {
      const push = strength * (1 - d / radius);
      tx += (dx / d) * push * radius;
      ty += (dy / d) * push * radius;
    }
  }

  return { x: tx, y: ty };
}

/**
 * Post-movement separation — pushes overlapping players apart.
 * Ball carrier has right of way.
 * Exception: teammates both tackling same opponent can get close.
 */
export function resolveSeparation(players: Player[]): Player[] {
  const result = players.map((p) => ({ ...p }));

  for (let i = 0; i < result.length; i++) {
    for (let j = i + 1; j < result.length; j++) {
      const a = result[i];
      const b = result[j];

      const isTeammate = a.teamId === b.teamId;
      const bothTackling =
        (a.action === "tackle" || a.action === "prep-tackle") &&
        (b.action === "tackle" || b.action === "prep-tackle");
      const minDist =
        isTeammate && !bothTackling ? TEAMMATE_MIN_DIST : OPPONENT_MIN_DIST;

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
