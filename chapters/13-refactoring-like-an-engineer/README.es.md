# Capítulo 13 - Refactorizando Como Ingeniero

*Léelo en: [English](README.md) | **Español***

El Capítulo 12 ensayó la mecánica en las dos costuras más fáciles. Hoy llega la arquitectura completa: **veintisiete funciones de nivel superior se convierten en cero**, absorbidas por `InputController`, `Renderer`, `Scoreboard`, `PlayerPanel`, y una clase `Game` que compone todo. Y en lugar de sermonearte cinco principios abstractos, este capítulo enseña cada principio **SOLID** en la línea exacta del refactor que lo demuestra. Al final, tu código *es* la arquitectura del juego terminado - el diff contra la clave de respuestas es una clase de almacenamiento, y el Capítulo 14 la escribe.

**Tiempo**: ~2 horas. El capítulo más grande - toma un descanso en el Paso 4.

## Lo que vas a construir en este capítulo

Cinco clases y un boot de una línea. Medido de los snapshots reales: el archivo del Capítulo 12 tenía **27 funciones de nivel superior** compartiendo 6 globales; el de este capítulo tiene **0** - siete clases, 924 líneas, y un boot que dice `new Game(document.getElementById("court"))`. El resultado visible, enmarcado con la honestidad del Capítulo 12: el juego se juega idéntico (el arnés re-certifica cada hito), y la recompensa se demuestra *en vivo* en el Rincón de experimentos - cambios que antes eran cacería ahora son una línea en un hogar obvio.

## Conceptos nuevos

- **SOLID** - cinco principios, cada uno enseñado en su momento abajo
- **raíz de composición** - el único lugar que construye y cablea todo
- **callbacks como contratos** - `canAim` / `onLaunch`
- **funciones flecha y `this`** - la cura para el error del método separado del Capítulo 12

El código completo está en el [snapshot](snapshot/index.html); cada paso muestra las líneas que cargan el peso y nombra qué se mudó. Trabaja clase por clase, **borrando cada función cuando su clase la absorba** - en ningún momento un comportamiento debe existir dos veces.

## Constrúyelo, paso a paso

### Paso 1 - `InputController` (y la "D" de SOLID)

Absorbe: el objeto `input`, `toWorld`, los tres manejadores, `power`, `launchVelocity`. El constructor es la parte interesante:

```js
class InputController {
  /**
   * @param {HTMLCanvasElement} canvas the surface receiving gestures
   * @param {Ball} ball read-only reference: aiming starts from wherever it sits
   * @param {() => boolean} canAim tells us whether aiming is allowed now
   * @param {(vx: number, vy: number) => void} onLaunch fired on release
   */
  constructor(canvas, ball, canAim, onLaunch) {
    this.canvas = canvas;
    this.ball = ball;
    this.canAim = canAim;
    this.onLaunch = onLaunch;
    this.isCharging = false;
    this.chargeStart = 0;
    this.aimX = 0;
    this.aimY = 0;

    canvas.addEventListener("pointerdown", (e) => this.#start(e));
    canvas.addEventListener("pointermove", (e) => this.#move(e));
    canvas.addEventListener("pointerup", () => this.#release());
    canvas.addEventListener("pointercancel", () => { this.isCharging = false; });
  }
```

Mira lo que esta clase **no** sabe. Nunca lee `game.state` - pregunta `this.canAim()`. Nunca llama a `shoot` - anuncia `this.onLaunch(vx, vy)`. Quien la construye decide qué significan esas dos cosas.

> [!NOTE]
> **D - Inversión de Dependencias: depende de contratos, no de jefes.** El cableado ingenuo apunta hacia arriba: la entrada llama al `shoot` del juego, así que la entrada *depende del* juego - reutilízala en otro lado y el juego viene arrastrado. Invertido, el controlador declara dos contratos diminutos - "una función que dice si puedo" y "una función que llamo con una velocidad" - y permanece felizmente ignorante de quién los cumple. En el Rincón de experimentos le pasarás un `onLaunch` falso desde la consola y lo verás servir contento a otro amo. Ese es el principio entero: **el detector de tiros no debería conocer el significado de los tiros.**

> [!WARNING]
> **Error real: el manejador que se pierde a sí mismo.** Escribe los escuchadores "limpiamente" como `canvas.addEventListener("pointerup", this.#release)` y la primera soltada lanza error - reprodujimos la familia en Chrome 150; para un método privado el mensaje es el desconcertante `TypeError: Cannot read properties of undefined (reading ...)`, porque el navegador llama tu método *separado*, con `this` como `undefined` (el primo del Capítulo 12, ahora en libertad). La cura es la flecha: `() => this.#release()`. Una función flecha no tiene `this` propio - *conserva el del constructor* - así que el método siempre llega a casa. Cada escuchador del juego terminado usa este patrón, y ahora conoces el bug que previene.

### Paso 2 - `Renderer` (y la "S")

Absorbe las ocho funciones de dibujo como métodos privados, más `canvas.getContext`. Un método público:

```js
  /**
   * Draw one complete frame.
   * @param {Ball} ball
   * @param {Hoop} hoop
   * @param {InputController} input
   * @param {boolean} celebrating true right after a made basket
   */
  draw(ball, hoop, input, celebrating) {
    this.#drawBackground();
    this.#drawCourt();
    this.#drawHoopBack(hoop);
    if (input.isCharging) {
      this.#drawTrajectoryPreview(ball, input);
      this.#drawPowerBar(input.power());
    }
    this.#drawBall(ball);
    this.#drawHoopFront(hoop, celebrating);
  }
```

Los cuerpos son tu código de dibujo de los capítulos 7-10 con dos cambios mecánicos: `ctx` se vuelve `this.ctx`, y los métodos del aro leen la geometría del *parámetro* `hoop` (`hoop.frontX`, `hoop.rimY`) en lugar de CONFIG - resolviendo la inconsistencia que picaste en el Rincón de experimentos del Capítulo 12: el objeto Hoop ahora es la única verdad sobre dónde está el aro, para la física *y* para los píxeles.

> [!NOTE]
> **S - Responsabilidad Única: una clase, una razón para cambiar.** El Renderer solo *lee* el estado del juego y escribe píxeles - sin efectos secundarios, sin reglas; podrías llamar `draw` dos veces por cuadro y nada del juego cambiaría. `Ball` integra pero nunca dibuja. `InputController` detecta pero nunca decide. La prueba es la frase "…y…": si describir una clase la necesita ("dibuja la escena *y* actualiza los récords"), son dos clases en una gabardina. Cada costura que has cortado desde la separación `drawCourt`/`drawBall` del Capítulo 5 era este principio ensayando.

### Paso 3 - `Scoreboard` y `PlayerPanel` (y la "I")

`Scoreboard` absorbe los cinco `getElementById` de los paneles más `updateScoreboard`/`setStatus` - volviéndose `update(session, records)` y `status(text)`. `PlayerPanel` absorbe `addOption`/`playerExists`/`addPlayerFromInput` más el cableado de select/input/botón, reportando hacia arriba a través de un único callback `onSelect` (Inversión de Dependencias otra vez, segunda estrofa).

> [!NOTE]
> **I - Segregación de Interfaces: puertas pequeñas, no un andén de carga.** El Game podría hurgar directamente los elementos DOM del marcador; en cambio ve exactamente dos verbos - `update` y `status` - y el PlayerPanel ofrece exactamente un evento. Las superficies públicas pequeñas son la razón de que el arnés pueda manejar este juego entero con unos cuantos stubs, y de que el Capítulo 14 pueda cambiar el almacenamiento sin que el Scoreboard se entere jamás. Cuando la superficie pública de una clase cabe en un respiro, sus usuarios se mantienen honestos.

### Paso 4 - `Game`: la raíz de composición

Absorbe: el objeto de estado `game`, `shoot`, `updateFlight`, `shotIsOver`, `collideBounds`, `newSession`/`endSession`/`switchPlayer`/`commit`, el bucle de cuadros, y cada pieza del cableado del boot. Su constructor es la arquitectura, legible en una pantalla:

```js
class Game {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas) {
    this.ball = new Ball();
    this.hoop = new Hoop();
    this.renderer = new Renderer(canvas);
    this.scoreboard = new Scoreboard();

    /* All known players and their records - in memory only for now.
     * Chapter 14 replaces this object with a persistent PlayerStore. */
    this.savedPlayers = {};

    this.input = new InputController(
      canvas,
      this.ball,
      () => this.state === "ready",
      (vx, vy) => this.#shoot(vx, vy)
    );

    this.state = "ready";     // "ready" | "flight" | "sessionOver"
    this.scoredThisShot = false;
    this.celebrateUntil = 0;
    this.lastTime = 0;

    // Load known players; guarantee at least one profile exists
    const names = Object.keys(this.savedPlayers);
    if (names.length === 0) names.push("Player 1");
    this.playerPanel = new PlayerPanel(names, (name) => this.#switchPlayer(name));
    this.#switchPlayer(names[0]);

    document.getElementById("newSessionButton")
      .addEventListener("click", () => this.#newSession());

    requestAnimationFrame((t) => this.#frame(t));
  }
```

Ahí están - los dos contratos del Paso 1, cumplidos: `() => this.state === "ready"` *es* `canAim`; `(vx, vy) => this.#shoot(vx, vy)` *es* `onLaunch`. Las reglas se quedaron en casa; solo los contratos viajaron. Y la última línea viste la armadura de flechas del Paso 1: `requestAnimationFrame((t) => this.#frame(t))` - escribe `requestAnimationFrame(this.#frame)` y obtienes el TypeError del método separado en el primerísimo cuadro (lo reprodujimos: `Cannot read properties of undefined (reading 'lastTime')`).

Todo lo demás en `Game` es tu lógica de los capítulos 10-11 con `game.` → `this.` y privados para lo interno: `#shoot`, `#frame`, `#updateFlight`, `#collideBounds`, `#shotIsOver`, `#newSession`, `#endSession`, `#switchPlayer`, `#commit`. La superficie pública del juego entero es… su constructor. Una puerta.

> [!NOTE]
> **O y L - los dos principios que ya conociste.** **Abierto/Cerrado** (abierto a extensión, cerrado a modificación) es el comentario del Hoop en la clave de respuestas: cambia el aro por otra clase de obstáculo con la misma superficie `collide`/`isScore` y *ninguna otra línea cambia* - el comportamiento se extiende sin ediciones. **Sustitución de Liskov** - todo lo que afirme un contrato debe poder usarse donde el contrato se espera, sin sorpresas - tiene su momento pleno en el Capítulo 14, cuando un almacén persistente y uno en memoria honran una interfaz idéntica y el Game genuinamente no puede distinguir cuál sostiene. Estáte atento.

> [!WARNING]
> **Error real: el orden de construcción es orden de dependencias.** En el constructor, intenta crear `this.input` *antes* de que `this.ball` exista. Nada se queja al construir - `this.ball` es silenciosamente `undefined` dentro del controlador - hasta la primera presión: `TypeError: Cannot read properties of undefined (reading 'x')` (reproducido). El orden de la raíz de composición no es estilo: cada línea solo puede usar lo que las líneas de arriba crearon. Lee tu constructor de arriba a abajo como un cronograma de obra. - Misma familia: mueve el `<script>` al `<head>` y el constructor de `Scoreboard` recibe `null`s, tronando después con `Cannot set properties of null (setting 'textContent')`. La regla más vieja del Capítulo 3 sigue montando guardia.

### Paso 5 - El boot se encoge a su forma final

```js
/* ---------- Boot ---------- */
new Game(document.getElementById("court"));
```

**Punto de control - el cambio visible del capítulo:** el juego se juega exactamente como antes - y `node verify/verify.mjs 13` lo demuestra: el snapshot pasa la batería propia de la clave de respuestas, manejado de punta a punta a través de la clase `Game` real (eventos de puntero simulados, cuadros paso a paso): la misma curva de potencia, la misma física del aro, el mismo barrido de **33/143**, las mismas reglas de sesión. **88 verificaciones en verde.** Luego corre el Rincón de experimentos: ahí la recompensa de este capítulo se vuelve algo que puedes *ver*.

Tu archivo debería coincidir ahora con el [`snapshot/index.html`](snapshot/index.html) de este capítulo - 924 líneas, y un diff contra la clave de respuestas que es, casi por completo, una clase faltante.

## Por qué lo hicimos así

El mapa de lo que pasó:

```
antes (cap. 12)                      después (cap. 13)
───────────────                      ─────────────────
CONFIG                               CONFIG
class Ball, class Hoop               class Ball, class Hoop
27 funciones + 6 globales     →      class InputController   (gestos → contratos)
  compartidas                        class PlayerPanel       (DOM de jugadores → un evento)
                                     class Renderer          (estado → píxeles)
                                     class Scoreboard        (dos verbos hacia el DOM)
                                     class Game              (reglas, bucle, composición)
boot: cableado + punto de entrada    boot: new Game(...)
```

Cada clase es un capítulo de este curso ya crecido: `InputController` es el Capítulo 8, `Renderer` es el dibujo de los capítulos 7+10, `Scoreboard` es el DOM del Capítulo 10, `PlayerPanel` y los métodos de sesión son el Capítulo 11, `Game` es la máquina de estados que ha manejado todo desde el Capítulo 10. Esa es la lección más profunda disponible aquí: **la buena arquitectura no se impone al final - se descubre a lo largo de las costuras que siempre estuvieron ahí.** Las funciones tuvieron los nombres correctos y las fronteras correctas durante siete capítulos; hoy solo recibieron dirección postal.

## Rincón de experimentos

1. **La recompensa, en vivo:** dale al juego una cancha nocturna - en `Renderer.#drawBackground`, cambia las dos paradas del degradado a `"#0a0f1c"` / `"#05080f"`. Un método, un hogar, listo. Ahora imagina la misma petición contra las globales del Capítulo 7 - cazarías cada degradado del archivo.
2. **La Inversión de Dependencias, sentida:** en la consola, `new InputController(document.getElementById("court"), {x: 460, y: 270}, () => true, (vx, vy) => console.log("would fire:", Math.round(vx), Math.round(vy)))` - luego carga y suelta sobre el canvas. El controlador sirve perfecto a tu amo falso; nunca necesitó al Game.
3. Rómpelo a propósito: cambia la línea del bucle a `requestAnimationFrame(this.#frame)` y recarga. Un cuadro, un TypeError, y un bug que reconocerás por el resto de tu carrera. Restaura la flecha.

## Ejercicios

Las soluciones desarrolladas están en [`exercises/solutions/`](exercises/solutions/).

1. **Guiado** - dale tema al aro: crea en `Renderer` un método privado `#rimColor(celebrating)` y úsalo en `#drawHoopFront`. Luego cambia el color de celebración a `"#7CFC00"` en exactamente un lugar. (El ejercicio es notar cómo la clase hizo de "un lugar" el resultado por defecto.)
2. **Independiente** - un contador de FPS: dale al `Renderer` un rastreador privado de tiempo de cuadro y dibuja `Math.round(1 / dt)` en una esquina. Decide: ¿`draw` gana un parámetro `dt`, o el Renderer calcula el suyo con `performance.now()`? Ambos funcionan - justifica tu elección en una oración. (Uno mantiene puro al Renderer; el otro mantiene limpia la firma del Game. Bienvenido a los trade-offs reales.)
3. **Reto** - bosqueja (código, sin necesidad de cablearlo del todo) un `KeyboardController`: el mismo contrato de constructor que `InputController` - `(canvas, ball, canAim, onLaunch)` - pero Espacio sostenido = cargar, flechas = apuntar. El punto del ejercicio: *¿cuánto del juego necesita cambiar para soportarlo?* Cuenta las líneas fuera de la clase nueva. (Spoiler en la solución: una.)

## Vocabulario

| English | Español |
|---|---|
| composition root | raíz de composición |
| dependency | dependencia |
| contract / interface | contrato / interfaz |
| arrow function | función flecha |
| single responsibility | responsabilidad única |
| public surface | superficie pública |
| wiring | cableado |

## Lo que sigue

Falta una clase, y ya sabes cuál: cierra la pestaña y los jugadores se esfuman. En el **Capítulo 14** - el final - `PlayerStore` trae localStorage con degradación elegante (el momento Liskov, cumplido), construyes un arnés de verificación como el que te ha cuidado todo el curso, y **publicas el juego en una URL pública**.

**[Continúa al Capítulo 14: Persistencia, verificación y publicación →](../14-persistence-verification-shipping/README.es.md)**
