# Capítulo 6 — Soluciones desarrolladas

*Léelo en: [English](README.md) | **Español***

De este capítulo en adelante, los ejercicios modifican solo unas cuantas líneas del snapshot, así que cada solución muestra el cambio exacto contra [`../../snapshot/index.html`](../../snapshot/index.html) más el razonamiento. Cada bloque de código de abajo se ejecutó contra la física real; los números citados son mediciones.

## 1 — Guiado: caída desde lo más alto

Cambia solo el estado inicial de la pelota:

```js
const ball = {
  x: CONFIG.ball.startX,
  y: 20,    // was 80 — now falling from just under the ceiling
  vx: 0,    // was 120 — no drift, a pure vertical drop
  vy: 0,
  radius: CONFIG.ball.radius
};
```

**Resultado medido: siguen siendo cuatro rebotes visibles** (la caída desde y = 80 también daba cuatro), llegando al reposo en 2.3 segundos, exactamente en x = 180 porque nada la empuja de lado.

¿Por qué más altura no compra más rebotes? La restitución es *multiplicativa*: cada rebote conserva el 55% de la rapidez del impacto. Caer desde 4× más alto solo sube la rapidez de impacto 2× (la rapidez crece con la *raíz cuadrada* de la altura), y un solo rebote se come ese factor de dos: `0.55 × 2 ≈ 1.1`. El decaimiento geométrico aplana casi cualquier ventaja inicial — una lección que regresa en el Capítulo 14 cuando hablemos de por qué la pelota se asienta tan predeciblemente.

## 2 — Independiente: entrar por arriba a la derecha, moviéndose a la izquierda

```js
const ball = {
  x: 840,     // near the right edge
  y: 60,      // high, so there's a real fall
  vx: -140,   // negative vx = moving LEFT
  vy: 0,
  radius: CONFIG.ball.radius
};
```

Qué cambió: `x` (arranca a la derecha), `vx` (negativo — izquierda es x negativa, la misma regla de ejes de siempre). Qué se quedó igual: `vy: 0` (la soltamos, no la lanzamos hacia abajo) y `radius`.

**Resultado medido:** cuatro rebotes, en reposo a los 3.6 segundos en x ≈ 457 — bien adentro del cuadro. Una advertencia honesta: haz `vx` mucho más fuerte (digamos −200, sin paredes) y la pelota *rueda hacia afuera por el borde izquierdo y sigue para siempre*, porque nada la detiene — los lados del mundo siguen abiertos. Que es exactamente la razón de que exista el ejercicio 3.

## 3 — Reto: `collideWalls`

El patrón del piso — *sacar del objeto, voltear y amortiguar* — rotado al eje x, en ambos bordes:

```js
/** Keep the ball between the side walls: snap out, flip and dampen vx. */
function collideWalls() {
  const r = ball.radius;

  // Left wall
  if (ball.x - r < 0) {
    ball.x = r;
    ball.vx = -ball.vx * CONFIG.physics.floorRestitution;
  }

  // Right wall: same rule on the far side
  if (ball.x + r > CONFIG.world.width) {
    ball.x = CONFIG.world.width - r;
    ball.vx = -ball.vx * CONFIG.physics.floorRestitution;
  }
}
```

Y en `frame`, un eslabón nuevo en la cadena:

```js
  integrateBall(dt);
  collideFloor();
  collideWalls();
```

Notas para cuando llegues al Capítulo 9: el juego real les da a las paredes su propio rebote (`CONFIG.physics.wallRestitution: 0.6`) en lugar de prestarse el del piso, agrega el techo con el mismo patrón rotado una vez más, y endurece un poco el volteo de velocidad para un caso borde sutil. Tu versión de aquí es genuinamente correcta para lo que el Capítulo 6 sabe — compara las dos cuando llegues y verás que el *patrón* sobrevivió intacto.
