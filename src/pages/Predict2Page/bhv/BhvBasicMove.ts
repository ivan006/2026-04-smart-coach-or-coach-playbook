import { Task, SUCCESS, FAILURE } from "behaviortree";
import { Player } from "../world/Player";
import { getFormationTarget } from "../formation";
import { PITCH_LEFT, PITCH_RIGHT } from "../constants";

/**
 * BhvBasicMove — mirrors HELIOS bhv_basic_move.cpp
 * Moves player to formation position based on current ball position.
 * Equivalent to Body_GoToPoint toward formation target.
 */
export function BhvBasicMove(player: Player): Task {
  return new Task({
    run: () => {
      if (!player.ball) return FAILURE;
      const ballX = player.isHome
        ? player.ball.position.x
        : PITCH_RIGHT - (player.ball.position.x - PITCH_LEFT);
      const t = getFormationTarget(player.formationEntry, ballX);
      const finalX = player.isHome ? t.x : PITCH_LEFT + PITCH_RIGHT - t.x;
      player.targetPos.set(finalX, 0, t.y);
      return SUCCESS;
    },
  });
}
