import { useEffect, useRef } from "react";
import * as YUKA from "yuka";
import {
  BehaviorTree,
  Selector,
  Sequence,
  Task,
  SUCCESS,
  FAILURE,
} from "behaviortree";

const W = 1200,
  H = 700;
const PITCH_LEFT = 40,
  PITCH_RIGHT = W - 40,
  PITCH_TOP = 20,
  PITCH_BOTTOM = H - 20;
const CX = W / 2,
  CY = H / 2;
const PITCH_W = PITCH_RIGHT - PITCH_LEFT,
  PITCH_H = PITCH_BOTTOM - PITCH_TOP;
const KICK_POWER = 15,
  SHOOT_RANGE = 150,
  FRICTION = 0.97;

// ── EQS ──────────────────────────────────────────────────────────────────────

type Candidate = { x: number; y: number };
type EQSContext = { ball: Ball; opponents: Player[]; teammates: Player[] };
type Test = (c: Candidate, ctx: EQSContext) => number;

function query(
  generator: (ctx: EQSContext) => Candidate[],
  ctx: EQSContext,
  tests: Test[],
): Candidate | null {
  const candidates = generator(ctx);
  if (!candidates.length) return null;
  return candidates
    .map((c) => ({ c, score: tests.reduce((s, t) => s + t(c, ctx), 0) }))
    .sort((a, b) => b.score - a.score)[0].c;
}

function forwardConeGenerator(ctx: EQSContext, isHome: boolean): Candidate[] {
  const candidates: Candidate[] = [];
  const bx = ctx.ball.position.x,
    by = ctx.ball.position.z;
  const dir = isHome ? 1 : -1;
  for (let dx = 80; dx <= 320; dx += 80)
    for (let dy = -200; dy <= 200; dy += 80) {
      const x = bx + dx * dir,
        y = by + dy;
      if (
        x < PITCH_LEFT + 20 ||
        x > PITCH_RIGHT - 20 ||
        y < PITCH_TOP + 20 ||
        y > PITCH_BOTTOM - 20
      )
        continue;
      candidates.push({ x, y });
    }
  return candidates;
}

const radialProgressTest: Test = (c) => (c.x - PITCH_LEFT) / PITCH_W;
const opponentDistanceTest: Test = (c, ctx) =>
  !ctx.opponents.length
    ? 1
    : Math.min(
        Math.min(
          ...ctx.opponents.map((o) =>
            Math.sqrt((c.x - o.position.x) ** 2 + (c.y - o.position.z) ** 2),
          ),
        ) / 200,
        1,
      );
const teammateSpacingTest: Test = (c, ctx) =>
  !ctx.teammates.length
    ? 1
    : Math.min(
        Math.min(
          ...ctx.teammates.map((t) =>
            Math.sqrt((c.x - t.position.x) ** 2 + (c.y - t.position.z) ** 2),
          ),
        ) / 150,
        1,
      );

// ── Formation ─────────────────────────────────────────────────────────────────

type FormationEntry = {
  defensive: { x: number; y: number };
  middle: { x: number; y: number };
  attacking: { x: number; y: number };
};

const HOME_FORMATION: FormationEntry[] = [
  {
    defensive: { x: PITCH_LEFT + 30, y: CY },
    middle: { x: PITCH_LEFT + 50, y: CY },
    attacking: { x: PITCH_LEFT + 80, y: CY },
  },
  {
    defensive: { x: PITCH_LEFT + PITCH_W * 0.15, y: CY - 120 },
    middle: { x: PITCH_LEFT + PITCH_W * 0.25, y: CY - 150 },
    attacking: { x: PITCH_LEFT + PITCH_W * 0.4, y: CY - 160 },
  },
  {
    defensive: { x: PITCH_LEFT + PITCH_W * 0.15, y: CY + 120 },
    middle: { x: PITCH_LEFT + PITCH_W * 0.25, y: CY + 150 },
    attacking: { x: PITCH_LEFT + PITCH_W * 0.4, y: CY + 160 },
  },
  {
    defensive: { x: PITCH_LEFT + PITCH_W * 0.35, y: CY - 60 },
    middle: { x: PITCH_LEFT + PITCH_W * 0.5, y: CY - 60 },
    attacking: { x: PITCH_LEFT + PITCH_W * 0.65, y: CY - 80 },
  },
  {
    defensive: { x: PITCH_LEFT + PITCH_W * 0.5, y: CY },
    middle: { x: PITCH_LEFT + PITCH_W * 0.65, y: CY },
    attacking: { x: PITCH_LEFT + PITCH_W * 0.8, y: CY },
  },
];

function getFormationTarget(
  entry: FormationEntry,
  ballX: number,
): { x: number; y: number } {
  const t = Math.max(0, Math.min(1, (ballX - PITCH_LEFT) / PITCH_W));
  const s = t < 0.33 ? t / 0.33 : (t - 0.33) / 0.67;
  const a = t < 0.33 ? entry.defensive : entry.middle;
  const b = t < 0.33 ? entry.middle : entry.attacking;
  return { x: a.x + (b.x - a.x) * s, y: a.y + (b.y - a.y) * s };
}

// ── Ball ──────────────────────────────────────────────────────────────────────

class Ball extends YUKA.GameEntity {
  vel = { x: 0, y: 0 };
  loose = false;
  owner: Player | null = null;

  tick() {
    if (!this.loose) return;
    this.position.x += this.vel.x;
    this.position.z += this.vel.y;
    this.vel.x *= FRICTION;
    this.vel.y *= FRICTION;
    if (this.position.x <= PITCH_LEFT) {
      this.position.x = PITCH_LEFT;
      this.vel.x = Math.abs(this.vel.x) * 0.6;
    }
    if (this.position.x >= PITCH_RIGHT) {
      this.position.x = PITCH_RIGHT;
      this.vel.x = -Math.abs(this.vel.x) * 0.6;
    }
    if (this.position.z <= PITCH_TOP) {
      this.position.z = PITCH_TOP;
      this.vel.y = Math.abs(this.vel.y) * 0.6;
    }
    if (this.position.z >= PITCH_BOTTOM) {
      this.position.z = PITCH_BOTTOM;
      this.vel.y = -Math.abs(this.vel.y) * 0.6;
    }
    if (Math.abs(this.vel.x) < 0.1 && Math.abs(this.vel.y) < 0.1) {
      this.vel.x = 0;
      this.vel.y = 0;
      this.loose = false;
    }
  }
}

// ── Player ────────────────────────────────────────────────────────────────────

class Player extends YUKA.Vehicle {
  hasBall = false;
  teamHasBall = false;
  isHome: boolean;
  formationEntry: FormationEntry;
  ball: Ball | null = null;
  opponents: Player[] = [];
  teammates: Player[] = [];
  tree: BehaviorTree;
  seekBehavior: YUKA.SeekBehavior;
  targetPos = new YUKA.Vector3();

  constructor(isHome: boolean, formationEntry: FormationEntry) {
    super();
    this.isHome = isHome;
    this.formationEntry = formationEntry;
    this.maxSpeed = 80;
    this.maxForce = 400;
    this.seekBehavior = new YUKA.SeekBehavior(this.targetPos);
    this.steering.add(this.seekBehavior);
    const sep = new YUKA.SeparationBehavior();
    sep.weight = 3;
    this.steering.add(sep);
    const self = this;

    // Body_GoToPoint — HELIOS: move to formation position
    const Body_GoToPoint = new Task({
      run: () => {
        if (!self.ball) return FAILURE;
        const ballX = self.isHome
          ? self.ball.position.x
          : PITCH_RIGHT - (self.ball.position.x - PITCH_LEFT);
        const t = getFormationTarget(self.formationEntry, ballX);
        self.targetPos.set(
          self.isHome ? t.x : PITCH_LEFT + PITCH_RIGHT - t.x,
          0,
          t.y,
        );
        return SUCCESS;
      },
    });

    // Body_Intercept — HELIOS: move to intercept/receive position via EQS
    const Body_Intercept = new Task({
      run: () => {
        if (!self.ball) return FAILURE;
        const ctx: EQSContext = {
          ball: self.ball,
          opponents: self.opponents,
          teammates: self.teammates,
        };
        const best = query((c) => forwardConeGenerator(c, self.isHome), ctx, [
          radialProgressTest,
          opponentDistanceTest,
          teammateSpacingTest,
        ]);
        if (!best) return FAILURE;
        self.targetPos.set(
          self.isHome ? best.x : PITCH_LEFT + PITCH_RIGHT - best.x,
          0,
          best.y,
        );
        return SUCCESS;
      },
    });

    // Body_Dribble + Bhv_Shoot — HELIOS: advance with ball, shoot when in range
    const Body_Dribble = new Task({
      run: () => {
        if (!self.ball) return FAILURE;
        const goalX = self.isHome ? PITCH_RIGHT : PITCH_LEFT;
        const distToGoal = Math.abs(self.position.x - goalX);
        if (distToGoal < SHOOT_RANGE) {
          // Bhv_Shoot — Body_SmartKick toward goal
          const dx = goalX - self.ball.position.x;
          const dy = CY - self.ball.position.z;
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          self.ball.vel.x = (dx / d) * KICK_POWER;
          self.ball.vel.y = (dy / d) * KICK_POWER;
          self.ball.loose = true;
          self.ball.owner = null;
          self.hasBall = false;
          self.teamHasBall = false;
        } else {
          self.targetPos.set(goalX, 0, CY);
          self.ball.position.x = self.position.x;
          self.ball.position.z = self.position.z;
        }
        return SUCCESS;
      },
    });

    this.tree = new BehaviorTree({
      tree: new Selector({
        nodes: [
          new Sequence({
            nodes: [
              new Task({ run: () => (self.hasBall ? SUCCESS : FAILURE) }),
              Body_Dribble,
            ],
          }),
          new Sequence({
            nodes: [
              new Task({ run: () => (self.teamHasBall ? SUCCESS : FAILURE) }),
              Body_Intercept,
            ],
          }),
          Body_GoToPoint,
        ],
      }),
      blackboard: {},
    });
  }

  update(delta: number): this {
    this.tree.step();
    this.seekBehavior.target = this.targetPos;
    super.update(delta);
    this.velocity.multiplyScalar(0.97);
    return this;
  }
}

// ── Render ────────────────────────────────────────────────────────────────────

function render(
  ctx: CanvasRenderingContext2D,
  entityManager: YUKA.EntityManager,
  ball: Ball,
) {
  ctx.clearRect(0, 0, W, H);
  const stripeW = PITCH_W / 10;
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = i % 2 === 0 ? "#226632" : "#287840";
    ctx.fillRect(PITCH_LEFT + i * stripeW, PITCH_TOP, stripeW, PITCH_H);
  }
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
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 3;
  ctx.strokeRect(PITCH_LEFT - 20, CY - 60, 20, 120);
  ctx.strokeRect(PITCH_RIGHT, CY - 60, 20, 120);

  for (const entity of entityManager.entities) {
    if (entity instanceof Player) {
      const x = entity.position.x,
        y = entity.position.z;
      ctx.fillStyle = entity.isHome ? "#3b82f6" : "#ef4444";
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.fill();
      if (entity.hasBall) {
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 14, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#333";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(ball.position.x, ball.position.z, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Predict2Page() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const entityManager = new YUKA.EntityManager();
    const time = new YUKA.Time();

    const ball = new Ball();
    ball.position.set(CX, 0, CY);
    entityManager.add(ball);

    const homePlayers: Player[] = [];
    const awayPlayers: Player[] = [];

    HOME_FORMATION.forEach((entry) => {
      const home = new Player(true, entry);
      home.position.set(entry.defensive.x, 0, entry.defensive.y);
      home.ball = ball;
      entityManager.add(home);
      homePlayers.push(home);

      const away = new Player(false, entry);
      away.position.set(
        PITCH_LEFT + PITCH_RIGHT - entry.defensive.x,
        0,
        entry.defensive.y,
      );
      away.ball = ball;
      entityManager.add(away);
      awayPlayers.push(away);
    });

    homePlayers.forEach((p) => {
      p.opponents = awayPlayers;
      p.teammates = homePlayers.filter((t) => t !== p);
      p.neighbors = [...homePlayers.filter((t) => t !== p), ...awayPlayers];
    });
    awayPlayers.forEach((p) => {
      p.opponents = homePlayers;
      p.teammates = awayPlayers.filter((t) => t !== p);
      p.neighbors = [...awayPlayers.filter((t) => t !== p), ...homePlayers];
    });

    homePlayers[4].hasBall = true;
    ball.owner = homePlayers[4];
    ball.position.set(homePlayers[4].position.x, 0, homePlayers[4].position.z);
    homePlayers.forEach((p) => (p.teamHasBall = true));

    let rafId: number;
    function loop() {
      rafId = requestAnimationFrame(loop);
      const delta = time.update().getDelta();
      ball.tick();
      entityManager.update(delta);
      render(ctx, entityManager, ball);
    }
    loop();
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div className="flex flex-col items-center gap-3 p-4">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="rounded-lg border border-white/10"
        style={{ maxWidth: "100%", background: "#1a1a2e" }}
      />
    </div>
  );
}
