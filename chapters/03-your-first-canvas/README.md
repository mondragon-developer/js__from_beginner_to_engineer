# Chapter 3 — Your First Canvas

*Read this in: **English** | [Español](README.es.md)*

Chapter 2 talked to the console. This chapter gets you a surface to *draw* on — the same 920×540 canvas the finished game uses — and paints the first two pieces of the gym: the wall and the floor. Two rectangles. It won't look like much, but every pixel the finished game ever shows passes through exactly the machinery you build today.

**Time**: ~40 minutes.

## What you'll build in this chapter

A dark page with the game's canvas in the middle, showing a deep blue gym wall and a wooden floor band. Expected visual outcome: your first two `fillRect` calls, in the game's real colors, at the game's real coordinates.

## New concepts

- **`<canvas>`** — an HTML element that is a grid of pixels JavaScript can paint
- **`getContext("2d")`** — the drawing context: the brush for that canvas
- **`document.getElementById`** — finding an element from code
- **the canvas coordinate system** — `(0, 0)` is the top-left, and **y grows downward**
- **`fillStyle` / `fillRect`** — pick a color, paint a rectangle

## Build it, step by step

### Step 1 — A page with a canvas

Replace your `index.html` with:

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Free Throw — Chapter 3</title>
<style>
  body { background: #0d1626; margin: 0; display: flex; justify-content: center; padding: 16px; }
  canvas { border-radius: 10px; }
</style>
</head>
<body>

<canvas id="court" width="920" height="540"></canvas>

<script>
"use strict";
</script>
</body>
</html>
```

Two things are new. The `<style>` block is CSS — the page's cosmetics. We'll add it in small doses and always explain it: here it darkens the page, removes the default margin, and centers the canvas. And the `<canvas id="court" width="920" height="540">` line creates the game's screen: `id` is the name code will use to find it, and `width`/`height` set its size *in drawing pixels*.

**Checkpoint:** save — a slightly-rounded black rectangle sits centered on a dark page. That black void is your canvas.

> [!WARNING]
> **Real error: sizing the canvas with CSS.** It's tempting to write `canvas { width: 920px; height: 540px; }` in CSS instead of using the attributes. Do that and every canvas starts at its default drawing surface — we measured it: **300×150 pixels** — which CSS then *stretches* to 920×540. Everything you draw comes out blurry and distorted, with no error anywhere. The rule: the `width`/`height` **attributes** decide how many pixels you draw on; CSS only decides how big those pixels *appear*. Set the attributes. (The finished game uses CSS on top of the attributes to scale responsively — Chapter 8 handles the math that requires.)

### Step 2 — Find the canvas, grab the brush

Inside the `<script>`, after `"use strict";`:

```js
// The canvas element, and the 2D context — the brush that paints on it.
const canvas = document.getElementById("court");
const ctx = canvas.getContext("2d");
```

`document.getElementById("court")` asks the page: *give me the element whose id is `court`*. Then `getContext("2d")` hands you that canvas's **2D drawing context** — every drawing command for the rest of the course goes through it. `ctx` is this course's (and the whole industry's) abbreviation.

> [!WARNING]
> **Real error: the script runs before the canvas exists.** Move the `<script>` up into the `<head>` and the console shows, in red:
>
> ```
> Uncaught TypeError: Cannot read properties of null (reading 'getContext')
> ```
>
> The browser reads the file top to bottom. Inside `<head>`, your script runs *before* the `<canvas>` line has been read — so `getElementById` finds nothing and returns `null`, and asking `null` for `getContext` is the crash. Read the message again knowing that: it names exactly what happened. The fix is where Chapter 2 already put the script: **at the end of `<body>`**, after everything it needs exists.

### Step 3 — The gym wall

```js
// Gym wall: one dark blue rectangle covering the whole canvas.
ctx.fillStyle = "#16233a";
ctx.fillRect(0, 0, 920, 540);
```

`fillStyle` loads the brush with a color (`#16233a` is the finished game's wall blue, written as hex — red/green/blue pairs). `fillRect(x, y, width, height)` paints a rectangle: top-left corner at `(0, 0)`, 920 wide, 540 tall — the whole canvas.

**Checkpoint:** save — the black void is now a deep blue gym wall.

> [!NOTE]
> **The y-axis points DOWN — this deserves its own box.** In math class, y grows upward. On every computer canvas, `(0, 0)` is the **top-left** corner and **y grows downward** — like reading a page, or numbering rows in a spreadsheet. So the point `(0, 500)` is 500 pixels *below* the top edge, near the bottom. This feels wrong for about one chapter and then becomes second nature — but it has one famous consequence: *falling* means y getting **bigger**. Remember that in Chapter 6, when we add gravity; it's the source of one of that chapter's real bugs.

### Step 4 — The floor

```js
// Floor: a wooden band across the bottom (y grows DOWNWARD on a canvas).
ctx.fillStyle = "#a06a38";
ctx.fillRect(0, 500, 920, 40);
```

Same two commands, new numbers: start at `(0, 500)` — 500 down from the top — and paint a band 920 wide and 40 tall. That `500` is a number to remember: it's the finished game's floor line, the y-coordinate where every bounce in the course will happen.

**Checkpoint — the chapter's visible change:** a wooden floor runs along the bottom of the gym. We verified this snapshot's exact pixels while producing the course: the wall reads `rgb(22, 35, 58)` and the floor `rgb(160, 106, 56)` — precisely the two colors in the code. What you paint is what you get.

> [!TIP]
> **Later paint covers earlier paint.** The wall's rectangle covers the whole canvas, floor area included — the floor is simply painted *on top*. This is called the painter's algorithm, and it's the entire rendering strategy of the finished game: every frame, draw the background first, then the court, then the ball, then the rim, in that order. No erasing, ever — just repainting in the right order. The Experiment corner lets you feel it.

Your file should now match this chapter's [`snapshot/index.html`](snapshot/index.html).

## Why we did it this way

Notice what we did **not** do: no drawing library, no game framework. The canvas API is small and blunt — pick a color, paint a shape — and that bluntness is what makes it perfect for learning: nothing happens that you didn't explicitly command. Also notice the numbers `920`, `540`, `500` are already appearing in multiple places, hard-coded. That's deliberate discomfort. Count how many spots you'd have to edit to make the court taller — Chapter 4 exists to make that number *one*.

## Experiment corner

1. Swap the two drawing blocks (floor first, wall second) and predict the result before saving. *(You get all wall: the wall's full-canvas rectangle paints over the floor. Order is everything.)*
2. Change the floor's `500` to `400`, save, and watch the floor rise — you just moved the game's most important horizontal line.
3. Break it on purpose: change `id="court"` to `id="Court"` in the HTML (capital C) and read the console. Same `TypeError` as the Warning above — `getElementById` is case-sensitive too, and now you know exactly what its `null` means.

## Exercises

Worked solutions are in [`exercises/solutions/`](exercises/solutions/).

1. **Guided** — make the floor thicker and darker: start it at `480` instead of `500`, make it `60` tall, and use `#8f5a2b`. Predict which of the three numbers changes what, before saving.
2. **Independent** — paint a yellow (`#ffb43a`) 50×50 square perfectly centered on the canvas. You'll need arithmetic: the *center* of the canvas is not where the square's `(x, y)` corner goes.
3. **Stretch** — using only rectangles, add a "ceiling" band (same wood color, 20 tall) along the top edge, and a vertical pole (12 wide, `#2c3e5c`) rising from the floor at `x = 820`. You've just sketched the hoop's support — Chapter 5 draws it properly.

## Vocabulary

| English | Español |
|---|---|
| canvas | lienzo (canvas) |
| drawing context | contexto de dibujo |
| pixel | píxel |
| coordinate | coordenada |
| rectangle | rectángulo |
| hex color | color hexadecimal |
| top-left corner | esquina superior izquierda |

## What's next

Three numbers already appear twice each in a 25-line file, and it only gets worse from here. In **Chapter 4** we declare war on magic numbers: CONFIG is born, `Object.freeze` guards it, and the ball appears on the free-throw spot — positioned entirely by named values.

**[Continue to Chapter 4: Variables and CONFIG →](../04-variables-and-config/README.md)**
