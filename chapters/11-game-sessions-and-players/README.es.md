# Capítulo 11 — Sesiones de Juego y Jugadores

*Léelo en: [English](README.md) | **Español***

La práctica infinita se convierte en *partida*: 10 tiros, resultados, la tensión de un último lanzamiento con un récord en juego. Y una partida merece jugadores — perfiles que puedes crear y cambiar, cada uno con su propia mejor racha y mejor sesión. Al final de este capítulo la página tiene todos los controles que el juego terminado tendrá jamás. Lo que aún no tiene es memoria entre recargas — y este capítulo termina haciéndote sentir esa pieza faltante.

**Tiempo**: ~1.5 horas.

## Lo que vas a construir en este capítulo

El estado `"sessionOver"`, la cuenta regresiva de tiros, resultados de fin de sesión en una línea de estado, el botón de Nueva sesión, el panel de jugadores (desplegable, campo de nombre, botón Add), y récords individuales en memoria. Resultado visual esperado: el marcador crece a sus cuatro paneles definitivos, y después de tu décimo tiro el juego te detiene con tus resultados.

## Conceptos nuevos

- **el objeto de sesión** — `{ score, shotsLeft, streak }`: el estado de una partida, reemplazable en una asignación
- **récords vs. sesión** — lo que se reinicia cada partida vs. lo que un jugador conserva
- **`??` (fusión de nulos)** — "usa esto, o aquello si esto no existe"
- **`createElement` / `appendChild`** — construir elementos del DOM desde código
- **spread + `some`** — `[...select.options].some(...)`: hacerle una pregunta a una colección
- **`trim`** — sanear la entrada del usuario, la primera vez que el juego acepta alguna

## Constrúyelo, paso a paso

### Paso 1 — La página se completa

Tres adiciones de HTML (el markup y CSS completos están en el [snapshot](snapshot/index.html)): la **fila de jugadores** arriba del marcador, dos **paneles nuevos** (Shots left, Best), una **línea de estado**, y un **footer** con el botón de Nueva sesión:

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

Nota que el `<select>` está **vacío** — el juego lo llena desde el código, porque la lista de jugadores es *dato*, no markup.

### Paso 2 — Sesiones y récords son cosas distintas

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

(CONFIG gana `session: { shotLimit: 10 }`.) La separación es la idea de diseño del capítulo: `session` es todo lo que muere cuando empieza una partida nueva — así `newSession()` puede reemplazarla en **una asignación**, sin reinicios campo por campo, sin nada olvidable. `records` es lo que un jugador conserva *entre* sesiones. Dos tiempos de vida, dos objetos.

### Paso 3 — Las reglas de la sesión

`shoot` gasta un tiro; la rama de asentamiento de `updateFlight` decide qué significa ahora el final de un tiro:

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

…y la rama de puntuación alimenta el récord en el momento: `game.records.bestStreak = Math.max(game.records.bestStreak, game.session.streak);` — `Math.max` es el modismo de una línea para "quédate con el mejor".

> [!WARNING]
> **Error real: la cuenta regresiva que sigue contando.** El décimo tiro debe terminar en alguna parte. Olvida la rama `shotsLeft === 0` (o el estado `"sessionOver"` completo) y el tiro sigue funcionando — medimos el resultado: tres tiros extra después, **`shotsLeft` vale −3, y el panel LED lo muestra feliz de la vida**. Nada truena; el juego solo deja de tener sentido. Los números que deberían detenerse en cero no se detienen solos — los detiene una *regla*, y las reglas viven en la máquina de estados.

Los dos extremos de la sesión:

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

Una sutileza digna de admirar en `endSession`: `isRecord` se calcula *antes* de que `Math.max` actualice el récord — compáralo después de actualizar y cada sesión empata su propio récord. El orden de las operaciones es una herramienta de correctitud.

Nota lo que **no** escribimos: ningún cambio a `onPointerDown`. Su compuerta dice `state !== "ready"`, y `"sessionOver"` no es `"ready"` — el rechazo sale gratis. Esa es la máquina de estados pagando interés compuesto.

### Paso 4 — Jugadores

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
> **`??` — el operador de "o si no".** `allPlayers[name] ?? {...}` se lee: *los récords de Ana — o, si no existe tal entrada, este par fresco de ceros.* Es el signo de interrogación educado de JavaScript: usa el lado izquierdo salvo que sea `null`/`undefined`, entonces recurre al derecho. Lo verás de nuevo en el Capítulo 14, protegiendo contra un localStorage vacío — el mismo operador, el mismo trabajo: **hacer de "todavía no existe" un caso normal y manejado en lugar de un crash.**

Las tres funciones del panel construyen y protegen el desplegable:

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

(`addOption` construye un `<option>` con `createElement`/`appendChild`; `playerExists` pregunta `[...playerSelect.options].some((o) => o.value === name)` — expande la colección a un arreglo, y `some` responde "¿*algún* elemento pasa esta prueba?".)

> [!WARNING]
> **Error real: el jugador que existe dos veces.** Sáltate la revisión `playerExists` y presiona Add dos veces con el mismo nombre: dos `<option>` idénticos — y ambos apuntan a **una** entrada de récords, porque `allPlayers` se indexa por nombre. Cambia una letra de la guarda y "Ana" y "Ana " (con espacio final) se vuelven dos humanos distintos compartiendo nombre en pantalla. Por eso la *primera* línea es `trim()` y la *segunda* es la revisión de existencia: sanear, luego validar, luego actuar. El arnés ahora presiona Add con `"  Ana  "`, `"Ana"` y `"   "` en cada corrida — una sola opción, para siempre.

### Paso 5 — El Boot madura

```js
playerSelect.addEventListener("change", () => switchPlayer(playerSelect.value));
document.getElementById("addPlayerButton").addEventListener("click", addPlayerFromInput);
document.getElementById("newSessionButton").addEventListener("click", newSession);

addOption("Player 1");
playerSelect.value = "Player 1";
switchPlayer("Player 1");
```

(`updateScoreboard()` desaparece del boot — `switchPlayer` termina en `newSession`, que termina en `updateScoreboard`. El boot es cableado más un punto de entrada.)

**Punto de control — el cambio visible del capítulo:** guarda y juega una sesión completa. Shots left cuenta 10 → 0; la línea de estado anuncia *"Player 1: 4 of 10 made — new personal best! Press New session to play again."*; el juego rechaza tu undécimo tiro hasta que presionas el botón. Agrega un segundo jugador — sesión fresca, récords frescos — y regresa: tu panel Best recuerda. Luego **recarga la página**. Todo desapareció. Siéntelo bien: es la razón entera de existir del Capítulo 14.

Tu archivo debería coincidir ahora con el [`snapshot/index.html`](snapshot/index.html) de este capítulo.

## Por qué lo hicimos así

`commit()` es la estrella silenciosa: cada regla que cambia datos del jugador termina llamándola, así que "los récords están guardados y el tablero fresco" es una invariante con una sola implementación. Cuando el Capítulo 14 cambie el `allPlayers` en memoria por almacenamiento persistente de verdad, `commit` será casi la única función que cambie — el resto del juego nunca supo dónde vivían los récords. Diseñar para que *el cambio que sabes que viene toque un solo lugar* es la mitad de lo que la Parte IV entiende por arquitectura; lo acabas de hacer un capítulo antes, sin una sola clase a la vista.

## Rincón de experimentos

1. `shotLimit: 3` — sesiones de muerte súbita; siente cómo el límite *es* la perilla de tensión del juego. Prueba `1`.
2. En la consola, escribe `allPlayers` después de jugar con dos jugadores. Expándelo: toda la estructura social de tu juego es un objeto honesto.
3. Rómpelo a propósito: en `switchPlayer`, quita el `?? { bestStreak: 0, bestSession: 0 }` (deja `= allPlayers[name];`) y cambia a un jugador nuevo. `undefined.bestStreak` — lee el TypeError, y aprecia los dos caracteres que lo prevenían.

## Ejercicios

Las soluciones desarrolladas están en [`exercises/solutions/`](exercises/solutions/).

1. **Guiado** — la línea de estado solo habla al final de la sesión. Haz que también anuncie el *último* tiro: cuando `shotsLeft` llegue a 1, muestra `"Last shot!"`. (¿Dónde: un `if` — pero en `shoot` o en `updateFlight`? Razona a qué momento pertenece el mensaje.)
2. **Independiente** — agrega **precisión** a la línea de resultados: `"4 of 10 made (40%)"`. Cuidado con una sesión donde el jugador presionó Nueva sesión antes de tiempo — nunca dividas entre el *límite*, divide entre los tiros realmente tomados… ¿o el límite siempre es correcto aquí? Justifica.
3. **Reto** — un botón de **Borrar jugador**: quita al jugador seleccionado del desplegable *y* de `allPlayers`, y cambia al primer jugador restante (garantiza que siempre exista al menos uno — el juego terminado hace la misma garantía al arrancar). La solución discute los dos órdenes en que puedes hacerlo, y cuál truena.

## Vocabulario

| English | Español |
|---|---|
| session | sesión / partida |
| record (best) | récord / marca personal |
| profile | perfil |
| dropdown | menú desplegable |
| countdown | cuenta regresiva |
| sanitize (input) | sanear / limpiar (la entrada) |
| invariant | invariante |

## Lo que sigue

El juego está completo — y son 700 líneas de funciones sueltas compartiendo globales. Empieza la Parte IV: en el **Capítulo 12**, `Ball` y `Hoop` se vuelven las primeras clases del curso, y demostrarás — con el arnés, no con fe — que el comportamiento quedó *idéntico*. Esa demostración es lo que la palabra "refactorizar" significa de verdad.

**[Continúa al Capítulo 12: De objetos a clases →](../12-from-objects-to-classes/README.es.md)**
