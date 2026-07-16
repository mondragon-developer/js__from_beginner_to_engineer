# Capítulo 3 — Tu Primer Canvas

*Léelo en: [English](README.md) | **Español***

El Capítulo 2 habló con la consola. Este capítulo te consigue una superficie donde *dibujar* — el mismo canvas de 920×540 que usa el juego terminado — y pinta las dos primeras piezas del gimnasio: la pared y el piso. Dos rectángulos. No parecerá gran cosa, pero cada píxel que el juego terminado llegue a mostrar pasa exactamente por la maquinaria que construyes hoy.

**Tiempo**: ~40 minutos.

## Lo que vas a construir en este capítulo

Una página oscura con el canvas del juego al centro, mostrando una pared de gimnasio azul profundo y una banda de piso de madera. Resultado visual esperado: tus primeras dos llamadas a `fillRect`, con los colores reales del juego, en las coordenadas reales del juego.

## Conceptos nuevos

- **`<canvas>`** — un elemento de HTML que es una cuadrícula de píxeles que JavaScript puede pintar
- **`getContext("2d")`** — el contexto de dibujo: el pincel de ese canvas
- **`document.getElementById`** — encontrar un elemento desde el código
- **el sistema de coordenadas del canvas** — `(0, 0)` es la esquina superior izquierda, y **y crece hacia abajo**
- **`fillStyle` / `fillRect`** — elegir un color, pintar un rectángulo

## Constrúyelo, paso a paso

### Paso 1 — Una página con un canvas

Reemplaza tu `index.html` con:

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Free Throw — Chapter 3</title>
<style>
  body { background: #0d1626; margin: 0; display: flex; justify-content: center; padding: 16px; }
  canvas { border-radius: 10px; }
</style>
</head>
<body>

<canvas id="court" width="920" height="540"></canvas>

<script>
"use strict";
</script>
</body>
</html>
```

Dos cosas son nuevas. El bloque `<style>` es CSS — los cosméticos de la página. Lo agregaremos en dosis pequeñas y siempre explicado: aquí oscurece la página, quita el margen por defecto, y centra el canvas. Y la línea `<canvas id="court" width="920" height="540">` crea la pantalla del juego: `id` es el nombre que el código usará para encontrarlo, y `width`/`height` fijan su tamaño *en píxeles de dibujo*.

**Punto de control:** guarda — un rectángulo negro de esquinas redondeadas queda centrado sobre una página oscura. Ese vacío negro es tu canvas.

> [!WARNING]
> **Error real: darle tamaño al canvas con CSS.** Es tentador escribir `canvas { width: 920px; height: 540px; }` en CSS en lugar de usar los atributos. Hazlo y todo canvas arranca con su superficie de dibujo por defecto — la medimos: **300×150 píxeles** — que CSS luego *estira* a 920×540. Todo lo que dibujes sale borroso y deformado, sin ningún error en ninguna parte. La regla: los **atributos** `width`/`height` deciden sobre cuántos píxeles dibujas; el CSS solo decide qué tan grandes se *ven* esos píxeles. Pon los atributos. (El juego terminado usa CSS encima de los atributos para escalar responsivamente — el Capítulo 8 maneja la matemática que eso exige.)

### Paso 2 — Encuentra el canvas, toma el pincel

Dentro del `<script>`, después de `"use strict";`:

```js
// The canvas element, and the 2D context — the brush that paints on it.
const canvas = document.getElementById("court");
const ctx = canvas.getContext("2d");
```

`document.getElementById("court")` le pregunta a la página: *dame el elemento cuyo id es `court`*. Luego `getContext("2d")` te entrega el **contexto de dibujo 2D** de ese canvas — cada comando de dibujo del resto del curso pasa por él. `ctx` es la abreviatura de este curso (y de toda la industria).

> [!WARNING]
> **Error real: el script corre antes de que el canvas exista.** Sube el `<script>` al `<head>` y la consola muestra, en rojo:
>
> ```
> Uncaught TypeError: Cannot read properties of null (reading 'getContext')
> ```
>
> El navegador lee el archivo de arriba a abajo. Dentro de `<head>`, tu script corre *antes* de que la línea del `<canvas>` haya sido leída — así que `getElementById` no encuentra nada y devuelve `null`, y pedirle `getContext` a `null` es el crash. Vuelve a leer el mensaje sabiendo eso: nombra exactamente lo que pasó. La corrección es donde el Capítulo 2 ya había puesto el script: **al final del `<body>`**, después de que existe todo lo que necesita.

### Paso 3 — La pared del gimnasio

```js
// Gym wall: one dark blue rectangle covering the whole canvas.
ctx.fillStyle = "#16233a";
ctx.fillRect(0, 0, 920, 540);
```

`fillStyle` carga el pincel con un color (`#16233a` es el azul de pared del juego terminado, escrito en hexadecimal — pares de rojo/verde/azul). `fillRect(x, y, ancho, alto)` pinta un rectángulo: esquina superior izquierda en `(0, 0)`, 920 de ancho, 540 de alto — el canvas entero.

**Punto de control:** guarda — el vacío negro ahora es una pared de gimnasio azul profundo.

> [!NOTE]
> **El eje y apunta HACIA ABAJO — esto merece su propia caja.** En la clase de matemáticas, y crece hacia arriba. En todo canvas de computadora, `(0, 0)` es la esquina **superior izquierda** y **y crece hacia abajo** — como leer una página, o numerar filas en una hoja de cálculo. Así que el punto `(0, 500)` está 500 píxeles *debajo* del borde superior, cerca del fondo. Esto se siente raro durante más o menos un capítulo y luego se vuelve segunda naturaleza — pero tiene una consecuencia famosa: *caer* significa que y se hace **más grande**. Recuérdalo en el Capítulo 6, cuando agreguemos gravedad; es la fuente de uno de los bugs reales de ese capítulo.

### Paso 4 — El piso

```js
// Floor: a wooden band across the bottom (y grows DOWNWARD on a canvas).
ctx.fillStyle = "#a06a38";
ctx.fillRect(0, 500, 920, 40);
```

Los mismos dos comandos, números nuevos: empieza en `(0, 500)` — 500 hacia abajo desde el borde superior — y pinta una banda de 920 de ancho y 40 de alto. Ese `500` es un número para recordar: es la línea del piso del juego terminado, la coordenada y donde ocurrirá cada rebote del curso.

**Punto de control — el cambio visible del capítulo:** un piso de madera corre a lo largo del fondo del gimnasio. Verificamos los píxeles exactos de este snapshot al producir el curso: la pared mide `rgb(22, 35, 58)` y el piso `rgb(160, 106, 56)` — precisamente los dos colores del código. Lo que pintas es lo que obtienes.

> [!TIP]
> **La pintura posterior cubre la anterior.** El rectángulo de la pared cubre el canvas entero, área del piso incluida — el piso simplemente se pinta *encima*. Esto se llama el algoritmo del pintor, y es la estrategia de renderizado completa del juego terminado: en cada cuadro, dibujar primero el fondo, luego la cancha, luego la pelota, luego el aro, en ese orden. Nunca se borra nada — solo se repinta en el orden correcto. El Rincón de experimentos te lo hace sentir.

Tu archivo debería coincidir ahora con el [`snapshot/index.html`](snapshot/index.html) de este capítulo.

## Por qué lo hicimos así

Fíjate en lo que **no** hicimos: ni librería de dibujo, ni framework de juegos. La API del canvas es pequeña y directa — elige un color, pinta una forma — y esa franqueza es lo que la hace perfecta para aprender: no ocurre nada que tú no hayas ordenado explícitamente. Fíjate también en que los números `920`, `540`, `500` ya aparecen en varios lugares, escritos a mano. Esa incomodidad es deliberada. Cuenta cuántos lugares tendrías que editar para hacer la cancha más alta — el Capítulo 4 existe para que ese número sea *uno*.

## Rincón de experimentos

1. Intercambia los dos bloques de dibujo (piso primero, pared después) y predice el resultado antes de guardar. *(Obtienes pura pared: el rectángulo de pantalla completa de la pared pinta encima del piso. El orden lo es todo.)*
2. Cambia el `500` del piso a `400`, guarda, y mira el piso subir — acabas de mover la línea horizontal más importante del juego.
3. Rómpelo a propósito: cambia `id="court"` a `id="Court"` en el HTML (C mayúscula) y lee la consola. El mismo `TypeError` de la Advertencia de arriba — `getElementById` también distingue mayúsculas, y ahora sabes exactamente qué significa su `null`.

## Ejercicios

Las soluciones desarrolladas están en [`exercises/solutions/`](exercises/solutions/).

1. **Guiado** — haz el piso más grueso y oscuro: empiézalo en `480` en lugar de `500`, hazlo de `60` de alto, y usa `#8f5a2b`. Predice cuál de los tres números cambia qué cosa, antes de guardar.
2. **Independiente** — pinta un cuadrado amarillo (`#ffb43a`) de 50×50 perfectamente centrado en el canvas. Necesitarás aritmética: el *centro* del canvas no es donde va la esquina `(x, y)` del cuadrado.
3. **Reto** — usando solo rectángulos, agrega una banda de "techo" (mismo color de madera, 20 de alto) a lo largo del borde superior, y un poste vertical (12 de ancho, `#2c3e5c`) subiendo desde el piso en `x = 820`. Acabas de bosquejar el soporte del aro — el Capítulo 5 lo dibuja en serio.

## Vocabulario

| English | Español |
|---|---|
| canvas | lienzo (canvas) |
| drawing context | contexto de dibujo |
| pixel | píxel |
| coordinate | coordenada |
| rectangle | rectángulo |
| hex color | color hexadecimal |
| top-left corner | esquina superior izquierda |

## Lo que sigue

Tres números ya aparecen dos veces cada uno en un archivo de 25 líneas, y de aquí en adelante solo empeora. En el **Capítulo 4** le declaramos la guerra a los números mágicos: nace CONFIG, `Object.freeze` lo protege, y la pelota aparece en la línea de tiro libre — posicionada enteramente por valores con nombre.

**[Continúa al Capítulo 4: Variables y CONFIG →](../04-variables-and-config/README.es.md)**
