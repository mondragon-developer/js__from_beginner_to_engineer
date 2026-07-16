# Chapter 7 — Worked solutions

*Read this in: **English** | [Español](README.es.md)*

Each solution shows the exact change against [`../../snapshot/index.html`](../../snapshot/index.html).

## 1 — Guided: the half-court circle

At the end of `drawCourt`, after the free-throw marker:

```js
  // Half-court circle: the floor hides its bottom half, leaving an arc.
  ctx.strokeStyle = "rgba(242,234,216,0.35)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(460, floorY, 60, 0, Math.PI * 2);
  ctx.stroke();
```

Wait — a full circle, not an arc? Look at the draw order: `drawCourt` runs *before* nothing covers the lower half… actually the circle's lower half lands *on* the floor band, which was already painted, so both halves are visible as strokes on wood and would look odd. The clean version strokes only the top half:

```js
  ctx.arc(460, floorY, 60, Math.PI, 0);  // top half only: from 180° to 0°
```

Both were tried against the real canvas; the half-arc version is the one that reads like a court marking. (Angles: `Math.PI` is the left side of the circle, `0` the right; the default direction sweeps through the top.)

## 2 — Independent: the shooter's square

In `drawHoopBack`, right after the backboard glass:

```js
  // Shooter's square, painted on the glass above the rim
  ctx.strokeStyle = "rgba(180, 60, 40, 0.55)";
  ctx.lineWidth = 2;
  ctx.strokeRect(h.boardX + 1, h.rimY - 34, 6, 26);
```

Reasoning from the geometry instead of magic guesses: the square sits on the glass (`boardX + 1`, inside the 8-wide board), its bottom near the rim line (`rimY - 34 + 26 = rimY - 8`), and it's muted (`0.55` alpha) so it reads as paint. `strokeRect` is `fillRect`'s outline sibling — one call, no path needed.

## 3 — Stretch: parameterized net

```js
  const strands = 7;
  for (let i = 0; i <= strands; i++) {
    const topX = h.rimFrontX + ((h.rimBackX - h.rimFrontX) * i) / strands;
    const botX = h.rimFrontX + inset + ((h.rimBackX - h.rimFrontX - inset * 2) * i) / strands;
    ctx.beginPath();
    ctx.moveTo(topX, h.rimY);
    ctx.lineTo(botX, bottomY);
    ctx.stroke();
  }
```

**Why the divisor must match the count:** `i / strands` is the *fraction of the way across* — it must reach exactly `1` when `i` reaches its last value, so the final strand lands exactly on the rim's far end. Leave the divisor at `4` with `strands = 7` and the strands march past the rim's edge into the backboard (the fraction reaches 7/4 = 175%). The pattern to remember: **a loop that interpolates uses the same N in its bound and its divisor.** With `strands` as a variable, that invariant can't silently break — which is exactly the CONFIG lesson of Chapter 4, applied to a loop.
