# Chapter 2 — Hello, JavaScript

*Read this in: **English** | [Español](README.es.md)*

Today you write your first program. It will be small — a few messages, a few variables — but it will be *real*: by the end of this chapter, code you typed will be running in the browser and visibly changing the page. The whole thing is 1,058 bytes. Every giant program you've ever used started this way.

**Time**: ~30 minutes.

## What you'll build in this chapter

A page with a script that talks to the console, stores the future game's dimensions in variables, counts down a practice throw, and — the visible payoff — **renames the browser tab** using values it computed. From this chapter until the end of the course, every chapter ends with something you can see.

## New concepts

- **`<script>`** — the HTML tag that holds JavaScript
- **statement** — one instruction; programs are lists of them, run top to bottom
- **`console.log`** — print a message to the DevTools console
- **variable** — a labeled locker that stores one value
- **`const` and `let`** — the two ways to declare a variable
- **string / number** — text values and numeric values
- **`document.title`** — your first touch of the page from code

## Build it, step by step

### Step 1 — The HTML skeleton

In your course folder (the one from Chapter 1), replace the contents of `index.html` with:

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Free Throw — Chapter 2</title>
</head>
<body>

<h1>Free Throw — under construction</h1>
<p>Press F12 and open the Console tab: your first program is running there.</p>

</body>
</html>
```

Sixty seconds of HTML theory — all this course needs: `<!DOCTYPE html>` declares "this is a modern page"; `<head>` holds information *about* the page (its tab title, its text encoding); `<body>` holds what you *see*. Tags open (`<h1>`) and close (`</h1>`), and the browser reads the file top to bottom.

**Checkpoint:** save, Go Live — you should see the heading and the paragraph. The tab reads *Free Throw — Chapter 2*. Keep the console open (F12); it's empty and waiting.

### Step 2 — Your first script, your first statement

Add these lines just **before** `</body>` (the script goes at the *end* of the body — Chapter 3 shows you exactly what breaks if you put it earlier):

```html
<script>
"use strict";

// Your first program: a message to the console.
console.log("Hello, JavaScript!");
</script>
```

Save.

**Checkpoint:** the console now says **`Hello, JavaScript!`** — your first program ran, and nothing installed it, compiled it, or bundled it. The browser read your file and obeyed.

Three things you just wrote, in order:

- `"use strict";` — one line, always first, that switches JavaScript into its honest mode: several silent, legacy mistakes become loud errors instead. Every script in this course starts with it, and in Chapter 4 you'll see it catch a real bug for you.
- `// Your first program…` — a **comment**: notes for humans, invisible to the engine.
- `console.log("Hello, JavaScript!");` — a **statement**: one complete instruction, ended with a semicolon, like a sentence ends with a period.

> [!WARNING]
> **Real error #1: JavaScript is case-sensitive.** Type `Console.log` (capital C) instead of `console.log` and the console shows, in red:
>
> ```
> Uncaught ReferenceError: Console is not defined
> ```
>
> To JavaScript, `Console` and `console` are two completely different names, and only the lowercase one exists. This applies to *everything* you'll ever name. The fix is the spelling, and the reading habit is the real lesson: the error names exactly what the engine couldn't find.

> [!WARNING]
> **Real error #2: the silent typo.** Misspell the tag — `<sript>` instead of `<script>` — and there's no red error at all. Instead, **your code appears on the page as plain text**, and the console stays empty. We reproduced this while building the course: the browser treats an unknown tag as ordinary content (internally it becomes an `HTMLUnknownElement`) and never executes what's inside. HTML forgives typos by shrugging; JavaScript doesn't get the chance to complain because it never runs. If your code shows up *on the page*, check your `<script>` spelling.

### Step 3 — Variables: labeled lockers

Grow the script (new lines go after the first `console.log`):

```js
// Variables: labeled lockers, each storing one value.
const courtWidth = 920;  // the width our game canvas will have, in pixels
const courtHeight = 540; // and its height
console.log("The court will be", courtWidth, "by", courtHeight, "pixels.");
```

**Checkpoint:** the console adds **`The court will be 920 by 540 pixels.`**

> [!NOTE]
> **A variable is a labeled locker.** `const courtWidth = 920;` rents a locker, writes `courtWidth` on the label, and puts `920` inside. From now on, writing `courtWidth` anywhere means "open that locker and use what's in it." The numbers 920 and 540 aren't examples, by the way — they are the real dimensions of the final game's canvas. From your very first variables, you're building *the* game.

> [!TIP]
> `console.log` accepts many values separated by commas and prints them with spaces in between — the easiest way to mix text and numbers, and the form you'll use constantly while debugging.

### Step 4 — `const` locks, `let` allows change

```js
// const lockers keep their value forever; let lockers accept a new one.
let shotsLeft = 10;
shotsLeft = shotsLeft - 1; // one practice throw
console.log("Shots left after one practice throw:", shotsLeft);
```

**Checkpoint:** the console adds **`Shots left after one practice throw: 9`**.

`const` declares a value that will never be reassigned; `let` declares one that will. `shotsLeft` genuinely needs to change — every shot decreases it — so it earns a `let`. The court's width never changes, so it's `const`. That's the rule of thumb for the whole course: **`const` by default, `let` only when the game truly needs the value to change.** (There is a third, ancient keyword, `var` — we never use it, and Chapter 4 explains why.)

Notice `shotsLeft = shotsLeft - 1;` — no `let` this time. Declaring creates the locker; assigning changes its contents. You only declare once.

### Step 5 — Strings, and the visible change

```js
// Strings hold text, and + glues strings together.
const gameTitle = "Free Throw";
document.title = gameTitle + " — " + shotsLeft + " shots left";
console.log("Now look at the browser tab: JavaScript just renamed it.");
```

Save.

**Checkpoint — the chapter's visible change:** look at the browser tab. It now reads **Free Throw — 9 shots left**. The `<title>` you wrote in HTML said *Chapter 2*; your program just overwrote it with a value it computed. That's the whole game in miniature: JavaScript reading state (`shotsLeft`) and updating what you see.

`"Free Throw"` is a **string** — text in quotes. The `+` that adds numbers *glues* strings, and when you mix them (`shotsLeft` is a number), JavaScript converts the number to text to finish the gluing. `document.title` is a first, tiny taste of the `document` object — the page itself, reachable from code. Chapter 3 reaches much deeper into it.

Your full console output at this point, exactly as produced (Chrome 150):

```
Hello, JavaScript!
The court will be 920 by 540 pixels.
Shots left after one practice throw: 9
Now look at the browser tab: JavaScript just renamed it.
```

Your file should now match this chapter's [`snapshot/index.html`](snapshot/index.html) — 1,058 bytes of real program.

## Why we did it this way

Everything in this tiny program is aimed at the finished game. The variables aren't `x` and `foo` — they're `courtWidth`, `shotsLeft`, `gameTitle`, names lifted straight from the game you'll ship in Chapter 14. Naming things after what they *mean* is the cheapest engineering habit and the highest-yield one, so it starts on line one of day one. Likewise `const`-by-default: it isn't pedantry, it's a message to your future self — "this value is a fact, not a moving part" — and the fewer moving parts a program has, the easier every bug hunt becomes.

## Experiment corner

1. Change `courtWidth` to `1000`, save, and read the console. One variable, one edit, and the message updates — a two-line preview of why Chapter 4 centralizes every game number.
2. Break it on purpose: change the log to `console.log(courtwidth)` (lowercase w), save, and read the `ReferenceError` calmly. Notice it names the exact spelling it couldn't find.
3. Remove the quotes: `const gameTitle = Free Throw;`. Read the `SyntaxError`. The quotes are what tell JavaScript "this is text, not code."

## Exercises

Worked solutions are in [`exercises/solutions/`](exercises/solutions/).

1. **Guided** — declare `const playerName = "..."` with your name, then log `"Ready to play, "` followed by it. (Which declaration fits — `const` or `let`? Your name won't change mid-program.)
2. **Independent** — declare `shotsMade = 7` and `shotsTaken = 10`, compute the shooting percentage (`shotsMade / shotsTaken * 100`), and log `Shooting: 70 %`.
3. **Stretch** — make the tab title include the player's name too, e.g. `Ana — Free Throw — 9 shots left`. Then try to reassign `gameTitle = "Layups";` and read the red message you get. (You just met `const` enforcing its promise. Chapter 4 turns that promise into an engineering tool.)

## Vocabulary

| English | Español |
|---|---|
| statement | sentencia / instrucción |
| variable | variable |
| string | cadena de texto |
| number | número |
| comment | comentario |
| assignment | asignación |
| case-sensitive | sensible a mayúsculas y minúsculas |

## What's next

You can store values and print them. In **Chapter 3** you get a surface to *draw* on: the `<canvas>` element, its strange upside-down coordinate system, and your first rectangles — the gym wall and floor of the actual game.

**[Continue to Chapter 3: Your first canvas →](../03-your-first-canvas/README.md)**
