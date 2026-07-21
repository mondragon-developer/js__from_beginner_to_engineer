# Chapter 9 - Worked solutions

*Read this in: **English** | [Español](README.es.md)*

Each solution shows the exact change against [`../../snapshot/index.html`](../../snapshot/index.html). All numbers below were measured by running the real collision code.

## 1 - Guided: the fat rim

Change `rimThickness: 5` to `12`.

**Reasoning from `minDist = radius + rimThickness`:** each rim lip now "reaches" 29 px (17 + 12) instead of 22. Hitting the rim gets *easier* - its collision circles grew. But clean swishes get **harder**: the opening between the lips is `rimBackX − rimFrontX = 74` px of geometry, and each lip's collision zone now intrudes 7 px farther into it from both sides. The corridor a ball can pass through untouched shrank by 14 px - nearly a ball radius. One CONFIG number, two opposite effects; this tension (forgiving contact vs. strict scoring) is exactly what the real value `5` balances. Remember to set it back.

## 2 - Independent: the soft ceiling

In CONFIG.physics:

```js
    ceilingRestitution: 0.2, // the ceiling absorbs almost everything
```

In `collideBounds`, the ceiling section only:

```js
  // Ceiling: mirror the vertical velocity (soft - it eats the bounce)
  if (ball.y - r < 0) {
    ball.y = r;
    ball.vy = -ball.vy * CONFIG.physics.ceilingRestitution;
  }
```

Feel: a max-power vertical shot used to come *screaming* back down after the ceiling bounce (60% survives); now it dies up there and drops almost limp (20%). Two engineering notes. First, don't reuse the `wall` shorthand for the ceiling anymore - that local `const wall` now serves only the two side walls, and the code says so. Second, notice how cheap this experiment was: one CONFIG key, one line - that's the payoff of Chapter 4's architecture, six chapters later.

## 3 - Stretch: measuring the rim

Temporary instrumentation inside `collideRimPoint`, wrapping the reflection:

```js
  const approaching = ball.vx * nx + ball.vy * ny;
  if (approaching < 0) {
    const before = ballSpeed();
    const r = CONFIG.physics.rimRestitution;
    ball.vx -= (1 + r) * approaching * nx;
    ball.vy -= (1 + r) * approaching * ny;
    console.log("rim hit:", Math.round(before), "->", Math.round(ballSpeed()),
                "(" + Math.round(ballSpeed() / before * 100) + "%)");
  }
```

**Measured results** (running this exact code):

- Head-on hit (velocity straight along the normal): `400 → 260` - exactly **65%**, the `rimRestitution` value, verifying the constant does what its name claims.
- Glancing hit (velocity at an angle, e.g. 300 across / 400 down): `500 → 445` - **89%** survives.

**Why glancing hits keep more:** the formula dampens only the *normal component* - the part of the velocity aimed into the rim. The *tangential* part (sliding along the surface) passes through untouched. A head-on hit is 100% normal component, so it feels the full 0.65; a glancing blow invests only a fraction of its speed in the collision and keeps the rest. That's why grazing the rim barely slows the ball while a front-iron clang kills it - one formula, physically believable behavior for free.

**Then delete the instrumentation.** That's part of the exercise: measure, learn, remove. Temporary `console.log`s that outlive their question become noise that hides the next question's answer - and this course's snapshots carry zero dead code. (Chapter 14 shows the grown-up version of this instinct: assertions that run *outside* the game, in a harness, forever.)
