import * as YUKA from "yuka";
import { PITCH_LEFT, PITCH_RIGHT, PITCH_TOP, PITCH_BOTTOM, FRICTION } from "../constants";

export class Ball extends YUKA.GameEntity {
  vel = { x: 0, y: 0 };
  loose = false;
  owner: import("./Player").Player | null = null;

  tick() {
    if (!this.loose) return;
    this.position.x += this.vel.x;
    this.position.z += this.vel.y;
    this.vel.x *= FRICTION;
    this.vel.y *= FRICTION;

    if (this.position.x <= PITCH_LEFT)   { this.position.x = PITCH_LEFT;   this.vel.x =  Math.abs(this.vel.x) * 0.6; }
    if (this.position.x >= PITCH_RIGHT)  { this.position.x = PITCH_RIGHT;  this.vel.x = -Math.abs(this.vel.x) * 0.6; }
    if (this.position.z <= PITCH_TOP)    { this.position.z = PITCH_TOP;    this.vel.y =  Math.abs(this.vel.y) * 0.6; }
    if (this.position.z >= PITCH_BOTTOM) { this.position.z = PITCH_BOTTOM; this.vel.y = -Math.abs(this.vel.y) * 0.6; }

    if (Math.abs(this.vel.x) < 0.1 && Math.abs(this.vel.y) < 0.1) {
      this.vel.x = 0; this.vel.y = 0; this.loose = false;
    }
  }
}
