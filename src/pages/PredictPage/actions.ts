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

const TACKLE_RANGE = 18; // px — contact distance to trigger tackle
const TACKLE_COOLDOWN = 60; // ticks (1 sec at 60fps)
const KNOCK_POWER = 8; // ball speed when knocked away

// ── Helpers ───────────────────────────────────────────────────────────────────

function goalTarget(teamId: TeamId) {
  return teamId === "home"
    ? { x: PITCH_RIGHT, y: CY }
    : { x: PITCH_LEFT, y: CY };
}

function isInOwnThird(player: Player): boolean {
  const thirdW = PITCH_W / 3;
  return player.teamId === "home"
    ? player.pos.x < PITCH_LEFT + thirdW
    : player.pos.x > PITCH_RIGHT - thirdW;
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

// ── Tackle resolution ─────────────────────────────────────────────────────────

export interface TackleResult {
  tackler: Player;
  carrier: Player;
  ball: Ball;
}

/**
 * Called when a player without the ball makes contact with an opponent ball carrier.
 * Returns updated tackler, carrier, and ball based on random outcome.
 */
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
  };

  if (roll < 1 / 3) {
    // Tackler wins ball
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
    // Ball knocked away — random direction, moderate speed
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
    // Neither — carrier keeps ball, tackler on cooldown
    return {
      tackler: cooldownTackler,
      carrier,
      ball,
    };
  }
}

// ── Ball carrier ──────────────────────────────────────────────────────────────

export function tickPlayerWithBall(
  player: Player,
  allPlayers: Player[],
  allSquads: Squad[],
  ball: Ball,
): { player: Player; ball: Ball } {
  if (isNearGoal(player)) {
    const gt = goalTarget(player.teamId);
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

  if (player.squadRole === "defence" || player.squadRole === "relay") {
    const result = passToWorthyWinger(player, allPlayers, allSquads, ball);
    if (result) return result;
  }

  if (player.pressure >= HIGH_PRESSURE) {
    const target = bestPassTarget(player, allPlayers);
    if (target) return doPass(player, target, ball);
  }

  const gt = goalTarget(player.teamId);
  const moved = steerAndMove(player, gt, PLAYER_SPEED, allPlayers);
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

// ── Non-ball carrier ──────────────────────────────────────────────────────────

export function tickPlayerWithoutBall(
  player: Player,
  squad: Squad,
  ball: Ball,
  allPlayers: Player[],
  allSquads: Squad[],
): Player {
  if (teammateAboutToPass(player, allPlayers)) {
    return { ...player, action: "prep-receive" };
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
      };
    }
    case "move-to-take": {
      if (dist(player.pos, ball.pos) < 60) {
        return { ...player, action: "keep-distance" };
      }
      const moved = steerAndMove(
        player,
        ball.pos,
        PLAYER_SPEED * 0.9,
        allPlayers,
      );
      return {
        ...player,
        pos: clampToPitch(moved.pos),
        angle: moved.angle,
        action: "move-to-take",
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
        };
      }
    }
  }

  const opponentCarrier = allPlayers.find(
    (p) => p.teamId !== player.teamId && p.hasBall,
  );
  if (
    isInOwnThird(player) &&
    opponentCarrier &&
    dist(player.pos, opponentCarrier.pos) < 150
  ) {
    const moved = steerAndMove(
      player,
      opponentCarrier.pos,
      PLAYER_SPEED,
      allPlayers,
    );
    return {
      ...player,
      pos: clampToPitch(moved.pos),
      angle: moved.angle,
      action: "tackle",
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
  };
}
