# SoccerSim

![Splinter and Turtle](./splinter.png)

> _Building the next generation of 2D soccer robots_

---

## The Strategy

Cyrus2DBase is a veteran. Twenty years of competition, thousands of edge cases handled, every situation accounted for. It wins. But it wins the way an old fighter wins — through accumulated scar tissue, not clean instinct.

We're not cloning Cyrus. We're learning from him.

The approach is **genetic distillation** — extracting the core intentions behind each decision in the Cyrus codebase and expressing them as clean, minimal EQS queries. Not every trick he ever learned. The wisdom that took 20 years to understand was the foundation of everything.

A grandfather doesn't tell his grandson "when the ball is at position (36.57, -12.09) you should stand at (39.17, -19.85)". He says "always know where the space is before the ball arrives".

That is the level of principle we are after.

## Why Less Mature Is More Flexible

A less mature system has fewer assumptions baked in. It can grow in directions a fully formed system cannot. Cyrus has lookup tables where there should be scored queries, magic numbers where there should be weighted factors, DNN weights where there should be explainable logic.

SoccerSim starts naive — naive enough to be understood, principled enough to grow in the right direction, and flexible enough to become something better than what we started from.

---

## Related Documents

- [README.md](./README.md) — Mission statement and EQS architecture overview
- [RESEARCH_MAP.md](./RESEARCH_MAP.md) — Source file index and what each file contains
- [CODE_NOTES.md](./CODE_NOTES.md) — Code-level decision logic notes per file
