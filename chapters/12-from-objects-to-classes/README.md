# Chapter 12 — From Objects to Classes

*Read this in: **English** | [Español](README.es.md)*

Part IV begins. Your game works — ten shots, players, records, all of it — in ~700 lines of loose functions sharing globals. Nothing is *wrong* with it, and that's exactly why this chapter matters: today you change the code's **shape** without changing its **behavior**, and you *prove* the behavior held. `Ball` and `Hoop` become the course's first classes; the harness certifies, with strict equality, that they act identically to before. That proof — not the classes — is the lesson. **That is what refactoring means.**

**Time**: ~1 hour.

## What you'll build in this chapter

`class Ball` (state + motion) and `class Hoop` (geometry + collisions + basket detection), replacing the ball object literal and six loose functions. Expected visible outcome — stated honestly: **the game looks and plays exactly the same**, and the chapter celebrates that as its victory. The screen-visible proof is twofold: the harness output (every previous milestone green, plus new equivalence checks), and a 30-second console experiment where one blueprint builds two independent balls before your eyes.

## New concepts

- **`class`** — a blueprint for objects
- **`constructor` and `new`** — how a blueprint builds a house
- **`this`** — "the object this method was called on"
- **methods** — functions that live on the blueprint
- **`#private`** — fields and methods only the class itself can touch
- **refactoring** — changing structure while provably preserving behavior

## Build it, step by step

### Step 1 — Blueprints and houses (console first)

> [!NOTE]
> **A class is a blueprint; the object is the house.** An architect draws one blueprint; a builder raises twenty houses from it. Each house has the same *rooms* (properties) and the same *plumbing* (methods), but each has its own address, its own furniture, its own life. `class Ball { ... }` is the drawing. `new Ball()` is a construction crew. The ball object you've had since Chapter 6 was a house built by hand; today you draw the blueprint it was always secretly following.

Feel it before building it — paste into the console *after* finishing the chapter (or come back):

```js
const a = new Ball();
const b = new Ball();
b.launch(500, -900);
b.integrate(0.5);
console.log("a stayed home:", a.x, a.y, "— b flew:", Math.round(b.x), Math.round(b.y));
```

Two houses, one blueprint, independent lives. That's the entire idea.

### Step 2 — `class Ball`

Delete the `const ball = { ... }` literal, `integrateBall`, and `ballSpeed` — all three are absorbed. In their place:

```js
class Ball {
  constructor() {
    this.radius = CONFIG.ball.radius;
    this.reset();
  }

  /** Put the ball back on the free-throw spot, motionless. */
  reset() {
    this.x = CONFIG.ball.startX;
    this.y = CONFIG.ball.startY;
    this.vx = 0;
    this.vy = 0;
  }

  /**
   * Launch the ball with an initial velocity.
   * @param {number} vx horizontal speed in px/s
   * @param {number} vy vertical speed in px/s (negative = upward)
   */
  launch(vx, vy) {
    this.vx = vx;
    this.vy = vy;
  }

  /**
   * Advance the ball one time step using projectile motion.
   * @param {number} dt seconds elapsed since the last frame
   */
  integrate(dt) {
    this.vy += CONFIG.physics.gravity * dt; // gravity accelerates vy
    this.x += this.vx * dt;                 // position follows velocity
    this.y += this.vy * dt;
  }

  /** @returns {number} current speed in px/s */
  speed() {
    return Math.hypot(this.vx, this.vy);
  }
}

const ball = new Ball();
```

Compare `integrate` against the old `integrateBall` line by line: the *only* difference is `ball.` became `this.`. **`this`** means "the object this method was called on" — write `ball.integrate(dt)` and inside the method, `this` *is* that ball; write `otherBall.integrate(dt)` and it's the other one. The method travels with the house. Notice also the `constructor` calling `this.reset()` — a method the game needed anyway (`newSession` used four assignment lines for this; now it says `ball.reset()`). Blueprints surface the operations that were always there.

> [!WARNING]
> **Real error: forgetting `new`.** Call `Ball()` like a function and Chrome 150 answers:
>
> ```
> Uncaught TypeError: Class constructor Ball cannot be invoked without 'new'
> ```
>
> Kindest error in the language — it names the fix. (Its cousin bites harder: `const f = ball.integrate; f(0.016)` — passing a method around *detached from its object* — gives `TypeError: Cannot read properties of undefined (reading 'vy')`, because `this` is `undefined` when nobody's on the left of the dot. We reproduced both. Remember the detached one: Chapter 13 hits it for real inside `requestAnimationFrame`, and the arrow-function cure arrives there.)

### Step 3 — `class Hoop`, with private parts

Delete `collideRimPoint`, `collideBoard`, `collideHoop`, and `isScore`. The class version (full body in the [snapshot](snapshot/index.html) — it's Chapter 9's math, verbatim, re-homed):

```js
class Hoop {
  constructor() {
    const h = CONFIG.hoop;
    this.rimY = h.rimY;
    this.frontX = h.rimFrontX;
    this.backX = h.rimBackX;
    this.boardX = h.boardX;
    this.boardTop = h.boardTop;
    this.boardBottom = h.boardBottom;
  }

  /**
   * Bounce the ball off the two rim points and the backboard.
   * @param {Ball} ball the ball to test and correct
   */
  collide(ball) {
    this.#collideRimPoint(ball, this.frontX, this.rimY);
    this.#collideRimPoint(ball, this.backX, this.rimY);
    this.#collideBoard(ball);
  }

  #collideRimPoint(ball, px, py) { /* Chapter 9's circle collision, verbatim */ }

  #collideBoard(ball) { /* Chapter 9's directional wall, verbatim */ }

  isScore(ball, previousY) { /* Chapter 10's crossing detector, verbatim */ }
}

const hoop = new Hoop();
```

Two design choices to read closely. The constructor **copies its geometry out of CONFIG once** — the hoop *owns* where it is, and the rest of the game asks the hoop, not the config. And the `#` prefix makes `#collideRimPoint` and `#collideBoard` **private**: they're the *how*, callable only from inside the class. The outside world gets exactly two verbs — `collide(ball)` and `isScore(ball, previousY)` — the *what*. A class's public surface is a promise; its private parts are its business.

> [!WARNING]
> **Real error: touching a private from outside.** Try `hoop.#collideBoard(ball)` anywhere outside the class and the file **refuses to even run**:
>
> ```
> Uncaught SyntaxError: Private field '#collideBoard' must be declared in an enclosing class
> ```
>
> Note which error class: a *Syntax*Error, at parse time — not a runtime slap but a "this program is not valid" at load. Privacy in JavaScript isn't a convention (like the `_underscore` prefix you'll see in older code); since 2022 it's a language guarantee.

### Step 4 — The call sites (the whole diff)

Five touches, each one line, each reading *better* than before:

| Where | Before | After |
|---|---|---|
| `shoot` | `ball.vx = vx; ball.vy = vy;` | `ball.launch(vx, vy);` |
| `newSession` | four assignment lines | `ball.reset();` |
| `updateFlight` | `integrateBall(dt); collideHoop();` | `ball.integrate(dt); hoop.collide(ball);` |
| `updateFlight` | `isScore(previousY)` | `hoop.isScore(ball, previousY)` |
| `shotIsOver` | `ballSpeed()` | `ball.speed()` |

And one non-touch worth savoring: **`collideBounds` didn't change at all.** It reads `ball.x`, `ball.y`, `ball.radius` — and the class instance has exactly those fields. The refactor was invisible to every consumer that only read data. That's not luck; it's why we matched the field names.

### Step 5 — The proof

Refactoring without verification is just *hoping*. Run the harness (`node verify/verify.mjs 12`). Every milestone from chapters 6–11 re-passes on this snapshot — same sessions, same refusals, same **33/143** scoring sweep. And two new checks go further than "still works": they build a `Ball` from *your* class and a `Ball` from the answer key's, feed both identical inputs — 300 integration steps, four collision scenarios, a basket crossing — and compare positions and velocities with **strict `===`, not approximately**:

```
ok    ch12: equivalence — Ball behaves identically to the answer key's Ball
ok    ch12: equivalence — Hoop collisions and isScore identical to the answer key's
```

Bit-for-bit identical behavior, mechanically certified. Say the chapter's thesis once more, now that you've *done* it: refactoring means changing the structure while provably preserving the behavior. No proof, no refactor.

Your file should now match this chapter's [`snapshot/index.html`](snapshot/index.html).

## Why we did it this way

Why convert `Ball` and `Hoop` first, and only them? Because they were the code's **purest** seams: no DOM, no callbacks, no timers — just data and math. Converting them exercises every class mechanic (constructor, `this`, methods, privates) with zero entanglements, so if something breaks, the suspect list is one item long. Chapter 13 converts the entangled parts (input, rendering, DOM) — with today's mechanics already rehearsed. Ordering a refactor from purest to gnarliest is a professional instinct worth stealing; the other order multiplies unknowns.

## Experiment corner

1. Run Step 1's two-house experiment. Then try `a instanceof Ball` → `true`. The blueprint remembers its houses.
2. In the console: `hoop.rimY = 250` — it *works* (public fields are writable), and the rim's physics moves while its drawing doesn't (the Renderer still reads CONFIG — a real inconsistency Chapter 13 resolves by handing the Renderer the hoop). Reload to undo.
3. Break it on purpose: change `this.vy += ...` to `vy += ...` inside `integrate` and read the `ReferenceError`. Inside a method, there are no bare variables for the object's fields — `this.` is the address.

## Exercises

Worked solutions are in [`exercises/solutions/`](exercises/solutions/).

1. **Guided** — in the console, build three balls, `launch` them at 400, 800, and 1500 px/s straight right, `integrate` each 60 times with `1/60`, and print the three x positions. Before running: will the fastest be exactly ~3.75× farther than the slowest? (Gravity says something subtle here.)
2. **Independent** — give `Hoop` a public method `openingWidth()` that returns the scoring corridor's width — the distance between the lips *minus* the two `0.4 × radius` insets `isScore` uses (pass the ball's radius as a parameter). Log it at boot: it should say `60.4`.
3. **Stretch** — convert the `input` object plus `power`/`launchVelocity`/the three handlers into a `class InputController` *yourself*, before Chapter 13 shows you the answer key's. Requirements: the constructor receives the canvas and the ball; privates for what nobody else needs. Then read Chapter 13 and diff your design against the real one — where you differ, one of you has a reason. Find it.

## Vocabulary

| English | Español |
|---|---|
| class / instance | clase / instancia |
| blueprint | plano (de construcción) |
| constructor | constructor |
| method | método |
| private field | campo privado |
| public surface | superficie pública |
| refactoring | refactorización |
| equivalence | equivalencia |

## What's next

Two classes down, five to go. In **Chapter 13**, the whole architecture arrives: `InputController`, `Renderer`, `Scoreboard`, `PlayerPanel`, and `Game` as the composition root — and each SOLID principle taught at the exact moment the refactor demonstrates it. The loose functions disappear forever.

**[Continue to Chapter 13: Refactoring like an engineer →](../13-refactoring-like-an-engineer/README.md)**
