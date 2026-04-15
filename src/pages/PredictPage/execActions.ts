import { Player, Ball, TeamId } from "./types";
import { norm, dist } from "./physics";
import { PASS_POWER, PITCH_RIGHT, PITCH_LEFT, CY } from "./constants";

const TACKLE_COOLDOWN = 60;
const KNOCK_POWER = 8;

function goalTarget(teamId: TeamId) {
  return teamId === "home"
    ? { x: PITCH_RIGHT, y: CY }
    : { x: PITCH_LEFT, y: CY };
}

// ── Shoot ─────────────────────────────────────────────────────────────────────

export function execShoot(
  player: Player,
  ball: Ball,
): { player: Player; ball: Ball } {
  const gt = goalTarget(player.teamId);
  const n = norm({ x: gt.x - player.pos.x, y: gt.y - player.pos.y });
  return {
    player: { ...player, hasBall: false, action: "shoot" },
    ball: {
      ...ball,
      vel: { x: n.x * PASS_POWER, y: n.y * PASS_POWER },
      loose: true,
      ownerId: null,
    },
  };
}

// ── Pass ──────────────────────────────────────────────────────────────────────

export function execPass(
  passer: Player,
  target: Player,
  ball: Ball,
): { player: Player; ball: Ball } {
  const n = norm({
    x: target.pos.x - passer.pos.x,
    y: target.pos.y - passer.pos.y,
  });
  const d = dist(passer.pos, target.pos);
  const power = Math.min(PASS_POWER, Math.max(4, d * 0.08));
  return {
    player: { ...passer, hasBall: false, action: "pass" },
    ball: {
      ...ball,
      vel: { x: n.x * power, y: n.y * power },
      loose: true,
      ownerId: null,
    },
  };
}

// ── Receive ───────────────────────────────────────────────────────────────────

export function execReceive(
  player: Player,
  ball: Ball,
): { player: Player; ball: Ball } {
  return {
    player: { ...player, hasBall: true, action: "receive" },
    ball: {
      ...ball,
      loose: false,
      vel: { x: 0, y: 0 },
      ownerId: `${player.teamId}-${player.id}`,
    },
  };
}

// ── Tackle ────────────────────────────────────────────────────────────────────

export interface TackleResult {
  tackler: Player;
  carrier: Player;
  ball: Ball;
}

export function execTackle(
  tackler: Player,
  carrier: Player,
  ball: Ball,
): TackleResult {
  const roll = Math.random();
  const doneTackler = {
    ...tackler,
    tackleCooldown: TACKLE_COOLDOWN,
    action: "tackle" as const,
    deferring: false,
  };

  if (roll < 1 / 3) {
    // Win ball
    return {
      tackler: { ...doneTackler, hasBall: true },
      carrier: { ...carrier, hasBall: false },
      ball: {
        ...ball,
        ownerId: `${tackler.teamId}-${tackler.id}`,
        loose: false,
      },
    };
  } else if (roll < 2 / 3) {
    // Knock away
    const angle = Math.random() * Math.PI * 2;
    return {
      tackler: doneTackler,
      carrier: { ...carrier, hasBall: false },
      ball: {
        ...ball,
        vel: {
          x: Math.cos(angle) * KNOCK_POWER,
          y: Math.sin(angle) * KNOCK_POWER,
        },
        loose: true,
        ownerId: null,
      },
    };
  } else {
    // Failed
    return { tackler: doneTackler, carrier, ball };
  }
}

// ── Intercept ─────────────────────────────────────────────────────────────────

export function execIntercept(
  player: Player,
  ball: Ball,
): { player: Player; ball: Ball } {
  return {
    player: { ...player, hasBall: true, action: "intercept" },
    ball: {
      ...ball,
      loose: false,
      vel: { x: 0, y: 0 },
      ownerId: `${player.teamId}-${player.id}`,
    },
  };
}
