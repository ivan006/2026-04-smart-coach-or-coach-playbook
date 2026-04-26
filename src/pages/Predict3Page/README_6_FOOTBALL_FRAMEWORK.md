# Football as a Simple Framework

> A child-readable model of football intelligence that can later become EQS.

Football looks complicated because 22 players are moving at once. But most good decisions come from a few simple questions.

The player is always asking:

1. Who has the ball?
2. Where is the danger?
3. Where is the space?
4. Who can get there first?
5. What happens after this move?

That is the whole game.

---

## The Four Moments

Every moment in football belongs to one of four situations.

| Moment | Meaning | Main job |
| --- | --- | --- |
| We have the ball | Our team controls play | Create a better chance |
| They have the ball | Opponent controls play | Protect our goal |
| We just won it | Ball changed to us | Keep it and move forward |
| We just lost it | Ball changed to them | Slow them down fast |

Everything else is detail.

---

## The Three Treasures

A football team is always fighting over three treasures.

### 1. The Ball

The ball matters because only the ball can score.

Good questions:

- Can I reach it first?
- Can my teammate reach it first?
- Can the opponent reach it first?
- If I get it, can I keep it?

### 2. Space

Space is where good things can happen before pressure arrives.

Good questions:

- Where is nobody standing?
- Where can a teammate receive safely?
- Where can we move before defenders close us down?
- Which space helps us get closer to goal?

### 3. Goal

The goal gives direction to everything.

Good questions:

- Are we protecting our goal?
- Are we getting closer to their goal?
- Is there a path to shoot?
- If we lose the ball here, are we in trouble?

---

## The Five Simple Jobs

Every player is doing one of five jobs.

| Job | Simple meaning | Example |
| --- | --- | --- |
| Get the ball | Win or recover it | Intercept, tackle, chase |
| Keep the ball | Do not lose it cheaply | Hold, safe pass, shield |
| Move the ball | Improve the team's position | Pass, dribble, clear |
| Help the ball | Make life easier for the teammate with it | Support run, unmark |
| Protect the goal | Stop the opponent from hurting us | Press, block, cover, mark |

Players can switch jobs many times in a few seconds.

---

## The Six Buckets

These buckets are labels for sorting the old system's ideas.

They should not add new football ideas by themselves. They only help us name what the old system already does.

| Bucket | Simple meaning | Examples |
| --- | --- | --- |
| World facts | What is true right now | Ball position, pressure, open space, who arrives first |
| Decision actions | Choosing the situation | Attack, defend, normal, contest |
| Executive actions | Doing something with the ball | Shoot, pass, dribble, hold, clear |
| Prep actions | Getting ready before the ball comes | Mostly unmarking and receiving for passes |
| Positioning actions | Standing in the right place for the team | Keep shape, cover space, stretch width |
| Defensive actions | Stopping the opponent | Press, block, mark, intercept, recover |

The important rule is: first extract the old behaviour, then place it in a bucket.

Do not create a new behaviour just because a bucket exists.

---

## The Golden Question

The best football question is:

> Does this move make the next moment better for us?

Not:

- Can I kick it forward?
- Can I run fast?
- Can I do something exciting?

But:

- After I do this, who gets the ball?
- Are we safer?
- Are we closer to scoring?
- Did we create space?
- Did we remove danger?

Good football is choosing the next better moment.

---

## When We Have the Ball

The team should think in this order:

1. Can we score?
2. Can we create a better chance?
3. Can we move forward safely?
4. Can we keep the ball?
5. If all else fails, can we avoid danger?

### Simple Attacking Rules

- Shoot if the goal is open enough.
- Pass if a teammate can receive safely.
- Dribble if carrying the ball creates a better next moment.
- Hold if rushing would lose the ball.
- Move without the ball to become useful.

### What "Useful" Means

A useful teammate is:

- far enough from defenders
- close enough to receive
- in a good angle from the ball
- not blocking another teammate
- able to do something after receiving

---

## When They Have the Ball

The team should think in this order:

1. Is our goal in danger?
2. Can we win the ball?
3. Can we slow the opponent down?
4. Can we block the dangerous path?
5. Can we recover our shape?

### Simple Defending Rules

- Press if you can arrive fast and teammates cover behind you.
- Block if the opponent has a dangerous path forward.
- Mark if a receiver is about to become dangerous.
- Cover if nobody is protecting an important space.
- Retreat if charging forward would open our goal.

Good defending is not always chasing the ball. Sometimes the best defender protects the place the ball wants to go.

---

## When We Just Won the Ball

This is transition to attack.

The first question is:

> Can we keep it?

Then:

- Can we pass forward safely?
- Can we dribble into space?
- Can we find the teammate who is already free?
- Can we attack before the opponent gets organized?

The first move after winning the ball should usually be simple and clean.

---

## When We Just Lost the Ball

This is transition to defense.

The first question is:

> Can we stop the opponent's first good move?

Then:

- Can we press the ball quickly?
- Can we block the forward pass?
- Can we protect the middle?
- Can we slow them down until teammates recover?

The first move after losing the ball is about buying time.

---

## The Player's Little Brain

Every player can use the same tiny decision loop:

```text
Look:
  Who has the ball?
  Where are teammates?
  Where are opponents?
  Where is the goal?

Imagine:
  What could I do?
  What could happen next?

Choose:
  Which option makes the next moment best for us?

Move:
  Do it, then look again.
```

This loop runs again and again.

---

## Turning This Into EQS

EQS is just a way for the computer to answer the simple questions with numbers.

| Simple question | EQS version |
| --- | --- |
| Who can get there first? | Intercept/reach score |
| Is this space safe? | Pressure score |
| Does this move help us attack? | Progress score |
| Does this move protect our goal? | Danger reduction score |
| Can my teammate use the ball after receiving? | Next-state control score |
| Am I doing my role's job? | Role fit score |

The computer should not start with "pass" or "dribble" as fixed rules. It should create options, score them, and pick the one that makes the next moment better.

---

## The SoccerSim Decision Stack

The framework becomes code like this:

```text
Moment:
  Are we attacking, defending, winning it, or losing it?

Job:
  What should this player care about right now?

Options:
  What actions are possible?

Scores:
  Which option wins the simple football questions?

Action:
  Do the best option.
```

This keeps the game understandable:

- Moment explains the team situation.
- Job explains the player's responsibility.
- Options explain what the player could do.
- Scores explain why one option won.
- Action is the visible result.

---

## The One-Sentence Version

Football intelligence is:

> Know who controls the ball, protect your goal, find useful space, and choose the move that makes the next moment better.

Everything in SoccerSim should grow from that sentence.
