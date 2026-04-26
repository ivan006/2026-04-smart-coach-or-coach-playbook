import { Task, SUCCESS, FAILURE } from "behaviortree";
import { Player } from "../world/Player";
import { PITCH_RIGHT, PITCH_LEFT, CY, SHOOT_RANGE, KICK_POWER } from "../constants";

/**
 * BhvOffensiveKick — mirrors HELIOS bhv_basic_offensive_kick.cpp
 * Dribbles toward goal, shoots when in range using Body_SmartKick.
 */
export function BhvOffensiveKick(player: Player): Task {
  return new Task({
    run: () => {
      if (!player.ball) return FAILURE;
      const goalX = player.isHome ? PITCH_RIGHT : PITCH_LEFT;
      const distToGoal = Math.abs(player.position.x - goalX);

      if (distToGoal < SHOOT_RANGE) {
        // Body_SmartKick — kick ball toward goal center
        const dx = goalX - player.ball.position.x;
        const dy = CY - player.ball.position.z;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        player.ball.vel.x = (dx / d) * KICK_POWER;
        player.ball.vel.y = (dy / d) * KICK_POWER;
        player.ball.loose = true;
        player.ball.owner = null;
        player.hasBall = false;
        player.teamHasBall = false;
      } else {
        // Body_Dribble — advance toward goal, ball follows
        player.targetPos.set(goalX, 0, CY);
        player.ball.position.x = player.position.x;
        player.ball.position.z = player.position.z;
      }
      return SUCCESS;
    },
  });
}
