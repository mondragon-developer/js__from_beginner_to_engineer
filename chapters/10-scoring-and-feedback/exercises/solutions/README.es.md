# Capítulo 10 — Soluciones desarrolladas

*Léelo en: [English](README.md) | **Español***

Cada solución muestra el cambio exacto contra [`../../snapshot/index.html`](../../snapshot/index.html).

## 1 — Guiado: ¿el `700` debería mudarse a CONFIG?

**El caso a favor de CONFIG:** es un número que ajusta la sensación del juego, como `chargeTime`; un diseñador ajustando la duración del feedback no debería escarbar en `updateFlight`.

**El caso a favor del literal:** se usa exactamente una vez, es puramente visual, y `celebrateUntil = timestamp + 700` se lee perfecto en el punto de uso — moverlo agrega una clave de CONFIG cuyo nombre (¿`celebrationMs`?) es más largo que el hecho que codifica.

**La elección real de la clave de respuestas:** el literal se queda (`this.celebrateUntil = timestamp + 700;`). Cae bajo la regla del curso del Capítulo 4: *los valores usados una vez, puramente visuales, dentro del código que los usa pueden quedarse en línea.* La lección profunda: ambas posturas son defendibles, y una base de código está más sana cuando su regla nombra la excepción que cuando algún bando gana en todas partes. Si algún día aparece un segundo uso de la duración (digamos, un destello del marcador), *ese* es el momento de mudarla a CONFIG — el disparador es la duplicación, no la existencia.

## 2 — Independiente: el panel de Misses

HTML — un tercer panel:

```html
  <div class="panel"><div class="label">Misses</div><div class="value" id="misses">0</div></div>
```

Estado y DOM:

```js
const missesEl = document.getElementById("misses");
```

…más `misses: 0,` dentro del objeto `game`, y una línea en `updateScoreboard`:

```js
  missesEl.textContent = String(game.misses);
```

La única línea correcta — dentro de la rama de asentamiento de `updateFlight`, donde el fallo se vuelve *definitivo*:

```js
  if (shotIsOver()) {
    if (!game.scoredThisShot) {
      game.streak = 0;
      game.misses += 1;
    }
    game.state = "ready";
    updateScoreboard();
  }
```

Por qué ahí y en ningún otro lado: un tiro no es fallo cuando sale de tus manos, ni cuando repiquetea en el aro — es fallo cuando *se asienta sin puntuar*. La prueba `!game.scoredThisShot` al asentarse es la definición exacta, ya escrita; el contador solo se le une. (Ponerlo en `shoot()` cuenta con optimismo; ponerlo en el mundo-else de `isScore` cuenta cada *cuadro* sin canasta — el bug del detector ingenuo con disfraz nuevo.)

## 3 — Reto: detección de SWISH

Tres colocaciones, una línea cada una. La bandera se une al estado del juego:

```js
  scoredThisShot: false,
  touchedIron: false,     // did this shot contact rim or backboard?
```

Se reinicia cuando un tiro comienza — `shoot()` es la única puerta hacia `"flight"`, así que es el único punto de reinicio necesario:

```js
function shoot(vx, vy) {
  ball.vx = vx;
  ball.vy = vy;
  game.state = "flight";
  game.scoredThisShot = false;
  game.touchedIron = false;
}
```

Se enciende en los dos sitios de contacto. En `collideRimPoint`, dentro de la rama de reflexión (un toque es una *reflexión*, no mera cercanía):

```js
  if (approaching < 0) {
    game.touchedIron = true;
```

…y en `collideBoard`, dentro de su `if`:

```js
  if (withinHeight && crossing) {
    game.touchedIron = true;
```

Y el juicio, en la rama de puntuación de `updateFlight`:

```js
  if (!game.scoredThisShot && isScore(previousY)) {
    game.scoredThisShot = true;
    if (!game.touchedIron) console.log("SWISH");
```

La lección de diseño refleja la del capítulo: `touchedIron` es estado que vive exactamente un tiro, así que su ciclo de vida cuelga de las transiciones de la máquina de estados — se reinicia en la puerta de entrada, se lee en el evento de puntuación. Si te dieron ganas de reiniciarla también en la rama de asentamiento de `updateFlight`, nota que es innecesario: el siguiente `shoot()` siempre corre primero. Un punto de reinicio, un punto de lectura, dos puntos de encendido — y cada uno es el *único* lugar correcto para su trabajo.
