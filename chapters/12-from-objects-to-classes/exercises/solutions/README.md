# Chapter 12 - Worked solutions

*Read this in: **English** | [Español](README.es.md)*

## 1 - Guided: three balls, one blueprint

Console session (after loading the chapter snapshot):

```js
const b1 = new Ball(); b1.launch(400, 0);
const b2 = new Ball(); b2.launch(800, 0);
const b3 = new Ball(); b3.launch(1500, 0);
for (let i = 0; i < 60; i++) { b1.integrate(1/60); b2.integrate(1/60); b3.integrate(1/60); }
console.log(b1.x, b2.x, b3.x);   // 580, 980, 1680
```

Each ball traveled `x = 180 + v × 1s`: distances of 400, 800, and 1500 px - so yes, the fastest went **exactly** 3.75× farther (1500/400) than the slowest. The subtle point the question fished for: gravity had *no say in this*. It accelerated every ball's `vy` identically (all three ended with `vy = 1800`), but horizontal and vertical motion are independent - `integrate`'s `x` line never mentions gravity. That independence is why projectile arcs are parabolas, and why your aiming intuition from Chapter 8 works. (The three balls are also, incidentally, now below the floor - we integrated pure physics with no `collideBounds`; the harness does exactly this kind of isolated-piece testing.)

## 2 - Independent: `openingWidth`

```js
  /**
   * Width of the corridor a ball's center can score through.
   * @param {number} ballRadius the ball's radius in px
   * @returns {number} pixels between the two isScore insets
   */
  openingWidth(ballRadius) {
    return (this.backX - this.frontX) - 2 * (ballRadius * 0.4);
  }
```

Logged at boot: `console.log("scoring corridor:", hoop.openingWidth(ball.radius));` → **`60.4`** (74 between the lips, minus 2 × 6.8 of inset). Two things to check against your version: the method asks for the radius as a *parameter* instead of reaching for a global `ball` - the hoop shouldn't need to know a particular ball exists (it already takes the ball as a parameter in `collide`, same principle); and the `0.4` literals now exist in two places (`isScore` and here), which is exactly the kind of duplication that would justify promoting `0.4` to CONFIG if this method were real game code rather than an exercise probe.

## 3 - Stretch: your own `InputController`

There's no single correct answer - the exercise is the *diff*. A solid attempt looks like:

```js
class InputController {
  constructor(canvas, ball) {
    this.canvas = canvas;
    this.ball = ball;
    this.isCharging = false;
    this.chargeStart = 0;
    this.aimX = 0;
    this.aimY = 0;
    canvas.addEventListener("pointerdown", (e) => this.#start(e));
    canvas.addEventListener("pointermove", (e) => this.#move(e));
    canvas.addEventListener("pointerup", () => this.#release());
    canvas.addEventListener("pointercancel", () => { this.isCharging = false; });
  }
  #toWorld(e) { /* Chapter 8's conversion, with this.canvas */ }
  #start(e) { /* gate, capture, stamp chargeStart, set aim */ }
  #move(e) { /* update aim while charging */ }
  #release() { /* compute shot, call... what, exactly? */ }
  power() { /* Chapter 8's, with this.chargeStart */ }
  launchVelocity() { /* Chapter 8's, with this.aim / this.ball */ }
}
```

When you read Chapter 13, expect these differences - each has a reason worth finding:

1. **`#release` calls `shoot(...)` directly in most first attempts** - which means your InputController *knows about the game's rules*. The answer key instead receives an `onLaunch` callback in its constructor and calls that: input knows how to detect a shot, the Game decides what a shot *means*. (Chapter 13 names this Dependency Inversion.)
2. **The `state !== "ready"` gate** - your version probably reads the global `game`. The answer key receives a `canAim` *function* and asks it. Same principle: the controller asks permission without knowing who grants it.
3. **The arrow functions in the listeners** - if you wrote `canvas.addEventListener("pointerdown", this.#start)` you hit Chapter 12's detached-method TypeError the moment you clicked. The arrows (`(e) => this.#start(e)`) capture `this` from the constructor. If you found that bug yourself, you learned this chapter's hardest lesson the honest way.
