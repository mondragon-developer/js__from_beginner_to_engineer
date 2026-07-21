# Chapter 1 - Your Toolkit

*Read this in: **English** | [Español](README.es.md)*

Every programming course has an installation chapter. In the sibling Rust course it's the longest, most treacherous chapter of Part I - a compiler, build tools, a WebAssembly target, a bundler, ~10 GB and four version pins. This is the same chapter for JavaScript, and it fits on one page. That's not because we skipped anything. It's because **the browser you already have is the engine**: it reads JavaScript source code directly and runs it. Today you install an editor, add one extension, and meet the console - the debugging tool you'll use every single chapter from now on.

**Time**: ~20 minutes, most of it one download.

## What you'll set up in this chapter

- **Visual Studio Code** - the editor
- **Live Server** - a VS Code extension that refreshes the browser every time you save
- **The DevTools console** - the browser's built-in window into your running code

Expected end state: you type a line of JavaScript into the console and the browser answers you. You'll have run code before Chapter 2 even starts.

## Build it, step by step

### Step 1 - Install Visual Studio Code

Download it from [code.visualstudio.com](https://code.visualstudio.com/) and run the installer with its default options. Windows, macOS, and Linux builds all work identically for this course.

This course was produced with **VS Code 1.128.0**, but the editor is the one tool where staying current is safe - nothing in the course depends on an editor version.

> [!TIP]
> During installation on Windows, check **"Add 'Open with Code' action to Windows Explorer file context menu"**. Right-clicking a folder → *Open with Code* is the fastest way to start working, and this course does it constantly.

### Step 2 - Install the Live Server extension

1. Open VS Code.
2. Click the **Extensions** icon in the left sidebar (four squares, one detaching) - or press `Ctrl+Shift+X`.
3. Search for **Live Server** by *Ritwick Dey* (this course used version **5.7.10**).
4. Click **Install**.

**Checkpoint:** a **"Go Live"** button appears at the right end of VS Code's bottom status bar. If you don't see it yet, it appears once a folder is open - next step.

> [!NOTE]
> **What is a "server", and why do we want a live one?** When you visit a website, a *server* is the computer that sends the page's files to your browser. Live Server runs a tiny server on *your own machine* - that's why the address starts with `127.0.0.1`, the universal number for "this computer" (its nickname is `localhost`). We could skip all this and double-click our HTML files, but Live Server gives us two gifts: the page **reloads itself every time you save** (you'll feel the difference within minutes), and pages served from `http://` behave *exactly* like the real, published web - a detail that quietly matters in Chapter 14, when the game starts saving player records.

### Step 3 - Create the course folder and open it

1. Create a folder for your work - for example `basketball-js` in your Documents.
2. In VS Code: **File → Open Folder…** and choose it.

> [!WARNING]
> **Real mistake: opening a *file* instead of the *folder*.** If you use *File → Open File* to open a lone HTML file, the Go Live button either doesn't appear or serves from the wrong place - and later chapters (which add media and multiple files) break in confusing ways. This cost a real debugging session during production. The habit that prevents it: **always open the folder**, then create files inside it from VS Code's Explorer panel. The folder is the project; files live inside it.

### Step 4 - Test Go Live

1. In VS Code's Explorer, create a file called `index.html` (click the *New File* icon, type the name).
2. Type just this line into it and save (`Ctrl+S`):

```html
<h1>Toolkit ready</h1>
```

3. Click **Go Live** in the status bar.

**Checkpoint:** your browser opens `http://127.0.0.1:5500/` and shows **Toolkit ready** in big letters. Now change the text, save, and watch the browser refresh itself. That loop - edit, save, see - is the course's heartbeat.

### Step 5 - Meet the console

With the browser open, press **F12** (or `Ctrl+Shift+J` on Windows/Linux, `Cmd+Option+J` on macOS) and click the **Console** tab.

The console is a direct conversation with the JavaScript engine. Type each of these and press Enter:

```js
2 + 2
```

```js
"basketball".toUpperCase()
```

```js
920 / 2
```

**Checkpoint:** the browser answers each line - `4`, `"BASKETBALL"`, `460`. You are running JavaScript. No compiler, no build - the engine was here all along, waiting.

> [!TIP]
> Keep DevTools open **for the entire course** - docked to the right side of the browser is ideal (three-dots menu inside DevTools → Dock side). Every error the game ever throws will appear there, in red, with the line number that caused it.

## Why we did it this way

A professional's toolkit earns its place by shortening the loop between *making a change* and *seeing its effect*. That's the entire philosophy of this setup: Live Server collapses "did my change work?" to one keystroke (`Ctrl+S`), and the console shows the engine's answers and errors instantly. Notice what we *didn't* install: no framework, no bundler, no packages. Every tool you skipped is a tool that can't break, version-drift, or distract you while you learn the actual language.

## Experiment corner

1. In the console, try `"basketball".length` - strings know their own length. Predict the number first, then check.
2. Try `10 / 3` and then `"10" / "3"` - the second one *also* answers `3.333…`? JavaScript quietly converted the texts to numbers. Surprises like this are why Chapter 4 is strict about types.
3. Break something on purpose: type `2 +` and press Enter. Read the red `SyntaxError` calmly, top to bottom. Errors are the engine telling you exactly where it got confused - Chapter 2 onward, they're your allies.

## Exercises

1. **Guided** - use the console to compute how many seconds are in a week: `60 * 60 * 24 * 7`. Check that you get `604800`.
2. **Independent** - our canvas will be 920 pixels wide and 540 tall. Use the console to find its total pixel count, and its width-to-height ratio.
3. **Stretch** - type `"920" + "540"` in the console. Explain the result in one sentence before reading the answer.

<details>
<summary>Worked solutions</summary>

1. `60 * 60 * 24 * 7` → `604800`. (60 seconds × 60 minutes × 24 hours × 7 days.)
2. `920 * 540` → `496800` pixels. `920 / 540` → `1.7037…` - close to the 16:9 of a TV screen.
3. `"920" + "540"` → `"920540"`. With quotes, those are *texts*, not numbers - and `+` glues texts together instead of adding. The same symbol does two jobs; which job depends on the types. Chapter 4 makes this precise.

</details>

## Vocabulary

| English | Español |
|---|---|
| editor | editor |
| extension | extensión |
| server / localhost | servidor / localhost |
| console | consola |
| DevTools | herramientas de desarrollo |
| save (Ctrl+S) | guardar |
| error message | mensaje de error |

## What's next

Your toolkit is complete - permanently. In **Chapter 2** you write your first real program: variables, your first `console.log`, and a page that visibly reacts to your code.

**[Continue to Chapter 2: Hello, JavaScript →](../02-hello-javascript/README.md)**
