# Chapter 8 - Worked solutions

*Read this in: **English** | [Español](README.es.md)*

Each solution shows the exact change against [`../../snapshot/index.html`](../../snapshot/index.html).

## 1 - Guided: the aim line

A new draw function:

```js
/** Faint line from the ball to the pointer while aiming. */
function drawAimLine() {
  ctx.strokeStyle = "rgba(242,234,216,0.25)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(ball.x, ball.y);
  ctx.lineTo(input.aimX, input.aimY);
  ctx.stroke();
}
```

And in `frame`:

```js
  if (input.isCharging) {
    drawAimLine();
    drawTrajectoryPreview();
    drawPowerBar(power());
  }
```

**Where and why:** inside the `if (input.isCharging)` block because `aimX`/`aimY` only mean something during a hold - outside it they're stale leftovers from the last gesture. And *first* in the block, so the preview dots draw on top of the line rather than under it (painter's algorithm, still earning its keep).

## 2 - Independent: power as text

```js
/**
 * Print the charge percentage beside the gauge.
 * @param {number} charge 0..1 charge fraction
 */
function drawPowerText(charge) {
  ctx.fillStyle = "rgba(242,234,216,0.8)";
  ctx.font = "14px monospace";
  ctx.fillText(Math.round(charge * 100) + "%", CONFIG.powerBar.x, CONFIG.powerBar.top - 10);
}
```

Called next to its sibling:

```js
    drawPowerBar(power());
    drawPowerText(power());
```

Details that matter: `Math.round` because `47.99999%` breaks the illusion; positioned off `CONFIG.powerBar` so moving the gauge in CONFIG moves the label with it (never let two related things be positioned by unrelated numbers); monospace so the label doesn't wobble as digits change width.

## 3 - Stretch: the sweet spot

```js
/** Finish the hold: fire the charged shot if the aim has a direction. */
function onPointerUp() {
  if (!input.isCharging) return;
  const released = power();
  if (released >= 0.78 && released <= 0.86) console.log("PERFECT");
  const shot = launchVelocity();
  input.isCharging = false;
  if (shot !== null) launchBall(shot.vx, shot.vy);
}
```

**Why `onPointerUp` and not `power()`:** `power()` is a *reporter* - it answers "how charged, right now?" and is called every frame by the gauge, the preview, and the launch rule. Put the sweet-spot check inside it and "PERFECT" prints sixty times a second mid-hold. `onPointerUp` is a *decider* - it runs exactly once, at the moment the player commits. Rules about *the moment of release* belong in the code that handles the release. Keeping reporters pure (no side effects, same answer for the same instant) and letting deciders decide is a division you'll meet again in Chapter 13 as the Single Responsibility Principle.

Note the `const released = power();` line: we read the power **once** and reuse the value. Calling `power()` twice (once for the check, once inside `launchVelocity`) would read the clock at two slightly different instants - harmless here, but the habit of "capture a moving value once, then reason about the copy" prevents real bugs in concurrent code later in your career.
