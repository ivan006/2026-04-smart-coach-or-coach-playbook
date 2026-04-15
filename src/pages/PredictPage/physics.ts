import { Ball, Vec2, Player } from "./types";
import {
  PITCH_LEFT,
  PITCH_RIGHT,
  PITCH_TOP,
  PITCH_BOTTOM,
  GOAL_TOP,
  GOAL_BOT,
  FRICTION,
  STOP_THRESH,
  BOUNCE_DAMP,
  PLAYER_RADIUS,
} from "./constants";

const BALL_RADIUS = 6;
const BALL_BOUNCE = 0.5;

export function tickBall(
  ball: Ball,
  players: Player[] = [],
): { ball: Ball; homeGoal: boolean; awayGoal: boolean } {
  if (!ball.loose) return { ball, homeGoal: false, awayGoal: false };

  let { x, y } = ball.pos;
  let { x: vx, y: vy } = ball.vel;

  x += vx;
  y += vy;
  vx *= FRICTION;
  vy *= FRICTION;

  // Right goal — home scores
  if (x >= PITCH_RIGHT && y >= GOAL_TOP && y <= GOAL_BOT) {
    return {
      ball: { ...ball, pos: { x, y }, vel: { x: 0, y: 0 }, loose: false },
      homeGoal: true,
      awayGoal: false,
    };
  }

  // Left goal — away scores
  if (x <= PITCH_LEFT && y >= GOAL_TOP && y <= GOAL_BOT) {
    return {
      ball: { ...ball, pos: { x, y }, vel: { x: 0, y: 0 }, loose: false },
      homeGoal: false,
      awayGoal: true,
    };
  }

  // Boundary bounce
  if (x <= PITCH_LEFT) {
    x = PITCH_LEFT;
    vx = Math.abs(vx) * BOUNCE_DAMP;
  }
  if (x >= PITCH_RIGHT) {
    x = PITCH_RIGHT;
    vx = -Math.abs(vx) * BOUNCE_DAMP;
  }
  if (y <= PITCH_TOP) {
    y = PITCH_TOP;
    vy = Math.abs(vy) * BOUNCE_DAMP;
  }
  if (y >= PITCH_BOTTOM) {
    y = PITCH_BOTTOM;
    vy = -Math.abs(vy) * BOUNCE_DAMP;
  }

  // Player bounce — ball deflects off any player it hits
  const minDist = PLAYER_RADIUS + BALL_RADIUS;
  for (const p of players) {
    if (p.hasBall) continue;
    const dx = x - p.pos.x;
    const dy = y - p.pos.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < minDist && d > 0) {
      // Push ball out of player
      const nx = dx / d;
      const ny = dy / d;
      x = p.pos.x + nx * minDist;
      y = p.pos.y + ny * minDist;
      // Reflect velocity off player surface
      const dot = vx * nx + vy * ny;
      vx = (vx - 2 * dot * nx) * BALL_BOUNCE;
      vy = (vy - 2 * dot * ny) * BALL_BOUNCE;
    }
  }

  if (Math.abs(vx) < STOP_THRESH && Math.abs(vy) < STOP_THRESH) {
    vx = 0;
    vy = 0;
  }

  return {
    ball: {
      ...ball,
      pos: { x, y },
      vel: { x: vx, y: vy },
      loose: vx !== 0 || vy !== 0,
    },
    homeGoal: false,
    awayGoal: false,
  };
}

export function norm(v: Vec2): Vec2 {
  const d = Math.sqrt(v.x * v.x + v.y * v.y);
  if (d === 0) return { x: 0, y: 0 };
  return { x: v.x / d, y: v.y / d };
}

export function dist(a: Vec2, b: Vec2): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function moveToward(
  pos: Vec2,
  target: Vec2,
  speed: number,
): { pos: Vec2; angle: number } {
  const dx = target.x - pos.x;
  const dy = target.y - pos.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d <= speed) return { pos: { ...target }, angle: Math.atan2(dy, dx) };
  return {
    pos: { x: pos.x + (dx / d) * speed, y: pos.y + (dy / d) * speed },
    angle: Math.atan2(dy, dx),
  };
}

export function clampToPitch(pos: Vec2): Vec2 {
  return {
    x: Math.max(PITCH_LEFT, Math.min(PITCH_RIGHT, pos.x)),
    y: Math.max(PITCH_TOP, Math.min(PITCH_BOTTOM, pos.y)),
  };
}
