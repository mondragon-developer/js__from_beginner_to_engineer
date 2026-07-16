# Capítulo 8 — Soluciones desarrolladas

*Léelo en: [English](README.md) | **Español***

Cada solución muestra el cambio exacto contra [`../../snapshot/index.html`](../../snapshot/index.html).

## 1 — Guiado: la línea de puntería

Una función de dibujo nueva:

```js
/** Faint line from the ball to the pointer while aiming. */
function drawAimLine() {
  ctx.strokeStyle = "rgba(242,234,216,0.25)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(ball.x, ball.y);
  ctx.lineTo(input.aimX, input.aimY);
  ctx.stroke();
}
```

Y en `frame`:

```js
  if (input.isCharging) {
    drawAimLine();
    drawTrajectoryPreview();
    drawPowerBar(power());
  }
```

**Dónde y por qué:** dentro del bloque `if (input.isCharging)` porque `aimX`/`aimY` solo significan algo durante una retención — afuera son sobras rancias del último gesto. Y *primero* en el bloque, para que los puntos de la vista previa se dibujen encima de la línea y no debajo (el algoritmo del pintor, todavía ganándose el pan).

## 2 — Independiente: la potencia como texto

```js
/**
 * Print the charge percentage beside the gauge.
 * @param {number} charge 0..1 charge fraction
 */
function drawPowerText(charge) {
  ctx.fillStyle = "rgba(242,234,216,0.8)";
  ctx.font = "14px monospace";
  ctx.fillText(Math.round(charge * 100) + "%", CONFIG.powerBar.x, CONFIG.powerBar.top - 10);
}
```

Llamada junto a su hermana:

```js
    drawPowerBar(power());
    drawPowerText(power());
```

Detalles que importan: `Math.round` porque `47.99999%` rompe la ilusión; posicionada desde `CONFIG.powerBar` para que mover la barra en CONFIG mueva la etiqueta con ella (nunca dejes que dos cosas relacionadas se posicionen con números no relacionados); monospace para que la etiqueta no tiemble cuando los dígitos cambian de ancho.

## 3 — Reto: el punto dulce

```js
/** Finish the hold: fire the charged shot if the aim has a direction. */
function onPointerUp() {
  if (!input.isCharging) return;
  const released = power();
  if (released >= 0.78 && released <= 0.86) console.log("PERFECT");
  const shot = launchVelocity();
  input.isCharging = false;
  if (shot !== null) launchBall(shot.vx, shot.vy);
}
```

**Por qué `onPointerUp` y no `power()`:** `power()` es un *reportero* — responde "¿cuánta carga, ahora mismo?" y la llaman en cada cuadro la barra, la vista previa y la regla de lanzamiento. Pon la revisión del punto dulce adentro y "PERFECT" se imprime sesenta veces por segundo a media retención. `onPointerUp` es un *decisor* — corre exactamente una vez, en el momento en que el jugador se compromete. Las reglas sobre *el momento de soltar* pertenecen al código que maneja la soltada. Mantener puros a los reporteros (sin efectos secundarios, misma respuesta para el mismo instante) y dejar que los decisores decidan es una división que reencontrarás en el Capítulo 13 como el Principio de Responsabilidad Única.

Nota la línea `const released = power();`: leemos la potencia **una vez** y reutilizamos el valor. Llamar `power()` dos veces (una para la revisión, otra dentro de `launchVelocity`) leería el reloj en dos instantes ligeramente distintos — inofensivo aquí, pero el hábito de "captura un valor cambiante una vez, y razona sobre la copia" previene bugs reales en código concurrente más adelante en tu carrera.
