# Capítulo 8 - La Mecánica de Tiro

*Léelo en: [English](README.md) | **Español***

Hasta ahora has sido espectador. Este capítulo te entrega la pelota: **mantén presionado en cualquier parte para cargar** - una barra se llena de verde a rojo mientras un arco punteado predice tu tiro - **apunta con el puntero, suelta para disparar**. Una sola API de entrada cubre ratón *y* táctil, y para el final habrás lanzado tu primer tiro libre de verdad. Este es el capítulo donde el proyecto empieza a ser un juego.

**Tiempo**: ~1.5 horas.

## Lo que vas a construir en este capítulo

La entrada completa de carga sostenida: eventos de puntero, conversión de coordenadas de pantalla a mundo, una función de potencia manejada por tiempo real, la regla de velocidad de lanzamiento (dirección del apuntado, rapidez de la carga), la barra vertical de potencia, y una vista previa de trayectoria que reutiliza la física real - la vista previa nunca miente. Resultado visual esperado: presiona, mira crecer barra y arco, suelta, y la pelota vuela exactamente por donde marcaron los puntos.

## Conceptos nuevos

- **eventos y callbacks** - código que corre *cuando algo sucede*
- **Pointer Events** - una API para ratón, táctil y lápiz
- **el objeto de evento** - `e.clientX`, `e.pointerId`
- **coordenadas de pantalla vs de mundo** - y la conversión entre ambas
- **`performance.now()`** - un cronómetro de milisegundos
- **`null` como respuesta deliberada** - "no hay tiro"
- **colores `hsl()`** - el matiz como número animable

## Constrúyelo, paso a paso

### Paso 1 - CONFIG aprende de entrada

Tres bloques nuevos (las rapideces de lanzamiento se unen a `physics`; `input` y `powerBar` son nuevos):

```js
    minLaunchSpeed: 450,    // an instant tap still throws this hard
    maxLaunchSpeed: 1500    // a fully charged shot throws this hard
```

```js
  input: {
    chargeTime: 1.2,     // seconds of holding to reach full power
    previewSteps: 40,
    previewDt: 1 / 45
  },
  powerBar: { x: 26, top: 160, bottom: 460, width: 14 }
```

Y la pelota vuelve a casa - su objeto literal arranca en `CONFIG.ball.startX / startY` con velocidad cero. (Se asentará los 25 px hasta el piso al cargar; la física nunca duerme en este capítulo. La máquina de estados del Capítulo 10 le dará a la pelota una pose de "lista".)

Actualiza también el CSS - tres líneas que importan:

```css
  canvas {
    width: 100%;
    max-width: 920px;
    border-radius: 10px;
    touch-action: none;      /* the canvas owns all touch gestures */
    cursor: crosshair;
  }
```

`width: 100%` hace que el canvas se *muestre* del tamaño que quepa en la ventana - que es la razón de que la matemática del Paso 3 deba existir - y `touch-action: none` se explica con su propia Advertencia abajo.

### Paso 2 - Un gesto, como datos

```js
const input = {
  isCharging: false,
  chargeStart: 0, // ms timestamp when the hold began
  aimX: 0,        // current pointer position, world coordinates
  aimY: 0
};
```

El gesto entero - hay una carga en curso, desde cuándo, apuntada a dónde - son cuatro valores. Todo lo demás del capítulo lee o escribe este objetito, que es exactamente lo que hará tan fácil entregárselo a una clase en el Capítulo 13.

### Paso 3 - Los píxeles de pantalla no son píxeles de mundo

```js
/**
 * Convert a pointer event from screen pixels to world coordinates,
 * compensating for the canvas being scaled by CSS.
 * @param {PointerEvent} e
 * @returns {{x: number, y: number}}
 */
function toWorld(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = CONFIG.world.width / rect.width;
  const scaleY = CONFIG.world.height / rect.height;
  return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
}
```

El evento reporta dónde está el puntero **en la pantalla**; el juego piensa en su propio **mundo** de 920×540. Como el CSS ahora escala el canvas, los dos están en desacuerdo. `getBoundingClientRect()` mide dónde está de verdad el canvas y qué tan grande se *muestra*; dividir el tamaño del mundo entre el tamaño mostrado da el factor de corrección.

> [!WARNING]
> **Error real: apuntar con coordenadas crudas de pantalla.** Sáltate los factores de escala - usa `e.clientX - rect.left` directo - y todo funciona… *hasta que el canvas no se muestre exactamente a 920 px de ancho.* Encoge la ventana para que el canvas se muestre a 460 px y los números te traicionan: hacer clic en el aro (mostrado a 363 px del borde izquierdo del canvas) reporta x = 363, pero el aro *vive* en el mundo en x = 726. Cada tiro aterriza a la mitad de la distancia que apuntaste. La corrección son las dos líneas de `scale` - y el hábito es más profundo: **cada vez que coordenadas de entrada tocan coordenadas del juego, pregunta en qué espacio vive cada una.**

### Paso 4 - Los tres momentos de un gesto

```js
/**
 * A press anywhere on the court begins charging - power builds for
 * as long as the hold lasts.
 * @param {PointerEvent} e
 */
function onPointerDown(e) {
  const p = toWorld(e);
  canvas.setPointerCapture(e.pointerId);
  input.isCharging = true;
  input.chargeStart = performance.now();
  input.aimX = p.x;
  input.aimY = p.y;
}

/** @param {PointerEvent} e */
function onPointerMove(e) {
  if (!input.isCharging) return;
  const p = toWorld(e);
  input.aimX = p.x;
  input.aimY = p.y;
}

/** Finish the hold: fire the charged shot if the aim has a direction. */
function onPointerUp() {
  if (!input.isCharging) return;
  const shot = launchVelocity();
  input.isCharging = false;
  if (shot !== null) launchBall(shot.vx, shot.vy);
}
```

Y en la sección Boot, el cableado:

```js
canvas.addEventListener("pointerdown", onPointerDown);
canvas.addEventListener("pointermove", onPointerMove);
canvas.addEventListener("pointerup", onPointerUp);
canvas.addEventListener("pointercancel", () => { input.isCharging = false; });
```

> [!NOTE]
> **Eventos y callbacks - código que espera.** Todo lo que has escrito hasta ahora corre de arriba a abajo, una vez, en un calendario que tú controlas. `addEventListener("pointerdown", onPointerDown)` es distinto: dice que *cuando* ocurra una presión, se llame esta función - quizá en un segundo, quizá nunca, quizá cincuenta veces. Una función entregada para ser llamada después es un **callback**, y el navegador le pasa un **objeto de evento** (`e`) que describe lo ocurrido: coordenadas, cuál puntero, y más. Nota que elegimos **Pointer Events** (`pointerdown`) sobre los viejos eventos de ratón (`mousedown`): una API que dispara idéntico para ratón, dedo y lápiz - escribes una vez, se juega en todas partes. El escuchador de `pointercancel` es la red de seguridad para cuando el *sistema* se roba el gesto (una notificación, el propio navegador): simplemente soltamos la carga.

> [!WARNING]
> **Error clásico: la soltada que nunca llega.** Borra la línea `canvas.setPointerCapture(e.pointerId)`, luego carga un tiro, arrastra *fuera* del canvas, y suelta. No hay tiro - y peor, `isCharging` sigue en `true`, así que la barra queda cargando para siempre. Sin captura, el `pointerup` se disparó sobre el elemento donde estaba el puntero - no el canvas - así que tu escuchador nunca lo oyó. `setPointerCapture` dice: *hasta que este gesto termine, entrégame a mí cada evento de este puntero*, sin importar por dónde vague.

> [!WARNING]
> **Error clásico: la página que hace scroll en lugar de apuntar.** En un teléfono, sin `touch-action: none` en el CSS del canvas, arrastrar el dedo *desplaza o hace zoom a la página* - el navegador se queda el toque para sí y tus eventos `pointermove` mueren a mitad del gesto (eso es `pointercancel` disparándose). La línea de CSS le da al canvas propiedad total de los gestos táctiles. Si tu puntería móvil "se atora" o se corta, falta esta línea.

### Paso 5 - La potencia y la regla de lanzamiento

```js
/**
 * How charged the shot is right now.
 * @returns {number} 0 at the instant of pressing, 1 at full charge
 */
function power() {
  const held = (performance.now() - input.chargeStart) / 1000;
  return Math.min(held / CONFIG.input.chargeTime, 1);
}
```

`performance.now()` es un cronómetro en milisegundos. Sostenido ÷ chargeTime mapea una retención de 0 → 1.2 s a una potencia de 0 → 1, y `Math.min` la limita - sostén una hora, la potencia sigue siendo 1.

```js
/**
 * Hold-to-charge rule: DIRECTION comes from where the pointer is
 * relative to the ball; SPEED comes from how long the hold lasted,
 * scaled between the minimum and maximum launch speeds.
 * @returns {{vx: number, vy: number} | null} null when the pointer
 *   sits exactly on the ball (no direction to aim)
 */
function launchVelocity() {
  const dx = input.aimX - ball.x;
  const dy = input.aimY - ball.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) return null;

  const { minLaunchSpeed, maxLaunchSpeed } = CONFIG.physics;
  const speed = minLaunchSpeed + power() * (maxLaunchSpeed - minLaunchSpeed);
  return { vx: (dx / length) * speed, vy: (dy / length) * speed };
}

/**
 * Send the ball flying with an initial velocity.
 * @param {number} vx horizontal speed in px/s
 * @param {number} vy vertical speed in px/s (negative = upward)
 */
function launchBall(vx, vy) {
  ball.vx = vx;
  ball.vy = vy;
}
```

Lee `launchVelocity` como el esquema de control completo del juego en un párrafo: la flecha de la pelota al puntero (`dx, dy`) da la *dirección*; dividirla entre su `length` la encoge a longitud exactamente 1 (una dirección pura, sin rapidez); multiplicar por `speed` - la mezcla de mínimo a máximo manejada por `power()` - da la velocidad final. Y el `null`: si el puntero está exactamente sobre la pelota, *no hay dirección*, y dividir entre cero envenenaría todo lo que sigue - así que la función responde honestamente "no hay tiro", y `onPointerUp` lo respeta. Devolver `null` a propósito, y revisarlo, es un patrón profesional que encontrarás en todas partes.

Verificamos estos números en Chrome de verdad: una retención genuina de 600 ms midió `power() = 0.500` y una rapidez de lanzamiento de **975 px/s** - exactamente `450 + 0.5 × 1050`.

### Paso 6 - La barra y la vista previa honesta

```js
/**
 * Vertical charge gauge: fills bottom-up while the hold lasts and
 * shifts from green to red as power approaches maximum.
 * @param {number} charge 0..1 charge fraction
 */
function drawPowerBar(charge) {
  const { x, top, bottom, width } = CONFIG.powerBar;
  const barHeight = bottom - top;

  // Empty gauge outline
  ctx.strokeStyle = "rgba(242,234,216,0.5)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, top, width, barHeight);

  // Fill from the bottom, green → amber → red as power grows
  const hue = 120 - charge * 120; // 120=green, 0=red
  ctx.fillStyle = `hsl(${hue}, 85%, 55%)`;
  const fill = barHeight * charge;
  ctx.fillRect(x, bottom - fill, width, fill);
}
```

`hsl()` nombra colores por ángulo de **matiz** - 120° es verde, 0° es rojo - así que una multiplicación anima la barra por verde-ámbar-rojo. (Media carga cae en 60°: lo verificamos por píxel - amarillo puro, `rgb(238, 238, 43)`.)

```js
/**
 * Simulate the first moments of the flight and draw them as dots -
 * the physics becomes visible BEFORE the shot, and the arc grows
 * live as the charge builds. The preview never lies: it reuses the
 * exact same gravity the real flight will use.
 */
function drawTrajectoryPreview() {
  const shot = launchVelocity();
  if (shot === null) return;
  const { previewSteps, previewDt } = CONFIG.input;
  let x = ball.x;
  let y = ball.y;
  let simVx = shot.vx;
  let simVy = shot.vy;

  ctx.fillStyle = "rgba(255,212,92,0.85)";
  for (let i = 0; i < previewSteps; i++) {
    simVy += CONFIG.physics.gravity * previewDt;
    x += simVx * previewDt;
    y += simVy * previewDt;
    if (y > CONFIG.world.floorY) break;
    if (i % 3 === 0) {
      ctx.beginPath();
      ctx.arc(x, y, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
```

Mira las tres líneas de simulación: son `integrateBall`, al pie de la letra, corriendo sobre variables de borrador. Esa es la decisión de diseño del capítulo - **la vista previa corre la física real**, así que lo que ves es lo que obtendrás, siempre. Si algún día ajustamos la gravedad, la vista previa se actualiza sola. (`i % 3 === 0` - el operador de residuo `%` - dibuja cada tercer paso: puntos en lugar de línea sólida.)

Finalmente, el frame muestra ambos solo mientras se carga:

```js
  if (input.isCharging) {
    drawTrajectoryPreview();
    drawPowerBar(power());
  }
```

**Punto de control - el cambio visible del capítulo:** guarda. Presiona y sostén: la barra sube de verde a rojo, el arco punteado se estira mientras sostienes. Mueve el puntero: el arco gira. Suelta: la pelota vuela **sobre los puntos**, rebota, se detiene - y tu siguiente tiro empieza desde donde quedó, apuntado desde ahí. Prueba un toque (potencia mínima) contra una retención completa de 1.2 segundos. Esa es el alma del juego, funcionando.

Una arista áspera honesta, a propósito: puedes iniciar una carga nueva *mientras la pelota sigue volando* y relanzarla en el aire. La versión más simple que funciona lo permite; la máquina de estados del Capítulo 10 (`"ready"` / `"flight"`) es la cura, y ahora entenderás *por qué* existe.

Tu archivo debería coincidir ahora con el [`snapshot/index.html`](snapshot/index.html) de este capítulo.

## Por qué lo hicimos así

Dos decisiones de diseño definen aquí la sensación del juego. *Dirección por posición, rapidez por tiempo*: separar los dos ejes de control hace que apuntar sea tranquilo (no exige destreza de tirón) mientras la potencia carga la tensión - y se mapea a un dedo en un teléfono. Y *la vista previa reutiliza el integrador*: la alternativa floja (una fórmula de parábola escrita aparte) sería una segunda implementación de la misma física, garantizada a divergir de la verdad la primera vez que alguien ajuste CONFIG. Nunca escribas el mismo hecho dos veces - lo aprendiste con números en el Capítulo 4; aquí está para el *comportamiento*.

## Rincón de experimentos

1. Pon `chargeTime: 0.4` - un juego arcade nervioso. Pon `3.0` - un juego de tensión. Un número es toda la sensación del juego.
2. Pon `previewDt: 1/15` con `previewSteps: 15` - una vista previa más burda y corta, estilo arcade. La vista previa es honestidad con presupuesto: menos pasos, menos futuro.
3. Rómpelo a propósito: en `launchVelocity`, reemplaza `dy` por `-dy` e intenta tirar al aro. Todo se espeja verticalmente - apuntas arriba, la pelota va abajo. Treinta segundos de confusión, un signo - vale la pena sentirlo una vez, porque algún día un bug real se sentirá exactamente así.

## Ejercicios

Las soluciones desarrolladas están en [`exercises/solutions/`](exercises/solutions/).

1. **Guiado** - dibuja una línea delgada de puntería de la pelota al puntero mientras se carga (un trazo `moveTo`/`lineTo` en un color tenue, dibujado justo antes de la vista previa). ¿Dónde exactamente va dentro de `frame`, y por qué dentro del `if`?
2. **Independiente** - muestra la potencia como texto: mientras se carga, dibuja `Math.round(power() * 100) + "%"` cerca de la barra usando `ctx.fillText` (invéstigalo - `ctx.font = "14px monospace"` más `fillText(texto, x, y)` es todo lo que necesitas).
3. **Reto** - agrega un "punto dulce": si la soltada ocurre con potencia entre 0.78 y 0.86, imprime `"PERFECT"` en la consola. ¿Cuál función es el hogar correcto de esa revisión, y por qué `onPointerUp` y no `power()`? (La solución discute el razonamiento - se trata de cuál función *decide* cosas y cuál *reporta* cosas.)

## Vocabulario

| English | Español |
|---|---|
| event / listener | evento / escuchador |
| callback | función de retorno (callback) |
| pointer | puntero |
| gesture | gesto |
| screen / world coordinates | coordenadas de pantalla / de mundo |
| charge | carga |
| preview | vista previa |
| normalize (a vector) | normalizar (un vector) |

## Lo que sigue

Ya puedes tirar - pero el aro es un fantasma: la pelota atraviesa el aro, el tablero, y se sale del gimnasio. En el **Capítulo 9** el mundo se vuelve sólido: cuatro paredes, un tablero que banquea, y un aro hecho de dos colisionadores circulares con matemática vectorial honesta (explicada desde cero absoluto, en una profundización opcional).

**[Continúa al Capítulo 9: Física →](../09-physics/README.es.md)**
