# Chapter 11 - Worked solutions

*Read this in: **English** | [Español](README.es.md)*

Each solution shows the exact change against [`../../snapshot/index.html`](../../snapshot/index.html).

## 1 - Guided: "Last shot!"

The message belongs to *the moment the shot count changes* - that's `shoot`:

```js
function shoot(vx, vy) {
  ball.vx = vx;
  ball.vy = vy;
  game.state = "flight";
  game.scoredThisShot = false;
  game.session.shotsLeft -= 1;
  if (game.session.shotsLeft === 1) setStatus("Last shot!");
  commit();
}
```

Why not `updateFlight`? Its settle branch runs when a shot *ends* - announcing "Last shot!" there labels the moment you're already watching your ninth shot's result, which reads one beat late. The decrement line is the single place `shotsLeft` changes, so the rule about its value lives beside it. One wrinkle you'd discover playing: the message lingers during the last shot's flight - pleasant, actually, and `endSession`'s status overwrites it at exactly the right moment. (If it bothered you, `setStatus("")` in the settle branch's `else` clears it - a defensible variation.)

## 2 - Independent: accuracy in the results line

In `endSession`:

```js
  const taken = CONFIG.session.shotLimit - game.session.shotsLeft;
  const accuracy = Math.round((made / taken) * 100);
  setStatus(
    `${game.playerName}: ${made} of ${limit} made (${accuracy}%)` +
```

**Is the limit always right here?** In *this* game - yes, and it's worth proving to yourself: `endSession` is called from exactly one place, `updateFlight`'s `shotsLeft === 0` branch, so `taken` always equals `limit` and dividing by either works. So why write `taken`? Because the equality is a *coincidence of the current call graph*, not a rule anyone stated. The New session button lets a player abandon a session early today - if a future feature ever ends a session early too (a timer mode, say), `made / limit` silently under-reports accuracy, while `made / taken` stays correct. Divide by the thing you *mean*. (And note `taken` can never be 0 here: reaching `endSession` requires ten decrements.)

## 3 - Stretch: Delete player

HTML - a second button in the player row:

```html
  <button id="deletePlayerButton" type="button">Delete</button>
```

The function:

```js
/** Remove the selected player; the game guarantees one always remains. */
function deletePlayer() {
  if (playerSelect.options.length <= 1) return; // never delete the last player
  const name = playerSelect.value;
  delete allPlayers[name];
  const doomed = [...playerSelect.options].find((o) => o.value === name);
  doomed.remove();
  switchPlayer(playerSelect.options[0].value);
}
```

Boot wiring: `document.getElementById("deletePlayerButton").addEventListener("click", deletePlayer);`

**The two orders, and which one crashes:** you must capture `name` and remove the entry *before* calling `switchPlayer` - but the subtle trap is the other direction. Suppose you wrote `switchPlayer(playerSelect.options[0].value)` *first* and deleted after: if the doomed player *was* option 0, you'd switch to them, then delete the records object the game is actively holding - `commit()` would quietly resurrect them on the next basket. Ghost players. The order above - guard, capture, delete data, delete DOM, then switch - touches the doomed player last as pure history. (`find` is `some`'s sibling: it returns the first *element* that passes, not just true/false; and `option.remove()` is the DOM's own delete.)

The `length <= 1` guard mirrors the finished game's boot guarantee (`if (names.length === 0) names.push("Player 1")`): the invariant "there is always at least one player" is enforced at every door that could break it.
