# SoccerSim Vial Centrifuge

> Inverse view of `README_5_PRINCIPLES_OF_PLAY.md`: exact old symbols grouped by genetic vial.

The first column must be either an exact C++ source symbol or an explicit inline location inside an exact symbol. No invented method names.

---

## World Facts

| Source symbol / inline location | Description | Shape | Source file |
| --- | --- | --- | --- |
| `Strategy::Strategy` | Initializes role factories and default role numbers | Spatial reference | `/src/player/strategy.cpp` |
| `Strategy::read` | Loads formation config files | Spatial reference | `/src/player/strategy.cpp` |
| `Strategy::createFormation` | Parses formation files and extracts role/goalie metadata | Spatial reference, world fact | `/src/player/strategy.cpp` |
| `Strategy::createRole` | Creates role object for a uniform number | Spatial reference | `/src/player/strategy.cpp` |
| `Strategy::update` | Updates situation and positions each tick | Priority chain | `/src/player/strategy.cpp` |
| `Strategy::isMarkerType` | Classifies marker-style player type | World fact | `/src/player/strategy.cpp` |
| `Strategy::updateSituation` | Compares intercept steps and selects situation | Evaluator | `/src/player/strategy.cpp` |
| `Strategy::getPositionType` | Returns role position type | World fact | `/src/player/strategy.cpp` |
| `Strategy::get_ball_area` | Classifies ball field area | World fact | `/src/player/strategy.cpp` |
| `Bhv_BasicMove::execute` inline `Body_TurnToBall().execute` | Turns to ball when movement does not execute | Execution behaviour | `/src/player/bhv_basic_move.cpp` |
| `Bhv_BasicBlock::execute` inline turn/scan | Turns or scans while blocking | Execution behaviour | `/src/player/bhv_basic_block.cpp` |
| `Bhv_Unmark::load_dnn` | Loads DNN weights for pass prediction | World fact | `/src/player/bhv_unmark.cpp` |
| `StrictCheckPassGenerator::updatePasser` | Builds passer state | World fact, filter / gate | `/src/player/planner/strict_check_pass_generator.cpp` |
| `StrictCheckPassGenerator::updateOpponents` | Builds opponent reach state | World fact | `/src/player/planner/strict_check_pass_generator.cpp` |
| `CrossGenerator::updateOpponents` | Builds opponent state for cross safety | World fact | `/src/player/planner/cross_generator.cpp` |
| `Bhv_GoalieChaseBall::is_ball_shoot_moving` | Detects shot-like ball movement toward goal | World fact, filter / gate | `/src/player/bhv_goalie_chase_ball.cpp` |
| `SampleFieldEvaluator::operator()` | Entry point for predicted-state evaluation | Evaluator | `/src/player/sample_field_evaluator.cpp` |
| `evaluate_state` | Scores predicted state using ball/space/offside/shot facts | Evaluator | `/src/player/sample_field_evaluator.cpp` |
| `FieldAnalyzer::estimate_virtual_dash_distance` | Estimates virtual dash distance under uncertainty | Evaluator | `/src/player/planner/field_analyzer.cpp` |
| `FieldAnalyzer::predict_player_turn_cycle` | Predicts cycles needed to turn | World fact, evaluator | `/src/player/planner/field_analyzer.cpp` |
| `FieldAnalyzer::get_ball_field_line_cross_point` | Finds line/field crossing for ball path | Spatial reference | `/src/player/planner/field_analyzer.cpp` |
| `FieldAnalyzer::get_field_bound_predict_ball_pos` | Predicts ball position at field boundary | World fact, spatial reference | `/src/player/planner/field_analyzer.cpp` |
| `FieldAnalyzer::update` | Updates analyzer state | World fact | `/src/player/planner/field_analyzer.cpp` |
| `FieldAnalyzer::updateVoronoiDiagram` | Updates Voronoi diagram | World fact, spatial reference | `/src/player/planner/field_analyzer.cpp` |

---

## Progressive Actions - Advance Team To Goals

| Source symbol / inline location | Description | Shape | Source file |
| --- | --- | --- | --- |
| `Strategy::updateSituation` | Selects phase from intercept comparison | Evaluator | `/src/player/strategy.cpp` |
| `Strategy::updatePosition` | Updates formation-based player positions from ball/game state | Spatial reference | `/src/player/strategy.cpp` |
| `Bhv_Unmark::lead_pass_simulator` | Simulates lead-pass target options | Candidate generator, evaluator | `/src/player/bhv_unmark.cpp` |
| `Bhv_Unmark::evaluate_position` | Scores unmark point including forward value | Evaluator | `/src/player/bhv_unmark.cpp` |
| `StrictCheckPassGenerator::createLeadingPass` | Creates leading pass into receiver space | Candidate generator | `/src/player/planner/strict_check_pass_generator.cpp` |
| `StrictCheckPassGenerator::createThroughPass` | Creates through pass behind defense | Candidate generator | `/src/player/planner/strict_check_pass_generator.cpp` |
| `StrictCheckPassGenerator::generate` inline sort | Sorts pass candidates toward opponent goal | Evaluator | `/src/player/planner/strict_check_pass_generator.cpp` |
| `ShortDribbleGenerator::generate` | Main short-dribble generation entrypoint | Candidate generator | `/src/player/planner/short_dribble_generator.cpp` |
| `ShortDribbleGenerator::createCourses` | Creates and filters dribble courses | Candidate generator, filter / gate | `/src/player/planner/short_dribble_generator.cpp` |
| `ShortDribbleGenerator::generate` inline sort | Sorts dribble courses toward opponent goal | Evaluator | `/src/player/planner/short_dribble_generator.cpp` |
| `evaluate_state` | Scores ball x/open space/offside/shot opportunity | Evaluator | `/src/player/sample_field_evaluator.cpp` |
| `FieldAnalyzer::to_be_final_action` | Determines final action near goal/offside | Filter / gate | `/src/player/planner/field_analyzer.cpp` |

---

## Progressive Actions - Obstruct Enemy Advance

| Source symbol / inline location | Description | Shape | Source file |
| --- | --- | --- | --- |
| `Bhv_BasicMove::execute` | Includes intercept/block/offside-trap defensive priority | Priority chain | `/src/player/bhv_basic_move.cpp` |
| `Bhv_BasicMove::execute` inline `Body_Intercept().execute` | Intercept branch | Filter / gate, execution behaviour | `/src/player/bhv_basic_move.cpp` |
| `Bhv_BasicMove::execute` inline `Bhv_BasicBlock().execute` | Block branch | Priority-chain branch | `/src/player/bhv_basic_move.cpp` |
| `Bhv_BasicBlock::execute` | Executes selected block behaviour | Priority chain, execution behaviour | `/src/player/bhv_basic_block.cpp` |
| `Bhv_BasicBlock::get_blockers` | Finds teammate blocker candidates | Candidate generator | `/src/player/bhv_basic_block.cpp` |
| `Bhv_BasicBlock::get_best_blocker` | Selects first teammate able to block/intercept route | Evaluator, filter / gate | `/src/player/bhv_basic_block.cpp` |
| `Bhv_BasicBlock::dribble_direction_detector` | Scores likely opponent dribble direction | Evaluator | `/src/player/bhv_basic_block.cpp` |
| `FieldAnalyzer::get_blocker` | Selects blocker by attack angle and distance | Evaluator, spatial reference | `/src/player/planner/field_analyzer.cpp` |

---

## Combative Actions - Attack Goals With Shot

| Source symbol / inline location | Description | Shape | Source file |
| --- | --- | --- | --- |
| `ShootGenerator::generate` | Main shoot generation entrypoint | Candidate generator, filter / gate | `/src/player/planner/shoot_generator.cpp` |
| inline range gate in `ShootGenerator::generate` | Cancels shooting when too far from opponent goal | Filter / gate | `/src/player/planner/shoot_generator.cpp` |
| inline goal target loop in `ShootGenerator::generate` | Samples target points across goal mouth | Candidate generator | `/src/player/planner/shoot_generator.cpp` |
| `ShootGenerator::createShoot` | Creates shot courses | Candidate generator | `/src/player/planner/shoot_generator.cpp` |
| `ShootGenerator::maybeGoalieCatch` | Tests goalie catch reach | Evaluator, filter / gate | `/src/player/planner/shoot_generator.cpp` |
| `ShootGenerator::opponentCanReach` | Tests opponent block reach | Evaluator, filter / gate | `/src/player/planner/shoot_generator.cpp` |
| `ShootGenerator::evaluateCourses` | Scores shot candidates | Evaluator | `/src/player/planner/shoot_generator.cpp` |
| `CrossGenerator::getMinimumAngleWidth` | Computes angular separation from defenders | Evaluator | `/src/player/planner/cross_generator.cpp` |
| `evaluate_state` inline `FieldAnalyzer::can_shoot_from` call | Adds shoot-opportunity bonus | Evaluator | `/src/player/sample_field_evaluator.cpp` |
| `FieldAnalyzer::can_shoot_from` | Checks if a position has enough open shooting angle | Evaluator, filter / gate | `/src/player/planner/field_analyzer.cpp` |
| `FieldAnalyzer::predict_kick_count` | Predicts kicks needed for shot/pass speed | Evaluator | `/src/player/planner/field_analyzer.cpp` |
| `FieldAnalyzer::to_be_final_action` | Determines final-action state near goal/offside | Filter / gate | `/src/player/planner/field_analyzer.cpp` |

---

## Combative Actions - Defend Goals From Shot

| Source symbol / inline location | Description | Shape | Source file |
| --- | --- | --- | --- |
| `Bhv_GoalieBasicMove::execute` | Main goalkeeper priority chain | Priority chain | `/src/player/bhv_goalie_basic_move.cpp` |
| `Bhv_GoalieBasicMove::execute` inline `Bhv_BasicTackle(...).execute` | Keeper tackle branch | Filter / gate, execution behaviour | `/src/player/bhv_goalie_basic_move.cpp` |
| `Bhv_GoalieBasicMove::doMoveForDangerousState` | Emergency movement for dangerous state | Execution behaviour | `/src/player/bhv_goalie_basic_move.cpp` |
| `Bhv_GoalieChaseBall::execute` | Main keeper chase/intercept behaviour | Priority chain, execution behaviour | `/src/player/bhv_goalie_chase_ball.cpp` |
| `Bhv_GoalieChaseBall::is_ball_chase_situation` | Gates chase by penalty-area trajectory and arrival race | Filter / gate, evaluator | `/src/player/bhv_goalie_chase_ball.cpp` |
| `Bhv_GoalieChaseBall::is_ball_shoot_moving` | Detects shot-like movement toward goal | World fact, filter / gate | `/src/player/bhv_goalie_chase_ball.cpp` |
| `FieldAnalyzer::opponent_can_shoot_from` | Checks if opponent can shoot from a point | Evaluator, filter / gate | `/src/player/planner/field_analyzer.cpp` |
| `FieldAnalyzer::is_ball_moving_to_our_goal` | Checks if ball is moving toward our goal | World fact, filter / gate | `/src/player/planner/field_analyzer.cpp` |

---

## Combative Preparation Actions - Move To Attack Goals

| Source symbol / inline location | Description | Shape | Source file |
| --- | --- | --- | --- |
| `Strategy::getFormation` | Selects active formation for world state/game mode | Spatial reference | `/src/player/strategy.cpp` |
| `Bhv_Unmark::evaluate_position` | Scores forward value of receiving point | Evaluator | `/src/player/bhv_unmark.cpp` |
| `StrictCheckPassGenerator::createThroughPass` | Creates through pass behind defense | Candidate generator | `/src/player/planner/strict_check_pass_generator.cpp` |
| `CrossGenerator::generate` | Generates crosses only near opponent goal | Candidate generator, filter / gate | `/src/player/planner/cross_generator.cpp` |
| `CrossGenerator::updateReceivers` | Builds receiver candidates for crosses | World fact, candidate generator | `/src/player/planner/cross_generator.cpp` |
| `CrossGenerator::createCross` | Samples and validates cross receive points | Candidate generator, evaluator | `/src/player/planner/cross_generator.cpp` |
| `formations-dt/*.conf` | Formation configs provide attacking spatial references | Spatial reference | `/src/formations-dt/*.conf` |

---

## Combative Preparation Actions - Move To Defend Goals

| Source symbol / inline location | Description | Shape | Source file |
| --- | --- | --- | --- |
| `Strategy::read` | Loads defensive/goalie formation data | Spatial reference | `/src/player/strategy.cpp` |
| `Strategy::getPosition` | Returns current home/role position | Spatial reference | `/src/player/strategy.cpp` |
| `Strategy::getFormation` | Selects active formation | Spatial reference | `/src/player/strategy.cpp` |
| `Strategy::get_normal_dash_power` | Calculates movement dash power | Evaluator, stabilizer | `/src/player/strategy.cpp` |
| `Bhv_BasicMove::execute` inline `Bhv_BasicBlock().execute` | Defensive block branch | Priority-chain branch | `/src/player/bhv_basic_move.cpp` |
| `Bhv_BasicMove::execute` inline `Body_GoToPoint(...).execute` | Home-position movement fallback | Execution behaviour, spatial reference | `/src/player/bhv_basic_move.cpp` |
| `Bhv_BasicBlock::execute` | Executes selected block behaviour | Priority chain, execution behaviour | `/src/player/bhv_basic_block.cpp` |
| `Bhv_GoalieBasicMove::getTargetPoint` | Computes keeper target point | Spatial reference | `/src/player/bhv_goalie_basic_move.cpp` |
| `Bhv_GoalieBasicMove::doPrepareDeepCross` | Prepares for deep cross danger | Priority-chain branch | `/src/player/bhv_goalie_basic_move.cpp` |
| `Bhv_GoalieBasicMove::doCorrectX` | Corrects keeper X position | Execution behaviour, spatial reference | `/src/player/bhv_goalie_basic_move.cpp` |
| `Bhv_GoalieBasicMove::doCorrectBodyDir` | Corrects keeper body direction | Execution behaviour | `/src/player/bhv_goalie_basic_move.cpp` |
| `Bhv_GoalieBasicMove::doGoToMovePoint` | Moves keeper to target point | Execution behaviour | `/src/player/bhv_goalie_basic_move.cpp` |
| `Bhv_GoalieChaseBall::execute` fallback `Bhv_GoalieBasicMove().execute` | Falls back to keeper basic positioning | Priority-chain branch | `/src/player/bhv_goalie_chase_ball.cpp` |
| `FieldAnalyzer::opponent_can_shoot_from` | Checks opponent shot threat | Evaluator, filter / gate | `/src/player/planner/field_analyzer.cpp` |
| `FieldAnalyzer::get_blocker` | Selects blocker by attack angle | Evaluator, spatial reference | `/src/player/planner/field_analyzer.cpp` |
| `formations-dt/*.conf` | Formation configs provide defensive spatial references | Spatial reference | `/src/formations-dt/*.conf` |

---

## Possessive Actions - Tackle His Ball

| Source symbol / inline location | Description | Shape | Source file |
| --- | --- | --- | --- |
| `Strategy::updateSituation` | Reads intercept race for possession situation | Evaluator | `/src/player/strategy.cpp` |
| `Bhv_BasicMove::execute` inline `Bhv_BasicTackle(...).execute` | Tackle branch | Filter / gate, execution behaviour | `/src/player/bhv_basic_move.cpp` |
| `Bhv_BasicMove::execute` inline `Body_Intercept().execute` | Intercept branch | Filter / gate, execution behaviour | `/src/player/bhv_basic_move.cpp` |
| `Bhv_BasicBlock::get_best_blocker` | Selects teammate able to block/intercept | Evaluator, filter / gate | `/src/player/bhv_basic_block.cpp` |
| `Bhv_BasicBlock::execute` inline `Body_Intercept().execute` | Direct intercept branch | Execution behaviour | `/src/player/bhv_basic_block.cpp` |
| `Bhv_GoalieBasicMove::execute` inline `Bhv_BasicTackle(...).execute` | Keeper tackle branch | Filter / gate, execution behaviour | `/src/player/bhv_goalie_basic_move.cpp` |
| `Bhv_GoalieChaseBall::execute` | Chases/intercepts ball | Priority chain, execution behaviour | `/src/player/bhv_goalie_chase_ball.cpp` |
| `Bhv_GoalieChaseBall::doGoToCatchPoint` | Moves keeper to catch point | Execution behaviour | `/src/player/bhv_goalie_chase_ball.cpp` |
| `Bhv_GoalieChaseBall::is_ball_chase_situation` | Requires keeper to beat opponent | Filter / gate, evaluator | `/src/player/bhv_goalie_chase_ball.cpp` |
| `FieldAnalyzer::predict_self_reach_cycle` | Predicts self reach cycle | World fact, evaluator | `/src/player/planner/field_analyzer.cpp` |
| `FieldAnalyzer::predict_player_reach_cycle` | Predicts generic player reach cycle | World fact, evaluator | `/src/player/planner/field_analyzer.cpp` |

---

## Possessive Actions - Protect My Ball

| Source symbol / inline location | Description | Shape | Source file |
| --- | --- | --- | --- |
| `Strategy::get_normal_dash_power` | Calculates dash power under stamina/role constraints | Evaluator, stabilizer | `/src/player/strategy.cpp` |
| `Bhv_Unmark::can_unmarking` | Gates unmarking by stamina/role/zone | Filter / gate, stabilizer | `/src/player/bhv_unmark.cpp` |
| `Bhv_Unmark::opponents_cycle_intercept` | Estimates opponent interception cycles | Evaluator | `/src/player/bhv_unmark.cpp` |
| `Bhv_Unmark::opponent_cycle_intercept` | Estimates one opponent's interception cycle | Evaluator | `/src/player/bhv_unmark.cpp` |
| `Bhv_Unmark::evaluate_position` | Scores safety of receive point | Evaluator | `/src/player/bhv_unmark.cpp` |
| `StrictCheckPassGenerator::createPassCommon` | Validates pass safety and reach | Filter / gate, evaluator | `/src/player/planner/strict_check_pass_generator.cpp` |
| `StrictCheckPassGenerator::predictReceiverReachStep` | Predicts receiver reach step | Evaluator, world fact | `/src/player/planner/strict_check_pass_generator.cpp` |
| `StrictCheckPassGenerator::predictOpponentsReachStep` | Predicts opponent pass reach | Evaluator, world fact | `/src/player/planner/strict_check_pass_generator.cpp` |
| `ShootGenerator::createShoot` | Searches feasible kick speed/course | Candidate generator | `/src/player/planner/shoot_generator.cpp` |
| `ShortDribbleGenerator::createCourses` | Creates safe dribble courses | Candidate generator, filter / gate | `/src/player/planner/short_dribble_generator.cpp` |
| `ShortDribbleGenerator::simulateDashes` | Simulates dribble path | World fact, evaluator | `/src/player/planner/short_dribble_generator.cpp` |
| `ShortDribbleGenerator::simulateKickTurnsDashes` | Simulates kick/turn/dash sequence | World fact, evaluator | `/src/player/planner/short_dribble_generator.cpp` |
| `ShortDribbleGenerator::createSelfCache` | Caches self movement prediction | Stabilizer, world fact | `/src/player/planner/short_dribble_generator.cpp` |
| `ShortDribbleGenerator::checkOpponent` | Checks opponent reach against dribble | Evaluator, filter / gate | `/src/player/planner/short_dribble_generator.cpp` |
| `CrossGenerator::checkOpponent` | Checks opponent reach along cross path | Evaluator, filter / gate | `/src/player/planner/cross_generator.cpp` |
| `FieldAnalyzer::estimate_virtual_dash_distance` | Estimates uncertainty-adjusted dash distance | Evaluator | `/src/player/planner/field_analyzer.cpp` |
| `FieldAnalyzer::predict_player_turn_cycle` | Predicts turn cycle | World fact, evaluator | `/src/player/planner/field_analyzer.cpp` |
| `FieldAnalyzer::predict_self_reach_cycle` | Predicts self reach with stamina model | World fact, evaluator | `/src/player/planner/field_analyzer.cpp` |

---

## Circulation Actions - Pass

| Source symbol / inline location | Description | Shape | Source file |
| --- | --- | --- | --- |
| `passSpeed` | Calculates pass speed estimate | World fact | `/src/player/bhv_unmark.cpp` |
| `Bhv_Unmark::pass_travel_cycle` | Estimates pass travel cycles | World fact | `/src/player/bhv_unmark.cpp` |
| `StrictCheckPassGenerator::generate` | Main strict pass generation entrypoint | Candidate generator | `/src/player/planner/strict_check_pass_generator.cpp` |
| `StrictCheckPassGenerator::updatePasser` | Builds passer state | World fact, filter / gate | `/src/player/planner/strict_check_pass_generator.cpp` |
| `StrictCheckPassGenerator::createCourses` | Creates pass courses | Candidate generator | `/src/player/planner/strict_check_pass_generator.cpp` |
| `StrictCheckPassGenerator::createDirectPass` | Creates direct pass | Candidate generator | `/src/player/planner/strict_check_pass_generator.cpp` |
| `StrictCheckPassGenerator::createLeadingPass` | Creates leading pass | Candidate generator | `/src/player/planner/strict_check_pass_generator.cpp` |
| `StrictCheckPassGenerator::createThroughPass` | Creates through pass | Candidate generator | `/src/player/planner/strict_check_pass_generator.cpp` |
| `StrictCheckPassGenerator::createPassCommon` | Common pass validation | Filter / gate, evaluator | `/src/player/planner/strict_check_pass_generator.cpp` |
| `CrossGenerator::generate` | Main cross generation entrypoint | Candidate generator, filter / gate | `/src/player/planner/cross_generator.cpp` |
| `CrossGenerator::createCourses` | Creates cross courses | Candidate generator | `/src/player/planner/cross_generator.cpp` |
| `CrossGenerator::createCross` | Samples and validates cross | Candidate generator, evaluator | `/src/player/planner/cross_generator.cpp` |
| `FieldAnalyzer::predict_kick_count` | Predicts kicks needed | Evaluator | `/src/player/planner/field_analyzer.cpp` |
| `FieldAnalyzer::get_pass_count` | Counts pass options | Evaluator | `/src/player/planner/field_analyzer.cpp` |

---

## Circulation Actions - Receive

| Source symbol / inline location | Description | Shape | Source file |
| --- | --- | --- | --- |
| `Bhv_Unmark::pass_travel_cycle` | Estimates receive timing through pass travel | World fact | `/src/player/bhv_unmark.cpp` |
| `Bhv_Unmark::evaluate_position` | Scores receive point | Evaluator | `/src/player/bhv_unmark.cpp` |
| `Bhv_Unmark::run` | Moves to selected unmark/receive point | Execution behaviour | `/src/player/bhv_unmark.cpp` |
| `Bhv_Unmark::execute` | Main unmark/receive-prep behaviour | Priority chain | `/src/player/bhv_unmark.cpp` |
| `StrictCheckPassGenerator::updateReceivers` | Builds receiver candidates | World fact, candidate generator, filter / gate | `/src/player/planner/strict_check_pass_generator.cpp` |
| `StrictCheckPassGenerator::createDirectPass` | Creates receive point at receiver inertia/current position | Candidate generator | `/src/player/planner/strict_check_pass_generator.cpp` |
| `StrictCheckPassGenerator::createLeadingPass` | Creates receive point in space | Candidate generator | `/src/player/planner/strict_check_pass_generator.cpp` |
| `StrictCheckPassGenerator::getNearestReceiverUnum` | Finds nearest receiver to a point | Evaluator | `/src/player/planner/strict_check_pass_generator.cpp` |
| `StrictCheckPassGenerator::predictReceiverReachStep` | Predicts receiver reach step | Evaluator, world fact | `/src/player/planner/strict_check_pass_generator.cpp` |
| `CrossGenerator::updateReceivers` | Builds cross receiver candidates | World fact, candidate generator | `/src/player/planner/cross_generator.cpp` |
| `CrossGenerator::createCross` | Samples cross receive points | Candidate generator, evaluator | `/src/player/planner/cross_generator.cpp` |
| `FieldAnalyzer::predict_player_reach_cycle` | Predicts player reach cycle | World fact, evaluator | `/src/player/planner/field_analyzer.cpp` |

---

## Circulation Preparation Actions - Move To Intercept Enemy Pass

| Source symbol / inline location | Description | Shape | Source file |
| --- | --- | --- | --- |
| `Bhv_Unmark::opponents_cycle_intercept` | Estimates opponent interception cycles | Evaluator | `/src/player/bhv_unmark.cpp` |
| `Bhv_Unmark::opponent_cycle_intercept` | Estimates one opponent's interception cycle | Evaluator | `/src/player/bhv_unmark.cpp` |
| `StrictCheckPassGenerator::updateOpponents` | Builds opponent reach state | World fact | `/src/player/planner/strict_check_pass_generator.cpp` |
| `StrictCheckPassGenerator::predictOpponentsReachStep` | Predicts earliest opponent reach | Evaluator, world fact | `/src/player/planner/strict_check_pass_generator.cpp` |
| `StrictCheckPassGenerator::predictOpponentReachStep` | Predicts one opponent reach | Evaluator, world fact | `/src/player/planner/strict_check_pass_generator.cpp` |
| `CrossGenerator::updateOpponents` | Builds opponent state for cross safety | World fact | `/src/player/planner/cross_generator.cpp` |
| `CrossGenerator::checkOpponent` | Checks opponent reach along cross path | Evaluator, filter / gate | `/src/player/planner/cross_generator.cpp` |
| `Bhv_GoalieBasicMove::doPrepareDeepCross` | Prepares keeper for deep cross danger | Priority-chain branch | `/src/player/bhv_goalie_basic_move.cpp` |

---

## Circulation Preparation Actions - Move To Evade Interception

| Source symbol / inline location | Description | Shape | Source file |
| --- | --- | --- | --- |
| `Strategy::getPosition` | Returns current home/role position | Spatial reference | `/src/player/strategy.cpp` |
| `Bhv_BasicMove::execute` inline `Bhv_Unmark().execute` | Unmark branch | Priority-chain branch | `/src/player/bhv_basic_move.cpp` |
| `Bhv_Unmark::execute` | Main unmark behaviour | Priority chain | `/src/player/bhv_unmark.cpp` |
| `Bhv_Unmark::can_unmarking` | Gates unmarking | Filter / gate, stabilizer | `/src/player/bhv_unmark.cpp` |
| `Bhv_Unmark::passer_finder` | Finds likely passer | World fact | `/src/player/bhv_unmark.cpp` |
| `Bhv_Unmark::simulate_dash` | Samples movement positions around player | Candidate generator | `/src/player/bhv_unmark.cpp` |
| `Bhv_Unmark::nearest_tm_dist_to` | Measures teammate distance to point | Evaluator | `/src/player/bhv_unmark.cpp` |
| `Bhv_Unmark::lead_pass_simulator` | Simulates lead-pass target options | Candidate generator, evaluator | `/src/player/bhv_unmark.cpp` |
| `Bhv_Unmark::evaluate_position` | Scores unmark/receive point | Evaluator | `/src/player/bhv_unmark.cpp` |
| `Bhv_Unmark::run` | Executes movement to selected unmark point | Execution behaviour | `/src/player/bhv_unmark.cpp` |
| `Bhv_Unmark::predict_pass_dnn` | Predicts pass probabilities | Evaluator | `/src/player/bhv_unmark.cpp` |
| `Bhv_Unmark::find_passer_dnn` | Finds likely passer with DNN predictions | Evaluator | `/src/player/bhv_unmark.cpp` |
| `StrictCheckPassGenerator::createLeadingPass` | Samples lead-pass angles/distances | Candidate generator | `/src/player/planner/strict_check_pass_generator.cpp` |
| `CrossGenerator::createCross` | Samples cross receive points | Candidate generator, evaluator | `/src/player/planner/cross_generator.cpp` |
| `evaluate_state` | Uses Voronoi/open-space and sector checks | Evaluator | `/src/player/sample_field_evaluator.cpp` |
| `FieldAnalyzer::updateVoronoiDiagram` | Updates Voronoi diagram for open-space reasoning | World fact, spatial reference | `/src/player/planner/field_analyzer.cpp` |

---

## Notes

- Rows are duplicated across vials when the same old method serves multiple football functions.
- `inline in ...` rows are not invented names; they identify unnamed branches inside exact old methods.
- Keep this file synchronized with README 5.
