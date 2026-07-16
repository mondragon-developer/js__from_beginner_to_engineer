# Capítulo 6 — Haciendo Que las Cosas se Muevan

*Léelo en: [English](README.md) | **Español***

Todo hasta ahora ha sido una pintura. En este capítulo, se convierte en un *juego*: el navegador empieza a llamar tu código 60 veces por segundo, la gravedad entra a CONFIG, y la pelota cae desde lo alto del gimnasio, rebota cuatro veces, rueda, y se detiene — todo por sí sola. Este es el primer momento de magia del curso. Cuando ocurra en tu pantalla, tómate un segundo. Hiciste un mundo con física adentro.

**Tiempo**: ~1 hora.

## Lo que vas a construir en este capítulo

El bucle del juego — el latido sobre el que corre todo juego en la Tierra — más movimiento de proyectil real: gravedad, velocidad, rebote con pérdida de energía, fricción de rodado, y reposo. Resultado visual esperado: al cargar, la pelota cae desde cerca del techo, rebota con altura decreciente, deriva a la derecha, y se asienta en el piso.

## Conceptos nuevos

- **velocidad y aceleración** — `vx`/`vy`, y la gravedad como cambio a la velocidad
- **`requestAnimationFrame`** — pedirle al navegador el siguiente cuadro
- **el bucle del juego** — actualizar, dibujar, repetir, por siempre
- **delta time (`dt`)** — segundos reales transcurridos, y por qué lo acotamos
- **integración** — convertir velocidad en posición, un pasito a la vez
- **restitución y fricción** — cómo un rebote pierde energía

## Constrúyelo, paso a paso

### Paso 1 — La pelota aprende velocidad

Reemplaza el posicionamiento fijo de la pelota por una pelota que carga su propio estado. Después de CONFIG (que crecerá en el Paso 2), agrega:

```js
/* =====================================================================
 * The ball — position AND velocity now, because it moves. It starts
 * high on purpose: this chapter is about watching it fall.
 * (Chapter 8 puts it back on the free-throw spot, under your control.)
 * ===================================================================== */
const ball = {
  x: CONFIG.ball.startX,
  y: 80,
  vx: 120,  // a gentle sideways drift, so rolling is visible too
  vy: 0,
  radius: CONFIG.ball.radius
};
```

`vx` y `vy` son la **velocidad**: cuántos píxeles se mueve la pelota por *segundo*, horizontal y verticalmente. La pelota ahora es cuatro números que describen no solo dónde *está* sino hacia dónde *va* — y eso es todo lo que es el movimiento.

### Paso 2 — La física entra a CONFIG

Agrega un bloque `physics` a CONFIG (entre `world` y `ball`):

```js
  physics: {
    gravity: 1800,          // px/s² — pulls the ball down every frame
    floorRestitution: 0.55, // energy kept after a floor bounce (0..1)
    floorFriction: 0.98,    // horizontal slowdown while rolling
    restSpeed: 25           // below this speed the ball is "at rest"
  },
```

Son los valores exactos del juego terminado. `gravity: 1800` es una *aceleración* — cambia `vy` en 1800 px/s por cada segundo. Si las constantes del Capítulo 4 eran las *dimensiones* del juego, estas son sus *materiales*: cómo jala el mundo y cómo empuja de vuelta el piso.

### Paso 3 — Integración: la velocidad se vuelve posición

```js
/**
 * Advance the ball one time step using projectile motion.
 * @param {number} dt seconds elapsed since the last frame
 */
function integrateBall(dt) {
  ball.vy += CONFIG.physics.gravity * dt; // gravity accelerates vy
  ball.x += ball.vx * dt;                 // position follows velocity
  ball.y += ball.vy * dt;
}

/** @returns {number} current speed in px/s */
function ballSpeed() {
  return Math.hypot(ball.vx, ball.vy);
}
```

Tres líneas de física que vale la pena leer despacio: la gravedad empuja la velocidad; la velocidad empuja la posición; todo escalado por `dt`, la *fracción de segundo* que realmente pasó. Los físicos lo llaman **integración**. Nota el signo: la gravedad se *suma* a `vy`, porque — la Nota del Capítulo 3 cobra su recompensa — **en un canvas, abajo es positivo**. `Math.hypot` da la rapidez en línea recta a partir de las dos componentes (Pitágoras, incluido de fábrica); la lógica del piso la necesita en seguida.

> [!WARNING]
> **Error real: la gravedad con el signo equivocado.** Escribe `ball.vy -= CONFIG.physics.gravity * dt` (restando, como enseñó la clase de matemáticas) y la pelota **cae hacia arriba**. Lo medimos: empezando en y = 80, después de un segundo la pelota está en y = **−835** — salió por el techo y siguió de largo. Si tu pelota alguna vez se dispara por la parte alta de la pantalla, acabas de re-derivar el bug de canvas más famoso que existe. Abajo es `+`.

### Paso 4 — El bucle del juego

```js
let lastTime = 0;

/**
 * One animation frame: compute dt, update the world, draw it.
 * @param {number} timestamp milliseconds from requestAnimationFrame
 */
function frame(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 1 / 30); // clamp big gaps
  lastTime = timestamp;

  integrateBall(dt);
  collideFloor();

  drawCourt();
  drawHoop();
  drawBall(ball.x, ball.y);

  requestAnimationFrame(frame); // book the next page of the flipbook
}
```

> [!NOTE]
> **El bucle del juego es un folioscopio (flipbook).** Una caricatura es una pila de dibujos pasados tan rápido que el ojo ve movimiento. `requestAnimationFrame(frame)` le dice al navegador: *cuando estés por mostrar la siguiente página, llama primero a mi función `frame`.* Adentro, actualizamos el mundo un pasito, redibujamos todo desde cero (algoritmo del pintor — jamás se borra), y reservamos la siguiente página. 60 páginas por segundo, y la pintura se vuelve película. Cada juego que has jugado es este bucle con distintos disfraces.

La línea del `dt` merece su propio párrafo. El navegador le pasa a `frame` un `timestamp` en **milisegundos**; restar el anterior y dividir entre 1000 da los segundos reales transcurridos — normalmente ≈ 0.0167 a 60 fps. Multiplicar todo movimiento por `dt` hace al juego **independiente de la tasa de cuadros**: en un monitor de 120 Hz da pasos más chicos más seguido, en una laptop sufrida pasos más grandes menos seguido, y el arco de la pelota es *idéntico* en ambos. Y el **acotamiento** `Math.min(..., 1/30)`: cambia de pestaña diez segundos y regresa — sin la cota, el dt de ese cuadro sería ~10 segundos enteros y la pelota se teletransportaría a través del piso. Con ella, el mundo nunca avanza más de 1/30 s por paso.

> [!WARNING]
> **Error real: dt en milisegundos.** Olvida el `/ 1000` y cada rapidez se vuelve mil veces mayor. Lo medimos: después de **un solo cuadro**, `vy` = 30,006 px/s y la y de la pelota = **500,280** — medio millón de píxeles bajo tierra, en un mundo de 540 de alto. En pantalla se ve como si la pelota simplemente nunca apareciera (el ajuste del piso la atrapa acostada en el suelo antes de que tu ojo vea el primer cuadro). Si tu física explota al instante, revisa primero las unidades del dt.

> [!WARNING]
> **Error real: el bucle que corre una vez.** Olvida el `requestAnimationFrame(frame)` *interno* (el del final de la propia `frame`) y obtienes exactamente un cuadro: la pelota queda congelada en el aire, a una página del folioscopio. Nada da error — pediste un cuadro y te lo dieron. Las dos llamadas a `requestAnimationFrame` importan: la del Boot arranca el bucle; la de adentro lo mantiene vivo.

### Paso 5 — El piso empuja de vuelta

```js
/** Bounce on the hardwood, lose energy, and eventually come to rest. */
function collideFloor() {
  if (ball.y + ball.radius <= CONFIG.world.floorY) return; // still airborne

  ball.y = CONFIG.world.floorY - ball.radius;              // snap out of the floor
  ball.vy = -ball.vy * CONFIG.physics.floorRestitution;    // bounce, losing energy
  ball.vx *= CONFIG.physics.floorFriction;                 // rolling slows down

  if (ballSpeed() < CONFIG.physics.restSpeed) {            // slow enough: stop
    ball.vx = 0;
    ball.vy = 0;
  }
}
```

El patrón de las dos líneas del medio es el más importante de la Parte III — lo rotarás hacia paredes, techo y tablero en el Capítulo 9: **saca la posición del objeto de un ajuste, voltea y amortigua la velocidad.** ¿El borde inferior de la pelota (`y + radius`) cruzó la línea del piso? Ponla exactamente *sobre* la línea, invierte `vy` conservando solo el 55% (restitución — cada rebote alcanza cerca de la mitad de la altura anterior), y recórtale un poco a `vx` (fricción). Y cuando la rapidez total cae bajo `restSpeed`, deja de fingir: ponla en cero. Sin eso, la pelota micro-rebota invisiblemente para siempre.

También nuevo: ese `return` de la primera línea es una **cláusula de guarda** — "no hay nada que hacer, salte temprano". Mantiene el código interesante sin sangrías extra, y el juego terminado la usa por todas partes.

### Paso 6 — Boot

Reemplaza las tres llamadas de dibujo sueltas del final con:

```js
/* ---------- Boot ---------- */
requestAnimationFrame(frame);
```

De este capítulo al final del curso, el script tiene esta forma: **definiciones arriba de la línea Boot, encendido debajo.** El boot del juego terminado también es una línea (`new Game(...)`). Un programa que se lee como "esto es todo lo que sé hacer; ahora arranca" es un programa que puedes probar, razonar, y — en el Capítulo 14 — verificar mecánicamente.

**Punto de control — el momento de magia.** Guarda. La pelota cae, rebota, rueda, se detiene. Medido del código real: primer impacto **0.65 segundos** después de cargar, a **~1,200 px/s**, **cuatro** rebotes visibles, en reposo a los **~3.5 segundos** en x ≈ 505 — cada corrida, exactamente igual, porque la física es determinista. Recarga varias veces. Tienes permiso de quedarte mirándola un rato. Este es el capítulo donde el curso deja de tratarse de una imagen y empieza a tratarse de un *mundo*.

Tu archivo debería coincidir ahora con el [`snapshot/index.html`](snapshot/index.html) de este capítulo.

## Por qué lo hicimos así

Tiempo real transcurrido (`dt`) en lugar de "muévete 3 píxeles por cuadro" es la diferencia entre una animación que casualmente funciona en tu máquina y una simulación que funciona en todas; cuesta una resta por cuadro y compra independencia total del hardware. El orden `integrar → colisionar → dibujar` dentro del bucle tampoco es negociable: muévete primero como si nada estorbara, *luego* deja que el mundo corrija el resultado, luego muéstralo. Esa estructura de dos fases (el Capítulo 9 expande la fase de colisión enormemente) es como la mayoría de los juegos 2D de la Tierra hacen su física, y es la razón de que nuestras funciones ya se llamen como los métodos de la clave de respuestas — `integrateBall` hoy es `Ball.integrate` en el Capítulo 12, y el diff entre ambos será casi nada.

## Rincón de experimentos

1. Gimnasio lunar: pon `gravity: 300`. Arcos largos y perezosos — y nota que el número de rebotes cambia, porque la restitución no cambió. Materiales y gravedad son perillas independientes.
2. Superpelota vs costalito: prueba `floorRestitution: 0.9`, luego `0.1`. Predice cada uno antes de guardar.
3. Rómpelo a propósito: quita el `Math.min` (deja solo `(timestamp - lastTime) / 1000`), vete a otra pestaña diez segundos, y regresa. La pelota se teletransportó a través de todo su futuro. Regresa la cota y repite — el mundo pausó educadamente.

## Ejercicios

Las soluciones desarrolladas están en [`exercises/solutions/`](exercises/solutions/).

1. **Guiado** — suelta la pelota desde lo más alto (`y: 20`) sin deriva lateral (`vx: 0`). Antes de guardar, predice: ¿caer desde cuatro veces más alto significa muchos más rebotes? Cuéntalos. (Respuesta medida: siguen siendo **cuatro** rebotes visibles — sorprendente, y vale la pena entenderlo. Cada rebote conserva solo el 55% de la rapidez, así que la rapidez extra del impacto se extingue en casi el mismo número de rebotes. El decaimiento geométrico es brutal.)
2. **Independiente** — haz que la pelota entre por la esquina superior derecha moviéndose a la *izquierda*: elige tú los valores iniciales. ¿Cuáles números tuviste que cambiar, y cuáles dejaste en paz?
3. **Reto** — la pelota todavía puede salirse por los lados. Escribe `collideWalls()` — el mismo patrón de ajustar-y-voltear del piso, aplicado a `x` en ambos bordes — y llámala justo después de `collideFloor()`. Vas un capítulo adelantado; el Capítulo 9 hará exactamente esto, así que compara tu versión contra la suya cuando llegues.

## Vocabulario

| English | Español |
|---|---|
| velocity | velocidad |
| acceleration | aceleración |
| frame | cuadro / fotograma |
| game loop | bucle del juego |
| delta time | delta de tiempo |
| clamp | acotar / limitar |
| restitution | restitución |
| friction | fricción |
| guard clause | cláusula de guarda |

## Lo que sigue

El mundo se mueve, pero es un gimnasio de caja gris. En el **Capítulo 7** la cancha estrena su apariencia: duela con vetas de tablones, el tablero de vidrio, la red, el marcador de tiro libre — la escena completa, construida con bucles y objetos literales.

**[Continúa al Capítulo 7: La cancha →](../07-the-court/README.es.md)**
