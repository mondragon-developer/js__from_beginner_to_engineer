# Chapter 5 — Functions That Draw

*Read this in: **English** | [Español](README.es.md)*

Your script currently runs top to bottom like one long sentence — fine at 40 lines, unreadable at 900. Today you learn the tool that gives code *structure*: functions. We split the scene into three named pieces — `drawCourt()`, `drawBall(x, y)`, `drawHoop()` — the hoop appears on screen, and JSDoc documentation starts here and never stops for the rest of the course.

**Time**: ~50 minutes.

## What you'll build in this chapter

The gym gains its hoop: support pole, backboard glass, and the red rim, all at the finished game's real coordinates. Structurally, the whole scene becomes three documented, reusable functions plus three calls. Expected visual outcome: a court you could *almost* shoot at.

## New concepts

- **function declaration** — packaging statements under a name
- **parameters and arguments** — the function's inputs
- **`return`** — the function's output
- **scope** — variables declared inside a function live only inside it
- **JSDoc** — the industry's standard comment format for documenting functions
- **`strokeStyle` / `lineWidth` / `moveTo` / `lineTo` / `stroke`** — drawing lines instead of filled shapes

## Build it, step by step

### Step 1 — What a function is (60 seconds in the console)

Type this in the DevTools console:

```js
function half(n) { return n / 2; }
half(920)
```

The console answers `460`. A **function declaration** packages statements under a name; a **parameter** (`n`) is a locker that gets filled with whatever value you pass when *calling* it (`920` — the **argument**); and **`return`** hands a result back to whoever called. That's the entire mechanism. Our drawing functions won't need `return` (their "output" is pixels on the canvas), but the game's physics in Part III returns values constantly — `ballSpeed()`, `launchVelocity()`, `isScore()` all report back to their callers.

### Step 2 — Wrap what you have: `drawCourt`

Wrap the wall-and-floor code in a function (nothing inside changes):

```js
/** Paint the gym wall and the hardwood floor. */
function drawCourt() {
  ctx.fillStyle = "#16233a";
  ctx.fillRect(0, 0, CONFIG.world.width, CONFIG.world.height);

  ctx.fillStyle = "#a06a38";
  ctx.fillRect(0, CONFIG.world.floorY, CONFIG.world.width, CONFIG.world.height - CONFIG.world.floorY);
}
```

That comment on top — `/** ... */` — is **JSDoc**, and it's a course promise: *every function from here to Chapter 14 gets one.* One sentence saying what the function does, written before you forget why you wrote it.

> [!NOTE]
> **Declaring is not running.** A function declaration only *teaches* the browser the recipe; nothing is drawn until someone *calls* `drawCourt()`. If you save right now, the canvas goes blank — the recipe exists, uncooked. The calls come in Step 5, and keeping "define everything, then run" as a structure becomes the backbone of the whole game (Chapter 6 formalizes the bottom section as the Boot).

### Step 3 — A function with inputs: `drawBall`

```js
/**
 * Draw the ball centered at (x, y).
 * @param {number} x horizontal center in pixels
 * @param {number} y vertical center in pixels
 */
function drawBall(x, y) {
  ctx.fillStyle = "#e0662f";
  ctx.beginPath();
  ctx.arc(x, y, CONFIG.ball.radius, 0, Math.PI * 2);
  ctx.fill();
}
```

Why parameters, when the ball has one fixed spot in CONFIG? Because *it won't stay there*. Next chapter the ball moves every frame, and `drawBall(x, y)` will be called with a different position 60 times a second. A function that receives its inputs is a function ready for a future its author saw coming.

The JSDoc grew: `@param {number} x` documents each input's *type* and meaning. VS Code reads this — hover over any `drawBall` call and your own documentation pops up, and it will even warn you when you pass nonsense. Free tooling, one comment.

> [!WARNING]
> **Real error: calling `drawBall()` with no arguments.** We reproduced it: forget the arguments and `x` and `y` are `undefined` — JavaScript's "nothing was provided" value. And here's the cruel part: `ctx.arc(undefined, undefined, ...)` **throws no error and draws nothing**. The canvas spec silently ignores non-finite coordinates. The ball just… isn't there, and the console is clean. When something visual silently vanishes, check the arguments at the call site first — this exact silence is why.

### Step 4 — The hoop appears: `drawHoop`

First, grow CONFIG with the finished game's real hoop geometry:

```js
  hoop:  {
    boardX: 812, boardTop: 168, boardBottom: 318,
    rimY: 300, rimFrontX: 726, rimBackX: 800,
    rimThickness: 5
  }
```

Then the function:

```js
/** Draw the pole, the backboard glass, and the rim. */
function drawHoop() {
  const h = CONFIG.hoop;

  // Pole
  ctx.fillStyle = "#2c3e5c";
  ctx.fillRect(h.boardX + 8, h.boardTop + 30, 12, CONFIG.world.floorY - h.boardTop - 30);

  // Backboard glass
  ctx.fillStyle = "rgba(232,238,246,0.88)";
  ctx.fillRect(h.boardX, h.boardTop, 8, h.boardBottom - h.boardTop);

  // Rim: a thick line from the front lip to the backboard
  ctx.strokeStyle = "#e23d28";
  ctx.lineWidth = h.rimThickness * 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(h.rimFrontX, h.rimY);
  ctx.lineTo(h.rimBackX, h.rimY);
  ctx.stroke();
}
```

New pieces, top to bottom. `const h = CONFIG.hoop;` is a local shorthand — `h` lives only inside this function (**scope**), and the finished game uses this exact trick. `rgba(...)` is a color with transparency (0.88 = 88% opaque — glass). And the rim is drawn as a **line**, not a filled shape: `moveTo` places the pen, `lineTo` drags it, `stroke()` inks the path using `strokeStyle` and `lineWidth` (rim thickness × 2, since `rimThickness: 5` is the physics' *radius* for the rim in Chapter 9 — the drawing and the physics will provably agree).

> [!WARNING]
> **Real error: forgetting `beginPath`.** The canvas keeps ONE current path, shared across all drawing. We reproduced the classic: draw the ball, then draw the rim *without* `beginPath()` — and the rim's `stroke()` re-strokes **the ball's circle too**, because the arc was still sitting in the shared path. Measured result: the ball grows a rim-red outline (its edge pixel reads `rgb(226, 61, 40)` — exactly `#e23d28`). No error, just wrong pixels. The rule: **every new shape starts with `beginPath()`.**

### Step 5 — Compose the scene

At the bottom, replace all the loose drawing code with:

```js
// Draw the scene, back to front.
drawCourt();
drawHoop();
drawBall(CONFIG.ball.startX, CONFIG.ball.startY);
```

**Checkpoint — the chapter's visible change:** save. Pole, glass backboard, red rim — the gym is recognizably a basketball court. We pixel-verified the snapshot in Chrome 150: rim `rgb(226, 61, 40)`, glass `rgb(206, 213, 223)`, ball `rgb(224, 102, 47)`.

Read those three calls again. They're the whole program now — and they read like stage directions: *court, hoop, ball, back to front.* That's what functions buy: the top of your script holds the details, the bottom tells the story.

Your file should now match this chapter's [`snapshot/index.html`](snapshot/index.html).

## Why we did it this way

The split we chose — court / ball / hoop — isn't arbitrary: each function owns one *thing* the game cares about, and they're exactly the seams along which the finished game's classes will form (`Renderer` draws, `Ball` and `Hoop` know their geometry — Chapters 12–13). Decomposing along the domain's natural joints, instead of by code length, is most of what "architecture" means; you just did it in a 90-line file, which is the right size to learn it. JSDoc, same logic: documenting three functions today is trivial, and by Chapter 14 you'll have documented ~40 without ever facing a "write all the docs" chore.

## Experiment corner

1. Call `drawBall(460, 200)` as a fourth line at the bottom — a second ball, mid-air, from one extra line. Parameters are leverage. (Remove it after: no dead code.)
2. Reorder the calls: ball first, court last. Predict, then save. *(Empty court — the wall repaints over everything. Same painter's algorithm as Chapter 3, now with functions.)*
3. In the console, type `drawHoop` (no parentheses) and Enter — the console shows the function itself. Now type `drawHoop()` — it runs, and the rim visibly re-inks. Naming versus calling, felt directly.

## Exercises

Worked solutions are in [`exercises/solutions/`](exercises/solutions/).

1. **Guided** — give `drawBall` a third parameter `color`, use it as the `fillStyle`, and draw the practice ball in `#e0662f` plus a "ghost ball" at (460, 200) in `"rgba(242, 234, 216, 0.4)"`.
2. **Independent** — write `drawMarker()`: the free-throw line marker (a 3-pixel-thin light rectangle on the floor, 34 to each side of the ball's start), with JSDoc, called from inside `drawCourt`. Functions calling functions is normal and good.
3. **Stretch** — write `drawScene()` that contains the three calls, so the bottom of the script is a single `drawScene();`. One-line bottom, fully-named program. (The finished game's `Renderer.draw` is exactly this idea.)

## Vocabulary

| English | Español |
|---|---|
| function | función |
| parameter / argument | parámetro / argumento |
| return value | valor de retorno |
| scope | ámbito / alcance |
| call (a function) | llamar / invocar (una función) |
| path (canvas) | trazado (canvas) |
| stroke / fill | trazar / rellenar |

## What's next

The court is ready and the ball knows how to be drawn anywhere. In **Chapter 6**, it *moves*: the game loop, delta time, gravity — and the first moment of magic in the whole course, when the ball falls and bounces on its own.

**[Continue to Chapter 6: Making things move →](../06-making-things-move/README.md)**
