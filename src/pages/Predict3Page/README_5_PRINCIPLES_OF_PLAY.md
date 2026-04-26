# SoccerSim Principles of Play

> A distillation of Cyrus2DBase decision logic into SoccerSim's EQS vocabulary.

This document is the bridge between the code notes and the implementation. Cyrus expresses most of its intelligence as priority chains, thresholds, lookup tables, and special-case behaviours. SoccerSim should keep the soccer principles, but express them as scored candidates and reusable queries.

The goal is not to port Cyrus. The goal is to preserve the reasons behind its choices.

---

## Core Translation Rule

Every Cyrus branch should be translated into one of three things:

| Cyrus pattern                       | SoccerSim equivalent                                         |
| ----------------------------------- | ------------------------------------------------------------ |
| "If this situation, do this action" | Candidate action with a high contextual score                |
| Magic threshold or margin           | Named query with tunable weight                              |
| Formation lookup result             | Spatial candidate scored against role, pressure, and support |

Hard gates should be rare. Use them only for impossible, illegal, or physically unsafe options: offside passes, out-of-bounds targets, unreachable balls, or shots blocked before leaving the foot.

Everything else should become a score.

---

## World Facts

EQS queries should not recalculate raw soccer context ad hoc. Build one shared world analysis layer per tick.

### Possession and Race Facts

- `selfInterceptSteps`: cycles until this player can reach the ball.
- `teamInterceptSteps`: best teammate intercept estimate.
- `opponentInterceptSteps`: best opponent intercept estimate.
- `ballOwner`: estimated current controller: self, teammate, opponent, none.
- `possessionConfidence`: confidence that the owner can keep or win the ball.
- `raceDelta`: opponent intercept steps minus teammate intercept steps.

### Pressure Facts

- `nearestOpponentDistance(position)`.
- `nearestOpponentReachSteps(position)`.
- `pressureAt(position)`: normalized pressure from nearby opponents.
- `tackleRiskAt(position)`: local danger if a player receives or carries there.
- `turnCost(player, targetAngle)`: cycles or penalty needed before useful movement.

### Space Facts

- `openSpaceAt(position)`: distance-weighted freedom from opponents.
- `voronoiControlAt(position)`: rough team control of the point.
- `passingLaneSafety(from, to)`.
- `shootingLaneQuality(from, target)`.
- `supportAngleToBallCarrier(position)`.
- `forwardProgress(from, to)`.

### Team Shape Facts

- `roleHomePosition(player, phase)`: baseline role anchor.
- `roleCorridor(player)`: allowed vertical/lateral band for the role.
- `teamCompactness`.
- `defensiveLineX`.
- `offsideLineX`.
- `dangerZoneCoverage`: coverage near own goal and central channels.

### Goal Threat Facts

- `canShootFrom(position)`.
- `goalAngleWidth(position)`.
- `goalieReachRisk(target)`.
- `opponentBlockRisk(from, target)`.
- `ownGoalDanger`: danger level of current ball state against us.

---

## Distillation Buckets

These buckets are a classification layer for extracted Cyrus behaviours. They are not new behaviours by themselves.

Use them to sort the old system's logic before translating it into EQS.

| Bucket | What it means in the old system | Evidence level |
| --- | --- | --- |
| World facts | Shared measurements used by decisions: intercept steps, pressure, open space, offside line, goal angle | Strong |
| Decision actions | Phase/context decisions such as offense, defense, normal, contest, or special game mode | Strong |
| Executive actions | Ball-use actions: shoot, pass, dribble, hold, clear, tackle/intercept execution | Strong |
| Prep actions | Off-ball actions that prepare a later ball action, mainly receiving/unmarking for passes | Strong for pass receiving, weak elsewhere |
| Positioning actions | Role/home/shape movement and spatial occupation when not directly executing on the ball | Strong |
| Defensive actions | Pressing, blocking, marking, covering, tackling, intercepting, keeper defense | Strong |

Candidate generation should be broad and cheap. Scoring should decide.

### Executive Actions

| Candidate     | Source principle                                                   | Generator                                            |
| ------------- | ------------------------------------------------------------------ | ---------------------------------------------------- |
| `Shoot`       | Cyrus shoot generator samples goal targets and scores reachability | Sample target points across goal mouth when in range |
| `DirectPass`  | Pass to receiver's current/inertia position                        | For each legal receiver, estimate receive point      |
| `LeadPass`    | Pass into space around receiver                                    | Sample angles and distances around receiver          |
| `ThroughPass` | Pass behind defense into exploitable space                         | Sample forward spaces beyond defensive line          |
| `Dribble`     | Short dribble generator samples 16 directions                      | Sample directions, simulate short carry path         |
| `HoldBall`    | Retain possession under pressure                                   | Candidate when no progressive option is safe         |
| `ClearBall`   | Emergency territorial relief                                       | Candidate when own goal danger is high               |

### Prep Actions

The old system's clearest prep action is pass-receiving preparation. Do not generalize this bucket to every executive action without source evidence.

| Classification label | Source principle | Generator |
| --- | --- | --- |
| `SupportRun` | Receiver movement that creates a usable pass angle | Sample around role corridor and ball carrier |
| `UnmarkRun` | Cyrus unmark samples positions and scores pass quality plus separation | Sample 2-7 units around current position and role lane |
| `AttackSpace` | Lead/through receiving point created ahead of the current receiver | Sample behind midfield/defensive line when safe |

### Positioning Actions

| Candidate      | Source principle                          | Generator                       |
| -------------- | ----------------------------------------- | ------------------------------- |
| `StretchWidth` | Preserve wide outlet and defensive spread | Sample wide corridor anchors    |
| `RecoverShape` | Return toward role home position          | Candidate always available      |
| `CoverZone`    | Formation and defensive positioning       | Target uncovered important zone |

### Defensive Actions

| Candidate         | Source principle                                           | Generator                                        |
| ----------------- | ---------------------------------------------------------- | ------------------------------------------------ |
| `Intercept`       | Basic move prioritizes interception when race is favorable | Target predicted ball point                      |
| `PressBall`       | Role-aware pressing margins in basic move                  | Target opponent carrier with pressure angle      |
| `BlockLane`       | Basic block predicts opponent dribble path                 | Target lane between carrier and dangerous space  |
| `MarkReceiver`    | Deny likely pass option                                    | Target receiver-side marking position            |
| `OffsideTrapStep` | Cyrus can trigger trap in specific defensive contexts      | Step line forward only when coordinated and safe |

### Goalkeeper Actions

| Candidate             | Source principle                                       | Generator                               |
| --------------------- | ------------------------------------------------------ | --------------------------------------- |
| `KeeperSetLine`       | Position on line between ball and goal reference point | Clamp on keeper defend line             |
| `KeeperChase`         | Chase when ball enters reachable penalty trajectory    | Target ball intercept point             |
| `KeeperBlockShot`     | React to confirmed shot path                           | Target projected goal-line intersection |
| `KeeperRecoverCenter` | Correct X/Y/body angle when no emergency               | Target optimal set position             |

### Decision Actions

Decision actions do not directly move a player. They choose the context that changes how candidates are scored.

| Decision | Source principle | Effect |
| --- | --- | --- |
| `Attack` | Our team reaches or controls the ball first | Raises progress, support, and shot-access weights |
| `Defense` | Opponent reaches or controls the ball first | Raises pressure, cover, and goal-protection weights |
| `TransitionToAttack` | We have just won the ball | Raises secure possession and fast forward outlet weights |
| `TransitionToDefense` | We have just lost the ball | Raises counter-press, lane blocking, and recovery weights |
| `Contest` | Ball is loose or race is close | Raises intercept, second-ball, and compact support weights |

## Query Library

The same query functions should score many different candidates. This keeps the system explainable and prevents every behaviour from becoming its own rule tree.

### Safety Queries

- `receiverBeatsOpponent`: receiver reaches pass before nearest opponent.
- `carrierSurvivesPressure`: dribble or hold path avoids tackle windows.
- `laneAvoidsInterception`: ball path remains outside opponent reach.
- `actionAvoidsOwnGoalDanger`: option does not create dangerous central turnover.
- `legalAndInBounds`: target obeys field, offside, and role constraints.

### Progress Queries

- `advancesBall`: candidate moves ball toward opponent goal.
- `improvesShotAccess`: resulting state increases shooting angle or range.
- `breaksLine`: candidate bypasses a defensive line.
- `entersValuableSpace`: candidate reaches open space in an advanced zone.

### Control Queries

- `keepsPossession`: team likely controls the next state.
- `reducesOpponentControl`: defensive candidate lowers opponent options.
- `improvesTeamShape`: movement keeps spacing, compactness, and role balance.
- `supportsBallCarrier`: off-ball candidate creates useful nearby outlet.

### Pressure Queries

- `appliesImmediatePressure`: defender can constrain ball carrier quickly.
- `blocksDangerousLane`: candidate sits between opponent and high-value target.
- `coversCentralDanger`: position protects central route to goal.
- `forcesBackwardOption`: pressure shape reduces forward opponent choices.

### Execution Queries

- `lowTurnCost`: action is aligned with current body direction.
- `lowStaminaCost`: action does not overspend stamina for marginal value.
- `fastArrival`: player can reach target quickly.
- `stableChoice`: avoids oscillating away from a recently selected good target.

---

## Phase Weighting

Behaviour trees should choose the phase. EQS should choose the action within that phase.

### Attack Phase

Increase weights for:

- `improvesShotAccess`
- `breaksLine`
- `supportsBallCarrier`
- `receiverBeatsOpponent`
- `entersValuableSpace`

Decrease weights for:

- speculative pressing
- deep defensive compactness
- low-value sideways recovery

### Defense Phase

Increase weights for:

- `coversCentralDanger`
- `blocksDangerousLane`
- `appliesImmediatePressure`
- `reducesOpponentControl`
- `actionAvoidsOwnGoalDanger`

Decrease weights for:

- risky forward support
- wide attacking width
- long possession chains

### Transition to Attack

Increase weights for:

- `keepsPossession`
- `fastArrival`
- `receiverBeatsOpponent`
- `advancesBall`
- `supportsBallCarrier`

The first pass after a regain should prefer secure forward progress over maximum ambition.

### Transition to Defense

Increase weights for:

- `appliesImmediatePressure`
- `blocksDangerousLane`
- `fastArrival`
- `coversCentralDanger`

The first defensive action after losing the ball should buy time for shape recovery.

---

## Distilled Behaviour Modules

### 1. Situation Detection

Cyrus detects Normal, Offense, and Defense mainly from intercept comparisons. SoccerSim should preserve that principle:

```text
if our team reaches ball clearly first -> Attack
if opponent reaches ball clearly first -> Defense
otherwise -> Transition/Contest
```

This is phase selection, not action selection. Avoid letting phase logic directly choose pass, press, or movement.

### 2. Role Positioning

Cyrus relies heavily on formation lookup tables. SoccerSim should treat role positions as anchors, not destinations.

Position candidates should score:

- closeness to role corridor
- open space
- pass support angle
- coverage of dangerous zones
- distance from nearest opponent
- compactness with nearby teammates
- forward/backward phase bias

The principle is: role gives responsibility, EQS chooses the exact point.

### 3. Passing

Cyrus pass logic is strongest as a generator, not as a final decider.

Keep:

- direct, lead, and through pass categories
- receiver reach vs opponent reach
- offside filtering
- out-of-bounds filtering
- dangerous backpass penalty
- preference for passes that move toward goal

Translate to EQS:

- Generate many legal pass candidates.
- Score safety first, then progress, then tactical value.
- Let a safe simple pass beat a flashy through ball when possession risk is high.

### 4. Shooting

Cyrus shooting is already close to EQS: sample targets, score goalie reach, opponent reach, one-kick feasibility, and target geometry.

Keep:

- sampled goal-mouth targets
- shot availability threshold
- goalie reach risk
- opponent block risk
- one-touch bonus

Translate to EQS:

- A shot should win when its expected goal threat beats the best pass or dribble continuation.
- Bad shots should remain candidates but score below continuation.

### 5. Dribbling

Cyrus samples directions, filters unsafe zones, simulates movement, and checks opponent reach.

Keep:

- sampled dribble directions
- stricter forward angle in own half
- path safety simulation
- opponent uncertainty buffer

Translate to EQS:

- Dribble is not "carry forward"; it is "move the ball into a better controlled state."
- In own half, safety dominates.
- In opponent half, line-breaking and shot access gain weight.

### 6. Unmarking and Support

Cyrus unmarking combines pass prediction, opponent distance, turn cost, forward bias, and short-term target caching.

Keep:

- local sample positions
- separation from opponents
- pass receive quality
- forward direction bonus
- oscillation control
- stamina and role gating

Translate to EQS:

- Off-ball attackers should move where they can receive before defenders can close.
- Support positions should be stable for a few ticks unless the world changes sharply.

### 7. Blocking and Pressing

Cyrus block behaviour predicts opponent dribble paths and assigns the first teammate able to stop the route.

Keep:

- predicted opponent carry path
- central danger preference
- nearest capable defender selection
- role-aware pressing margin

Translate to EQS:

- Pressing scores high when arrival is fast and cover exists behind.
- Blocking scores high when the opponent has a dangerous forward route.
- A defender should not abandon central cover for low-impact pressure.

### 8. Goalkeeper

Cyrus goalkeeper logic is appropriately special. Keep it more constrained than outfield logic.

Keep:

- line between ball and goal as set-position principle
- penalty-area chase trigger
- shot-path interception
- emergency priority over shape correction

Translate to EQS:

- Keeper candidates may use harder gates than outfield players.
- The keeper's main scoring split is emergency save value vs positional readiness.

---

## Initial Implementation Order

Build the sim in this order:

1. World facts: intercept steps, pressure, lanes, goal angle, offside line.
2. Candidate schema: common shape for action type, actor, target, score details.
3. Generic EQS scorer: weighted query list with debug breakdown.
4. On-ball actions: shoot, direct pass, lead pass, dribble, hold.
5. Defensive actions: intercept, press, block lane, cover zone.
6. Role positioning: replace static home movement with scored support/cover points.
7. Goalkeeper: set line, chase, block shot.
8. Behaviour tree phases: attack, defense, transition.

Each step should render debug output before adding the next. The most important UI is not the match view; it is the score breakdown explaining why an agent chose an action.

---

## Debug Requirements

Every chosen action should expose:

- candidate type
- final score
- top positive query contributions
- top negative query contributions
- rejected hard gates, if any
- phase weights active at decision time
- nearest competing candidate and why it lost

If the sim cannot explain a choice in one panel, the EQS layer is too opaque.

---

## Non-Goals for First Build

- No neural network pass prediction.
- No full RoboCup server physics.
- No set pieces beyond basic reset states.
- No Cyrus formation table port.
- No long-tail edge-case clone.
- No hardcoded priority tree for normal open play.

The first build should be small enough to reason about, but structured enough that better soccer can be added without rewriting the decision model.

---

## Design Principle

The durable lesson is:

> Choose the action that improves the next controllable state, not merely the action that looks best right now.

That means every candidate should be judged by the state it creates:

- Who reaches the ball next?
- Can our player use the ball after receiving?
- Does the option reduce or increase pressure?
- Does it open goal access?
- Does it preserve team shape?
- Does it expose our goal if it fails?

Cyrus often encodes these answers as branches. SoccerSim should encode them as queries.
