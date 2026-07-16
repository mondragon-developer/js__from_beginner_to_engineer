# Chapter 9 — Physics: The World Pushes Back

*Read this in: **English** | [Español](README.es.md)*

Chapter 8 ended with a beautiful lie: you can shoot, but the hoop is a ghost — the ball sails through the rim, through the glass, and out of the gym forever. In this chapter the world becomes *solid*. The backboard banks, the rim rejects near-misses with honest geometry, and all four sides of the gym contain the ball — it will never leave the frame again. This is the course's deepest chapter, and it contains its only real math, explained from absolute zero.

**Time**: ~1.5 hours.

## What you'll build in this chapter

Three collision systems: `collideBounds` (floor, ceiling, both walls — one pattern, rotated four ways), `collideBoard` (a directional wall), and `collideRimPoint` (a circle collider with vector reflection — used twice, once per rim lip). Expected visual outcome: bank shots off the glass, rim rattles that kick the ball at believable angles, and an enclosed gym nothing escapes.

## New concepts

- **the collision pattern** — snap out, flip and dampen — *rotated* to every surface
- **a directional wall** — the backboard only stops the ball from one side
- **circle-vs-circle collision** — the rim's two lips as solid points
- **vectors, normals, and the dot product** — introduced from zero, in the deep-dive box
- **early returns as guards** — `if (dist === 0 || dist >= minDist) return;`

## The idea: move first, then fix it

Our approach is the one most 2D games actually use, and you've been using it since Chapter 6 without naming it:

1. `integrateBall` moves the ball as if nothing were in the way.
2. The collision functions run *right after* and ask: did the ball end up inside something? If so, **push it out** and **change its velocity** to what a bounce would have produced.

That's why the frame's update chain grows to three links, and why their order is law:

```js
  integrateBall(dt);
  collideHoop();
  collideBounds();
```

Hoop first, bounds last: whatever the rim does to the ball, the walls and floor get the final word — so no frame can ever *end* with the ball outside the gym.

## Build it, step by step

### Step 1 — Three new materials

`CONFIG.physics` gains one line per surface:

```js
    rimRestitution: 0.65,   // energy kept after hitting the rim
    boardRestitution: 0.6,  // energy kept after hitting the backboard
    wallRestitution: 0.6,   // energy kept after hitting a wall or ceiling
```

The floor already had its own (`0.55`). Four surfaces, four bouncinesses — the rim is the liveliest on purpose: rim rattles should feel dramatic.

### Step 2 — The enclosed gym: `collideBounds`

Delete `collideFloor` — its body moves into the first section of this bigger function (no dead code: the old function must be *gone*, not commented out):

```js
/** Keep the ball inside the gym: floor, both walls, and the ceiling. */
function collideBounds() {
  const { width, floorY } = CONFIG.world;
  const r = ball.radius;
  const wall = CONFIG.physics.wallRestitution;

  // Floor: bounce and roll on the hardwood, then come to rest
  if (ball.y + r > floorY) {
    ball.y = floorY - r;
    ball.vy = -ball.vy * CONFIG.physics.floorRestitution;
    ball.vx *= CONFIG.physics.floorFriction;

    if (ballSpeed() < CONFIG.physics.restSpeed) {
      ball.vx = 0;
      ball.vy = 0;
    }
  }

  // Ceiling: mirror the vertical velocity
  if (ball.y - r < 0) {
    ball.y = r;
    ball.vy = -ball.vy * wall;
  }

  // Left wall: mirror the horizontal velocity
  if (ball.x - r < 0) {
    ball.x = r;
    ball.vx = -ball.vx * wall;
  }

  // Right wall: same rule on the far side
  if (ball.x + r > width) {
    ball.x = width - r;
    ball.vx = -ball.vx * wall;
  }
}
```

Read the four sections and notice they are **one idea wearing four orientations**: which edge of the ball crossed which line, snap the position back to contact, mirror the velocity component that points at the surface, keep only a fraction of it. Chapter 6 taught you the pattern on the floor; today you rotated it three more times. That's most of 2D collision, honestly.

**Checkpoint:** save, and fire a max-power shot straight up, then one at each wall. Ceiling, left, right — everything answers back. The gym is sealed.

### Step 3 — The backboard: a directional wall

```js
/**
 * The backboard is a vertical wall: if the ball crosses it while
 * moving right, mirror its horizontal velocity.
 */
function collideBoard() {
  const h = CONFIG.hoop;
  const withinHeight = ball.y > h.boardTop && ball.y < h.boardBottom;
  const crossing = ball.x + ball.radius > h.boardX && ball.vx > 0;
  if (withinHeight && crossing) {
    ball.x = h.boardX - ball.radius;
    ball.vx = -ball.vx * CONFIG.physics.boardRestitution;
  }
}
```

Same pattern — with one new ingredient: `ball.vx > 0`. The board only pushes back if the ball is moving **into** it (rightward, toward the glass). Without that condition, a ball that somehow ended up behind the board, moving away, would be slapped *back into* it. Naming the two conditions (`withinHeight`, `crossing`) instead of writing one four-clause `if` is a small kindness to every future reader, including you.

**Checkpoint:** a high, hard shot now *banks* off the glass and drops toward the rim. Bank shots are in the game.

### Step 4 — The rim: two circles and the chapter's math

The rim in our side view is two lips — the front one and the one at the backboard — and each is a small solid circle the ball can hit *from any direction*. That "any direction" is why flat-wall mirroring isn't enough, and why this function earns the course's one dose of vector math:

```js
/**
 * Treat one rim edge as a small solid circle and reflect the ball
 * off it — the classic circle-vs-circle collision.
 * @param {number} px rim point x
 * @param {number} py rim point y
 */
function collideRimPoint(px, py) {
  const dx = ball.x - px;
  const dy = ball.y - py;
  const dist = Math.hypot(dx, dy);
  const minDist = ball.radius + CONFIG.hoop.rimThickness;
  if (dist === 0 || dist >= minDist) return;

  // Normal = direction from rim point to ball center
  const nx = dx / dist;
  const ny = dy / dist;

  // Push the ball out so it no longer overlaps the rim
  ball.x = px + nx * minDist;
  ball.y = py + ny * minDist;

  // Reflect only if the ball is moving INTO the rim
  const approaching = ball.vx * nx + ball.vy * ny;
  if (approaching < 0) {
    const r = CONFIG.physics.rimRestitution;
    ball.vx -= (1 + r) * approaching * nx;
    ball.vy -= (1 + r) * approaching * ny;
  }
}

/** Bounce the ball off the two rim points and the backboard. */
function collideHoop() {
  collideRimPoint(CONFIG.hoop.rimFrontX, CONFIG.hoop.rimY);
  collideRimPoint(CONFIG.hoop.rimBackX, CONFIG.hoop.rimY);
  collideBoard();
}
```

> [!NOTE]
> **Optional deep dive: vectors, for someone who has never seen one.** Skip this box and the game still works; read it and the function above becomes obvious.
>
> A **vector** is just an arrow written as two numbers: `(dx, dy)` means "go `dx` across and `dy` down." The ball's velocity is one. The line `dx = ball.x - px` builds the arrow *from the rim point to the ball's center* — subtracting positions always gives you the arrow between them.
>
> Its **length** is Pythagoras: `Math.hypot(dx, dy)`. If that length is smaller than `ball.radius + rimThickness`, the two circles overlap: contact.
>
> Dividing the arrow by its own length (`nx = dx / dist`) makes its length exactly 1 — a pure direction, called the **normal**: "straight away from the surface." Every bounce in nature happens along the normal; that's what makes it worth naming.
>
> The **dot product** is one multiplication per axis, added up: `vx * nx + vy * ny`. It answers one question: *how much of the velocity points along the normal?* Negative means "moving into the surface" (that's our `approaching < 0` test — the sign IS the test); its magnitude is the speed of the collision.
>
> The reflection lines then say: remove the into-the-surface part of the velocity **twice** (once cancels it, once sends it back out — a mirror), except we scale by `(1 + r)` instead of 2 — with `r = 0.65`, the outgoing part is only 65% of the incoming. A billiard bounce that loses a bit of energy, in two lines. This exact formula is in every game engine ever written; the sibling Rust course writes it too (`reflect(v, n)` in its Chapter 9), and now you've built it by hand.
>
> One more insight, free: the flat walls of Step 2 are this same formula *specialized* — a floor's normal is `(0, -1)`, plug it in and the whole thing collapses to "flip `vy`, scale by r." One idea, everywhere.

> [!WARNING]
> **Real error: reflecting without the `approaching < 0` check.** We measured what happens if you reflect unconditionally: a ball moving *away* from the rim (still inside the contact zone from last frame) gets flipped right back into it, then out, then in — its `vx` frame by frame read `65, −42, 27, −18`. On screen: the ball **trapped against the rim, jittering and bleeding speed** in place. The dot product's sign isn't decoration — it's the difference between "the world pushes back" and "the world grabs you."

> [!WARNING]
> **Real error: the `dist === 0` guard.** Delete it and wait for the one-in-a-million frame where the ball's center lands *exactly* on the rim point. Then `dx` and `dy` are both 0, `dist` is 0, and the normal becomes `0/0` — we reproduced it: `NaN`. One `NaN` poisons every calculation it touches: `ball.x` becomes `NaN`, and — remember Chapter 5's silent-vanish warning — `arc(NaN, ...)` draws *nothing, with no error*. Your ball ceases to exist, silently, rarely, unreproducibly. This guard is one `=== 0` today against the worst kind of bug there is.

### Step 5 — Wire the chain

Update `frame`'s physics section (shown at the top of the chapter) and delete any reference to the old `collideFloor`.

**Checkpoint — the chapter's visible change:** save, and *play*. Clang a shot off the front rim — it deflects at an angle that depends on where you hit, because the normal math is real. Bank one in off the glass. Blast the ceiling. The verification harness plays it harder than you can: 13 max-power shots around the full circle, 900 steps each — **11,700 frames, and the ball's center never left the world once.**

Your file should now match this chapter's [`snapshot/index.html`](snapshot/index.html).

## Why we did it this way

Modeling the rim as **two point-circles** instead of "a hoop object" is the chapter's sharpest engineering judgment: in a side view, the only parts of the rim the ball can touch *are* the two lips, and two circle colliders capture every real interaction — front-iron clangs, back-iron rattles, the lucky roll-in — for thirty lines total. Physical fidelity where it's felt, radical simplicity everywhere else; that's KISS applied to physics. And `collideHoop` as a three-line composition of named parts mirrors exactly what Chapter 12 will make of it: a `Hoop` class whose `collide` method calls its two private helpers — the seams you cut today are the class boundaries of tomorrow.

## Experiment corner

1. `rimRestitution: 0.05` — a rim of wet clay; shots die on contact and drop. `0.95` — a pinball machine. Feel how one number is the rim's whole personality.
2. `wallRestitution: 1.0` and a max-power shot: no energy ever lost to walls — watch how long the ball rattles around the sealed gym. (The floor still tames it eventually. Which constant would you also need to change for *perpetual* motion?)
3. Break it on purpose: comment out `collideBoard()` inside `collideHoop` — the glass turns to ghost and the ball hits the right *wall* behind it instead. Notice the game still contains the ball: layered defenses.

## Exercises

Worked solutions are in [`exercises/solutions/`](exercises/solutions/).

1. **Guided** — set `rimThickness: 12` and play. The rim feels bigger to *hit* — but will clean swishes through the middle get easier or harder? Reason it out from `minDist = radius + rimThickness` before testing.
2. **Independent** — give the ceiling its own softness: add `ceilingRestitution: 0.2` to CONFIG.physics and use it in the ceiling section. Fire max-power vertical shots and describe the difference.
3. **Stretch** — *measure* the rim, like the harness does: log `ballSpeed()` immediately before and after the reflection inside `collideRimPoint` (temporary instrumentation — delete it after, and that's part of the exercise). Confirm ~65% survives a head-on hit. Then hit the rim with a glancing blow: **more** than 65% survives. Why? (Hint: which *component* of the velocity does the formula dampen?)

## Vocabulary

| English | Español |
|---|---|
| collision | colisión |
| vector | vector |
| normal (vector) | (vector) normal |
| dot product | producto punto / producto escalar |
| reflection | reflexión |
| overlap | superposición / traslape |
| impulse | impulso |
| glancing / head-on (hit) | (golpe) rasante / frontal |

## What's next

The world is solid and the shots feel real — but the game doesn't *know* when you score. In **Chapter 10**: basket detection with `isScore`, the one-point-per-swish guard, a glowing rim celebration, the game's first state machine, and a real DOM scoreboard above the canvas.

**[Continue to Chapter 10: Scoring and feedback →](../10-scoring-and-feedback/README.md)**
