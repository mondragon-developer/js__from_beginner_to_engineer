# Capítulo 10 - Puntuación y Feedback

*Léelo en: [English](README.md) | **Español***

La física es honesta, los tiros se sienten reales - y el juego no tiene idea de que nada de eso ocurre. Hoy aprende a *juzgar*: un detector de canastas que dispara exactamente una vez por enceste, una máquina de estados que le da reglas al juego, una celebración de aro dorado, y la primera interfaz de usuario real del curso - un marcador estilo LED viviendo en HTML, arriba del canvas. Este también es el capítulo donde el juego empieza a negarse, educadamente: no se apunta en pleno vuelo.

**Tiempo**: ~1.5 horas.

## Lo que vas a construir en este capítulo

`isScore` (el detector de cruce), la máquina de estados `"ready"`/`"flight"`, la guarda `scoredThisShot`, el brillo del aro, y un marcador DOM con paneles de Score y Streak. Resultado visual esperado: enceste → el aro destella dorado, Score y Streak suben; fallo → Streak regresa a 0; y la pelota solo se deja apuntar cuando de verdad está quieta.

## Conceptos nuevos

- **una máquina de estados** - el juego está siempre en exactamente un estado con nombre, y el estado decide qué se permite
- **detección de flanco** - puntuar el *cruce*, no la *posición*
- **una bandera de guarda** - `scoredThisShot`, un booleano contra el conteo doble
- **el DOM como segunda pantalla** - `getElementById` + `textContent` para la interfaz que el canvas no debería poseer
- **`aria-live`** - hacer el marcador legible para lectores de pantalla
- **propiedades personalizadas de CSS** - `--scoreboard-amber` y compañía: la filosofía de CONFIG, aplicada al estilo

## Constrúyelo, paso a paso

### Paso 1 - La página estrena marcador

El HTML gana un encabezado y dos paneles LED arriba del canvas (y el CSS gana los tokens de diseño de la clave de respuestas - mira la Nota):

```html
<header>
  <h1>Free Throw <span>· JavaScript from Zero</span></h1>
  <p class="hint">Hold anywhere to charge, aim, release to shoot</p>
</header>

<div class="scoreboard" aria-live="polite">
  <div class="panel"><div class="label">Score</div><div class="value" id="score">0</div></div>
  <div class="panel"><div class="label">Streak</div><div class="value" id="streak">0</div></div>
</div>
```

La hoja de estilos completa de este capítulo está en el [snapshot](snapshot/index.html) - cópiala entera; es el CSS real del juego terminado para estas piezas (brillo LED incluido: ese `text-shadow` bajo `.panel .value` es todo el efecto "LED").

> [!NOTE]
> **Las variables `:root` son el CONFIG del CSS.** La hoja de estilos ahora abre con tokens de diseño - `--chalk`, `--scoreboard-amber`, `--panel` - declarados una vez y usados en todas partes como `var(--chalk)`. La misma enfermedad, la misma cura que el Capítulo 4: un color repetido en nueve lugares son nueve oportunidades de desacuerdo. Un mecanismo en el que ya crees, segundo lenguaje. - Y ese atributo `aria-live="polite"`: les dice a los lectores de pantalla "cuando el texto de esta región cambie, léelo en voz alta (cuando convenga)". Un atributo, y los jugadores ciegos escuchan el marcador cambiar. Las interfaces son para todos; el juego terminado también lo hace.

¿Por qué HTML para el marcador en lugar de dibujarlo en el canvas? El texto en canvas es píxeles - sin selección, sin lectores de pantalla, borroso al hacer zoom, acomodo manual. El DOM hace texto soberbiamente. Usa el canvas para el *mundo* y HTML para la *interfaz*; esa división atraviesa todo juego web serio.

### Paso 2 - La máquina de estados

```js
const game = {
  state: "ready",         // "ready" | "flight"
  score: 0,
  streak: 0,
  scoredThisShot: false,  // guard: one basket per shot, no double counting
  celebrateUntil: 0       // timestamp: rim glows until this moment
};
```

> [!NOTE]
> **Una máquina de estados es el juego de "eres exactamente una cosa".** En cualquier instante el juego está en *un* estado con nombre, y cada estado responde tres preguntas distinto: ¿qué corre? ¿qué se permite? ¿qué cambia el estado? `"ready"`: la física duerme, apuntar se permite, tirar → `"flight"`. `"flight"`: la física corre, apuntar se niega, asentarse → `"ready"`. Esa es toda la máquina - dos estados hoy, un tercero (`"sessionOver"`) el próximo capítulo, y el patrón escala a cualquier tamaño (tu editor de texto, un semáforo y una secuencia de lanzamiento de cohete son todos máquinas de estados).

Las reglas de la máquina son tres ediciones pequeñas. `onPointerDown` recibe una compuerta - la primera línea cierra para siempre la arista áspera del Capítulo 8:

```js
function onPointerDown(e) {
  if (game.state !== "ready") return;
```

`launchBall` madura y se convierte en `shoot` (borra `launchBall` - su trabajo se mudó):

```js
/**
 * Fire the shot: launch the ball and enter the "flight" state.
 * @param {number} vx horizontal speed in px/s
 * @param {number} vy vertical speed in px/s (negative = upward)
 */
function shoot(vx, vy) {
  ball.vx = vx;
  ball.vy = vy;
  game.state = "flight";
  game.scoredThisShot = false;
}
```

Y `frame` corre la física solo en vuelo:

```js
  if (game.state === "flight") updateFlight(dt, timestamp);
```

> [!WARNING]
> **Error clásico: `=` donde querías `===`.** Escribe la compuerta como `if (game.state = "ready")` - un `=` faltante - y nacen dos bugs a la vez: la *asignación* sobrescribe el estado con `"ready"` (¡incluso en pleno vuelo!), y el `if` evalúa el valor asignado, que siempre es verdadero, así que la compuerta nunca niega a nadie. Sin mensaje de error, con o sin modo estricto. Pruébalo en la consola: `let s = "flight"; if (s = "ready") console.log(s)` → imprime `"ready"` - la comparación que vandalizó lo que comparaba. Este curso escribe `===` (y `!==`) exclusivamente; el hábito de una línea que previene esto para siempre: **lee cada `if` preguntando "¿esto cambia algo?" La respuesta debe ser no.**

### Paso 3 - Saber cuándo terminó el tiro

El freno burdo de `collideBounds` (el bloque `vx = 0; vy = 0` del Capítulo 6) se **borra** - la máquina de estados merece un árbitro de verdad:

```js
/** @returns {boolean} true when the ball has settled on the floor */
function shotIsOver() {
  return (
    ball.y + ball.radius >= CONFIG.world.floorY - 1 &&
    ballSpeed() < CONFIG.physics.restSpeed
  );
}
```

En el piso (con un píxel de tolerancia) *y* lenta: el tiro terminó. `updateFlight` volteará el estado a `"ready"` - y como la física deja de correr en `"ready"`, la pelota se congela **donde se detuvo**. Esa es la regla de tirar-desde-donde-quedó, implementada al *no* escribir código que regrese la pelota. A veces la mejor implementación es una eliminación.

### Paso 4 - El detector: puntúa el cruce, no la posición

```js
/**
 * A basket counts when the ball's center crosses the rim line
 * downward, inside the opening.
 * @param {number} previousY the ball's y on the previous frame
 * @returns {boolean} true exactly on the frame the shot goes in
 */
function isScore(previousY) {
  const h = CONFIG.hoop;
  const crossedDown = previousY <= h.rimY && ball.y > h.rimY && ball.vy > 0;
  const insideOpening =
    ball.x > h.rimFrontX + ball.radius * 0.4 &&
    ball.x < h.rimBackX - ball.radius * 0.4;
  return crossedDown && insideOpening;
}
```

Lee `crossedDown` con cuidado - compara *dos cuadros*: el cuadro pasado el centro estaba en la línea del aro o arriba, este cuadro está abajo, y se mueve hacia abajo. Eso es **detección de flanco**: el evento es la *transición*, no la situación. `insideOpening` recorta el 40% de un radio de pelota de cada lado - una canasta tiene que ser honesta, no un roce por el labio.

> [!WARNING]
> **Error real: el detector ingenuo.** El primer intento obvio es una prueba de posición: `if (ball.y > rimY && insideOpening) score++`. Lo medimos en un solo enceste limpio (1200 px/s a 57°): el detector ingenuo disparó **30 veces** - un punto por cada cuadro que la pelota pasó bajo el aro - mientras el detector de cruce disparó exactamente **una**. Si tu marcador alguna vez cuenta como máquina tragamonedas, puntuaste una *situación* en lugar de un *evento*. Detecta flancos.

### Paso 5 - Las reglas del vuelo: `updateFlight`

```js
/**
 * Physics + rules while the ball is in the air.
 * @param {number} dt seconds since last frame
 * @param {number} timestamp current time in ms
 */
function updateFlight(dt, timestamp) {
  const previousY = ball.y;
  integrateBall(dt);
  collideHoop();
  collideBounds();

  if (!game.scoredThisShot && isScore(previousY)) {
    game.scoredThisShot = true;
    game.score += 1;
    game.streak += 1;
    game.celebrateUntil = timestamp + 700;
    updateScoreboard();
  }

  if (shotIsOver()) {
    if (!game.scoredThisShot) game.streak = 0;
    game.state = "ready"; // the ball stays put: next shot starts here
    updateScoreboard();
  }
}
```

La cadena de física se mudó aquí desde `frame` (captura `previousY` *antes* de integrar - el detector necesita ambos cuadros). Luego dos reglas: puntúa una vez, y asiéntate. La celebración es un solo timestamp - `celebrateUntil` - y el renderizado simplemente pregunta `timestamp < game.celebrateUntil` cada cuadro para decidir el color del aro. Sin cronómetros, sin framework de animación: el bucle del juego que ya tienes *es* el sistema de animación.

> [!NOTE]
> **Caja de honestidad: ¿`scoredThisShot` es siquiera necesario?** El detector de cruce ya dispara una vez por cruce - así que salimos de cacería: en más de **3,000 trayectorias simuladas**, incluyendo palmeos de corta distancia y repiqueteos del aro, no pudimos producir un solo tiro que cruce hacia abajo por la abertura dos veces. Con la física de hoy, la guarda nunca se activa. Se queda de todas formas, por una razón de ingeniería: la propiedad de disparo único del detector depende del *ajuste* - alguien pone `rimRestitution: 0.95` (¡tu experimento del Capítulo 9!) y de pronto existen trayectorias salvajes que nadie enumeró. La guarda cuesta un booleano y convierte "una canasta por tiro" en una *regla declarada* en lugar de un accidente emergente. Eso es defensa en profundidad: seguro barato contra los futuros que no puedes probar.

### Paso 6 - Feedback: el brillo y el tablero

`drawHoopFront` gana su parámetro de celebración:

```js
/**
 * The rim itself, drawn in front so the ball appears to pass through.
 * @param {boolean} celebrating true right after a made basket
 */
function drawHoopFront(celebrating) {
  const h = CONFIG.hoop;
  ctx.strokeStyle = celebrating ? "#ffd35c" : "#e23d28";
```

El actualizador del marcador - la única función que toca esos dos elementos:

```js
const scoreEl = document.getElementById("score");
const streakEl = document.getElementById("streak");

/** Refresh the LED panels from the game state. */
function updateScoreboard() {
  scoreEl.textContent = String(game.score);
  streakEl.textContent = String(game.streak);
}
```

Y `frame` calcula `const celebrating = timestamp < game.celebrateUntil;` y lo pasa hacia abajo. (El Boot gana un `updateScoreboard();` para que los paneles arranquen honestos.)

> [!NOTE]
> **`textContent`, nunca `innerHTML`, para texto.** `innerHTML` interpreta su entrada como HTML - dale un string con `<script>` o un atributo `onerror` y lo has ejecutado. Nuestro marcador es nuestro propio número hoy, pero los hábitos no revisan la fuente: `textContent` trata todo como texto inerte, no puede ejecutar nada, y encima es más rápido. Usa `innerHTML` solo cuando *quieras* construir HTML, que este curso nunca necesita.

**Punto de control - el cambio visible del capítulo:** guarda, y enchufa una. El aro destella dorado 0.7 s, Score marca 1, Streak sube. Falla una - Streak cae a 0, Score se mantiene. Intenta cargar mientras la pelota va en el aire: el juego te ignora hasta que se asienta. El arnés juega 143 tiros a través de este código exacto: **33 canastas, cada una valiendo exactamente 1 punto** - los mismos 33/143 que anota la clave de respuestas terminada, cinco capítulos antes.

Tu archivo debería coincidir ahora con el [`snapshot/index.html`](snapshot/index.html) de este capítulo.

## Por qué lo hicimos así

La máquina de estados es el verdadero regalo del capítulo, y nota *dónde* vive: no regada como banderas booleanas (`isFlying`, `canShoot`, `isWaiting`… y los bugs cuando disienten) sino como un string con valores nombrados. Cuando el Capítulo 11 necesite un tercer estado, será un nombre más, no otra bandera que mantener consistente con dos anteriores. Y las reglas se pegan a las transiciones - `shoot()` es la *única* puerta hacia `"flight"`, `shotIsOver()` la única de salida - así que cada regla sobre tirar tiene exactamente un hogar. Cuando alguien pregunte "¿el jugador puede tirar ahora mismo?", la respuesta está a un `===` de distancia, y siempre es cierta.

## Rincón de experimentos

1. Pon la celebración en `timestamp + 3000` y haz el color del brillo `"#7CFC00"`. Siente cómo se eligió 700 ms: suficiente para verse, corto para no sobrevivir al siguiente tiro.
2. Amplía el margen de honestidad: cambia ambos `0.4` de `isScore` a `0.9`. Los encestes pegados al aro dejan de contar - hiciste un juez olímpico. Pon `0.0` - los roza-labios cuentan. El margen es toda la personalidad del juego como árbitro.
3. Rómpelo a propósito: quita la compuerta `game.state !== "ready"` y dispara un segundo tiro en pleno vuelo. La pelota se relanza en el aire - el fantasma del Capítulo 8, de regreso. Restaura la compuerta y apréciala.

## Ejercicios

Las soluciones desarrolladas están en [`exercises/solutions/`](exercises/solutions/).

1. **Guiado** - el `700` de `celebrateUntil = timestamp + 700` es un literal. ¿Debería mudarse a CONFIG? Argumenta en un enunciado cada postura, luego revisa la solución (y la elección real de la clave de respuestas).
2. **Independiente** - agrega un panel de **Misses** (fallos): un tercer panel LED (`id="misses"`), un contador `game.misses`, ¿incrementado exactamente dónde? (Encontrar la única línea correcta en `updateFlight` es el ejercicio.)
3. **Reto** - detecta un *swish*: una canasta donde la pelota no tocó ni aro ni tablero en su camino. Necesitarás una bandera `game.touchedIron` - decide dónde se enciende, dónde se reinicia, y registra `"SWISH"` en la consola cuando caiga una limpia.

## Vocabulario

| English | Español |
|---|---|
| state machine | máquina de estados |
| edge detection | detección de flanco / de cruce |
| guard (flag) | (bandera de) guarda |
| scoreboard | marcador |
| streak | racha |
| celebration | celebración |
| screen reader | lector de pantalla |

## Lo que sigue

Score y racha solo se reinician recargando la página - todavía no hay "partida", solo práctica infinita. En el **Capítulo 11**: sesiones de 10 tiros con resultados, el estado `"sessionOver"`, un botón de Nueva sesión, y perfiles de jugador con récords individuales. El marcador crece a sus cuatro paneles definitivos.

**[Continúa al Capítulo 11: Sesiones de juego y jugadores →](../11-game-sessions-and-players/README.es.md)**
