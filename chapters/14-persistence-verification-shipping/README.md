# Chapter 14 — Persistence, Verification, and Shipping

*Read this in: **English** | [Español](README.es.md)*

The last chapter, in three acts. **Remember:** `PlayerStore` gives the game a memory that survives closing the browser — and delivers the Liskov moment Chapter 13 promised. **Verify:** you build a small verification harness of your own, the grown-up version of every checkpoint in this course. **Ship:** the game goes to a public URL that you can send to anyone on Earth. When you're done, your file and the frozen answer key are *the same file* — and we'll prove that too.

**Time**: ~1.5 hours, plus the minute where you just stare at your live URL.

## What you'll build in this chapter

The eighth and final class, a runnable `verify-my-game.mjs`, and a deployment. Expected visible outcomes, in order: your records survive a reload; a terminal says your game is verified; a browser anywhere in the world plays your game.

## New concepts

- **`localStorage`** — a small key-value store the browser keeps per site
- **JSON** — objects as text (`stringify`) and back (`parse`)
- **`try` / `catch`** — running code that's allowed to fail
- **graceful degradation** — losing a feature instead of crashing
- **L — Liskov Substitution** — the promised moment
- **`static`** — a value on the class itself, not on instances
- **deploying** — GitHub Pages, step by step

## Act I — Remember: `PlayerStore`

### Step 1 — The class

```js
/* =====================================================================
 * PlayerStore — saves and loads each player's records. It uses the
 * browser's localStorage when available and falls back to in-memory
 * data when storage is blocked, so the game never crashes (Liskov:
 * both modes honor the exact same load/save contract).
 * ===================================================================== */
class PlayerStore {
  static #KEY = "freethrow.players.v2";

  constructor() {
    this.memory = {};                       // fallback when storage is blocked
    this.persistent = this.#storageWorks();
  }

  /** @returns {boolean} true when localStorage accepts writes */
  #storageWorks() {
    try {
      localStorage.setItem("__probe", "1");
      localStorage.removeItem("__probe");
      return true;
    } catch {
      return false;
    }
  }

  /** @returns {Object.<string, {bestStreak:number, bestSession:number}>} */
  loadAll() {
    if (!this.persistent) return this.memory;
    try {
      return JSON.parse(localStorage.getItem(PlayerStore.#KEY)) ?? {};
    } catch {
      return {};
    }
  }

  /**
   * Save one player's records (creating the player if new).
   * @param {string} name
   * @param {{bestStreak:number, bestSession:number}} records
   */
  save(name, records) {
    const all = this.loadAll();
    all[name] = records;
    if (this.persistent) {
      localStorage.setItem(PlayerStore.#KEY, JSON.stringify(all));
    } else {
      this.memory = all;
    }
  }
}
```

Top to bottom. `localStorage` stores only *strings*, per site, surviving reloads and restarts — so **JSON** does the translating: `JSON.stringify(all)` turns the records object into text, `JSON.parse(...)` turns it back (we verified the round trip preserves every value). `static #KEY` puts the storage key on the *class* — all stores share one name, and versioning it (`.v2`) is a habit from the exercise below. And the two `try/catch` blocks are the chapter's soul:

> [!NOTE]
> **`try/catch` — code that's allowed to fail.** Everything in `try` runs normally; if any line *throws*, execution jumps to `catch` instead of crashing the program. It's not for bugs (fix those) — it's for **honest environmental failure**: things that can legitimately go wrong on someone else's machine, in someone else's browser, with someone else's settings. Storage is the classic case, which brings us to…

> [!WARNING]
> **Classic error: assuming localStorage works.** In private/incognito windows on some browsers, under strict privacy settings, in some embedded webviews — and historically for `file://` pages on several browsers — touching `localStorage` **throws a `SecurityError`**. If your first storage line runs unprotected at boot, your game crashes *only for those users*, and you'll never reproduce it on your machine. `#storageWorks` is the defense: one probe write inside a `try`, once, at construction — and from then on the store *knows* which world it lives in. Never assume the environment; ask it.

> [!WARNING]
> **Real error: the day the key doesn't exist.** The very first time anyone plays, there's nothing stored, and `localStorage.getItem(...)` returns `null`. We measured what follows: `JSON.parse(null)` **doesn't throw — it returns `null`** — and then `null` flows downstream until something does `Object.keys(null)` and dies far from the cause. The `?? {}` converts "nothing yet" into "empty collection", the honest answer (Chapter 11's operator, keeping its promise). The `try/catch` around it guards the *other* first-day surprise: a corrupted or hand-edited value — we measured `JSON.parse("")` throwing `SyntaxError: Unexpected end of JSON input`. Missing and malformed are different failures; this method handles both in four lines.

### Step 2 — The swap, and the Liskov moment

In `Game`, delete the `this.savedPlayers = {}` block and its comment; in its place:

```js
    this.store = new PlayerStore();
```

Constructor: `const names = Object.keys(this.store.loadAll());` (the guard line stays). `#switchPlayer`: reads `this.store.loadAll()[name] ?? {...}`, then `this.store.save(name, this.records)`. `#commit`: `this.store.save(this.playerName, this.records)`. That's the entire diff — three call sites.

> [!NOTE]
> **L — Liskov Substitution, delivered.** Look at what the Game knows about storage: two verbs, `loadAll()` and `save(name, records)`. Now look inside the store: *two complete implementations* — persistent and in-memory — chosen at runtime by the probe. When storage is blocked, every `loadAll`/`save` silently uses `this.memory`, honoring the exact same contract with the exact same shapes. The Game **cannot tell which mode it's running in** — and that's the principle: anything claiming a contract must be substitutable anywhere the contract is expected, no surprises. The harness enforces it mechanically: it constructs one store with working storage and one with a *throwing* localStorage stub, and asserts both honor the identical save/load contract. Chapter 13's in-memory `savedPlayers` object wasn't a placeholder — it was one of the two Liskov twins, waiting for its sibling.

**Checkpoint:** play a session, set a Best, and **reload the page**. The number that vanished at the end of Chapter 11 is still there. Open DevTools → Application → Local Storage and look at `freethrow.players.v2`: your records, as JSON, in the browser's own vault.

## Act II — Verify: build your own harness

This whole course, a harness has been checking every snapshot behind the scenes (it's in [`verify/verify.mjs`](../../verify/verify.mjs) — 1,000 lines; read it someday). Here is your own first one — small, real, and runnable. Save as `verify-my-game.mjs` next to your `index.html`:

```js
// verify-my-game.mjs — a beginner's verification harness (Chapter 14).
// Run with:  node verify-my-game.mjs
import { readFileSync } from "node:fs";

const html = readFileSync("index.html", "utf8");
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const body = script.slice(0, script.indexOf("/* ---------- Boot ----------"));

// Evaluate the game's definitions (never its boot), then export
// the pieces we want to test onto globalThis.
(0, eval)(body + "\n;globalThis.T = { CONFIG, Ball, Hoop };");
const { CONFIG, Ball, Hoop } = globalThis.T;

let passed = 0;
function assert(name, cond) {
  if (!cond) {
    console.error("FAIL:", name);
    process.exit(1);
  }
  console.log("ok:", name);
  passed += 1;
}

// 1. Gravity pulls down (canvas y grows downward)
const b = new Ball();
b.integrate(1 / 60);
assert("gravity pulls the ball down", b.vy > 0);

// 2. The rim pushes back, keeping exactly rimRestitution of the speed
const h = new Hoop();
b.x = CONFIG.hoop.rimFrontX - 15;
b.y = CONFIG.hoop.rimY;
b.vx = 400;
b.vy = 0;
h.collide(b);
assert("rim deflects at rimRestitution", Math.abs(b.vx + 400 * CONFIG.physics.rimRestitution) < 1e-9);

// 3. A clean downward crossing inside the opening scores
b.x = (CONFIG.hoop.rimFrontX + CONFIG.hoop.rimBackX) / 2;
b.y = CONFIG.hoop.rimY + 5;
b.vy = 300;
assert("a downward crossing scores", h.isScore(b, CONFIG.hoop.rimY - 5) === true);

console.log(`\n${passed} checks passed — your game is verified.`);
```

This needs **Node.js v24.11.1** (the course's one pinned tool beyond the browser — install from [nodejs.org](https://nodejs.org) if you haven't). Run `node verify-my-game.mjs`. Real output, from this exact snapshot:

```
ok: gravity pulls the ball down
ok: rim deflects at rimRestitution
ok: a downward crossing scores

3 checks passed — your game is verified.
```

Read what it does, because the technique is the takeaway: load your own game *as text*, cut it at the Boot line (definitions without ignition — the structure you've kept since Chapter 6 exists *for this moment*), evaluate the blueprint, and interrogate it with facts that must be true. No browser, no clicking, milliseconds, scriptable. Change `gravity` to `-1800` and run it: your harness catches in one second what your eyes might miss for a session. This is how the course kept its first promise to you, and now it's yours to keep to others.

## Act III — Ship

Your game is one self-contained file — the easiest deployment in software. GitHub Pages, step by step:

1. Create a **GitHub account** (free) at [github.com](https://github.com) if you don't have one.
2. Click **+ → New repository**. Name it `basketball-js` (any name works). Public. Create.
3. On the new repo's page: **uploading an existing file** → drag your `index.html` (and `verify-my-game.mjs` — ship your proofs). **Commit changes.**
4. **Settings → Pages** (left sidebar) → under *Branch* choose `main` and `/ (root)` → **Save**.
5. Wait a minute or two, refresh: Pages shows **"Your site is live at `https://YOURNAME.github.io/basketball-js/`"**.

Open it. On your phone too — the Pointer Events and the CSS scaling from Chapter 8 were built for this moment.

> [!WARNING]
> **Classic error: the 404 that isn't broken.** If your file is named anything else — `game.html`, `basketball.html`, `Index.html` on a case-sensitive host — the URL above answers **404**. GitHub Pages (like most static hosts) serves exactly one default filename per folder: **`index.html`**, lowercase. The whole "site" machinery works; it just can't find its front door. Rename, commit, wait a minute.

**Checkpoint — the course's last visible change, and its biggest:** your game, at a public URL, playable by anyone. Send it to someone. Watch them hold, aim, release.

### The final proof

One last measurement, in the spirit of every chapter before it. Compare your finished file against the course's frozen answer key:

```
git diff --no-index snapshot/index.html ../../answer-key/basketball-js.html
```

Silence. **Byte-identical** — we verified it during production (`byte-identical: True`). Fourteen chapters ago this file didn't exist; now it *is* the certified game, and every line of the journey between is in your hands and in this repo's history.

## Why we did it this way

`PlayerStore` closes the loop the course opened in Chapter 4: CONFIG taught that facts should have one home; the store teaches that *effects* should too. Every other class would still run in a browser from 1999 or a test harness from nowhere — only PlayerStore touches the machine's reality, so only PlayerStore needs the armor (`try/catch`, the probe, the twin implementations). Concentrating your environmental risk in one small, contract-honoring class is the pattern behind every database layer and API client you'll ever meet. And the harness-then-ship ordering is deliberate: **verified, then public** — the professional sequence, at every scale from this course to the software that lands aircraft.

## Experiment corner

1. DevTools → Application → Local Storage → right-click `freethrow.players.v2` → Delete, then reload. A fresh game, no crash — first-day logic (`?? {}`) handling "nothing yet" like it promised.
2. Edit the stored JSON *by hand* in DevTools to something broken (`{oops`), reload. The game boots clean — the `catch` in `loadAll` just ate your vandalism. Graceful degradation, felt.
3. Block storage entirely (site settings → Cookies and site data → Don't allow) and play. Records work — until reload, when they're gone. That's the in-memory twin doing its Liskov duty. Unblock; permanence returns.

## Exercises

Worked solutions are in [`exercises/solutions/`](exercises/solutions/).

1. **Guided** — the key says `.v2`. Change it to `.v3` and reload: your records "vanish" (the old key's data still sits in storage, orphaned). Explain in two sentences why versioning the key is a *feature* when the records' shape changes between releases — and what a real product would do with the orphaned `.v2` data.
2. **Independent** — add a fourth check to your `verify-my-game.mjs`: the backboard reflects an 800 px/s ball at exactly `boardRestitution`. You have every tool; match the course harness's numbers.
3. **Stretch** — records export: a console-runnable one-liner (or a small function) that prints the current `freethrow.players.v2` value so a player can copy it, plus its import twin. Where does this functionality *belong* — PlayerStore, Game, or the console? Argue from Chapter 13's principles.

## Vocabulary

| English | Español |
|---|---|
| persistence | persistencia |
| storage | almacenamiento |
| serialize / parse | serializar / interpretar |
| graceful degradation | degradación elegante |
| substitution | sustitución |
| deploy / ship | desplegar / publicar |
| repository | repositorio |

## What you built

Fourteen chapters ago: an empty folder and a browser. Now: a physics game you understand *line by line* — every constant, every collision, every class — verified by a harness you can read and extend, live at a URL with your name in it. Along the way, without a single lecture: naming, CONFIG, JSDoc, state machines, edge detection, defense in depth, SOLID, graceful degradation, and the habit of proving instead of hoping.

If this course helped you, a ⭐ on the repo helps the next learner find it. And if you want to feel the ground shift: the [sibling Rust course](https://github.com/mondragon-developer/rust_bevy_from_beginner_to_engineer) builds this *same game* where every one of these concepts wears a different body. Two languages, one game, one engineer — you.

**[Back to the course home →](../../README.md)**
