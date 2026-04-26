import { PITCH_LEFT, PITCH_RIGHT, PITCH_W, CY } from "./constants";

export type FormationEntry = {
  defensive: { x: number; y: number };
  middle:    { x: number; y: number };
  attacking: { x: number; y: number };
};

/** Home team formation — mirrors HELIOS fedit2 formation data */
export const HOME_FORMATION: FormationEntry[] = [
  // Goalkeeper
  { defensive: { x: PITCH_LEFT + 30,             y: CY },
    middle:    { x: PITCH_LEFT + 50,             y: CY },
    attacking: { x: PITCH_LEFT + 80,             y: CY } },
  // Left Back
  { defensive: { x: PITCH_LEFT + PITCH_W * 0.15, y: CY - 120 },
    middle:    { x: PITCH_LEFT + PITCH_W * 0.25, y: CY - 150 },
    attacking: { x: PITCH_LEFT + PITCH_W * 0.4,  y: CY - 160 } },
  // Right Back
  { defensive: { x: PITCH_LEFT + PITCH_W * 0.15, y: CY + 120 },
    middle:    { x: PITCH_LEFT + PITCH_W * 0.25, y: CY + 150 },
    attacking: { x: PITCH_LEFT + PITCH_W * 0.4,  y: CY + 160 } },
  // Central Midfielder
  { defensive: { x: PITCH_LEFT + PITCH_W * 0.35, y: CY - 60 },
    middle:    { x: PITCH_LEFT + PITCH_W * 0.5,  y: CY - 60 },
    attacking: { x: PITCH_LEFT + PITCH_W * 0.65, y: CY - 80 } },
  // Forward
  { defensive: { x: PITCH_LEFT + PITCH_W * 0.5,  y: CY },
    middle:    { x: PITCH_LEFT + PITCH_W * 0.65, y: CY },
    attacking: { x: PITCH_LEFT + PITCH_W * 0.8,  y: CY } },
];

/**
 * formation_use_bbt — interpolates player target position based on ball x.
 * Mirrors HELIOS Delaunay triangulation: ball position → all player positions.
 */
export function getFormationTarget(entry: FormationEntry, ballX: number): { x: number; y: number } {
  const t = Math.max(0, Math.min(1, (ballX - PITCH_LEFT) / PITCH_W));
  const s = t < 0.33 ? t / 0.33 : (t - 0.33) / 0.67;
  const a = t < 0.33 ? entry.defensive : entry.middle;
  const b = t < 0.33 ? entry.middle    : entry.attacking;
  return { x: a.x + (b.x - a.x) * s, y: a.y + (b.y - a.y) * s };
}
