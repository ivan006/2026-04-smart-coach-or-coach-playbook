import { GameState, Player, Squad, TeamId, SquadRole } from "./types";
import {
  PITCH_LEFT,
  PITCH_RIGHT,
  PITCH_W,
  PITCH_H,
  PITCH_TOP,
  CX,
  CY,
} from "./constants";

function squadOf(id: number): SquadRole {
  if ([1, 3, 4].includes(id)) return "defence";
  if ([9, 11].includes(id)) return "relay";
  if ([7, 5, 10].includes(id)) return "right-wing";
  if ([2, 6, 8].includes(id)) return "left-wing";
  return "relay";
}

// Home team attacks right goal (high x), away team attacks left goal (low x)
function homePos(id: number, teamId: TeamId): { x: number; y: number } {
  const positions: Record<number, { x: number; y: number }> = {
    1: { x: PITCH_LEFT + PITCH_W * 0.12, y: CY - 80 },
    3: { x: PITCH_LEFT + PITCH_W * 0.12, y: CY },
    4: { x: PITCH_LEFT + PITCH_W * 0.12, y: CY + 80 },
    9: { x: PITCH_LEFT + PITCH_W * 0.38, y: CY - 40 },
    11: { x: PITCH_LEFT + PITCH_W * 0.38, y: CY + 40 },
    7: { x: PITCH_LEFT + PITCH_W * 0.55, y: PITCH_TOP + PITCH_H * 0.18 },
    5: { x: PITCH_LEFT + PITCH_W * 0.68, y: PITCH_TOP + PITCH_H * 0.12 },
    10: { x: PITCH_LEFT + PITCH_W * 0.8, y: PITCH_TOP + PITCH_H * 0.2 },
    2: { x: PITCH_LEFT + PITCH_W * 0.55, y: PITCH_TOP + PITCH_H * 0.82 },
    6: { x: PITCH_LEFT + PITCH_W * 0.68, y: PITCH_TOP + PITCH_H * 0.88 },
    8: { x: PITCH_LEFT + PITCH_W * 0.8, y: PITCH_TOP + PITCH_H * 0.8 },
  };
  const p = positions[id] ?? { x: CX, y: CY };
  // Mirror x for away team
  if (teamId === "away") {
    return { x: PITCH_LEFT + PITCH_RIGHT - p.x, y: p.y };
  }
  return p;
}

function makePlayers(teamId: TeamId): Player[] {
  const ids = [1, 3, 4, 9, 11, 7, 5, 10, 2, 6, 8];
  return ids.map((id) => {
    const hp = homePos(id, teamId);
    return {
      id,
      teamId,
      squadRole: squadOf(id),
      pos: { ...hp },
      angle: teamId === "away" ? Math.PI : 0,
      hasBall: false,
      pressure: 0,
      action: "move-to-space" as const,
      homePos: hp,
    };
  });
}

function makeSquads(teamId: TeamId, players: Player[]): Squad[] {
  const roles: SquadRole[] = ["defence", "relay", "right-wing", "left-wing"];
  return roles.map((role) => ({
    role,
    teamId,
    playerIds: players.filter((p) => p.squadRole === role).map((p) => p.id),
    hasBall: false,
    pressure: 0,
    action: "move-to-take" as const,
  }));
}

export function initState(): GameState {
  const homePlayers = makePlayers("home");
  const awayPlayers = makePlayers("away");

  // Give ball to home relay player 9
  const p9 = homePlayers.find((p) => p.id === 9)!;
  p9.hasBall = true;
  p9.pos = { x: CX, y: CY };

  const homeSquads = makeSquads("home", homePlayers);
  const awaySquads = makeSquads("away", awayPlayers);

  // Mark home relay squad as having ball
  homeSquads.find((s) => s.role === "relay")!.hasBall = true;

  return {
    players: [...homePlayers, ...awayPlayers],
    squads: [...homeSquads, ...awaySquads],
    ball: {
      pos: { x: CX, y: CY },
      vel: { x: 0, y: 0 },
      loose: false,
      ownerId: "home-9",
    },
    teams: [
      { id: "home", hasBall: true, score: 0 },
      { id: "away", hasBall: false, score: 0 },
    ],
    tick: 0,
  };
}

export function resetAfterGoal(
  state: GameState,
  scoringTeam: TeamId,
): GameState {
  const s = { ...state };
  s.tick = state.tick;

  // Update score
  s.teams = state.teams.map((t) =>
    t.id === scoringTeam
      ? { ...t, score: t.score + 1, hasBall: false }
      : { ...t, hasBall: false },
  );

  // Reset players to home positions
  s.players = state.players.map((p) => ({
    ...p,
    pos: { ...p.homePos },
    hasBall: false,
    pressure: 0,
    action: "move-to-space" as const,
    angle: p.teamId === "away" ? Math.PI : 0,
  }));

  // Give ball to away relay (9) at centre after home scores, else home relay
  const kickoffTeam: TeamId = scoringTeam === "home" ? "away" : "home";
  const kickoffPlayer = s.players.find(
    (p) => p.teamId === kickoffTeam && p.id === 9,
  )!;
  kickoffPlayer.hasBall = true;
  kickoffPlayer.pos = { x: CX, y: CY };

  s.ball = {
    pos: { x: CX, y: CY },
    vel: { x: 0, y: 0 },
    loose: false,
    ownerId: `${kickoffTeam}-9`,
  };

  s.teams = s.teams.map((t) => ({ ...t, hasBall: t.id === kickoffTeam }));

  s.squads = state.squads.map((sq) => ({
    ...sq,
    hasBall: sq.teamId === kickoffTeam && sq.role === "relay",
    pressure: 0,
    action: "move-to-take" as const,
  }));

  return s;
}
