# Capítulo 9 — Física: El Mundo Empuja de Vuelta

*Léelo en: [English](README.md) | **Español***

El Capítulo 8 terminó con una mentira hermosa: puedes tirar, pero el aro es un fantasma — la pelota atraviesa el aro, el vidrio, y se sale del gimnasio para siempre. En este capítulo el mundo se vuelve *sólido*. El tablero banquea, el aro rechaza los casi-aciertos con geometría honesta, y los cuatro lados del gimnasio contienen la pelota — nunca más saldrá del cuadro. Este es el capítulo más profundo del curso, y contiene su única matemática de verdad, explicada desde cero absoluto.

**Tiempo**: ~1.5 horas.

## Lo que vas a construir en este capítulo

Tres sistemas de colisión: `collideBounds` (piso, techo, ambas paredes — un patrón, rotado cuatro veces), `collideBoard` (una pared direccional), y `collideRimPoint` (un colisionador circular con reflexión vectorial — usado dos veces, una por labio del aro). Resultado visual esperado: tiros de banco contra el vidrio, repiqueteos del aro que patean la pelota en ángulos creíbles, y un gimnasio cerrado del que nada escapa.

## Conceptos nuevos

- **el patrón de colisión** — sacar del objeto, voltear y amortiguar — *rotado* a cada superficie
- **una pared direccional** — el tablero solo detiene a la pelota por un lado
- **colisión círculo contra círculo** — los dos labios del aro como puntos sólidos
- **vectores, normales y el producto punto** — introducidos desde cero, en la caja de profundización
- **retornos tempranos como guardas** — `if (dist === 0 || dist >= minDist) return;`

## La idea: muévete primero, corrige después

Nuestro enfoque es el que usan de verdad la mayoría de los juegos 2D, y lo has estado usando desde el Capítulo 6 sin nombrarlo:

1. `integrateBall` mueve la pelota como si nada estorbara.
2. Las funciones de colisión corren *justo después* y preguntan: ¿la pelota terminó adentro de algo? Si sí, **sácala** y **cambia su velocidad** a lo que un rebote habría producido.

Por eso la cadena de actualización del frame crece a tres eslabones, y por eso su orden es ley:

```js
  integrateBall(dt);
  collideHoop();
  collideBounds();
```

Aro primero, límites al final: haga lo que haga el aro con la pelota, las paredes y el piso tienen la última palabra — así ningún cuadro puede *terminar* con la pelota fuera del gimnasio.

## Constrúyelo, paso a paso

### Paso 1 — Tres materiales nuevos

`CONFIG.physics` gana una línea por superficie:

```js
    rimRestitution: 0.65,   // energy kept after hitting the rim
    boardRestitution: 0.6,  // energy kept after hitting the backboard
    wallRestitution: 0.6,   // energy kept after hitting a wall or ceiling
```

El piso ya tenía la suya (`0.55`). Cuatro superficies, cuatro rebotes — el aro es el más vivo a propósito: los repiqueteos deben sentirse dramáticos.

### Paso 2 — El gimnasio cerrado: `collideBounds`

Borra `collideFloor` — su cuerpo se muda a la primera sección de esta función más grande (cero código muerto: la función vieja debe *desaparecer*, no quedar comentada):

```js
/** Keep the ball inside the gym: floor, both walls, and the ceiling. */
function collideBounds() {
  const { width, floorY } = CONFIG.world;
  const r = ball.radius;
  const wall = CONFIG.physics.wallRestitution;

  // Floor: bounce and roll on the hardwood, then come to rest
  if (ball.y + r > floorY) {
    ball.y = floorY - r;
    ball.vy = -ball.vy * CONFIG.physics.floorRestitution;
    ball.vx *= CONFIG.physics.floorFriction;

    if (ballSpeed() < CONFIG.physics.restSpeed) {
      ball.vx = 0;
      ball.vy = 0;
    }
  }

  // Ceiling: mirror the vertical velocity
  if (ball.y - r < 0) {
    ball.y = r;
    ball.vy = -ball.vy * wall;
  }

  // Left wall: mirror the horizontal velocity
  if (ball.x - r < 0) {
    ball.x = r;
    ball.vx = -ball.vx * wall;
  }

  // Right wall: same rule on the far side
  if (ball.x + r > width) {
    ball.x = width - r;
    ball.vx = -ball.vx * wall;
  }
}
```

Lee las cuatro secciones y nota que son **una idea con cuatro orientaciones**: qué borde de la pelota cruzó qué línea, regresa la posición al contacto, espeja la componente de velocidad que apunta a la superficie, conserva solo una fracción. El Capítulo 6 te enseñó el patrón en el piso; hoy lo rotaste tres veces más. Eso es la mayor parte de la colisión 2D, honestamente.

**Punto de control:** guarda, y dispara un tiro a máxima potencia hacia arriba, luego uno a cada pared. Techo, izquierda, derecha — todo responde. El gimnasio está sellado.

### Paso 3 — El tablero: una pared direccional

```js
/**
 * The backboard is a vertical wall: if the ball crosses it while
 * moving right, mirror its horizontal velocity.
 */
function collideBoard() {
  const h = CONFIG.hoop;
  const withinHeight = ball.y > h.boardTop && ball.y < h.boardBottom;
  const crossing = ball.x + ball.radius > h.boardX && ball.vx > 0;
  if (withinHeight && crossing) {
    ball.x = h.boardX - ball.radius;
    ball.vx = -ball.vx * CONFIG.physics.boardRestitution;
  }
}
```

El mismo patrón — con un ingrediente nuevo: `ball.vx > 0`. El tablero solo empuja si la pelota se mueve **hacia** él (a la derecha, hacia el vidrio). Sin esa condición, una pelota que de algún modo terminara detrás del tablero, alejándose, sería cacheteada *de regreso hacia adentro*. Nombrar las dos condiciones (`withinHeight`, `crossing`) en lugar de escribir un `if` de cuatro cláusulas es una pequeña bondad para todo lector futuro, incluido tú.

**Punto de control:** un tiro alto y fuerte ahora *banquea* en el vidrio y cae hacia el aro. Los tiros de banco están en el juego.

### Paso 4 — El aro: dos círculos y la matemática del capítulo

El aro en nuestra vista lateral son dos labios — el del frente y el del tablero — y cada uno es un pequeño círculo sólido que la pelota puede golpear *desde cualquier dirección*. Ese "cualquier dirección" es la razón de que espejar como pared plana no alcance, y de que esta función se gane la única dosis de matemática vectorial del curso:

```js
/**
 * Treat one rim edge as a small solid circle and reflect the ball
 * off it — the classic circle-vs-circle collision.
 * @param {number} px rim point x
 * @param {number} py rim point y
 */
function collideRimPoint(px, py) {
  const dx = ball.x - px;
  const dy = ball.y - py;
  const dist = Math.hypot(dx, dy);
  const minDist = ball.radius + CONFIG.hoop.rimThickness;
  if (dist === 0 || dist >= minDist) return;

  // Normal = direction from rim point to ball center
  const nx = dx / dist;
  const ny = dy / dist;

  // Push the ball out so it no longer overlaps the rim
  ball.x = px + nx * minDist;
  ball.y = py + ny * minDist;

  // Reflect only if the ball is moving INTO the rim
  const approaching = ball.vx * nx + ball.vy * ny;
  if (approaching < 0) {
    const r = CONFIG.physics.rimRestitution;
    ball.vx -= (1 + r) * approaching * nx;
    ball.vy -= (1 + r) * approaching * ny;
  }
}

/** Bounce the ball off the two rim points and the backboard. */
function collideHoop() {
  collideRimPoint(CONFIG.hoop.rimFrontX, CONFIG.hoop.rimY);
  collideRimPoint(CONFIG.hoop.rimBackX, CONFIG.hoop.rimY);
  collideBoard();
}
```

> [!NOTE]
> **Profundización opcional: vectores, para quien nunca ha visto uno.** Sáltate esta caja y el juego funciona igual; léela y la función de arriba se vuelve obvia.
>
> Un **vector** es solo una flecha escrita como dos números: `(dx, dy)` significa "avanza `dx` a lo ancho y `dy` hacia abajo". La velocidad de la pelota es uno. La línea `dx = ball.x - px` construye la flecha *del punto del aro al centro de la pelota* — restar posiciones siempre te da la flecha entre ellas.
>
> Su **longitud** es Pitágoras: `Math.hypot(dx, dy)`. Si esa longitud es menor que `ball.radius + rimThickness`, los dos círculos se traslapan: contacto.
>
> Dividir la flecha entre su propia longitud (`nx = dx / dist`) hace su longitud exactamente 1 — una dirección pura, llamada la **normal**: "directamente alejándose de la superficie". Cada rebote en la naturaleza ocurre a lo largo de la normal; eso es lo que la hace digna de nombre.
>
> El **producto punto** es una multiplicación por eje, sumadas: `vx * nx + vy * ny`. Responde una sola pregunta: *¿cuánta de la velocidad apunta a lo largo de la normal?* Negativo significa "moviéndose hacia adentro de la superficie" (esa es nuestra prueba `approaching < 0` — el signo ES la prueba); su magnitud es la rapidez del choque.
>
> Las líneas de reflexión entonces dicen: quita la parte de la velocidad que apunta hacia la superficie **dos veces** (una la cancela, otra la manda de regreso — un espejo), excepto que escalamos por `(1 + r)` en lugar de 2 — con `r = 0.65`, la parte saliente es solo el 65% de la entrante. Un rebote de billar que pierde un poco de energía, en dos líneas. Esta fórmula exacta está en cada motor de juegos jamás escrito; el curso hermano de Rust también la escribe (`reflect(v, n)` en su Capítulo 9), y ahora tú la construiste a mano.
>
> Un insight más, gratis: las paredes planas del Paso 2 son esta misma fórmula *especializada* — la normal de un piso es `(0, -1)`, sustitúyela y todo colapsa a "voltea `vy`, escala por r". Una idea, en todas partes.

> [!WARNING]
> **Error real: reflejar sin la prueba `approaching < 0`.** Medimos qué pasa si reflejas incondicionalmente: una pelota alejándose del aro (todavía dentro de la zona de contacto del cuadro anterior) es volteada de regreso hacia él, luego afuera, luego adentro — su `vx` cuadro a cuadro midió `65, −42, 27, −18`. En pantalla: la pelota **atrapada contra el aro, tiritando y sangrando rapidez** en el lugar. El signo del producto punto no es decoración — es la diferencia entre "el mundo empuja de vuelta" y "el mundo te agarra".

> [!WARNING]
> **Error real: la guarda `dist === 0`.** Bórrala y espera el cuadro de uno-en-un-millón donde el centro de la pelota cae *exactamente* sobre el punto del aro. Entonces `dx` y `dy` son ambos 0, `dist` es 0, y la normal se vuelve `0/0` — lo reprodujimos: `NaN`. Un `NaN` envenena cada cálculo que toca: `ball.x` se vuelve `NaN`, y — recuerda la advertencia del desvanecimiento silencioso del Capítulo 5 — `arc(NaN, ...)` dibuja *nada, sin error*. Tu pelota deja de existir, en silencio, rara vez, sin forma de reproducirlo. Esta guarda es un `=== 0` hoy contra la peor clase de bug que existe.

### Paso 5 — Cablea la cadena

Actualiza la sección de física de `frame` (mostrada al inicio del capítulo) y borra toda referencia al viejo `collideFloor`.

**Punto de control — el cambio visible del capítulo:** guarda, y *juega*. Estrella un tiro contra el frente del aro — se desvía en un ángulo que depende de dónde pegó, porque la matemática de la normal es real. Banquea uno por el vidrio. Bombardea el techo. El arnés de verificación lo juega más duro que tú: 13 tiros a máxima potencia alrededor del círculo completo, 900 pasos cada uno — **11,700 cuadros, y el centro de la pelota jamás salió del mundo.**

Tu archivo debería coincidir ahora con el [`snapshot/index.html`](snapshot/index.html) de este capítulo.

## Por qué lo hicimos así

Modelar el aro como **dos círculos-punto** en lugar de "un objeto aro" es el juicio de ingeniería más afilado del capítulo: en vista lateral, las únicas partes del aro que la pelota puede tocar *son* los dos labios, y dos colisionadores circulares capturan cada interacción real — el clang del hierro frontal, el repiqueteo del trasero, la rodadita con suerte — por treinta líneas en total. Fidelidad física donde se siente, simplicidad radical en todo lo demás; eso es KISS aplicado a la física. Y `collideHoop` como composición de tres líneas de partes con nombre refleja exactamente lo que el Capítulo 12 hará de él: una clase `Hoop` cuyo método `collide` llama a sus dos ayudantes privados — las costuras que cortas hoy son las fronteras de clases de mañana.

## Rincón de experimentos

1. `rimRestitution: 0.05` — un aro de barro mojado; los tiros mueren al contacto y caen. `0.95` — una máquina de pinball. Siente cómo un número es toda la personalidad del aro.
2. `wallRestitution: 1.0` y un tiro a máxima potencia: las paredes ya no roban energía — mira cuánto tiempo rebota la pelota en el gimnasio sellado. (El piso la doma tarde o temprano. ¿Qué constante tendrías que cambiar también para el movimiento *perpetuo*?)
3. Rómpelo a propósito: comenta `collideBoard()` dentro de `collideHoop` — el vidrio se vuelve fantasma y la pelota pega en la *pared* derecha detrás de él. Nota que el juego todavía contiene la pelota: defensas en capas.

## Ejercicios

Las soluciones desarrolladas están en [`exercises/solutions/`](exercises/solutions/).

1. **Guiado** — pon `rimThickness: 12` y juega. El aro se siente más grande para *golpearlo* — ¿pero los tiros limpios por el centro se vuelven más fáciles o más difíciles? Razónalo desde `minDist = radius + rimThickness` antes de probar.
2. **Independiente** — dale al techo su propia suavidad: agrega `ceilingRestitution: 0.2` a CONFIG.physics y úsala en la sección del techo. Dispara tiros verticales a máxima potencia y describe la diferencia.
3. **Reto** — *mide* el aro, como hace el arnés: registra `ballSpeed()` inmediatamente antes y después de la reflexión dentro de `collideRimPoint` (instrumentación temporal — bórrala al terminar, y eso es parte del ejercicio). Confirma que ~65% sobrevive un golpe frontal. Luego pega al aro de refilón: sobrevive **más** del 65%. ¿Por qué? (Pista: ¿cuál *componente* de la velocidad amortigua la fórmula?)

## Vocabulario

| English | Español |
|---|---|
| collision | colisión |
| vector | vector |
| normal (vector) | (vector) normal |
| dot product | producto punto / producto escalar |
| reflection | reflexión |
| overlap | superposición / traslape |
| impulse | impulso |
| glancing / head-on (hit) | (golpe) rasante / frontal |

## Lo que sigue

El mundo es sólido y los tiros se sienten reales — pero el juego no *sabe* cuándo encestas. En el **Capítulo 10**: detección de canasta con `isScore`, la guarda de un-punto-por-enceste, la celebración del aro brillante, la primera máquina de estados del juego, y un marcador DOM de verdad sobre el canvas.

**[Continúa al Capítulo 10: Puntuación y feedback →](../10-scoring-and-feedback/README.es.md)**
