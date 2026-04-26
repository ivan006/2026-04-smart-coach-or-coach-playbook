import { Ball } from "./world/Ball";
import { Player } from "./world/Player";

export type Situation = "offensive" | "defensive" | "neutral";

/**
 * strategy.ts — mirrors HELIOS strategy.cpp
 * Manages team-level game situation and possession state.
 * Updates all player teamHasBall flags each tick based on who owns the ball.
 */
export class Strategy {
  situation: Situation = "neutral";

  update(ball: Ball, homePlayers: Player[], awayPlayers: Player[]) {
    const homeHasBall = homePlayers.some(p => p.hasBall);
    const awayHasBall = awayPlayers.some(p => p.hasBall);

    // Update team possession flags
    homePlayers.forEach(p => p.teamHasBall = homeHasBall);
    awayPlayers.forEach(p => p.teamHasBall = awayHasBall);

    // Update situation
    if (homeHasBall)       this.situation = "offensive";
    else if (awayHasBall)  this.situation = "defensive";
    else                   this.situation = "neutral";
  }
}
