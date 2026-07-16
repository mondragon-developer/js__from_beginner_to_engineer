# Chapter 7 — The Court

*Read this in: **English** | [Español](README.es.md)*

The physics works; the gym looks like a cardboard model. This chapter is pure craft: gradients, plank seams, a glass backboard, a net, a ball with a shadow — the full scene, pixel-for-pixel the finished game's. Along the way you learn the `for` loop (the net demands it), template literals, and the layering trick that lets the ball fly *through* the hoop.

**Time**: ~1 hour.

## What you'll build in this chapter

The complete court: wall gradient, hardwood with seams, free-throw marker, pole, backboard, net, rim — with Chapter 6's bouncing ball now casting a soft shadow. Expected visual outcome: the game you saw in Chapter 0's GIF, minus the input and scoreboard.

## New concepts

- **`createLinearGradient` / `createRadialGradient`** — colors that blend across space
- **the `for` loop** — repeat with a counter
- **destructuring** — `const { width, height } = CONFIG.world;`
- **template literals** — `` `rgba(0,0,0,${value})` ``: strings with computed holes
- **`ellipse` / `quadraticCurveTo`** — two last canvas shapes
- **draw-order layering** — splitting the hoop into a *back* and a *front*

## Build it, step by step

Every function below replaces or upgrades its Chapter 6 version — same names where the job is the same, and delete what each replaces (no dead code, ever). The bodies are, deliberately, the answer key's drawing code in function form: what you write today survives to Chapter 14 almost untouched.

### Step 1 — The background breathes: `drawBackground`

```js
/** Paint the gym-wall gradient behind everything. */
function drawBackground() {
  const { width, height } = CONFIG.world;
  const g = ctx.createLinearGradient(0, 0, 0, height);
  g.addColorStop(0, "#1b2c47");
  g.addColorStop(1, "#101c30");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);
}
```

Two new tools in six lines. `const { width, height } = CONFIG.world;` is **destructuring** — "open the box and take these two lockers out" — reads better than repeating `CONFIG.world.` four times. And a **gradient** is a paintable color that *changes* between two points: this one runs from `(0,0)` down to `(0,height)`, blending wall-blue into near-black. `addColorStop(0, ...)` and `(1, ...)` are the colors at the start and end of that line — 0 and 1 here mean *fractions of the gradient line you defined*.

> [!WARNING]
> **Real error: the "normalized" gradient.** Other graphics tools use 0-to-1 coordinates, so it's natural to write `createLinearGradient(0, 0, 0, 1)` and expect "top to bottom." We reproduced it: paint the floor with a 0→1 gradient and **the entire floor comes out one flat color** — we measured `rgb(143, 90, 43)` (the *end* color) at both the top and bottom of the floor. Why: the gradient line you defined is 1 pixel long; everything below pixel 1 is "past the end," which repeats the last color forever. Canvas gradients live in **pixel coordinates**, the same space as your shapes.

### Step 2 — Real hardwood: `drawCourt`

```js
/** Hardwood floor, plank seams, and the free-throw marker. */
function drawCourt() {
  const { width, height, floorY } = CONFIG.world;

  // Hardwood floor
  const wood = ctx.createLinearGradient(0, floorY, 0, height);
  wood.addColorStop(0, "#c08145");
  wood.addColorStop(1, "#8f5a2b");
  ctx.fillStyle = wood;
  ctx.fillRect(0, floorY, width, height - floorY);

  // Plank seams
  ctx.strokeStyle = "rgba(0,0,0,0.18)";
  ctx.lineWidth = 1;
  for (let x = 40; x < width; x += 92) {
    ctx.beginPath();
    ctx.moveTo(x, floorY);
    ctx.lineTo(x - 14, height);
    ctx.stroke();
  }

  // Free-throw marker under the ball's starting spot
  ctx.strokeStyle = "rgba(242,234,216,0.5)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(CONFIG.ball.startX - 34, floorY + 1.5);
  ctx.lineTo(CONFIG.ball.startX + 34, floorY + 1.5);
  ctx.stroke();
}
```

> [!NOTE]
> **The `for` loop: repeat with a counter.** `for (let x = 40; x < width; x += 92)` reads: *start a counter `x` at 40; keep going while `x` is under `width`; add 92 after each round.* The body draws one slightly-slanted seam line (from `x` at the floor down to `x - 14` at the bottom edge — the slant fakes perspective), so ten planks cost three lines of code instead of thirty. Loops are how one description becomes many things — the net in Step 3 leans on this harder.

**Checkpoint:** save — wooden planks with seams, and a chalk-line free-throw marker under the bouncing ball.

### Step 3 — Splitting the hoop: `drawHoopBack`

Delete `drawHoop` — it's being replaced by two functions, and the *reason* is the chapter's best trick. When the ball drops through the hoop, the rim must appear **in front of** the ball, but the net and backboard **behind** it. One object, two layers:

First, grow `CONFIG.hoop` with one key: `netDepth: 52`.

```js
/** Backboard, pole and the net (drawn behind the ball). */
function drawHoopBack() {
  const h = CONFIG.hoop;

  // Pole
  ctx.fillStyle = "#2c3e5c";
  ctx.fillRect(h.boardX + 8, h.boardTop + 30, 12, CONFIG.world.floorY - h.boardTop - 30);

  // Backboard glass
  ctx.fillStyle = "rgba(232,238,246,0.88)";
  ctx.fillRect(h.boardX, h.boardTop, 8, h.boardBottom - h.boardTop);

  // Net (simple crossing lines from rim down)
  ctx.strokeStyle = "rgba(242,234,216,0.65)";
  ctx.lineWidth = 1.5;
  const bottomY = h.rimY + h.netDepth;
  const inset = 14;
  for (let i = 0; i <= 4; i++) {
    const topX = h.rimFrontX + ((h.rimBackX - h.rimFrontX) * i) / 4;
    const botX = h.rimFrontX + inset + ((h.rimBackX - h.rimFrontX - inset * 2) * i) / 4;
    ctx.beginPath();
    ctx.moveTo(topX, h.rimY);
    ctx.lineTo(botX, bottomY);
    ctx.stroke();
  }
}
```

The net loop is worth decoding once, slowly: `i` runs 0 to 4, and `(something * i) / 4` slides a point from one end of a range to the other in five even steps — `topX` walks the rim, `botX` walks a *narrower* range (`inset` from each side), so the five strands lean inward like a real net tapers. This slide-a-fraction pattern is everywhere in graphics code.

> [!WARNING]
> **Real error: canvas state leaks between functions.** The rim (Step 4) sets `lineWidth` to 10. We measured what happens next: after drawing it, `ctx.lineWidth` **is still 10** — the context is one shared machine, and settings persist until changed. Forget the net's `ctx.lineWidth = 1.5;` line and next frame your net is woven from rope. The habit that prevents the whole bug family: **every draw function sets every style it strokes or fills with.** Never rely on what the previous function left behind.

### Step 4 — `drawHoopFront`

```js
/** The rim itself, drawn in front so the ball appears to pass through. */
function drawHoopFront() {
  const h = CONFIG.hoop;
  ctx.strokeStyle = "#e23d28";
  ctx.lineWidth = h.rimThickness * 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(h.rimFrontX, h.rimY);
  ctx.lineTo(h.rimBackX, h.rimY);
  ctx.stroke();
}
```

### Step 5 — A ball with depth: `drawBall`

```js
/**
 * Draw the ball centered at (x, y): floor shadow, body, and seams.
 * @param {number} x horizontal center in pixels
 * @param {number} y vertical center in pixels
 */
function drawBall(x, y) {
  const radius = CONFIG.ball.radius;

  // Soft shadow on the floor, fading with height
  const height = CONFIG.world.floorY - y;
  const shrink = Math.max(0.35, 1 - height / 700);
  ctx.fillStyle = `rgba(0,0,0,${0.28 * shrink})`;
  ctx.beginPath();
  ctx.ellipse(x, CONFIG.world.floorY + 6, radius * shrink * 1.2, 5 * shrink, 0, 0, Math.PI * 2);
  ctx.fill();

  // Ball body
  const g = ctx.createRadialGradient(x - 5, y - 6, 3, x, y, radius);
  g.addColorStop(0, "#f5824e");
  g.addColorStop(1, "#cf4d1c");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  // Seams
  ctx.strokeStyle = "rgba(90,30,8,0.8)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.moveTo(x - radius, y);
  ctx.lineTo(x + radius, y);
  ctx.moveTo(x, y - radius);
  ctx.quadraticCurveTo(x + radius * 0.7, y, x, y + radius);
  ctx.stroke();
}
```

Three effects, each cheap. The **shadow**: an `ellipse` (like `arc` with two radii) pinned to the floor, that shrinks and fades as the ball climbs — ``` `rgba(0,0,0,${0.28 * shrink})` ``` is a **template literal**, a string with a live computation embedded in `${...}`; you'll use these constantly. The **body**: a `createRadialGradient` — blends between two *circles* instead of two points, offset up-left so the ball reads as lit from above. The **seams**: an equator line plus one `quadraticCurveTo` (a line that bends toward a control point) — enough to say "basketball" at 17 pixels of radius. We verified the highlight pixel: `rgb(245, 130, 78)`, exactly `#f5824e`.

### Step 6 — The frame composes the layers

```js
  drawBackground();
  drawCourt();
  drawHoopBack();
  drawBall(ball.x, ball.y);
  drawHoopFront();
```

**Checkpoint — the chapter's visible change:** save. The ball drops into a *gym*: planks, glass, net, and when it crosses the hoop's height near the rim you can already see the layering do its magic — net behind, rim in front. Reload and watch the shadow track the bounce.

Your file should now match this chapter's [`snapshot/index.html`](snapshot/index.html).

## Why we did it this way

The back/front hoop split is the chapter's real lesson: **draw order is a design tool.** Rather than any 3D machinery, one decision — "the ball is between these two layers" — sells the illusion completely, and it's the exact structure the answer key's `Renderer` keeps (`#drawHoopBack` … `#drawBall` … `#drawHoopFront`). Notice also what the visual upgrade *didn't* touch: `integrateBall`, `collideFloor`, and `frame`'s physics half are byte-identical to Chapter 6, and the harness proves it — the same gravity-and-bounce checks pass on this chapter's snapshot. Pretty and correct are separate concerns, and keeping them separate is why both stayed easy.

## Experiment corner

1. Set the plank loop's step to `46` — twice the planks, half the width. Then make the slant `x - 40` — dramatic perspective. Numbers in loops are knobs.
2. In `drawBall`, change `Math.max(0.35, ...)` to `Math.max(0.05, ...)` and watch the shadow at the top of a bounce almost vanish. That floor value decides how "high" the gym feels.
3. Break it on purpose: delete the net's `ctx.lineWidth = 1.5;` and watch next frame's rope-net (the rim's 10 leaked in — the Warning, live).

## Exercises

Worked solutions are in [`exercises/solutions/`](exercises/solutions/).

1. **Guided** — the gym feels empty on the left. Add a half-court circle: a stroked circle of radius 60 centered at `(460, floorY)` — half of it hides under the floor, leaving a clean arc on the hardwood. One `arc`, one `stroke`, your choice of subtle color.
2. **Independent** — give the backboard a shooter's square: a small stroked rectangle on the glass, centered above the rim (about 4 wide × 30 tall at `boardX - 2`… or measure your own from the geometry). Make it read as paint, not neon.
3. **Stretch** — parameterize the net: make the strand count a variable `strands` and use it in both the loop condition (`i <= strands`) and the divisor (`/ strands`). Try 4, 7, 12. Why must the divisor change with the count? (Answer in the solution — it's the slide-a-fraction pattern again.)

## Vocabulary

| English | Español |
|---|---|
| gradient | degradado / gradiente |
| loop | bucle / ciclo |
| destructuring | desestructuración |
| template literal | plantilla literal |
| layer | capa |
| ellipse | elipse |
| seam | veta / costura |

## What's next

The gym is ready for a player — and in **Chapter 8**, that's you: Pointer Events, hold-to-charge power, aiming with the cursor, a gauge that fills green-to-red, and a dotted trajectory preview that never lies. The game becomes *playable*.

**[Continue to Chapter 8: The shooting mechanic →](../08-the-shooting-mechanic/README.md)**
