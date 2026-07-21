# Chapter 10 - Worked solutions

*Read this in: **English** | [Español](README.es.md)*

Each solution shows the exact change against [`../../snapshot/index.html`](../../snapshot/index.html).

## 1 - Guided: should `700` move to CONFIG?

**The case for CONFIG:** it's a number that tunes the game's feel, like `chargeTime`; a designer adjusting feedback duration shouldn't hunt through `updateFlight`.

**The case for the literal:** it's used exactly once, it's purely visual, and `celebrateUntil = timestamp + 700` reads perfectly at the point of use - moving it adds a CONFIG key whose name (`celebrationMs`?) is longer than the fact it encodes.

**The answer key's actual choice:** the literal stays (`this.celebrateUntil = timestamp + 700;`). It falls under the course rule from Chapter 4: *values used once, purely visually, inside the code that uses them may stay inline.* The deeper lesson: both positions are defensible, and a codebase is healthier when its rule names the exception than when either camp wins everywhere. If a second use of the duration ever appears (say, a scoreboard flash), *that's* the moment it moves to CONFIG - duplication, not existence, is the trigger.

## 2 - Independent: the Misses panel

HTML - a third panel:

```html
  <div class="panel"><div class="label">Misses</div><div class="value" id="misses">0</div></div>
```

State and DOM:

```js
const missesEl = document.getElementById("misses");
```

…plus `misses: 0,` inside the `game` object, and one line in `updateScoreboard`:

```js
  missesEl.textContent = String(game.misses);
```

The one right line - inside `updateFlight`'s settle branch, where the miss becomes *final*:

```js
  if (shotIsOver()) {
    if (!game.scoredThisShot) {
      game.streak = 0;
      game.misses += 1;
    }
    game.state = "ready";
    updateScoreboard();
  }
```

Why there and nowhere else: a shot isn't a miss when it leaves your hands, or when it clangs off the rim - it's a miss when it *settles unscored*. The `!game.scoredThisShot` test at settle time is the exact definition, already written; the counter just joins it. (Putting it in `shoot()` counts optimistically; putting it in `isScore`'s else-world counts every non-scoring *frame* - the naive-detector bug in a new costume.)

## 3 - Stretch: SWISH detection

Three placements, one line each. The flag joins the game state:

```js
  scoredThisShot: false,
  touchedIron: false,     // did this shot contact rim or backboard?
```

It resets when a shot begins - `shoot()` is the only door into `"flight"`, so it's the only reset point needed:

```js
function shoot(vx, vy) {
  ball.vx = vx;
  ball.vy = vy;
  game.state = "flight";
  game.scoredThisShot = false;
  game.touchedIron = false;
}
```

It's set at the two contact sites. In `collideRimPoint`, inside the reflection branch (a touch is a *reflection*, not mere proximity):

```js
  if (approaching < 0) {
    game.touchedIron = true;
```

…and in `collideBoard`, inside its `if`:

```js
  if (withinHeight && crossing) {
    game.touchedIron = true;
```

And the judgment, in `updateFlight`'s scoring branch:

```js
  if (!game.scoredThisShot && isScore(previousY)) {
    game.scoredThisShot = true;
    if (!game.touchedIron) console.log("SWISH");
```

The design lesson mirrors the chapter's: `touchedIron` is edge-state that lives exactly one shot, so its lifecycle hangs on the state machine's transitions - reset at the door in, read at the scoring event. If you found yourself wanting to reset it in `updateFlight`'s settle branch too, notice it's unnecessary: the next `shoot()` always runs first. One reset point, one read point, two set points - and each is the *only* correct place for its job.
