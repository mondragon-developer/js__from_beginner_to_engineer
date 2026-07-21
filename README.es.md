# 🏀 JavaScript: De Principiante a Ingeniero

**Construye un juego de baloncesto con física real que corre en el navegador - empezando desde cero.**

*Léelo en: [English](README.md) | **Español***

![El juego de baloncesto terminado en acción](media/gameplay.gif)

*▶ [Mira una sesión completa de un minuto (video)](media/gameplay-session.mp4)*

Este es un curso gratuito y práctico. Empiezas sin nada más que el navegador que ya tienes y terminas con un juego completo - tiro con carga sostenida, física real de gravedad y rebote, puntuación, sesiones de juego con límite de tiros y perfiles de jugador con récords persistentes - escrito en **JavaScript** puro, dibujado sobre el **`<canvas>`** de HTML, y jugable en cualquier navegador moderno. Un solo archivo. Cero librerías. Cero herramientas de compilación.

No se requiere experiencia previa con JavaScript. No se requiere experiencia previa programando. Cada concepto del lenguaje (variables, funciones, objetos, clases…) se explica la primera vez que el código del juego lo necesita.

## Por qué existe este curso

Este es el hermano en JavaScript de mi curso [Rust + Bevy: De Principiante a Ingeniero](https://github.com/mondragon-developer/rust_bevy_from_beginner_to_engineer). Es el **mismo juego de tiros libres** - el mismo tiro con carga sostenida, la misma física, las mismas sesiones - construido por segunda vez en un segundo lenguaje, para que quien tome ambos cursos vea exactamente cómo dos lenguajes resuelven el mismo problema.

Y esta vez el giro merece celebrarse: **no hay toolchain.** El curso de Rust arranca con una instalación de ~10 GB - compilador, herramientas de build, target de WASM, bundler. Este curso arranca abriendo un archivo. El navegador que ya tienes es el motor.

Ambos cursos se sostienen sobre las mismas tres promesas:

1. **Todo lo que hay aquí se ejecutó de verdad.** Cada bloque de código está extraído del snapshot verificado de su capítulo - código real que corrió, nunca reescrito de memoria. Cuando el curso cita un número de líneas o el tamaño de un archivo, es una medición, no una suposición.
2. **Los errores son reales.** Las cajas de Advertencia documentan fallos que ocurrieron de verdad construyendo este curso - el elemento `null`, el canvas borroso, la pelota que se teletransportó fuera de la pantalla por un bug de milisegundos. Probablemente te toparás con varios; la solución estará esperándote.
3. **Las versiones están fijadas, siempre.** Nada aquí dice "la última versión". La versión JavaScript de esta promesa es en sí una lección: no hay muro de versiones de compilador contra el cual chocar - pero los navegadores y la versión de Node contra los que se verificó este curso están declarados con exactitud, más abajo.

Y es **bilingüe** - cada capítulo existe en inglés y en español - porque el buen material para principiantes en español escasea, y aprender a programar en un segundo idioma no debería ser el precio de entrada.

Si este curso te sirve, una ⭐ en el repo ayuda a que el siguiente estudiante lo encuentre.

## Lo que vas a construir

Un juego 2D de tiros libres de baloncesto donde:

- **Mantienes presionado en cualquier parte para cargar** el tiro - una barra de potencia se llena de verde a rojo mientras una vista previa punteada de la trayectoria crece en vivo con la carga
- **Apuntas con el puntero** (ratón o táctil - el mismo código) y sueltas para tirar
- Ves la pelota volar con **gravedad real**, rebotar en el **tablero**, repiquetear en un aro hecho de **dos colisionadores circulares**, y rebotar en cada pared de un gimnasio cerrado - la pelota nunca sale del cuadro
- **Encestas** y ves reaccionar el marcador estilo LED, con el aro brillando en celebración
- Juegas **sesiones de 10 tiros** con resultados al final y un botón de Nueva sesión
- Creas **perfiles de jugador** cuya mejor racha y mejor sesión sobreviven al cierre del navegador (localStorage - con un respaldo elegante cuando el almacenamiento está bloqueado)

Y en el camino irás absorbiendo lo que hace que este curso llegue "a ingeniero": un CONFIG congelado en lugar de números mágicos, JSDoc en cada función, una máquina de estados, clases y arquitectura SOLID, un arnés de verificación, y un despliegue real a una URL pública.

## Los capítulos

Cada carpeta de capítulo contiene la lección **y** un snapshot completo y ejecutable del proyecto en ese punto. ¿Perdido? Entra a la carpeta de cualquier capítulo y continúa desde ahí.

### Parte I - Preparándonos
| # | Capítulo | Vas a |
|---|---|---|
| 00 | [Antes de empezar](chapters/00-before-you-start/README.es.md) | Ver lo que construirás, revisar requisitos, conocer el curso hermano de Rust |
| 01 | [Tu kit de herramientas](chapters/01-your-toolkit/README.es.md) | Instalar VS Code + Live Server; abrir la consola de DevTools - el navegador ES el motor |
| 02 | [Hola, JavaScript](chapters/02-hello-javascript/README.es.md) | Escribir y ejecutar tu primer programa abriendo un archivo |

### Parte II - Primeros pasos con el Canvas
| # | Capítulo | Vas a |
|---|---|---|
| 03 | [Tu primer canvas](chapters/03-your-first-canvas/README.es.md) | Dibujar tus primeros rectángulos - aparecen la pared del gimnasio y el piso |
| 04 | [Variables y CONFIG](chapters/04-variables-and-config/README.es.md) | Eliminar los números mágicos; la pelota aparece en la línea de tiro libre |
| 05 | [Funciones que dibujan](chapters/05-functions-that-draw/README.es.md) | Descomponer la escena en funciones con nombre; aparece el aro |
| 06 | [Haciendo que las cosas se muevan](chapters/06-making-things-move/README.es.md) | El bucle del juego, delta time, gravedad - la pelota cae y rebota |

### Parte III - Construyendo el juego de baloncesto
| # | Capítulo | Vas a |
|---|---|---|
| 07 | [La cancha](chapters/07-the-court/README.es.md) | Duela, tablero, aro, red - la escena completa |
| 08 | [La mecánica de tiro](chapters/08-the-shooting-mechanic/README.es.md) | Carga sostenida, puntería, y una vista previa de trayectoria que nunca miente |
| 09 | [Física](chapters/09-physics/README.es.md) | El gimnasio cerrado: paredes, tablero, y un aro que empuja de vuelta |
| 10 | [Puntuación y feedback](chapters/10-scoring-and-feedback/README.es.md) | Detectar canastas, celebrar, y encender el marcador |
| 11 | [Sesiones de juego y jugadores](chapters/11-game-sessions-and-players/README.es.md) | Sesiones de 10 tiros, resultados, y perfiles de jugador |

### Parte IV - De principiante a ingeniero
| # | Capítulo | Vas a |
|---|---|---|
| 12 | [De objetos a clases](chapters/12-from-objects-to-classes/README.es.md) | Convertir Ball y Hoop en clases - y demostrar que el comportamiento es idéntico |
| 13 | [Refactorizando como ingeniero](chapters/13-refactoring-like-an-engineer/README.es.md) | La arquitectura SOLID completa, un principio a la vez |
| 14 | [Persistencia, verificación y publicación](chapters/14-persistence-verification-shipping/README.es.md) | localStorage, un arnés de verificación, y un despliegue a GitHub Pages |

## Requisitos de un vistazo

- **Sistema operativo**: Windows, macOS o Linux - cualquiera que corra un navegador moderno
- **Espacio en disco**: alrededor de **50 MB libres** (sí, megabytes - el curso hermano de Rust pide ~10 GB; saborea esta línea)
- **Navegador**: cualquier navegador moderno; el curso fue verificado en las versiones exactas fijadas abajo
- **Editor**: usamos **VS Code** (gratuito) con la extensión Live Server, pero cualquier editor funciona
- **Experiencia**: ninguna - este curso empieza desde cero

> [!IMPORTANT]
> **Versiones fijadas (Promesa 3).** No hay toolchain que fijar - ese es el punto de este curso - pero "sin toolchain" no justifica decir "la última versión". Estas son las versiones exactas con las que este curso fue construido y verificado:
>
> | Herramienta | Versión | Rol |
> |---|---|---|
> | Google Chrome | **150.0.7871.102** | Cada snapshot de capítulo fue cargado y jugado ahí durante la producción |
> | Node.js | **v24.11.1** | Ejecuta el arnés de verificación en [`verify/`](verify/verify.mjs) (y la lección del Capítulo 14). No se necesita para jugar ni para seguir el curso |
>
> También en la máquina de producción: Microsoft Edge **150.0.4078.65** y Firefox **152.0.6**. El juego usa solo APIs estandarizadas desde hace años (Canvas 2D, Pointer Events, localStorage), pero el navegador contra el que se *verificó* cada capítulo es Chrome 150.

## Cómo usar este curso

1. Lee los capítulos en orden - cada uno construye sobre el anterior, y cada uno termina con un cambio visible en pantalla.
2. **Escribe el código tú mismo en lugar de copiar y pegar; ahí es donde ocurre el aprendizaje.**
3. ¿Atorado o roto? Compara tu código contra la carpeta `snapshot/` del capítulo - o cópiala y continúa desde ahí.
4. Busca las cajas de aviso:
   - **Nota** - un concepto del lenguaje JavaScript, explicado la primera vez que el juego lo necesita
   - **Advertencia** - un error real con el que puedes toparte, con su solución real
   - **Consejo** - atajos y mejoras de calidad de vida

**Empieza aquí → [Capítulo 0: Antes de empezar](chapters/00-before-you-start/README.es.md)**

## Licencia

[MIT](LICENSE) - usa el código y las lecciones libremente, para aprender o para lo que quieras.

*Nota: el código y sus comentarios están en inglés en ambas versiones del curso - el Capítulo 0 explica por qué.*
