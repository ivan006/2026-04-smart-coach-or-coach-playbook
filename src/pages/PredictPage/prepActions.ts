import { Player, Squad, Ball, TeamId, Vec2 } from "./types";
import { dist, moveToward, clampToPitch } from "./physics";
import { worthyWingerSquad } from "./squads";
import { steerAroundPlayers } from "./separation";
import {
  PITCH_LEFT,
  PITCH_RIGHT,
  PITCH_TOP,
  PITCH_BOTTOM,
  CY,
  GOAL_H,
  PASS_RANGE,
  SHOOT_RANGE,
  PLAYER_SPEED,
} from "./constants";

const SUPPORT_OFFSET = 55;
const DEFER_MARGIN = 60;

// ── Helpers ───────────────────────────────────────────────────────────────────

function goalTarget(teamId: TeamId) {
  return teamId === "home"
    ? { x: PITCH_RIGHT, y: CY }
    : { x: PITCH_LEFT, y: CY };
}

export function isInShootingPosition(player: Player): boolean {
  const gt = goalTarget(player.teamId);
  const inRange =
    Math.abs(player.pos.x - gt.x) < SHOOT_RANGE &&
    Math.abs(player.pos.y - CY) < GOAL_H;
  if (!inRange) return false;
  // Must be facing the goal within 45 degrees
  const angleToGoal = Math.atan2(gt.y - player.pos.y, gt.x - player.pos.x);
  let diff = angleToGoal - player.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return Math.abs(diff) < Math.PI / 4;
}

export function isInPassPosition(player: Player, target: Player): boolean {
  return dist(player.pos, target.pos) < PASS_RANGE;
}

const MAX_TURN_PER_TICK = Math.PI / 20; // ~9 degrees per tick, 180 takes ~20 ticks

/** Limits angle change per tick so players can't instantly snap direction */
export function clampTurn(currentAngle: number, targetAngle: number): number {
  let diff = targetAngle - currentAngle;
  // Normalise to [-PI, PI]
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) <= MAX_TURN_PER_TICK) return targetAngle;
  return currentAngle + Math.sign(diff) * MAX_TURN_PER_TICK;
}

export function steerAndMove(
  player: Player,
  rawTarget: Vec2,
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
    player.action,
  );
  const result = moveToward(player.pos, steered, speed);
  return { ...result, angle: clampTurn(player.angle, result.angle) };
}

export function directMove(player: Player, target: Vec2, speed: number) {
  const result = moveToward(player.pos, target, speed);
  return { ...result, angle: clampTurn(player.angle, result.angle) };
}

function supportPos(leader: Player, target: Vec2): Vec2 {
  const dx = target.x - leader.pos.x;
  const dy = target.y - leader.pos.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d === 0) return leader.pos;
  return clampToPitch({
    x: leader.pos.x - (dx / d) * SUPPORT_OFFSET,
    y: leader.pos.y - (dy / d) * SUPPORT_OFFSET,
  });
}

export function shouldDefer(
  player: Player,
  allPlayers: Player[],
  targetPos: Vec2,
): boolean {
  const myDist = dist(player.pos, targetPos);
  const closestOther = allPlayers
    .filter(
      (p) => p.teamId === player.teamId && p.squadRole !== player.squadRole,
    )
    .reduce((best, p) => Math.min(best, dist(p.pos, targetPos)), Infinity);
  if (player.deferring) return closestOther < myDist;
  return closestOther < myDist - DEFER_MARGIN;
}

function squadPressMove(
  player: Player,
  allPlayers: Player[],
  target: Vec2,
  speed: number,
  action: "prep-tackle" | "prep-intercept",
): Player {
  const mates = allPlayers.filter(
    (p) =>
      p.teamId === player.teamId &&
      p.squadRole === player.squadRole &&
      !p.hasBall,
  );
  const leader = mates.reduce((best, p) =>
    dist(p.pos, target) < dist(best.pos, target) ? p : best,
  );
  if (leader.id === player.id) {
    const moved = directMove(player, target, speed);
    return {
      ...player,
      pos: clampToPitch(moved.pos),
      angle: moved.angle,
      action,
      deferring: false,
    };
  }
  // Supporters target a point behind the leader (away from the target)
  // so they converge on the leader from behind rather than running alongside
  const dx = leader.pos.x - target.x;
  const dy = leader.pos.y - target.y;
  const d = Math.sqrt(dx * dx + dy * dy) || 1;
  const behindLeader = clampToPitch({
    x: leader.pos.x + (dx / d) * 40,
    y: leader.pos.y + (dy / d) * 40,
  });
  const moved = directMove(player, behindLeader, speed * 0.95);
  return {
    ...player,
    pos: clampToPitch(moved.pos),
    angle: moved.angle,
    action: "prep-receive",
    deferring: false,
  };
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

// ── Prep shoot ────────────────────────────────────────────────────────────────
// Move toward goal (wingers only)

export function prepShoot(player: Player, allPlayers: Player[]): Player {
  const gt = goalTarget(player.teamId);
  // Give opponents a wide berth when advancing — treat them like teammates for steering
  const wideAllPlayers = allPlayers.map((p) =>
    p.teamId !== player.teamId
      ? { ...p, teamId: player.teamId as typeof p.teamId }
      : p,
  );
  const moved = steerAndMove(
    { ...player, action: "prep-shoot" },
    gt,
    PLAYER_SPEED,
    wideAllPlayers,
  );
  return {
    ...player,
    pos: clampToPitch(moved.pos),
    angle: moved.angle,
    action: "prep-shoot",
  };
}

// ── Prep pass ─────────────────────────────────────────────────────────────────
// Hold position and wait for winger to be in range (relay/defence)

export function prepPass(player: Player, allPlayers: Player[]): Player {
  const moved = steerAndMove(
    player,
    player.homePos,
    PLAYER_SPEED * 0.3,
    allPlayers,
  );
  return {
    ...player,
    pos: clampToPitch(moved.pos),
    angle: moved.angle,
    action: "prep-pass",
  };
}

// ── Prep receive ──────────────────────────────────────────────────────────────
// Move to low pressure space to receive

/**
 * Returns a score representing how clear the line of sight is between
 * pos and target — higher = clearer. Opponents near the line reduce the score.
 */
export function lineOfSightScore(
  pos: Vec2,
  target: Vec2,
  opponents: Player[],
): number {
  const dx = target.x - pos.x;
  const dy = target.y - pos.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  let score = 200; // base clear score
  for (const opp of opponents) {
    // Project opponent onto the line segment
    const t = Math.max(
      0,
      Math.min(
        1,
        ((opp.pos.x - pos.x) * dx + (opp.pos.y - pos.y) * dy) / (len * len),
      ),
    );
    const closestX = pos.x + t * dx;
    const closestY = pos.y + t * dy;
    const perpDist = Math.sqrt(
      (opp.pos.x - closestX) ** 2 + (opp.pos.y - closestY) ** 2,
    );
    if (perpDist < 40) score -= (40 - perpDist) * 3; // penalise blocked lanes
  }
  return Math.max(0, score);
}

export function prepReceive(player: Player, allPlayers: Player[]): Player {
  const carrier = allPlayers.find(
    (p) => p.teamId === player.teamId && p.hasBall,
  );
  if (!carrier) {
    const space = findLowPressureSpace(player, allPlayers);
    const moved = steerAndMove(player, space, PLAYER_SPEED * 0.9, allPlayers);
    return {
      ...player,
      pos: clampToPitch(moved.pos),
      angle: moved.angle,
      action: "prep-receive",
    };
  }

  const opponents = allPlayers.filter((p) => p.teamId !== player.teamId);
  const gt =
    carrier.teamId === "home"
      ? { x: PITCH_RIGHT, y: CY }
      : { x: PITCH_LEFT, y: CY };

  // Direction from carrier to goal
  const dx = gt.x - carrier.pos.x;
  const dy = gt.y - carrier.pos.y;
  const d = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = dx / d;
  const ny = dy / d;
  const px = -ny; // perpendicular

  const py = -nx; // perpendicular y component

  // Sample positions ahead of carrier in a wide forward cone
  const candidates: Vec2[] = [];
  for (let forward = 80; forward <= 400; forward += 80) {
    for (let lateral = -240; lateral <= 240; lateral += 80) {
      const cx = carrier.pos.x + nx * forward + px * lateral;
      const cy = carrier.pos.y + ny * forward + py * lateral;
      if (cx < PITCH_LEFT + 20 || cx > PITCH_RIGHT - 20) continue;
      if (cy < PITCH_TOP + 20 || cy > PITCH_BOTTOM - 20) continue;
      candidates.push({ x: cx, y: cy });
    }
  }

  if (candidates.length === 0) {
    const moved = steerAndMove(
      player,
      player.homePos,
      PLAYER_SPEED * 0.9,
      allPlayers,
    );
    return {
      ...player,
      pos: clampToPitch(moved.pos),
      angle: moved.angle,
      action: "prep-receive",
    };
  }

  // Score candidates by open space, LOS to carrier, AND tangential separation from squadmates
  const squadmates = allPlayers.filter(
    (p) =>
      p.teamId === carrier.teamId &&
      p.squadRole === player.squadRole &&
      p.id !== player.id,
  );

  // Tangential distance = component of separation perpendicular to radial axis
  function tangentialDist(a: Vec2, b: Vec2): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    // Project onto tangential axis (px, py)
    return Math.abs(dx * px + dy * py);
  }

  function radialDist(a: Vec2, b: Vec2): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.abs(dx * nx + dy * ny);
  }

  const best = candidates.reduce((bestC, c) => {
    const minOpp =
      opponents.length > 0
        ? Math.min(...opponents.map((o) => dist(c, o.pos)))
        : 999;
    const bestMinOpp =
      opponents.length > 0
        ? Math.min(...opponents.map((o) => dist(bestC, o.pos)))
        : 999;
    const losC = lineOfSightScore(c, carrier.pos, opponents);
    const losBest = lineOfSightScore(bestC, carrier.pos, opponents);
    // Tangential separation weighted 2x radial separation
    const tangC =
      squadmates.length > 0
        ? Math.min(...squadmates.map((s) => tangentialDist(c, s.pos)))
        : 999;
    const tangB =
      squadmates.length > 0
        ? Math.min(...squadmates.map((s) => tangentialDist(bestC, s.pos)))
        : 999;
    const radC =
      squadmates.length > 0
        ? Math.min(...squadmates.map((s) => radialDist(c, s.pos)))
        : 999;
    const radB =
      squadmates.length > 0
        ? Math.min(...squadmates.map((s) => radialDist(bestC, s.pos)))
        : 999;
    const scoreC = minOpp + losC + tangC * 2 + radC;
    const scoreBest = bestMinOpp + losBest + tangB * 2 + radB;
    return scoreC > scoreBest ? c : bestC;
  });

  const moved = steerAndMove(player, best, PLAYER_SPEED * 0.9, allPlayers);
  return {
    ...player,
    pos: clampToPitch(moved.pos),
    angle: moved.angle,
    action: "prep-receive",
  };
}

// ── Prep tackle ───────────────────────────────────────────────────────────────
// Move toward opponent ball carrier

export function prepTackle(
  player: Player,
  allPlayers: Player[],
  carrier: Player,
): Player {
  if (shouldDefer(player, allPlayers, carrier.pos)) {
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
  return squadPressMove(
    player,
    allPlayers,
    carrier.pos,
    PLAYER_SPEED,
    "prep-tackle",
  );
}

// ── Prep intercept ────────────────────────────────────────────────────────────
// Move toward loose ball

export function prepIntercept(
  player: Player,
  allPlayers: Player[],
  ballPos: Vec2,
): Player {
  if (shouldDefer(player, allPlayers, ballPos)) {
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

  const mates = allPlayers.filter(
    (p) =>
      p.teamId === player.teamId &&
      p.squadRole === player.squadRole &&
      !p.hasBall,
  );
  const leader = mates.reduce((best, p) =>
    dist(p.pos, ballPos) < dist(best.pos, ballPos) ? p : best,
  );
  const isLeader = leader.id === player.id;

  // Non-leader who is close to ball — step back to give leader space
  if (!isLeader && dist(player.pos, ballPos) < 60) {
    const dx = player.pos.x - ballPos.x;
    const dy = player.pos.y - ballPos.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    const stepBack = clampToPitch({
      x: player.pos.x + (dx / d) * 20,
      y: player.pos.y + (dy / d) * 20,
    });
    const moved = steerAndMove(
      player,
      stepBack,
      PLAYER_SPEED * 0.8,
      allPlayers,
    );
    return {
      ...player,
      pos: clampToPitch(moved.pos),
      angle: moved.angle,
      action: "prep-intercept",
      deferring: false,
    };
  }

  return squadPressMove(
    player,
    allPlayers,
    ballPos,
    PLAYER_SPEED,
    "prep-intercept",
  );
}

// ── Move to space (no ball) ───────────────────────────────────────────────────

export function moveToSpace(player: Player, allPlayers: Player[]): Player {
  const space = findLowPressureSpace(player, allPlayers);
  const moved = steerAndMove(player, space, PLAYER_SPEED * 0.9, allPlayers);
  return {
    ...player,
    pos: clampToPitch(moved.pos),
    angle: moved.angle,
    action: "move-to-space",
  };
}

// ── Hold position ─────────────────────────────────────────────────────────────

export function holdPosition(
  player: Player,
  allPlayers: Player[],
  speed = PLAYER_SPEED * 0.6,
): Player {
  // If close to ball or carrier but not prepping to intercept/tackle, step back to give space
  const ballOrCarrier = allPlayers.find((p) => p.hasBall) ?? null;
  const closeToBall = ballOrCarrier && dist(player.pos, ballOrCarrier.pos) < 80;
  const notActing =
    player.action !== "prep-tackle" && player.action !== "prep-intercept";

  if (closeToBall && notActing) {
    // Step away from ball carrier
    const bp = ballOrCarrier!.pos;
    const dx = player.pos.x - bp.x;
    const dy = player.pos.y - bp.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d > 0) {
      const stepBack = clampToPitch({
        x: player.pos.x + (dx / d) * PLAYER_SPEED * 1.5,
        y: player.pos.y + (dy / d) * PLAYER_SPEED * 1.5,
      });
      return { ...player, pos: stepBack, action: "hold" };
    }
  }

  const moved = steerAndMove(player, player.homePos, speed, allPlayers);
  return {
    ...player,
    pos: clampToPitch(moved.pos),
    angle: moved.angle,
    action: "hold",
  };
}
