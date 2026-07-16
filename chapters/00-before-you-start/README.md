# Chapter 0 — Before You Start

*Read this in: **English** | [Español](README.es.md)*

Welcome! Before writing a single line of code, this short chapter shows you where you're going, what you need (spoiler: almost nothing), and how the course works. Ten minutes here will save you hours later.

## What you're building

By the end of this course you will have built — and understood, line by line — this game:

![Gameplay of the finished basketball game](../../media/gameplay.gif)

![The finished basketball game](../../media/ch00-final-game.png)

It's a 2D free-throw basketball game that runs **in the browser**:

- **Hold-to-charge shooting** — press and hold anywhere on the court: a power gauge fills from green to red while a dotted trajectory preview grows live with your charge. Aim with your pointer. Release to shoot.
- **Real physics** — the ball follows a gravity arc, banks off the backboard, rattles off the rim, and bounces off every wall of an enclosed gym. It never leaves the frame, and your next shot starts wherever it stopped.
- **Scoring** — the game detects clean baskets, glows the rim in celebration, and updates an LED-style scoreboard.
- **Sessions and players** — 10 shots per session, results at the end, and player profiles whose best streak and best session survive closing the browser.

Three technologies make this work — and you already have all three:

| Technology | What it is | Its job in our game |
|---|---|---|
| **JavaScript** | The programming language built into every browser | Every line of game logic |
| **Canvas 2D** | An HTML element that JavaScript can draw on, pixel by pixel | The court, the ball, the net — every frame you see |
| **The browser** | The engine you already have installed | Runs the code, renders the pixels, captures your input, stores your records |

That third row is this course's twist, and it deserves a moment.

## The twist: there is no toolchain

This course has a sibling: [**Rust + Bevy: From Beginner to Engineer**](https://github.com/mondragon-developer/rust_bevy_from_beginner_to_engineer) — the *same* basketball game, built in Rust with the Bevy game engine and compiled to WebAssembly. Its Chapter 1 installs about **10 GB** of tools: a compiler, build tools, a WASM target, a bundler. That's normal for systems programming, and the course is honest about it.

This course's Chapter 1 installs a **text editor**. That's it. No compiler — the browser reads JavaScript directly. No package manager, no libraries, no build step. The finished game is **one HTML file** you can open, read, and share. When something is this direct, every minute goes into learning the actual craft: programming.

If you take both courses, you'll see the identical game solved by two very different languages — one of the most instructive comparisons a programmer can experience.

## Who this course is for

**Complete beginners.** You do not need to know JavaScript. You do not need to have written any code, ever. If you have programmed before, the early chapters will be quick reading and the later ones will still earn their keep.

The title says "to engineer" and it means it: the early chapters hold your hand through your first variables, and the final chapters cover what professional developers do — architecture (classes, SOLID principles), a state machine, graceful error handling, a verification harness, and a real deploy to a public URL. You'll absorb professional habits by *using* them on a real project, never by being lectured about them.

## How the course works

**Each chapter folder contains the lesson and a complete, runnable snapshot of the project as it exists at the end of that chapter** (from Chapter 2 on). If your code breaks and you can't figure out why, compare it against the chapter's `snapshot/` folder — or copy the snapshot and keep going from there. You can never be permanently stuck. As a bonus, the *difference* between two consecutive snapshots is exactly what that chapter taught.

As you read, you'll see four kinds of callout boxes:

> [!NOTE]
> **JavaScript sidebar.** Boxes like this explain a language concept — variables, functions, classes — at the exact moment the game code first uses it, usually with a metaphor that makes it stick. No theory before you need it.

> [!WARNING]
> **Troubleshooting.** Boxes like this describe a *real* error, with the *real* message you'll see in the console and the fix. Every one of these happened while building this course — we broke the code on purpose so you'd have the answer waiting.

> [!TIP]
> **Tips** are optional shortcuts and quality-of-life improvements.

> [!IMPORTANT]
> **Important** boxes are not optional — version pins and steps that break things if skipped.

### Why the code is in English (in both language editions)

Every chapter of this course exists in English and Spanish — but the *code and its comments stay in English in both*. That's deliberate, and it's a gift, not a limitation: the entire programming world — documentation, error messages, Stack Overflow, open-source code, job interviews — runs on English identifiers. `ball.launch()` is what you'll read and write for the rest of your career; `pelota.lanzar()` would only exist in this course. Learning the real vocabulary from day one means everything you learn here transfers everywhere.

## What you need

### A computer

- **Operating system**: Windows, macOS, or Linux — anything that runs a modern browser. Course screenshots are from Windows 11.
- **Disk space**: about **50 MB free** — for VS Code's cache, mostly. (The sibling Rust course asks for ~10 GB. We're allowed to enjoy this.)
- **Memory**: if your computer can open a browser tab, it can run this course.
- **Internet**: needed once, to download VS Code (~100 MB download).

### A browser

Any modern browser works. The one every chapter of this course was **verified** in is pinned below.

### An editor

We use **Visual Studio Code** (free) with the **Live Server** extension, and that's what you'll see in every screenshot. Live Server refreshes the browser automatically each time you save — a tight feedback loop that makes learning faster. **But any editor works.** If you already have a favorite, keep it.

> [!IMPORTANT]
> **Pinned versions (Promise 3).** There is no compiler version wall in JavaScript — but "no toolchain" doesn't excuse "latest". These are the exact versions this course was built and verified with:
>
> | Tool | Version | Role |
> |---|---|---|
> | Google Chrome | **150.0.7871.102** | Every chapter snapshot was loaded and played in it |
> | Node.js | **v24.11.1** | Runs the course's verification harness — optional until Chapter 14, where you build one yourself |
>
> The game uses only APIs that have been standard for years (Canvas 2D, Pointer Events, localStorage), so any current browser should behave identically — but *verified* means verified, and that browser is Chrome 150.

### What you *don't* need

- ❌ Prior JavaScript (or any programming) knowledge
- ❌ A compiler, package manager, framework, or any library — zero
- ❌ Math beyond arithmetic — the tiny bit of vector math in Chapter 9 is introduced from absolute zero, in an optional deep-dive box
- ❌ A gaming PC — this 2D game runs on anything

## Vocabulary

| English | Español |
|---|---|
| browser | navegador |
| code | código |
| file | archivo |
| toolchain | cadena de herramientas |
| snapshot | instantánea / copia del proyecto |
| deploy | despliegue / publicación |

## Checklist before Chapter 1

- [ ] I have a browser and ~50 MB of free disk space (savor it)
- [ ] I've picked an editor (VS Code if unsure)
- [ ] I understand each chapter has a runnable snapshot I can fall back on
- [ ] I know why the code will be in English, even in the Spanish edition

## What's next

In **Chapter 1** you'll set up your entire toolkit — VS Code, the Live Server extension, and the browser's DevTools console — and meet the most important debugging tool you'll ever use. It's the shortest setup chapter you'll ever read, and that's the point.

**[Continue to Chapter 1: Your toolkit →](../01-your-toolkit/README.md)**
