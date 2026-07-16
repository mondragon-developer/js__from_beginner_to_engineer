# Chapter 10 — Scoring and Feedback

*Read this in: **English** | [Español](README.es.md)*

The physics is honest, the shots feel real — and the game has no idea any of it is happening. Today it learns to *judge*: a basket detector that fires exactly once per swish, a state machine that gives the game rules, a golden rim celebration, and the course's first real user interface — an LED-style scoreboard living in HTML, above the canvas. This is also the chapter where the game starts refusing you, politely: no aiming mid-flight.

**Time**: ~1.5 hours.

## What you'll build in this chapter

`isScore` (the crossing detector), the `"ready"`/`"flight"` state machine, the `scoredThisShot` guard, the rim glow, and a DOM scoreboard with Score and Streak panels. Expected visual outcome: swish → rim flashes gold, Score and Streak tick up; miss → Streak resets to 0; and the ball is only yours to aim when it's actually sitting still.

## New concepts

- **a state machine** — the game is always in exactly one named state, and the state decides what's allowed
- **edge detection** — scoring on the *crossing*, not the *position*
- **a guard flag** — `scoredThisShot`, one boolean against double counting
- **the DOM as a second display** — `getElementById` + `textContent` for UI the canvas shouldn't own
- **`aria-live`** — making the scoreboard readable to screen readers
- **CSS custom properties** — `--scoreboard-amber` and friends: CONFIG's philosophy, applied to style

## Build it, step by step

### Step 1 — The page grows a scoreboard

The HTML gains a header and two LED panels above the canvas (and the CSS gains the answer key's design tokens — see the Note):

```html
<header>
  <h1>Free Throw <span>· JavaScript from Zero</span></h1>
  <p class="hint">Hold anywhere to charge, aim, release to shoot</p>
</header>

<div class="scoreboard" aria-live="polite">
  <div class="panel"><div class="label">Score</div><div class="value" id="score">0</div></div>
  <div class="panel"><div class="label">Streak</div><div class="value" id="streak">0</div></div>
</div>
```

The full stylesheet for this chapter is in the [snapshot](snapshot/index.html) — copy it whole; it's the finished game's real CSS for these pieces (LED glow included: that `text-shadow` under `.panel .value` is the entire "LED" effect).

> [!NOTE]
> **`:root` variables are CONFIG for CSS.** The stylesheet now opens with design tokens — `--chalk`, `--scoreboard-amber`, `--panel` — declared once and used everywhere as `var(--chalk)`. Same disease, same cure as Chapter 4: a color repeated in nine places is nine chances to disagree. One mechanism you already believe in, second language. — And that `aria-live="polite"` attribute: it tells screen readers "when this region's text changes, read it out (when convenient)." One attribute, and blind players hear the score change. Interfaces are for everyone; the finished game does this too.

Why HTML for the scoreboard instead of drawing it on canvas? Text on canvas is pixels — no selection, no screen readers, blurry on zoom, manual layout. The DOM does text superbly. Use the canvas for the *world* and HTML for the *interface*; that division runs through every serious web game.

### Step 2 — The state machine

```js
const game = {
  state: "ready",         // "ready" | "flight"
  score: 0,
  streak: 0,
  scoredThisShot: false,  // guard: one basket per shot, no double counting
  celebrateUntil: 0       // timestamp: rim glows until this moment
};
```

> [!NOTE]
> **A state machine is a game of "you are exactly one thing."** At any instant the game is in *one* named state, and each state answers three questions differently: what runs? what's allowed? what changes the state? `"ready"`: physics sleeps, aiming allowed, shooting → `"flight"`. `"flight"`: physics runs, aiming refused, settling → `"ready"`. That's the whole machine — two states today, a third (`"sessionOver"`) next chapter, and the pattern scales to any size (your text editor, a traffic light, and a rocket launch sequence are all state machines).

The machine's rules are three small edits. `onPointerDown` gets a gate — the first line closes Chapter 8's rough edge for good:

```js
function onPointerDown(e) {
  if (game.state !== "ready") return;
```

`launchBall` grows up into `shoot` (delete `launchBall` — its job moved):

```js
/**
 * Fire the shot: launch the ball and enter the "flight" state.
 * @param {number} vx horizontal speed in px/s
 * @param {number} vy vertical speed in px/s (negative = upward)
 */
function shoot(vx, vy) {
  ball.vx = vx;
  ball.vy = vy;
  game.state = "flight";
  game.scoredThisShot = false;
}
```

And `frame` runs physics only in flight:

```js
  if (game.state === "flight") updateFlight(dt, timestamp);
```

> [!WARNING]
> **Classic error: `=` where you meant `===`.** Write the gate as `if (game.state = "ready")` — one missing `=` — and two bugs are born at once: the *assignment* overwrites the state with `"ready"` (even mid-flight!), and the `if` tests the assigned value, which is always truthy, so the gate never refuses anyone. No error message, in strict mode or out. Try it in the console: `let s = "flight"; if (s = "ready") console.log(s)` → prints `"ready"` — the comparison that vandalized the thing it was comparing. This course writes `===` (and `!==`) exclusively; the one-line habit that prevents this forever: **read every `if` asking "does this change anything?" The answer must be no.**

### Step 3 — Knowing when the shot is over

The crude rest-stop in `collideBounds` (the `vx = 0; vy = 0` block from Chapter 6) gets **deleted** — the state machine deserves a real referee:

```js
/** @returns {boolean} true when the ball has settled on the floor */
function shotIsOver() {
  return (
    ball.y + ball.radius >= CONFIG.world.floorY - 1 &&
    ballSpeed() < CONFIG.physics.restSpeed
  );
}
```

On the floor (within a pixel of tolerance) *and* slow: the shot is done. `updateFlight` will flip the state to `"ready"` — and since physics stops running in `"ready"`, the ball freezes **wherever it stopped**. That's the shoot-from-where-it-stopped rule, implemented by *not* writing any code to move the ball back. Sometimes the best implementation is a deletion.

### Step 4 — The detector: score the crossing, not the position

```js
/**
 * A basket counts when the ball's center crosses the rim line
 * downward, inside the opening.
 * @param {number} previousY the ball's y on the previous frame
 * @returns {boolean} true exactly on the frame the shot goes in
 */
function isScore(previousY) {
  const h = CONFIG.hoop;
  const crossedDown = previousY <= h.rimY && ball.y > h.rimY && ball.vy > 0;
  const insideOpening =
    ball.x > h.rimFrontX + ball.radius * 0.4 &&
    ball.x < h.rimBackX - ball.radius * 0.4;
  return crossedDown && insideOpening;
}
```

Read `crossedDown` carefully — it compares *two frames*: last frame the center was at or above the rim line, this frame it's below, and it's moving down. That's **edge detection**: the event is the *transition*, not the situation. `insideOpening` shaves 40% of a ball radius off each side — a basket has to be honest, not a graze along a lip.

> [!WARNING]
> **Real error: the naive detector.** The obvious first attempt is a position test: `if (ball.y > rimY && insideOpening) score++`. We measured it on a single clean make (1200 px/s at 57°): the naive detector fired **30 times** — one point for every frame the ball spent under the rim — while the crossing detector fired exactly **once**. If your score ever counts up like a slot machine, you scored a *situation* instead of an *event*. Detect edges.

### Step 5 — Flight rules: `updateFlight`

```js
/**
 * Physics + rules while the ball is in the air.
 * @param {number} dt seconds since last frame
 * @param {number} timestamp current time in ms
 */
function updateFlight(dt, timestamp) {
  const previousY = ball.y;
  integrateBall(dt);
  collideHoop();
  collideBounds();

  if (!game.scoredThisShot && isScore(previousY)) {
    game.scoredThisShot = true;
    game.score += 1;
    game.streak += 1;
    game.celebrateUntil = timestamp + 700;
    updateScoreboard();
  }

  if (shotIsOver()) {
    if (!game.scoredThisShot) game.streak = 0;
    game.state = "ready"; // the ball stays put: next shot starts here
    updateScoreboard();
  }
}
```

The physics chain moved in here from `frame` (capture `previousY` *before* integrating — the detector needs both frames). Then two rules: score once, and settle. The celebration is one timestamp — `celebrateUntil` — and the renderer simply asks `timestamp < game.celebrateUntil` each frame to decide the rim's color. No timers, no animation framework: the game loop you already have *is* the animation system.

> [!NOTE]
> **Honesty box: is `scoredThisShot` even necessary?** The crossing detector already fires once per crossing — so we went hunting: over **3,000 simulated trajectories**, including close-range put-backs and rim rattles, we could not produce a single shot that crosses down through the opening twice. With today's physics, the guard never triggers. It stays anyway, for one engineering reason: the detector's single-fire property depends on *tuning* — someone sets `rimRestitution: 0.95` (your Chapter 9 experiment!) and suddenly wild rattle trajectories exist that nobody enumerated. The guard costs one boolean and makes "one basket per shot" a *stated rule* instead of an emergent accident. That's defense in depth: cheap insurance against the futures you can't test.

### Step 6 — Feedback: the glow and the board

`drawHoopFront` gains its celebration parameter:

```js
/**
 * The rim itself, drawn in front so the ball appears to pass through.
 * @param {boolean} celebrating true right after a made basket
 */
function drawHoopFront(celebrating) {
  const h = CONFIG.hoop;
  ctx.strokeStyle = celebrating ? "#ffd35c" : "#e23d28";
```

The scoreboard updater — the only function that touches those two elements:

```js
const scoreEl = document.getElementById("score");
const streakEl = document.getElementById("streak");

/** Refresh the LED panels from the game state. */
function updateScoreboard() {
  scoreEl.textContent = String(game.score);
  streakEl.textContent = String(game.streak);
}
```

And `frame` computes `const celebrating = timestamp < game.celebrateUntil;` and passes it down. (Boot gains one `updateScoreboard();` so the panels start honest.)

> [!NOTE]
> **`textContent`, never `innerHTML`, for text.** `innerHTML` parses its input as HTML — hand it a string containing `<script>` or an `onerror` attribute and you've executed it. Our score is our own number today, but habits don't check the source: `textContent` treats everything as inert text, cannot execute anything, and is faster besides. Reach for `innerHTML` only when you *mean* to build HTML, which this course never needs.

**Checkpoint — the chapter's visible change:** save, and sink one. The rim flashes gold for 0.7 s, Score ticks to 1, Streak climbs. Brick one — Streak snaps to 0, Score holds. Try to charge while the ball's mid-air: the game ignores you until it settles. The harness plays 143 shots through this exact code: **33 baskets, every single one worth exactly 1 point** — the same 33/143 the finished answer key scores, five chapters early.

Your file should now match this chapter's [`snapshot/index.html`](snapshot/index.html).

## Why we did it this way

The state machine is the chapter's real gift, and notice *where* it lives: not scattered as boolean flags (`isFlying`, `canShoot`, `isWaiting`… and the bugs when they disagree) but as one string with named values. When Chapter 11 needs a third state, it's one more name, not another flag to keep consistent with two others. And the rules attach to transitions — `shoot()` is the *only* door into `"flight"`, `shotIsOver()` the only door out — so every rule about shooting has exactly one home. When someone asks "can the player shoot right now?", the answer is one `===` away, and it's always true.

## Experiment corner

1. Set the celebration to `timestamp + 3000` and make the glow color `"#7CFC00"`. Feel how 700 ms was chosen: long enough to see, short enough to not outlive the next shot.
2. Widen the honesty margin: change both `0.4`s in `isScore` to `0.9`. Near-rim swishes stop counting — you've made an Olympic judge. Set `0.0` — lip-grazers count. The margin is the game's entire personality as a referee.
3. Break it on purpose: remove the `game.state !== "ready"` gate and fire a second shot mid-flight. The ball re-launches in mid-air — Chapter 8's ghost, back from the dead. Put the gate back and appreciate it.

## Exercises

Worked solutions are in [`exercises/solutions/`](exercises/solutions/).

1. **Guided** — the `700` in `celebrateUntil = timestamp + 700` is a literal. Should it move to CONFIG? Make the argument both ways in a sentence each, then check the solution (and the answer key's actual choice).
2. **Independent** — add a **Misses** panel: a third LED panel (`id="misses"`), a `game.misses` counter, incremented where exactly? (Finding the one right line in `updateFlight` is the exercise.)
3. **Stretch** — detect a *swish*: a basket where the ball touched neither rim nor backboard on the way in. You'll need a `game.touchedIron` flag — decide where it's set, where it's reset, and log `"SWISH"` to the console when a clean one drops.

## Vocabulary

| English | Español |
|---|---|
| state machine | máquina de estados |
| edge detection | detección de flanco / de cruce |
| guard (flag) | (bandera de) guarda |
| scoreboard | marcador |
| streak | racha |
| celebration | celebración |
| screen reader | lector de pantalla |

## What's next

Score and streak reset only when you reload the page — there's no "game" yet, just endless practice. In **Chapter 11**: 10-shot sessions with results, the `"sessionOver"` state, a New session button, and player profiles with per-player records. The scoreboard grows to its final four panels.

**[Continue to Chapter 11: Game sessions and players →](../11-game-sessions-and-players/README.md)**
