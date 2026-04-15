import { GameState, Player, TeamId } from "./types";
import { tickBall, dist } from "./physics";
import { updatePressure } from "./pressure";
import { updateSquads } from "./squads";
import { tickPlayerWithBall, tickPlayerWithoutBall } from "./actions";
import { resetAfterGoal } from "./init";
import { PLAYER_RADIUS } from "./constants";

export function tickState(state: GameState): GameState {
  let players = [...state.players.map((p) => ({ ...p }))];
  let ball = { ...state.ball };
  let squads = state.squads.map((s) => ({ ...s }));
  let teams = state.teams.map((t) => ({ ...t }));

  // 1. Tick ball physics
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

  // 2. Loose ball pickup — nearest player from either team claims it
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

  // 3. Update team possession
  teams = teams.map((t) => ({
    ...t,
    hasBall: players.some((p) => p.teamId === t.id && p.hasBall),
  }));

  // 4. Update pressure
  players = updatePressure(players);

  // 5. Update squads
  squads = updateSquads(squads, players, teams);

  // 6. Tick each player
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
        squad,
        updatedBall,
      );
      updatedPlayers.push(np);
      updatedBall = nb;
    } else {
      updatedPlayers.push(
        tickPlayerWithoutBall(p, squad, updatedBall, players),
      );
    }
  }

  // 7. Ball follows owner if not loose
  if (!updatedBall.loose && updatedBall.ownerId) {
    const [tid, pid] = updatedBall.ownerId.split("-");
    const owner = updatedPlayers.find(
      (p) => p.teamId === tid && p.id === Number(pid),
    );
    if (owner) updatedBall = { ...updatedBall, pos: { ...owner.pos } };
  }

  return {
    players: updatedPlayers,
    squads,
    ball: updatedBall,
    teams,
    tick: state.tick + 1,
  };
}
