# Chapter 4 - Variables and CONFIG

*Read this in: **English** | [Español](README.es.md)*

Chapter 3 ended with a challenge: count how many edits it takes to resize the court. The answer was *five*, scattered across the file, and the game barely exists yet. Today we fix that permanently. CONFIG is born - the single, frozen home of every number in the game - and to celebrate, the ball appears on the free-throw spot, positioned entirely by named values. This is the first chapter whose main lesson isn't a canvas trick; it's an engineering judgment.

**Time**: ~40 minutes.

## What you'll build in this chapter

The same wall and floor - now driven by CONFIG - plus the orange ball resting on the free-throw line. Expected visual outcome: one new circle on screen; and invisibly, a file where changing any dimension means editing exactly one place.

## New concepts

- **magic numbers** - unexplained literals scattered through code, and why they're the enemy
- **object literal** - `{ }`: several named values grouped into one
- **dot access** - `CONFIG.world.width`: reading a value from inside an object
- **`Object.freeze`** - making an object read-only
- **`const` vs `let` vs `var`** - the full story, and why `var` never appears in this course
- **booleans** - `true`/`false` values (met in the console, used from Chapter 6 on)
- **`beginPath` / `arc` / `fill`** - drawing your first circle

## Build it, step by step

### Step 1 - Name the problem

Look at your Chapter 3 script: `920` appears twice, `540` twice, `500` twice. These are **magic numbers** - values that mean something important (*the floor's height!*) but say nothing and repeat everywhere. Magic numbers cause two diseases: you can't *read* the code (`500` means… what?), and you can't *change* it safely (miss one of the copies and the wall and floor disagree about where the floor is).

### Step 2 - CONFIG is born

At the top of the script, right after `"use strict";`, add:

```js
/* =====================================================================
 * CONFIG - the single source of truth for every number in the game.
 * Frozen so nothing can change it by accident (constants live in one
 * place, with names instead of magic numbers).
 * ===================================================================== */
const CONFIG = Object.freeze({
  world: { width: 920, height: 540, floorY: 500 },
  ball:  { startX: 180, startY: 458, radius: 17 }
});
```

> [!NOTE]
> **An object literal is a labeled box of lockers.** Chapter 2's variables were single lockers. `{ width: 920, height: 540, floorY: 500 }` is a *box* holding three of them, each with its name. Objects can hold objects: `CONFIG` is a box of boxes. You read from them with dots - `CONFIG.world.floorY` means "in CONFIG, open `world`, take `floorY`" - and the expression *reads like the sentence you'd say out loud*. That readability is the entire cure for magic numbers.

These are the finished game's real values, taken from the answer key: the world is 920×540 with the floor line at 500, and the ball is radius 17, starting at (180, 458). CONFIG will grow every few chapters - physics in Chapter 6, the hoop in Chapter 5, input tuning in Chapter 8 - until it deep-equals the final game's, key for key.

### Step 3 - Freeze it

`Object.freeze(...)` wraps the object as we create it, and makes it **read-only**. Why would we protect ourselves from ourselves? Because in a 900-line game, a typo like `CONFIG.ball = 99` *somewhere* is a matter of time - and without freeze it would silently destroy the config and break everything downstream, far from the typo. With freeze (plus Chapter 2's `"use strict"`), it breaks *loudly, at the typo*:

> [!WARNING]
> **Real error: assigning to a frozen object.** We reproduced both variants in Chrome 150. Reassign a key - `CONFIG.ball = 99` - and you get:
>
> ```
> Uncaught TypeError: Cannot assign to read only property 'ball' of object '#<Object>'
> ```
>
> Add a new key - `CONFIG.extra = 1` - and:
>
> ```
> Uncaught TypeError: Cannot add property extra, object is not extensible
> ```
>
> Both errors point at the exact guilty line. **This is `"use strict"` paying its rent**: without it, both mistakes fail *silently* - the assignment just doesn't happen, and you hunt the resulting weirdness for an hour.

> [!NOTE]
> **Honesty box: `Object.freeze` is shallow.** It locks the *top level* only. `CONFIG.world = {...}` throws - but `CONFIG.world.width = 1000` **succeeds silently** (we verified this too; the nested `world` object was never itself frozen). Deep-freezing recursively is possible, but the finished game doesn't bother, and neither do we: the freeze is a guardrail against accidents, not armor against a determined vandal. Knowing your tools' limits is part of using them honestly.

### Step 4 - Rewrite the drawing with names

Replace every magic number:

```js
// Gym wall
ctx.fillStyle = "#16233a";
ctx.fillRect(0, 0, CONFIG.world.width, CONFIG.world.height);

// Floor
ctx.fillStyle = "#a06a38";
ctx.fillRect(0, CONFIG.world.floorY, CONFIG.world.width, CONFIG.world.height - CONFIG.world.floorY);
```

Notice the floor's height is now *computed* - `height - floorY` - instead of the hard-coded `40`. That's the payoff compounding: the floor band's thickness is no longer even a number we store; it's a consequence of two named facts, and it can never disagree with them.

**Checkpoint:** save - the scene looks *identical* to Chapter 3. That's correct and important: refactoring means changing the code without changing the behavior. Chapter 12 turns that idea into a formal tool.

One nuance: the color strings stay as literals. The course's rule, straight from the answer key: **numbers that define the game live in CONFIG; values used once, purely visually, inside drawing code may stay inline.** Rules with a reasoned exception beat rules followed blindly.

### Step 5 - The ball appears

```js
// The ball, waiting on the free-throw spot.
ctx.fillStyle = "#e0662f";
ctx.beginPath();
ctx.arc(CONFIG.ball.startX, CONFIG.ball.startY, CONFIG.ball.radius, 0, Math.PI * 2);
ctx.fill();
```

Circles need three commands instead of one. `beginPath()` starts a fresh shape outline; `arc(x, y, radius, 0, Math.PI * 2)` traces a circle around the center point (angles are measured in *radians* - `Math.PI * 2` is once around); `fill()` floods the traced shape with the current color. Chapter 5 shows - with a real bug - why `beginPath` is not optional.

**Checkpoint - the chapter's visible change:** an orange ball sits on the free-throw spot. We pixel-verified this snapshot in Chrome 150: the ball's center reads `rgb(224, 102, 47)` - exactly `#e0662f`.

Now the real payoff. Change `startX: 180` to `startX: 400`, save: the ball teleports. Change it back. **One number, one place, one meaning.** From now on, tuning the game is editing CONFIG.

Your file should now match this chapter's [`snapshot/index.html`](snapshot/index.html).

> [!NOTE]
> **The `var` story, and booleans.** JavaScript has a third declaration keyword, `var`, from 1995. It ignores block boundaries (a `var` inside an `if` leaks outside it) and lets you re-declare the same name twice without complaint - two behaviors that hide exactly the class of bug this whole chapter fights. `const` and `let` (2015) fixed both. Simple rule, industry-wide: **never `var`.** - And one more value type you should meet before Chapter 6: try `CONFIG.world.width > 900` in the console. The answer, `true`, is a **boolean** - the yes/no type. Every collision test and scoring rule in this game will be built from them.

## Why we did it this way

This chapter is the course's thesis in miniature: *professional habits are cheaper adopted early than retrofitted late.* CONFIG costs nothing today - the game is 40 lines - but by Chapter 9 the physics will read `CONFIG.physics.rimRestitution` instead of `0.65`, and you'll tune the game's feel by scanning one commented block instead of grepping a thousand lines. The freeze, likewise, is one function call today and a silent bodyguard forever. And structuring CONFIG as *nested* objects (`world`, `ball`, later `physics`, `hoop`, `input`) means its shape documents the game's anatomy before you've built most of it.

## Experiment corner

1. Set `radius: 40`, save - a beach ball. Set `3` - a marble. One key tunes the game; that's the feel of config-driven design.
2. Type `CONFIG` in the console and press Enter. Expand the object with the little arrow: the console understands objects natively - this inspection habit will serve you in every chapter.
3. Break it on purpose: add `CONFIG.world.floorY = 100;` after the freeze - no error, but nothing changes either?? Wait - it's *nested*, so it **does** change (shallow freeze!), and the floor jumps. Now try `CONFIG.world = {};` - the `TypeError` from the Warning box. Feeling the difference between the two is worth three re-readings of the Note.

## Exercises

Worked solutions are in [`exercises/solutions/`](exercises/solutions/).

1. **Guided** - add `hoop: { poleX: 820 }` to CONFIG and draw the support pole from Chapter 3's stretch exercise using it (12 wide, `#2c3e5c`, from y = 200 down to the floor - compute the height from `CONFIG.world.floorY`, don't hard-code 300).
2. **Independent** - add a `court: { markerHalf: 34 }` key and draw the free-throw marker: a thin lighter line on the floor, centered under the ball, extending `markerHalf` to each side of `CONFIG.ball.startX`. (A very thin `fillRect` works as a line.)
3. **Stretch** - write, in a comment, what `Object.freeze` would and wouldn't catch in your exercise-1 code, then verify both predictions in the console.

## Vocabulary

| English | Español |
|---|---|
| magic number | número mágico |
| object literal | objeto literal |
| property / key | propiedad / clave |
| frozen (object) | (objeto) congelado |
| single source of truth | fuente única de la verdad |
| boolean | booleano |
| refactor | refactorizar |

## What's next

The script is growing and still reads top-to-bottom like a run-on sentence. In **Chapter 5** we split the drawing into named, documented functions - `drawCourt()`, `drawBall(x, y)`, `drawHoop()` - and the hoop finally appears. JSDoc starts there and never stops.

**[Continue to Chapter 5: Functions that draw →](../05-functions-that-draw/README.md)**
