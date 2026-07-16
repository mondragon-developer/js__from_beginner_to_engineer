# Capítulo 12 — De Objetos a Clases

*Léelo en: [English](README.md) | **Español***

Empieza la Parte IV. Tu juego funciona — diez tiros, jugadores, récords, todo — en ~700 líneas de funciones sueltas compartiendo globales. Nada está *mal* en él, y esa es exactamente la razón de que este capítulo importe: hoy cambias la **forma** del código sin cambiar su **comportamiento**, y *demuestras* que el comportamiento se sostuvo. `Ball` y `Hoop` se vuelven las primeras clases del curso; el arnés certifica, con igualdad estricta, que actúan idéntico a antes. Esa demostración — no las clases — es la lección. **Eso es lo que significa refactorizar.**

**Tiempo**: ~1 hora.

## Lo que vas a construir en este capítulo

`class Ball` (estado + movimiento) y `class Hoop` (geometría + colisiones + detección de canasta), reemplazando el objeto literal de la pelota y seis funciones sueltas. Resultado visible esperado — dicho con honestidad: **el juego se ve y se juega exactamente igual**, y el capítulo celebra eso como su victoria. La prueba visible en pantalla es doble: la salida del arnés (cada hito previo en verde, más las nuevas verificaciones de equivalencia), y un experimento de consola de 30 segundos donde un plano construye dos pelotas independientes ante tus ojos.

## Conceptos nuevos

- **`class`** — un plano para objetos
- **`constructor` y `new`** — cómo un plano construye una casa
- **`this`** — "el objeto sobre el que se llamó este método"
- **métodos** — funciones que viven en el plano
- **`#privado`** — campos y métodos que solo la propia clase puede tocar
- **refactorizar** — cambiar la estructura preservando demostrablemente el comportamiento

## Constrúyelo, paso a paso

### Paso 1 — Planos y casas (consola primero)

> [!NOTE]
> **Una clase es un plano; el objeto es la casa.** Un arquitecto dibuja un plano; un constructor levanta veinte casas con él. Cada casa tiene los mismos *cuartos* (propiedades) y la misma *plomería* (métodos), pero cada una tiene su propia dirección, sus propios muebles, su propia vida. `class Ball { ... }` es el dibujo. `new Ball()` es una cuadrilla de construcción. El objeto pelota que tienes desde el Capítulo 6 era una casa construida a mano; hoy dibujas el plano que siempre siguió en secreto.

Siéntelo antes de construirlo — pega en la consola *al terminar* el capítulo (o regresa):

```js
const a = new Ball();
const b = new Ball();
b.launch(500, -900);
b.integrate(0.5);
console.log("a stayed home:", a.x, a.y, "— b flew:", Math.round(b.x), Math.round(b.y));
```

Dos casas, un plano, vidas independientes. Esa es la idea completa.

### Paso 2 — `class Ball`

Borra el literal `const ball = { ... }`, `integrateBall` y `ballSpeed` — los tres quedan absorbidos. En su lugar:

```js
class Ball {
  constructor() {
    this.radius = CONFIG.ball.radius;
    this.reset();
  }

  /** Put the ball back on the free-throw spot, motionless. */
  reset() {
    this.x = CONFIG.ball.startX;
    this.y = CONFIG.ball.startY;
    this.vx = 0;
    this.vy = 0;
  }

  /**
   * Launch the ball with an initial velocity.
   * @param {number} vx horizontal speed in px/s
   * @param {number} vy vertical speed in px/s (negative = upward)
   */
  launch(vx, vy) {
    this.vx = vx;
    this.vy = vy;
  }

  /**
   * Advance the ball one time step using projectile motion.
   * @param {number} dt seconds elapsed since the last frame
   */
  integrate(dt) {
    this.vy += CONFIG.physics.gravity * dt; // gravity accelerates vy
    this.x += this.vx * dt;                 // position follows velocity
    this.y += this.vy * dt;
  }

  /** @returns {number} current speed in px/s */
  speed() {
    return Math.hypot(this.vx, this.vy);
  }
}

const ball = new Ball();
```

Compara `integrate` contra el viejo `integrateBall` línea por línea: la *única* diferencia es que `ball.` se volvió `this.`. **`this`** significa "el objeto sobre el que se llamó este método" — escribe `ball.integrate(dt)` y adentro del método, `this` *es* esa pelota; escribe `otherBall.integrate(dt)` y es la otra. El método viaja con la casa. Nota también el `constructor` llamando `this.reset()` — un método que el juego necesitaba de todos modos (`newSession` usaba cuatro líneas de asignación para esto; ahora dice `ball.reset()`). Los planos sacan a la superficie las operaciones que siempre estuvieron ahí.

> [!WARNING]
> **Error real: olvidar `new`.** Llama `Ball()` como función y Chrome 150 responde:
>
> ```
> Uncaught TypeError: Class constructor Ball cannot be invoked without 'new'
> ```
>
> El error más amable del lenguaje — nombra la corrección. (Su primo muerde más fuerte: `const f = ball.integrate; f(0.016)` — pasar un método por ahí *separado de su objeto* — da `TypeError: Cannot read properties of undefined (reading 'vy')`, porque `this` es `undefined` cuando no hay nadie a la izquierda del punto. Reprodujimos ambos. Recuerda el del método separado: el Capítulo 13 se lo topa de verdad dentro de `requestAnimationFrame`, y la cura con función flecha llega ahí.)

### Paso 3 — `class Hoop`, con partes privadas

Borra `collideRimPoint`, `collideBoard`, `collideHoop` e `isScore`. La versión en clase (el cuerpo completo está en el [snapshot](snapshot/index.html) — es la matemática del Capítulo 9, al pie de la letra, con nuevo hogar):

```js
class Hoop {
  constructor() {
    const h = CONFIG.hoop;
    this.rimY = h.rimY;
    this.frontX = h.rimFrontX;
    this.backX = h.rimBackX;
    this.boardX = h.boardX;
    this.boardTop = h.boardTop;
    this.boardBottom = h.boardBottom;
  }

  /**
   * Bounce the ball off the two rim points and the backboard.
   * @param {Ball} ball the ball to test and correct
   */
  collide(ball) {
    this.#collideRimPoint(ball, this.frontX, this.rimY);
    this.#collideRimPoint(ball, this.backX, this.rimY);
    this.#collideBoard(ball);
  }

  #collideRimPoint(ball, px, py) { /* Chapter 9's circle collision, verbatim */ }

  #collideBoard(ball) { /* Chapter 9's directional wall, verbatim */ }

  isScore(ball, previousY) { /* Chapter 10's crossing detector, verbatim */ }
}

const hoop = new Hoop();
```

Dos decisiones de diseño para leer de cerca. El constructor **copia su geometría desde CONFIG una sola vez** — el aro es *dueño* de dónde está, y el resto del juego le pregunta al aro, no a la configuración. Y el prefijo `#` hace **privados** a `#collideRimPoint` y `#collideBoard`: son el *cómo*, llamables solo desde adentro de la clase. El mundo exterior recibe exactamente dos verbos — `collide(ball)` e `isScore(ball, previousY)` — el *qué*. La superficie pública de una clase es una promesa; sus partes privadas son su asunto.

> [!WARNING]
> **Error real: tocar un privado desde afuera.** Intenta `hoop.#collideBoard(ball)` en cualquier parte fuera de la clase y el archivo **se niega siquiera a correr**:
>
> ```
> Uncaught SyntaxError: Private field '#collideBoard' must be declared in an enclosing class
> ```
>
> Nota la clase de error: un *Syntax*Error, al interpretar — no un manazo en tiempo de ejecución sino un "este programa no es válido" al cargar. La privacidad en JavaScript no es una convención (como el prefijo `_guionBajo` que verás en código viejo); desde 2022 es una garantía del lenguaje.

### Paso 4 — Los puntos de llamada (el diff completo)

Cinco toques, cada uno de una línea, cada uno leyéndose *mejor* que antes:

| Dónde | Antes | Después |
|---|---|---|
| `shoot` | `ball.vx = vx; ball.vy = vy;` | `ball.launch(vx, vy);` |
| `newSession` | cuatro líneas de asignación | `ball.reset();` |
| `updateFlight` | `integrateBall(dt); collideHoop();` | `ball.integrate(dt); hoop.collide(ball);` |
| `updateFlight` | `isScore(previousY)` | `hoop.isScore(ball, previousY)` |
| `shotIsOver` | `ballSpeed()` | `ball.speed()` |

Y un no-toque digno de saborear: **`collideBounds` no cambió en absoluto.** Lee `ball.x`, `ball.y`, `ball.radius` — y la instancia de la clase tiene exactamente esos campos. El refactor fue invisible para todo consumidor que solo leía datos. No es suerte; es la razón de que igualáramos los nombres de los campos.

### Paso 5 — La demostración

Refactorizar sin verificación es solo *esperar con fe*. Corre el arnés (`node verify/verify.mjs 12`). Cada hito de los capítulos 6–11 vuelve a pasar sobre este snapshot — las mismas sesiones, los mismos rechazos, el mismo barrido de puntuación de **33/143**. Y dos verificaciones nuevas van más allá de "todavía funciona": construyen una `Ball` de *tu* clase y una `Ball` de la clave de respuestas, alimentan a ambas con entradas idénticas — 300 pasos de integración, cuatro escenarios de colisión, un cruce de canasta — y comparan posiciones y velocidades con **`===` estricto, no aproximadamente**:

```
ok    ch12: equivalence — Ball behaves identically to the answer key's Ball
ok    ch12: equivalence — Hoop collisions and isScore identical to the answer key's
```

Comportamiento idéntico bit a bit, certificado mecánicamente. Di la tesis del capítulo una vez más, ahora que la *hiciste*: refactorizar significa cambiar la estructura preservando demostrablemente el comportamiento. Sin demostración, no hay refactor.

Tu archivo debería coincidir ahora con el [`snapshot/index.html`](snapshot/index.html) de este capítulo.

## Por qué lo hicimos así

¿Por qué convertir primero `Ball` y `Hoop`, y solo a ellos? Porque eran las costuras más **puras** del código: sin DOM, sin callbacks, sin cronómetros — solo datos y matemática. Convertirlos ejercita cada mecanismo de las clases (constructor, `this`, métodos, privados) con cero enredos, así que si algo se rompe, la lista de sospechosos tiene un elemento. El Capítulo 13 convierte las partes enredadas (entrada, dibujo, DOM) — con los mecanismos de hoy ya ensayados. Ordenar un refactor de lo más puro a lo más enmarañado es un instinto profesional digno de robar; el orden contrario multiplica las incógnitas.

## Rincón de experimentos

1. Corre el experimento de las dos casas del Paso 1. Luego prueba `a instanceof Ball` → `true`. El plano recuerda a sus casas.
2. En la consola: `hoop.rimY = 250` — *funciona* (los campos públicos son escribibles), y la física del aro se muda mientras su dibujo no (el renderizado aún lee CONFIG — una inconsistencia real que el Capítulo 13 resuelve entregándole el aro al Renderer). Recarga para deshacer.
3. Rómpelo a propósito: cambia `this.vy += ...` por `vy += ...` dentro de `integrate` y lee el `ReferenceError`. Dentro de un método no hay variables sueltas para los campos del objeto — `this.` es la dirección.

## Ejercicios

Las soluciones desarrolladas están en [`exercises/solutions/`](exercises/solutions/).

1. **Guiado** — en la consola, construye tres pelotas, lánzalas (`launch`) a 400, 800 y 1500 px/s directo a la derecha, intégralas (`integrate`) 60 veces con `1/60` cada una, e imprime las tres posiciones x. Antes de correr: ¿la más rápida quedará exactamente ~3.75× más lejos que la más lenta? (La gravedad dice algo sutil aquí.)
2. **Independiente** — dale a `Hoop` un método público `openingWidth()` que devuelva el ancho del corredor de puntuación — la distancia entre labios *menos* los dos recortes de `0.4 × radio` que usa `isScore` (pasa el radio de la pelota como parámetro). Regístralo al arrancar: debe decir `60.4`.
3. **Reto** — convierte el objeto `input` más `power`/`launchVelocity`/los tres manejadores en una `class InputController` *tú mismo*, antes de que el Capítulo 13 te muestre la de la clave de respuestas. Requisitos: el constructor recibe el canvas y la pelota; privados para lo que nadie más necesita. Luego lee el Capítulo 13 y compara tu diseño contra el real — donde difieran, uno de los dos tiene una razón. Encuéntrala.

## Vocabulario

| English | Español |
|---|---|
| class / instance | clase / instancia |
| blueprint | plano (de construcción) |
| constructor | constructor |
| method | método |
| private field | campo privado |
| public surface | superficie pública |
| refactoring | refactorización |
| equivalence | equivalencia |

## Lo que sigue

Dos clases listas, faltan cinco. En el **Capítulo 13** llega la arquitectura completa: `InputController`, `Renderer`, `Scoreboard`, `PlayerPanel`, y `Game` como raíz de composición — y cada principio SOLID enseñado en el momento exacto en que el refactor lo demuestra. Las funciones sueltas desaparecen para siempre.

**[Continúa al Capítulo 13: Refactorizando como ingeniero →](../13-refactoring-like-an-engineer/README.es.md)**
