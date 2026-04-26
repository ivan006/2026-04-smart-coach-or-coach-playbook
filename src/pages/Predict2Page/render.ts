import * as YUKA from "yuka";
import { Ball } from "./world/Ball";
import { Player } from "./world/Player";
import { W, H, PITCH_LEFT, PITCH_RIGHT, PITCH_TOP, PITCH_W, PITCH_H, CX, CY } from "./constants";

export function render(ctx: CanvasRenderingContext2D, entityManager: YUKA.EntityManager, ball: Ball) {
  ctx.clearRect(0, 0, W, H);

  // Pitch stripes
  const stripeW = PITCH_W / 10;
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = i % 2 === 0 ? "#226632" : "#287840";
    ctx.fillRect(PITCH_LEFT + i * stripeW, PITCH_TOP, stripeW, PITCH_H);
  }

  // Lines
  ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 2;
  ctx.strokeRect(PITCH_LEFT, PITCH_TOP, PITCH_W, PITCH_H);
  ctx.beginPath(); ctx.moveTo(CX, PITCH_TOP); ctx.lineTo(CX, PITCH_TOP + PITCH_H); ctx.stroke();
  ctx.beginPath(); ctx.arc(CX, CY, 60, 0, Math.PI * 2); ctx.stroke();

  // Goals
  ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = 3;
  ctx.strokeRect(PITCH_LEFT - 20, CY - 60, 20, 120);
  ctx.strokeRect(PITCH_RIGHT,     CY - 60, 20, 120);

  // Players
  for (const entity of entityManager.entities) {
    if (!(entity instanceof Player)) continue;
    const x = entity.position.x, y = entity.position.z;
    ctx.fillStyle = entity.isHome ? "#3b82f6" : "#ef4444";
    ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill();
    if (entity.hasBall) {
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.stroke();
    }
  }

  // Ball
  ctx.fillStyle = "#fff"; ctx.strokeStyle = "#333"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(ball.position.x, ball.position.z, 6, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
}
