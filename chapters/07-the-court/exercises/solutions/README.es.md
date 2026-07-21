# Capítulo 7 - Soluciones desarrolladas

*Léelo en: [English](README.md) | **Español***

Cada solución muestra el cambio exacto contra [`../../snapshot/index.html`](../../snapshot/index.html).

## 1 - Guiado: el círculo de media cancha

Al final de `drawCourt`, después del marcador de tiro libre:

```js
  // Half-court circle: the floor hides its bottom half, leaving an arc.
  ctx.strokeStyle = "rgba(242,234,216,0.35)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(460, floorY, 60, 0, Math.PI * 2);
  ctx.stroke();
```

Espera - ¿un círculo completo, no un arco? Mira el orden de dibujo: la mitad inferior del círculo cae *sobre* la banda del piso, que ya estaba pintada, así que ambas mitades quedan visibles como trazos sobre madera y se ve raro. La versión limpia traza solo la mitad superior:

```js
  ctx.arc(460, floorY, 60, Math.PI, 0);  // top half only: from 180° to 0°
```

Ambas se probaron contra el canvas real; la versión de medio arco es la que se lee como marca de cancha. (Ángulos: `Math.PI` es el lado izquierdo del círculo, `0` el derecho; la dirección por defecto barre por arriba.)

## 2 - Independiente: el cuadro del tirador

En `drawHoopBack`, justo después del vidrio del tablero:

```js
  // Shooter's square, painted on the glass above the rim
  ctx.strokeStyle = "rgba(180, 60, 40, 0.55)";
  ctx.lineWidth = 2;
  ctx.strokeRect(h.boardX + 1, h.rimY - 34, 6, 26);
```

Razonando desde la geometría en lugar de adivinar números: el cuadro va sobre el vidrio (`boardX + 1`, dentro del tablero de 8 de ancho), con su base cerca de la línea del aro (`rimY - 34 + 26 = rimY - 8`), y apagado (alfa `0.55`) para que se lea como pintura. `strokeRect` es el hermano de contorno de `fillRect` - una llamada, sin trazado.

## 3 - Reto: la red parametrizada

```js
  const strands = 7;
  for (let i = 0; i <= strands; i++) {
    const topX = h.rimFrontX + ((h.rimBackX - h.rimFrontX) * i) / strands;
    const botX = h.rimFrontX + inset + ((h.rimBackX - h.rimFrontX - inset * 2) * i) / strands;
    ctx.beginPath();
    ctx.moveTo(topX, h.rimY);
    ctx.lineTo(botX, bottomY);
    ctx.stroke();
  }
```

**Por qué el divisor debe coincidir con la cuenta:** `i / strands` es la *fracción del recorrido* - debe llegar exactamente a `1` cuando `i` alcanza su último valor, para que la hebra final caiga exactamente en el extremo lejano del aro. Deja el divisor en `4` con `strands = 7` y las hebras desfilan más allá del borde del aro hacia el tablero (la fracción llega a 7/4 = 175%). El patrón para recordar: **un bucle que interpola usa la misma N en su cota y en su divisor.** Con `strands` como variable, esa invariante no puede romperse en silencio - que es exactamente la lección de CONFIG del Capítulo 4, aplicada a un bucle.
