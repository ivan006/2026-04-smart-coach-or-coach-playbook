import { Player } from "./types";
import { dist } from "./physics";
import { PRESSURE_RADIUS } from "./constants";

const FOV = Math.PI; // 180 degree field of view

function inFieldOfView(player: Player, other: Player): boolean {
  const dx = other.pos.x - player.pos.x;
  const dy = other.pos.y - player.pos.y;
  const angleToOther = Math.atan2(dy, dx);

  for (const facing of [player.angle, player.scanAngle]) {
    let diff = angleToOther - facing;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (Math.abs(diff) < FOV / 2) return true;
  }
  return false;
}

export function updatePressure(players: Player[]): Player[] {
  return players.map((p) => {
    const opponents = players.filter((o) => o.teamId !== p.teamId);
    const nearbyCount = opponents.filter(
      (o) => dist(p.pos, o.pos) < PRESSURE_RADIUS && inFieldOfView(p, o),
    ).length;
    return { ...p, pressure: nearbyCount };
  });
}
