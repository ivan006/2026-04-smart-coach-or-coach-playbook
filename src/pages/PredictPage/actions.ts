import { Player, Squad, Ball, TeamId, Vec2 } from "./types";
import { dist, norm, moveToward, clampToPitch } from "./physics";
import { worthyWingerSquad } from "./squads";
import { steerAroundPlayers } from "./separation";
import {
  PITCH_LEFT,
  PITCH_RIGHT,
  PITCH_TOP,
  PITCH_BOTTOM,
  PITCH_W,
  CY,
  GOAL_H,
  PASS_POWER,
  PASS_RANGE,
  SHOOT_RANGE,
  PLAYER_SPEED,
  HIGH_PRESSURE,
} from "./constants";

const TACKLE_COOLDOWN = 60;
const KNOCK_POWER = 8;
const DEFER_MARGIN = 60; // another squad must be this much closer before deferring

// ── Helpers ───────────────────────────────────────────────────────────────────

function goalTarget(teamId: TeamId) {
  return teamId === "home"
    ? { x: PITCH_RIGHT, y: CY }
    : { x: PITCH_LEFT, y: CY };
}

function isNearGoal(player: Player): boolean {
  const gt = goalTarget(player.teamId);
  return (
    Math.abs(player.pos.x - gt.x) < SHOOT_RANGE &&
    Math.abs(player.pos.y - CY) < GOAL_H
  );
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
  return candidates.reduce((best, p) =>
    dist(p.pos, gt) < dist(best.pos, gt) ? p : best,
  );
}

function teammateAboutToPass(player: Player, allPlayers: Player[]): boolean {
  return allPlayers.some(
    (p) =>
      p.teamId === player.teamId &&
      p.hasBall &&
      dist(p.pos, player.pos) < PASS_RANGE,
  );
}

function findLowPressureSpace(player: Player, allPlayers: Player[]): Vec2 {
  const opponents = allPlayers.filter((p) => p.teamId !== player.teamId);
  const candidates: Vec2[] = [];
  for (let dx = -1; dx <= 2; dx++) {
    for (let dy = -2; dy <= 2; dy++) {
      const cx = player.homePos.x + dx * 80;
      const cy = player.homePos.y + dy * 60;
      if (cx < PITCH_LEFT + 20 || cx > PITCH_RIGHT - 20) continue;
      if (cy < PITCH_TOP + 20 || cy > PITCH_BOTTOM - 20) continue;
      candidates.push({ x: cx, y: cy });
    }
  }
  if (candidates.length === 0) return player.homePos;
  return candidates.reduce((best, c) => {
    const minOpp =
      opponents.length > 0
        ? Math.min(...opponents.map((o) => dist(c, o.pos)))
        : 999;
    const bestOpp =
      opponents.length > 0
        ? Math.min(...opponents.map((o) => dist(best, o.pos)))
        : 999;
    return minOpp > bestOpp ? c : best;
  });
}

function steerAndMove(
  player: Player,
  rawTarget: { x: number; y: number },
  speed: number,
  allPlayers: Player[],
) {
  const steered = steerAroundPlayers(
    player.pos,
    rawTarget,
    allPlayers,
    player.id,
    player.teamId,
    player.squadRole,
  );
  return moveToward(player.pos, steered, speed);
}

function directMove(
  player: Player,
  target: { x: number; y: number },
  speed: number,
) {
  return moveToward(player.pos, target, speed);
}

function doPass(
  passer: Player,
  target: Player,
  ball: Ball,
): { player: Player; ball: Ball } {
  const n = norm({
    x: target.pos.x - passer.pos.x,
    y: target.pos.y - passer.pos.y,
  });
  return {
    player: { ...passer, hasBall: false, action: "pass" },
    ball: {
      ...ball,
      vel: { x: n.x * PASS_POWER, y: n.y * PASS_POWER },
      loose: true,
      ownerId: null,
    },
  };
}

function passToWorthyWinger(
  player: Player,
  allPlayers: Player[],
  allSquads: Squad[],
  ball: Ball,
): { player: Player; ball: Ball } | null {
  const worthy = worthyWingerSquad(allSquads, player.teamId);
  if (!worthy) return null;
  const target = allPlayers.find(
    (p) =>
      p.teamId === player.teamId &&
      worthy.playerIds.includes(p.id) &&
      p.pressure < HIGH_PRESSURE &&
      dist(p.pos, player.pos) < PASS_RANGE,
  );
  if (!target) return null;
  return doPass(player, target, ball);
}

/**
 * Decide whether this player should defer to a closer squad.
 * Uses sticky deferring flag — only commits to defer if another squad
 * is clearly closer (DEFER_MARGIN). Clears defer if team regains ball.
 */
function shouldDefer(
  player: Player,
  allPlayers: Player[],
  targetPos: Vec2,
): boolean {
  // If already deferring, keep deferring (sticky) — only re-evaluate if we become closest
  const myDist = dist(player.pos, targetPos);
  const closestOtherSquadDist = allPlayers
    .filter(
      (p) => p.teamId === player.teamId && p.squadRole !== player.squadRole,
    )
    .reduce((best, p) => Math.min(best, dist(p.pos, targetPos)), Infinity);

  if (player.deferring) {
    // Stop deferring only if we become the closest squad
    return closestOtherSquadDist < myDist;
  } else {
    // Start deferring only if another squad is clearly closer
    return closestOtherSquadDist < myDist - DEFER_MARGIN;
  }
}

// ── Tackle resolution ─────────────────────────────────────────────────────────

export interface TackleResult {
  tackler: Player;
  carrier: Player;
  ball: Ball;
}

export function resolveTackle(
  tackler: Player,
  carrier: Player,
  ball: Ball,
): TackleResult {
  const roll = Math.random();
  const cooldownTackler = {
    ...tackler,
    tackleCooldown: TACKLE_COOLDOWN,
    action: "tackle" as const,
    deferring: false,
  };

  if (roll < 1 / 3) {
    return {
      tackler: { ...cooldownTackler, hasBall: true },
      carrier: { ...carrier, hasBall: false },
      ball: {
        ...ball,
        ownerId: `${tackler.teamId}-${tackler.id}`,
        loose: false,
      },
    };
  } else if (roll < 2 / 3) {
    const angle = Math.random() * Math.PI * 2;
    return {
      tackler: cooldownTackler,
      carrier: { ...carrier, hasBall: false },
      ball: {
        ...ball,
        vel: {
          x: Math.cos(angle) * KNOCK_POWER,
          y: Math.sin(angle) * KNOCK_POWER,
        },
        loose: true,
        ownerId: null,
      },
    };
  } else {
    return { tackler: cooldownTackler, carrier, ball };
  }
}

// ── Ball carrier ──────────────────────────────────────────────────────────────

export function tickPlayerWithBall(
  player: Player,
  allPlayers: Player[],
  allSquads: Squad[],
  ball: Ball,
): { player: Player; ball: Ball } {
  // Clear deferring when player gets ball
  const p = { ...player, deferring: false };

  if (isNearGoal(p)) {
    const gt = goalTarget(p.teamId);
    const n = norm({ x: gt.x - p.pos.x, y: gt.y - p.pos.y });
    return {
      player: { ...p, hasBall: false, action: "shoot" },
      ball: {
        ...ball,
        vel: { x: n.x * PASS_POWER, y: n.y * PASS_POWER },
        loose: true,
        ownerId: null,
      },
    };
  }

  if (p.squadRole === "defence" || p.squadRole === "relay") {
    const result = passToWorthyWinger(p, allPlayers, allSquads, ball);
    if (result) return result;
  }

  if (p.pressure >= HIGH_PRESSURE) {
    const target = bestPassTarget(p, allPlayers);
    if (target) return doPass(p, target, ball);
  }

  const gt = goalTarget(p.teamId);
  const moved = steerAndMove(p, gt, PLAYER_SPEED, allPlayers);
  return {
    player: {
      ...p,
      pos: clampToPitch(moved.pos),
      angle: moved.angle,
      action: "advance",
    },
    ball: { ...ball, pos: clampToPitch(moved.pos) },
  };
}

// ── Non-ball carrier ──────────────────────────────────────────────────────────

export function tickPlayerWithoutBall(
  player: Player,
  squad: Squad,
  ball: Ball,
  allPlayers: Player[],
  allSquads: Squad[],
): Player {
  if (teammateAboutToPass(player, allPlayers)) {
    return { ...player, action: "prep-receive", deferring: false };
  }

  switch (squad.role) {
    case "right-wing":
    case "left-wing":
      return tickWinger(player, squad.action as string, ball, allPlayers);
    case "relay":
      return tickRelay(
        player,
        squad.action as string,
        ball,
        allPlayers,
        allSquads,
      );
    case "defence":
      return tickDefence(
        player,
        squad.action as string,
        ball,
        allPlayers,
        allSquads,
      );
    default:
      return player;
  }
}

function tickWinger(
  player: Player,
  action: string,
  ball: Ball,
  allPlayers: Player[],
): Player {
  switch (action) {
    case "move-to-shoot": {
      const gt = goalTarget(player.teamId);
      const rawTarget = clampToPitch({
        x: player.homePos.x + (gt.x > player.homePos.x ? 80 : -80),
        y: player.homePos.y,
      });
      const moved = steerAndMove(player, rawTarget, PLAYER_SPEED, allPlayers);
      return {
        ...player,
        pos: clampToPitch(moved.pos),
        angle: moved.angle,
        action: "advance",
        deferring: false,
      };
    }
    case "move-to-space": {
      const space = findLowPressureSpace(player, allPlayers);
      const moved = steerAndMove(player, space, PLAYER_SPEED * 0.9, allPlayers);
      return {
        ...player,
        pos: clampToPitch(moved.pos),
        angle: moved.angle,
        action: "move-to-space",
        deferring: false,
      };
    }
    case "move-to-take": {
      const isLoose = ball.ownerId === null;
      const target = isLoose
        ? ball.pos
        : (allPlayers.find((p) => p.hasBall)?.pos ?? ball.pos);
      const defer = shouldDefer(player, allPlayers, target);

      if (defer) {
        const moved = steerAndMove(
          player,
          player.homePos,
          PLAYER_SPEED * 0.5,
          allPlayers,
        );
        return {
          ...player,
          pos: clampToPitch(moved.pos),
          angle: moved.angle,
          action: "hold",
          deferring: true,
        };
      }

      const moved = directMove(player, target, PLAYER_SPEED * 0.9);
      return {
        ...player,
        pos: clampToPitch(moved.pos),
        angle: moved.angle,
        action: isLoose ? "prep-intercept" : "prep-tackle",
        deferring: false,
      };
    }
    default:
      return player;
  }
}

function tickRelay(
  player: Player,
  action: string,
  ball: Ball,
  allPlayers: Player[],
  allSquads: Squad[],
): Player {
  if (action === "keep-position") {
    const moved = steerAndMove(
      player,
      player.homePos,
      PLAYER_SPEED * 0.5,
      allPlayers,
    );
    return {
      ...player,
      pos: clampToPitch(moved.pos),
      angle: moved.angle,
      action: "hold",
      deferring: false,
    };
  }

  const worthy = worthyWingerSquad(allSquads, player.teamId);
  if (!worthy) return player;

  const wingerPlayers = allPlayers.filter(
    (p) => p.teamId === player.teamId && worthy.playerIds.includes(p.id),
  );
  if (wingerPlayers.length === 0) return player;

  const cx =
    wingerPlayers.reduce((s, p) => s + p.pos.x, 0) / wingerPlayers.length;
  const cy =
    wingerPlayers.reduce((s, p) => s + p.pos.y, 0) / wingerPlayers.length;
  const rawTarget = clampToPitch({
    x: (ball.pos.x + cx) / 2,
    y: (ball.pos.y + cy) / 2,
  });

  const moved = steerAndMove(
    player,
    rawTarget,
    PLAYER_SPEED * 0.85,
    allPlayers,
  );
  return {
    ...player,
    pos: clampToPitch(moved.pos),
    angle: moved.angle,
    action: "move-to-space",
    deferring: false,
  };
}

function tickDefence(
  player: Player,
  action: string,
  ball: Ball,
  allPlayers: Player[],
  allSquads: Squad[],
): Player {
  if (action === "choose-worthy-squad") {
    const worthy = worthyWingerSquad(allSquads, player.teamId);
    if (worthy) {
      const wingerPlayers = allPlayers.filter(
        (p) => p.teamId === player.teamId && worthy.playerIds.includes(p.id),
      );
      if (wingerPlayers.length > 0) {
        const cx =
          wingerPlayers.reduce((s, p) => s + p.pos.x, 0) / wingerPlayers.length;
        const cy =
          wingerPlayers.reduce((s, p) => s + p.pos.y, 0) / wingerPlayers.length;
        const moved = steerAndMove(
          player,
          clampToPitch({ x: cx, y: cy }),
          PLAYER_SPEED * 0.7,
          allPlayers,
        );
        return {
          ...player,
          pos: clampToPitch(moved.pos),
          angle: moved.angle,
          action: "advance",
          deferring: false,
        };
      }
    }
  }

  // Press opponent carrier
  const opponentCarrier = allPlayers.find(
    (p) => p.teamId !== player.teamId && p.hasBall,
  );
  if (opponentCarrier) {
    const defer = shouldDefer(player, allPlayers, opponentCarrier.pos);
    if (defer) {
      const moved = steerAndMove(
        player,
        player.homePos,
        PLAYER_SPEED * 0.5,
        allPlayers,
      );
      return {
        ...player,
        pos: clampToPitch(moved.pos),
        angle: moved.angle,
        action: "hold",
        deferring: true,
      };
    }
    const moved = directMove(player, opponentCarrier.pos, PLAYER_SPEED);
    return {
      ...player,
      pos: clampToPitch(moved.pos),
      angle: moved.angle,
      action: "prep-tackle",
      deferring: false,
    };
  }

  // Loose ball
  if (ball.ownerId === null) {
    const defer = shouldDefer(player, allPlayers, ball.pos);
    if (defer) {
      const moved = steerAndMove(
        player,
        player.homePos,
        PLAYER_SPEED * 0.5,
        allPlayers,
      );
      return {
        ...player,
        pos: clampToPitch(moved.pos),
        angle: moved.angle,
        action: "hold",
        deferring: true,
      };
    }
    const moved = directMove(player, ball.pos, PLAYER_SPEED);
    return {
      ...player,
      pos: clampToPitch(moved.pos),
      angle: moved.angle,
      action: "prep-intercept",
      deferring: false,
    };
  }

  const moved = steerAndMove(
    player,
    player.homePos,
    PLAYER_SPEED * 0.6,
    allPlayers,
  );
  return {
    ...player,
    pos: clampToPitch(moved.pos),
    angle: moved.angle,
    action: "defend",
    deferring: false,
  };
}
