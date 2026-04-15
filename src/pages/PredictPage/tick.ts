import { GameState, Player } from "./types";
import { tickBall, dist, clampToPitch } from "./physics";
import { toBipolar, fromBipolar } from "./bipolar";
import { updatePressure } from "./pressure";
import { updateSquads } from "./squads";
import {
  tickPlayerWithBall,
  tickPlayerWithoutBall,
  execTackle,
  execIntercept,
  execReceive,
} from "./actions";
import { resolveSeparation } from "./separation";
import { resetAfterGoal } from "./init";
import { PLAYER_RADIUS } from "./constants";

const TACKLE_CONTACT = 22;
const PICKUP_RADIUS = TACKLE_CONTACT;

export function tickState(state: GameState): GameState {
  let players = state.players.map((p) => ({ ...p }));
  let ball = { ...state.ball };
  let teams = state.teams.map((t) => ({ ...t }));

  // 1. Ball physics
  const { ball: newBall, homeGoal, awayGoal } = tickBall(ball, players);
  ball = newBall;

  if (homeGoal) return resetAfterGoal(state, "home");
  if (awayGoal) return resetAfterGoal(state, "away");

  // 2. Team possession
  teams = teams.map((t) => ({
    ...t,
    hasBall: players.some((p) => p.teamId === t.id && p.hasBall),
  }));

  // 3. Scan rotation — players slowly rotate scanAngle to check surroundings
  const SCAN_SPEED = Math.PI / 120; // full rotation in ~4 seconds
  players = players.map((p) => ({ ...p, scanAngle: p.scanAngle + SCAN_SPEED }));

  // 4. Pressure — uses both facing angle and scan angle
  players = updatePressure(players);

  // 4. Squads
  const squads = updateSquads(state.squads, players, teams);

  // 5. Tackle cooldown
  players = players.map((p) =>
    p.tackleCooldown > 0 ? { ...p, tackleCooldown: p.tackleCooldown - 1 } : p,
  );

  // 6. Contact tackle — opponent touches carrier
  const carrier = players.find((p) => p.hasBall);
  if (carrier) {
    for (const p of players) {
      if (p.teamId === carrier.teamId) continue;
      if (p.tackleCooldown > 0) continue;
      if (dist(p.pos, carrier.pos) <= TACKLE_CONTACT) {
        const result = execTackle(p, carrier, ball);
        players = players.map((pl) => {
          if (
            pl.id === result.tackler.id &&
            pl.teamId === result.tackler.teamId
          )
            return result.tackler;
          if (
            pl.id === result.carrier.id &&
            pl.teamId === result.carrier.teamId
          )
            return result.carrier;
          return pl;
        });
        ball = result.ball;
        break;
      }
    }
  }

  // 7. Tick each player
  const updatedPlayers: Player[] = [];
  let updatedBall = { ...ball };

  for (const p of players) {
    const squad = squads.find(
      (s) => s.teamId === p.teamId && s.role === p.squadRole,
    )!;
    if (p.hasBall) {
      const { player: np, ball: nb } = tickPlayerWithBall(
        p,
        players,
        squads,
        updatedBall,
      );
      updatedPlayers.push(np);
      updatedBall = nb;
    } else {
      updatedPlayers.push(
        tickPlayerWithoutBall(p, squad, updatedBall, players, squads),
      );
    }
  }

  // 8. Ball follows owner
  if (!updatedBall.loose && updatedBall.ownerId) {
    const [tid, pid] = updatedBall.ownerId.split("-");
    const owner = updatedPlayers.find(
      (p) => p.teamId === tid && p.id === Number(pid),
    );
    if (owner) updatedBall = { ...updatedBall, pos: { ...owner.pos } };
  }

  // 9. Separation
  const separatedPlayers = resolveSeparation(updatedPlayers);

  // 9b. Lock defenders to home radial position in bipolar coords
  const restoredPlayers = separatedPlayers.map((p) => {
    if (p.squadRole !== "defence" || p.hasBall) return p;
    const homeBp = toBipolar(p.homePos, p.teamId);
    const currBp = toBipolar(p.pos, p.teamId);
    return {
      ...p,
      pos: clampToPitch(
        fromBipolar(
          { radial: homeBp.radial, tangential: currBp.tangential },
          p.teamId,
        ),
      ),
    };
  });

  // 10. Loose ball pickup — after separation
  let finalPlayers = restoredPlayers;
  if (!updatedBall.loose && updatedBall.ownerId === null) {
    let nearest: Player | null = null;
    let nearestDist = Infinity;
    for (const p of finalPlayers) {
      const d = dist(p.pos, updatedBall.pos);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = p;
      }
    }
    if (nearest && nearestDist < PICKUP_RADIUS) {
      const result = execIntercept(nearest, updatedBall);
      finalPlayers = finalPlayers.map((p) =>
        p.id === nearest!.id && p.teamId === nearest!.teamId
          ? result.player
          : p,
      );
      updatedBall = result.ball;
    }
  }

  return {
    players: finalPlayers,
    squads,
    ball: updatedBall,
    teams,
    tick: state.tick + 1,
  };
}
