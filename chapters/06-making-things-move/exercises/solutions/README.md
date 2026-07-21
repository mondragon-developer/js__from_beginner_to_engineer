# Chapter 6 - Worked solutions

*Read this in: **English** | [Español](README.es.md)*

From this chapter on, exercises modify only a few lines of the snapshot, so each solution shows the exact change against [`../../snapshot/index.html`](../../snapshot/index.html) plus the reasoning. Every code block below was executed against the real physics; the numbers quoted are measurements.

## 1 - Guided: drop from the very top

Change only the ball's starting state:

```js
const ball = {
  x: CONFIG.ball.startX,
  y: 20,    // was 80 - now falling from just under the ceiling
  vx: 0,    // was 120 - no drift, a pure vertical drop
  vy: 0,
  radius: CONFIG.ball.radius
};
```

**Measured result: still four visible bounces** (the y = 80 drop also gave four), coming to rest in 2.3 seconds, exactly at x = 180 since nothing pushes it sideways.

Why doesn't more height buy more bounces? Restitution is *multiplicative*: every bounce keeps 55% of the impact speed. Falling from 4× higher only raises impact speed by 2× (speed grows with the *square root* of fall height), and one single bounce eats that factor of two: `0.55 × 2 ≈ 1.1`. Geometric decay flattens almost any starting advantage - a lesson that returns in Chapter 14 when we talk about why the ball settles so predictably.

## 2 - Independent: enter from the top-right, moving left

```js
const ball = {
  x: 840,     // near the right edge
  y: 60,      // high, so there's a real fall
  vx: -140,   // negative vx = moving LEFT
  vy: 0,
  radius: CONFIG.ball.radius
};
```

What changed: `x` (start on the right), `vx` (negative - left is negative x, same axis rule as always). What stayed: `vy: 0` (we drop, we don't throw downward) and `radius`.

**Measured result:** four bounces, at rest after 3.6 seconds at x ≈ 457 - safely inside the frame. One honest caution: make `vx` much stronger (say −200 without walls) and the ball *rolls out through the left edge and keeps going forever*, because nothing stops it - the world's sides are still open. Which is exactly why exercise 3 exists.

## 3 - Stretch: `collideWalls`

The floor's pattern - *snap out, flip and dampen* - rotated onto the x-axis, both edges:

```js
/** Keep the ball between the side walls: snap out, flip and dampen vx. */
function collideWalls() {
  const r = ball.radius;

  // Left wall
  if (ball.x - r < 0) {
    ball.x = r;
    ball.vx = -ball.vx * CONFIG.physics.floorRestitution;
  }

  // Right wall: same rule on the far side
  if (ball.x + r > CONFIG.world.width) {
    ball.x = CONFIG.world.width - r;
    ball.vx = -ball.vx * CONFIG.physics.floorRestitution;
  }
}
```

And in `frame`, one new link in the chain:

```js
  integrateBall(dt);
  collideFloor();
  collideWalls();
```

Notes for when you reach Chapter 9: the real game gives walls their own bounciness (`CONFIG.physics.wallRestitution: 0.6`) instead of borrowing the floor's, adds the ceiling with the same pattern rotated once more, and hardens the velocity flip slightly for a subtle edge case. Your version here is genuinely correct for what Chapter 6 knows - compare the two when you get there and you'll see the *pattern* survived unchanged.
