import { Player, Squad, Ball } from "./types";
import { dist, clampToPitch } from "./physics";
import { worthyWingerSquad } from "./squads";
import {
  PASS_RANGE,
  RECEIVE_RANGE,
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
} from "./prepActions";
import { execPass, execShoot } from "./execActions";

export type { TackleResult } from "./execActions";
export { execTackle, execIntercept, execReceive } from "./execActions";

// ── Ball carrier ──────────────────────────────────────────────────────────────

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
    const prepped = prepShoot(p, allPlayers);
    return { player: prepped, ball: { ...ball, pos: prepped.pos } };
  }

  // Relay / defence — pass to worthy winger or hold
  const worthy = worthyWingerSquad(allSquads, p.teamId);
  if (worthy) {
    const target = allPlayers.find(
      (t) =>
        t.teamId === p.teamId &&
        worthy.playerIds.includes(t.id) &&
        t.pressure < HIGH_PRESSURE,
    );
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
  if (teammatePassing) return prepReceive(player, allPlayers);

  switch (squad.role) {
    case "right-wing":
    case "left-wing":
      return tickWinger(player, squad.action as string, ball, allPlayers);
    case "relay":
      return tickRelay(player, squad.action as string, ball, allPlayers);
    case "defence":
      return tickDefence(player, squad.action as string, ball, allPlayers);
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

function tickDefence(
  player: Player,
  action: string,
  ball: Ball,
  allPlayers: Player[],
): Player {
  if (action === "choose-worthy-squad") return holdPosition(player, allPlayers);

  const carrier = allPlayers.find(
    (p) => p.teamId !== player.teamId && p.hasBall,
  );

  if (carrier) {
    // Closest defender presses, others hold defensive line
    const defenders = allPlayers.filter(
      (p) =>
        p.teamId === player.teamId && p.squadRole === "defence" && !p.hasBall,
    );
    const closest = defenders.reduce((best, p) =>
      dist(p.pos, carrier.pos) < dist(best.pos, carrier.pos) ? p : best,
    );

    if (closest.id === player.id) {
      return prepTackle(player, allPlayers, carrier);
    } else {
      // Hold line — get between carrier and own goal
      const ownGoal =
        player.teamId === "home"
          ? { x: PITCH_LEFT, y: CY }
          : { x: PITCH_RIGHT, y: CY };
      const dx = ownGoal.x - carrier.pos.x;
      const dy = ownGoal.y - carrier.pos.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      // Position 2/3 of the way between carrier and own goal, spread apart
      const defenders2 = defenders.filter((p) => p.id !== closest.id);
      const idx = defenders2.findIndex((p) => p.id === player.id);
      const spread = idx === 0 ? -50 : 50;
      // Stand 150px in front of own goal, on the line between goal and carrier
      const blockPos = clampToPitch({
        x: ownGoal.x + (dx / d) * 150,
        y: ownGoal.y + (dy / d) * 150 + spread,
      });
      const moved = steerAndMove(
        player,
        blockPos,
        PLAYER_SPEED * 0.9,
        allPlayers,
      );
      return {
        ...player,
        pos: clampToPitch(moved.pos),
        angle: moved.angle,
        action: "defend",
      };
    }
  }

  if (ball.ownerId === null) return prepIntercept(player, allPlayers, ball.pos);
  return holdPosition(player, allPlayers);
}
