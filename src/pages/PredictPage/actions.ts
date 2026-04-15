import { Player, Squad, Ball, TeamId } from "./types";
import { dist, norm, moveToward, clampToPitch } from "./physics";
import { worthyWingerSquad } from "./squads";
import { steerAroundPlayers } from "./separation";
import {
  PITCH_LEFT,
  PITCH_RIGHT,
  PITCH_W,
  CY,
  GOAL_H,
  PASS_POWER,
  PASS_RANGE,
  SHOOT_RANGE,
  PLAYER_SPEED,
  HIGH_PRESSURE,
} from "./constants";

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

  if (player.pressure >= HIGH_PRESSURE) {
    if (player.squadRole === "relay") {
      const worthy = worthyWingerSquad(allSquads, player.teamId);
      if (worthy) {
        const target = allPlayers.find(
          (p) =>
            p.teamId === player.teamId &&
            worthy.playerIds.includes(p.id) &&
            p.pressure < HIGH_PRESSURE &&
            dist(p.pos, player.pos) < PASS_RANGE,
        );
        if (target) return doPass(player, target, ball);
      }
    }
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
      return tickDefence(player, ball, allPlayers);
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
      const moved = steerAndMove(
        player,
        player.homePos,
        PLAYER_SPEED * 0.8,
        allPlayers,
      );
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
    // Hold home position — drift back slowly
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

  // choose-worthy-squad — position between ball and worthy winger squad
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

function tickDefence(player: Player, ball: Ball, allPlayers: Player[]): Player {
  if (isInOwnThird(player) && dist(player.pos, ball.pos) < 150) {
    const moved = steerAndMove(player, ball.pos, PLAYER_SPEED, allPlayers);
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
