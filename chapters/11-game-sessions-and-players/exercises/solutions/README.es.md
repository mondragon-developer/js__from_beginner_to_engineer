# Capítulo 11 - Soluciones desarrolladas

*Léelo en: [English](README.md) | **Español***

Cada solución muestra el cambio exacto contra [`../../snapshot/index.html`](../../snapshot/index.html).

## 1 - Guiado: "Last shot!"

El mensaje pertenece al *momento en que cambia el conteo de tiros* - eso es `shoot`:

```js
function shoot(vx, vy) {
  ball.vx = vx;
  ball.vy = vy;
  game.state = "flight";
  game.scoredThisShot = false;
  game.session.shotsLeft -= 1;
  if (game.session.shotsLeft === 1) setStatus("Last shot!");
  commit();
}
```

¿Por qué no `updateFlight`? Su rama de asentamiento corre cuando un tiro *termina* - anunciar "Last shot!" ahí etiqueta el momento en que ya estás viendo el resultado del noveno, y se lee un compás tarde. La línea del decremento es el único lugar donde `shotsLeft` cambia, así que la regla sobre su valor vive junto a ella. Una arruga que descubrirías jugando: el mensaje permanece durante el vuelo del último tiro - agradable, de hecho, y el estado de `endSession` lo sobrescribe exactamente en el momento correcto. (Si te molestara, un `setStatus("")` en el `else` de la rama de asentamiento lo limpia - una variación defendible.)

## 2 - Independiente: precisión en la línea de resultados

En `endSession`:

```js
  const taken = CONFIG.session.shotLimit - game.session.shotsLeft;
  const accuracy = Math.round((made / taken) * 100);
  setStatus(
    `${game.playerName}: ${made} of ${limit} made (${accuracy}%)` +
```

**¿El límite siempre es correcto aquí?** En *este* juego - sí, y vale la pena demostrártelo: `endSession` se llama desde exactamente un lugar, la rama `shotsLeft === 0` de `updateFlight`, así que `taken` siempre es igual a `limit` y dividir entre cualquiera funciona. ¿Entonces por qué escribir `taken`? Porque la igualdad es una *coincidencia del grafo de llamadas actual*, no una regla que alguien declaró. El botón de Nueva sesión ya deja al jugador abandonar una sesión antes de tiempo - si una función futura también termina sesiones temprano (un modo con cronómetro, digamos), `made / limit` sub-reporta la precisión en silencio, mientras que `made / taken` sigue correcto. Divide entre lo que *quieres decir*. (Y nota que `taken` nunca puede ser 0 aquí: llegar a `endSession` requiere diez decrementos.)

## 3 - Reto: Borrar jugador

HTML - un segundo botón en la fila de jugadores:

```html
  <button id="deletePlayerButton" type="button">Delete</button>
```

La función:

```js
/** Remove the selected player; the game guarantees one always remains. */
function deletePlayer() {
  if (playerSelect.options.length <= 1) return; // never delete the last player
  const name = playerSelect.value;
  delete allPlayers[name];
  const doomed = [...playerSelect.options].find((o) => o.value === name);
  doomed.remove();
  switchPlayer(playerSelect.options[0].value);
}
```

Cableado en el Boot: `document.getElementById("deletePlayerButton").addEventListener("click", deletePlayer);`

**Los dos órdenes, y cuál truena:** debes capturar `name` y quitar la entrada *antes* de llamar `switchPlayer` - pero la trampa sutil está en la otra dirección. Supón que escribieras `switchPlayer(playerSelect.options[0].value)` *primero* y borraras después: si el condenado *era* la opción 0, cambiarías a él, y luego borrarías el objeto de récords que el juego sostiene activamente - `commit()` lo resucitaría en silencio con la siguiente canasta. Jugadores fantasma. El orden de arriba - guarda, captura, borrar datos, borrar DOM, luego cambiar - toca al condenado al final como pura historia. (`find` es hermano de `some`: devuelve el primer *elemento* que pasa, no solo true/false; y `option.remove()` es el borrado propio del DOM.)

La guarda `length <= 1` refleja la garantía del boot del juego terminado (`if (names.length === 0) names.push("Player 1")`): la invariante "siempre hay al menos un jugador" se hace cumplir en cada puerta que podría romperla.
