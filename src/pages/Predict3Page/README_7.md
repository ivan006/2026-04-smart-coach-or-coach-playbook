REAS
The following categorization organizes the decision logic extracted from the sources, specifically mapping the methods described in the code notes to their designated shapes and genetic vials.

## strategy.cpp

| Method Name                | Description                                                                  | Shape                 | Vial(s)                                                                                                             |
| :------------------------- | :--------------------------------------------------------------------------- | :-------------------- | :------------------------------------------------------------------------------------------------------------------ |
| **loadFormations**         | Loads normal, offense, defense, setplay, and goalie-state formation configs. | Spatial reference     | World facts; combative preparation actions - move to defend goals.                                                  |
| **assignRoles**            | Creates role objects and assigns role numbers/types.                         | Spatial reference     | World facts.                                                                                                        |
| **detectGoalie**           | Detects and validates the goalie uniform number.                             | World fact            | World facts; combative actions - defend goals from shot.                                                            |
| **compareInterceptSteps**  | Reads self, teammate, and opponent intercept steps.                          | World fact, evaluator | World facts; possessive actions - tackle his ball.                                                                  |
| **selectSituation**        | Chooses normal/offense/defense situation from intercept comparison.          | Priority chain        | Progressive actions - advance team to goals; progressive actions - obstruct enemy advance.                          |
| **selectCurrentFormation** | Picks formation by situation and game mode.                                  | Spatial reference     | Combative preparation actions - move to attack goals; combative preparation actions - move to defend goals.         |
| **projectBallStep**        | Projects ball step before home-position lookup.                              | World fact            | World facts; progressive actions - advance team to goals.                                                           |
| **lookupHomePosition**     | Gets interpolated home position from formation data.                         | Spatial reference     | Combative preparation actions - move to defend goals; circulation preparation actions - move to evade interception. |
| **assignPositionType**     | Tracks role side/position type.                                              | Spatial reference     | World facts.                                                                                                        |
| **calculateDashPower**     | Adjusts dash power by role, field zone, and stamina.                         | Evaluator, stabilizer | Possessive actions - protect my ball; combative preparation actions - move to defend goals.                         |
| **compressOrExpandShape**  | Formation data compresses in own half and expands in opponent half.          | Spatial reference     | Progressive actions - advance team to goals; progressive actions - obstruct enemy advance.                          |

## bhv_basic_move.cpp

| Method Name             | Description                                                                  | Shape                                    | Vial(s)                                                                                                                                           |
| :---------------------- | :--------------------------------------------------------------------------- | :--------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------ |
| **runOutfieldPriority** | Attempts tackle, intercept, block, offside trap, unmark, then home position. | Priority chain                           | Possessive actions - tackle his ball; progressive actions - obstruct enemy advance; circulation preparation actions - move to evade interception. |
| **tryTackleFirst**      | Attempts basic tackle before other movement.                                 | Filter / gate, execution behaviour       | Possessive actions - tackle his ball.                                                                                                             |
| **tryIntercept**        | Uses intercept race to decide whether to intercept.                          | Filter / gate, execution behaviour       | Possessive actions - tackle his ball; progressive actions - obstruct enemy advance.                                                               |
| **applyPressingMargin** | Uses role-aware margins for pressing/intercept decisions.                    | Evaluator                                | Possessive actions - tackle his ball; progressive actions - obstruct enemy advance.                                                               |
| **tryBlock**            | Delegates to defensive block behaviour.                                      | Priority-chain branch                    | Progressive actions - obstruct enemy advance; combative preparation actions - move to defend goals.                                               |
| **tryOffsideTrap**      | Steps line forward in specific defensive contexts.                           | Priority-chain branch, spatial reference | Progressive actions - obstruct enemy advance; combative preparation actions - move to defend goals.                                               |
| **tryUnmark**           | Runs unmark behaviour when movement can create receiving value.              | Priority-chain branch                    | Circulation preparation actions - move to evade interception.                                                                                     |
| **goHome**              | Falls back to formation home position.                                       | Spatial reference, execution behaviour   | Combative preparation actions - move to defend goals; circulation preparation actions - move to evade interception.                               |
| **setMoveDashPower**    | Chooses dash power for the movement action.                                  | Evaluator, stabilizer                    | Possessive actions - protect my ball; combative preparation actions - move to defend goals.                                                       |
| **scanWhileMoving**     | Uses neck/scan behaviours while moving.                                      | Execution behaviour                      | World facts; circulation preparation actions - move to evade interception.                                                                        |

## bhv_basic_block.cpp

| Method Name                         | Description                                                 | Shape                              | Vial(s)                                                                                             |
| :---------------------------------- | :---------------------------------------------------------- | :--------------------------------- | :-------------------------------------------------------------------------------------------------- |
| **predictOpponentDribblePath**      | Simulates opponent dribble path about 40 cycles ahead.      | World fact, candidate generator    | World facts; progressive actions - obstruct enemy advance.                                          |
| **sampleOpponentDribbleDirections** | Generates possible opponent dribble routes.                 | Candidate generator                | Progressive actions - obstruct enemy advance.                                                       |
| **scoreDribbleDanger**              | Scores routes by forward danger and proximity to own goal.  | Evaluator                          | Progressive actions - obstruct enemy advance; combative preparation actions - move to defend goals. |
| **selectFirstBlocker**              | Finds the first teammate able to intercept/block the route. | Evaluator, filter / gate           | Possessive actions - tackle his ball; progressive actions - obstruct enemy advance.                 |
| **moveToBlockPoint**                | Moves to the selected blocking point.                       | Execution behaviour                | Progressive actions - obstruct enemy advance; combative preparation actions - move to defend goals. |
| **faceBallWhileBlocking**           | Turns or scans while blocking.                              | Execution behaviour                | World facts; possessive actions - tackle his ball.                                                  |
| **checkTackleInsideBlock**          | Attempts tackle if the block situation allows it.           | Filter / gate, execution behaviour | Possessive actions - tackle his ball.                                                               |

## bhv_unmark.cpp

| Method Name                     | Description                                             | Shape                         | Vial(s)                                                                                             |
| :------------------------------ | :------------------------------------------------------ | :---------------------------- | :-------------------------------------------------------------------------------------------------- |
| **predictPassChainWithDnn**     | Uses DNN-assisted pass-chain prediction.                | World fact, evaluator         | World facts; circulation preparation actions - move to evade interception.                          |
| **sampleLocalReceivePositions** | Samples candidate positions around the player.          | Candidate generator           | Circulation preparation actions - move to evade interception.                                       |
| **sampleDistanceRings**         | Samples roughly 2-7 unit distances.                     | Candidate generator           | Circulation preparation actions - move to evade interception.                                       |
| **sampleAngles**                | Samples angles around the player.                       | Candidate generator           | Circulation preparation actions - move to evade interception.                                       |
| **scorePassQuality**            | Scores whether a sampled point is passable.             | Evaluator                     | Circulation preparation actions - move to evade interception; circulation actions - receive.        |
| **rewardOpponentSeparation**    | Rewards distance from nearest opponent.                 | Evaluator                     | Circulation preparation actions - move to evade interception; possessive actions - protect my ball. |
| **penalizeTurnCost**            | Penalizes receiving points that cost too much turning.  | Evaluator                     | Circulation preparation actions - move to evade interception; possessive actions - protect my ball. |
| **rewardForwardDirection**      | Rewards forward value in the receiving point.           | Evaluator                     | Progressive actions - advance team to goals; combative preparation actions - move to attack goals.  |
| **gateByStaminaRoleZone**       | Prevents unmarking when stamina, role, or zone says no. | Filter / gate, stabilizer     | Possessive actions - protect my ball; circulation preparation actions - move to evade interception. |
| **cacheUnmarkTarget**           | Keeps selected unmark point for several cycles.         | Stabilizer                    | Circulation preparation actions - move to evade interception.                                       |
| **setupReceiveIntention**       | Prepares intention to receive at the target.            | Stabilizer, execution support | Circulation actions - receive; circulation preparation actions - move to evade interception.        |

## strict_check_pass_generator.cpp

| Method Name                   | Description                                           | Shape                    | Vial(s)                                                                                                                        |
| :---------------------------- | :---------------------------------------------------- | :----------------------- | :----------------------------------------------------------------------------------------------------------------------------- |
| **updatePasserState**         | Builds current passer facts.                          | World fact               | World facts; circulation actions - pass.                                                                                       |
| **updateReceiverState**       | Builds receiver facts.                                | World fact               | World facts; circulation actions - receive.                                                                                    |
| **updateOpponentState**       | Builds opponent reach facts.                          | World fact               | World facts; circulation preparation actions - move to intercept enemy pass.                                                   |
| **generateDirectPass**        | Generates pass to receiver inertia/current position.  | Candidate generator      | Circulation actions - pass; circulation actions - receive.                                                                     |
| **generateLeadingPass**       | Generates pass into space around receiver.            | Candidate generator      | Circulation actions - pass; circulation actions - receive; progressive actions - advance team to goals.                        |
| **sampleLeadingGrid**         | Samples lead-pass angles and distances.               | Candidate generator      | Circulation preparation actions - move to evade interception.                                                                  |
| **generateThroughPass**       | Generates pass behind defense into space.             | Candidate generator      | Circulation actions - pass; progressive actions - advance team to goals; combative preparation actions - move to attack goals. |
| **filterOffside**             | Rejects offside pass targets.                         | Filter / gate            | Circulation actions - pass.                                                                                                    |
| **filterOutOfBounds**         | Rejects targets outside the field.                    | Filter / gate            | Circulation actions - pass.                                                                                                    |
| **filterDangerousBackpass**   | Rejects dangerous backpass areas.                     | Filter / gate            | Possessive actions - protect my ball; combative actions - defend goals from shot.                                              |
| **filterTacklingReceiver**    | Rejects receivers in tackling danger.                 | Filter / gate            | Possessive actions - protect my ball; circulation actions - receive.                                                           |
| **filterReceiverTooFar**      | Rejects receivers beyond range.                       | Filter / gate            | Circulation actions - pass.                                                                                                    |
| **predictReceiverArrival**    | Estimates when receiver reaches the pass.             | World fact, evaluator    | Circulation actions - receive; possessive actions - protect my ball.                                                           |
| **predictOpponentReach**      | Estimates when opponents can reach/intercept.         | World fact, evaluator    | Circulation preparation actions - move to intercept enemy pass; possessive actions - protect my ball.                          |
| **simulateBallTrajectory**    | Simulates ball path for pass safety.                  | World fact               | Circulation actions - pass.                                                                                                    |
| **checkPassSafety**           | Checks whether pass survives opponent reach.          | Evaluator, filter / gate | Circulation actions - pass; possessive actions - protect my ball.                                                              |
| **dedupeSamePointCandidates** | Controls duplicate pass candidates on the same point. | Stabilizer               | Circulation actions - pass.                                                                                                    |
| **sortByGoalProximity**       | Sorts candidates by closeness to opponent goal.       | Evaluator                | Progressive actions - advance team to goals; combative preparation actions - move to attack goals.                             |

## shoot_generator.cpp

| Method Name                  | Description                                  | Shape                              | Vial(s)                                                                           |
| :--------------------------- | :------------------------------------------- | :--------------------------------- | :-------------------------------------------------------------------------------- |
| **gateShootByRange**         | Activates shooting only near enough to goal. | Filter / gate                      | Combative actions - attack goals with shot.                                       |
| **sampleGoalTargets**        | Samples target points across goal mouth.     | Candidate generator                | Combative actions - attack goals with shot.                                       |
| **searchTwentyFiveTargets**  | Uses dense target search across goal width.  | Candidate generator                | Combative actions - attack goals with shot.                                       |
| **searchKickSpeed**          | Searches kick speed / one-step feasibility.  | Candidate generator, filter / gate | Combative actions - attack goals with shot; possessive actions - protect my ball. |
| **scoreOneKickBonus**        | Rewards one-kick shot feasibility.           | Evaluator                          | Combative actions - attack goals with shot.                                       |
| **scoreGoalieUnreachable**   | Rewards shots the goalie cannot reach.       | Evaluator                          | Combative actions - attack goals with shot.                                       |
| **scoreOpponentUnreachable** | Rewards shots opponents cannot block.        | Evaluator                          | Combative actions - attack goals with shot.                                       |
| **scoreGoalieAngleRate**     | Scores shot target by goalie angle relation. | Evaluator                          | Combative actions - attack goals with shot.                                       |
| **scoreGoalYRate**           | Scores target centrality / y-rate.           | Evaluator                          | Combative actions - attack goals with shot.                                       |
| **rejectBlockedCourse**      | Rejects blocked shot courses.                | Filter / gate                      | Combative actions - attack goals with shot.                                       |

## short_dribble_generator.cpp

| Method Name                    | Description                                         | Shape                    | Vial(s)                                                                                            |
| :----------------------------- | :-------------------------------------------------- | :----------------------- | :------------------------------------------------------------------------------------------------- |
| **sampleDribbleDirections**    | Samples 16 dribble directions.                      | Candidate generator      | Possessive actions - protect my ball; progressive actions - advance team to goals.                 |
| **filterByFieldZone**          | Filters dribble direction by field zone.            | Filter / gate            | Possessive actions - protect my ball; progressive actions - advance team to goals.                 |
| **restrictOwnHalfAngle**       | In own half, only allows mostly forward directions. | Filter / gate            | Possessive actions - protect my ball.                                                              |
| **restrictDeepOwnHalfAngle**   | Deep own half uses stricter forward angle.          | Filter / gate            | Possessive actions - protect my ball; combative actions - defend goals from shot.                  |
| **simulateCarryPath**          | Simulates player path for a dribble direction.      | World fact, evaluator    | Possessive actions - protect my ball.                                                              |
| **checkOpponentReachSafety**   | Checks whether opponents can stop the carry.        | Evaluator, filter / gate | Possessive actions - protect my ball.                                                              |
| **applyUncertaintyBuffer**     | Adds safety margin for opponent uncertainty.        | Evaluator                | Possessive actions - protect my ball.                                                              |
| **adjustForTacklingState**     | Accounts for opponent tackling state.               | Evaluator                | Possessive actions - protect my ball.                                                              |
| **sortDribbleByGoalProximity** | Sorts dribbles by proximity to opponent goal.       | Evaluator                | Progressive actions - advance team to goals; combative preparation actions - move to attack goals. |

## cross_generator.cpp

| Method Name                          | Description                                    | Shape                    | Vial(s)                                                                                               |
| :----------------------------------- | :--------------------------------------------- | :----------------------- | :---------------------------------------------------------------------------------------------------- |
| **gateCrossByGoalDistance**          | Only generates crosses near opponent goal.     | Filter / gate            | Combative preparation actions - move to attack goals; circulation actions - pass.                     |
| **sampleCrossReceivePoints**         | Samples receive points for cross targets.      | Candidate generator      | Circulation actions - receive; combative preparation actions - move to attack goals.                  |
| **sampleCrossAnglesDistances**       | Samples multiple receive distances and angles. | Candidate generator      | Circulation preparation actions - move to evade interception.                                         |
| **simulateCrossTrajectory**          | Simulates ball path cycle by cycle.            | World fact, evaluator    | Circulation actions - pass.                                                                           |
| **checkCrossOpponentReach**          | Checks opponent reach along cross path.        | Evaluator, filter / gate | Circulation preparation actions - move to intercept enemy pass; possessive actions - protect my ball. |
| **selectMaxAngleWidth**              | Selects cross with best angular separation.    | Evaluator                | Combative actions - attack goals with shot; circulation actions - pass.                               |
| **measureNearestDefenderSeparation** | Measures separation from nearest defender.     | Evaluator                | Circulation actions - receive; combative preparation actions - move to attack goals.                  |

## bhv_goalie_basic_move.cpp

| Method Name                 | Description                                                   | Shape                                  | Vial(s)                                                                                                                                 |
| :-------------------------- | :------------------------------------------------------------ | :------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------- |
| **setKeeperLinePosition**   | Positions keeper on line between ball and point behind goal.  | Spatial reference                      | Combative preparation actions - move to defend goals.                                                                                   |
| **clampKeeperToDefendLine** | Clamps keeper position to goal/defend line.                   | Spatial reference, filter / gate       | Combative preparation actions - move to defend goals.                                                                                   |
| **runKeeperPriority**       | Attempts tackle, deep cross prep, stop, emergency dash, etc.. | Priority chain                         | Combative actions - defend goals from shot; possessive actions - tackle his ball; combative preparation actions - move to defend goals. |
| **tryKeeperTackle**         | Attempts keeper tackle.                                       | Execution behaviour, filter / gate     | Possessive actions - tackle his ball; combative actions - defend goals from shot.                                                       |
| **prepareForDeepCross**     | Prepares keeper for deep cross danger.                        | Priority-chain branch                  | Combative preparation actions - move to defend goals; circulation preparation actions - move to intercept enemy pass.                   |
| **stopDash**                | Stops current dash motion.                                    | Execution behaviour, stabilizer        | Combative preparation actions - move to defend goals.                                                                                   |
| **emergencyDash**           | Uses emergency dash toward danger.                            | Execution behaviour                    | Combative actions - defend goals from shot.                                                                                             |
| **correctKeeperX**          | Corrects keeper X position.                                   | Execution behaviour, spatial reference | Combative preparation actions - move to defend goals.                                                                                   |
| **correctKeeperBodyAngle**  | Corrects keeper body angle.                                   | Execution behaviour                    | Combative preparation actions - move to defend goals.                                                                                   |
| **correctKeeperY**          | Corrects keeper Y position.                                   | Execution behaviour, spatial reference | Combative preparation actions - move to defend goals.                                                                                   |

## bhv_goalie_chase_ball.cpp

| Method Name                  | Description                                             | Shape                                  | Vial(s)                                                                           |
| :--------------------------- | :------------------------------------------------------ | :------------------------------------- | :-------------------------------------------------------------------------------- |
| **checkPenaltyTrajectory**   | Checks if ball trajectory enters penalty area.          | World fact, filter / gate              | Combative actions - defend goals from shot.                                       |
| **checkKeeperBeatsOpponent** | Requires keeper arrival before opponent.                | Evaluator, filter / gate               | Possessive actions - tackle his ball; combative actions - defend goals from shot. |
| **checkShotMovingToGoal**    | Detects confirmed shot moving toward goal.              | World fact, filter / gate              | Combative actions - defend goals from shot.                                       |
| **calculateCatchPoint**      | Computes active interception catch point.               | World fact                             | Possessive actions - tackle his ball; combative actions - defend goals from shot. |
| **rejectOutsidePenalty**     | Rejects chase outside penalty area.                     | Filter / gate                          | Combative actions - defend goals from shot.                                       |
| **rejectOpponentFirst**      | Rejects chase if opponent arrives faster.               | Filter / gate                          | Possessive actions - tackle his ball.                                             |
| **intersectDefendLine**      | Finds ball-line intersection with vertical defend line. | Spatial reference                      | Combative preparation actions - move to defend goals.                             |
| **slideStepToLine**          | Uses slide-step positioning from intersection.          | Execution behaviour, spatial reference | Combative preparation actions - move to defend goals.                             |
| **executeKeeperChase**       | Chases/intercepts ball.                                 | Execution behaviour                    | Possessive actions - tackle his ball; combative actions - defend goals from shot. |

## sample_field_evaluator.cpp

| Method Name                       | Description                                          | Shape                        | Vial(s)                                                                                                    |
| :-------------------------------- | :--------------------------------------------------- | :--------------------------- | :--------------------------------------------------------------------------------------------------------- |
| **scoreWholeState**               | Scores a predicted game state.                       | Evaluator                    | World facts; progressive actions - advance team to goals.                                                  |
| **scoreBallX**                    | Scores ball x-position.                              | Evaluator                    | Progressive actions - advance team to goals.                                                               |
| **weightByOpponentPressure**      | Weights ball value by opponent pressure.             | Evaluator                    | Possessive actions - protect my ball; progressive actions - advance team to goals.                         |
| **findVoronoiOpenSpace**          | Finds best open-space point using Voronoi reasoning. | Evaluator, spatial reference | Circulation preparation actions - move to evade interception; progressive actions - advance team to goals. |
| **detectOffsideLineGap**          | Finds useful gaps near offside line.                 | Evaluator, spatial reference | Circulation actions - pass; progressive actions - advance team to goals.                                   |
| **bonusFreeOffsideLineSituation** | Adds bonus for free situation near offside line.     | Evaluator                    | Progressive actions - advance team to goals; combative preparation actions - move to attack goals.         |
| **bonusShootOpportunity**         | Adds large bonus for shoot opportunity.              | Evaluator                    | Combative actions - attack goals with shot.                                                                |
| **checkPlayerSectors**            | Checks teammates/opponents in sectors.               | World fact, evaluator        | World facts; circulation preparation actions - move to evade interception.                                 |

## field_analyzer.cpp

| Method Name                        | Description                                           | Shape                          | Vial(s)                                                                                               |
| :--------------------------------- | :---------------------------------------------------- | :----------------------------- | :---------------------------------------------------------------------------------------------------- |
| **predictTurnCycle**               | Predicts cycles needed to turn.                       | World fact, evaluator          | World facts; possessive actions - protect my ball.                                                    |
| **predictSelfReachCycle**          | Predicts self reach cycle with stamina model.         | World fact, evaluator          | Possessive actions - tackle his ball; possessive actions - protect my ball.                           |
| **predictPlayerReachCycle**        | Predicts generic player reach cycle.                  | World fact, evaluator          | Possessive actions - tackle his ball; circulation actions - receive.                                  |
| **estimateMinReachCycle**          | Estimates minimum cycle to reach ball trajectory.     | World fact, evaluator          | Possessive actions - tackle his ball; circulation preparation actions - move to intercept enemy pass. |
| **getBallFieldLineCrossPoint**     | Finds line/field crossing for ball path.              | Spatial reference              | World facts; circulation actions - pass.                                                              |
| **canShootFrom**                   | Determines if a position can shoot.                   | Evaluator, filter / gate       | Combative actions - attack goals with shot.                                                           |
| **sampleGoalAngles**               | Samples angles across goal width.                     | Candidate generator, evaluator | Combative actions - attack goals with shot.                                                           |
| **modelOpponentHideAngle**         | Models opponent blocking/hide angle.                  | World fact, evaluator          | Combative actions - attack goals with shot.                                                           |
| **thresholdMaxShotGap**            | Requires enough open shooting angle.                  | Evaluator, filter / gate       | Combative actions - attack goals with shot.                                                           |
| **opponentCanShootFrom**           | Determines if opponent can shoot from a point.        | Evaluator, filter / gate       | Combative actions - defend goals from shot; combative preparation actions - move to defend goals.     |
| **modelTeammateBlockAngle**        | Models teammate blocking angle against opponent shot. | Evaluator                      | Combative preparation actions - move to defend goals.                                                 |
| **countPassOptions**               | Counts pass options from a state.                     | Evaluator                      | Circulation actions - pass.                                                                           |
| **checkBallMovingToGoal**          | Checks if ball is moving toward goal.                 | World fact, filter / gate      | Combative actions - defend goals from shot.                                                           |
| **gateNearGoalNextAction**         | Near goal, searches for next action such as shoot.    | Filter / gate                  | Combative actions - attack goals with shot; progressive actions - advance team to goals.              |
| **gateOverOffsideLineFinalAction** | Treats over-offside-line action as final.             | Filter / gate                  | Progressive actions - advance team to goals; circulation actions - pass.                              |
| **selectBlockerByAttackAngle**     | Selects blocker using attack angle.                   | Evaluator, spatial reference   | Progressive actions - obstruct enemy advance; combative preparation actions - move to defend goals.   |
| **updatePassVoronoi**              | Updates Voronoi diagram for open-space reasoning.     | World fact, spatial reference  | World facts; circulation preparation actions - move to evade interception.                            |
