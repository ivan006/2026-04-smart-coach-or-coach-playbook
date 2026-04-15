export const W = 1200;
export const H = 700;

export const PITCH_LEFT = 40;
export const PITCH_RIGHT = W - 40;
export const PITCH_TOP = 20;
export const PITCH_BOTTOM = H - 20;
export const PITCH_W = PITCH_RIGHT - PITCH_LEFT;
export const PITCH_H = PITCH_BOTTOM - PITCH_TOP;
export const CX = W / 2;
export const CY = H / 2;

export const GOAL_W = 20;
export const GOAL_H = 120;
export const GOAL_TOP = CY - GOAL_H / 2;
export const GOAL_BOT = CY + GOAL_H / 2;

export const FRICTION = 0.97;
export const STOP_THRESH = 0.15;
export const BOUNCE_DAMP = 0.6;

export const PRESSURE_RADIUS = 80;
export const HIGH_PRESSURE = 2;

export const PASS_POWER = 16;
export const PASS_RANGE = 200;
export const SHOOT_RANGE = 160;
export const PLAYER_SPEED = 1.8;
export const PLAYER_RADIUS = 10;

// One flat colour per team — all players on a team share it
export const TEAM_COLOURS: Record<string, string> = {
  home: "#3b82f6", // blue
  away: "#ef4444", // red
};
