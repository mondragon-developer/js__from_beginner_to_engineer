# Capítulo 5 - Funciones Que Dibujan

*Léelo en: [English](README.md) | **Español***

Tu script corre de arriba a abajo como una oración larguísima - aceptable con 40 líneas, ilegible con 900. Hoy aprendes la herramienta que le da *estructura* al código: las funciones. Partimos la escena en tres piezas con nombre - `drawCourt()`, `drawBall(x, y)`, `drawHoop()` - el aro aparece en pantalla, y la documentación JSDoc empieza aquí y no se detiene por el resto del curso.

**Tiempo**: ~50 minutos.

## Lo que vas a construir en este capítulo

El gimnasio gana su aro: poste de soporte, vidrio del tablero, y el aro rojo, todo en las coordenadas reales del juego terminado. Estructuralmente, la escena completa se convierte en tres funciones documentadas y reutilizables más tres llamadas. Resultado visual esperado: una cancha a la que *casi* podrías tirarle.

## Conceptos nuevos

- **declaración de función** - empaquetar sentencias bajo un nombre
- **parámetros y argumentos** - las entradas de la función
- **`return`** - la salida de la función
- **ámbito (scope)** - las variables declaradas dentro de una función viven solo adentro
- **JSDoc** - el formato de comentario estándar de la industria para documentar funciones
- **`strokeStyle` / `lineWidth` / `moveTo` / `lineTo` / `stroke`** - dibujar líneas en lugar de formas rellenas

## Constrúyelo, paso a paso

### Paso 1 - Qué es una función (60 segundos en la consola)

Escribe esto en la consola de DevTools:

```js
function half(n) { return n / 2; }
half(920)
```

La consola responde `460`. Una **declaración de función** empaqueta sentencias bajo un nombre; un **parámetro** (`n`) es un casillero que se llena con el valor que pases al *llamarla* (`920` - el **argumento**); y **`return`** entrega un resultado a quien llamó. Ese es todo el mecanismo. Nuestras funciones de dibujo no necesitarán `return` (su "salida" son píxeles en el canvas), pero la física del juego en la Parte III devuelve valores constantemente - `ballSpeed()`, `launchVelocity()`, `isScore()` le reportan a quien las llama.

### Paso 2 - Envuelve lo que ya tienes: `drawCourt`

Envuelve el código de pared y piso en una función (nada adentro cambia):

```js
/** Paint the gym wall and the hardwood floor. */
function drawCourt() {
  ctx.fillStyle = "#16233a";
  ctx.fillRect(0, 0, CONFIG.world.width, CONFIG.world.height);

  ctx.fillStyle = "#a06a38";
  ctx.fillRect(0, CONFIG.world.floorY, CONFIG.world.width, CONFIG.world.height - CONFIG.world.floorY);
}
```

Ese comentario de arriba - `/** ... */` - es **JSDoc**, y es una promesa del curso: *cada función de aquí al Capítulo 14 lleva el suyo.* Una oración que dice qué hace la función, escrita antes de que olvides por qué la escribiste.

> [!NOTE]
> **Declarar no es ejecutar.** Una declaración de función solo le *enseña* la receta al navegador; no se dibuja nada hasta que alguien *llama* a `drawCourt()`. Si guardas ahora mismo, el canvas queda en blanco - la receta existe, sin cocinar. Las llamadas llegan en el Paso 5, y mantener "definir todo, luego ejecutar" como estructura se vuelve la columna vertebral del juego entero (el Capítulo 6 formaliza la sección de abajo como el Boot).

### Paso 3 - Una función con entradas: `drawBall`

```js
/**
 * Draw the ball centered at (x, y).
 * @param {number} x horizontal center in pixels
 * @param {number} y vertical center in pixels
 */
function drawBall(x, y) {
  ctx.fillStyle = "#e0662f";
  ctx.beginPath();
  ctx.arc(x, y, CONFIG.ball.radius, 0, Math.PI * 2);
  ctx.fill();
}
```

¿Por qué parámetros, si la pelota tiene un lugar fijo en CONFIG? Porque *no se va a quedar ahí*. El próximo capítulo la pelota se mueve en cada cuadro, y `drawBall(x, y)` será llamada con una posición distinta 60 veces por segundo. Una función que recibe sus entradas es una función lista para un futuro que su autor vio venir.

El JSDoc creció: `@param {number} x` documenta el *tipo* y significado de cada entrada. VS Code lo lee - pasa el cursor sobre cualquier llamada a `drawBall` y tu propia documentación aparece, y hasta te advertirá cuando pases un disparate. Herramienta gratis, un comentario.

> [!WARNING]
> **Error real: llamar `drawBall()` sin argumentos.** Lo reprodujimos: olvida los argumentos y `x` e `y` valen `undefined` - el valor de JavaScript para "no se proporcionó nada". Y aquí la parte cruel: `ctx.arc(undefined, undefined, ...)` **no lanza error y no dibuja nada**. La especificación del canvas ignora en silencio las coordenadas no finitas. La pelota simplemente… no está, y la consola está limpia. Cuando algo visual desaparece en silencio, revisa primero los argumentos en el punto de llamada - este silencio exacto es la razón.

### Paso 4 - Aparece el aro: `drawHoop`

Primero, haz crecer CONFIG con la geometría real del aro del juego terminado:

```js
  hoop:  {
    boardX: 812, boardTop: 168, boardBottom: 318,
    rimY: 300, rimFrontX: 726, rimBackX: 800,
    rimThickness: 5
  }
```

Luego la función:

```js
/** Draw the pole, the backboard glass, and the rim. */
function drawHoop() {
  const h = CONFIG.hoop;

  // Pole
  ctx.fillStyle = "#2c3e5c";
  ctx.fillRect(h.boardX + 8, h.boardTop + 30, 12, CONFIG.world.floorY - h.boardTop - 30);

  // Backboard glass
  ctx.fillStyle = "rgba(232,238,246,0.88)";
  ctx.fillRect(h.boardX, h.boardTop, 8, h.boardBottom - h.boardTop);

  // Rim: a thick line from the front lip to the backboard
  ctx.strokeStyle = "#e23d28";
  ctx.lineWidth = h.rimThickness * 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(h.rimFrontX, h.rimY);
  ctx.lineTo(h.rimBackX, h.rimY);
  ctx.stroke();
}
```

Piezas nuevas, de arriba a abajo. `const h = CONFIG.hoop;` es una abreviatura local - `h` vive solo dentro de esta función (**ámbito**), y el juego terminado usa exactamente este truco. `rgba(...)` es un color con transparencia (0.88 = 88% opaco - vidrio). Y el aro se dibuja como **línea**, no como forma rellena: `moveTo` coloca la pluma, `lineTo` la arrastra, `stroke()` entinta el trazado usando `strokeStyle` y `lineWidth` (grosor del aro × 2, porque `rimThickness: 5` es el *radio* del aro para la física del Capítulo 9 - el dibujo y la física estarán demostrablemente de acuerdo).

> [!WARNING]
> **Error real: olvidar `beginPath`.** El canvas mantiene UN solo trazado actual, compartido por todo el dibujo. Reprodujimos el clásico: dibuja la pelota, luego dibuja el aro *sin* `beginPath()` - y el `stroke()` del aro vuelve a trazar **también el círculo de la pelota**, porque el arco seguía en el trazado compartido. Resultado medido: a la pelota le crece un contorno rojo aro (su píxel del borde mide `rgb(226, 61, 40)` - exactamente `#e23d28`). Sin error, solo píxeles equivocados. La regla: **cada forma nueva empieza con `beginPath()`.**

### Paso 5 - Compón la escena

Al final, reemplaza todo el código de dibujo suelto con:

```js
// Draw the scene, back to front.
drawCourt();
drawHoop();
drawBall(CONFIG.ball.startX, CONFIG.ball.startY);
```

**Punto de control - el cambio visible del capítulo:** guarda. Poste, tablero de vidrio, aro rojo - el gimnasio ya es reconociblemente una cancha de baloncesto. Verificamos el snapshot píxel por píxel en Chrome 150: aro `rgb(226, 61, 40)`, vidrio `rgb(206, 213, 223)`, pelota `rgb(224, 102, 47)`.

Vuelve a leer esas tres llamadas. Ahora son el programa completo - y se leen como direcciones de escena: *cancha, aro, pelota, de atrás hacia adelante.* Eso es lo que compran las funciones: la parte alta de tu script guarda los detalles, la parte baja cuenta la historia.

Tu archivo debería coincidir ahora con el [`snapshot/index.html`](snapshot/index.html) de este capítulo.

## Por qué lo hicimos así

La partición que elegimos - cancha / pelota / aro - no es arbitraria: cada función es dueña de una *cosa* que le importa al juego, y son exactamente las costuras por donde se formarán las clases del juego terminado (`Renderer` dibuja, `Ball` y `Hoop` conocen su geometría - Capítulos 12-13). Descomponer por las articulaciones naturales del dominio, en lugar de por longitud de código, es la mayor parte de lo que significa "arquitectura"; y acabas de hacerlo en un archivo de 90 líneas, que es el tamaño correcto para aprenderlo. JSDoc, misma lógica: documentar tres funciones hoy es trivial, y para el Capítulo 14 habrás documentado ~40 sin enfrentar jamás la tarea de "escribir toda la documentación".

## Rincón de experimentos

1. Llama `drawBall(460, 200)` como cuarta línea al final - una segunda pelota, en el aire, con una línea extra. Los parámetros son palanca. (Quítala después: cero código muerto.)
2. Reordena las llamadas: pelota primero, cancha al final. Predice, luego guarda. *(Cancha vacía - la pared repinta encima de todo. El mismo algoritmo del pintor del Capítulo 3, ahora con funciones.)*
3. En la consola, escribe `drawHoop` (sin paréntesis) y Enter - la consola muestra la función misma. Ahora escribe `drawHoop()` - corre, y el aro se re-entinta visiblemente. Nombrar versus llamar, sentido en carne propia.

## Ejercicios

Las soluciones desarrolladas están en [`exercises/solutions/`](exercises/solutions/).

1. **Guiado** - dale a `drawBall` un tercer parámetro `color`, úsalo como `fillStyle`, y dibuja la pelota de práctica en `#e0662f` más una "pelota fantasma" en (460, 200) con `"rgba(242, 234, 216, 0.4)"`.
2. **Independiente** - escribe `drawMarker()`: el marcador de la línea de tiro libre (un rectángulo claro de 3 píxeles de grosor sobre el piso, 34 a cada lado del inicio de la pelota), con JSDoc, llamado desde adentro de `drawCourt`. Que las funciones llamen funciones es normal y bueno.
3. **Reto** - escribe `drawScene()` que contenga las tres llamadas, de modo que el final del script sea un solo `drawScene();`. Final de una línea, programa completamente nombrado. (El `Renderer.draw` del juego terminado es exactamente esta idea.)

## Vocabulario

| English | Español |
|---|---|
| function | función |
| parameter / argument | parámetro / argumento |
| return value | valor de retorno |
| scope | ámbito / alcance |
| call (a function) | llamar / invocar (una función) |
| path (canvas) | trazado (canvas) |
| stroke / fill | trazar / rellenar |

## Lo que sigue

La cancha está lista y la pelota sabe dibujarse en cualquier parte. En el **Capítulo 6**, se *mueve*: el bucle del juego, delta time, gravedad - y el primer momento de magia de todo el curso, cuando la pelota cae y rebota por sí sola.

**[Continúa al Capítulo 6: Haciendo que las cosas se muevan →](../06-making-things-move/README.es.md)**
