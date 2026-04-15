import { GameState, Player } from "./types";
import { tickBall, dist } from "./physics";
import { updatePressure } from "./pressure";
import { updateSquads } from "./squads";
import {
  tickPlayerWithBall,
  tickPlayerWithoutBall,
  resolveTackle,
} from "./actions";
import { resolveSeparation } from "./separation";
import { resetAfterGoal } from "./init";
import { PLAYER_RADIUS } from "./constants";

const TACKLE_CONTACT = 18;
const PICKUP_RADIUS = PLAYER_RADIUS * 3; // generous — separation can't block this

function pickupLooseBall(
  players: Player[],
  ball: {
    pos: { x: number; y: number };
    loose: boolean;
    ownerId: string | null;
    vel: { x: number; y: number };
  },
) {
  if (ball.loose || ball.ownerId !== null) return { players, ball };
  let nearest: Player | null = null;
  let nearestDist = Infinity;
  for (const p of players) {
    const d = dist(p.pos, ball.pos);
    if (d < nearestDist) {
      nearestDist = d;
      nearest = p;
    }
  }
  if (nearest && nearestDist < PICKUP_RADIUS) {
    return {
      players: players.map((p) =>
        p.id === nearest!.id && p.teamId === nearest!.teamId
          ? { ...p, hasBall: true }
          : p,
      ),
      ball: { ...ball, ownerId: `${nearest.teamId}-${nearest.id}` },
    };
  }
  return { players, ball };
}

export function tickState(state: GameState): GameState {
  let players = state.players.map((p) => ({ ...p }));
  let ball = { ...state.ball };
  let teams = state.teams.map((t) => ({ ...t }));

  // 1. Ball physics
  const { ball: newBall, homeGoal, awayGoal } = tickBall(ball);
  ball = newBall;

  if (homeGoal)
    return resetAfterGoal(
      {
        ...state,
        teams: teams.map((t) =>
          t.id === "home" ? { ...t, score: t.score + 1 } : t,
        ),
      },
      "home",
    );
  if (awayGoal)
    return resetAfterGoal(
      {
        ...state,
        teams: teams.map((t) =>
          t.id === "away" ? { ...t, score: t.score + 1 } : t,
        ),
      },
      "away",
    );

  // 2. Team possession
  teams = teams.map((t) => ({
    ...t,
    hasBall: players.some((p) => p.teamId === t.id && p.hasBall),
  }));

  // 3. Pressure
  players = updatePressure(players);

  // 4. Squads
  const squads = updateSquads(state.squads, players, teams);

  // 5. Tackle cooldown tick-down
  players = players.map((p) =>
    p.tackleCooldown > 0 ? { ...p, tackleCooldown: p.tackleCooldown - 1 } : p,
  );

  // 6. Contact tackle detection
  const carrier = players.find((p) => p.hasBall);
  if (carrier) {
    for (const p of players) {
      if (p.teamId === carrier.teamId) continue;
      if (p.tackleCooldown > 0) continue;
      if (dist(p.pos, carrier.pos) <= TACKLE_CONTACT) {
        const result = resolveTackle(p, carrier, ball);
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

  // 9. Resolve overlaps
  const separatedPlayers = resolveSeparation(updatedPlayers);

  // 10. Loose ball pickup — after separation so players pushed close enough can claim ball
  const picked = pickupLooseBall(separatedPlayers, updatedBall);

  return {
    players: picked.players,
    squads,
    ball: picked.ball,
    teams,
    tick: state.tick + 1,
  };
}
