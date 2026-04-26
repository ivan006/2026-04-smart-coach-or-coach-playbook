# SoccerSim Vial Centrifuge

> Inverse view of `README_5_PRINCIPLES_OF_PLAY.md`: methods grouped by genetic vial instead of by source file.

This document keeps the same method names, descriptions, and shapes as README 5, but switches the dimensions:

```text
genetic vial -> old method -> source file
```

Use this when asking, "What old methods feed this vial?"

---

## World Facts

| Method name | Description | Shape | Source file |
| --- | --- | --- | --- |
| `loadFormations` | Loads normal, offense, defense, setplay, and goalie-state formation configs | Spatial reference | `/src/player/strategy.cpp` |
| `assignRoles` | Creates role objects and assigns role numbers/types | Spatial reference | `/src/player/strategy.cpp` |
| `detectGoalie` | Detects and validates the goalie uniform number | World fact | `/src/player/strategy.cpp` |
| `compareInterceptSteps` | Reads self, teammate, and opponent intercept steps | World fact, evaluator | `/src/player/strategy.cpp` |
| `assignPositionType` | Tracks role side/position type | Spatial reference | `/src/player/strategy.cpp` |
| `scanWhileMoving` | Uses neck/scan behaviours while moving | Execution behaviour | `/src/player/bhv_basic_move.cpp` |
| `faceBallWhileBlocking` | Turns or scans while blocking | Execution behaviour | `/src/player/bhv_basic_block.cpp` |
| `predictPassChainWithDnn` | Uses DNN-assisted pass-chain prediction | World fact, evaluator | `/src/player/bhv_unmark.cpp` |
| `updatePasserState` | Builds current passer facts | World fact | `/src/player/planner/strict_check_pass_generator.cpp` |
| `updateReceiverState` | Builds receiver facts | World fact | `/src/player/planner/strict_check_pass_generator.cpp` |
| `updateOpponentState` | Builds opponent reach facts | World fact | `/src/player/planner/strict_check_pass_generator.cpp` |
| `simulateBallTrajectory` | Simulates ball path for pass safety | World fact | `/src/player/planner/strict_check_pass_generator.cpp` |
| `predictOpponentDribblePath` | Simulates opponent dribble path about 40 cycles ahead | World fact, candidate generator | `/src/player/bhv_basic_block.cpp` |
| `simulateCrossTrajectory` | Simulates ball path cycle by cycle | World fact, evaluator | `/src/player/planner/cross_generator.cpp` |
| `checkPenaltyTrajectory` | Checks if ball trajectory enters penalty area | World fact, filter / gate | `/src/player/bhv_goalie_chase_ball.cpp` |
| `checkShotMovingToGoal` | Detects confirmed shot moving toward goal | World fact, filter / gate | `/src/player/bhv_goalie_chase_ball.cpp` |
| `checkPlayerSectors` | Checks teammates/opponents in sectors | World fact, evaluator | `/src/player/sample_field_evaluator.cpp` |
| `predictTurnCycle` | Predicts cycles needed to turn | World fact, evaluator | `/src/player/planner/field_analyzer.cpp` |
| `getBallFieldLineCrossPoint` | Finds line/field crossing for ball path | Spatial reference | `/src/player/planner/field_analyzer.cpp` |
| `updatePassVoronoi` | Updates Voronoi diagram for pass/open-space reasoning | World fact, spatial reference | `/src/player/planner/field_analyzer.cpp` |
| `roleFiles` | Role files are mostly boilerplate; role intelligence is formation/planner-driven | Data/boilerplate | `/src/player/role_*.cpp` |
| `offensiveDataExtractor` | Extracts DNN training features, not live behaviour | Data extraction | `/src/player/data_extractor/offensive_data_extractor.cpp` |

---

## Progressive Actions - Advance Team To Goals

| Method name | Description | Shape | Source file |
| --- | --- | --- | --- |
| `selectSituation` | Chooses normal/offense/defense situation from intercept comparison | Priority chain | `/src/player/strategy.cpp` |
| `projectBallStep` | Projects ball step before home-position lookup | World fact | `/src/player/strategy.cpp` |
| `compressOrExpandShape` | Formation data compresses in own half and expands in opponent half | Spatial reference | `/src/player/strategy.cpp` |
| `rewardForwardDirection` | Rewards forward value in the receiving point | Evaluator | `/src/player/bhv_unmark.cpp` |
| `generateLeadingPass` | Generates pass into space around receiver | Candidate generator | `/src/player/planner/strict_check_pass_generator.cpp` |
| `generateThroughPass` | Generates pass behind defense into space | Candidate generator | `/src/player/planner/strict_check_pass_generator.cpp` |
| `sortByGoalProximity` | Sorts candidates by closeness to opponent goal | Evaluator | `/src/player/planner/strict_check_pass_generator.cpp` |
| `sampleDribbleDirections` | Samples 16 dribble directions | Candidate generator | `/src/player/planner/short_dribble_generator.cpp` |
| `filterByFieldZone` | Filters dribble direction by field zone | Filter / gate | `/src/player/planner/short_dribble_generator.cpp` |
| `sortDribbleByGoalProximity` | Sorts dribbles by proximity to opponent goal | Evaluator | `/src/player/planner/short_dribble_generator.cpp` |
| `scoreWholeState` | Scores a predicted game state | Evaluator | `/src/player/sample_field_evaluator.cpp` |
| `scoreBallX` | Scores ball x-position | Evaluator | `/src/player/sample_field_evaluator.cpp` |
| `weightByOpponentPressure` | Weights ball value by opponent pressure | Evaluator | `/src/player/sample_field_evaluator.cpp` |
| `findVoronoiOpenSpace` | Finds best open-space point using Voronoi reasoning | Evaluator, spatial reference | `/src/player/sample_field_evaluator.cpp` |
| `detectOffsideLineGap` | Finds useful gaps near offside line | Evaluator, spatial reference | `/src/player/sample_field_evaluator.cpp` |
| `bonusFreeOffsideLineSituation` | Adds bonus for free situation near offside line | Evaluator | `/src/player/sample_field_evaluator.cpp` |
| `gateNearGoalNextAction` | Near opponent goal, searches for next action such as shoot | Filter / gate | `/src/player/planner/field_analyzer.cpp` |
| `gateOverOffsideLineFinalAction` | Treats over-offside-line action as final | Filter / gate | `/src/player/planner/field_analyzer.cpp` |

---

## Progressive Actions - Obstruct Enemy Advance

| Method name | Description | Shape | Source file |
| --- | --- | --- | --- |
| `selectSituation` | Chooses normal/offense/defense situation from intercept comparison | Priority chain | `/src/player/strategy.cpp` |
| `compressOrExpandShape` | Formation data compresses in own half and expands in opponent half | Spatial reference | `/src/player/strategy.cpp` |
| `runOutfieldPriority` | Attempts tackle, intercept, block, offside trap, unmark, then home position | Priority chain | `/src/player/bhv_basic_move.cpp` |
| `tryIntercept` | Uses intercept race to decide whether to intercept | Filter / gate, execution behaviour | `/src/player/bhv_basic_move.cpp` |
| `applyPressingMargin` | Uses role-aware margins for pressing/intercept decisions | Evaluator | `/src/player/bhv_basic_move.cpp` |
| `tryBlock` | Delegates to defensive block behaviour | Priority-chain branch | `/src/player/bhv_basic_move.cpp` |
| `tryOffsideTrap` | Steps line forward in specific defensive contexts | Priority-chain branch, spatial reference | `/src/player/bhv_basic_move.cpp` |
| `predictOpponentDribblePath` | Simulates opponent dribble path about 40 cycles ahead | World fact, candidate generator | `/src/player/bhv_basic_block.cpp` |
| `sampleOpponentDribbleDirections` | Generates possible opponent dribble routes | Candidate generator | `/src/player/bhv_basic_block.cpp` |
| `scoreDribbleDanger` | Scores routes by forward danger and proximity to own goal | Evaluator | `/src/player/bhv_basic_block.cpp` |
| `selectFirstBlocker` | Finds the first teammate able to intercept/block the route | Evaluator, filter / gate | `/src/player/bhv_basic_block.cpp` |
| `moveToBlockPoint` | Moves to the selected blocking point | Execution behaviour | `/src/player/bhv_basic_block.cpp` |
| `selectBlockerByAttackAngle` | Selects blocker using attack angle | Evaluator, spatial reference | `/src/player/planner/field_analyzer.cpp` |

---

## Combative Actions - Attack Goals With Shot

| Method name | Description | Shape | Source file |
| --- | --- | --- | --- |
| `gateShootByRange` | Activates shooting only near enough to goal | Filter / gate | `/src/player/planner/shoot_generator.cpp` |
| `sampleGoalTargets` | Samples target points across goal mouth | Candidate generator | `/src/player/planner/shoot_generator.cpp` |
| `searchTwentyFiveTargets` | Uses dense target search across goal width | Candidate generator | `/src/player/planner/shoot_generator.cpp` |
| `searchKickSpeed` | Searches kick speed / one-step feasibility | Candidate generator, filter / gate | `/src/player/planner/shoot_generator.cpp` |
| `scoreOneKickBonus` | Rewards one-kick shot feasibility | Evaluator | `/src/player/planner/shoot_generator.cpp` |
| `scoreGoalieUnreachable` | Rewards shots the goalie cannot reach | Evaluator | `/src/player/planner/shoot_generator.cpp` |
| `scoreOpponentUnreachable` | Rewards shots opponents cannot block | Evaluator | `/src/player/planner/shoot_generator.cpp` |
| `scoreGoalieAngleRate` | Scores shot target by goalie angle relation | Evaluator | `/src/player/planner/shoot_generator.cpp` |
| `scoreGoalYRate` | Scores target centrality / y-rate | Evaluator | `/src/player/planner/shoot_generator.cpp` |
| `rejectBlockedCourse` | Rejects blocked shot courses | Filter / gate | `/src/player/planner/shoot_generator.cpp` |
| `selectMaxAngleWidth` | Selects cross with best angular separation | Evaluator | `/src/player/planner/cross_generator.cpp` |
| `bonusShootOpportunity` | Adds large bonus for shoot opportunity | Evaluator | `/src/player/sample_field_evaluator.cpp` |
| `canShootFrom` | Determines if a position can shoot | Evaluator, filter / gate | `/src/player/planner/field_analyzer.cpp` |
| `sampleGoalAngles` | Samples angles across goal width | Candidate generator, evaluator | `/src/player/planner/field_analyzer.cpp` |
| `modelOpponentHideAngle` | Models opponent blocking/hide angle | World fact, evaluator | `/src/player/planner/field_analyzer.cpp` |
| `thresholdMaxShotGap` | Requires enough open shooting angle | Evaluator, filter / gate | `/src/player/planner/field_analyzer.cpp` |
| `gateNearGoalNextAction` | Near opponent goal, searches for next action such as shoot | Filter / gate | `/src/player/planner/field_analyzer.cpp` |

---

## Combative Actions - Defend Goals From Shot

| Method name | Description | Shape | Source file |
| --- | --- | --- | --- |
| `detectGoalie` | Detects and validates the goalie uniform number | World fact | `/src/player/strategy.cpp` |
| `filterDangerousBackpass` | Rejects dangerous backpass areas | Filter / gate | `/src/player/planner/strict_check_pass_generator.cpp` |
| `restrictDeepOwnHalfAngle` | Deep own half uses stricter forward angle | Filter / gate | `/src/player/planner/short_dribble_generator.cpp` |
| `runKeeperPriority` | Attempts tackle, deep cross prep, stop, emergency dash, X/body/Y corrections | Priority chain | `/src/player/bhv_goalie_basic_move.cpp` |
| `tryKeeperTackle` | Attempts keeper tackle | Execution behaviour, filter / gate | `/src/player/bhv_goalie_basic_move.cpp` |
| `emergencyDash` | Uses emergency dash toward danger | Execution behaviour | `/src/player/bhv_goalie_basic_move.cpp` |
| `checkPenaltyTrajectory` | Checks if ball trajectory enters penalty area | World fact, filter / gate | `/src/player/bhv_goalie_chase_ball.cpp` |
| `checkKeeperBeatsOpponent` | Requires keeper arrival before opponent | Evaluator, filter / gate | `/src/player/bhv_goalie_chase_ball.cpp` |
| `checkShotMovingToGoal` | Detects confirmed shot moving toward goal | World fact, filter / gate | `/src/player/bhv_goalie_chase_ball.cpp` |
| `calculateCatchPoint` | Computes active interception catch point | World fact | `/src/player/bhv_goalie_chase_ball.cpp` |
| `rejectOutsidePenalty` | Rejects chase outside penalty area | Filter / gate | `/src/player/bhv_goalie_chase_ball.cpp` |
| `executeKeeperChase` | Chases/intercepts ball | Execution behaviour | `/src/player/bhv_goalie_chase_ball.cpp` |
| `opponentCanShootFrom` | Determines if opponent can shoot from a point | Evaluator, filter / gate | `/src/player/planner/field_analyzer.cpp` |
| `checkBallMovingToGoal` | Checks if ball is moving toward goal | World fact, filter / gate | `/src/player/planner/field_analyzer.cpp` |

---

## Combative Preparation Actions - Move To Attack Goals

| Method name | Description | Shape | Source file |
| --- | --- | --- | --- |
| `selectCurrentFormation` | Picks formation by situation and game mode | Spatial reference | `/src/player/strategy.cpp` |
| `rewardForwardDirection` | Rewards forward value in the receiving point | Evaluator | `/src/player/bhv_unmark.cpp` |
| `generateThroughPass` | Generates pass behind defense into space | Candidate generator | `/src/player/planner/strict_check_pass_generator.cpp` |
| `sortByGoalProximity` | Sorts candidates by closeness to opponent goal | Evaluator | `/src/player/planner/strict_check_pass_generator.cpp` |
| `sortDribbleByGoalProximity` | Sorts dribbles by proximity to opponent goal | Evaluator | `/src/player/planner/short_dribble_generator.cpp` |
| `gateCrossByGoalDistance` | Only generates crosses near opponent goal | Filter / gate | `/src/player/planner/cross_generator.cpp` |
| `sampleCrossReceivePoints` | Samples receive points for cross targets | Candidate generator | `/src/player/planner/cross_generator.cpp` |
| `measureNearestDefenderSeparation` | Measures separation from nearest defender | Evaluator | `/src/player/planner/cross_generator.cpp` |
| `bonusFreeOffsideLineSituation` | Adds bonus for free situation near offside line | Evaluator | `/src/player/sample_field_evaluator.cpp` |
| `formationTables` | Formation configs provide spatial reference data | Spatial reference | `/src/formations-dt/*.conf` |

---

## Combative Preparation Actions - Move To Defend Goals

| Method name | Description | Shape | Source file |
| --- | --- | --- | --- |
| `loadFormations` | Loads normal, offense, defense, setplay, and goalie-state formation configs | Spatial reference | `/src/player/strategy.cpp` |
| `selectCurrentFormation` | Picks formation by situation and game mode | Spatial reference | `/src/player/strategy.cpp` |
| `lookupHomePosition` | Gets interpolated home position from formation data | Spatial reference | `/src/player/strategy.cpp` |
| `calculateDashPower` | Adjusts dash power by role, field zone, and stamina | Evaluator, stabilizer | `/src/player/strategy.cpp` |
| `tryBlock` | Delegates to defensive block behaviour | Priority-chain branch | `/src/player/bhv_basic_move.cpp` |
| `tryOffsideTrap` | Steps line forward in specific defensive contexts | Priority-chain branch, spatial reference | `/src/player/bhv_basic_move.cpp` |
| `goHome` | Falls back to formation home position | Spatial reference, execution behaviour | `/src/player/bhv_basic_move.cpp` |
| `setMoveDashPower` | Chooses dash power for the movement action | Evaluator, stabilizer | `/src/player/bhv_basic_move.cpp` |
| `scoreDribbleDanger` | Scores routes by forward danger and proximity to own goal | Evaluator | `/src/player/bhv_basic_block.cpp` |
| `moveToBlockPoint` | Moves to the selected blocking point | Execution behaviour | `/src/player/bhv_basic_block.cpp` |
| `setKeeperLinePosition` | Positions keeper on line between ball and point behind goal | Spatial reference | `/src/player/bhv_goalie_basic_move.cpp` |
| `clampKeeperToDefendLine` | Clamps keeper position to goal/defend line | Spatial reference, filter / gate | `/src/player/bhv_goalie_basic_move.cpp` |
| `runKeeperPriority` | Attempts tackle, deep cross prep, stop, emergency dash, X/body/Y corrections | Priority chain | `/src/player/bhv_goalie_basic_move.cpp` |
| `prepareForDeepCross` | Prepares keeper for deep cross danger | Priority-chain branch | `/src/player/bhv_goalie_basic_move.cpp` |
| `stopDash` | Stops current dash motion | Execution behaviour, stabilizer | `/src/player/bhv_goalie_basic_move.cpp` |
| `correctKeeperX` | Corrects keeper X position | Execution behaviour, spatial reference | `/src/player/bhv_goalie_basic_move.cpp` |
| `correctKeeperBodyAngle` | Corrects keeper body angle | Execution behaviour | `/src/player/bhv_goalie_basic_move.cpp` |
| `correctKeeperY` | Corrects keeper Y position | Execution behaviour, spatial reference | `/src/player/bhv_goalie_basic_move.cpp` |
| `intersectDefendLine` | Finds ball-line intersection with vertical defend line | Spatial reference | `/src/player/bhv_goalie_chase_ball.cpp` |
| `slideStepToLine` | Uses slide-step positioning from intersection | Execution behaviour, spatial reference | `/src/player/bhv_goalie_chase_ball.cpp` |
| `opponentCanShootFrom` | Determines if opponent can shoot from a point | Evaluator, filter / gate | `/src/player/planner/field_analyzer.cpp` |
| `modelTeammateBlockAngle` | Models teammate blocking angle against opponent shot | Evaluator | `/src/player/planner/field_analyzer.cpp` |
| `selectBlockerByAttackAngle` | Selects blocker using attack angle | Evaluator, spatial reference | `/src/player/planner/field_analyzer.cpp` |
| `formationTables` | Formation configs provide spatial reference data | Spatial reference | `/src/formations-dt/*.conf` |

---

## Possessive Actions - Tackle His Ball

| Method name | Description | Shape | Source file |
| --- | --- | --- | --- |
| `compareInterceptSteps` | Reads self, teammate, and opponent intercept steps | World fact, evaluator | `/src/player/strategy.cpp` |
| `runOutfieldPriority` | Attempts tackle, intercept, block, offside trap, unmark, then home position | Priority chain | `/src/player/bhv_basic_move.cpp` |
| `tryTackleFirst` | Attempts basic tackle before other movement | Filter / gate, execution behaviour | `/src/player/bhv_basic_move.cpp` |
| `tryIntercept` | Uses intercept race to decide whether to intercept | Filter / gate, execution behaviour | `/src/player/bhv_basic_move.cpp` |
| `applyPressingMargin` | Uses role-aware margins for pressing/intercept decisions | Evaluator | `/src/player/bhv_basic_move.cpp` |
| `selectFirstBlocker` | Finds the first teammate able to intercept/block the route | Evaluator, filter / gate | `/src/player/bhv_basic_block.cpp` |
| `faceBallWhileBlocking` | Turns or scans while blocking | Execution behaviour | `/src/player/bhv_basic_block.cpp` |
| `checkTackleInsideBlock` | Attempts tackle if the block situation allows it | Filter / gate, execution behaviour | `/src/player/bhv_basic_block.cpp` |
| `tryKeeperTackle` | Attempts keeper tackle | Execution behaviour, filter / gate | `/src/player/bhv_goalie_basic_move.cpp` |
| `checkKeeperBeatsOpponent` | Requires keeper arrival before opponent | Evaluator, filter / gate | `/src/player/bhv_goalie_chase_ball.cpp` |
| `calculateCatchPoint` | Computes active interception catch point | World fact | `/src/player/bhv_goalie_chase_ball.cpp` |
| `rejectOpponentFirst` | Rejects chase if opponent arrives faster | Filter / gate | `/src/player/bhv_goalie_chase_ball.cpp` |
| `executeKeeperChase` | Chases/intercepts ball | Execution behaviour | `/src/player/bhv_goalie_chase_ball.cpp` |
| `predictSelfReachCycle` | Predicts self reach cycle with stamina model | World fact, evaluator | `/src/player/planner/field_analyzer.cpp` |
| `predictPlayerReachCycle` | Predicts generic player reach cycle | World fact, evaluator | `/src/player/planner/field_analyzer.cpp` |
| `estimateMinReachCycle` | Estimates minimum cycle to reach ball trajectory | World fact, evaluator | `/src/player/planner/field_analyzer.cpp` |

---

## Possessive Actions - Protect My Ball

| Method name | Description | Shape | Source file |
| --- | --- | --- | --- |
| `calculateDashPower` | Adjusts dash power by role, field zone, and stamina | Evaluator, stabilizer | `/src/player/strategy.cpp` |
| `setMoveDashPower` | Chooses dash power for the movement action | Evaluator, stabilizer | `/src/player/bhv_basic_move.cpp` |
| `rewardOpponentSeparation` | Rewards distance from nearest opponent | Evaluator | `/src/player/bhv_unmark.cpp` |
| `penalizeTurnCost` | Penalizes receiving points that cost too much turning | Evaluator | `/src/player/bhv_unmark.cpp` |
| `gateByStaminaRoleZone` | Prevents unmarking when stamina, role, or zone says no | Filter / gate, stabilizer | `/src/player/bhv_unmark.cpp` |
| `filterDangerousBackpass` | Rejects dangerous backpass areas | Filter / gate | `/src/player/planner/strict_check_pass_generator.cpp` |
| `filterTacklingReceiver` | Rejects receivers in tackling danger | Filter / gate | `/src/player/planner/strict_check_pass_generator.cpp` |
| `predictReceiverArrival` | Estimates when receiver reaches the pass | World fact, evaluator | `/src/player/planner/strict_check_pass_generator.cpp` |
| `predictOpponentReach` | Estimates when opponents can reach/intercept | World fact, evaluator | `/src/player/planner/strict_check_pass_generator.cpp` |
| `checkPassSafety` | Checks whether pass survives opponent reach | Evaluator, filter / gate | `/src/player/planner/strict_check_pass_generator.cpp` |
| `searchKickSpeed` | Searches kick speed / one-step feasibility | Candidate generator, filter / gate | `/src/player/planner/shoot_generator.cpp` |
| `sampleDribbleDirections` | Samples 16 dribble directions | Candidate generator | `/src/player/planner/short_dribble_generator.cpp` |
| `filterByFieldZone` | Filters dribble direction by field zone | Filter / gate | `/src/player/planner/short_dribble_generator.cpp` |
| `restrictOwnHalfAngle` | In own half, only allows mostly forward directions | Filter / gate | `/src/player/planner/short_dribble_generator.cpp` |
| `restrictDeepOwnHalfAngle` | Deep own half uses stricter forward angle | Filter / gate | `/src/player/planner/short_dribble_generator.cpp` |
| `simulateCarryPath` | Simulates player path for a dribble direction | World fact, evaluator | `/src/player/planner/short_dribble_generator.cpp` |
| `checkOpponentReachSafety` | Checks whether opponents can stop the carry | Evaluator, filter / gate | `/src/player/planner/short_dribble_generator.cpp` |
| `applyUncertaintyBuffer` | Adds safety margin for opponent uncertainty | Evaluator | `/src/player/planner/short_dribble_generator.cpp` |
| `adjustForTacklingState` | Accounts for opponent tackling state | Evaluator | `/src/player/planner/short_dribble_generator.cpp` |
| `checkCrossOpponentReach` | Checks opponent reach along cross path | Evaluator, filter / gate | `/src/player/planner/cross_generator.cpp` |
| `weightByOpponentPressure` | Weights ball value by opponent pressure | Evaluator | `/src/player/sample_field_evaluator.cpp` |
| `predictTurnCycle` | Predicts cycles needed to turn | World fact, evaluator | `/src/player/planner/field_analyzer.cpp` |
| `predictSelfReachCycle` | Predicts self reach cycle with stamina model | World fact, evaluator | `/src/player/planner/field_analyzer.cpp` |

---

## Circulation Actions - Pass

| Method name | Description | Shape | Source file |
| --- | --- | --- | --- |
| `updatePasserState` | Builds current passer facts | World fact | `/src/player/planner/strict_check_pass_generator.cpp` |
| `generateDirectPass` | Generates pass to receiver inertia/current position | Candidate generator | `/src/player/planner/strict_check_pass_generator.cpp` |
| `generateLeadingPass` | Generates pass into space around receiver | Candidate generator | `/src/player/planner/strict_check_pass_generator.cpp` |
| `generateThroughPass` | Generates pass behind defense into space | Candidate generator | `/src/player/planner/strict_check_pass_generator.cpp` |
| `filterOffside` | Rejects offside pass targets | Filter / gate | `/src/player/planner/strict_check_pass_generator.cpp` |
| `filterOutOfBounds` | Rejects targets outside the field | Filter / gate | `/src/player/planner/strict_check_pass_generator.cpp` |
| `filterReceiverTooFar` | Rejects receivers beyond range | Filter / gate | `/src/player/planner/strict_check_pass_generator.cpp` |
| `simulateBallTrajectory` | Simulates ball path for pass safety | World fact | `/src/player/planner/strict_check_pass_generator.cpp` |
| `checkPassSafety` | Checks whether pass survives opponent reach | Evaluator, filter / gate | `/src/player/planner/strict_check_pass_generator.cpp` |
| `dedupeSamePointCandidates` | Controls duplicate pass candidates on the same point | Stabilizer | `/src/player/planner/strict_check_pass_generator.cpp` |
| `gateCrossByGoalDistance` | Only generates crosses near opponent goal | Filter / gate | `/src/player/planner/cross_generator.cpp` |
| `simulateCrossTrajectory` | Simulates ball path cycle by cycle | World fact, evaluator | `/src/player/planner/cross_generator.cpp` |
| `selectMaxAngleWidth` | Selects cross with best angular separation | Evaluator | `/src/player/planner/cross_generator.cpp` |
| `detectOffsideLineGap` | Finds useful gaps near offside line | Evaluator, spatial reference | `/src/player/sample_field_evaluator.cpp` |
| `countPassOptions` | Counts pass options from a state | Evaluator | `/src/player/planner/field_analyzer.cpp` |
| `getBallFieldLineCrossPoint` | Finds line/field crossing for ball path | Spatial reference | `/src/player/planner/field_analyzer.cpp` |
| `gateOverOffsideLineFinalAction` | Treats over-offside-line action as final | Filter / gate | `/src/player/planner/field_analyzer.cpp` |

---

## Circulation Actions - Receive

| Method name | Description | Shape | Source file |
| --- | --- | --- | --- |
| `setupReceiveIntention` | Prepares intention to receive at the target | Stabilizer, execution support | `/src/player/bhv_unmark.cpp` |
| `updateReceiverState` | Builds receiver facts | World fact | `/src/player/planner/strict_check_pass_generator.cpp` |
| `generateDirectPass` | Generates pass to receiver inertia/current position | Candidate generator | `/src/player/planner/strict_check_pass_generator.cpp` |
| `generateLeadingPass` | Generates pass into space around receiver | Candidate generator | `/src/player/planner/strict_check_pass_generator.cpp` |
| `filterTacklingReceiver` | Rejects receivers in tackling danger | Filter / gate | `/src/player/planner/strict_check_pass_generator.cpp` |
| `predictReceiverArrival` | Estimates when receiver reaches the pass | World fact, evaluator | `/src/player/planner/strict_check_pass_generator.cpp` |
| `sampleCrossReceivePoints` | Samples receive points for cross targets | Candidate generator | `/src/player/planner/cross_generator.cpp` |
| `measureNearestDefenderSeparation` | Measures separation from nearest defender | Evaluator | `/src/player/planner/cross_generator.cpp` |
| `predictPlayerReachCycle` | Predicts generic player reach cycle | World fact, evaluator | `/src/player/planner/field_analyzer.cpp` |

---

## Circulation Preparation Actions - Move To Intercept Enemy Pass

| Method name | Description | Shape | Source file |
| --- | --- | --- | --- |
| `updateOpponentState` | Builds opponent reach facts | World fact | `/src/player/planner/strict_check_pass_generator.cpp` |
| `predictOpponentReach` | Estimates when opponents can reach/intercept | World fact, evaluator | `/src/player/planner/strict_check_pass_generator.cpp` |
| `checkCrossOpponentReach` | Checks opponent reach along cross path | Evaluator, filter / gate | `/src/player/planner/cross_generator.cpp` |
| `prepareForDeepCross` | Prepares keeper for deep cross danger | Priority-chain branch | `/src/player/bhv_goalie_basic_move.cpp` |
| `estimateMinReachCycle` | Estimates minimum cycle to reach ball trajectory | World fact, evaluator | `/src/player/planner/field_analyzer.cpp` |

---

## Circulation Preparation Actions - Move To Evade Interception

| Method name | Description | Shape | Source file |
| --- | --- | --- | --- |
| `lookupHomePosition` | Gets interpolated home position from formation data | Spatial reference | `/src/player/strategy.cpp` |
| `runOutfieldPriority` | Attempts tackle, intercept, block, offside trap, unmark, then home position | Priority chain | `/src/player/bhv_basic_move.cpp` |
| `tryUnmark` | Runs unmark behaviour when movement can create receiving value | Priority-chain branch | `/src/player/bhv_basic_move.cpp` |
| `goHome` | Falls back to formation home position | Spatial reference, execution behaviour | `/src/player/bhv_basic_move.cpp` |
| `scanWhileMoving` | Uses neck/scan behaviours while moving | Execution behaviour | `/src/player/bhv_basic_move.cpp` |
| `predictPassChainWithDnn` | Uses DNN-assisted pass-chain prediction | World fact, evaluator | `/src/player/bhv_unmark.cpp` |
| `sampleLocalReceivePositions` | Samples candidate positions around the player | Candidate generator | `/src/player/bhv_unmark.cpp` |
| `sampleDistanceRings` | Samples roughly 2-7 unit distances | Candidate generator | `/src/player/bhv_unmark.cpp` |
| `sampleAngles` | Samples angles around the player | Candidate generator | `/src/player/bhv_unmark.cpp` |
| `scorePassQuality` | Scores whether a sampled point is passable | Evaluator | `/src/player/bhv_unmark.cpp` |
| `rewardOpponentSeparation` | Rewards distance from nearest opponent | Evaluator | `/src/player/bhv_unmark.cpp` |
| `penalizeTurnCost` | Penalizes receiving points that cost too much turning | Evaluator | `/src/player/bhv_unmark.cpp` |
| `gateByStaminaRoleZone` | Prevents unmarking when stamina, role, or zone says no | Filter / gate, stabilizer | `/src/player/bhv_unmark.cpp` |
| `cacheUnmarkTarget` | Keeps selected unmark point for several cycles | Stabilizer | `/src/player/bhv_unmark.cpp` |
| `setupReceiveIntention` | Prepares intention to receive at the target | Stabilizer, execution support | `/src/player/bhv_unmark.cpp` |
| `sampleLeadingGrid` | Samples lead-pass angles and distances | Candidate generator | `/src/player/planner/strict_check_pass_generator.cpp` |
| `sampleCrossAnglesDistances` | Samples multiple receive distances and angles | Candidate generator | `/src/player/planner/cross_generator.cpp` |
| `findVoronoiOpenSpace` | Finds best open-space point using Voronoi reasoning | Evaluator, spatial reference | `/src/player/sample_field_evaluator.cpp` |
| `checkPlayerSectors` | Checks teammates/opponents in sectors | World fact, evaluator | `/src/player/sample_field_evaluator.cpp` |
| `updatePassVoronoi` | Updates Voronoi diagram for pass/open-space reasoning | World fact, spatial reference | `/src/player/planner/field_analyzer.cpp` |

---

## Notes

- Rows are duplicated across vials when README 5 classifies a method into multiple vials.
- Source paths are relative to the Cyrus2DBase `src` tree, matching README 3/README 2 notation.
- This inverse view should stay mechanically aligned with README 5. If a method's vial changes there, update its placement here.
