# Capítulo 2 - Hola, JavaScript

*Léelo en: [English](README.md) | **Español***

Hoy escribes tu primer programa. Será pequeño - unos mensajes, unas variables - pero será *real*: al final de este capítulo, código que tú escribiste estará corriendo en el navegador y cambiando visiblemente la página. Todo el programa pesa 1,058 bytes. Cada programa gigante que has usado en tu vida empezó así.

**Tiempo**: ~30 minutos.

## Lo que vas a construir en este capítulo

Una página con un script que habla con la consola, guarda las dimensiones del futuro juego en variables, descuenta un tiro de práctica, y - la recompensa visible - **renombra la pestaña del navegador** usando valores que él mismo calculó. Desde este capítulo hasta el final del curso, cada capítulo termina con algo que puedes ver.

## Conceptos nuevos

- **`<script>`** - la etiqueta de HTML que contiene JavaScript
- **sentencia** - una instrucción; los programas son listas de sentencias, ejecutadas de arriba a abajo
- **`console.log`** - imprimir un mensaje en la consola de DevTools
- **variable** - un casillero etiquetado que guarda un valor
- **`const` y `let`** - las dos formas de declarar una variable
- **string / número** - valores de texto y valores numéricos
- **`document.title`** - tu primer contacto con la página desde el código

## Constrúyelo, paso a paso

### Paso 1 - El esqueleto HTML

En tu carpeta del curso (la del Capítulo 1), reemplaza el contenido de `index.html` con:

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Free Throw - Chapter 2</title>
</head>
<body>

<h1>Free Throw - under construction</h1>
<p>Press F12 and open the Console tab: your first program is running there.</p>

</body>
</html>
```

Sesenta segundos de teoría de HTML - todo lo que este curso necesita: `<!DOCTYPE html>` declara "esta es una página moderna"; `<head>` contiene información *sobre* la página (el título de su pestaña, su codificación de texto); `<body>` contiene lo que *ves*. Las etiquetas abren (`<h1>`) y cierran (`</h1>`), y el navegador lee el archivo de arriba a abajo.

**Punto de control:** guarda, Go Live - deberías ver el encabezado y el párrafo. La pestaña dice *Free Throw - Chapter 2*. Mantén la consola abierta (F12); está vacía y esperando.

### Paso 2 - Tu primer script, tu primera sentencia

Agrega estas líneas justo **antes** de `</body>` (el script va al *final* del body - el Capítulo 3 te muestra exactamente qué se rompe si lo pones antes):

```html
<script>
"use strict";

// Your first program: a message to the console.
console.log("Hello, JavaScript!");
</script>
```

Guarda.

**Punto de control:** la consola ahora dice **`Hello, JavaScript!`** - tu primer programa corrió, y nada lo instaló, compiló ni empaquetó. El navegador leyó tu archivo y obedeció.

Tres cosas que acabas de escribir, en orden:

- `"use strict";` - una línea, siempre primero, que pone a JavaScript en su modo honesto: varios errores silenciosos y heredados se vuelven errores ruidosos. Cada script de este curso empieza con ella, y en el Capítulo 4 la verás atrapar un bug real por ti.
- `// Your first program…` - un **comentario**: notas para humanos, invisibles para el motor.
- `console.log("Hello, JavaScript!");` - una **sentencia**: una instrucción completa, terminada con punto y coma, como una oración termina con punto.

> [!WARNING]
> **Error real #1: JavaScript distingue mayúsculas.** Escribe `Console.log` (C mayúscula) en lugar de `console.log` y la consola muestra, en rojo:
>
> ```
> Uncaught ReferenceError: Console is not defined
> ```
>
> Para JavaScript, `Console` y `console` son dos nombres completamente distintos, y solo el de minúscula existe. Esto aplica a *todo* lo que llegues a nombrar. La corrección es la ortografía, y el hábito de lectura es la verdadera lección: el error nombra exactamente lo que el motor no pudo encontrar.

> [!WARNING]
> **Error real #2: el error mudo.** Escribe mal la etiqueta - `<sript>` en lugar de `<script>` - y no hay ningún error rojo. En cambio, **tu código aparece en la página como texto plano**, y la consola queda vacía. Lo reprodujimos construyendo este curso: el navegador trata una etiqueta desconocida como contenido ordinario (internamente se vuelve un `HTMLUnknownElement`) y nunca ejecuta lo que hay adentro. HTML perdona los errores encogiéndose de hombros; JavaScript no alcanza a quejarse porque nunca corre. Si tu código aparece *en la página*, revisa cómo escribiste `<script>`.

### Paso 3 - Variables: casilleros etiquetados

Haz crecer el script (las líneas nuevas van después del primer `console.log`):

```js
// Variables: labeled lockers, each storing one value.
const courtWidth = 920;  // the width our game canvas will have, in pixels
const courtHeight = 540; // and its height
console.log("The court will be", courtWidth, "by", courtHeight, "pixels.");
```

**Punto de control:** la consola agrega **`The court will be 920 by 540 pixels.`**

> [!NOTE]
> **Una variable es un casillero etiquetado.** `const courtWidth = 920;` renta un casillero, escribe `courtWidth` en la etiqueta, y guarda `920` adentro. De aquí en adelante, escribir `courtWidth` en cualquier parte significa "abre ese casillero y usa lo que hay dentro". Por cierto, los números 920 y 540 no son ejemplos - son las dimensiones reales del canvas del juego terminado. Desde tus primerísimas variables, estás construyendo *el* juego.

> [!TIP]
> `console.log` acepta varios valores separados por comas y los imprime con espacios entre ellos - la forma más fácil de mezclar texto y números, y la que usarás constantemente al depurar.

### Paso 4 - `const` bloquea, `let` permite el cambio

```js
// const lockers keep their value forever; let lockers accept a new one.
let shotsLeft = 10;
shotsLeft = shotsLeft - 1; // one practice throw
console.log("Shots left after one practice throw:", shotsLeft);
```

**Punto de control:** la consola agrega **`Shots left after one practice throw: 9`**.

`const` declara un valor que nunca será reasignado; `let` declara uno que sí. `shotsLeft` necesita cambiar de verdad - cada tiro lo reduce - así que se gana un `let`. El ancho de la cancha nunca cambia, así que es `const`. Esa es la regla de oro para todo el curso: **`const` por defecto, `let` solo cuando el juego de verdad necesita que el valor cambie.** (Existe una tercera palabra clave, antigua: `var` - nunca la usamos, y el Capítulo 4 explica por qué.)

Observa `shotsLeft = shotsLeft - 1;` - sin `let` esta vez. Declarar crea el casillero; asignar cambia su contenido. Solo se declara una vez.

### Paso 5 - Strings, y el cambio visible

```js
// Strings hold text, and + glues strings together.
const gameTitle = "Free Throw";
document.title = gameTitle + " - " + shotsLeft + " shots left";
console.log("Now look at the browser tab: JavaScript just renamed it.");
```

Guarda.

**Punto de control - el cambio visible del capítulo:** mira la pestaña del navegador. Ahora dice **Free Throw - 9 shots left**. El `<title>` que escribiste en HTML decía *Chapter 2*; tu programa acaba de sobreescribirlo con un valor que él calculó. Ese es el juego entero en miniatura: JavaScript leyendo estado (`shotsLeft`) y actualizando lo que ves.

`"Free Throw"` es un **string** - texto entre comillas. El `+` que suma números *pega* strings, y cuando los mezclas (`shotsLeft` es un número), JavaScript convierte el número a texto para terminar el pegado. `document.title` es una primera probadita del objeto `document` - la página misma, alcanzable desde el código. El Capítulo 3 entra mucho más hondo.

Tu salida completa de consola en este punto, exactamente como se produce (Chrome 150):

```
Hello, JavaScript!
The court will be 920 by 540 pixels.
Shots left after one practice throw: 9
Now look at the browser tab: JavaScript just renamed it.
```

Tu archivo debería coincidir ahora con el [`snapshot/index.html`](snapshot/index.html) de este capítulo - 1,058 bytes de programa real.

## Por qué lo hicimos así

Todo en este programa diminuto apunta al juego terminado. Las variables no son `x` ni `foo` - son `courtWidth`, `shotsLeft`, `gameTitle`, nombres tomados directamente del juego que publicarás en el Capítulo 14. Nombrar las cosas por lo que *significan* es el hábito de ingeniería más barato y el de mayor rendimiento, así que empieza en la línea uno del día uno. Igual con `const` por defecto: no es pedantería, es un mensaje a tu yo del futuro - "este valor es un hecho, no una pieza móvil" - y cuantas menos piezas móviles tiene un programa, más fácil se vuelve cada cacería de bugs.

## Rincón de experimentos

1. Cambia `courtWidth` a `1000`, guarda, y lee la consola. Una variable, una edición, y el mensaje se actualiza - una vista previa de dos líneas de por qué el Capítulo 4 centraliza todos los números del juego.
2. Rómpelo a propósito: cambia el log a `console.log(courtwidth)` (w minúscula), guarda, y lee el `ReferenceError` con calma. Nota que nombra la ortografía exacta que no pudo encontrar.
3. Quita las comillas: `const gameTitle = Free Throw;`. Lee el `SyntaxError`. Las comillas son lo que le dice a JavaScript "esto es texto, no código".

## Ejercicios

Las soluciones desarrolladas están en [`exercises/solutions/`](exercises/solutions/).

1. **Guiado** - declara `const playerName = "..."` con tu nombre, y luego imprime `"Ready to play, "` seguido de él. (¿Cuál declaración corresponde - `const` o `let`? Tu nombre no cambiará a mitad del programa.)
2. **Independiente** - declara `shotsMade = 7` y `shotsTaken = 10`, calcula el porcentaje de acierto (`shotsMade / shotsTaken * 100`), e imprime `Shooting: 70 %`.
3. **Reto** - haz que el título de la pestaña incluya también el nombre del jugador, p. ej. `Ana - Free Throw - 9 shots left`. Luego intenta reasignar `gameTitle = "Layups";` y lee el mensaje rojo que obtienes. (Acabas de ver a `const` cumplir su promesa. El Capítulo 4 convierte esa promesa en una herramienta de ingeniería.)

## Vocabulario

| English | Español |
|---|---|
| statement | sentencia / instrucción |
| variable | variable |
| string | cadena de texto |
| number | número |
| comment | comentario |
| assignment | asignación |
| case-sensitive | sensible a mayúsculas y minúsculas |

## Lo que sigue

Ya puedes guardar valores e imprimirlos. En el **Capítulo 3** obtienes una superficie donde *dibujar*: el elemento `<canvas>`, su extraño sistema de coordenadas al revés, y tus primeros rectángulos - la pared y el piso del gimnasio del juego de verdad.

**[Continúa al Capítulo 3: Tu primer canvas →](../03-your-first-canvas/README.es.md)**
