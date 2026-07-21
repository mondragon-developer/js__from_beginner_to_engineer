# Capítulo 13 - Soluciones desarrolladas

*Léelo en: [English](README.md) | **Español***

Cada solución muestra el cambio exacto contra [`../../snapshot/index.html`](../../snapshot/index.html).

## 1 - Guiado: tema para el aro

En `Renderer`:

```js
  /**
   * @param {boolean} celebrating true right after a made basket
   * @returns {string} the rim's stroke color
   */
  #rimColor(celebrating) {
    return celebrating ? "#7CFC00" : "#e23d28";
  }
```

Y la primera línea de pintura de `#drawHoopFront` se vuelve:

```js
    ctx.strokeStyle = this.#rimColor(hoop, celebrating);
```

\- espera, no: `this.#rimColor(celebrating)`. (Ese tropiezo deliberado es la lección en miniatura: al extraer el método, la *única* información que necesitaba era `celebrating` - la geometría del aro no tiene nada que ver con su color. Extraer te obliga a notar de qué depende realmente un cálculo.)

Cambiar el color de celebración fue entonces una edición dentro de un método privado cuyo nombre dice exactamente qué posee. La clase no solo *permitió* "un lugar" - su estructura hizo que cualquier otra cosa se sintiera mal. Esa sensación es la recompensa del capítulo entero.

## 2 - Independiente: el contador de FPS

La versión que mantiene limpia la firma del Game - el Renderer rastrea su propio tiempo:

```js
  constructor(canvas) {
    this.ctx = canvas.getContext("2d");
    this.lastDrawTime = 0;
  }

  /** Draw the frames-per-second readout in the top-right corner. */
  #drawFps() {
    const now = performance.now();
    const fps = this.lastDrawTime === 0 ? 0 : 1000 / (now - this.lastDrawTime);
    this.lastDrawTime = now;
    this.ctx.fillStyle = "rgba(242,234,216,0.5)";
    this.ctx.font = "12px monospace";
    this.ctx.fillText(String(Math.round(fps)), CONFIG.world.width - 34, 20);
  }
```

…llamado al final de `draw`, para que se dibuje encima.

**El trade-off, con honestidad:** esta versión hace *impuro* al Renderer - ahora carga estado (`lastDrawTime`) y lee un reloj, así que llamar `draw` dos veces por cuadro reportaría FPS sin sentido. La alternativa (pasar `dt` a `draw`) mantiene al Renderer como función pura de estado-a-píxeles pero ensancha una firma que ya cargan otros cuatro argumentos, por una función de depuración. Cualquiera de las dos oraciones es una justificación válida; lo que importa es que *escribiste* una. El juego terminado, por cierto, no incluye contador de FPS - la tercera opción, "no hacerlo", también es ingeniería.

## 3 - Reto: `KeyboardController`

```js
/** Space held = charge; arrow keys nudge the aim point; release Space to fire. */
class KeyboardController {
  /**
   * @param {HTMLCanvasElement} canvas unused, kept for contract parity
   * @param {Ball} ball aiming starts from wherever it sits
   * @param {() => boolean} canAim
   * @param {(vx: number, vy: number) => void} onLaunch
   */
  constructor(canvas, ball, canAim, onLaunch) {
    this.ball = ball;
    this.canAim = canAim;
    this.onLaunch = onLaunch;
    this.isCharging = false;
    this.chargeStart = 0;
    this.aimX = 0;
    this.aimY = 0;

    window.addEventListener("keydown", (e) => this.#keyDown(e));
    window.addEventListener("keyup", (e) => this.#keyUp(e));
  }

  #keyDown(e) {
    if (e.code === "Space" && !this.isCharging && this.canAim()) {
      this.isCharging = true;
      this.chargeStart = performance.now();
      this.aimX = this.ball.x + 80;   // default: up-and-right
      this.aimY = this.ball.y - 80;
    }
    if (!this.isCharging) return;
    if (e.code === "ArrowUp") this.aimY -= 8;
    if (e.code === "ArrowDown") this.aimY += 8;
    if (e.code === "ArrowLeft") this.aimX -= 8;
    if (e.code === "ArrowRight") this.aimX += 8;
  }

  #keyUp(e) {
    if (e.code !== "Space" || !this.isCharging) return;
    const shot = this.launchVelocity();
    this.isCharging = false;
    if (shot !== null) this.onLaunch(shot.vx, shot.vy);
  }

  power() { /* identical to InputController's */ }

  launchVelocity() { /* identical to InputController's */ }
}
```

**Líneas cambiadas fuera de la clase nueva: una.** En el constructor de `Game`:

```js
    this.input = new KeyboardController(
```

Todo lo demás - la vista previa, la barra de potencia, la compuerta `canAim`, la tubería de lanzamiento - funciona sin cambios, porque el Renderer lee `input.isCharging`/`input.power()`/`input.launchVelocity()` y el Game proporcionó los mismos dos callbacks. Esa es la Inversión de Dependencias cobrando su cheque: el Game depende de una *forma* (cuatro argumentos de constructor, tres miembros legibles), y cualquier cosa con esa forma encaja.

Notas al pie honestas, porque un bosquejo debe confesar sus bordes: que `power()` y `launchVelocity()` sean *idénticos* en ambos controladores es duplicación - una base de código real quizá extraería una clase base o helper compartido; el parámetro `canvas` queda sin uso (conservado por paridad de contrato - defendible, pero un olor digno de notar); y los eventos de tecla en `window` hacen que el controlador dispare incluso cuando el foco de la página está en otra parte en un contexto embebido. Cada una de estas es la clase de nota que ahora escribirías en una revisión de código - que es más bien el punto del curso que estás a dos capítulos de terminar.
