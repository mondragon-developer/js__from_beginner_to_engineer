# Capítulo 1 - Tu Kit de Herramientas

*Léelo en: [English](README.md) | **Español***

Todo curso de programación tiene un capítulo de instalación. En el curso hermano de Rust es el capítulo más largo y traicionero de la Parte I - un compilador, herramientas de build, un target de WebAssembly, un bundler, ~10 GB y cuatro versiones fijadas. Este es el mismo capítulo para JavaScript, y cabe en una página. No es porque hayamos saltado algo. Es porque **el navegador que ya tienes es el motor**: lee el código fuente de JavaScript directamente y lo ejecuta. Hoy instalas un editor, agregas una extensión, y conoces la consola - la herramienta de depuración que usarás en cada capítulo de aquí en adelante.

**Tiempo**: ~20 minutos, la mayoría en una descarga.

## Lo que vas a montar en este capítulo

- **Visual Studio Code** - el editor
- **Live Server** - una extensión de VS Code que refresca el navegador cada vez que guardas
- **La consola de DevTools** - la ventana integrada del navegador hacia tu código en ejecución

Estado final esperado: escribes una línea de JavaScript en la consola y el navegador te responde. Habrás ejecutado código antes de que el Capítulo 2 siquiera empiece.

## Constrúyelo, paso a paso

### Paso 1 - Instala Visual Studio Code

Descárgalo de [code.visualstudio.com](https://code.visualstudio.com/) y corre el instalador con sus opciones por defecto. Las versiones de Windows, macOS y Linux funcionan idéntico para este curso.

Este curso se produjo con **VS Code 1.128.0**, pero el editor es la única herramienta donde mantenerse al día es seguro - nada del curso depende de la versión del editor.

> [!TIP]
> Durante la instalación en Windows, marca **"Agregar la acción 'Abrir con Code' al menú contextual de archivos del Explorador de Windows"**. Clic derecho a una carpeta → *Abrir con Code* es la forma más rápida de ponerse a trabajar, y este curso lo hace constantemente.

### Paso 2 - Instala la extensión Live Server

1. Abre VS Code.
2. Haz clic en el ícono de **Extensiones** en la barra lateral izquierda (cuatro cuadros, uno separándose) - o presiona `Ctrl+Shift+X`.
3. Busca **Live Server** de *Ritwick Dey* (este curso usó la versión **5.7.10**).
4. Haz clic en **Install**.

**Punto de control:** aparece un botón **"Go Live"** en el extremo derecho de la barra de estado inferior de VS Code. Si aún no lo ves, aparece cuando haya una carpeta abierta - siguiente paso.

> [!NOTE]
> **¿Qué es un "servidor", y por qué lo queremos "live"?** Cuando visitas un sitio web, un *servidor* es la computadora que envía los archivos de la página a tu navegador. Live Server corre un servidor diminuto en *tu propia máquina* - por eso la dirección empieza con `127.0.0.1`, el número universal para "esta computadora" (su apodo es `localhost`). Podríamos saltarnos todo esto y darle doble clic a nuestros archivos HTML, pero Live Server nos da dos regalos: la página **se recarga sola cada vez que guardas** (sentirás la diferencia en minutos), y las páginas servidas desde `http://` se comportan *exactamente* como la web real y publicada - un detalle que importará en silencio en el Capítulo 14, cuando el juego empiece a guardar los récords de los jugadores.

### Paso 3 - Crea la carpeta del curso y ábrela

1. Crea una carpeta para tu trabajo - por ejemplo `basketball-js` en tus Documentos.
2. En VS Code: **File → Open Folder…** y elígela.

> [!WARNING]
> **Error real: abrir un *archivo* en lugar de la *carpeta*.** Si usas *File → Open File* para abrir un archivo HTML suelto, el botón Go Live no aparece o sirve desde el lugar equivocado - y los capítulos posteriores (que agregan medios y varios archivos) se rompen de formas confusas. Esto costó una sesión real de depuración durante la producción. El hábito que lo previene: **siempre abre la carpeta**, y crea los archivos adentro desde el panel Explorer de VS Code. La carpeta es el proyecto; los archivos viven adentro.

### Paso 4 - Prueba Go Live

1. En el Explorer de VS Code, crea un archivo llamado `index.html` (clic en el ícono *New File*, escribe el nombre).
2. Escribe solo esta línea y guarda (`Ctrl+S`):

```html
<h1>Toolkit ready</h1>
```

3. Haz clic en **Go Live** en la barra de estado.

**Punto de control:** tu navegador abre `http://127.0.0.1:5500/` y muestra **Toolkit ready** en letras grandes. Ahora cambia el texto, guarda, y mira cómo el navegador se refresca solo. Ese ciclo - editar, guardar, ver - es el latido del curso.

### Paso 5 - Conoce la consola

Con el navegador abierto, presiona **F12** (o `Ctrl+Shift+J` en Windows/Linux, `Cmd+Option+J` en macOS) y haz clic en la pestaña **Console**.

La consola es una conversación directa con el motor de JavaScript. Escribe cada una de estas líneas y presiona Enter:

```js
2 + 2
```

```js
"basketball".toUpperCase()
```

```js
920 / 2
```

**Punto de control:** el navegador responde cada línea - `4`, `"BASKETBALL"`, `460`. Estás ejecutando JavaScript. Sin compilador, sin build - el motor estuvo aquí todo el tiempo, esperando.

> [!TIP]
> Mantén DevTools abierto **durante todo el curso** - acoplado al lado derecho del navegador es lo ideal (menú de tres puntos dentro de DevTools → Dock side). Cada error que el juego llegue a lanzar aparecerá ahí, en rojo, con el número de línea que lo causó.

## Por qué lo hicimos así

El kit de un profesional se gana su lugar acortando el ciclo entre *hacer un cambio* y *ver su efecto*. Esa es toda la filosofía de este montaje: Live Server reduce "¿funcionó mi cambio?" a una tecla (`Ctrl+S`), y la consola muestra las respuestas y errores del motor al instante. Fíjate en lo que *no* instalamos: ni framework, ni bundler, ni paquetes. Cada herramienta que te saltaste es una herramienta que no puede romperse, desactualizarse, ni distraerte mientras aprendes el lenguaje de verdad.

## Rincón de experimentos

1. En la consola, prueba `"basketball".length` - las cadenas de texto conocen su propia longitud. Predice el número primero, luego verifica.
2. Prueba `10 / 3` y luego `"10" / "3"` - ¿la segunda *también* responde `3.333…`? JavaScript convirtió los textos a números en silencio. Sorpresas como esta son la razón de que el Capítulo 4 sea estricto con los tipos.
3. Rompe algo a propósito: escribe `2 +` y presiona Enter. Lee el `SyntaxError` rojo con calma, de arriba a abajo. Los errores son el motor diciéndote exactamente dónde se confundió - del Capítulo 2 en adelante, son tus aliados.

## Ejercicios

1. **Guiado** - usa la consola para calcular cuántos segundos tiene una semana: `60 * 60 * 24 * 7`. Verifica que obtienes `604800`.
2. **Independiente** - nuestro canvas medirá 920 píxeles de ancho y 540 de alto. Usa la consola para hallar su cantidad total de píxeles, y su proporción ancho-alto.
3. **Reto** - escribe `"920" + "540"` en la consola. Explica el resultado en una oración antes de leer la respuesta.

<details>
<summary>Soluciones desarrolladas</summary>

1. `60 * 60 * 24 * 7` → `604800`. (60 segundos × 60 minutos × 24 horas × 7 días.)
2. `920 * 540` → `496800` píxeles. `920 / 540` → `1.7037…` - cerca del 16:9 de una pantalla de TV.
3. `"920" + "540"` → `"920540"`. Con comillas, eso son *textos*, no números - y `+` pega los textos en lugar de sumarlos. El mismo símbolo hace dos trabajos; cuál de los dos depende de los tipos. El Capítulo 4 lo hace preciso.

</details>

## Vocabulario

| English | Español |
|---|---|
| editor | editor |
| extension | extensión |
| server / localhost | servidor / localhost |
| console | consola |
| DevTools | herramientas de desarrollo |
| save (Ctrl+S) | guardar |
| error message | mensaje de error |

## Lo que sigue

Tu kit está completo - para siempre. En el **Capítulo 2** escribes tu primer programa de verdad: variables, tu primer `console.log`, y una página que reacciona visiblemente a tu código.

**[Continúa al Capítulo 2: Hola, JavaScript →](../02-hello-javascript/README.es.md)**
