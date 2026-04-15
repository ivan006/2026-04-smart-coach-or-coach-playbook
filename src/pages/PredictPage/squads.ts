import { Squad, Player, Team, SquadAction } from "./types";

/**
 * Derives squad state from current player states and team possession.
 */
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
    if (!team.hasBall) {
      action = "move-to-take";
    } else if (hasBall) {
      action = "move-to-shoot";
    } else {
      action = "move-to-space";
    }

    return { ...sq, hasBall, pressure, action };
  });
}
