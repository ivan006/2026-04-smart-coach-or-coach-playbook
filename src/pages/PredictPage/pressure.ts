import { Player } from "./types";
import { dist } from "./physics";
import { PRESSURE_RADIUS } from "./constants";

/**
 * Recalculates pressure for every player based on how many
 * opponents are within PRESSURE_RADIUS of them.
 */
export function updatePressure(players: Player[]): Player[] {
  return players.map((p) => {
    const opponents = players.filter((o) => o.teamId !== p.teamId);
    const nearbyCount = opponents.filter(
      (o) => dist(p.pos, o.pos) < PRESSURE_RADIUS,
    ).length;
    return { ...p, pressure: nearbyCount };
  });
}
