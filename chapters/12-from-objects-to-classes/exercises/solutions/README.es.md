# Capítulo 12 - Soluciones desarrolladas

*Léelo en: [English](README.md) | **Español***

## 1 - Guiado: tres pelotas, un plano

Sesión de consola (con el snapshot del capítulo cargado):

```js
const b1 = new Ball(); b1.launch(400, 0);
const b2 = new Ball(); b2.launch(800, 0);
const b3 = new Ball(); b3.launch(1500, 0);
for (let i = 0; i < 60; i++) { b1.integrate(1/60); b2.integrate(1/60); b3.integrate(1/60); }
console.log(b1.x, b2.x, b3.x);   // 580, 980, 1680
```

Cada pelota recorrió `x = 180 + v × 1s`: distancias de 400, 800 y 1500 px - así que sí, la más rápida llegó **exactamente** 3.75× más lejos (1500/400) que la más lenta. El punto sutil que la pregunta pescaba: la gravedad *no tuvo voz en esto*. Aceleró el `vy` de cada pelota idénticamente (las tres terminaron con `vy = 1800`), pero el movimiento horizontal y el vertical son independientes - la línea de `x` en `integrate` jamás menciona la gravedad. Esa independencia es la razón de que los arcos de proyectil sean parábolas, y de que tu intuición de puntería del Capítulo 8 funcione. (Las tres pelotas, por cierto, quedaron bajo el piso - integramos física pura sin `collideBounds`; el arnés hace exactamente esta clase de pruebas de pieza aislada.)

## 2 - Independiente: `openingWidth`

```js
  /**
   * Width of the corridor a ball's center can score through.
   * @param {number} ballRadius the ball's radius in px
   * @returns {number} pixels between the two isScore insets
   */
  openingWidth(ballRadius) {
    return (this.backX - this.frontX) - 2 * (ballRadius * 0.4);
  }
```

Registrado al arrancar: `console.log("scoring corridor:", hoop.openingWidth(ball.radius));` → **`60.4`** (74 entre los labios, menos 2 × 6.8 de recorte). Dos cosas para cotejar contra tu versión: el método pide el radio como *parámetro* en lugar de alcanzar la `ball` global - el aro no debería necesitar saber que existe una pelota en particular (ya recibe la pelota como parámetro en `collide`, mismo principio); y los literales `0.4` ahora existen en dos lugares (`isScore` y aquí), que es exactamente la clase de duplicación que justificaría promover el `0.4` a CONFIG si este método fuera código real del juego y no una sonda de ejercicio.

## 3 - Reto: tu propio `InputController`

No hay una única respuesta correcta - el ejercicio es el *diff*. Un intento sólido se ve así:

```js
class InputController {
  constructor(canvas, ball) {
    this.canvas = canvas;
    this.ball = ball;
    this.isCharging = false;
    this.chargeStart = 0;
    this.aimX = 0;
    this.aimY = 0;
    canvas.addEventListener("pointerdown", (e) => this.#start(e));
    canvas.addEventListener("pointermove", (e) => this.#move(e));
    canvas.addEventListener("pointerup", () => this.#release());
    canvas.addEventListener("pointercancel", () => { this.isCharging = false; });
  }
  #toWorld(e) { /* Chapter 8's conversion, with this.canvas */ }
  #start(e) { /* gate, capture, stamp chargeStart, set aim */ }
  #move(e) { /* update aim while charging */ }
  #release() { /* compute shot, call... what, exactly? */ }
  power() { /* Chapter 8's, with this.chargeStart */ }
  launchVelocity() { /* Chapter 8's, with this.aim / this.ball */ }
}
```

Cuando leas el Capítulo 13, espera estas diferencias - cada una tiene una razón que vale la pena encontrar:

1. **`#release` llama a `shoot(...)` directamente en la mayoría de los primeros intentos** - lo que significa que tu InputController *conoce las reglas del juego*. La clave de respuestas en cambio recibe un callback `onLaunch` en su constructor y llama a eso: la entrada sabe detectar un tiro, el Game decide qué *significa* un tiro. (El Capítulo 13 lo nombra Inversión de Dependencias.)
2. **La compuerta `state !== "ready"`** - tu versión probablemente lee el `game` global. La clave de respuestas recibe una *función* `canAim` y le pregunta. Mismo principio: el controlador pide permiso sin saber quién lo otorga.
3. **Las funciones flecha en los escuchadores** - si escribiste `canvas.addEventListener("pointerdown", this.#start)` te topaste con el TypeError del método separado del Capítulo 12 en cuanto hiciste clic. Las flechas (`(e) => this.#start(e)`) capturan `this` del constructor. Si encontraste ese bug tú mismo, aprendiste la lección más dura de este capítulo de la manera honesta.
