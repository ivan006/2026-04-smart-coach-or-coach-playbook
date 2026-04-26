# SoccerSim Method Centrifuge

> Classification of methods and inline mechanisms extracted from `README_3_CODE_NOTES.md`.

This document centrifuges old Cyrus genetics into vials. It must not invent method names.

Rule:

```text
exact source symbol or exact inline location -> description -> shape -> vial(s)
```

If the old code packages the behaviour as a C++ method, the first column uses that exact symbol. If the behaviour is only an inline branch inside a method, the first column says `inline in <exact symbol>`. That is not a new method name.

---

## Method Shapes

| Shape | Meaning |
| --- | --- |
| World fact | Measured or predicted state used by later logic |
| Priority chain | Ordered behaviour attempts where an earlier success consumes the decision |
| Candidate generator | Creates possible actions, targets, or positions |
| Filter / gate | Rejects illegal, impossible, or unsafe options |
| Evaluator | Scores, ranks, or compares options |
| Spatial reference | Provides a location, line, region, or formation anchor |
| Execution behaviour | Performs the selected body/neck/action command |
| Stabilizer | Prevents jitter, overuse, or unstable switching |

---

## Genetic Vials

| Vial | Meaning |
| --- | --- |
| World facts | What the old system knows or predicts |
| Progressive actions - advance team to goals | Move our team state toward the opponent goal |
| Progressive actions - obstruct enemy advance | Prevent the opponent from moving toward our goal |
| Combative actions - attack goals with shot | Directly threaten the opponent goal with a shot |
| Combative actions - defend goals from shot | Directly protect our goal from a shot or shot-like danger |
| Combative preparation actions - move to attack goals | Move into a position that prepares goal attack |
| Combative preparation actions - move to defend goals | Move into a position that prepares goal defense |
| Possessive actions - tackle his ball | Win or recover opponent/loose possession |
| Possessive actions - protect my ball | Keep or protect our possession |
| Circulation actions - pass | Move the ball from one teammate to another |
| Circulation actions - receive | Become or complete the receiving side of circulation |
| Circulation preparation actions - move to intercept enemy pass | Move to deny or cut off enemy circulation |
| Circulation preparation actions - move to evade interception | Move to make our circulation safer from interception |

---

## Centrifuge Ledger

### 1. `/src/player/strategy.cpp`

| Source symbol / inline location | Description | Shape | Vial(s) |
| --- | --- | --- | --- |
| `Strategy::Strategy` | Initializes role factories and default role numbers | Spatial reference | World facts |
| `Strategy::read` | Loads formation config files for normal/offense/defense/setplay/goalie states | Spatial reference | World facts; combative preparation actions - move to defend goals |
| `Strategy::createFormation` | Parses formation files and extracts role/goalie metadata | Spatial reference, world fact | World facts; combative preparation actions - move to defend goals |
| `Strategy::createRole` | Creates role object for a uniform number from formation role name | Spatial reference | World facts |
| `Strategy::update` | Updates situation and positions each tick | Priority chain | World facts |
| `Strategy::exchangeRole` | Swaps role assignments | Stabilizer / spatial reference | World facts |
| `Strategy::isMarkerType` | Classifies marker-style player type | World fact | World facts |
| `Strategy::updateSituation` | Compares self/teammate/opponent intercept steps and selects situation | Evaluator | World facts; possessive actions - tackle his ball; progressive actions - advance team to goals; progressive actions - obstruct enemy advance |
| `Strategy::updatePosition` | Updates formation-based player positions from ball/game state | Spatial reference | Combative preparation actions - move to attack goals; combative preparation actions - move to defend goals |
| `Strategy::getPositionType` | Returns role position type | World fact | World facts |
| `Strategy::getPosition` | Returns current home/role position for player | Spatial reference | Combative preparation actions - move to defend goals; circulation preparation actions - move to evade interception |
| `Strategy::getFormation` | Selects active formation for world state/game mode | Spatial reference | Combative preparation actions - move to attack goals; combative preparation actions - move to defend goals |
| `Strategy::get_ball_area` | Classifies ball field area | World fact | World facts; progressive actions - advance team to goals; progressive actions - obstruct enemy advance |
| `Strategy::get_normal_dash_power` | Calculates normal movement dash power from role/zone/stamina context | Evaluator, stabilizer | Possessive actions - protect my ball; combative preparation actions - move to defend goals |

### 2. `/src/player/bhv_basic_move.cpp`

| Source symbol / inline location | Description | Shape | Vial(s) |
| --- | --- | --- | --- |
| `Bhv_BasicMove::execute` | Core outfield priority chain: tackle, intercept, block, offside trap, unmark, home movement | Priority chain | Possessive actions - tackle his ball; progressive actions - obstruct enemy advance; circulation preparation actions - move to evade interception |
| `Bhv_BasicTackle(...).execute` inside `Bhv_BasicMove::execute` | Tackle branch attempted before movement alternatives | Filter / gate, execution behaviour | Possessive actions - tackle his ball |
| `Body_Intercept().execute` inside `Bhv_BasicMove::execute` | Intercept branch when race/role margins allow | Filter / gate, execution behaviour | Possessive actions - tackle his ball; progressive actions - obstruct enemy advance |
| `Bhv_BasicBlock().execute` inside `Bhv_BasicMove::execute` | Defensive block branch | Priority-chain branch | Progressive actions - obstruct enemy advance; combative preparation actions - move to defend goals |
| `Bhv_Unmark().execute` inside `Bhv_BasicMove::execute` | Unmark branch | Priority-chain branch | Circulation preparation actions - move to evade interception |
| `Body_GoToPoint(...).execute` inside `Bhv_BasicMove::execute` | Home-position movement fallback | Execution behaviour, spatial reference | Combative preparation actions - move to defend goals; circulation preparation actions - move to evade interception |
| `Strategy::get_normal_dash_power` inside `Bhv_BasicMove::execute` | Dash-power selection for basic movement | Evaluator, stabilizer | Possessive actions - protect my ball; combative preparation actions - move to defend goals |
| `Body_TurnToBall().execute` inside `Bhv_BasicMove::execute` | Turns to ball when movement does not execute | Execution behaviour | World facts |

### 3. `/src/player/bhv_basic_block.cpp`

| Source symbol / inline location | Description | Shape | Vial(s) |
| --- | --- | --- | --- |
| `Bhv_BasicBlock::execute` | Executes block behaviour if this player is selected as blocker | Priority chain, execution behaviour | Progressive actions - obstruct enemy advance; combative preparation actions - move to defend goals |
| `Bhv_BasicBlock::get_blockers` | Finds teammate blocker candidates | Candidate generator | Progressive actions - obstruct enemy advance |
| `Bhv_BasicBlock::get_best_blocker` | Simulates opponent path and selects first teammate able to block/intercept | Evaluator, filter / gate | Possessive actions - tackle his ball; progressive actions - obstruct enemy advance |
| `Bhv_BasicBlock::dribble_direction_detector` | Scores likely opponent dribble direction using target x and own-goal proximity | Evaluator | Progressive actions - obstruct enemy advance; combative preparation actions - move to defend goals |
| `Body_Intercept().execute` inside `Bhv_BasicBlock::execute` | Intercepts when block conditions collapse into direct ball race | Execution behaviour | Possessive actions - tackle his ball |
| `Body_TurnToPoint(target_point).execute` inside `Bhv_BasicBlock::execute` | Turns toward selected block point | Execution behaviour | Progressive actions - obstruct enemy advance |

### 4. `/src/player/bhv_unmark.cpp`

| Source symbol / inline location | Description | Shape | Vial(s) |
| --- | --- | --- | --- |
| `Bhv_Unmark::execute` | Main unmark behaviour | Priority chain | Circulation preparation actions - move to evade interception |
| `Bhv_Unmark::can_unmarking` | Gates unmark by role/zone/stamina/context | Filter / gate, stabilizer | Possessive actions - protect my ball; circulation preparation actions - move to evade interception |
| `Bhv_Unmark::passer_finder` | Finds likely passer | World fact | Circulation preparation actions - move to evade interception |
| `Bhv_Unmark::simulate_dash` | Samples movement positions around player | Candidate generator | Circulation preparation actions - move to evade interception |
| `Bhv_Unmark::nearest_tm_dist_to` | Measures teammate distance to point | Evaluator | Circulation preparation actions - move to evade interception |
| `passSpeed` | Calculates pass speed estimate | World fact | Circulation actions - pass; circulation actions - receive |
| `Bhv_Unmark::lead_pass_simulator` | Simulates lead-pass target options from unmark point | Candidate generator, evaluator | Circulation preparation actions - move to evade interception; progressive actions - advance team to goals |
| `Bhv_Unmark::pass_travel_cycle` | Estimates pass travel cycles | World fact | Circulation actions - pass; circulation actions - receive |
| `Bhv_Unmark::opponents_cycle_intercept` | Estimates opponent interception cycles collectively | Evaluator | Circulation preparation actions - move to intercept enemy pass; possessive actions - protect my ball |
| `Bhv_Unmark::opponent_cycle_intercept` | Estimates one opponent's interception cycle | Evaluator | Circulation preparation actions - move to intercept enemy pass; possessive actions - protect my ball |
| `Bhv_Unmark::evaluate_position` | Scores unmark position by pass quality, opponent distance, turn cost, and forward value | Evaluator | Circulation preparation actions - move to evade interception; progressive actions - advance team to goals; combative preparation actions - move to attack goals |
| `Bhv_Unmark::run` | Executes movement to selected unmark position | Execution behaviour | Circulation preparation actions - move to evade interception |
| `Bhv_Unmark::load_dnn` | Loads DNN weights for pass prediction | World fact | World facts; circulation preparation actions - move to evade interception |
| `Bhv_Unmark::predict_pass_dnn` | Predicts pass probabilities | Evaluator | Circulation preparation actions - move to evade interception |
| `Bhv_Unmark::find_passer_dnn` | Finds likely passer using DNN predictions | Evaluator | Circulation preparation actions - move to evade interception |

### 5. `/src/player/planner/strict_check_pass_generator.cpp`

| Source symbol / inline location | Description | Shape | Vial(s) |
| --- | --- | --- | --- |
| `StrictCheckPassGenerator::generate` | Main strict pass generation entrypoint | Candidate generator | Circulation actions - pass |
| `StrictCheckPassGenerator::updatePasser` | Builds passer state and gates bad passer state | World fact, filter / gate | World facts; circulation actions - pass |
| `StrictCheckPassGenerator::updateReceivers` | Builds receiver candidates and filters invalid receivers | World fact, candidate generator, filter / gate | Circulation actions - receive |
| `StrictCheckPassGenerator::updateOpponents` | Builds opponent reach state | World fact | World facts; circulation preparation actions - move to intercept enemy pass |
| `StrictCheckPassGenerator::createCourses` | Creates direct, leading, and through pass courses | Candidate generator | Circulation actions - pass |
| `StrictCheckPassGenerator::createDirectPass` | Creates direct pass to receiver inertia/current position | Candidate generator | Circulation actions - pass; circulation actions - receive |
| `StrictCheckPassGenerator::createLeadingPass` | Creates leading pass into space around receiver | Candidate generator | Circulation actions - pass; circulation actions - receive; progressive actions - advance team to goals |
| `StrictCheckPassGenerator::createThroughPass` | Creates through pass behind defense | Candidate generator | Circulation actions - pass; progressive actions - advance team to goals; combative preparation actions - move to attack goals |
| `StrictCheckPassGenerator::createPassCommon` | Common pass validation: trajectory, reach, kick count, final-action checks | Filter / gate, evaluator | Circulation actions - pass; possessive actions - protect my ball |
| `StrictCheckPassGenerator::getNearestReceiverUnum` | Finds nearest receiver to a point | Evaluator | Circulation actions - receive |
| `StrictCheckPassGenerator::predictReceiverReachStep` | Predicts receiver reach step | Evaluator, world fact | Circulation actions - receive; possessive actions - protect my ball |
| `StrictCheckPassGenerator::predictOpponentsReachStep` | Predicts earliest opponent reach for pass | Evaluator, world fact | Circulation preparation actions - move to intercept enemy pass; possessive actions - protect my ball |
| `StrictCheckPassGenerator::predictOpponentReachStep` | Predicts one opponent's reach for pass | Evaluator, world fact | Circulation preparation actions - move to intercept enemy pass; possessive actions - protect my ball |
| inline filters inside `StrictCheckPassGenerator::createPassCommon` | Offside, out-of-bounds, dangerous backpass, tackling receiver, receiver-too-far, opponent reach | Filter / gate | Circulation actions - pass; possessive actions - protect my ball; combative actions - defend goals from shot |
| sort in `StrictCheckPassGenerator::generate` | Sorts pass candidates by distance to opponent goal | Evaluator | Progressive actions - advance team to goals |

### 6. `/src/player/planner/shoot_generator.cpp`

| Source symbol / inline location | Description | Shape | Vial(s) |
| --- | --- | --- | --- |
| `ShootGenerator::generate` | Main shoot generation entrypoint; includes distance gate and goal-target sampling | Candidate generator, filter / gate | Combative actions - attack goals with shot |
| `ShootGenerator::createShoot` | Creates shot courses for target point / first speed | Candidate generator | Combative actions - attack goals with shot |
| `ShootGenerator::maybeGoalieCatch` | Tests whether goalie can catch a shot course | Evaluator, filter / gate | Combative actions - attack goals with shot |
| `ShootGenerator::opponentCanReach` | Tests whether opponent can reach/block a shot course | Evaluator, filter / gate | Combative actions - attack goals with shot |
| `ShootGenerator::evaluateCourses` | Scores shot candidates with one-kick, goalie, opponent, angle, and y-rate factors | Evaluator | Combative actions - attack goals with shot |
| inline range gate in `ShootGenerator::generate` | Cancels shooting when self is farther than about 30 units from opponent goal | Filter / gate | Combative actions - attack goals with shot |
| inline goal target loop in `ShootGenerator::generate` | Samples target points across goal mouth | Candidate generator | Combative actions - attack goals with shot |

### 7. `/src/player/planner/short_dribble_generator.cpp`

| Source symbol / inline location | Description | Shape | Vial(s) |
| --- | --- | --- | --- |
| `ShortDribbleGenerator::generate` | Main short-dribble generation entrypoint | Candidate generator | Possessive actions - protect my ball; progressive actions - advance team to goals |
| `ShortDribbleGenerator::setQueuedAction` | Queues selected dribble action | Execution behaviour, stabilizer | Possessive actions - protect my ball |
| `ShortDribbleGenerator::createCourses` | Creates dribble courses and applies field-zone direction filters | Candidate generator, filter / gate | Possessive actions - protect my ball; progressive actions - advance team to goals |
| `ShortDribbleGenerator::simulateDashes` | Simulates dash path for dribble | World fact, evaluator | Possessive actions - protect my ball |
| `ShortDribbleGenerator::simulateKickTurnsDashes` | Simulates kick/turn/dash sequence for dribble | World fact, evaluator | Possessive actions - protect my ball |
| `ShortDribbleGenerator::createSelfCache` | Caches self movement prediction | Stabilizer, world fact | Possessive actions - protect my ball |
| `ShortDribbleGenerator::checkOpponent` | Checks opponent safety/reach against dribble | Evaluator, filter / gate | Possessive actions - protect my ball |
| inline direction filters in `ShortDribbleGenerator::createCourses` | Own-half/deep-own-half angle restrictions | Filter / gate | Possessive actions - protect my ball; combative actions - defend goals from shot |
| sort in `ShortDribbleGenerator::generate` | Sorts dribble courses by distance to opponent goal | Evaluator | Progressive actions - advance team to goals; combative preparation actions - move to attack goals |

### 8. `/src/player/planner/cross_generator.cpp`

| Source symbol / inline location | Description | Shape | Vial(s) |
| --- | --- | --- | --- |
| `CrossGenerator::generate` | Main cross generation entrypoint; includes near-goal/passer/receiver gates | Candidate generator, filter / gate | Circulation actions - pass; combative preparation actions - move to attack goals |
| `CrossGenerator::updatePasser` | Builds passer state and gates bad passer state | World fact, filter / gate | Circulation actions - pass |
| `CrossGenerator::updateReceivers` | Builds receiver candidates for crosses | World fact, candidate generator | Circulation actions - receive; combative preparation actions - move to attack goals |
| `CrossGenerator::updateOpponents` | Builds opponent state for cross safety | World fact | Circulation preparation actions - move to intercept enemy pass |
| `CrossGenerator::createCourses` | Creates cross courses for receivers | Candidate generator | Circulation actions - pass |
| `CrossGenerator::createCross` | Samples cross receive points and validates courses | Candidate generator, evaluator | Circulation actions - pass; circulation actions - receive |
| `CrossGenerator::checkOpponent` | Checks opponent reach along cross path | Evaluator, filter / gate | Circulation preparation actions - move to intercept enemy pass; possessive actions - protect my ball |
| `CrossGenerator::getMinimumAngleWidth` | Computes angular separation from defenders | Evaluator | Combative actions - attack goals with shot; circulation actions - pass |

### 9. `/src/player/bhv_goalie_basic_move.cpp`

| Source symbol / inline location | Description | Shape | Vial(s) |
| --- | --- | --- | --- |
| `Bhv_GoalieBasicMove::execute` | Main goalkeeper priority chain | Priority chain | Combative actions - defend goals from shot; combative preparation actions - move to defend goals |
| `Bhv_GoalieBasicMove::getTargetPoint` | Computes keeper target point on ball-goal relation | Spatial reference | Combative preparation actions - move to defend goals |
| `Bhv_GoalieBasicMove::getBasicDashPower` | Computes keeper dash power for move point | Evaluator | Combative preparation actions - move to defend goals |
| `Bhv_GoalieBasicMove::doPrepareDeepCross` | Prepares for deep cross danger | Priority-chain branch | Combative preparation actions - move to defend goals; circulation preparation actions - move to intercept enemy pass |
| `Bhv_GoalieBasicMove::doStopAtMovePoint` | Stops at move point | Execution behaviour, stabilizer | Combative preparation actions - move to defend goals |
| `Bhv_GoalieBasicMove::doMoveForDangerousState` | Emergency movement for dangerous state | Execution behaviour | Combative actions - defend goals from shot |
| `Bhv_GoalieBasicMove::doCorrectX` | Corrects keeper X position | Execution behaviour, spatial reference | Combative preparation actions - move to defend goals |
| `Bhv_GoalieBasicMove::doCorrectBodyDir` | Corrects keeper body direction | Execution behaviour | Combative preparation actions - move to defend goals |
| `Bhv_GoalieBasicMove::doGoToMovePoint` | Moves keeper to target point | Execution behaviour | Combative preparation actions - move to defend goals |
| `Bhv_GoalieBasicMove::doGoToPointLookBall` | Moves to point while looking at ball | Execution behaviour | Combative preparation actions - move to defend goals |
| `Bhv_BasicTackle(...).execute` inside `Bhv_GoalieBasicMove::execute` | Keeper tackle branch | Filter / gate, execution behaviour | Possessive actions - tackle his ball; combative actions - defend goals from shot |

### 10. `/src/player/bhv_goalie_chase_ball.cpp`

| Source symbol / inline location | Description | Shape | Vial(s) |
| --- | --- | --- | --- |
| `Bhv_GoalieChaseBall::execute` | Main keeper chase/intercept behaviour | Priority chain, execution behaviour | Possessive actions - tackle his ball; combative actions - defend goals from shot |
| `Bhv_GoalieChaseBall::doGoToCatchPoint` | Moves keeper to catch point | Execution behaviour | Possessive actions - tackle his ball; combative actions - defend goals from shot |
| `Bhv_GoalieChaseBall::is_ball_chase_situation` | Gates chase by penalty-area trajectory and arrival race | Filter / gate, evaluator | Possessive actions - tackle his ball; combative actions - defend goals from shot |
| `Bhv_GoalieChaseBall::is_ball_shoot_moving` | Detects shot-like ball movement toward goal | World fact, filter / gate | Combative actions - defend goals from shot |
| `Body_Intercept(...).execute` inside `Bhv_GoalieChaseBall::execute` | Normal keeper interception branch | Execution behaviour | Possessive actions - tackle his ball |
| `Bhv_GoalieBasicMove().execute` inside `Bhv_GoalieChaseBall::execute` | Falls back to goalie basic move | Priority-chain branch | Combative preparation actions - move to defend goals |

### 11. `/src/player/sample_field_evaluator.cpp`

| Source symbol / inline location | Description | Shape | Vial(s) |
| --- | --- | --- | --- |
| `SampleFieldEvaluator::operator()` | Entry point for predicted-state evaluation | Evaluator | World facts; progressive actions - advance team to goals |
| `evaluate_state` | Scores state by ball position, pressure, Voronoi space, offside gap, and shoot opportunity | Evaluator | World facts; progressive actions - advance team to goals; combative actions - attack goals with shot; circulation preparation actions - move to evade interception |
| `FieldAnalyzer::can_shoot_from` call inside `evaluate_state` | Adds shoot-opportunity bonus | Evaluator | Combative actions - attack goals with shot |

### 12. `/src/player/planner/field_analyzer.cpp`

| Source symbol / inline location | Description | Shape | Vial(s) |
| --- | --- | --- | --- |
| `FieldAnalyzer::estimate_virtual_dash_distance` | Estimates virtual dash distance under uncertainty | Evaluator | World facts; possessive actions - protect my ball |
| `FieldAnalyzer::predict_player_turn_cycle` | Predicts cycles needed to turn | World fact, evaluator | World facts; possessive actions - protect my ball |
| `FieldAnalyzer::predict_self_reach_cycle` | Predicts self reach cycle with stamina model | World fact, evaluator | Possessive actions - tackle his ball; possessive actions - protect my ball |
| `FieldAnalyzer::predict_player_reach_cycle` | Predicts generic player reach cycle | World fact, evaluator | Possessive actions - tackle his ball; circulation actions - receive |
| `FieldAnalyzer::predict_kick_count` | Predicts kicks needed for ball speed/action | Evaluator | Circulation actions - pass; combative actions - attack goals with shot |
| `FieldAnalyzer::get_ball_field_line_cross_point` | Finds line/field crossing for ball path | Spatial reference | World facts; circulation actions - pass |
| `FieldAnalyzer::get_field_bound_predict_ball_pos` | Predicts ball position at field boundary | World fact, spatial reference | World facts; circulation actions - pass |
| `FieldAnalyzer::can_shoot_from` | Checks whether a position has enough open shooting angle | Evaluator, filter / gate | Combative actions - attack goals with shot |
| `FieldAnalyzer::opponent_can_shoot_from` | Checks whether opponent can shoot from a point | Evaluator, filter / gate | Combative actions - defend goals from shot; combative preparation actions - move to defend goals |
| `FieldAnalyzer::get_pass_count` | Counts pass options from predicted state | Evaluator | Circulation actions - pass |
| `FieldAnalyzer::is_ball_moving_to_our_goal` | Checks whether ball is moving toward our goal | World fact, filter / gate | Combative actions - defend goals from shot |
| `FieldAnalyzer::to_be_final_action` | Determines final-action state near goal/offside contexts | Filter / gate | Progressive actions - advance team to goals; circulation actions - pass; combative actions - attack goals with shot |
| `FieldAnalyzer::get_blocker` | Selects blocker by attack angle and distance window | Evaluator, spatial reference | Progressive actions - obstruct enemy advance; combative preparation actions - move to defend goals |
| `FieldAnalyzer::update` | Updates analyzer state | World fact | World facts |
| `FieldAnalyzer::updateVoronoiDiagram` | Updates Voronoi diagram for pass/open-space reasoning | World fact, spatial reference | World facts; circulation preparation actions - move to evade interception |
| `FieldAnalyzer::writeDebugLog` | Writes analyzer debug output | Debug support | World facts |

---

## Non-Critical Files

| Source symbol / inline location | Description | Shape | Vial(s) |
| --- | --- | --- | --- |
| `role_*.cpp` | Role files are mostly boilerplate; role intelligence is formation/planner-driven | Data/boilerplate | World facts |
| `pass.cpp`, `shoot.cpp`, `dribble.cpp`, `positioning.cpp` | Data containers for action parameters | Data container | Depends on action |
| `DEState.cpp` | Empty/include-only file | None | None |
| `offensive_data_extractor.cpp` | Extracts DNN training features, not live behaviour | Data extraction | World facts |
| `formations-dt/*.conf` | Formation configs provide spatial reference data | Spatial reference | Combative preparation actions - move to attack goals; combative preparation actions - move to defend goals |
| `setplay/` | Setplay behaviours are outside initial open-play scope | Out of scope | Out of scope |

---

## Distillation Discipline

For every future row:

1. Use an exact C++ source symbol if one exists.
2. If no symbol exists, write `inline in <exact symbol>`.
3. Do not create a new camelCase label.
4. Describe what the old code does.
5. Classify shape and vial.

This keeps the process genetic distillation, not genetic modification.
