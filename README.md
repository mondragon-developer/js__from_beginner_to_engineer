# 🏀 JavaScript: From Beginner to Engineer

**Build a physics-based basketball game that runs in the browser — starting from zero.**

*Read this in: **English** | [Español](README.es.md)*

![Gameplay of the finished basketball game](media/gameplay.gif)

*▶ [Watch a full one-minute game session (video)](media/gameplay-session.mp4)*

This is a free, hands-on course. You start with nothing but the browser you already have and finish with a complete game — hold-to-charge shooting, real gravity and bounce physics, scoring, game sessions with a shot limit, and player profiles with persistent records — written in plain **JavaScript**, drawn on the HTML **`<canvas>`**, playable in any modern browser. One file. Zero libraries. Zero build step.

No prior JavaScript experience is required. No prior programming experience is required. Every language concept (variables, functions, objects, classes…) is explained the first time the game code needs it.

## Why this course exists

This is the JavaScript sibling of my course [Rust + Bevy: From Beginner to Engineer](https://github.com/mondragon-developer/rust_bevy_from_beginner_to_engineer). It's the **same free-throw basketball game** — same hold-to-charge shooting, same physics, same sessions — built a second time in a second language, so a student who takes both courses sees exactly how two languages solve the identical problem.

And this time the twist is worth celebrating: **there is no toolchain.** The Rust course begins with a ~10 GB install — compiler, build tools, WASM target, bundler. This course begins by opening a file. The browser you already have is the engine.

Both courses are built on the same three promises:

1. **Everything here was actually executed.** Every code block is extracted from that chapter's verified snapshot — real code that ran, never retyped from memory. When the course quotes a line count or a file size, it's a measurement, not a guess.
2. **The errors are real.** The Warning boxes document failures that genuinely happened while building this course — the `null` element, the blurry canvas, the ball that teleported off screen because of a milliseconds bug. You'll probably hit some of them; the fix will be waiting.
3. **Versions are pinned, always.** Nothing here says "latest." JavaScript's version of this promise is itself a lesson: there's no compiler version wall to hit — but the browsers and the Node version this course was verified against are stated exactly, below.

And it's **bilingual** — every chapter exists in English and Spanish — because good beginner material in Spanish is scarce, and learning to program in a second language shouldn't be the price of entry.

If this course helps you, a ⭐ on the repo helps the next learner find it.

## What you'll build

A 2D free-throw basketball game where you:

- **Hold anywhere to charge** your shot — a power gauge fills green→red while a dotted trajectory preview grows live with the charge
- **Aim with your pointer** (mouse or touch — same code) and release to shoot
- Watch the ball fly with **real gravity**, bank off the **backboard**, rattle off a rim built from **two circle colliders**, and bounce off every wall of an enclosed gym — the ball never leaves the frame
- **Score baskets** and watch the LED-style scoreboard react, with a rim-glow celebration
- Play **10-shot sessions** with results at the end and a New session button
- Create **player profiles** whose best streak and best session survive closing the browser (localStorage — with a graceful fallback when storage is blocked)

And along the way you'll pick up what makes this course go "to engineer": a frozen CONFIG instead of magic numbers, JSDoc on every function, a state machine, classes and SOLID architecture, a verification harness, and a real deploy to a public URL.

## The chapters

Every chapter folder contains the lesson **and** a complete, runnable snapshot of the project at that point. Lost? Jump into any chapter's folder and continue from there.

### Part I — Getting ready
| # | Chapter | You will |
|---|---|---|
| 00 | [Before you start](chapters/00-before-you-start/README.md) | See what you're building, check requirements, meet the sibling Rust course |
| 01 | [Your toolkit](chapters/01-your-toolkit/README.md) | Install VS Code + Live Server; open the DevTools console — the browser IS the engine |
| 02 | [Hello, JavaScript](chapters/02-hello-javascript/README.md) | Write and run your first program by opening a file |

### Part II — First steps with the Canvas
| # | Chapter | You will |
|---|---|---|
| 03 | [Your first canvas](chapters/03-your-first-canvas/README.md) | Draw your first rectangles — gym wall and floor appear |
| 04 | [Variables and CONFIG](chapters/04-variables-and-config/README.md) | Kill magic numbers; the ball appears on the free-throw spot |
| 05 | [Functions that draw](chapters/05-functions-that-draw/README.md) | Decompose the scene into named functions; the hoop appears |
| 06 | [Making things move](chapters/06-making-things-move/README.md) | The game loop, delta time, gravity — the ball falls and bounces |

### Part III — Building the basketball game
| # | Chapter | You will |
|---|---|---|
| 07 | [The court](chapters/07-the-court/README.md) | Hardwood, backboard, rim, net — the full scene |
| 08 | [The shooting mechanic](chapters/08-the-shooting-mechanic/README.md) | Hold-to-charge, aiming, and a trajectory preview that never lies |
| 09 | [Physics](chapters/09-physics/README.md) | The enclosed gym: walls, backboard, and a rim that pushes back |
| 10 | [Scoring and feedback](chapters/10-scoring-and-feedback/README.md) | Detect baskets, celebrate, and light up the scoreboard |
| 11 | [Game sessions and players](chapters/11-game-sessions-and-players/README.md) | 10-shot sessions, results, and player profiles |

### Part IV — From beginner to engineer
| # | Chapter | You will |
|---|---|---|
| 12 | [From objects to classes](chapters/12-from-objects-to-classes/README.md) | Convert Ball and Hoop to classes — and prove behavior is identical |
| 13 | [Refactoring like an engineer](chapters/13-refactoring-like-an-engineer/README.md) | The full SOLID architecture, one principle at a time |
| 14 | [Persistence, verification, and shipping](chapters/14-persistence-verification-shipping/README.md) | localStorage, a verification harness, and a deploy to GitHub Pages |

## Requirements at a glance

- **OS**: Windows, macOS, or Linux — anything that runs a modern browser
- **Disk space**: about **50 MB free** (yes, megabytes — the sibling Rust course asks for ~10 GB; savor this line)
- **Browser**: any modern browser; the course was verified in the exact versions pinned below
- **Editor**: we use **VS Code** (free) with the Live Server extension, but any editor works
- **Experience**: none — this course starts from zero

> [!IMPORTANT]
> **Pinned versions (Promise 3).** There is no toolchain to pin — that's the point of this course — but "no toolchain" doesn't excuse "latest." These are the exact versions this course was built and verified with:
>
> | Tool | Version | Role |
> |---|---|---|
> | Google Chrome | **150.0.7871.102** | Every chapter snapshot was loaded and played in it during production |
> | Node.js | **v24.11.1** | Runs the verification harness in [`verify/`](verify/verify.mjs) (and Chapter 14's lesson). Not needed to play or follow the course |
>
> Also on the production machine: Microsoft Edge **150.0.4078.65** and Firefox **152.0.6**. The game uses only long-standardized APIs (Canvas 2D, Pointer Events, localStorage), but the browser every chapter was *verified* against is Chrome 150.

## How to use this course

1. Read chapters in order — each builds on the last, and each ends with a visible change on screen.
2. **Type the code yourself instead of copy-pasting; that's where the learning happens.**
3. Stuck or broken? Compare your code against the chapter's `snapshot/` folder — or copy it and continue from there.
4. Look for the callout boxes:
   - **Note** — a JavaScript language concept, explained the first time the game needs it
   - **Warning** — a real error you may hit, with its real fix
   - **Tip** — shortcuts and quality-of-life improvements

**Start here → [Chapter 0: Before you start](chapters/00-before-you-start/README.md)**

## License

[MIT](LICENSE) — use the code and lessons freely, for learning or anything else.
