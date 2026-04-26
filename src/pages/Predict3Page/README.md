# ⚽ SoccerSim

> An EQS-driven soccer simulation module for React — utility-scored agent behaviour inspired by RoboCup2D, built without neural nets or hardcoded rules.

---

## What This Is

SoccerSim is a modular, React-embeddable soccer simulation engine built around an **Environmental Query System (EQS)** — a utility-based AI paradigm that sits in the space between brittle rule trees and opaque neural networks.

Agents don't follow scripts. They continuously evaluate candidate actions against a set of weighted environmental queries — distance to goal, defensive pressure, teammate availability, spatial control — and commit to whichever action scores highest at that tick. The decision _emerges_ from the environment rather than being prescribed by the programmer.

---

## Philosophical Foundation

The domain model is drawn from the **RoboCup2D / HELIOS Base** framework ([helios-base/helios-base](https://github.com/helios-base/helios-base)) and its companion tutorial ([herodrigues.github.io/robocup2d-tutorial](https://herodrigues.github.io/robocup2d-tutorial)). These represent a rigorous, research-grade approach to multi-agent soccer simulation — including concepts like cooperative action chaining, predict-state lookahead, field analysis, and role-based dynamic positioning.

Where HELIOS Base hardcodes decisions as C++ priority cascades (essentially: _if situation X then action Y, else try Z_), SoccerSim replaces that entire decision layer with a **scored candidate model**: every possible action is a candidate, every environmental factor is a query, and the winner is the highest aggregate score. The domain knowledge from RoboCup2D is preserved — it's just expressed as scoring weights rather than branching conditions.

---

## What EQS Actually Means

The term comes from Unreal Engine's AI toolset, but the concept is more general. It's sometimes called **utility AI** or **option scoring**.

| Paradigm             | How it decides                                                                         |
| -------------------- | -------------------------------------------------------------------------------------- |
| Rule-based           | Explicit `if/else` priority chains. Predictable, brittle.                              |
| Neural / ML          | Learned weight distributions. Adaptive, opaque, needs data.                            |
| **EQS / Utility AI** | **Each candidate action is scored against authored query functions. Best score wins.** |

EQS is not a single algorithm — it's a _decision architecture_. You author what matters (spatial context, team state, ball proximity) and how much it matters (weights), and the system resolves the best action dynamically each frame. Behaviour is emergent without being unpredictable.

---

## Tech Stack

| Layer         | Tool                    | Role                                                                                                                                    |
| ------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Orchestration | **BehaviorTree.js**     | High-level team phase control (attacking, defending, transition). Readable tree syntax structures _when_ EQS runs, not _what_ it picks. |
| Decision      | **EQS Scorer** (custom) | Evaluates candidate actions inside BT leaf nodes. Scores, ranks, and commits.                                                           |
| Locomotion    | **Yuka**                | Steering behaviours (seek, arrive, pursuit, flee) and spatial utilities. Handles _how_ agents move once a decision is made.             |
| Rendering     | **React**               | Visualisation, state display, and UI layer.                                                                                             |

BehaviorTree.js and Yuka are complementary, not redundant. The BT manages strategic context; EQS resolves tactical action; Yuka executes physical movement. Each layer has a single responsibility.

---

## Architecture Overview

```
┌─────────────────────────────────────┐
│         BehaviorTree.js             │  ← "What mode are we in?"
│   (team phase orchestration)        │     Attacking / Defending / Transition
└────────────────┬────────────────────┘
                 │ phase context
                 ▼
┌─────────────────────────────────────┐
│           EQS Scorer                │  ← "What's the best action?"
│  Candidate actions × Query weights  │     Pass / Dribble / Press / Hold / Position
│  → ranked, top action selected      │
└────────────────┬────────────────────┘
                 │ chosen action
                 ▼
┌─────────────────────────────────────┐
│          Yuka Steering              │  ← "How do we execute it?"
│   Seek · Arrive · Pursuit · Flee   │     Agent locomotion & spatial nav
└────────────────┬────────────────────┘
                 │ world state
                 ▼
┌─────────────────────────────────────┐
│         React Renderer              │  ← Visualisation & debug UI
└─────────────────────────────────────┘
```

---

## Simulation Scope

- **11v11** agents on a 2D pitch
- **Role system**: goalkeeper, defenders, midfielders, forwards — with dynamic positioning drawn from HELIOS Base's formation and role concepts
- **Candidate actions**: pass, dribble, press, hold, reposition
- **Predict-state lookahead** for pass target scoring (adapted from agent2D's `PredictState` / `ActionStatePair` chain)
- **No ML, no training data, no hardcoded decision trees at the action level**

---

## Reference Sources

- **HELIOS Base** (C++, MIT) — [github.com/helios-base/helios-base](https://github.com/helios-base/helios-base)  
  Primary domain reference. Concepts translated: cooperative action chains, field analysis, dynamic positioning, role architecture, predict-state lookahead.

- **RoboCup2D Tutorial** — [herodrigues.github.io/robocup2d-tutorial](https://herodrigues.github.io/robocup2d-tutorial)  
  Explanatory companion covering agent2D behaviours, roles, strategy, and librcsc geometry primitives.

- **BehaviorTree.js** — behaviour tree orchestration layer
- **Yuka** — game-oriented AI library for steering and spatial reasoning
