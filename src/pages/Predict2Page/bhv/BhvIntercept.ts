import { Task, SUCCESS, FAILURE } from "behaviortree";
import { Player } from "../world/Player";
import { query, EQSContext } from "../eqs/query";
import { forwardConeGenerator } from "../eqs/generators";
import { radialProgressTest, opponentDistanceTest, teammateSpacingTest } from "../eqs/tests";
import { PITCH_LEFT, PITCH_RIGHT } from "../constants";

/**
 * BhvIntercept — mirrors HELIOS body_intercept.cpp
 * Uses EQS to find best receive/intercept position ahead of ball.
 */
export function BhvIntercept(player: Player): Task {
  return new Task({
    run: () => {
      if (!player.ball) return FAILURE;
      const ctx: EQSContext = {
        ball: player.ball,
        opponents: player.opponents,
        teammates: player.teammates,
      };
      const best = query(
        (c) => forwardConeGenerator(c, player.isHome),
        ctx,
        [radialProgressTest, opponentDistanceTest, teammateSpacingTest]
      );
      if (!best) return FAILURE;
      const finalX = player.isHome ? best.x : PITCH_LEFT + PITCH_RIGHT - best.x;
      player.targetPos.set(finalX, 0, best.y);
      return SUCCESS;
    },
  });
}
