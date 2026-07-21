# Capítulo 14 - Soluciones desarrolladas

*Léelo en: [English](README.md) | **Español***

## 1 - Guiado: la clave versionada

Cambia `static #KEY = "freethrow.players.v2"` a `.v3`, recarga: el panel Best marca 0. Tus récords `.v2` siguen en localStorage, intactos y sin leer - huérfanos, no destruidos (revisa DevTools → Application → Local Storage: ahora existen ambas claves).

**Por qué versionar es una ventaja:** la clave nombra no solo *dónde* viven los datos sino *qué forma* tienen. Si una versión cambia la forma de los récords - digamos que `bestSession` se vuelve `{score, date}` - los datos viejos guardados tronarían o corromperían el código nuevo en cuanto `loadAll` los entregue. Subir la versión hace al código nuevo *ciego* a la forma vieja: el peor caso es un arranque limpio desde cero, jamás un crash en la máquina de otra persona.

**Qué hace un producto real con los huérfanos:** una *migración* - al arrancar, si `.v3` está vacía pero `.v2` existe, lee la forma vieja, transfórmala a la nueva, guarda bajo `.v3` (y solo entonces, opcionalmente, borra `.v2`). ¿Dónde viviría eso? Dentro de `PlayerStore` - es la única clase que sabe que existen claves y formas. El patrón escala de esta clase de 30 líneas a migraciones de bases de datos en producción sin cambiar de alma.

## 2 - Independiente: la cuarta verificación

Agregada a `verify-my-game.mjs` (y ejecutada contra el snapshot real - salida `ok`, la línea final se vuelve `4 checks passed`):

```js
// 4. The backboard reflects at exactly boardRestitution
const b2 = new Ball();
b2.x = CONFIG.hoop.boardX - b2.radius + 2;  // overlapping the glass, mid-board
b2.y = (CONFIG.hoop.boardTop + CONFIG.hoop.boardBottom) / 2;
b2.vx = 800;
b2.vy = 0;
h.collide(b2);
assert("backboard reflects at boardRestitution",
       Math.abs(b2.vx + 800 * CONFIG.physics.boardRestitution) < 1e-9);
```

Medido: `vx` regresa exactamente `-480` - `800 × 0.6`, con el signo volteado. Detalles para cotejar contra tu versión: una pelota **fresca** (`b2`) en lugar de reutilizar `b` con velocidad rancia de la verificación 3; posición *traslapando* el tablero (`boardX - radius + 2`) porque `#collideBoard` actúa sobre el traslape, no la cercanía; y la aserción escrita como `vx + 800 × r` (esperando un resultado *negativo*) - si escribiste `vx - ...`, tu verificación fallaría contra código correcto, que es el segundo peor bug de arnés que existe. (El peor es uno que pasa contra código roto. Prueba tus pruebas: rompe el juego a propósito una vez y mira a la verificación atraparlo.)

## 3 - Reto: exportar/importar récords

El par de consola, usable hoy:

```js
// Export: prints (and in DevTools, copies) your records as JSON text
copy(localStorage.getItem("freethrow.players.v2"));

// Import: paste the text between the quotes, run, reload
localStorage.setItem("freethrow.players.v2", '...paste here...');
```

**¿Dónde pertenece?** Arguméntalo con los principios del Capítulo 13 y la respuesta se ordena sola en capas. El *conocimiento* - que existe una clave, cómo se llama, qué forma tiene el valor - pertenece a `PlayerStore` y a nadie más (Responsabilidad Única; cada otra clase es ignorante del almacenamiento a propósito). Así que si esto algún día se vuelve una función real, el store gana dos métodos pequeños:

```js
  /** @returns {string} every player's records as portable JSON */
  exportAll() { return JSON.stringify(this.loadAll()); }

  /** @param {string} json records previously produced by exportAll */
  importAll(json) {
    const all = JSON.parse(json) ?? {};   // malformed input: fail loudly, here
    for (const [name, records] of Object.entries(all)) this.save(name, records);
  }
```

…y el *disparador* (un botón, un menú) pertenece a la capa de UI - una clase de panel nueva o el footer existente - cableada a través de Game como cada otro control (Inversión de Dependencias: el store sigue sin saber que existen los botones). Pero nota la tercera respuesta honesta: para un proyecto personal, **la línea de consola es un producto terminado legítimo.** No toda capacidad merece UI; saber en qué capa se detiene una función también es un juicio de ingeniería - quizá el último del curso.
