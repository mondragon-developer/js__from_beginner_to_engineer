# Capítulo 4 — Variables y CONFIG

*Léelo en: [English](README.md) | **Español***

El Capítulo 3 terminó con un desafío: cuenta cuántas ediciones toma cambiar el tamaño de la cancha. La respuesta era *cinco*, regadas por el archivo, y el juego apenas existe. Hoy lo arreglamos para siempre. Nace CONFIG — el hogar único y congelado de cada número del juego — y para celebrarlo, la pelota aparece en la línea de tiro libre, posicionada enteramente por valores con nombre. Este es el primer capítulo cuya lección principal no es un truco del canvas; es un juicio de ingeniería.

**Tiempo**: ~40 minutos.

## Lo que vas a construir en este capítulo

La misma pared y piso — ahora manejados por CONFIG — más la pelota naranja descansando en la línea de tiro libre. Resultado visual esperado: un círculo nuevo en pantalla; e invisiblemente, un archivo donde cambiar cualquier dimensión significa editar exactamente un lugar.

## Conceptos nuevos

- **números mágicos** — literales sin explicación regados por el código, y por qué son el enemigo
- **objeto literal** — `{ }`: varios valores con nombre agrupados en uno
- **acceso con punto** — `CONFIG.world.width`: leer un valor de adentro de un objeto
- **`Object.freeze`** — hacer un objeto de solo lectura
- **`const` vs `let` vs `var`** — la historia completa, y por qué `var` nunca aparece en este curso
- **booleanos** — valores `true`/`false` (conocidos en la consola, usados desde el Capítulo 6)
- **`beginPath` / `arc` / `fill`** — dibujar tu primer círculo

## Constrúyelo, paso a paso

### Paso 1 — Nombra el problema

Mira tu script del Capítulo 3: `920` aparece dos veces, `540` dos veces, `500` dos veces. Estos son **números mágicos** — valores que significan algo importante (*¡la altura del piso!*) pero no dicen nada y se repiten por todas partes. Los números mágicos causan dos enfermedades: no puedes *leer* el código (`500` significa… ¿qué?), y no puedes *cambiarlo* con seguridad (si te falta una de las copias, la pared y el piso quedan en desacuerdo sobre dónde está el piso).

### Paso 2 — Nace CONFIG

En la parte superior del script, justo después de `"use strict";`, agrega:

```js
/* =====================================================================
 * CONFIG — the single source of truth for every number in the game.
 * Frozen so nothing can change it by accident (constants live in one
 * place, with names instead of magic numbers).
 * ===================================================================== */
const CONFIG = Object.freeze({
  world: { width: 920, height: 540, floorY: 500 },
  ball:  { startX: 180, startY: 458, radius: 17 }
});
```

> [!NOTE]
> **Un objeto literal es una caja de casilleros etiquetada.** Las variables del Capítulo 2 eran casilleros individuales. `{ width: 920, height: 540, floorY: 500 }` es una *caja* que contiene tres, cada uno con su nombre. Los objetos pueden contener objetos: `CONFIG` es una caja de cajas. Se lee con puntos — `CONFIG.world.floorY` significa "en CONFIG, abre `world`, toma `floorY`" — y la expresión *se lee como la frase que dirías en voz alta*. Esa legibilidad es la cura completa para los números mágicos.

Estos son los valores reales del juego terminado, tomados de la clave de respuestas: el mundo es de 920×540 con la línea del piso en 500, y la pelota tiene radio 17 y empieza en (180, 458). CONFIG crecerá cada pocos capítulos — la física en el Capítulo 6, el aro en el 5, el ajuste de controles en el 8 — hasta igualar el del juego final, clave por clave.

### Paso 3 — Congélalo

`Object.freeze(...)` envuelve el objeto al crearlo y lo hace de **solo lectura**. ¿Por qué protegernos de nosotros mismos? Porque en un juego de 900 líneas, un error de dedo como `CONFIG.ball = 99` *en alguna parte* es cuestión de tiempo — y sin freeze destruiría la configuración en silencio y rompería todo lo que sigue, lejos del error. Con freeze (más el `"use strict"` del Capítulo 2), se rompe *ruidosamente, en el error*:

> [!WARNING]
> **Error real: asignar a un objeto congelado.** Reprodujimos ambas variantes en Chrome 150. Reasigna una clave — `CONFIG.ball = 99` — y obtienes:
>
> ```
> Uncaught TypeError: Cannot assign to read only property 'ball' of object '#<Object>'
> ```
>
> Agrega una clave nueva — `CONFIG.extra = 1` — y:
>
> ```
> Uncaught TypeError: Cannot add property extra, object is not extensible
> ```
>
> Ambos errores apuntan a la línea culpable exacta. **Esto es `"use strict"` pagando su renta**: sin él, ambos errores fallan *en silencio* — la asignación simplemente no ocurre, y te pasas una hora cazando la rareza resultante.

> [!NOTE]
> **Caja de honestidad: `Object.freeze` es superficial.** Congela solo el *nivel superior*. `CONFIG.world = {...}` lanza error — pero `CONFIG.world.width = 1000` **funciona en silencio** (también lo verificamos; el objeto anidado `world` nunca fue congelado él mismo). Congelar recursivamente es posible, pero el juego terminado no se molesta, y nosotros tampoco: el freeze es una barandilla contra accidentes, no una armadura contra un vándalo decidido. Conocer los límites de tus herramientas es parte de usarlas con honestidad.

### Paso 4 — Reescribe el dibujo con nombres

Reemplaza cada número mágico:

```js
// Gym wall
ctx.fillStyle = "#16233a";
ctx.fillRect(0, 0, CONFIG.world.width, CONFIG.world.height);

// Floor
ctx.fillStyle = "#a06a38";
ctx.fillRect(0, CONFIG.world.floorY, CONFIG.world.width, CONFIG.world.height - CONFIG.world.floorY);
```

Observa que la altura del piso ahora se *calcula* — `height - floorY` — en lugar del `40` escrito a mano. Ese es el beneficio componiéndose: el grosor de la banda del piso ya ni siquiera es un número que guardamos; es una consecuencia de dos hechos con nombre, y nunca podrá estar en desacuerdo con ellos.

**Punto de control:** guarda — la escena se ve *idéntica* al Capítulo 3. Eso es correcto e importante: refactorizar significa cambiar el código sin cambiar el comportamiento. El Capítulo 12 convierte esa idea en una herramienta formal.

Un matiz: los strings de color se quedan como literales. La regla del curso, tomada directo de la clave de respuestas: **los números que definen el juego viven en CONFIG; los valores usados una sola vez, puramente visuales, dentro del código de dibujo pueden quedarse en línea.** Las reglas con excepciones razonadas le ganan a las reglas seguidas a ciegas.

### Paso 5 — Aparece la pelota

```js
// The ball, waiting on the free-throw spot.
ctx.fillStyle = "#e0662f";
ctx.beginPath();
ctx.arc(CONFIG.ball.startX, CONFIG.ball.startY, CONFIG.ball.radius, 0, Math.PI * 2);
ctx.fill();
```

Los círculos necesitan tres comandos en lugar de uno. `beginPath()` inicia el trazo de una figura nueva; `arc(x, y, radio, 0, Math.PI * 2)` traza un círculo alrededor del punto central (los ángulos se miden en *radianes* — `Math.PI * 2` es una vuelta completa); `fill()` rellena la figura trazada con el color actual. El Capítulo 5 muestra — con un bug real — por qué `beginPath` no es opcional.

**Punto de control — el cambio visible del capítulo:** una pelota naranja descansa en la línea de tiro libre. Verificamos este snapshot píxel por píxel en Chrome 150: el centro de la pelota mide `rgb(224, 102, 47)` — exactamente `#e0662f`.

Ahora la verdadera recompensa. Cambia `startX: 180` a `startX: 400`, guarda: la pelota se teletransporta. Regrésalo. **Un número, un lugar, un significado.** De aquí en adelante, ajustar el juego es editar CONFIG.

Tu archivo debería coincidir ahora con el [`snapshot/index.html`](snapshot/index.html) de este capítulo.

> [!NOTE]
> **La historia de `var`, y los booleanos.** JavaScript tiene una tercera palabra clave de declaración, `var`, de 1995. Ignora los límites de bloque (un `var` dentro de un `if` se fuga hacia afuera) y te deja re-declarar el mismo nombre dos veces sin quejarse — dos comportamientos que esconden exactamente la clase de bug que este capítulo combate. `const` y `let` (2015) arreglaron ambos. Regla simple, de toda la industria: **nunca `var`.** — Y un tipo de valor más que debes conocer antes del Capítulo 6: prueba `CONFIG.world.width > 900` en la consola. La respuesta, `true`, es un **booleano** — el tipo de sí/no. Cada prueba de colisión y regla de puntuación de este juego se construirá con ellos.

## Por qué lo hicimos así

Este capítulo es la tesis del curso en miniatura: *los hábitos profesionales salen más baratos adoptados temprano que adaptados tarde.* CONFIG no cuesta nada hoy — el juego tiene 40 líneas — pero para el Capítulo 9 la física dirá `CONFIG.physics.rimRestitution` en lugar de `0.65`, y ajustarás la sensación del juego escaneando un bloque comentado en lugar de buscar entre mil líneas. El freeze, igual: una llamada de función hoy y un guardaespaldas silencioso para siempre. Y estructurar CONFIG como objetos *anidados* (`world`, `ball`, luego `physics`, `hoop`, `input`) hace que su forma documente la anatomía del juego antes de que hayas construido la mayor parte.

## Rincón de experimentos

1. Pon `radius: 40`, guarda — una pelota de playa. Pon `3` — una canica. Una clave ajusta el juego; así se siente el diseño manejado por configuración.
2. Escribe `CONFIG` en la consola y presiona Enter. Expande el objeto con la flechita: la consola entiende objetos nativamente — este hábito de inspección te servirá en cada capítulo.
3. Rómpelo a propósito: agrega `CONFIG.world.floorY = 100;` después del freeze — sin error, ¿pero tampoco cambia nada?? Espera — es *anidado*, así que **sí** cambia (¡freeze superficial!), y el piso salta. Ahora prueba `CONFIG.world = {};` — el `TypeError` de la caja de Advertencia. Sentir la diferencia entre los dos vale tres relecturas de la Nota.

## Ejercicios

Las soluciones desarrolladas están en [`exercises/solutions/`](exercises/solutions/).

1. **Guiado** — agrega `hoop: { poleX: 820 }` a CONFIG y dibuja el poste de soporte del ejercicio reto del Capítulo 3 usándolo (12 de ancho, `#2c3e5c`, desde y = 200 hasta el piso — calcula la altura desde `CONFIG.world.floorY`, no escribas 300 a mano).
2. **Independiente** — agrega una clave `court: { markerHalf: 34 }` y dibuja el marcador de tiro libre: una línea delgada más clara sobre el piso, centrada bajo la pelota, extendiéndose `markerHalf` a cada lado de `CONFIG.ball.startX`. (Un `fillRect` muy delgado funciona como línea.)
3. **Reto** — escribe, en un comentario, qué atraparía y qué no atraparía `Object.freeze` en tu código del ejercicio 1, y luego verifica ambas predicciones en la consola.

## Vocabulario

| English | Español |
|---|---|
| magic number | número mágico |
| object literal | objeto literal |
| property / key | propiedad / clave |
| frozen (object) | (objeto) congelado |
| single source of truth | fuente única de la verdad |
| boolean | booleano |
| refactor | refactorizar |

## Lo que sigue

El script está creciendo y todavía se lee de arriba a abajo como una oración sin puntos. En el **Capítulo 5** partimos el dibujo en funciones con nombre y documentadas — `drawCourt()`, `drawBall(x, y)`, `drawHoop()` — y el aro por fin aparece. JSDoc empieza ahí y no se detiene jamás.

**[Continúa al Capítulo 5: Funciones que dibujan →](../05-functions-that-draw/README.es.md)**
