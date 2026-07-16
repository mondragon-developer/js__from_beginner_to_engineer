# Chapter 11 — Game Sessions and Players

*Read this in: **English** | [Español](README.es.md)*

Endless practice becomes a *game*: 10 shots, results, the tension of a last throw with a record on the line. And a game deserves players — profiles you can create and switch, each with their own best streak and best session. By the end of this chapter the page has every control the finished game will ever have. What it doesn't have yet is memory across reloads — and this chapter ends by making you feel that missing piece.

**Time**: ~1.5 hours.

## What you'll build in this chapter

The `"sessionOver"` state, a shots-left countdown, end-of-session results in a status line, the New session button, the player panel (dropdown, name input, Add button), and per-player in-memory records. Expected visual outcome: the scoreboard grows to its final four panels, and after your tenth shot the game stops you with your results.

## New concepts

- **the session object** — `{ score, shotsLeft, streak }`: one game's worth of state, replaceable in one assignment
- **records vs. session** — what resets every game vs. what a player keeps
- **`??` (nullish coalescing)** — "use this, or that if this doesn't exist"
- **`createElement` / `appendChild`** — building DOM elements from code
- **spread + `some`** — `[...select.options].some(...)`: asking a question of a collection
- **`trim`** — sanitizing user input, the first time the game accepts any

## Build it, step by step

### Step 1 — The page completes itself

Three HTML additions (full markup and CSS in the [snapshot](snapshot/index.html)): the **player row** above the scoreboard, two **new panels** (Shots left, Best), a **status line**, and a **footer** with the New session button:

```html
<div class="players">
  <select id="playerSelect" aria-label="Choose player"></select>
  <input id="playerNameInput" type="text" maxlength="18" placeholder="New player name" aria-label="New player name">
  <button id="addPlayerButton" type="button">Add</button>
</div>
```

```html
<p class="status" id="sessionStatus" aria-live="polite"></p>
```

```html
<footer>
  <button id="newSessionButton" type="button">New session</button>
  <p class="credit">Chapter 11 of 14</p>
</footer>
```

Note the `<select>` is **empty** — the game populates it from code, because the list of players is *data*, not markup.

### Step 2 — Sessions and records are different things

```js
const game = {
  state: "ready",         // "ready" | "flight" | "sessionOver"
  scoredThisShot: false,
  celebrateUntil: 0,
  playerName: "",
  session: { score: 0, shotsLeft: CONFIG.session.shotLimit, streak: 0 },
  records: { bestStreak: 0, bestSession: 0 }
};

/* All known players and their records, by name — in memory only.
 * Close the tab and they're gone: that is Chapter 14's problem. */
const allPlayers = {};
```

(CONFIG gains `session: { shotLimit: 10 }`.) The split is the chapter's design idea: `session` is everything that dies when a new game starts — so `newSession()` can replace it in **one assignment**, no field-by-field resetting, nothing forgettable. `records` is what a player keeps *across* sessions. Two lifetimes, two objects.

### Step 3 — The session's rules

`shoot` spends a shot; `updateFlight`'s settle branch decides what the end of a shot means now:

```js
  game.session.shotsLeft -= 1;
  commit();
```

```js
  if (shotIsOver()) {
    if (!game.scoredThisShot) game.session.streak = 0;
    if (game.session.shotsLeft === 0) {
      endSession();
    } else {
      game.state = "ready"; // the ball stays put: next shot starts here
    }
    commit();
  }
```

…and the scoring branch feeds the record as it happens: `game.records.bestStreak = Math.max(game.records.bestStreak, game.session.streak);` — `Math.max` is the one-line idiom for "keep the best."

> [!WARNING]
> **Real error: the countdown that keeps counting.** The tenth shot must end somewhere. Forget the `shotsLeft === 0` branch (or the `"sessionOver"` state entirely) and shooting keeps working — we measured the result: three extra shots later, **`shotsLeft` is −3, and the LED panel happily displays it**. Nothing crashes; the game just stops making sense. Numbers that should stop at zero don't stop themselves — a *rule* stops them, and rules live in the state machine.

The session's bookends:

```js
/** Fresh session: full shot count, zeroed score, ball on the line. */
function newSession() {
  game.session = { score: 0, shotsLeft: CONFIG.session.shotLimit, streak: 0 };
  ball.x = CONFIG.ball.startX;
  ball.y = CONFIG.ball.startY;
  ball.vx = 0;
  ball.vy = 0;
  game.state = "ready";
  setStatus("");
  updateScoreboard();
}

/** Close the session: update records and show the results line. */
function endSession() {
  game.state = "sessionOver";
  const made = game.session.score;
  const limit = CONFIG.session.shotLimit;
  const isRecord = made > game.records.bestSession;
  game.records.bestSession = Math.max(game.records.bestSession, made);
  setStatus(
    `${game.playerName}: ${made} of ${limit} made` +
    (isRecord ? " — new personal best!" : ` · personal best ${game.records.bestSession}`) +
    " Press New session to play again."
  );
}
```

One subtlety worth admiring in `endSession`: `isRecord` is computed *before* `Math.max` updates the record — compare after updating and every session ties its own record. Order of operations is a correctness tool.

Notice what we did **not** write: any change to `onPointerDown`. Its gate says `state !== "ready"`, and `"sessionOver"` isn't `"ready"` — the refusal is free. That's the state machine paying compound interest.

### Step 4 — Players

```js
/**
 * Load (or create) the named player's records, make them active,
 * and start them a fresh session.
 * @param {string} name
 */
function switchPlayer(name) {
  game.playerName = name;
  game.records = allPlayers[name] ?? { bestStreak: 0, bestSession: 0 };
  allPlayers[name] = game.records;
  newSession();
}

/** Save the active player's records and refresh the panels. */
function commit() {
  allPlayers[game.playerName] = game.records;
  updateScoreboard();
}
```

> [!NOTE]
> **`??` — the "or else" operator.** `allPlayers[name] ?? {...}` reads: *Ana's records — or, if there's no such entry, this fresh pair of zeros.* It's the polite question mark of JavaScript: use the left side unless it's `null`/`undefined`, then fall back to the right. You'll see it again in Chapter 14, guarding against an empty localStorage — same operator, same job: **make "doesn't exist yet" a normal, handled case instead of a crash.**

The panel's three functions build and guard the dropdown:

```js
/** Create the player typed in the input box and switch to them. */
function addPlayerFromInput() {
  const name = playerNameInput.value.trim();
  if (name === "" || playerExists(name)) return;
  addOption(name);
  playerSelect.value = name;
  playerNameInput.value = "";
  switchPlayer(name);
}
```

(`addOption` builds an `<option>` with `createElement`/`appendChild`; `playerExists` asks `[...playerSelect.options].some((o) => o.value === name)` — spread the collection into an array, then `some` answers "does *any* element pass this test?".)

> [!WARNING]
> **Real error: the player who exists twice.** Skip the `playerExists` check and click Add twice with the same name: two identical `<option>`s — and both point at **one** records entry, because `allPlayers` is keyed by name. Rename one letter of the guard and "Ana" and "Ana " (trailing space) become two different humans sharing a screen name. That's why the *first* line is `trim()` and the *second* is the existence check: sanitize, then validate, then act. The harness now clicks Add with `"  Ana  "`, `"Ana"`, and `"   "` on every run — one option total, forever.

### Step 5 — Boot grows up

```js
playerSelect.addEventListener("change", () => switchPlayer(playerSelect.value));
document.getElementById("addPlayerButton").addEventListener("click", addPlayerFromInput);
document.getElementById("newSessionButton").addEventListener("click", newSession);

addOption("Player 1");
playerSelect.value = "Player 1";
switchPlayer("Player 1");
```

(`updateScoreboard()` disappears from the boot — `switchPlayer` ends in `newSession`, which ends in `updateScoreboard`. The boot is wiring plus one entry point.)

**Checkpoint — the chapter's visible change:** save and play a full session. Shots left counts 10 → 0; the status line announces *"Player 1: 4 of 10 made — new personal best! Press New session to play again."*; the game refuses your eleventh shot until you press the button. Add a second player — fresh session, fresh records — then switch back: your Best panel remembers. Then **reload the page**. Everything is gone. Feel that properly: it's Chapter 14's entire reason to exist.

Your file should now match this chapter's [`snapshot/index.html`](snapshot/index.html).

## Why we did it this way

`commit()` is the quiet star: every rule that changes player data ends by calling it, so "records are saved and the board is fresh" is an invariant with one implementation. When Chapter 14 swaps the in-memory `allPlayers` for real persistent storage, `commit` is nearly the only function that changes — the rest of the game never knew where records lived. Designing so that *the change you know is coming touches one place* is half of what Part IV means by architecture; you just did it a chapter early, without a class in sight.

## Experiment corner

1. `shotLimit: 3` — sudden-death sessions; feel how the limit *is* the game's tension knob. Try `1`.
2. In the console, type `allPlayers` after playing two players. Expand it: the whole social structure of your game is one honest object.
3. Break it on purpose: in `switchPlayer`, replace `?? { bestStreak: 0, bestSession: 0 }` with nothing (`= allPlayers[name];`) and switch to a brand-new player. `undefined.bestStreak` — read the TypeError, then appreciate the two characters that prevented it.

## Exercises

Worked solutions are in [`exercises/solutions/`](exercises/solutions/).

1. **Guided** — the status line only speaks at session end. Make it also announce the *last* shot: when `shotsLeft` hits 1, show `"Last shot!"`. (Where: one `if` — but in `shoot` or in `updateFlight`? Reason about which moment the message belongs to.)
2. **Independent** — add an **accuracy** readout to the results line: `"4 of 10 made (40%)"`. Careful with a session where the player pressed New session early — never divide by the *limit*, divide by shots actually taken… or is the limit always right here? Justify.
3. **Stretch** — a **Delete player** button: removes the selected player from the dropdown *and* from `allPlayers`, then switches to the first remaining player (guarantee at least one always exists — the finished game makes the same guarantee at boot). The solution discusses the two orders you can do this in, and which one crashes.

## Vocabulary

| English | Español |
|---|---|
| session | sesión / partida |
| record (best) | récord / marca personal |
| profile | perfil |
| dropdown | menú desplegable |
| countdown | cuenta regresiva |
| sanitize (input) | sanear / limpiar (la entrada) |
| invariant | invariante |

## What's next

The game is complete — and it's 700 lines of loose functions sharing globals. Part IV begins: in **Chapter 12**, `Ball` and `Hoop` become the course's first classes, and you'll prove — with the harness, not with faith — that behavior stayed *identical*. That proof is what the word "refactoring" actually means.

**[Continue to Chapter 12: From objects to classes →](../12-from-objects-to-classes/README.md)**
