# Capítulo 14 — Persistencia, Verificación y Publicación

*Léelo en: [English](README.md) | **Español***

El último capítulo, en tres actos. **Recordar:** `PlayerStore` le da al juego una memoria que sobrevive al cierre del navegador — y entrega el momento Liskov que el Capítulo 13 prometió. **Verificar:** construyes un pequeño arnés de verificación propio, la versión adulta de cada punto de control de este curso. **Publicar:** el juego sale a una URL pública que puedes mandarle a cualquier persona de la Tierra. Cuando termines, tu archivo y la clave de respuestas congelada son *el mismo archivo* — y eso también lo demostraremos.

**Tiempo**: ~1.5 horas, más el minuto en que solo te quedas mirando tu URL en vivo.

## Lo que vas a construir en este capítulo

La octava y última clase, un `verify-my-game.mjs` ejecutable, y un despliegue. Resultados visibles esperados, en orden: tus récords sobreviven una recarga; una terminal dice que tu juego está verificado; un navegador en cualquier parte del mundo juega tu juego.

## Conceptos nuevos

- **`localStorage`** — un pequeño almacén clave-valor que el navegador guarda por sitio
- **JSON** — objetos como texto (`stringify`) y de regreso (`parse`)
- **`try` / `catch`** — código al que se le permite fallar
- **degradación elegante** — perder una función en lugar de tronar
- **L — Sustitución de Liskov** — el momento prometido
- **`static`** — un valor en la clase misma, no en las instancias
- **desplegar** — GitHub Pages, paso a paso

## Acto I — Recordar: `PlayerStore`

### Paso 1 — La clase

```js
/* =====================================================================
 * PlayerStore — saves and loads each player's records. It uses the
 * browser's localStorage when available and falls back to in-memory
 * data when storage is blocked, so the game never crashes (Liskov:
 * both modes honor the exact same load/save contract).
 * ===================================================================== */
class PlayerStore {
  static #KEY = "freethrow.players.v2";

  constructor() {
    this.memory = {};                       // fallback when storage is blocked
    this.persistent = this.#storageWorks();
  }

  /** @returns {boolean} true when localStorage accepts writes */
  #storageWorks() {
    try {
      localStorage.setItem("__probe", "1");
      localStorage.removeItem("__probe");
      return true;
    } catch {
      return false;
    }
  }

  /** @returns {Object.<string, {bestStreak:number, bestSession:number}>} */
  loadAll() {
    if (!this.persistent) return this.memory;
    try {
      return JSON.parse(localStorage.getItem(PlayerStore.#KEY)) ?? {};
    } catch {
      return {};
    }
  }

  /**
   * Save one player's records (creating the player if new).
   * @param {string} name
   * @param {{bestStreak:number, bestSession:number}} records
   */
  save(name, records) {
    const all = this.loadAll();
    all[name] = records;
    if (this.persistent) {
      localStorage.setItem(PlayerStore.#KEY, JSON.stringify(all));
    } else {
      this.memory = all;
    }
  }
}
```

De arriba a abajo. `localStorage` guarda solo *strings*, por sitio, sobreviviendo recargas y reinicios — así que **JSON** hace la traducción: `JSON.stringify(all)` convierte el objeto de récords en texto, `JSON.parse(...)` lo regresa (verificamos que el viaje redondo preserva cada valor). `static #KEY` pone la clave de almacenamiento en la *clase* — todos los stores comparten un nombre, y versionarlo (`.v2`) es un hábito que el ejercicio de abajo explora. Y los dos bloques `try/catch` son el alma del capítulo:

> [!NOTE]
> **`try/catch` — código al que se le permite fallar.** Todo lo que está en `try` corre normal; si alguna línea *lanza* un error, la ejecución salta al `catch` en lugar de tronar el programa. No es para bugs (esos se arreglan) — es para el **fallo ambiental honesto**: cosas que legítimamente pueden salir mal en la máquina de otra persona, en el navegador de otra persona, con la configuración de otra persona. El almacenamiento es el caso clásico, lo que nos lleva a…

> [!WARNING]
> **Error clásico: asumir que localStorage funciona.** En ventanas privadas/incógnito de algunos navegadores, bajo configuraciones estrictas de privacidad, en algunos webviews embebidos — e históricamente para páginas `file://` en varios navegadores — tocar `localStorage` **lanza un `SecurityError`**. Si tu primera línea de almacenamiento corre desprotegida al arrancar, tu juego truena *solo para esos usuarios*, y jamás lo reproducirás en tu máquina. `#storageWorks` es la defensa: una escritura de sondeo dentro de un `try`, una vez, al construir — y de ahí en adelante el store *sabe* en qué mundo vive. Nunca asumas el entorno; pregúntale.

> [!WARNING]
> **Error real: el día en que la clave no existe.** La primerísima vez que alguien juega, no hay nada guardado, y `localStorage.getItem(...)` devuelve `null`. Medimos lo que sigue: `JSON.parse(null)` **no lanza error — devuelve `null`** — y luego ese `null` fluye río abajo hasta que algo hace `Object.keys(null)` y muere lejos de la causa. El `?? {}` convierte "nada todavía" en "colección vacía", la respuesta honesta (el operador del Capítulo 11, cumpliendo su promesa). El `try/catch` alrededor guarda la *otra* sorpresa del primer día: un valor corrupto o editado a mano — medimos `JSON.parse("")` lanzando `SyntaxError: Unexpected end of JSON input`. Faltante y malformado son fallos distintos; este método maneja ambos en cuatro líneas.

### Paso 2 — El cambio, y el momento Liskov

En `Game`, borra el bloque `this.savedPlayers = {}` y su comentario; en su lugar:

```js
    this.store = new PlayerStore();
```

Constructor: `const names = Object.keys(this.store.loadAll());` (la línea de garantía se queda). `#switchPlayer`: lee `this.store.loadAll()[name] ?? {...}`, luego `this.store.save(name, this.records)`. `#commit`: `this.store.save(this.playerName, this.records)`. Ese es el diff completo — tres puntos de llamada.

> [!NOTE]
> **L — Sustitución de Liskov, entregada.** Mira lo que el Game sabe del almacenamiento: dos verbos, `loadAll()` y `save(name, records)`. Ahora mira adentro del store: *dos implementaciones completas* — persistente y en memoria — elegidas en tiempo de ejecución por el sondeo. Cuando el almacenamiento está bloqueado, cada `loadAll`/`save` usa `this.memory` en silencio, honrando exactamente el mismo contrato con exactamente las mismas formas. El Game **no puede distinguir en qué modo corre** — y ese es el principio: todo lo que afirme un contrato debe ser sustituible donde el contrato se espere, sin sorpresas. El arnés lo exige mecánicamente: construye un store con almacenamiento funcional y otro con un localStorage que *lanza errores*, y afirma que ambos honran el contrato idéntico de guardar/cargar. El objeto `savedPlayers` en memoria del Capítulo 13 no era un relleno — era uno de los dos gemelos Liskov, esperando a su hermano.

**Punto de control:** juega una sesión, marca un Best, y **recarga la página**. El número que se esfumaba al final del Capítulo 11 sigue ahí. Abre DevTools → Application → Local Storage y mira `freethrow.players.v2`: tus récords, como JSON, en la bóveda propia del navegador.

## Acto II — Verificar: construye tu propio arnés

Todo este curso, un arnés estuvo revisando cada snapshot tras bambalinas (está en [`verify/verify.mjs`](../../verify/verify.mjs) — 1,000 líneas; léelo algún día). Aquí está el primero tuyo — pequeño, real y ejecutable. Guárdalo como `verify-my-game.mjs` junto a tu `index.html`:

```js
// verify-my-game.mjs — a beginner's verification harness (Chapter 14).
// Run with:  node verify-my-game.mjs
import { readFileSync } from "node:fs";

const html = readFileSync("index.html", "utf8");
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const body = script.slice(0, script.indexOf("/* ---------- Boot ----------"));

// Evaluate the game's definitions (never its boot), then export
// the pieces we want to test onto globalThis.
(0, eval)(body + "\n;globalThis.T = { CONFIG, Ball, Hoop };");
const { CONFIG, Ball, Hoop } = globalThis.T;

let passed = 0;
function assert(name, cond) {
  if (!cond) {
    console.error("FAIL:", name);
    process.exit(1);
  }
  console.log("ok:", name);
  passed += 1;
}

// 1. Gravity pulls down (canvas y grows downward)
const b = new Ball();
b.integrate(1 / 60);
assert("gravity pulls the ball down", b.vy > 0);

// 2. The rim pushes back, keeping exactly rimRestitution of the speed
const h = new Hoop();
b.x = CONFIG.hoop.rimFrontX - 15;
b.y = CONFIG.hoop.rimY;
b.vx = 400;
b.vy = 0;
h.collide(b);
assert("rim deflects at rimRestitution", Math.abs(b.vx + 400 * CONFIG.physics.rimRestitution) < 1e-9);

// 3. A clean downward crossing inside the opening scores
b.x = (CONFIG.hoop.rimFrontX + CONFIG.hoop.rimBackX) / 2;
b.y = CONFIG.hoop.rimY + 5;
b.vy = 300;
assert("a downward crossing scores", h.isScore(b, CONFIG.hoop.rimY - 5) === true);

console.log(`\n${passed} checks passed — your game is verified.`);
```

Esto necesita **Node.js v24.11.1** (la única herramienta fijada del curso más allá del navegador — instálalo de [nodejs.org](https://nodejs.org) si no lo tienes). Corre `node verify-my-game.mjs`. Salida real, de este snapshot exacto:

```
ok: gravity pulls the ball down
ok: rim deflects at rimRestitution
ok: a downward crossing scores

3 checks passed — your game is verified.
```

Lee lo que hace, porque la técnica es el botín: carga tu propio juego *como texto*, córtalo en la línea Boot (definiciones sin encendido — la estructura que has mantenido desde el Capítulo 6 existe *para este momento*), evalúa el plano, e interrógalo con hechos que deben ser ciertos. Sin navegador, sin clics, en milisegundos, automatizable. Cambia `gravity` a `-1800` y córrelo: tu arnés atrapa en un segundo lo que tus ojos podrían no ver en una sesión entera. Así es como el curso te cumplió su primera promesa, y ahora es tuya para cumplírsela a otros.

## Acto III — Publicar

Tu juego es un archivo autocontenido — el despliegue más fácil del software. GitHub Pages, paso a paso:

1. Crea una **cuenta de GitHub** (gratis) en [github.com](https://github.com) si no tienes.
2. Clic en **+ → New repository**. Nómbralo `basketball-js` (cualquier nombre sirve). Público. Create.
3. En la página del repo nuevo: **uploading an existing file** → arrastra tu `index.html` (y `verify-my-game.mjs` — publica tus pruebas). **Commit changes.**
4. **Settings → Pages** (barra lateral izquierda) → bajo *Branch* elige `main` y `/ (root)` → **Save**.
5. Espera un minuto o dos, refresca: Pages muestra **"Your site is live at `https://TUNOMBRE.github.io/basketball-js/`"**.

Ábrelo. En tu teléfono también — los Pointer Events y el escalado CSS del Capítulo 8 se construyeron para este momento.

> [!WARNING]
> **Error clásico: el 404 que no está roto.** Si tu archivo se llama cualquier otra cosa — `game.html`, `basketball.html`, `Index.html` en un host sensible a mayúsculas — la URL de arriba responde **404**. GitHub Pages (como casi todo host estático) sirve exactamente un nombre de archivo por defecto por carpeta: **`index.html`**, en minúsculas. Toda la maquinaria del "sitio" funciona; solo no encuentra su puerta principal. Renombra, haz commit, espera un minuto.

**Punto de control — el último cambio visible del curso, y el más grande:** tu juego, en una URL pública, jugable por cualquiera. Mándaselo a alguien. Míralo sostener, apuntar, soltar.

### La prueba final

Una última medición, en el espíritu de cada capítulo anterior. Compara tu archivo terminado contra la clave de respuestas congelada del curso:

```
git diff --no-index snapshot/index.html ../../answer-key/basketball-js.html
```

Silencio. **Idéntico byte a byte** — lo verificamos durante la producción (`byte-identical: True`). Hace catorce capítulos este archivo no existía; ahora *es* el juego certificado, y cada línea del camino intermedio está en tus manos y en la historia de este repo.

## Por qué lo hicimos así

`PlayerStore` cierra el ciclo que el curso abrió en el Capítulo 4: CONFIG enseñó que los hechos deben tener un solo hogar; el store enseña que los *efectos* también. Cada otra clase correría igual en un navegador de 1999 o en un arnés de la nada — solo PlayerStore toca la realidad de la máquina, así que solo PlayerStore necesita la armadura (`try/catch`, el sondeo, las implementaciones gemelas). Concentrar tu riesgo ambiental en una clase pequeña que honra contratos es el patrón detrás de cada capa de base de datos y cliente de API que llegarás a conocer. Y el orden arnés-luego-publicar es deliberado: **verificado, luego público** — la secuencia profesional, a toda escala, desde este curso hasta el software que aterriza aviones.

## Rincón de experimentos

1. DevTools → Application → Local Storage → clic derecho en `freethrow.players.v2` → Delete, y recarga. Juego fresco, sin crash — la lógica del primer día (`?? {}`) manejando "nada todavía" como prometió.
2. Edita el JSON guardado *a mano* en DevTools hacia algo roto (`{oops`), recarga. El juego arranca limpio — el `catch` de `loadAll` se comió tu vandalismo. Degradación elegante, sentida.
3. Bloquea el almacenamiento por completo (configuración del sitio → Cookies y datos → No permitir) y juega. Los récords funcionan — hasta recargar, cuando se van. Ese es el gemelo en memoria cumpliendo su deber Liskov. Desbloquea; la permanencia regresa.

## Ejercicios

Las soluciones desarrolladas están en [`exercises/solutions/`](exercises/solutions/).

1. **Guiado** — la clave dice `.v2`. Cámbiala a `.v3` y recarga: tus récords "desaparecen" (los datos de la clave vieja siguen en el almacenamiento, huérfanos). Explica en dos oraciones por qué versionar la clave es una *ventaja* cuando la forma de los récords cambia entre versiones — y qué haría un producto real con los datos huérfanos de `.v2`.
2. **Independiente** — agrega una cuarta verificación a tu `verify-my-game.mjs`: el tablero refleja una pelota de 800 px/s exactamente a `boardRestitution`. Tienes todas las herramientas; iguala los números del arnés del curso.
3. **Reto** — exportación de récords: una línea ejecutable en consola (o una función pequeña) que imprima el valor actual de `freethrow.players.v2` para que un jugador lo copie, más su gemela de importación. ¿Dónde *pertenece* esta funcionalidad — PlayerStore, Game, o la consola? Argumenta desde los principios del Capítulo 13.

## Vocabulario

| English | Español |
|---|---|
| persistence | persistencia |
| storage | almacenamiento |
| serialize / parse | serializar / interpretar |
| graceful degradation | degradación elegante |
| substitution | sustitución |
| deploy / ship | desplegar / publicar |
| repository | repositorio |

## Lo que construiste

Hace catorce capítulos: una carpeta vacía y un navegador. Ahora: un juego con física que entiendes *línea por línea* — cada constante, cada colisión, cada clase — verificado por un arnés que puedes leer y extender, en vivo en una URL con tu nombre. En el camino, sin un solo sermón: nomenclatura, CONFIG, JSDoc, máquinas de estados, detección de flancos, defensa en profundidad, SOLID, degradación elegante, y el hábito de demostrar en lugar de esperar con fe.

Si este curso te ayudó, una ⭐ en el repo ayuda a que el siguiente estudiante lo encuentre. Y si quieres sentir que el suelo se mueve: el [curso hermano de Rust](https://github.com/mondragon-developer/rust_bevy_from_beginner_to_engineer) construye este *mismo juego* donde cada uno de estos conceptos viste otro cuerpo. Dos lenguajes, un juego, un ingeniero — tú.

**[De regreso al inicio del curso →](../../README.es.md)**
