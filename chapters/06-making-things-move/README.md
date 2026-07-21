# Chapter 6 - Making Things Move

*Read this in: **English** | [Español](README.es.md)*

Everything so far has been a painting. This chapter, it becomes a *game*: the browser starts calling your code 60 times a second, gravity enters CONFIG, and the ball falls from the top of the gym, bounces four times, rolls, and comes to rest - all on its own. This is the first moment of magic in the course. When it happens on your screen, take a second. You made a world with physics in it.

**Time**: ~1 hour.

## What you'll build in this chapter

The game loop - the heartbeat every game on Earth runs on - plus real projectile motion: gravity, velocity, bouncing with energy loss, rolling friction, and rest. Expected visual outcome: on load, the ball drops from near the ceiling, bounces with decreasing height, drifts right, and settles on the floor.

## New concepts

- **velocity and acceleration** - `vx`/`vy`, and gravity as a change to velocity
- **`requestAnimationFrame`** - asking the browser for the next frame
- **the game loop** - update, draw, repeat, forever
- **delta time (`dt`)** - real elapsed seconds, and why we clamp it
- **integration** - turning velocity into position, one small step at a time
- **restitution and friction** - how a bounce loses energy

## Build it, step by step

### Step 1 - The ball learns velocity

Replace the ball's drawing-time positioning with a ball that carries its own state. After CONFIG (which we'll grow in Step 2), add:

```js
/* =====================================================================
 * The ball - position AND velocity now, because it moves. It starts
 * high on purpose: this chapter is about watching it fall.
 * (Chapter 8 puts it back on the free-throw spot, under your control.)
 * ===================================================================== */
const ball = {
  x: CONFIG.ball.startX,
  y: 80,
  vx: 120,  // a gentle sideways drift, so rolling is visible too
  vy: 0,
  radius: CONFIG.ball.radius
};
```

`vx` and `vy` are **velocity**: how many pixels the ball moves per *second*, horizontally and vertically. The ball is now four numbers that describe not just where it *is* but where it's *going* - which is all motion is.

### Step 2 - Physics enters CONFIG

Add a `physics` block to CONFIG (between `world` and `ball`):

```js
  physics: {
    gravity: 1800,          // px/s² - pulls the ball down every frame
    floorRestitution: 0.55, // energy kept after a floor bounce (0..1)
    floorFriction: 0.98,    // horizontal slowdown while rolling
    restSpeed: 25           // below this speed the ball is "at rest"
  },
```

These are the finished game's exact values. `gravity: 1800` is an *acceleration* - it changes `vy` by 1800 px/s every second. If Chapter 4's constants were the game's *dimensions*, these are its *materials*: how the world pulls and how the floor pushes back.

### Step 3 - Integration: velocity becomes position

```js
/**
 * Advance the ball one time step using projectile motion.
 * @param {number} dt seconds elapsed since the last frame
 */
function integrateBall(dt) {
  ball.vy += CONFIG.physics.gravity * dt; // gravity accelerates vy
  ball.x += ball.vx * dt;                 // position follows velocity
  ball.y += ball.vy * dt;
}

/** @returns {number} current speed in px/s */
function ballSpeed() {
  return Math.hypot(ball.vx, ball.vy);
}
```

Three lines of physics, worth reading slowly: gravity nudges the velocity; the velocity nudges the position; scale everything by `dt`, the *fraction of a second* that actually passed. Physicists call this **integration**. Note the sign: gravity is *added* to `vy`, because - Chapter 3's Note pays off - **on a canvas, down is positive**. `Math.hypot` gives the straight-line speed from the two components (Pythagoras, built in); the floor logic needs it next.

> [!WARNING]
> **Real error: gravity with the wrong sign.** Write `ball.vy -= CONFIG.physics.gravity * dt` (subtracting, like math class taught you) and the ball **falls up**. We measured it: starting at y = 80, after one second the ball is at y = **−835** - it left through the ceiling and kept going. If your ball ever soars off the top of the screen, you've re-derived the most famous canvas bug there is. Down is `+`.

### Step 4 - The game loop

```js
let lastTime = 0;

/**
 * One animation frame: compute dt, update the world, draw it.
 * @param {number} timestamp milliseconds from requestAnimationFrame
 */
function frame(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 1 / 30); // clamp big gaps
  lastTime = timestamp;

  integrateBall(dt);
  collideFloor();

  drawCourt();
  drawHoop();
  drawBall(ball.x, ball.y);

  requestAnimationFrame(frame); // book the next page of the flipbook
}
```

> [!NOTE]
> **The game loop is a flipbook.** A cartoon is a stack of drawings flipped fast enough that the eye sees motion. `requestAnimationFrame(frame)` tells the browser: *when you're about to show the next page, call my `frame` function first.* Inside, we update the world a tiny step, redraw everything from scratch (painter's algorithm - no erasing, ever), and book the next page. 60 pages a second, and the painting becomes a movie. Every game you've ever played is this loop wearing different costumes.

The `dt` line deserves its own paragraph. The browser hands `frame` a `timestamp` in **milliseconds**; subtracting the previous one and dividing by 1000 gives the real seconds elapsed - usually ≈ 0.0167 at 60 fps. Multiplying all motion by `dt` makes the game **frame-rate independent**: on a 120 Hz monitor it takes smaller steps more often, on a struggling laptop bigger steps less often, and the ball's arc is *identical* on both. And the `Math.min(..., 1/30)` **clamp**: switch tabs for ten seconds and come back - without the clamp, that frame's dt would be ~10 whole seconds and the ball would teleport through the floor. With it, the world never steps more than 1/30 s at a time.

> [!WARNING]
> **Real error: dt in milliseconds.** Forget the `/ 1000` and every speed becomes a thousand times larger. We measured it: after **one single frame**, `vy` = 30,006 px/s and the ball's y = **500,280** - half a million pixels underground, in a world 540 tall. On screen it looks like the ball simply never appears (the floor snap catches it lying on the ground before your eye sees frame one). If your physics explodes instantly, check dt's units first.

> [!WARNING]
> **Real error: the loop that runs once.** Forget the *inner* `requestAnimationFrame(frame)` (the one at the end of `frame` itself) and you get exactly one frame: the ball hangs frozen mid-air, one page into the flipbook. Nothing errors - you asked for one frame and got it. Both `requestAnimationFrame` calls matter: the one in the Boot starts the loop; the one inside keeps it alive.

### Step 5 - The floor pushes back

```js
/** Bounce on the hardwood, lose energy, and eventually come to rest. */
function collideFloor() {
  if (ball.y + ball.radius <= CONFIG.world.floorY) return; // still airborne

  ball.y = CONFIG.world.floorY - ball.radius;              // snap out of the floor
  ball.vy = -ball.vy * CONFIG.physics.floorRestitution;    // bounce, losing energy
  ball.vx *= CONFIG.physics.floorFriction;                 // rolling slows down

  if (ballSpeed() < CONFIG.physics.restSpeed) {            // slow enough: stop
    ball.vx = 0;
    ball.vy = 0;
  }
}
```

The pattern in the middle two lines is the most important in Part III - you'll rotate it onto walls, ceiling, and backboard in Chapter 9: **snap the position out of the object, flip and dampen the velocity.** The ball's bottom edge (`y + radius`) crossed the floor line? Put it exactly *on* the line, reverse `vy` keeping only 55% of it (restitution - each bounce reaches about half the previous height), and shave `vx` a little (friction). And when the total speed drops below `restSpeed`, stop pretending: zero it. Without that, the ball micro-bounces invisibly forever.

Also new: that `return` on the first line is a **guard clause** - "nothing to do, leave early." It keeps the interesting code un-indented, and the finished game uses it everywhere.

### Step 6 - Boot

Replace the three loose draw calls at the bottom with:

```js
/* ---------- Boot ---------- */
requestAnimationFrame(frame);
```

From this chapter to the end of the course, the script has this shape: **definitions above the Boot line, ignition below it.** The finished game's boot is one line too (`new Game(...)`). A program you can read as "here's everything I know how to do; now start" is a program you can test, reason about, and - in Chapter 14 - verify mechanically.

**Checkpoint - the moment of magic.** Save. The ball falls, bounces, rolls, stops. Measured from the real code: first impact **0.65 seconds** after load at **~1,200 px/s**, **four** visible bounces, at rest **~3.5 seconds** in at x ≈ 505 - every run, exactly the same, because the physics is deterministic. Reload a few times. You're allowed to just watch it for a while. This is the chapter where the course stops being about a picture and starts being about a *world*.

Your file should now match this chapter's [`snapshot/index.html`](snapshot/index.html).

## Why we did it this way

Real elapsed time (`dt`) instead of "move 3 pixels per frame" is the difference between animation that happens to work on your machine and simulation that works on every machine; it costs one subtraction per frame and buys total hardware independence. The `integrate → collide → draw` order inside the loop isn't negotiable either: move first as if nothing's in the way, *then* let the world correct the result, then show it. That two-phase structure (Chapter 9 extends the collide phase massively) is how most 2D games on Earth do physics, and it's why our functions are already named like the answer key's methods - `integrateBall` today is `Ball.integrate` in Chapter 12, and the diff between them will be almost nothing.

## Experiment corner

1. Moon gym: set `gravity: 300`. Long, lazy arcs - and notice the bounce count changes, because restitution didn't. Materials and gravity are independent knobs.
2. Superball vs beanbag: try `floorRestitution: 0.9`, then `0.1`. Predict each before saving.
3. Break it on purpose: remove the `Math.min` clamp (use just `(timestamp - lastTime) / 1000`), switch to another tab for ten seconds, and come back. The ball has teleported through its whole future. Put the clamp back and repeat - the world politely paused instead.

## Exercises

Worked solutions are in [`exercises/solutions/`](exercises/solutions/).

1. **Guided** - drop the ball from the very top (`y: 20`) with no sideways drift (`vx: 0`). Before saving, predict: does falling from four times higher mean many more bounces? Count them. (Measured answer: still **four** visible bounces - surprising, and worth understanding. Each bounce keeps only 55% of the speed, so extra impact speed dies out in almost the same number of bounces. Geometric decay is brutal.)
2. **Independent** - make the ball enter from the top-right corner moving *left*: pick the starting values yourself. Which numbers did you have to change, and which did you leave alone?
3. **Stretch** - the ball can still leave through the sides. Write `collideWalls()` - same snap-and-flip pattern as the floor, applied to `x` at both edges - and call it right after `collideFloor()`. You are one chapter early; Chapter 9 will do exactly this, so compare your version against it when you get there.

## Vocabulary

| English | Español |
|---|---|
| velocity | velocidad |
| acceleration | aceleración |
| frame | cuadro / fotograma |
| game loop | bucle del juego |
| delta time | delta de tiempo |
| clamp | acotar / limitar |
| restitution | restitución |
| friction | fricción |
| guard clause | cláusula de guarda |

## What's next

The world moves, but it's a gray-box gym. In **Chapter 7** the court gets its looks: hardwood with plank seams, the glass backboard, the net, the free-throw marker - the full scene, built with loops and object literals.

**[Continue to Chapter 7: The court →](../07-the-court/README.md)**
