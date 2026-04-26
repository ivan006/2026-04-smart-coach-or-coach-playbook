# SoccerSim Mechanism Centrifuge

> Classification of the mechanisms extracted from `README_3_CODE_NOTES.md`.

This document centrifuges the old Cyrus mechanisms into genetic vials. It is not a new football theory and not yet an implementation design.

The discipline:

```text
old mechanism -> mechanism shape -> genetic vial(s) -> later translation
```

Do not invent behaviours to fill a vial. A vial only stores mechanisms already observed in the old files.

---

## Mechanism Shapes

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
| Progressive actions | Advance our state or obstruct opponent progress |
| Combative actions | Directly attack or defend goal danger |
| Combative preparation actions | Move into place to attack or defend goal danger |
| Possessive actions | Win, keep, or protect ball ownership |
| Circulation actions | Move the ball between teammates |
| Circulation preparation actions | Prepare or deny ball circulation |

Mechanisms can belong to more than one vial.

---

## Centrifuge Ledger

### 1. `strategy.cpp`

| Mechanism | Shape | Vial(s) |
| --- | --- | --- |
| Formation config loading for normal, offense, defense, set plays, goalie states | Spatial reference | World facts, combative preparation |
| Role factory and role number assignment | Spatial reference | World facts |
| Goalie uniform-number detection/validation | World fact | World facts, combative actions |
| Situation detection from self/teammate/opponent intercept steps | World fact, evaluator | World facts, possessive actions |
| Normal/offense/defense situation selection | Priority chain / phase mechanism | Progressive actions, possessive actions |
| Current formation selection by situation/game mode | Spatial reference | Combative preparation, circulation preparation |
| Ball-step projection before selecting home positions | World fact | World facts, progressive actions |
| Formation home-position lookup/interpolation | Spatial reference | Combative preparation, circulation preparation |
| Role-side and position-type assignment | Spatial reference | World facts |
| Dynamic dash power by role, field zone, and stamina | Evaluator, stabilizer | Possessive actions, combative preparation |
| Field-zone compression/expansion from formation data | Spatial reference | Progressive actions, combative preparation |

### 2. `bhv_basic_move.cpp`

| Mechanism | Shape | Vial(s) |
| --- | --- | --- |
| Outfield priority chain: tackle -> intercept -> block -> offside trap -> unmark -> home position | Priority chain | Possessive, progressive, circulation preparation, combative preparation |
| Basic tackle attempt before other movement | Execution behaviour, gate | Possessive actions |
| Intercept decision using intercept-table race | Gate, execution behaviour | Possessive actions, progressive actions |
| Role-aware pressing/intercept margins | Parameterized evaluator | Possessive actions, progressive actions |
| Defensive block delegation | Priority-chain branch | Progressive actions, combative preparation |
| Offside-trap trigger | Priority-chain branch, spatial reference | Progressive actions, combative preparation |
| Unmark branch | Priority-chain branch | Circulation preparation, combative preparation |
| Go-to-home fallback | Spatial reference, execution behaviour | Combative preparation, circulation preparation |
| Dynamic dash power | Evaluator, stabilizer | Possessive actions, combative preparation |
| Neck/scan behaviour while moving | Execution behaviour | World facts, circulation preparation |

### 3. `bhv_basic_block.cpp`

| Mechanism | Shape | Vial(s) |
| --- | --- | --- |
| Predict opponent dribble path 40 cycles ahead | World fact, candidate generator | World facts, progressive actions |
| Simulate candidate opponent dribble directions | Candidate generator | Progressive actions |
| Score opponent dribble directions by forward danger and own-goal proximity | Evaluator | Progressive actions, combative preparation |
| Select first teammate able to intercept/block predicted route | Evaluator, gate | Possessive actions, progressive actions |
| Move to blocking point | Execution behaviour | Progressive actions, combative preparation |
| Turn/face ball while blocking | Execution behaviour | World facts, possessive actions |
| Tackle check inside block behaviour | Gate, execution behaviour | Possessive actions |

### 4. `bhv_unmark.cpp`

| Mechanism | Shape | Vial(s) |
| --- | --- | --- |
| DNN-assisted pass-chain prediction | World fact, evaluator | World facts, circulation preparation |
| Local candidate-position sampling around player | Candidate generator | Circulation preparation |
| Distance ring sampling from roughly 2 to 7 units | Candidate generator | Circulation preparation |
| Angle sampling around player | Candidate generator | Circulation preparation |
| Pass-quality evaluation for sampled point | Evaluator | Circulation preparation, circulation actions |
| Nearest-opponent distance reward | Evaluator | Circulation preparation, possessive actions |
| Turn-cost penalty | Evaluator | Circulation preparation, possessive actions |
| Forward-direction bonus | Evaluator | Progressive actions, combative preparation |
| Stamina gate by role/field zone | Gate, stabilizer | Possessive actions, circulation preparation |
| Role/zone gating of unmark behaviour | Gate | Circulation preparation, combative preparation |
| Position cache for about 5 cycles | Stabilizer | Circulation preparation |
| Intention receive setup | Stabilizer, execution support | Circulation actions, circulation preparation |

### 5. `strict_check_pass_generator.cpp`

| Mechanism | Shape | Vial(s) |
| --- | --- | --- |
| Passer state update | World fact | World facts, circulation actions |
| Receiver state update | World fact | World facts, circulation actions |
| Opponent state update | World fact | World facts, circulation actions |
| Direct pass candidate to receiver inertia position | Candidate generator | Circulation actions |
| Leading pass candidate around receiver | Candidate generator | Circulation actions, progressive actions |
| Leading-pass angle/distance grid | Candidate generator | Circulation actions, circulation preparation |
| Through pass into space behind defense | Candidate generator | Circulation actions, progressive actions, combative preparation |
| Offside filter | Filter / gate | Circulation actions |
| Out-of-bounds filter | Filter / gate | Circulation actions |
| Dangerous backpass-area filter | Filter / gate | Possessive actions, combative actions |
| Tackling-receiver filter | Filter / gate | Possessive actions, circulation actions |
| Receiver-too-far filter | Filter / gate | Circulation actions |
| Receiver arrival prediction | World fact, evaluator | Circulation actions, possessive actions |
| Opponent reach prediction | World fact, evaluator | Circulation actions, possessive actions |
| Ball trajectory simulation | World fact | Circulation actions |
| Pass safety check | Evaluator, gate | Circulation actions, possessive actions |
| Duplicate/same-point candidate control | Stabilizer | Circulation actions |
| Candidate sorting by proximity to opponent goal | Evaluator | Progressive actions, combative preparation |
| Success/failure debug classification | Evaluator support | World facts |

### 6. `shoot_generator.cpp`

| Mechanism | Shape | Vial(s) |
| --- | --- | --- |
| Shooting activation by range near opponent goal | Gate | Combative actions |
| Goal-mouth target sampling | Candidate generator | Combative actions |
| 25 target-point search across goal width | Candidate generator | Combative actions |
| Kick speed / one-step feasibility search | Candidate generator, gate | Combative actions, possessive actions |
| One-kick bonus | Evaluator | Combative actions |
| Goalie-unreachable bonus | Evaluator | Combative actions |
| Opponent-unreachable bonus | Evaluator | Combative actions |
| Gaussian goalie angle-rate scoring | Evaluator | Combative actions |
| Gaussian y-rate / centrality scoring | Evaluator | Combative actions |
| Blocked-course rejection | Filter / gate | Combative actions |
| Shot-course success/failure classification | Evaluator support | Combative actions |

### 7. `short_dribble_generator.cpp`

| Mechanism | Shape | Vial(s) |
| --- | --- | --- |
| 16-direction dribble sampling | Candidate generator | Possessive actions, progressive actions |
| Field-zone direction filtering | Filter / gate | Possessive actions, progressive actions |
| Own-half forward-angle restriction | Filter / gate | Possessive actions |
| Deep-own-half stricter forward-angle restriction | Filter / gate | Possessive actions, combative actions |
| Player path simulation per dribble direction | World fact, evaluator | Possessive actions |
| Opponent reach/safety check | Evaluator, gate | Possessive actions |
| Uncertainty buffer for opponent safety | Parameterized evaluator | Possessive actions |
| Tackling-state bonus/penalty in safety | Parameterized evaluator | Possessive actions |
| Candidate sorting by goal proximity | Evaluator | Progressive actions, combative preparation |

### 8. `cross_generator.cpp`

| Mechanism | Shape | Vial(s) |
| --- | --- | --- |
| Cross activation only near opponent goal | Gate | Combative actions, circulation actions |
| Receiver-point sampling for cross | Candidate generator | Circulation actions, combative preparation |
| Multi-distance and multi-angle receive sampling | Candidate generator | Circulation actions, circulation preparation |
| Ball trajectory safety check per cycle | Evaluator, gate | Circulation actions, possessive actions |
| Opponent reach check along cross path | Evaluator, gate | Circulation actions, possessive actions |
| Best angle-width selection | Evaluator | Circulation actions, combative actions |
| Maximum angular separation from nearest defender | Evaluator | Combative actions, circulation actions |

### 9. `bhv_goalie_basic_move.cpp`

| Mechanism | Shape | Vial(s) |
| --- | --- | --- |
| Keeper position on line between ball and point behind goal | Spatial reference | Combative preparation |
| Clamp keeper position to goal/defend line | Spatial reference, gate | Combative preparation |
| Keeper priority chain: tackle -> deep cross prep -> stop -> emergency dash -> X correction -> body-angle correction -> Y adjustment | Priority chain | Combative actions, combative preparation, possessive actions |
| Keeper tackle attempt | Execution behaviour, gate | Possessive actions, combative actions |
| Deep-cross preparation | Priority-chain branch | Combative preparation, circulation preparation |
| Stop-dash behaviour | Execution behaviour, stabilizer | Combative preparation |
| Emergency dash | Execution behaviour | Combative actions |
| Correct X position | Execution behaviour, spatial reference | Combative preparation |
| Correct body angle | Execution behaviour | Combative preparation |
| Correct Y position | Execution behaviour, spatial reference | Combative preparation |

### 10. `bhv_goalie_chase_ball.cpp`

| Mechanism | Shape | Vial(s) |
| --- | --- | --- |
| Penalty-area trajectory intersection check | Gate, world fact | Combative actions |
| Keeper arrival-before-opponent check | Gate, evaluator | Possessive actions, combative actions |
| Confirmed shot-moving-toward-goal check | Gate, world fact | Combative actions |
| Active interception catch-point calculation | World fact | Possessive actions, combative actions |
| Reject chase if intercept point outside penalty area | Gate | Combative actions |
| Reject chase if opponent arrives faster | Gate | Possessive actions |
| Ball-line intersection with vertical defend line | Spatial reference | Combative preparation |
| Slide-step positioning from ball-line intersection | Execution behaviour, spatial reference | Combative preparation |
| Chase/intercept execution | Execution behaviour | Possessive actions, combative actions |

### 11. `sample_field_evaluator.cpp`

| Mechanism | Shape | Vial(s) |
| --- | --- | --- |
| Whole-state scoring | Evaluator | World facts, progressive actions |
| Ball x-position score | Evaluator | Progressive actions |
| Opponent-pressure weighted ball value | Evaluator | Possessive actions, progressive actions |
| Voronoi best-open-space point | Evaluator, spatial reference | Progressive actions, circulation preparation |
| Offside-line gap detection | Evaluator, spatial reference | Circulation actions, progressive actions |
| Free situation near offside line bonus | Evaluator | Progressive actions, combative preparation |
| Shoot opportunity bonus | Evaluator | Combative actions |
| Teammate/opponent sector checks | World fact, evaluator | World facts, circulation preparation |

### 12. `field_analyzer.cpp`

| Mechanism | Shape | Vial(s) |
| --- | --- | --- |
| Predict player turn cycle | World fact, evaluator | World facts, possessive actions |
| Predict self reach cycle with stamina model | World fact, evaluator | Possessive actions |
| Predict generic player reach cycle | World fact, evaluator | Possessive actions, circulation actions |
| Estimate minimum reach cycle for ball trajectory | World fact, evaluator | Possessive actions, circulation actions |
| Ball-field-line cross point calculation | Spatial reference | World facts, circulation actions |
| Can-shoot-from check | Evaluator, gate | Combative actions |
| Goal angle sampling across goal width | Candidate generator, evaluator | Combative actions |
| Opponent hide-angle / blocking-angle model | World fact, evaluator | Combative actions |
| Max shooting-angle gap threshold | Gate, evaluator | Combative actions |
| Opponent-can-shoot-from check | Evaluator, gate | Combative actions, combative preparation |
| Teammate blocking-angle model against opponent shot | Evaluator | Combative preparation |
| Pass-count estimation | Evaluator | Circulation actions |
| Ball moving toward goal check | World fact, gate | Combative actions |
| Near-goal next-action search condition | Gate | Combative actions, progressive actions |
| Over-offside-line final-action condition | Gate | Progressive actions, circulation actions |
| Blocker selection by attack angle | Evaluator, spatial reference | Progressive actions, combative preparation |
| Voronoi diagram update for pass/open-space reasoning | World fact, spatial reference | World facts, circulation preparation |

---

## Non-Critical Files

| File/group | Classification |
| --- | --- |
| `role_*.cpp` | Role boilerplate; role intelligence is mostly formation/planner-driven |
| `pass.cpp`, `shoot.cpp`, `dribble.cpp`, `positioning.cpp` | Data containers for action parameters |
| `DEState.cpp` | Empty/include-only |
| `offensive_data_extractor.cpp` | Training-data extraction, not behaviour principle |
| `formations-dt/*.conf` | Spatial reference data; useful as formation evidence, not a decision mechanism |
| `setplay/` | Out of initial open-play scope |

---

## Vial Cross-Cuts

| Mechanism family | Primary shape | Common vials |
| --- | --- | --- |
| Intercept race | World fact + evaluator | Possessive, circulation, combative |
| Candidate sampling | Candidate generator | Depends on target: pass, shot, dribble, unmark |
| Safety rejection | Filter / gate | Possessive, circulation |
| Goal-threat scoring | Evaluator | Combative, progressive |
| Formation/home positioning | Spatial reference | Combative preparation, circulation preparation |
| Path/trajectory prediction | World fact | Possessive, circulation, combative |
| Stabilization gates | Stabilizer | Usually attached to circulation preparation or possession |

---

## Open Classification Questions

- Is `dribble` primarily possessive protection, progressive advancement, or both depending on field zone?
- Is `clear` best classified as combative defense, possession release, or emergency circulation?
- Which formation/home-position mechanisms are goal-defense preparation versus generic team-shape reference?
- Which unmark candidates are only circulation preparation, and which become combative preparation because they create goal access?
- Does the old system show real preparation counterparts for shooting or dribbling, or only for passing/receiving and defensive blocking?

---

## Distillation Discipline

For every future extracted mechanism:

1. Name the observed Cyrus mechanism.
2. Identify its mechanism shape.
3. Place it into one or more genetic vials.
4. Record the source file.
5. Only then decide whether SoccerSim should translate it into a query, candidate, gate, weight, or execution behaviour.

This keeps the process genetic distillation, not genetic modification.
