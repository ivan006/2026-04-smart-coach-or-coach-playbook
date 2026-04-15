import { Squad, Player, Team, SquadAction, SquadRole } from "./types";

function wingerAction(squad: Squad, team: { hasBall: boolean }): SquadAction {
  if (!team.hasBall) return "move-to-take";
  if (squad.hasBall) return "move-to-shoot";
  return "move-to-space";
}

/**
 * Returns the winger squad with the lowest pressure on a given team.
 * Used by relay squad to decide who to feed.
 */
export function worthyWingerSquad(
  squads: Squad[],
  teamId: string,
  excludeRole?: SquadRole,
): Squad | null {
  const wingers = squads.filter(
    (s) =>
      s.teamId === teamId &&
      (s.role === "right-wing" || s.role === "left-wing") &&
      s.role !== excludeRole,
  );
  if (wingers.length === 0) return null;
  return wingers.reduce((best, s) => (s.pressure < best.pressure ? s : best));
}

export function updateSquads(
  squads: Squad[],
  players: Player[],
  teams: Team[],
): Squad[] {
  return squads.map((sq) => {
    const sqPlayers = players.filter(
      (p) => p.teamId === sq.teamId && sq.playerIds.includes(p.id),
    );
    const team = teams.find((t) => t.id === sq.teamId)!;

    const hasBall = sqPlayers.some((p) => p.hasBall);
    const pressure =
      sqPlayers.length > 0
        ? sqPlayers.reduce((sum, p) => sum + p.pressure, 0) / sqPlayers.length
        : 0;

    let action: SquadAction;
    switch (sq.role) {
      case "right-wing":
      case "left-wing":
        action = wingerAction({ ...sq, hasBall, pressure }, team);
        break;
      case "defence":
        action = "defend-goal";
        break;
      case "relay":
        action = team.hasBall ? "choose-worthy-squad" : "keep-position";
        break;
    }

    return { ...sq, hasBall, pressure, action };
  });
}
