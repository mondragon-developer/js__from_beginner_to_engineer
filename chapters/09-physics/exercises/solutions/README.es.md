# Capítulo 9 — Soluciones desarrolladas

*Léelo en: [English](README.md) | **Español***

Cada solución muestra el cambio exacto contra [`../../snapshot/index.html`](../../snapshot/index.html). Todos los números de abajo se midieron corriendo el código real de colisión.

## 1 — Guiado: el aro gordo

Cambia `rimThickness: 5` a `12`.

**Razonando desde `minDist = radius + rimThickness`:** cada labio del aro ahora "alcanza" 29 px (17 + 12) en lugar de 22. Golpear el aro se vuelve *más fácil* — sus círculos de colisión crecieron. Pero los encestes limpios se vuelven **más difíciles**: la abertura entre los labios mide `rimBackX − rimFrontX = 74` px de geometría, y la zona de colisión de cada labio ahora invade 7 px más desde ambos lados. El corredor por el que la pelota puede pasar sin tocar se encogió 14 px — casi un radio de pelota. Un número de CONFIG, dos efectos opuestos; esta tensión (contacto perdonador contra puntuación estricta) es exactamente lo que el valor real `5` equilibra. Acuérdate de regresarlo.

## 2 — Independiente: el techo suave

En CONFIG.physics:

```js
    ceilingRestitution: 0.2, // the ceiling absorbs almost everything
```

En `collideBounds`, solo la sección del techo:

```js
  // Ceiling: mirror the vertical velocity (soft — it eats the bounce)
  if (ball.y - r < 0) {
    ball.y = r;
    ball.vy = -ball.vy * CONFIG.physics.ceilingRestitution;
  }
```

La sensación: un tiro vertical a máxima potencia antes regresaba *aullando* después del rebote en el techo (sobrevive el 60%); ahora muere allá arriba y cae casi sin fuerza (20%). Dos notas de ingeniería. Primera: ya no reutilices el atajo `wall` para el techo — ese `const wall` local ahora sirve solo a las dos paredes laterales, y el código lo dice. Segunda: nota lo barato que salió este experimento: una clave de CONFIG, una línea — esa es la recompensa de la arquitectura del Capítulo 4, seis capítulos después.

## 3 — Reto: midiendo el aro

Instrumentación temporal dentro de `collideRimPoint`, envolviendo la reflexión:

```js
  const approaching = ball.vx * nx + ball.vy * ny;
  if (approaching < 0) {
    const before = ballSpeed();
    const r = CONFIG.physics.rimRestitution;
    ball.vx -= (1 + r) * approaching * nx;
    ball.vy -= (1 + r) * approaching * ny;
    console.log("rim hit:", Math.round(before), "->", Math.round(ballSpeed()),
                "(" + Math.round(ballSpeed() / before * 100) + "%)");
  }
```

**Resultados medidos** (corriendo este código exacto):

- Golpe frontal (velocidad directo a lo largo de la normal): `400 → 260` — exactamente **65%**, el valor de `rimRestitution`, verificando que la constante hace lo que su nombre promete.
- Golpe rasante (velocidad en ángulo, p. ej. 300 a lo ancho / 400 hacia abajo): `500 → 445` — sobrevive el **89%**.

**Por qué los golpes rasantes conservan más:** la fórmula amortigua solo la *componente normal* — la parte de la velocidad que apunta hacia el aro. La parte *tangencial* (deslizándose a lo largo de la superficie) pasa intacta. Un golpe frontal es 100% componente normal, así que siente el 0.65 completo; un golpe de refilón invierte solo una fracción de su rapidez en la colisión y conserva el resto. Por eso rozar el aro apenas frena la pelota mientras que un clang de hierro frontal la mata — una fórmula, comportamiento físicamente creíble gratis.

**Luego borra la instrumentación.** Eso es parte del ejercicio: mide, aprende, elimina. Los `console.log` temporales que sobreviven a su pregunta se vuelven ruido que esconde la respuesta de la siguiente — y los snapshots de este curso cargan cero código muerto. (El Capítulo 14 muestra la versión adulta de este instinto: aserciones que corren *fuera* del juego, en un arnés, para siempre.)
