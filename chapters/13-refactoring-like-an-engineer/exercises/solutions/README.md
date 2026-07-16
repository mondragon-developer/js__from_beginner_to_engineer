# Chapter 13 — Worked solutions

*Read this in: **English** | [Español](README.es.md)*

Each solution shows the exact change against [`../../snapshot/index.html`](../../snapshot/index.html).

## 1 — Guided: theming the rim

In `Renderer`:

```js
  /**
   * @param {boolean} celebrating true right after a made basket
   * @returns {string} the rim's stroke color
   */
  #rimColor(celebrating) {
    return celebrating ? "#7CFC00" : "#e23d28";
  }
```

And `#drawHoopFront`'s first paint line becomes:

```js
    ctx.strokeStyle = this.#rimColor(hoop, celebrating);
```

— wait, no: `this.#rimColor(celebrating)`. (That deliberate stumble is the lesson in miniature: when you extracted the method, the *only* information it needed was `celebrating` — the hoop's geometry has nothing to do with its color. Extracting forces you to notice what a computation actually depends on.)

Changing the celebration color was then one edit inside one private method whose name says exactly what it owns. The class didn't just *allow* "one place" — its structure made anything else feel wrong. That feeling is the payoff of the whole chapter.

## 2 — Independent: the FPS counter

The version that keeps the Game's signature clean — Renderer tracks its own time:

```js
  constructor(canvas) {
    this.ctx = canvas.getContext("2d");
    this.lastDrawTime = 0;
  }

  /** Draw the frames-per-second readout in the top-right corner. */
  #drawFps() {
    const now = performance.now();
    const fps = this.lastDrawTime === 0 ? 0 : 1000 / (now - this.lastDrawTime);
    this.lastDrawTime = now;
    this.ctx.fillStyle = "rgba(242,234,216,0.5)";
    this.ctx.font = "12px monospace";
    this.ctx.fillText(String(Math.round(fps)), CONFIG.world.width - 34, 20);
  }
```

…called last in `draw`, so it renders on top.

**The trade-off, honestly:** this version makes the Renderer *impure* — it now carries state (`lastDrawTime`) and reads a clock, so calling `draw` twice per frame would report nonsense FPS. The alternative (pass `dt` into `draw`) keeps the Renderer a pure state-to-pixels function but widens a signature that four other arguments already crowd, for a debug feature. Either sentence is a fine justification; what matters is that you *wrote* one. The finished game, for what it's worth, ships no FPS counter — the third option, "don't", is also engineering.

## 3 — Stretch: `KeyboardController`

```js
/** Space held = charge; arrow keys nudge the aim point; release Space to fire. */
class KeyboardController {
  /**
   * @param {HTMLCanvasElement} canvas unused, kept for contract parity
   * @param {Ball} ball aiming starts from wherever it sits
   * @param {() => boolean} canAim
   * @param {(vx: number, vy: number) => void} onLaunch
   */
  constructor(canvas, ball, canAim, onLaunch) {
    this.ball = ball;
    this.canAim = canAim;
    this.onLaunch = onLaunch;
    this.isCharging = false;
    this.chargeStart = 0;
    this.aimX = 0;
    this.aimY = 0;

    window.addEventListener("keydown", (e) => this.#keyDown(e));
    window.addEventListener("keyup", (e) => this.#keyUp(e));
  }

  #keyDown(e) {
    if (e.code === "Space" && !this.isCharging && this.canAim()) {
      this.isCharging = true;
      this.chargeStart = performance.now();
      this.aimX = this.ball.x + 80;   // default: up-and-right
      this.aimY = this.ball.y - 80;
    }
    if (!this.isCharging) return;
    if (e.code === "ArrowUp") this.aimY -= 8;
    if (e.code === "ArrowDown") this.aimY += 8;
    if (e.code === "ArrowLeft") this.aimX -= 8;
    if (e.code === "ArrowRight") this.aimX += 8;
  }

  #keyUp(e) {
    if (e.code !== "Space" || !this.isCharging) return;
    const shot = this.launchVelocity();
    this.isCharging = false;
    if (shot !== null) this.onLaunch(shot.vx, shot.vy);
  }

  power() { /* identical to InputController's */ }

  launchVelocity() { /* identical to InputController's */ }
}
```

**Lines changed outside the new class: one.** In `Game`'s constructor:

```js
    this.input = new KeyboardController(
```

Everything else — the preview, the power bar, the `canAim` gate, the launch pipeline — works unchanged, because the Renderer reads `input.isCharging`/`input.power()`/`input.launchVelocity()` and the Game supplied the same two callbacks. That's Dependency Inversion cashing its check: the Game depends on a *shape* (four constructor arguments, three readable members), and anything with that shape slots in.

Honest footnotes, because a sketch should confess its edges: `power()` and `launchVelocity()` being *identical* in both controllers is duplication — a real codebase might extract a shared base class or helper; the `canvas` parameter goes unused (kept for contract parity — defensible, but a smell worth noticing); and key events on `window` mean the controller fires even when the page has focus elsewhere in an embedded context. Every one of these is the kind of note you'd now write in a code review — which is rather the point of the course you're two chapters from finishing.
