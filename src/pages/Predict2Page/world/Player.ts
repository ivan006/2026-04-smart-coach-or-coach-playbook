import * as YUKA from "yuka";
import { BehaviorTree, Selector, Sequence, Task, SUCCESS, FAILURE } from "behaviortree";
import { Ball } from "./Ball";
import { FormationEntry } from "../formation";
import { BhvBasicMove } from "../bhv/BhvBasicMove";
import { BhvIntercept } from "../bhv/BhvIntercept";
import { BhvOffensiveKick } from "../bhv/BhvOffensiveKick";

/**
 * Player — mirrors HELIOS player_agent
 * Decision making via behaviour tree, movement via Yuka steering.
 */
export class Player extends YUKA.Vehicle {
  hasBall     = false;
  teamHasBall = false;
  isHome:      boolean;
  formationEntry: FormationEntry;
  ball:        Ball | null = null;
  opponents:   Player[] = [];
  teammates:   Player[] = [];
  tree:        BehaviorTree;
  seekBehavior: YUKA.SeekBehavior;
  targetPos =  new YUKA.Vector3();

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

    // Behaviour tree — mirrors HELIOS agent2d decision hierarchy
    this.tree = new BehaviorTree({
      tree: new Selector({ nodes: [
        // Has ball → offensive kick (dribble or shoot)
        new Sequence({ nodes: [
          new Task({ run: () => self.hasBall ? SUCCESS : FAILURE }),
          BhvOffensiveKick(self),
        ]}),
        // Team has ball → intercept (EQS receive position)
        new Sequence({ nodes: [
          new Task({ run: () => self.teamHasBall ? SUCCESS : FAILURE }),
          BhvIntercept(self),
        ]}),
        // Default → hold formation position
        BhvBasicMove(self),
      ]}),
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
