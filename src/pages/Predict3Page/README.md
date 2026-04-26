Here's the README spec:

---

# ⚽ SoccerSim — EQS-Based Soccer Simulation Module

## Mission Statement

SoccerSim is a React-based soccer simulation module built around an **Environmental Query System (EQS)** architecture — a utility-based AI approach that sits between rigid rule-based systems and learned neural behaviour. Rather than scripting "if situation X, do action Y," agents continuously score candidate actions against weighted environmental queries, selecting the highest-utility option each tick. This makes behaviour emergent and context-sensitive without requiring training data.

## Philosophical Foundation

The simulation draws its domain model from the **RoboCup2D / agent2D** framework — specifically its concepts of field analysis, cooperative action chaining, predict-state lookahead, and role-based positioning. However, where agent2D hardcodes priority chains (a C++ `if/else` cascade of behaviours), SoccerSim replaces that decision layer with a **scored candidate system**: every possible action (pass, dribble, position, press, hold) is evaluated against a set of environmental queries (distance to goal, pressure from defenders, teammate availability, zone control) and the best-scoring action wins.

## Core Concepts

**EQS vs Rule-Based vs Neural:** Rule-based is deterministic branching. Neural is learned weight distributions. EQS is _explicit utility scoring_ — humans author the scoring functions, but the decision emerges from the environment rather than from a fixed tree. Think of it as "voting" — every context factor casts a weighted vote for each candidate action.

**BehaviorTree.js** provides the macro-level structure — team phases like attacking, defending, and transition are orchestrated through a behaviour tree, giving readable high-level syntax. EQS lives _inside_ the leaf nodes, resolving which specific action to execute once the tree has selected a strategic context.

**Yuka** contributes steering behaviours (seek, flee, arrive, pursuit) and spatial utilities (path following, nav mesh concepts) — essentially the locomotion and spatial reasoning layer that agent2D's librcsc geometry handles in the reference codebase.

## Layers

```
BehaviorTree.js     → team & phase orchestration (what mode are we in?)
      ↓
EQS Scorer          → candidate action evaluation (what's the best move?)
      ↓
Yuka Steering       → locomotion & spatial execution (how do we get there?)
      ↓
React Renderer      → visualisation & state display
```

## Scope

- 11v11 agent simulation on a 2D pitch
- Role system (goalkeeper, defenders, midfielders, forwards) with dynamic positioning
- Pass, dribble, press, and hold actions as EQS candidates
- Predict-state lookahead for pass target scoring (inspired by agent2D's `PredictState`)
- No ML, no hardcoded decision trees at the action level
