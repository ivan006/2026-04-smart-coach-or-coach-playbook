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

const W = 1200;
const H = 700;
const PITCH_LEFT = 40;
const PITCH_RIGHT = W - 40;
const PITCH_TOP = 20;
const PITCH_BOTTOM = H - 20;
const CX = W / 2;
const CY = H / 2;

// ── EQS ──────────────────────────────────────────────────────────────────────

type Candidate = { x: number; y: number };
type EQSContext = { ball: YUKA.Vector3; opponents: YUKA.Vector3[] };
type Test = (c: Candidate, ctx: EQSContext) => number;

function query(
  generator: (ctx: EQSContext) => Candidate[],
  ctx: EQSContext,
  tests: Test[],
): Candidate {
  const candidates = generator(ctx);
  return candidates
    .map((c) => ({ c, score: tests.reduce((s, t) => s + t(c, ctx), 0) }))
    .sort((a, b) => b.score - a.score)[0].c;
}

// Grid generator — samples points ahead of the ball toward goal
function forwardConeGenerator(ctx: EQSContext): Candidate[] {
  const candidates: Candidate[] = [];
  const bx = ctx.ball.x;
  const by = ctx.ball.z;
  for (let dx = 80; dx <= 320; dx += 80) {
    for (let dy = -160; dy <= 160; dy += 80) {
      const x = bx + dx;
      const y = by + dy;
      if (x < PITCH_LEFT + 20 || x > PITCH_RIGHT - 20) continue;
      if (y < PITCH_TOP + 20 || y > PITCH_BOTTOM - 20) continue;
      candidates.push({ x, y });
    }
  }
  return candidates;
}

// Tests
const radialProgressTest: Test = (c) =>
  (c.x - PITCH_LEFT) / (PITCH_RIGHT - PITCH_LEFT);

const opponentDistanceTest: Test = (c, ctx) => {
  if (ctx.opponents.length === 0) return 1;
  const minDist = Math.min(
    ...ctx.opponents.map((o) => Math.sqrt((c.x - o.x) ** 2 + (c.y - o.z) ** 2)),
  );
  return Math.min(minDist / 200, 1);
};

// ── Ball ──────────────────────────────────────────────────────────────────────

class Ball extends YUKA.GameEntity {
  constructor() {
    super();
  }
}

// ── Player entity ─────────────────────────────────────────────────────────────

class Player extends YUKA.Vehicle {
  hasBall = false;
  teamHasBall = false;
  isOpponent = false;
  ball: Ball | null = null;
  opponents: Player[] = [];
  tree: BehaviorTree;
  seekBehavior: YUKA.SeekBehavior;
  targetPos = new YUKA.Vector3(CX, 0, CY);

  constructor(isOpponent = false) {
    super();
    this.isOpponent = isOpponent;
    this.maxSpeed = 80;
    this.maxForce = 400;

    this.seekBehavior = new YUKA.SeekBehavior(this.targetPos);
    this.steering.add(this.seekBehavior);

    const self = this;

    const shootTask = new Task({
      run: () => {
        self.targetPos.set(PITCH_RIGHT, 0, CY);
        return SUCCESS;
      },
    });

    const receiveTask = new Task({
      run: () => {
        if (!self.ball) return FAILURE;
        const ctx: EQSContext = {
          ball: self.ball.position,
          opponents: self.opponents.map((o) => o.position),
        };
        const best = query(forwardConeGenerator, ctx, [
          radialProgressTest,
          opponentDistanceTest,
        ]);
        self.targetPos.set(best.x, 0, best.y);
        return SUCCESS;
      },
    });

    const defendTask = new Task({
      run: () => {
        self.targetPos.set(PITCH_LEFT + 100, 0, CY);
        return SUCCESS;
      },
    });

    // Opponent just chases ball
    const chaseTask = new Task({
      run: () => {
        if (!self.ball) return FAILURE;
        self.targetPos.set(self.ball.position.x, 0, self.ball.position.z);
        return SUCCESS;
      },
    });

    const tree = isOpponent
      ? new BehaviorTree({ tree: chaseTask, blackboard: {} })
      : new BehaviorTree({
          tree: new Selector({
            nodes: [
              new Sequence({
                nodes: [
                  new Task({ run: () => (self.hasBall ? SUCCESS : FAILURE) }),
                  shootTask,
                ],
              }),
              new Sequence({
                nodes: [
                  new Task({
                    run: () => (self.teamHasBall ? SUCCESS : FAILURE),
                  }),
                  receiveTask,
                ],
              }),
              defendTask,
            ],
          }),
          blackboard: {},
        });

    this.tree = tree;
  }

  update(delta: number): this {
    this.tree.step();
    this.seekBehavior.target = this.targetPos;
    super.update(delta);
    this.velocity.multiplyScalar(0.99); // friction
    return this;
  }
}

// ── Render ────────────────────────────────────────────────────────────────────

function render(
  ctx: CanvasRenderingContext2D,
  entityManager: YUKA.EntityManager,
) {
  ctx.clearRect(0, 0, W, H);

  // Pitch stripes
  const stripeW = (PITCH_RIGHT - PITCH_LEFT) / 10;
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = i % 2 === 0 ? "#226632" : "#287840";
    ctx.fillRect(
      PITCH_LEFT + i * stripeW,
      PITCH_TOP,
      stripeW,
      PITCH_BOTTOM - PITCH_TOP,
    );
  }
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 2;
  ctx.strokeRect(
    PITCH_LEFT,
    PITCH_TOP,
    PITCH_RIGHT - PITCH_LEFT,
    PITCH_BOTTOM - PITCH_TOP,
  );
  ctx.beginPath();
  ctx.moveTo(CX, PITCH_TOP);
  ctx.lineTo(CX, PITCH_BOTTOM);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(CX, CY, 60, 0, Math.PI * 2);
  ctx.stroke();

  // Goals
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 3;
  ctx.strokeRect(PITCH_LEFT - 20, CY - 60, 20, 120);
  ctx.strokeRect(PITCH_RIGHT, CY - 60, 20, 120);

  for (const entity of entityManager.entities) {
    if (entity instanceof Player) {
      const x = entity.position.x;
      const y = entity.position.z;
      ctx.fillStyle = entity.isOpponent ? "#ef4444" : "#3b82f6";
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 9px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(entity.isOpponent ? "D" : "A", x, y);
    }
    if (entity instanceof Ball) {
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(entity.position.x, entity.position.z, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
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

    // Ball
    const ball = new Ball();
    ball.position.set(CX, 0, CY);
    entityManager.add(ball);

    // Home player (attacker)
    const attacker = new Player(false);
    attacker.position.set(CX - 100, 0, CY);
    attacker.teamHasBall = true;
    attacker.ball = ball;
    entityManager.add(attacker);

    // Opponent (chases ball)
    const opponent = new Player(true);
    opponent.position.set(CX + 200, 0, CY + 100);
    opponent.ball = ball;
    attacker.opponents = [opponent];
    entityManager.add(opponent);

    let rafId: number;
    function loop() {
      rafId = requestAnimationFrame(loop);
      const delta = time.update().getDelta();
      entityManager.update(delta);
      render(ctx, entityManager);
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
