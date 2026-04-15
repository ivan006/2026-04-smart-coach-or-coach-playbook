import { GameState, Player } from "./types";
import { tickBall, dist } from "./physics";
import { updatePressure } from "./pressure";
import { updateSquads } from "./squads";
import { tickPlayerWithBall, tickPlayerWithoutBall } from "./actions";
import { resolveSeparation } from "./separation";
import { resetAfterGoal } from "./init";
import { PLAYER_RADIUS } from "./constants";

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

  // 2. Loose ball pickup
  if (!ball.loose && ball.ownerId === null) {
    let nearest: Player | null = null;
    let nearestDist = Infinity;
    for (const p of players) {
      const d = dist(p.pos, ball.pos);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = p;
      }
    }
    if (nearest && nearestDist < PLAYER_RADIUS * 2.5) {
      players = players.map((p) =>
        p.id === nearest!.id && p.teamId === nearest!.teamId
          ? { ...p, hasBall: true }
          : p,
      );
      ball = { ...ball, ownerId: `${nearest.teamId}-${nearest.id}` };
    }
  }

  // 3. Team possession
  teams = teams.map((t) => ({
    ...t,
    hasBall: players.some((p) => p.teamId === t.id && p.hasBall),
  }));

  // 4. Pressure
  players = updatePressure(players);

  // 5. Squads
  const squads = updateSquads(state.squads, players, teams);

  // 6. Tick players
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

  // 7. Ball follows owner
  if (!updatedBall.loose && updatedBall.ownerId) {
    const [tid, pid] = updatedBall.ownerId.split("-");
    const owner = updatedPlayers.find(
      (p) => p.teamId === tid && p.id === Number(pid),
    );
    if (owner) updatedBall = { ...updatedBall, pos: { ...owner.pos } };
  }

  // 8. Resolve any remaining overlaps
  const separatedPlayers = resolveSeparation(updatedPlayers);

  return {
    players: separatedPlayers,
    squads,
    ball: updatedBall,
    teams,
    tick: state.tick + 1,
  };
}
