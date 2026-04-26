# 📂 Research Map — Principles of Play Source Files

> This document records where the principles of play were sourced from, which files were read, and what each file contributes. The primary reference codebase is **Cyrus2DBase**.

---

## Primary Reference Codebase

**Cyrus2DBase** — [github.com/Cyrus2D/Cyrus2DBase](https://github.com/Cyrus2D/Cyrus2DBase)  
Branch: `cyrus2d`

Cyrus2DBase is the richest open-source reference available for RoboCup 2D soccer simulation. It merges HELIOS Base (the standard community skeleton) with Gliders2D and features from Cyrus2021 (RoboCup 2021 champions). Unlike pure base codes, it contains real decision logic used in competition.

Secondary reference for architecture overview: **HELIOS Base** — [github.com/helios-base/helios-base](https://github.com/helios-base/helios-base)

---

## Full File Tree — `src/`

```
src/
│   CMakeLists.txt
│   coach.conf
│   player.conf
│   start-debug.sh / start-offline.sh / start.sh.in
│   train.sh.in
│   unmark_dnn_weights.txt          ← DNN weights for pass prediction
│
├───coach/
│       sample_coach.cpp / .h
│       sample_freeform_message.cpp / .h
│
├───formations-dt/                  ← Default formation configs (normal, defense, offense, setplay etc.)
├───formations-keeper/              ← Keeper-side formation configs
├───formations-taker/               ← Taker-side formation configs
├───obsolete/                       ← Legacy formations, ignore
│
├───player/
│   │   bhv_basic_block.cpp / .h
│   │   bhv_basic_move.cpp / .h
│   │   bhv_basic_tackle.cpp / .h
│   │   bhv_custom_before_kick_off.cpp / .h
│   │   bhv_goalie_basic_move.cpp / .h
│   │   bhv_goalie_chase_ball.cpp / .h
│   │   bhv_goalie_free_kick.cpp / .h
│   │   bhv_penalty_kick.cpp / .h
│   │   bhv_unmark.cpp / .h
│   │   intention_receive.cpp / .h
│   │   intercept_evaluator_sample.cpp / .h
│   │   neck_default_intercept_neck.cpp / .h
│   │   neck_goalie_turn_neck.cpp / .h
│   │   neck_offensive_intercept_neck.cpp / .h
│   │   role_center_back.cpp / .h
│   │   role_center_forward.cpp / .h
│   │   role_defensive_half.cpp / .h
│   │   role_goalie.cpp / .h
│   │   role_offensive_half.cpp / .h
│   │   role_side_back.cpp / .h
│   │   role_side_forward.cpp / .h
│   │   role_side_half.cpp / .h
│   │   sample_communication.cpp / .h
│   │   sample_field_evaluator.cpp / .h
│   │   sample_player.cpp / .h
│   │   soccer_role.cpp / .h
│   │   strategy.cpp / .h
│   │   view_tactical.cpp / .h
│   │
│   ├───basic_actions/
│   │       body_go_to_point.cpp / .h
│   │       body_intercept2018.cpp / .h
│   │       body_dribble2008.cpp / .h
│   │       body_hold_ball2008.cpp / .h
│   │       body_clear_ball2009.cpp / .h
│   │       body_pass.cpp / .h
│   │       kick_table.cpp / .h
│   │       intercept_evaluator.cpp / .h
│   │       neck_turn_to_ball_or_scan.cpp / .h
│   │       ... (locomotion and perception primitives)
│   │
│   ├───data_extractor/
│   │       DEState.cpp / .h
│   │       offensive_data_extractor.cpp / .h   ← feature extraction for DNN pass prediction
│   │
│   ├───planner/
│   │       action_chain_graph.cpp / .h
│   │       action_chain_holder.cpp / .h
│   │       action_generator.h
│   │       action_state_pair.h
│   │       actgen_cross.cpp / .h
│   │       actgen_direct_pass.cpp / .h
│   │       actgen_self_pass.cpp / .h
│   │       actgen_shoot.cpp / .h
│   │       actgen_short_dribble.cpp / .h
│   │       actgen_simple_dribble.cpp / .h
│   │       actgen_strict_check_pass.cpp / .h
│   │       bhv_normal_dribble.cpp / .h
│   │       bhv_pass_kick_find_receiver.cpp / .h
│   │       bhv_planned_action.cpp / .h
│   │       bhv_strict_check_shoot.cpp / .h
│   │       clear_ball.cpp / .h
│   │       clear_generator.cpp / .h
│   │       cooperative_action.cpp / .h
│   │       cross_generator.cpp / .h
│   │       dribble.cpp / .h
│   │       field_analyzer.cpp / .h
│   │       field_evaluator.h
│   │       hold_ball.cpp / .h
│   │       pass.cpp / .h
│   │       positioning.cpp / .h
│   │       predict_state.cpp / .h
│   │       self_pass_generator.cpp / .h
│   │       shoot.cpp / .h
│   │       shoot_generator.cpp / .h
│   │       short_dribble_generator.cpp / .h
│   │       simple_pass_checker.cpp / .h
│   │       strict_check_pass_generator.cpp / .h
│   │       tackle_generator.cpp / .h
│   │
│   └───setplay/
│           bhv_set_play.cpp / .h
│           bhv_set_play_free_kick.cpp / .h
│           bhv_set_play_goal_kick.cpp / .h
│           bhv_set_play_kick_in.cpp / .h
│           bhv_set_play_kick_off.cpp / .h
│           bhv_their_goal_kick_move.cpp / .h
│           ... (set piece behaviours)
│
└───trainer/
        sample_trainer.cpp / .h
```

---

## Critical Files — Principles of Play

These are the files that were read and contain the decision logic being translated into EQS. Numbers match `CODE_NOTES.md`.

| #   | File                              | Path                                                  | Size  | What it contains                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --- | --------------------------------- | ----------------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `strategy.cpp`                    | `/src/player/strategy.cpp`                            | 50 KB | **Situation detection and dynamic positioning.** Determines Normal / Offense / Defense situation from intercept step comparison. Dynamic dash power per role and field zone. NOTE: Cyrus uses a 6000-line lookup table for home positions — this is a data shortcut, not a principle. In SoccerSim, positioning is replaced with a live EQS spatial scorer: candidates scored by space from opponents (Voronoi), cover of dangerous zones, support angle to ball carrier, and role constraints. |
| 2   | `bhv_basic_move.cpp`              | `/src/player/bhv_basic_move.cpp`                      | 8 KB  | **Core outfield movement logic.** Priority chain: tackle → intercept (with role-aware pressing margins) → blocking → offside trap → unmarking → move to EQS-scored position. Dynamic dash power.                                                                                                                                                                                                                                                                                                |
| 3   | `bhv_basic_block.cpp`             | `/src/player/bhv_basic_block.cpp`                     | 8 KB  | **Defensive blocking.** Simulates predicted opponent dribble path 40 cycles ahead. Finds first teammate who can intercept. Scores dribble directions using a mini utility function (`-target.x + proximity to own goal`).                                                                                                                                                                                                                                                                       |
| 4   | `bhv_unmark.cpp`                  | `/src/player/bhv_unmark.cpp`                          | 23 KB | **Attacking movement off the ball.** Uses a DNN to predict pass chains. Samples candidate positions (dist 2-7, angle every 20°). Scores each by: pass quality + nearest opponent distance + turn cost + forward direction bonus. Caches position 5 cycles to avoid oscillation. Stamina-gated per role and field zone.                                                                                                                                                                          |
| 5   | `strict_check_pass_generator.cpp` | `/src/player/planner/strict_check_pass_generator.cpp` | 65 KB | **Pass candidate generation.** Three pass types per receiver: Direct (to inertia position), Leading (to nearby space, 24 angles × 4 distances), Through (ball into space behind defence). Filters: offside, out of bounds, dangerous backpass area, tackling receiver, receiver too far (>40 units). Sorts candidates by proximity to opponent goal.                                                                                                                                            |
| 6   | `shoot_generator.cpp`             | `/src/player/planner/shoot_generator.cpp`             | 26 KB | **Shoot candidate generation and scoring.** Samples 25 targets across goal width within 30 units. Scores each: one-kick bonus (+50), goalie unreachable (+100), opponent unreachable (+100), Gaussian goalie angle rate, Gaussian y-rate (centre preferred from distance). Already a multi-factor utility scorer.                                                                                                                                                                               |
| 7   | `short_dribble_generator.cpp`     | `/src/player/planner/short_dribble_generator.cpp`     | 27 KB | **Dribble candidate generation.** Samples 16 directions evenly around 360°. Direction filtered by field zone: in own half only allows within 100° of forward; deep in own half only within 45°. Simulates player path per direction, checks opponent safety with bonus steps for uncertainty and tackling state. Candidates sorted by goal proximity.                                                                                                                                           |
| 8   | `cross_generator.cpp`             | `/src/player/planner/cross_generator.cpp`             | 26 KB | **Cross candidate generation.** Only active within 35 units of opponent goal. Samples receive points per receiver at multiple distances and angles. Opponent safety check simulates ball trajectory cycle by cycle. Selects best angle-width cross — maximum angular separation from nearest defender.                                                                                                                                                                                          |
| 9   | `bhv_goalie_basic_move.cpp`       | `/src/player/bhv_goalie_basic_move.cpp`               | 26 KB | **Goalkeeper positioning.** Positions on line between a point behind goal and ball, clamped to goal line. Priority: tackle → deep cross prep → stop → emergency dash → correct X → correct body angle → Y adjustment.                                                                                                                                                                                                                                                                           |
| 10  | `bhv_goalie_chase_ball.cpp`       | `/src/player/bhv_goalie_chase_ball.cpp`               | 17 KB | **Goalkeeper chase trigger.** Chases only when: ball trajectory intersects penalty area AND goalie can arrive before opponent, OR confirmed shot moving toward goal. Uses ball line intersection with vertical defend line for slide-step positioning.                                                                                                                                                                                                                                          |
| 11  | `sample_field_evaluator.cpp`      | `/src/player/sample_field_evaluator.cpp`              | 15 KB | **The core scoring function.** Scores any game state by: ball x-position (weighted by opponent pressure), Voronoi-based best open space point, offside line gap detection, shoot opportunity bonus (+1e6). This is the closest thing to EQS already present.                                                                                                                                                                                                                                    |
| 12  | `field_analyzer.cpp`              | `/src/player/planner/field_analyzer.cpp`              | 43 KB | **Spatial utility methods used throughout all generators and scorers.** `can_shoot_from`: samples 10 angles across goal width, returns true if max angular gap ≥ 20° (self) / 15° (teammate), within 17 units of goal. `estimate_min_reach_cycle`: minimum cycle a player could intercept a ball trajectory. `predict_player_turn_cycle`: cycles needed to turn before dashing.                                                                                                                 |

---

## Files Read but Not Critical

| File                                   | Reason                                                                                                                       |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `role_*.cpp` (all)                     | Boilerplate — all identical. Role differentiation is handled entirely by formation position and the planner, not role files. |
| `pass.cpp`, `shoot.cpp`, `dribble.cpp` | Data classes only — constructors that store action parameters. No decision logic.                                            |
| `bhv_goalie_free_kick.cpp`             | Set piece specific, out of scope for core simulation.                                                                        |
| `setplay/` folder                      | Out of scope for initial build.                                                                                              |

---

## Files Read but Not Critical (Updated)

| File                                                      | Reason                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `role_*.cpp` (all)                                        | Boilerplate — all identical. Role differentiation is handled entirely by formation position and the planner, not role files.                                                                                                                                                                                                                                                                                                                                                               |
| `pass.cpp`, `shoot.cpp`, `dribble.cpp`, `positioning.cpp` | Data classes only — constructors that store action parameters. No decision logic.                                                                                                                                                                                                                                                                                                                                                                                                          |
| `bhv_goalie_free_kick.cpp`                                | Set piece specific, out of scope for core simulation.                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `setplay/` folder                                         | Out of scope for initial build.                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `DEState.cpp`                                             | Empty file — just an include.                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `offensive_data_extractor.cpp`                            | Training data feature extraction for DNN — not principles of play. Extracts positions/angles/distances into CSV for model training.                                                                                                                                                                                                                                                                                                                                                        |
| `formations-dt/*.conf`                                    | Configuration data not principles — but format and values are now understood. Delaunay Triangulation interpolation table of 125 ball-position → home-position mappings. Formation is a 4-2-3-1 hybrid: roles 2-3 center backs, 4-5 side backs, 6 defensive half, 7-8 offensive halves, 9-10 side forwards, 11 center forward. Paired roles mirror symmetrically on Y axis. Ball in own half compresses all players back to x=-30 to -50. Ball in opponent half pushes forwards to x=40-48. |

---

## Research Complete ✅

All critical files have been read. The full decision vocabulary has been extracted and is ready for EQS translation.
