import { Player, Squad, Ball, TeamId } from "./types";
import { dist, norm, moveToward, clampToPitch } from "./physics";
import {
  PITCH_LEFT,
  PITCH_RIGHT,
  GOAL_TOP,
  GOAL_BOT,
  GOAL_H,
  CY,
  PASS_POWER,
  PASS_RANGE,
  SHOOT_RANGE,
  PLAYER_SPEED,
  HIGH_PRESSURE,
} from "./constants";

// Goal positions per team
function goalTarget(teamId: TeamId): { x: number; y: number } {
  return teamId === "home"
    ? { x: PITCH_RIGHT, y: CY }
    : { x: PITCH_LEFT, y: CY };
}

function isNearGoal(player: Player): boolean {
  const gt = goalTarget(player.teamId);
  const dx = gt.x - player.pos.x;
  return Math.abs(dx) < SHOOT_RANGE && Math.abs(player.pos.y - CY) < GOAL_H;
}

function bestPassTarget(passer: Player, allPlayers: Player[]): Player | null {
  const gt = goalTarget(passer.teamId);
  const candidates = allPlayers.filter(
    (p) =>
      p.teamId === passer.teamId &&
      p.id !== passer.id &&
      p.pressure < HIGH_PRESSURE &&
      dist(p.pos, passer.pos) < PASS_RANGE,
  );
  if (candidates.length === 0) return null;
  // Prefer player furthest toward the attacking goal
  return candidates.reduce((best, p) => {
    const bestDist = dist(p.pos, gt);
    const pDist = dist(p.pos, gt);
    return pDist < bestDist ? p : best;
  });
}

export interface ActionResult {
  updatedPlayer: Player;
  ballUpdate?: Partial<Ball>;
}

export function tickPlayerWithBall(
  player: Player,
  allPlayers: Player[],
  squad: Squad,
  ball: Ball,
): { player: Player; ball: Ball } {
  const gt = goalTarget(player.teamId);

  // Shoot if near goal
  if (isNearGoal(player)) {
    const n = norm({ x: gt.x - player.pos.x, y: gt.y - player.pos.y });
    return {
      player: { ...player, hasBall: false, action: "shoot" },
      ball: {
        ...ball,
        vel: { x: n.x * PASS_POWER, y: n.y * PASS_POWER },
        loose: true,
        ownerId: null,
      },
    };
  }

  // Pass if under high pressure
  if (player.pressure >= HIGH_PRESSURE || squad.pressure >= HIGH_PRESSURE) {
    const target = bestPassTarget(player, allPlayers);
    if (target) {
      const n = norm({
        x: target.pos.x - player.pos.x,
        y: target.pos.y - player.pos.y,
      });
      return {
        player: { ...player, hasBall: false, action: "pass" },
        ball: {
          ...ball,
          vel: { x: n.x * PASS_POWER, y: n.y * PASS_POWER },
          loose: true,
          ownerId: null,
        },
      };
    }
  }

  // Advance toward goal
  const moved = moveToward(player.pos, gt, PLAYER_SPEED);
  return {
    player: {
      ...player,
      pos: clampToPitch(moved.pos),
      angle: moved.angle,
      action: "advance",
    },
    ball: { ...ball, pos: clampToPitch(moved.pos) },
  };
}

export function tickPlayerWithoutBall(
  player: Player,
  squad: Squad,
  ball: Ball,
  allPlayers: Player[],
): Player {
  switch (squad.action) {
    case "move-to-shoot": {
      // Support — move to position ahead of home pos toward goal
      const gt = goalTarget(player.teamId);
      const supportX = player.homePos.x + (gt.x > player.homePos.x ? 60 : -60);
      const target = clampToPitch({ x: supportX, y: player.homePos.y });
      const moved = moveToward(player.pos, target, PLAYER_SPEED);
      return {
        ...player,
        pos: clampToPitch(moved.pos),
        angle: moved.angle,
        action: "advance",
      };
    }
    case "move-to-space": {
      // Move to open space near home position
      const target = clampToPitch({
        x: player.homePos.x + 30,
        y: player.homePos.y,
      });
      const moved = moveToward(player.pos, target, PLAYER_SPEED * 0.8);
      return {
        ...player,
        pos: clampToPitch(moved.pos),
        angle: moved.angle,
        action: "move-to-space",
      };
    }
    case "move-to-take": {
      // Press toward ball
      const moved = moveToward(player.pos, ball.pos, PLAYER_SPEED * 0.9);
      return {
        ...player,
        pos: clampToPitch(moved.pos),
        angle: moved.angle,
        action: "move-to-take",
      };
    }
  }
}
