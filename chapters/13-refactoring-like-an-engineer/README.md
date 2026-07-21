# Chapter 13 - Refactoring Like an Engineer

*Read this in: **English** | [Español](README.es.md)*

Chapter 12 rehearsed the mechanics on the two easiest seams. Today the whole architecture arrives: **twenty-seven top-level functions become zero**, absorbed into `InputController`, `Renderer`, `Scoreboard`, `PlayerPanel`, and a `Game` class that composes everything. And instead of lecturing you five abstract principles, this chapter teaches each **SOLID** principle at the exact line of the refactor that demonstrates it. By the end, your code *is* the finished game's architecture - the diff to the answer key is one storage class, and Chapter 14 writes it.

**Time**: ~2 hours. The biggest chapter - take a break at Step 4.

## What you'll build in this chapter

Five classes and a one-line boot. Measured from the real snapshots: Chapter 12's file had **27 top-level functions** sharing 6 globals; this chapter's has **0** - seven classes, 924 lines, and a boot that reads `new Game(document.getElementById("court"))`. The visible outcome, honestly framed as in Chapter 12: the game plays identically (the harness re-certifies every milestone), and the payoff is demonstrated *live* in the Experiment corner - changes that used to mean a hunt now mean one line in one obvious home.

## New concepts

- **SOLID** - five principles, each taught at its moment below
- **composition root** - the one place that builds and wires everything
- **callbacks as contracts** - `canAim` / `onLaunch`
- **arrow functions and `this`** - the cure for Chapter 12's detached-method error

The full code is in the [snapshot](snapshot/index.html); each step below shows the load-bearing lines and names what moved. Work class by class, **deleting each function as its class absorbs it** - at no point should a behavior exist twice.

## Build it, step by step

### Step 1 - `InputController` (and the "D" of SOLID)

Absorbs: the `input` object, `toWorld`, the three handlers, `power`, `launchVelocity`. The constructor is the interesting part:

```js
class InputController {
  /**
   * @param {HTMLCanvasElement} canvas the surface receiving gestures
   * @param {Ball} ball read-only reference: aiming starts from wherever it sits
   * @param {() => boolean} canAim tells us whether aiming is allowed now
   * @param {(vx: number, vy: number) => void} onLaunch fired on release
   */
  constructor(canvas, ball, canAim, onLaunch) {
    this.canvas = canvas;
    this.ball = ball;
    this.canAim = canAim;
    this.onLaunch = onLaunch;
    this.isCharging = false;
    this.chargeStart = 0;
    this.aimX = 0;
    this.aimY = 0;

    canvas.addEventListener("pointerdown", (e) => this.#start(e));
    canvas.addEventListener("pointermove", (e) => this.#move(e));
    canvas.addEventListener("pointerup", () => this.#release());
    canvas.addEventListener("pointercancel", () => { this.isCharging = false; });
  }
```

Look at what this class does **not** know. It never reads `game.state` - it asks `this.canAim()`. It never calls `shoot` - it announces `this.onLaunch(vx, vy)`. Whoever constructs it decides what those two mean.

> [!NOTE]
> **D - Dependency Inversion: depend on contracts, not on bosses.** The naive wiring points upward: input calls the game's `shoot`, so the input *depends on* the game - reuse it anywhere else and the game comes dragging along. Inverted, the controller declares two tiny contracts - "a function that says if I may" and "a function I call with a velocity" - and stays blissfully ignorant of who fulfills them. In the Experiment corner you'll pass it a fake `onLaunch` from the console and watch it happily serve a different master. That's the whole principle: **the detector of shots shouldn't know the meaning of shots.**

> [!WARNING]
> **Real error: the handler that loses itself.** Write the listeners "cleanly" as `canvas.addEventListener("pointerup", this.#release)` and the first release throws - we reproduced the family in Chrome 150; for a private method the message is the baffling `TypeError: Cannot read properties of undefined (reading ...)`, because the browser calls your method *detached*, with `this` as `undefined` (Chapter 12's cousin, now in the wild). The cure is the arrow: `() => this.#release()`. An arrow function has no `this` of its own - it *keeps the constructor's* - so the method always arrives home. Every listener in the finished game uses this pattern, and now you know the bug it prevents.

### Step 2 - `Renderer` (and the "S")

Absorbs all eight draw functions as private methods, plus `canvas.getContext`. One public method:

```js
  /**
   * Draw one complete frame.
   * @param {Ball} ball
   * @param {Hoop} hoop
   * @param {InputController} input
   * @param {boolean} celebrating true right after a made basket
   */
  draw(ball, hoop, input, celebrating) {
    this.#drawBackground();
    this.#drawCourt();
    this.#drawHoopBack(hoop);
    if (input.isCharging) {
      this.#drawTrajectoryPreview(ball, input);
      this.#drawPowerBar(input.power());
    }
    this.#drawBall(ball);
    this.#drawHoopFront(hoop, celebrating);
  }
```

The bodies are your chapters 7-10 drawing code with two mechanical changes: `ctx` becomes `this.ctx`, and the hoop methods read geometry from the `hoop` *parameter* (`hoop.frontX`, `hoop.rimY`) instead of CONFIG - resolving the inconsistency you poked in Chapter 12's Experiment corner: the Hoop object is now the single truth for where the hoop is, for physics *and* pixels.

> [!NOTE]
> **S - Single Responsibility: one class, one reason to change.** The Renderer only *reads* game state and writes pixels - no side effects, no rules; you could call `draw` twice per frame and nothing about the game would differ. `Ball` integrates but never draws. `InputController` detects but never decides. The test is the phrase "…and…": if describing a class needs one ("it draws the scene *and* updates records"), it's two classes in a trench coat. Every seam you've cut since Chapter 5's `drawCourt`/`drawBall` split was this principle rehearsing.

### Step 3 - `Scoreboard` and `PlayerPanel` (and the "I")

`Scoreboard` absorbs the five `getElementById`s for the panels plus `updateScoreboard`/`setStatus` - becoming `update(session, records)` and `status(text)`. `PlayerPanel` absorbs `addOption`/`playerExists`/`addPlayerFromInput` plus the select/input/button wiring, reporting upward through a single `onSelect` callback (Dependency Inversion again, second verse).

> [!NOTE]
> **I - Interface Segregation: small doors, not a loading dock.** The Game could poke at scoreboard DOM elements directly; instead it sees exactly two verbs - `update` and `status` - and the PlayerPanel offers exactly one event. Small public surfaces are why the harness can drive this entire game with a few stubs, and why Chapter 14 can swap storage without the Scoreboard ever hearing about it. When a class's public surface fits in one breath, its users stay honest.

### Step 4 - `Game`: the composition root

Absorbs: the `game` state object, `shoot`, `updateFlight`, `shotIsOver`, `collideBounds`, `newSession`/`endSession`/`switchPlayer`/`commit`, the frame loop, and every piece of boot wiring. Its constructor is the architecture, legible in one screen:

```js
class Game {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas) {
    this.ball = new Ball();
    this.hoop = new Hoop();
    this.renderer = new Renderer(canvas);
    this.scoreboard = new Scoreboard();

    /* All known players and their records - in memory only for now.
     * Chapter 14 replaces this object with a persistent PlayerStore. */
    this.savedPlayers = {};

    this.input = new InputController(
      canvas,
      this.ball,
      () => this.state === "ready",
      (vx, vy) => this.#shoot(vx, vy)
    );

    this.state = "ready";     // "ready" | "flight" | "sessionOver"
    this.scoredThisShot = false;
    this.celebrateUntil = 0;
    this.lastTime = 0;

    // Load known players; guarantee at least one profile exists
    const names = Object.keys(this.savedPlayers);
    if (names.length === 0) names.push("Player 1");
    this.playerPanel = new PlayerPanel(names, (name) => this.#switchPlayer(name));
    this.#switchPlayer(names[0]);

    document.getElementById("newSessionButton")
      .addEventListener("click", () => this.#newSession());

    requestAnimationFrame((t) => this.#frame(t));
  }
```

There they are - the two contracts from Step 1, fulfilled: `() => this.state === "ready"` *is* `canAim`; `(vx, vy) => this.#shoot(vx, vy)` *is* `onLaunch`. The rules stayed home; only the contracts traveled. And the last line wears Step 1's arrow armor: `requestAnimationFrame((t) => this.#frame(t))` - write `requestAnimationFrame(this.#frame)` instead and you get the detached-method TypeError on the very first frame (we reproduced it: `Cannot read properties of undefined (reading 'lastTime')`).

Everything else in `Game` is your chapters 10-11 logic with `game.` → `this.` and privates for the internals: `#shoot`, `#frame`, `#updateFlight`, `#collideBounds`, `#shotIsOver`, `#newSession`, `#endSession`, `#switchPlayer`, `#commit`. The public surface of the entire game is… its constructor. One door.

> [!NOTE]
> **O and L - the two principles you've already met.** **Open/Closed** (open to extension, closed to modification) is the Hoop's comment in the answer key: swap the hoop for a different obstacle class with the same `collide`/`isScore` surface and *no other line changes* - behavior extends without edits. **Liskov Substitution** - anything claiming a contract must be usable wherever the contract is expected, no surprises - gets its full moment in Chapter 14, when a persistent store and an in-memory store honor one identical interface and the Game genuinely cannot tell which one it's holding. Watch for it.

> [!WARNING]
> **Real error: construction order is dependency order.** In the constructor, try creating `this.input` *before* `this.ball` exists. Nothing complains at construction - `this.ball` is quietly `undefined` inside the controller - until the first press: `TypeError: Cannot read properties of undefined (reading 'x')` (reproduced). The composition root's ordering isn't style: each line may only use what the lines above created. Read your constructor top to bottom as a build schedule. - Same family: move the `<script>` to `<head>` and `Scoreboard`'s constructor gets `null`s, crashing later at `Cannot set properties of null (setting 'textContent')`. Chapter 3's oldest rule still stands guard.

### Step 5 - The boot shrinks to its final form

```js
/* ---------- Boot ---------- */
new Game(document.getElementById("court"));
```

**Checkpoint - the chapter's visible change:** the game plays exactly as before - and `node verify/verify.mjs 13` proves it: the snapshot passes the answer key's own battery, driven end-to-end through the real `Game` class (stubbed pointer events, stepped frames): same power curve, same rim physics, same **33/143** sweep, same session rules. **88 checks green.** Then run the Experiment corner: that's where this chapter's payoff becomes something you can *see*.

Your file should now match this chapter's [`snapshot/index.html`](snapshot/index.html) - 924 lines, and a diff against the answer key that is, almost entirely, one missing class.

## Why we did it this way

The map of what happened:

```
before (ch12)                        after (ch13)
──────────────                       ─────────────
CONFIG                               CONFIG
class Ball, class Hoop               class Ball, class Hoop
27 functions + 6 shared globals  →   class InputController   (gestures → contracts)
                                     class PlayerPanel       (player DOM → one event)
                                     class Renderer          (state → pixels)
                                     class Scoreboard        (two verbs to the DOM)
                                     class Game              (rules, loop, composition)
boot: wiring + entry point           boot: new Game(...)
```

Each class is a chapter of this course grown up: `InputController` is Chapter 8, `Renderer` is Chapters 7+10's drawing, `Scoreboard` is Chapter 10's DOM, `PlayerPanel` and the session methods are Chapter 11, `Game` is the state machine that has run everything since Chapter 10. That's the deepest lesson available here: **good architecture isn't imposed at the end - it's discovered along the seams that were always there.** The functions had the right names and the right boundaries for seven chapters; today they just got addresses.

## Experiment corner

1. **The payoff, live:** give the game a night-mode court - in `Renderer.#drawBackground`, swap the two gradient stops to `"#0a0f1c"` / `"#05080f"`. One method, one home, done. Now imagine the same request against Chapter 7's globals - you'd hunt every gradient in the file.
2. **Dependency Inversion, felt:** in the console, `new InputController(document.getElementById("court"), {x: 460, y: 270}, () => true, (vx, vy) => console.log("would fire:", Math.round(vx), Math.round(vy)))` - then charge and release on the canvas. The controller serves your fake master perfectly; it never needed the Game at all.
3. Break it on purpose: change the loop line to `requestAnimationFrame(this.#frame)` and reload. One frame, one TypeError, and a bug you'll now recognize for the rest of your career. Restore the arrow.

## Exercises

Worked solutions are in [`exercises/solutions/`](exercises/solutions/).

1. **Guided** - theme the rim: give `Renderer` a `#rimColor(celebrating)` private method and use it in `#drawHoopFront`. Then change the celebration color to `"#7CFC00"` in exactly one place. (The exercise is noticing how the class made "one place" the default outcome.)
2. **Independent** - an FPS counter: give `Renderer` a private frame-time tracker and draw `Math.round(1 / dt)` in a corner. Decide: does `draw` grow a `dt` parameter, or does the Renderer compute its own from `performance.now()`? Both work - justify your pick in a sentence. (One keeps the Renderer pure; one keeps the Game's signature clean. Welcome to real trade-offs.)
3. **Stretch** - sketch (code, but no need to fully wire) a `KeyboardController`: same constructor contract as `InputController` - `(canvas, ball, canAim, onLaunch)` - but Space held = charge, arrow keys = aim. The point of the exercise: *how much of the game needs to change to support it?* Count the lines outside the new class. (Spoiler in the solution: one.)

## Vocabulary

| English | Español |
|---|---|
| composition root | raíz de composición |
| dependency | dependencia |
| contract / interface | contrato / interfaz |
| arrow function | función flecha |
| single responsibility | responsabilidad única |
| public surface | superficie pública |
| wiring | cableado |

## What's next

One class is missing, and you know which: close the tab and the players vanish. In **Chapter 14** - the finale - `PlayerStore` brings localStorage with graceful degradation (the Liskov moment, delivered), you build a verification harness like the one that's been guarding you all course, and you **ship the game to a public URL**.

**[Continue to Chapter 14: Persistence, verification, and shipping →](../14-persistence-verification-shipping/README.md)**
