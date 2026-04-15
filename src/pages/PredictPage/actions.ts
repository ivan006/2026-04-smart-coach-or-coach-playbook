import { Player, Squad, Ball } from "./types";
import { dist, clampToPitch } from "./physics";
import { toBipolar, fromBipolar } from "./bipolar";
import { worthyWingerSquad } from "./squads";
import {
  PASS_RANGE,
  PLAYER_SPEED,
  HIGH_PRESSURE,
  PITCH_LEFT,
  PITCH_RIGHT,
  CY,
} from "./constants";
import {
  prepShoot,
  prepPass,
  prepReceive,
  prepTackle,
  prepIntercept,
  moveToSpace,
  holdPosition,
  steerAndMove,
  isInShootingPosition,
  lineOfSightScore,
  clampTurn as clampTurnAngle,
} from "./prepActions";
import { execPass, execShoot } from "./execActions";

export type { TackleResult } from "./execActions";
export { execTackle, execIntercept, execReceive } from "./execActions";

// ── Ball carrier ──────────────────────────────────────────────────────────────

function hasLineOfSight(
  from: Player,
  to: Player,
  allPlayers: Player[],
): boolean {
  const opponents = allPlayers.filter((p) => p.teamId !== from.teamId);
  return lineOfSightScore(from.pos, to.pos, opponents) > 120;
}

function reward(player: Player, allPlayers: Player[]): number {
  const gt =
    player.teamId === "home"
      ? { x: PITCH_RIGHT, y: CY }
      : { x: PITCH_LEFT, y: CY };
  const radialCloseness = 1 - dist(player.pos, gt) / (PITCH_RIGHT - PITCH_LEFT);
  const freedom = 1 - Math.min(player.pressure / 5, 1);
  return radialCloseness + freedom;
}

export function tickPlayerWithBall(
  player: Player,
  allPlayers: Player[],
  allSquads: Squad[],
  ball: Ball,
): { player: Player; ball: Ball } {
  const p = { ...player, deferring: false };

  // Wingers — shoot when in position, otherwise advance
  if (p.squadRole === "right-wing" || p.squadRole === "left-wing") {
    if (isInShootingPosition(p)) return execShoot(p, ball);
    // Pass to lowest pressure teammate with clear line of sight
    const selfReward = reward(p, allPlayers);
    const target = allPlayers
      .filter(
        (t) =>
          t.teamId === p.teamId &&
          t.squadRole === p.squadRole &&
          t.id !== p.id &&
          reward(t, allPlayers) > selfReward &&
          hasLineOfSight(p, t, allPlayers),
      )
      .sort((a, b) => reward(b, allPlayers) - reward(a, allPlayers))[0];
    if (target) return execPass(p, target, ball);
    const prepped = prepShoot(p, allPlayers);
    return { player: prepped, ball: { ...ball, pos: prepped.pos } };
  }

  // Relay / defence — pass to worthy winger or hold
  const worthy = worthyWingerSquad(allSquads, p.teamId);
  if (worthy) {
    const target = allPlayers
      .filter(
        (t) =>
          t.teamId === p.teamId &&
          worthy.playerIds.includes(t.id) &&
          hasLineOfSight(p, t, allPlayers),
      )
      .sort((a, b) => reward(b, allPlayers) - reward(a, allPlayers))[0];
    if (target) return execPass(p, target, ball);
  }

  const held = steerAndMove(p, p.homePos, PLAYER_SPEED * 0.3, allPlayers);
  return {
    player: { ...p, pos: held.pos, angle: held.angle, action: "prep-pass" },
    ball: { ...ball, pos: held.pos },
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
  const teammatePassing = allPlayers.some(
    (p) =>
      p.teamId === player.teamId &&
      p.hasBall &&
      (p.action === "prep-pass" || p.action === "pass") &&
      dist(p.pos, player.pos) < PASS_RANGE,
  );
  if (teammatePassing)
    return faceTarget(prepReceive(player, allPlayers), ball.pos);

  let result: Player;
  switch (squad.role) {
    case "right-wing":
    case "left-wing":
      result = tickWinger(player, squad.action as string, ball, allPlayers);
      break;
    case "relay":
      result = tickRelay(player, squad.action as string, ball, allPlayers);
      break;
    case "defence":
      result = tickDefence(player, squad.action as string, ball, allPlayers);
      break;
    default:
      result = player;
  }
  return faceTarget(result, ball.pos);
}

function faceTarget(player: Player, target: { x: number; y: number }): Player {
  const angle = Math.atan2(target.y - player.pos.y, target.x - player.pos.x);
  const clamped = clampTurnAngle(player.angle, angle);
  return { ...player, angle: clamped };
}

function tickWinger(
  player: Player,
  action: string,
  ball: Ball,
  allPlayers: Player[],
): Player {
  switch (action) {
    case "move-to-shoot":
      return prepReceive(player, allPlayers);
    case "move-to-space":
      return moveToSpace(player, allPlayers);
    case "move-to-take": {
      const carrier = allPlayers.find(
        (p) => p.hasBall && p.teamId !== player.teamId,
      );
      if (ball.ownerId === null)
        return prepIntercept(player, allPlayers, ball.pos);
      if (carrier) return prepTackle(player, allPlayers, carrier);
      return holdPosition(player, allPlayers);
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
): Player {
  if (action === "keep-position") {
    const carrier = allPlayers.find(
      (p) => p.teamId !== player.teamId && p.hasBall,
    );
    if (carrier) return prepTackle(player, allPlayers, carrier);
    if (ball.ownerId === null)
      return prepIntercept(player, allPlayers, ball.pos);
    return holdPosition(player, allPlayers);
  }
  return holdPosition(player, allPlayers);
}

function holdDefensiveLine(player: Player, allPlayers: Player[]): Player {
  // In bipolar coords: radial is locked to home radial, tangential drifts back to home
  const homeBp = toBipolar(player.homePos, player.teamId);
  const currBp = toBipolar(player.pos, player.teamId);
  const newBp = {
    radial: homeBp.radial,
    tangential:
      currBp.tangential + (homeBp.tangential - currBp.tangential) * 0.05,
  };
  const angle = player.teamId === "home" ? 0 : Math.PI;
  return {
    ...player,
    pos: clampToPitch(fromBipolar(newBp, player.teamId)),
    angle,
    action: "defend",
  };
}

function tickDefence(
  player: Player,
  action: string,
  ball: Ball,
  allPlayers: Player[],
): Player {
  if (action === "choose-worthy-squad")
    return holdDefensiveLine(player, allPlayers);

  const carrier = allPlayers.find(
    (p) => p.teamId !== player.teamId && p.hasBall,
  );

  if (carrier) {
    const defenders = allPlayers
      .filter(
        (p) =>
          p.teamId === player.teamId && p.squadRole === "defence" && !p.hasBall,
      )
      .sort((a, b) => a.id - b.id);
    const closest = defenders.reduce((best, p) =>
      dist(p.pos, carrier.pos) < dist(best.pos, carrier.pos) ? p : best,
    );

    if (closest.id === player.id) {
      // Closest defender: lock radial to home, slide tangentially toward carrier's tangential
      const homeBp = toBipolar(player.homePos, player.teamId);
      const carrierBp = toBipolar(carrier.pos, player.teamId);
      const currBp = toBipolar(player.pos, player.teamId);
      const targetTang = CY + carrierBp.tangential * 0.8; // biased toward center
      const newBp = {
        radial: homeBp.radial,
        tangential:
          currBp.tangential + (targetTang - CY - currBp.tangential) * 0.1,
      };
      const angle = Math.atan2(
        carrier.pos.y - player.pos.y,
        carrier.pos.x - player.pos.x,
      );
      return {
        ...player,
        pos: clampToPitch(fromBipolar(newBp, player.teamId)),
        angle,
        action: "defend",
      };
    }

    return holdDefensiveLine(player, allPlayers);
  }

  if (ball.ownerId === null) return prepIntercept(player, allPlayers, ball.pos);
  return holdDefensiveLine(player, allPlayers);
}
