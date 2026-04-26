# SoccerSim Method Signatures

> Exact C++ method signatures extracted from the 12 critical Cyrus2DBase source files.
> These are the real symbols — no invented names.

---

## Genetic Vials

| #                                         | Vial                                                             |
| ----------------------------------------- | ---------------------------------------------------------------- |
| Scoring prep - attack goals               | Scoring preparation actions - move to attack goals               |
| Scoring prep - defend goals               | Scoring preparation actions - move to defend goals               |
| Scoring - attack goals with shot          | Scoring actions - attack goals with shot                         |
| Scoring - defend goals from shot          | Scoring actions - defend goals from shot                         |
| Possessive - tackle his ball              | Possessive actions - tackle his ball                             |
| Possessive - protect my ball              | Possessive actions - protect my ball                             |
| Circulation prep - intercept enemy pass   | Circulation preparation actions - move to intercept enemy pass   |
| Circulation prep - pass interception free | Circulation preparation actions - move to pass interception free |
| 9                                         | Circulation actions - intercept enemy pass                       |
| 10                                        | Circulation actions - progressive pass                           |
| 11                                        | Circulation actions - receive                                    |

Methods can belong to more than one vial. The vial column uses vial numbers above. Confidence: H=high, M=medium, L=low, —=boilerplate/no vial.

---

## strategy.cpp

| Line | Signature                                                   | Vial(s)                                                  | Confidence |
| ---- | ----------------------------------------------------------- | -------------------------------------------------------- | ---------- |
| 117  | `Strategy::Strategy()`                                      | —                                                        | —          |
| 157  | `Strategy::instance()`                                      | —                                                        | —          |
| 168  | `Strategy::init( CmdLineParser & cmd_parser )`              | —                                                        | —          |
| 200  | `Strategy::read( const std::string & formation_dir )`       | Scoring prep - attack goals; Scoring prep - defend goals | H          |
| 317  | `Strategy::createFormation( const std::string & filepath )` | Scoring prep - attack goals; Scoring prep - defend goals | H          |
| 386  | `Strategy::update( const WorldModel & wm )`                 | Scoring prep - attack goals; Scoring prep - defend goals | H          |
| 405  | `Strategy::exchangeRole( const int unum0, ... )`            | Scoring prep - attack goals; Scoring prep - defend goals | M          |
| 450  | `Strategy::isMarkerType( const int unum ) const`            | Scoring prep - defend goals                              | M          |
| 470  | `Strategy::createRole( const int unum, ... )`               | Scoring prep - attack goals; Scoring prep - defend goals | M          |
| 520  | `Strategy::updateSituation( const WorldModel & wm )`        | Scoring prep - attack goals; Scoring prep - defend goals | H          |
| 577  | `Strategy::updatePosition( const WorldModel & wm )`         | Scoring prep - attack goals; Scoring prep - defend goals | H          |
| 1053 | `Strategy::getPositionType( const int unum ) const`         | Scoring prep - attack goals; Scoring prep - defend goals | M          |
| 1083 | `Strategy::getPosition( const int unum ) const`             | Scoring prep - attack goals; Scoring prep - defend goals | H          |
| 1113 | `Strategy::getFormation( const WorldModel & wm ) const`     | Scoring prep - attack goals; Scoring prep - defend goals | H          |
| 1280 | `Strategy::get_ball_area( const WorldModel & wm )`          | ?                                                        | L          |
| 1295 | `Strategy::get_ball_area( const Vector2D & ball_pos )`      | ?                                                        | L          |
| 1454 | `Strategy::get_normal_dash_power( const WorldModel & wm )`  | Possessive - protect my ball                             | M          |

---

## bhv_basic_move.cpp

| Line | Signature                                       | Vial(s)                                                                                                                                                                            | Confidence |
| ---- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 68   | `Bhv_BasicMove::execute( PlayerAgent * agent )` | Possessive - tackle his ball; Possessive - protect my ball; Circulation prep - intercept enemy pass; Circulation prep - pass interception free; Circulation - intercept enemy pass | H          |

---

## bhv_basic_block.cpp

| Line | Signature                                                                                       | Vial(s)                                                              | Confidence |
| ---- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ---------- |
| 33   | `Bhv_BasicBlock::execute( PlayerAgent * agent )`                                                | Scoring prep - defend goals; Circulation prep - intercept enemy pass | H          |
| 114  | `Bhv_BasicBlock::get_blockers( const PlayerAgent * agent )`                                     | Scoring prep - defend goals; Circulation prep - intercept enemy pass | H          |
| 158  | `Bhv_BasicBlock::get_best_blocker( const PlayerAgent * agent, std::vector<int> & tm_blockers )` | Scoring prep - defend goals; Circulation prep - intercept enemy pass | H          |
| 205  | `Bhv_BasicBlock::dribble_direction_detector( Vector2D dribble_pos )`                            | Scoring prep - defend goals; Circulation prep - intercept enemy pass | H          |

---

## bhv_unmark.cpp

| Line | Signature                                                                                                               | Vial(s)                                                                   | Confidence |
| ---- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ---------- |
| 42   | `Bhv_Unmark::execute( PlayerAgent * agent )`                                                                            | Circulation prep - pass interception free; Circulation - receive          | H          |
| 115  | `Bhv_Unmark::can_unmarking( const WorldModel & wm )`                                                                    | Circulation prep - pass interception free                                 | H          |
| 177  | `Bhv_Unmark::passer_finder( rcsc::PlayerAgent * agent )`                                                                | Circulation prep - pass interception free                                 | H          |
| 185  | `Bhv_Unmark::simulate_dash( rcsc::PlayerAgent * agent, int tm, ... )`                                                   | Circulation prep - pass interception free                                 | H          |
| 275  | `Bhv_Unmark::nearest_tm_dist_to( const WorldModel & wm, Vector2D point )`                                               | Circulation prep - pass interception free                                 | M          |
| 302  | `Bhv_Unmark::lead_pass_simulator( const WorldModel & wm, Vector2D passer_pos, ... )`                                    | Circulation prep - pass interception free; Circulation - progressive pass | H          |
| 348  | `Bhv_Unmark::pass_travel_cycle( Vector2D pass_start, double pass_speed, Vector2D & pass_target )`                       | Circulation - progressive pass; Circulation - receive                     | H          |
| 355  | `Bhv_Unmark::opponents_cycle_intercept( const WorldModel & wm, ... )`                                                   | Circulation prep - intercept enemy pass                                   | H          |
| 373  | `Bhv_Unmark::opponent_cycle_intercept( const AbstractPlayerObject * opp, Vector2D pass_start, double pass_speed, ... )` | Circulation prep - intercept enemy pass                                   | H          |
| 401  | `Bhv_Unmark::evaluate_position( const WorldModel & wm, const UnmarkPosition & unmark_position )`                        | Circulation prep - pass interception free; Circulation - receive          | H          |
| 435  | `Bhv_Unmark::run( PlayerAgent * agent, const UnmarkPosition & unmark_position )`                                        | Circulation prep - pass interception free                                 | H          |
| 469  | `Bhv_Unmark::load_dnn()`                                                                                                | —                                                                         | —          |
| 477  | `Bhv_Unmark::predict_pass_dnn( vector<double> & features, vector<int> ignored_player, int kicker )`                     | Circulation prep - pass interception free                                 | M          |
| 501  | `Bhv_Unmark::find_passer_dnn( const WorldModel & wm, PlayerAgent * agent )`                                             | Circulation prep - pass interception free                                 | M          |

---

## bhv_goalie_basic_move.cpp

| Line | Signature                                                                  | Vial(s)                                                              | Confidence |
| ---- | -------------------------------------------------------------------------- | -------------------------------------------------------------------- | ---------- |
| 57   | `Bhv_GoalieBasicMove::execute( PlayerAgent * agent )`                      | Scoring prep - defend goals; Scoring - defend goals from shot        | H          |
| 141  | `Bhv_GoalieBasicMove::getTargetPoint( PlayerAgent * agent )`               | Scoring prep - defend goals                                          | H          |
| 263  | `Bhv_GoalieBasicMove::getBasicDashPower( PlayerAgent * agent, ... )`       | Scoring prep - defend goals                                          | M          |
| 336  | `Bhv_GoalieBasicMove::doPrepareDeepCross( PlayerAgent * agent, ... )`      | Scoring prep - defend goals; Circulation prep - intercept enemy pass | H          |
| 405  | `Bhv_GoalieBasicMove::doStopAtMovePoint( PlayerAgent * agent, ... )`       | Scoring prep - defend goals                                          | M          |
| 452  | `Bhv_GoalieBasicMove::doMoveForDangerousState( PlayerAgent * agent, ... )` | Scoring - defend goals from shot                                     | H          |
| 517  | `Bhv_GoalieBasicMove::doCorrectX( PlayerAgent * agent, ... )`              | Scoring prep - defend goals                                          | H          |
| 579  | `Bhv_GoalieBasicMove::doCorrectBodyDir( PlayerAgent * agent, ... )`        | Scoring prep - defend goals                                          | H          |
| 651  | `Bhv_GoalieBasicMove::doGoToMovePoint( PlayerAgent * agent, ... )`         | Scoring prep - defend goals                                          | H          |
| 736  | `Bhv_GoalieBasicMove::doGoToPointLookBall( PlayerAgent * agent, ... )`     | Scoring prep - defend goals                                          | H          |

---

## bhv_goalie_chase_ball.cpp

| Line | Signature                                                                   | Vial(s)                                                        | Confidence |
| ---- | --------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------- |
| 56   | `Bhv_GoalieChaseBall::execute( PlayerAgent * agent )`                       | Scoring - defend goals from shot; Possessive - tackle his ball | H          |
| 216  | `Bhv_GoalieChaseBall::doGoToCatchPoint( PlayerAgent * agent, ... )`         | Scoring - defend goals from shot; Possessive - tackle his ball | H          |
| 302  | `Bhv_GoalieChaseBall::is_ball_chase_situation( const PlayerAgent * agent )` | Scoring - defend goals from shot                               | H          |
| 419  | `Bhv_GoalieChaseBall::is_ball_shoot_moving( const PlayerAgent * agent )`    | Scoring - defend goals from shot                               | H          |

---

## sample_field_evaluator.cpp

| Line | Signature                                                             | Vial(s)                                                                                    | Confidence |
| ---- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ---------- |
| 72   | `SampleFieldEvaluator::SampleFieldEvaluator()`                        | —                                                                                          | —          |
| 81   | `SampleFieldEvaluator::~SampleFieldEvaluator()`                       | —                                                                                          | —          |
| 91   | `SampleFieldEvaluator::operator()( const PredictState & state, ... )` | Scoring prep - attack goals; Scoring prep - defend goals; Scoring - attack goals with shot | H          |

---

## planner/strict_check_pass_generator.cpp

| Line | Signature                                                                              | Vial(s)                                                      | Confidence |
| ---- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ---------- |
| 109  | `StrictCheckPassGenerator::Receiver::Receiver( const AbstractPlayerObject * p, ... )`  | —                                                            | —          |
| 127  | `StrictCheckPassGenerator::Opponent::Opponent( const AbstractPlayerObject * p )`       | —                                                            | —          |
| 141  | `StrictCheckPassGenerator::StrictCheckPassGenerator()`                                 | —                                                            | —          |
| 160  | `StrictCheckPassGenerator::instance()`                                                 | —                                                            | —          |
| 171  | `StrictCheckPassGenerator::clear()`                                                    | —                                                            | —          |
| 189  | `StrictCheckPassGenerator::generate( const WorldModel & wm )`                          | Circulation - progressive pass; Circulation - receive        | H          |
| 263  | `StrictCheckPassGenerator::updatePasser( const WorldModel & wm )`                      | 10                                                           | H          |
| 380  | `StrictCheckPassGenerator::updateReceivers( const WorldModel & wm )`                   | 11                                                           | H          |
| 464  | `StrictCheckPassGenerator::updateOpponents( const WorldModel & wm )`                   | Circulation prep - intercept enemy pass                      | H          |
| 489  | `StrictCheckPassGenerator::createCourses( const WorldModel & wm )`                     | Circulation - progressive pass; Circulation - receive        | H          |
| 523  | `StrictCheckPassGenerator::createDirectPass( const WorldModel & wm, ... )`             | Circulation - progressive pass; Circulation - receive        | H          |
| 661  | `StrictCheckPassGenerator::createLeadingPass( const WorldModel & wm, ... )`            | Circulation - progressive pass; Circulation - receive        | H          |
| 879  | `StrictCheckPassGenerator::createThroughPass( const WorldModel & wm, ... )`            | Circulation - progressive pass; Scoring prep - attack goals  | H          |
| 1153 | `StrictCheckPassGenerator::createPassCommon( const WorldModel & wm, ... )`             | Possessive - protect my ball; Circulation - progressive pass | H          |
| 1464 | `StrictCheckPassGenerator::getNearestReceiverUnum( const Vector2D & pos )`             | 11                                                           | M          |
| 1489 | `StrictCheckPassGenerator::predictReceiverReachStep( const Receiver & receiver, ... )` | 11                                                           | H          |
| 1571 | `StrictCheckPassGenerator::predictOpponentsReachStep( const WorldModel & wm, ... )`    | Circulation prep - intercept enemy pass                      | H          |
| 1626 | `StrictCheckPassGenerator::predictOpponentReachStep( const WorldModel & wm, ... )`     | Circulation prep - intercept enemy pass                      | H          |

---

## planner/shoot_generator.cpp

| Line | Signature                                                                | Vial(s)                                                            | Confidence |
| ---- | ------------------------------------------------------------------------ | ------------------------------------------------------------------ | ---------- |
| 65   | `ShootGenerator::ShootGenerator()`                                       | —                                                                  | —          |
| 77   | `ShootGenerator::instance()`                                             | —                                                                  | —          |
| 88   | `ShootGenerator::clear()`                                                | —                                                                  | —          |
| 99   | `ShootGenerator::generate( const WorldModel & wm )`                      | Scoring - attack goals with shot                                   | H          |
| 203  | `ShootGenerator::createShoot( const WorldModel & wm, ... )`              | Scoring - attack goals with shot                                   | H          |
| 335  | `ShootGenerator::createShoot( const WorldModel & wm, ... )`              | Scoring - attack goals with shot                                   | H          |
| 437  | `ShootGenerator::maybeGoalieCatch( const PlayerObject * goalie, ... )`   | Scoring - attack goals with shot; Scoring - defend goals from shot | H          |
| 611  | `ShootGenerator::opponentCanReach( const PlayerObject * opponent, ... )` | Scoring - attack goals with shot                                   | H          |
| 748  | `ShootGenerator::evaluateCourses( const WorldModel & wm )`               | Scoring - attack goals with shot                                   | H          |

---

## planner/short_dribble_generator.cpp

| Line | Signature                                                                      | Vial(s)                                                   | Confidence |
| ---- | ------------------------------------------------------------------------------ | --------------------------------------------------------- | ---------- |
| 86   | `ShortDribbleGenerator::ShortDribbleGenerator()`                               | —                                                         | —          |
| 99   | `ShortDribbleGenerator::instance()`                                            | —                                                         | —          |
| 110  | `ShortDribbleGenerator::clear()`                                               | —                                                         | —          |
| 123  | `ShortDribbleGenerator::generate( const WorldModel & wm )`                     | Possessive - protect my ball; Scoring prep - attack goals | H          |
| 196  | `ShortDribbleGenerator::setQueuedAction( const rcsc::WorldModel & wm, ... )`   | Possessive - protect my ball                              | M          |
| 208  | `ShortDribbleGenerator::createCourses( const WorldModel & wm )`                | Possessive - protect my ball; Scoring prep - attack goals | H          |
| 305  | `ShortDribbleGenerator::simulateDashes( const WorldModel & wm )`               | Possessive - protect my ball                              | H          |
| 520  | `ShortDribbleGenerator::simulateKickTurnsDashes( const WorldModel & wm, ... )` | Possessive - protect my ball                              | H          |
| 653  | `ShortDribbleGenerator::createSelfCache( const WorldModel & wm, ... )`         | Possessive - protect my ball                              | H          |
| 708  | `ShortDribbleGenerator::checkOpponent( const WorldModel & wm, ... )`           | Possessive - protect my ball                              | H          |

---

## planner/cross_generator.cpp

| Line | Signature                                                                 | Vial(s)                                                     | Confidence |
| ---- | ------------------------------------------------------------------------- | ----------------------------------------------------------- | ---------- |
| 80   | `CrossGenerator::CrossGenerator()`                                        | —                                                           | —          |
| 92   | `CrossGenerator::instance()`                                              | —                                                           | —          |
| 103  | `CrossGenerator::clear()`                                                 | —                                                           | —          |
| 118  | `CrossGenerator::generate( const WorldModel & wm )`                       | Circulation - progressive pass; Scoring prep - attack goals | H          |
| 184  | `CrossGenerator::updatePasser( const WorldModel & wm )`                   | 10                                                          | H          |
| 266  | `CrossGenerator::updateReceivers( const WorldModel & wm )`                | 11                                                          | H          |
| 325  | `CrossGenerator::updateOpponents( const WorldModel & wm )`                | Circulation prep - intercept enemy pass                     | H          |
| 364  | `CrossGenerator::createCourses( const WorldModel & wm )`                  | Circulation - progressive pass; Scoring prep - attack goals | H          |
| 379  | `CrossGenerator::createCross( const WorldModel & wm, ... )`               | Circulation - progressive pass; Scoring prep - attack goals | H          |
| 598  | `CrossGenerator::checkOpponent( const Vector2D & first_ball_pos, ... )`   | Circulation prep - intercept enemy pass                     | H          |
| 739  | `CrossGenerator::getMinimumAngleWidth( const double & target_dist, ... )` | Scoring - attack goals with shot                            | H          |

---

## planner/field_analyzer.cpp

| Line | Signature                                                                                    | Vial(s)                                                                                               | Confidence |
| ---- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------- |
| 64   | `FieldAnalyzer::FieldAnalyzer()`                                                             | —                                                                                                     | —          |
| 74   | `FieldAnalyzer::instance()`                                                                  | —                                                                                                     | —          |
| 85   | `FieldAnalyzer::estimate_virtual_dash_distance( const rcsc::AbstractPlayerObject * player )` | Possessive - tackle his ball; Possessive - protect my ball                                            | M          |
| 107  | `FieldAnalyzer::predict_player_turn_cycle( const rcsc::PlayerType * ptype, ... )`            | Possessive - tackle his ball; Possessive - protect my ball; Circulation prep - pass interception free | H          |
| 158  | `FieldAnalyzer::predict_self_reach_cycle( const WorldModel & wm, ... )`                      | Possessive - tackle his ball; Possessive - protect my ball                                            | H          |
| 288  | `FieldAnalyzer::predict_player_reach_cycle( const AbstractPlayerObject * player, ... )`      | Possessive - tackle his ball; Circulation - intercept enemy pass; Circulation - receive               | H          |
| 387  | `FieldAnalyzer::predict_kick_count( const WorldModel & wm, ... )`                            | Circulation - progressive pass; Scoring - attack goals with shot                                      | H          |
| 428  | `FieldAnalyzer::get_ball_field_line_cross_point( const Vector2D & ball_from, ... )`          | Circulation - intercept enemy pass; Scoring - defend goals from shot                                  | H          |
| 460  | `FieldAnalyzer::get_field_bound_predict_ball_pos( const WorldModel & wm, ... )`              | Circulation - intercept enemy pass; Scoring - defend goals from shot                                  | M          |
| 562  | `FieldAnalyzer::can_shoot_from( const bool is_self, ... )`                                   | Scoring - attack goals with shot                                                                      | H          |
| 705  | `FieldAnalyzer::opponent_can_shoot_from( const Vector2D & pos, ... )`                        | Scoring - defend goals from shot                                                                      | H          |
| 947  | `FieldAnalyzer::get_our_team_near_goal_post_pos( const Vector2D & point )`                   | Scoring - defend goals from shot                                                                      | M          |
| 960  | `FieldAnalyzer::get_our_team_far_goal_post_pos( const Vector2D & point )`                    | Scoring - defend goals from shot                                                                      | M          |
| 973  | `FieldAnalyzer::get_opponent_team_near_goal_post_pos( const Vector2D & point )`              | Scoring - attack goals with shot                                                                      | M          |
| 986  | `FieldAnalyzer::get_opponent_team_far_goal_post_pos( const Vector2D & point )`               | Scoring - attack goals with shot                                                                      | M          |
| 999  | `FieldAnalyzer::get_dist_from_our_near_goal_post( const Vector2D & point )`                  | Scoring - defend goals from shot                                                                      | M          |
| 1016 | `FieldAnalyzer::get_dist_from_opponent_near_goal_post( const Vector2D & point )`             | Scoring - attack goals with shot                                                                      | M          |
| 1033 | `FieldAnalyzer::get_pass_count( const PredictState & state, ... )`                           | 10                                                                                                    | M          |
| 1080 | `FieldAnalyzer::is_ball_moving_to_our_goal( const Vector2D & ball_pos, ... )`                | Scoring - defend goals from shot                                                                      | H          |
| 1101 | `FieldAnalyzer::to_be_final_action( const PredictState & state )`                            | Scoring - attack goals with shot; Scoring prep - attack goals                                         | M          |
| 1111 | `FieldAnalyzer::to_be_final_action( const WorldModel & wm )`                                 | Scoring - attack goals with shot; Scoring prep - attack goals                                         | M          |
| 1121 | `FieldAnalyzer::to_be_final_action( const Vector2D & ball_pos, ... )`                        | Scoring - attack goals with shot; Scoring prep - attack goals                                         | M          |
| 1146 | `FieldAnalyzer::get_blocker( const WorldModel & wm, ... )`                                   | Scoring prep - defend goals; Circulation prep - intercept enemy pass                                  | H          |
| 1161 | `FieldAnalyzer::get_blocker( const WorldModel & wm, ... )`                                   | Scoring prep - defend goals; Circulation prep - intercept enemy pass                                  | H          |
| 1204 | `FieldAnalyzer::update( const WorldModel & wm )`                                             | —                                                                                                     | —          |
| 1241 | `FieldAnalyzer::updateVoronoiDiagram( const WorldModel & wm )`                               | Circulation prep - pass interception free; Scoring prep - attack goals                                | H          |
| 1295 | `FieldAnalyzer::writeDebugLog()`                                                             | —                                                                                                     | —          |
