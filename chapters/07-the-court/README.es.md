# Capítulo 7 — La Cancha

*Léelo en: [English](README.md) | **Español***

La física funciona; el gimnasio parece maqueta de cartón. Este capítulo es puro oficio: degradados, vetas de tablones, un tablero de vidrio, una red, una pelota con sombra — la escena completa, píxel por píxel la del juego terminado. En el camino aprendes el bucle `for` (la red lo exige), las plantillas literales, y el truco de capas que deja a la pelota volar *a través* del aro.

**Tiempo**: ~1 hora.

## Lo que vas a construir en este capítulo

La cancha completa: degradado de pared, duela con vetas, marcador de tiro libre, poste, tablero, red, aro — con la pelota rebotante del Capítulo 6 proyectando ahora una sombra suave. Resultado visual esperado: el juego que viste en el GIF del Capítulo 0, menos los controles y el marcador.

## Conceptos nuevos

- **`createLinearGradient` / `createRadialGradient`** — colores que se mezclan por el espacio
- **el bucle `for`** — repetir con un contador
- **desestructuración** — `const { width, height } = CONFIG.world;`
- **plantillas literales** — `` `rgba(0,0,0,${valor})` ``: strings con huecos calculados
- **`ellipse` / `quadraticCurveTo`** — las dos últimas formas del canvas
- **capas por orden de dibujo** — partir el aro en un *atrás* y un *adelante*

## Constrúyelo, paso a paso

Cada función de abajo reemplaza o mejora su versión del Capítulo 6 — mismos nombres donde el trabajo es el mismo, y borra lo que cada una reemplaza (cero código muerto, siempre). Los cuerpos son, deliberadamente, el código de dibujo de la clave de respuestas en forma de funciones: lo que escribes hoy sobrevive hasta el Capítulo 14 casi intacto.

### Paso 1 — El fondo respira: `drawBackground`

```js
/** Paint the gym-wall gradient behind everything. */
function drawBackground() {
  const { width, height } = CONFIG.world;
  const g = ctx.createLinearGradient(0, 0, 0, height);
  g.addColorStop(0, "#1b2c47");
  g.addColorStop(1, "#101c30");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);
}
```

Dos herramientas nuevas en seis líneas. `const { width, height } = CONFIG.world;` es **desestructuración** — "abre la caja y saca estos dos casilleros" — se lee mejor que repetir `CONFIG.world.` cuatro veces. Y un **degradado** es un color pintable que *cambia* entre dos puntos: este corre de `(0,0)` hasta `(0,height)`, mezclando azul-pared con casi-negro. `addColorStop(0, ...)` y `(1, ...)` son los colores al inicio y al final de esa línea — aquí 0 y 1 significan *fracciones de la línea de degradado que definiste*.

> [!WARNING]
> **Error real: el degradado "normalizado".** Otras herramientas gráficas usan coordenadas de 0 a 1, así que es natural escribir `createLinearGradient(0, 0, 0, 1)` esperando "de arriba a abajo". Lo reprodujimos: pinta el piso con un degradado 0→1 y **el piso entero sale de un solo color plano** — medimos `rgb(143, 90, 43)` (el color *final*) tanto arriba como abajo del piso. La razón: la línea de degradado que definiste mide 1 píxel; todo lo que queda debajo del píxel 1 está "pasado el final", que repite el último color por siempre. Los degradados del canvas viven en **coordenadas de píxeles**, el mismo espacio que tus formas.

### Paso 2 — Duela de verdad: `drawCourt`

```js
/** Hardwood floor, plank seams, and the free-throw marker. */
function drawCourt() {
  const { width, height, floorY } = CONFIG.world;

  // Hardwood floor
  const wood = ctx.createLinearGradient(0, floorY, 0, height);
  wood.addColorStop(0, "#c08145");
  wood.addColorStop(1, "#8f5a2b");
  ctx.fillStyle = wood;
  ctx.fillRect(0, floorY, width, height - floorY);

  // Plank seams
  ctx.strokeStyle = "rgba(0,0,0,0.18)";
  ctx.lineWidth = 1;
  for (let x = 40; x < width; x += 92) {
    ctx.beginPath();
    ctx.moveTo(x, floorY);
    ctx.lineTo(x - 14, height);
    ctx.stroke();
  }

  // Free-throw marker under the ball's starting spot
  ctx.strokeStyle = "rgba(242,234,216,0.5)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(CONFIG.ball.startX - 34, floorY + 1.5);
  ctx.lineTo(CONFIG.ball.startX + 34, floorY + 1.5);
  ctx.stroke();
}
```

> [!NOTE]
> **El bucle `for`: repetir con contador.** `for (let x = 40; x < width; x += 92)` se lee: *arranca un contador `x` en 40; sigue mientras `x` esté bajo `width`; súmale 92 después de cada vuelta.* El cuerpo dibuja una veta ligeramente inclinada (de `x` en el piso hasta `x - 14` en el borde inferior — la inclinación finge perspectiva), así que diez tablones cuestan tres líneas de código en lugar de treinta. Los bucles son cómo una descripción se convierte en muchas cosas — la red del Paso 3 se apoya en esto con más fuerza.

**Punto de control:** guarda — tablones de madera con vetas, y una línea de gis como marcador de tiro libre bajo la pelota rebotante.

### Paso 3 — Partiendo el aro: `drawHoopBack`

Borra `drawHoop` — la reemplazan dos funciones, y la *razón* es el mejor truco del capítulo. Cuando la pelota cae a través del aro, el aro debe verse **enfrente de** la pelota, pero la red y el tablero **detrás**. Un objeto, dos capas:

Primero, hazle crecer una clave a `CONFIG.hoop`: `netDepth: 52`.

```js
/** Backboard, pole and the net (drawn behind the ball). */
function drawHoopBack() {
  const h = CONFIG.hoop;

  // Pole
  ctx.fillStyle = "#2c3e5c";
  ctx.fillRect(h.boardX + 8, h.boardTop + 30, 12, CONFIG.world.floorY - h.boardTop - 30);

  // Backboard glass
  ctx.fillStyle = "rgba(232,238,246,0.88)";
  ctx.fillRect(h.boardX, h.boardTop, 8, h.boardBottom - h.boardTop);

  // Net (simple crossing lines from rim down)
  ctx.strokeStyle = "rgba(242,234,216,0.65)";
  ctx.lineWidth = 1.5;
  const bottomY = h.rimY + h.netDepth;
  const inset = 14;
  for (let i = 0; i <= 4; i++) {
    const topX = h.rimFrontX + ((h.rimBackX - h.rimFrontX) * i) / 4;
    const botX = h.rimFrontX + inset + ((h.rimBackX - h.rimFrontX - inset * 2) * i) / 4;
    ctx.beginPath();
    ctx.moveTo(topX, h.rimY);
    ctx.lineTo(botX, bottomY);
    ctx.stroke();
  }
}
```

El bucle de la red merece decodificarse una vez, despacio: `i` corre de 0 a 4, y `(algo * i) / 4` desliza un punto de un extremo de un rango al otro en cinco pasos parejos — `topX` camina por el aro, `botX` camina un rango *más angosto* (`inset` desde cada lado), así que las cinco hebras se inclinan hacia adentro como una red real se estrecha. Este patrón de deslizar-una-fracción está por todas partes en el código gráfico.

> [!WARNING]
> **Error real: el estado del canvas se fuga entre funciones.** El aro (Paso 4) pone `lineWidth` en 10. Medimos lo que pasa después: tras dibujarlo, `ctx.lineWidth` **sigue siendo 10** — el contexto es una sola máquina compartida, y los ajustes persisten hasta que alguien los cambie. Olvida la línea `ctx.lineWidth = 1.5;` de la red y al siguiente cuadro tu red está tejida con soga. El hábito que previene toda esta familia de bugs: **cada función de dibujo fija cada estilo con el que traza o rellena.** Nunca dependas de lo que dejó la función anterior.

### Paso 4 — `drawHoopFront`

```js
/** The rim itself, drawn in front so the ball appears to pass through. */
function drawHoopFront() {
  const h = CONFIG.hoop;
  ctx.strokeStyle = "#e23d28";
  ctx.lineWidth = h.rimThickness * 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(h.rimFrontX, h.rimY);
  ctx.lineTo(h.rimBackX, h.rimY);
  ctx.stroke();
}
```

### Paso 5 — Una pelota con profundidad: `drawBall`

```js
/**
 * Draw the ball centered at (x, y): floor shadow, body, and seams.
 * @param {number} x horizontal center in pixels
 * @param {number} y vertical center in pixels
 */
function drawBall(x, y) {
  const radius = CONFIG.ball.radius;

  // Soft shadow on the floor, fading with height
  const height = CONFIG.world.floorY - y;
  const shrink = Math.max(0.35, 1 - height / 700);
  ctx.fillStyle = `rgba(0,0,0,${0.28 * shrink})`;
  ctx.beginPath();
  ctx.ellipse(x, CONFIG.world.floorY + 6, radius * shrink * 1.2, 5 * shrink, 0, 0, Math.PI * 2);
  ctx.fill();

  // Ball body
  const g = ctx.createRadialGradient(x - 5, y - 6, 3, x, y, radius);
  g.addColorStop(0, "#f5824e");
  g.addColorStop(1, "#cf4d1c");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  // Seams
  ctx.strokeStyle = "rgba(90,30,8,0.8)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.moveTo(x - radius, y);
  ctx.lineTo(x + radius, y);
  ctx.moveTo(x, y - radius);
  ctx.quadraticCurveTo(x + radius * 0.7, y, x, y + radius);
  ctx.stroke();
}
```

Tres efectos, cada uno barato. La **sombra**: una `ellipse` (como `arc` pero con dos radios) clavada al piso, que se encoge y desvanece conforme la pelota sube — ``` `rgba(0,0,0,${0.28 * shrink})` ``` es una **plantilla literal**, un string con un cálculo vivo incrustado en `${...}`; las usarás constantemente. El **cuerpo**: un `createRadialGradient` — mezcla entre dos *círculos* en lugar de dos puntos, desplazado arriba-izquierda para que la pelota se lea iluminada desde arriba. Las **costuras**: una línea de ecuador más un `quadraticCurveTo` (una línea que se curva hacia un punto de control) — suficiente para decir "pelota de baloncesto" con 17 píxeles de radio. Verificamos el píxel del brillo: `rgb(245, 130, 78)`, exactamente `#f5824e`.

### Paso 6 — El frame compone las capas

```js
  drawBackground();
  drawCourt();
  drawHoopBack();
  drawBall(ball.x, ball.y);
  drawHoopFront();
```

**Punto de control — el cambio visible del capítulo:** guarda. La pelota cae dentro de un *gimnasio*: tablones, vidrio, red, y cuando cruza la altura del aro cerca de él ya puedes ver la magia de las capas — red detrás, aro delante. Recarga y mira la sombra seguir el rebote.

Tu archivo debería coincidir ahora con el [`snapshot/index.html`](snapshot/index.html) de este capítulo.

## Por qué lo hicimos así

La partición atrás/adelante del aro es la verdadera lección del capítulo: **el orden de dibujo es una herramienta de diseño.** En lugar de maquinaria 3D, una sola decisión — "la pelota vive entre estas dos capas" — vende la ilusión completa, y es exactamente la estructura que conserva el `Renderer` de la clave de respuestas (`#drawHoopBack` … `#drawBall` … `#drawHoopFront`). Nota también lo que la mejora visual *no* tocó: `integrateBall`, `collideFloor` y la mitad física de `frame` son byte por byte las del Capítulo 6, y el arnés lo demuestra — las mismas verificaciones de gravedad y rebote pasan sobre el snapshot de este capítulo. Lo bonito y lo correcto son preocupaciones separadas, y mantenerlas separadas es la razón de que ambas siguieran siendo fáciles.

## Rincón de experimentos

1. Pon el paso del bucle de tablones en `46` — el doble de tablones, la mitad de ancho. Luego haz la inclinación `x - 40` — perspectiva dramática. Los números en los bucles son perillas.
2. En `drawBall`, cambia `Math.max(0.35, ...)` por `Math.max(0.05, ...)` y mira la sombra casi desaparecer en lo alto del rebote. Ese valor mínimo decide qué tan "alto" se siente el gimnasio.
3. Rómpelo a propósito: borra el `ctx.lineWidth = 1.5;` de la red y mira la red de soga del siguiente cuadro (el 10 del aro se fugó — la Advertencia, en vivo).

## Ejercicios

Las soluciones desarrolladas están en [`exercises/solutions/`](exercises/solutions/).

1. **Guiado** — el gimnasio se siente vacío a la izquierda. Agrega el círculo de media cancha: un círculo trazado de radio 60 centrado en `(460, floorY)` — la mitad se esconde bajo el piso, dejando un arco limpio sobre la duela. Un `arc`, un `stroke`, el color sutil que elijas.
2. **Independiente** — dale al tablero su cuadro de tirador: un pequeño rectángulo trazado sobre el vidrio, centrado arriba del aro. Que se lea como pintura, no como neón.
3. **Reto** — parametriza la red: haz del número de hebras una variable `strands` y úsala tanto en la condición del bucle (`i <= strands`) como en el divisor (`/ strands`). Prueba 4, 7, 12. ¿Por qué el divisor debe cambiar junto con la cuenta? (Respuesta en la solución — es otra vez el patrón de deslizar-una-fracción.)

## Vocabulario

| English | Español |
|---|---|
| gradient | degradado / gradiente |
| loop | bucle / ciclo |
| destructuring | desestructuración |
| template literal | plantilla literal |
| layer | capa |
| ellipse | elipse |
| seam | veta / costura |

## Lo que sigue

El gimnasio está listo para un jugador — y en el **Capítulo 8**, ese jugador eres tú: Pointer Events, potencia por carga sostenida, puntería con el cursor, una barra que se llena de verde a rojo, y una vista previa punteada de la trayectoria que nunca miente. El juego se vuelve *jugable*.

**[Continúa al Capítulo 8: La mecánica de tiro →](../08-the-shooting-mechanic/README.es.md)**
