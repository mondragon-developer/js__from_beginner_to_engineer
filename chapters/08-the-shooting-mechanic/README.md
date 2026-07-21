# Chapter 8 - The Shooting Mechanic

*Read this in: **English** | [Español](README.es.md)*

Until now you've been a spectator. This chapter hands you the ball: **hold anywhere to charge** - a gauge fills green to red while a dotted arc predicts your shot - **aim with the pointer, release to fire**. One input API covers mouse *and* touch, and by the end you'll have taken your first real free throw. This is the chapter where the project starts being a game.

**Time**: ~1.5 hours.

## What you'll build in this chapter

The full hold-to-charge input: pointer events, screen-to-world coordinate conversion, a power function driven by real time, a launch-velocity rule (direction from aim, speed from charge), the vertical power gauge, and a trajectory preview that reuses the real physics - the preview never lies. Expected visual outcome: press, watch gauge and arc grow, release, and the ball flies exactly along the preview.

## New concepts

- **events and callbacks** - code that runs *when something happens*
- **Pointer Events** - one API for mouse, touch, and pen
- **the event object** - `e.clientX`, `e.pointerId`
- **screen vs world coordinates** - and the conversion between them
- **`performance.now()`** - a millisecond stopwatch
- **`null` as a deliberate answer** - "there is no shot"
- **`hsl()` colors** - hue as a number you can animate

## Build it, step by step

### Step 1 - CONFIG learns about input

Three new blocks (launch speeds join `physics`; `input` and `powerBar` are new):

```js
    minLaunchSpeed: 450,    // an instant tap still throws this hard
    maxLaunchSpeed: 1500    // a fully charged shot throws this hard
```

```js
  input: {
    chargeTime: 1.2,     // seconds of holding to reach full power
    previewSteps: 40,
    previewDt: 1 / 45
  },
  powerBar: { x: 26, top: 160, bottom: 460, width: 14 }
```

And the ball returns home - its object literal starts at `CONFIG.ball.startX / startY` with zero velocity. (It will settle the 25 px onto the floor at load; physics never sleeps in this chapter. Chapter 10's state machine gives the ball a proper "ready" pose.)

Also update the CSS - three lines that matter:

```css
  canvas {
    width: 100%;
    max-width: 920px;
    border-radius: 10px;
    touch-action: none;      /* the canvas owns all touch gestures */
    cursor: crosshair;
  }
```

`width: 100%` makes the canvas *display* at whatever size fits the window - which is why Step 3's math must exist - and `touch-action: none` is explained by its own Warning below.

### Step 2 - One gesture, as data

```js
const input = {
  isCharging: false,
  chargeStart: 0, // ms timestamp when the hold began
  aimX: 0,        // current pointer position, world coordinates
  aimY: 0
};
```

The entire gesture - is a hold in progress, since when, aimed where - is four values. Everything else in the chapter reads or writes this little object, which is exactly what will make it so easy to hand to a class in Chapter 13.

### Step 3 - Screen pixels are not world pixels

```js
/**
 * Convert a pointer event from screen pixels to world coordinates,
 * compensating for the canvas being scaled by CSS.
 * @param {PointerEvent} e
 * @returns {{x: number, y: number}}
 */
function toWorld(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = CONFIG.world.width / rect.width;
  const scaleY = CONFIG.world.height / rect.height;
  return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
}
```

The event reports where the pointer is **on the screen**; the game thinks in its own 920×540 **world**. Because the CSS now scales the canvas, those two disagree. `getBoundingClientRect()` measures where the canvas actually sits and how big it's *displayed*; dividing world size by displayed size gives the correction factor.

> [!WARNING]
> **Real error: aiming with raw screen coordinates.** Skip the scale factors - use `e.clientX - rect.left` directly - and everything works… *until the canvas isn't displayed at exactly 920 px wide.* Shrink the window so the canvas displays at 460 px and the numbers betray you: clicking on the rim (displayed at 363 px from the canvas's left edge) reports x = 363, but the rim *lives* at world x = 726. Every aim lands at half the distance you pointed. The fix is the two `scale` lines - and the habit is deeper: **whenever input coordinates meet game coordinates, ask which space each lives in.**

### Step 4 - The three moments of a gesture

```js
/**
 * A press anywhere on the court begins charging - power builds for
 * as long as the hold lasts.
 * @param {PointerEvent} e
 */
function onPointerDown(e) {
  const p = toWorld(e);
  canvas.setPointerCapture(e.pointerId);
  input.isCharging = true;
  input.chargeStart = performance.now();
  input.aimX = p.x;
  input.aimY = p.y;
}

/** @param {PointerEvent} e */
function onPointerMove(e) {
  if (!input.isCharging) return;
  const p = toWorld(e);
  input.aimX = p.x;
  input.aimY = p.y;
}

/** Finish the hold: fire the charged shot if the aim has a direction. */
function onPointerUp() {
  if (!input.isCharging) return;
  const shot = launchVelocity();
  input.isCharging = false;
  if (shot !== null) launchBall(shot.vx, shot.vy);
}
```

And in the Boot section, the wiring:

```js
canvas.addEventListener("pointerdown", onPointerDown);
canvas.addEventListener("pointermove", onPointerMove);
canvas.addEventListener("pointerup", onPointerUp);
canvas.addEventListener("pointercancel", () => { input.isCharging = false; });
```

> [!NOTE]
> **Events and callbacks - code that waits.** Everything you've written so far runs top to bottom, once, on a schedule you control. `addEventListener("pointerdown", onPointerDown)` is different: it says *when* a press happens, call this function - maybe in a second, maybe never, maybe fifty times. A function handed over to be called later is a **callback**, and the browser passes it an **event object** (`e`) describing what happened: coordinates, which pointer, and more. Notice we chose **Pointer Events** (`pointerdown`) over the older mouse events (`mousedown`): one API that fires identically for mouse, finger, and stylus - write once, playable everywhere. The `pointercancel` listener is the safety net for when the *system* steals the gesture (a notification swipe, the browser itself): we simply drop the charge.

> [!WARNING]
> **Classic error: the release that never comes.** Delete the `canvas.setPointerCapture(e.pointerId)` line, then charge a shot, drag *outside* the canvas, and let go. No shot - and worse, `isCharging` is still `true`, so the gauge is stuck charging forever. Without capture, the `pointerup` fired on whatever element the pointer was over - not the canvas - so your listener never heard it. `setPointerCapture` says: *until this gesture ends, deliver every event for this pointer to me*, no matter where the pointer wanders.

> [!WARNING]
> **Classic error: the page that scrolls instead of aiming.** On a phone, without `touch-action: none` in the canvas CSS, dragging your finger *scrolls or zooms the page* - the browser handles the touch itself and your `pointermove` events die mid-gesture (that's `pointercancel` firing). The CSS line hands the canvas full ownership of touch gestures. If your mobile aiming "sticks" or drops, this line is missing.

### Step 5 - Power and the launch rule

```js
/**
 * How charged the shot is right now.
 * @returns {number} 0 at the instant of pressing, 1 at full charge
 */
function power() {
  const held = (performance.now() - input.chargeStart) / 1000;
  return Math.min(held / CONFIG.input.chargeTime, 1);
}
```

`performance.now()` is a stopwatch in milliseconds. Held ÷ chargeTime maps a hold of 0 → 1.2 s onto a power of 0 → 1, and `Math.min` caps it - hold for an hour, power is still 1.

```js
/**
 * Hold-to-charge rule: DIRECTION comes from where the pointer is
 * relative to the ball; SPEED comes from how long the hold lasted,
 * scaled between the minimum and maximum launch speeds.
 * @returns {{vx: number, vy: number} | null} null when the pointer
 *   sits exactly on the ball (no direction to aim)
 */
function launchVelocity() {
  const dx = input.aimX - ball.x;
  const dy = input.aimY - ball.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) return null;

  const { minLaunchSpeed, maxLaunchSpeed } = CONFIG.physics;
  const speed = minLaunchSpeed + power() * (maxLaunchSpeed - minLaunchSpeed);
  return { vx: (dx / length) * speed, vy: (dy / length) * speed };
}

/**
 * Send the ball flying with an initial velocity.
 * @param {number} vx horizontal speed in px/s
 * @param {number} vy vertical speed in px/s (negative = upward)
 */
function launchBall(vx, vy) {
  ball.vx = vx;
  ball.vy = vy;
}
```

Read `launchVelocity` as the game's whole control scheme in one paragraph: the arrow from ball to pointer (`dx, dy`) gives *direction*; dividing by its `length` shrinks it to length exactly 1 (a pure direction, no speed); multiplying by `speed` - the min-to-max blend driven by `power()` - gives the final velocity. And the `null`: if the pointer sits exactly on the ball, there *is no direction*, and dividing by zero would poison everything downstream - so the function honestly answers "no shot," and `onPointerUp` respects it. Returning `null` on purpose, and checking for it, is a professional pattern you'll meet everywhere.

We verified these numbers in real Chrome: a genuine 600 ms hold measured `power() = 0.500` and a launch speed of **975 px/s** - exactly `450 + 0.5 × 1050`.

### Step 6 - The gauge and the honest preview

```js
/**
 * Vertical charge gauge: fills bottom-up while the hold lasts and
 * shifts from green to red as power approaches maximum.
 * @param {number} charge 0..1 charge fraction
 */
function drawPowerBar(charge) {
  const { x, top, bottom, width } = CONFIG.powerBar;
  const barHeight = bottom - top;

  // Empty gauge outline
  ctx.strokeStyle = "rgba(242,234,216,0.5)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, top, width, barHeight);

  // Fill from the bottom, green → amber → red as power grows
  const hue = 120 - charge * 120; // 120=green, 0=red
  ctx.fillStyle = `hsl(${hue}, 85%, 55%)`;
  const fill = barHeight * charge;
  ctx.fillRect(x, bottom - fill, width, fill);
}
```

`hsl()` names colors by **hue** angle - 120° is green, 0° is red - so one multiplication animates the gauge through green-amber-red. (Half charge lands on 60°: we pixel-checked it - pure yellow, `rgb(238, 238, 43)`.)

```js
/**
 * Simulate the first moments of the flight and draw them as dots -
 * the physics becomes visible BEFORE the shot, and the arc grows
 * live as the charge builds. The preview never lies: it reuses the
 * exact same gravity the real flight will use.
 */
function drawTrajectoryPreview() {
  const shot = launchVelocity();
  if (shot === null) return;
  const { previewSteps, previewDt } = CONFIG.input;
  let x = ball.x;
  let y = ball.y;
  let simVx = shot.vx;
  let simVy = shot.vy;

  ctx.fillStyle = "rgba(255,212,92,0.85)";
  for (let i = 0; i < previewSteps; i++) {
    simVy += CONFIG.physics.gravity * previewDt;
    x += simVx * previewDt;
    y += simVy * previewDt;
    if (y > CONFIG.world.floorY) break;
    if (i % 3 === 0) {
      ctx.beginPath();
      ctx.arc(x, y, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
```

Look at the three simulation lines: they are `integrateBall`, verbatim, run on scratch variables. That's the design decision of the chapter - **the preview runs the real physics**, so what you see is what you'll get, always. If we ever tune gravity, the preview updates itself. (`i % 3 === 0` - the `%` remainder operator - draws every third step, dots instead of a solid line.)

Finally, the frame shows both only while charging:

```js
  if (input.isCharging) {
    drawTrajectoryPreview();
    drawPowerBar(power());
  }
```

**Checkpoint - the chapter's visible change:** save. Press and hold: gauge climbs green→red, dotted arc stretches farther as you hold. Move the pointer: the arc swings. Release: the ball flies **along the dots**, bounces, stops - and your next shot starts from wherever it stopped, aimed from there. Try a tap (minimum power) vs a full 1.2-second hold. That's the game's soul, working.

One honest rough edge, on purpose: you can start a new charge *while the ball is still flying* and re-launch it mid-air. The simplest version that works allows it; Chapter 10's state machine (`"ready"` / `"flight"`) is the cure, and now you'll understand *why* it exists.

Your file should now match this chapter's [`snapshot/index.html`](snapshot/index.html).

## Why we did it this way

Two design decisions here define the game's feel. *Direction from position, speed from time*: separating the two axes of control means aiming is calm (no flick-speed skill needed) while power carries the tension - and it maps to one finger on a phone. And *the preview reuses the integrator*: the lazy alternative (a hardcoded parabola formula) would be a second implementation of the same physics, guaranteed to drift from the truth the first time someone tunes CONFIG. Never write the same fact twice - you learned it for numbers in Chapter 4; here it is for *behavior*.

## Experiment corner

1. Set `chargeTime: 0.4` - a twitchy arcade game. Set `3.0` - a tension game. One number is the entire game feel.
2. Set `previewDt: 1/15` with `previewSteps: 15` - a coarser, shorter preview, arcade-style. The preview is honesty on a budget: fewer steps, less future.
3. Break it on purpose: in `launchVelocity`, replace `dy` with `-dy` and try to shoot at the hoop. Everything mirrors vertically - aim up, ball goes down. Thirty seconds of confusion, one sign - worth feeling once, because someday a real bug will feel exactly like this.

## Exercises

Worked solutions are in [`exercises/solutions/`](exercises/solutions/).

1. **Guided** - draw a thin aim line from the ball to the pointer while charging (a `moveTo`/`lineTo` stroke in a faint color, drawn just before the preview). Where exactly in `frame` must it go, and why inside the `if`?
2. **Independent** - show the power as text: while charging, draw `Math.round(power() * 100) + "%"` near the gauge using `ctx.fillText` (look it up - `ctx.font = "14px monospace"` plus `fillText(text, x, y)` is all you need).
3. **Stretch** - add a "sweet spot": if the release happens with power between 0.78 and 0.86, print `"PERFECT"` to the console. Which function is the right home for that check, and why `onPointerUp` rather than `power()`? (Solution discusses the reasoning - it's about which function *decides* things versus which *reports* things.)

## Vocabulary

| English | Español |
|---|---|
| event / listener | evento / escuchador |
| callback | función de retorno (callback) |
| pointer | puntero |
| gesture | gesto |
| screen / world coordinates | coordenadas de pantalla / de mundo |
| charge | carga |
| preview | vista previa |
| normalize (a vector) | normalizar (un vector) |

## What's next

You can shoot - but the hoop is a ghost: the ball sails through the rim, through the backboard, out of the gym. In **Chapter 9** the world becomes solid: four walls, a backboard that banks, and a rim made of two circle colliders with honest vector math (explained from absolute zero, in an optional deep-dive).

**[Continue to Chapter 9: Physics →](../09-physics/README.md)**
