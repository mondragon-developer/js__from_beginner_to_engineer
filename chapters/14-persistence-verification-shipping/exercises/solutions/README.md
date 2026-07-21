# Chapter 14 - Worked solutions

*Read this in: **English** | [Español](README.es.md)*

## 1 - Guided: the versioned key

Change `static #KEY = "freethrow.players.v2"` to `.v3`, reload: the Best panel reads 0. Your `.v2` records still sit in localStorage, untouched and unread - orphaned, not destroyed (check DevTools → Application → Local Storage: both keys exist now).

**Why versioning is a feature:** the key names not just *where* the data lives but *what shape* it has. If a release changes the records' shape - say `bestSession` becomes `{score, date}` - old stored data would crash or corrupt the new code the moment `loadAll` hands it over. Bumping the version makes the new code *blind* to the old shape: worst case is a clean fresh start, never a crash on someone else's machine.

**What a real product does with the orphans:** a *migration* - on boot, if `.v3` is empty but `.v2` exists, read the old shape, transform it into the new one, save under `.v3` (and only then, optionally, delete `.v2`). Where would that live? Inside `PlayerStore` - it's the only class that knows keys and shapes exist. The pattern scales from this 30-line class to production database migrations without changing its soul.

## 2 - Independent: the fourth check

Appended to `verify-my-game.mjs` (and executed against the real snapshot - output `ok`, final line becomes `4 checks passed`):

```js
// 4. The backboard reflects at exactly boardRestitution
const b2 = new Ball();
b2.x = CONFIG.hoop.boardX - b2.radius + 2;  // overlapping the glass, mid-board
b2.y = (CONFIG.hoop.boardTop + CONFIG.hoop.boardBottom) / 2;
b2.vx = 800;
b2.vy = 0;
h.collide(b2);
assert("backboard reflects at boardRestitution",
       Math.abs(b2.vx + 800 * CONFIG.physics.boardRestitution) < 1e-9);
```

Measured: `vx` comes back exactly `-480` - `800 × 0.6`, sign flipped. Details worth checking against your version: a **fresh** ball (`b2`) rather than reusing `b` with stale velocity from check 3; position *overlapping* the board (`boardX - radius + 2`) because `#collideBoard` acts on overlap, not proximity; and the assertion written as `vx + 800 × r` (expecting a *negative* result) - if you wrote `vx - ...` your check would fail against correct code, which is the second-worst harness bug there is. (The worst is one that passes against broken code. Test your tests: break the game on purpose once and watch the check catch it.)

## 3 - Stretch: records export/import

The console pair, usable today:

```js
// Export: prints (and in DevTools, copies) your records as JSON text
copy(localStorage.getItem("freethrow.players.v2"));

// Import: paste the text between the quotes, run, reload
localStorage.setItem("freethrow.players.v2", '...paste here...');
```

**Where does it belong?** Argue it with Chapter 13's principles and the answer sorts itself into layers. The *knowledge* - that a key exists, what it's called, what shape the value has - belongs to `PlayerStore` and nobody else (Single Responsibility; every other class is storage-ignorant on purpose). So if this ever becomes a real feature, the store grows two small methods:

```js
  /** @returns {string} every player's records as portable JSON */
  exportAll() { return JSON.stringify(this.loadAll()); }

  /** @param {string} json records previously produced by exportAll */
  importAll(json) {
    const all = JSON.parse(json) ?? {};   // malformed input: fail loudly, here
    for (const [name, records] of Object.entries(all)) this.save(name, records);
  }
```

…and the *trigger* (a button, a menu) belongs to the UI layer - a new panel class or the existing footer - wired through Game like every other control (Dependency Inversion: the store still doesn't know buttons exist). But note the honest third answer: for a personal project, **the console one-liner is a legitimate finished product.** Not every capability deserves UI; knowing which layer a feature stops at is also an engineering judgment - maybe the course's last one.
