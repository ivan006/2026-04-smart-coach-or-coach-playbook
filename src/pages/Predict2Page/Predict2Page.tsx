import { useEffect, useRef } from "react";
import * as YUKA from "yuka";
import { Ball } from "./world/Ball";
import { Player } from "./world/Player";
import { HOME_FORMATION } from "./formation";
import { render } from "./render";
import { W, H, PITCH_LEFT, PITCH_RIGHT } from "./constants";

import { Strategy } from "./strategy";

export default function Predict2Page() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const entityManager = new YUKA.EntityManager();
    const time = new YUKA.Time();
    const strategy = new Strategy();

    // Ball
    const ball = new Ball();
    ball.position.set(W / 2, 0, H / 2);
    entityManager.add(ball);

    // Teams
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

    // Wire up opponents, teammates, neighbors (for Yuka SeparationBehavior)
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

    // Kickoff — home forward has ball
    homePlayers[4].hasBall = true;
    ball.owner = homePlayers[4];
    ball.position.set(homePlayers[4].position.x, 0, homePlayers[4].position.z);

    // Game loop
    let rafId: number;
    function loop() {
      rafId = requestAnimationFrame(loop);
      const delta = time.update().getDelta();
      ball.tick();
      strategy.update(ball, homePlayers, awayPlayers);
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
