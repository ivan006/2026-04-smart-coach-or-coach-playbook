import { GameState } from "./types";
import {
  W,
  H,
  PITCH_LEFT,
  PITCH_RIGHT,
  PITCH_TOP,
  PITCH_BOTTOM,
  PITCH_W,
  PITCH_H,
  CX,
  CY,
  GOAL_W,
  GOAL_H,
  GOAL_TOP,
  GOAL_BOT,
  PLAYER_RADIUS,
  PRESSURE_RADIUS,
  TEAM_COLOURS,
} from "./constants";

export function render(ctx: CanvasRenderingContext2D, state: GameState) {
  ctx.clearRect(0, 0, W, H);

  // Pitch stripes
  const stripeW = PITCH_W / 10;
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = i % 2 === 0 ? "#226632" : "#287840";
    ctx.fillRect(PITCH_LEFT + i * stripeW, PITCH_TOP, stripeW, PITCH_H);
  }

  // Lines
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 2;
  ctx.strokeRect(PITCH_LEFT, PITCH_TOP, PITCH_W, PITCH_H);

  ctx.beginPath();
  ctx.moveTo(CX, PITCH_TOP);
  ctx.lineTo(CX, PITCH_BOTTOM);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(CX, CY, 60, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.arc(CX, CY, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeRect(PITCH_LEFT, CY - 100, 120, 200);
  ctx.strokeRect(PITCH_RIGHT - 120, CY - 100, 120, 200);

  // Goals
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 3;
  ctx.strokeRect(PITCH_LEFT - GOAL_W, GOAL_TOP, GOAL_W, GOAL_H);
  ctx.strokeRect(PITCH_RIGHT, GOAL_TOP, GOAL_W, GOAL_H);

  // Players
  for (const p of state.players) {
    const col = TEAM_COLOURS[p.teamId] ?? "#ffffff";

    ctx.save();
    ctx.translate(p.pos.x, p.pos.y);
    ctx.rotate(p.angle - Math.PI / 2);

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(1, 1, PLAYER_RADIUS, PLAYER_RADIUS, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body — flash white for 15 ticks after tackle
    const tackling = p.tackleCooldown > 45;
    const bodyCol = tackling ? "#ffffff" : col;
    ctx.fillStyle = bodyCol;
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, PLAYER_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Arms
    ctx.strokeStyle = bodyCol;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-PLAYER_RADIUS, -2);
    ctx.lineTo(-PLAYER_RADIUS - 10, 4);
    ctx.moveTo(PLAYER_RADIUS, -2);
    ctx.lineTo(PLAYER_RADIUS + 10, 4);
    ctx.stroke();

    // Ball at feet
    if (p.hasBall) {
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, PLAYER_RADIUS + 6, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();

    // Jersey number
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(p.id), p.pos.x, p.pos.y);

    // Pressure ring
    if (p.pressure > 0) {
      ctx.strokeStyle = `rgba(255,80,80,${Math.min(p.pressure * 0.25, 0.7)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.pos.x, p.pos.y, PRESSURE_RADIUS, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Ball (only when loose)
  if (state.ball.loose || !state.players.some((p) => p.hasBall)) {
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(state.ball.pos.x, state.ball.pos.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Scoreboard
  const home = state.teams.find((t) => t.id === "home")!;
  const away = state.teams.find((t) => t.id === "away")!;
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.beginPath();
  (ctx as any).roundRect?.(CX - 80, 0, 160, 36, 6);
  ctx.fill();
  ctx.fillStyle = TEAM_COLOURS["home"];
  ctx.font = "bold 16px monospace";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillText(String(home.score), CX - 12, 18);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.fillText("–", CX, 18);
  ctx.fillStyle = TEAM_COLOURS["away"];
  ctx.textAlign = "left";
  ctx.fillText(String(away.score), CX + 12, 18);
}
