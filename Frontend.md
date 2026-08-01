# Frontend — consideraciones generales

Lineamientos para implementar el frontend de la simulación del Ejercicio 135.
Este documento define **estructura, responsabilidades, contrato de API y criterios de interfaz**. No contiene la implementación.

> **Fuente de verdad del dominio**: `Dominio.md` (raíz del repo). Toda referencia con `§` apunta a una sección de ese archivo.
> La sección 13 de `Dominio.md` ("Comunicación de resultados en la interfaz de usuario") es requisito directo de este documento.

---

## 1. Stack

| Componente | Elección | Para qué |
|---|---|---|
| Lenguaje | TypeScript | Base, con tipado estricto |
| UI | React 19 | Componentes |
| Build | Vite | Servidor de desarrollo y empaquetado |
| Estilos | **Tailwind CSS v3** | Con tema propio en `tailwind.config.js` |
| HTTP | axios | Cliente de la API |
| Gráficos | Recharts | Los dos gráficos XY de §10.2 |
| Iconos | lucide-react | Iconos de interfaz (licencia MIT) |
| Formularios | react-hook-form | Validación en vivo de la pantalla 1 (§5.1). Sin `zod`: las reglas son comparaciones simples |
| Linter | ESLint | Ya configurado en `eslint.config.js` por el scaffold |

**Tailwind v3, no v4.** Se fija la major deliberadamente: la v4 se configura desde el CSS con `@theme` y prescinde de `tailwind.config.js` y `postcss.config.js`, que son un requisito explícito de este proyecto. Instalar con `tailwindcss@3`.

`tailwind.config.js` y `postcss.config.js` en la raíz de `Frontend/`, como archivos de configuración propios (no inline).

**Sin tests por el momento** (decisión explícita del proyecto).

### 1.1 Punto de partida

`Frontend/` ya tiene el andamiaje de Vite creado (`index.html`, `vite.config.ts`, `tsconfig*.json`, `eslint.config.js`, `src/main.tsx`, `src/App.tsx`) con React 19 y TypeScript, y las dependencias base instaladas. Falta agregar `tailwindcss@3`, `postcss`, `autoprefixer`, `axios`, `recharts` y `lucide-react`, y construir todo lo que describe este documento.

`src/App.css` y `src/assets/` son del andamiaje por defecto y se eliminan: los estilos van por Tailwind.

---

## 2. Estructura de carpetas

```
Frontend/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js              # Tema: paleta, keyframes de animación, tipografía
├── postcss.config.js               # tailwindcss + autoprefixer
└── src/
    ├── main.tsx                    # Monta React en el DOM
    ├── App.tsx                     # Máquina de estados de la corrida y ruteo entre pantallas
    │
    ├── api/
    │   ├── client.ts               # Instancia de axios: baseURL, timeout, interceptor de errores
    │   └── simulacion.ts           # Funciones de la API: ejecutarSimulacion(), obtenerVectorEstado(), verificarSalud()
    │
    ├── types/
    │   └── simulacion.ts           # Tipos espejo EXACTOS del contrato de la API
    │
    ├── pages/
    │   ├── ConfiguracionPage.tsx   # Pantalla 1: formulario de parámetros
    │   ├── SimulandoPage.tsx       # Pantalla 2: ilustración + barra de progreso
    │   ├── ResultadosPage.tsx      # Pantalla 3: conclusión, gráficos y detalle
    │   └── VectorEstadoPage.tsx    # Pantalla 4: vector de estado paginado
    │
    ├── components/
    │   ├── ui/                     # Primitivas reutilizables, sin conocimiento del dominio
    │   │   ├── Boton.tsx
    │   │   ├── CampoNumerico.tsx
    │   │   ├── CampoRadio.tsx
    │   │   ├── Selector.tsx
    │   │   ├── Tarjeta.tsx
    │   │   ├── Tag.tsx
    │   │   ├── Acordeon.tsx
    │   │   └── Ayuda.tsx
    │   ├── configuracion/
    │   │   └── FichaDistribucion.tsx
    │   ├── animacion/
    │   │   ├── HornoPixel.tsx
    │   │   ├── PiezaPixel.tsx
    │   │   └── BarraProgreso.tsx
    │   ├── resultados/
    │   │   ├── TarjetaNOptimo.tsx
    │   │   ├── ResumenParametros.tsx
    │   │   ├── GraficoUtilizacion.tsx
    │   │   ├── GraficoProduccion.tsx
    │   │   ├── TablaResultados.tsx
    │   │   └── PanelComputo.tsx
    │   └── vectorEstado/
    │       ├── SelectorNyReplica.tsx
    │       ├── TablaVectorEstado.tsx
    │       └── ControlesPaginacion.tsx
    │
    ├── hooks/
    │   ├── useSimulacion.ts        # Dispara la llamada y expone estado / resultado / error
    │   ├── useProgresoSimulado.ts  # Progreso animado de la pantalla 2
    │   ├── useVectorEstado.ts      # Trae el vector de estado de la réplica seleccionada
    │   └── usePaginacion.ts        # Paginación genérica en memoria (20 por página)
    │
    ├── utils/
    │   ├── formato.ts              # Porcentajes, decimales, duraciones — todo en es-AR
    │   ├── estadistica.ts          # Media, desvío y semirrango de una uniforme
    │   └── constantesDominio.ts    # Criterios, techo del sistema y valores del enunciado
    │
    ├── theme/
    │   └── coloresGraficos.ts      # Espejo en JS de la paleta de tailwind.config.js
    │
    └── styles/
        └── index.css               # Directivas de Tailwind y estilos base
```

### 2.1 Criterio de división de componentes

- **`components/ui/`** — primitivas sin conocimiento del dominio. `Tarjeta` no sabe qué es un horno; recibe `children`. Son las piezas reutilizables del sistema.
- **`components/configuracion/`**, **`components/animacion/`**, **`components/resultados/`** y **`components/vectorEstado/`** — componentes de dominio: sí saben qué muestran, pero **no** hacen llamadas HTTP ni manejan estado global. Reciben datos por props.
- **`pages/`** — componen los anteriores y reciben del `App` los datos y los callbacks de navegación. Tampoco llaman a la API directamente: eso lo hace el hook.
- **`hooks/`** — el único lugar donde se orquesta el flujo asincrónico.

Regla práctica: si un componente importa `axios`, está mal ubicado.

---

## 3. Contrato de la API

> Este contrato debe ser **idéntico** al declarado en `Backend.md`.
> `src/types/simulacion.ts` es su traducción literal a TypeScript. Si cambia uno, cambian los tres en el mismo cambio.

Dos endpoints, los dos síncronos: `POST /api/simulaciones` corre el experimento completo, y `POST /api/simulaciones/vector-estado` trae el detalle evento por evento de una réplica puntual.

### 3.1 `POST /api/simulaciones`

**Request**

```json
{
  "n_minimo": 1,
  "n_maximo": 8,
  "replicas": 30,
  "criterio": "maxima_produccion",
  "ganancia_minima": 1.0,
  "umbral_utilizacion": 0.94,
  "semilla": 12345
}
```

`umbral_utilizacion` viaja como **fracción** (0.94), no como porcentaje: la conversión desde el porcentaje que ve el usuario ocurre en `api/simulacion.ts`, en un solo lugar. `semilla` puede ser `null`.

`criterio` es el modo con el que se elige el N óptimo (§10). `ganancia_minima` y `umbral_utilizacion` **viajan siempre**, aunque el criterio elegido use solo uno: así cambiar de modo no obliga a rearmar el cuerpo ni puede hacer fallar una corrida por un campo que el usuario no tiene a la vista.

**Response `200`**

```json
{
  "parametros": {
    "n_minimo": 1,
    "n_maximo": 8,
    "replicas": 30,
    "criterio": "maxima_produccion",
    "ganancia_minima": 1.0,
    "umbral_utilizacion": 0.94,
    "semilla": 12345,
    "duracion_jornada": 480,
    "tiempo_ensamble": { "minimo": 25, "maximo": 35 },
    "tiempo_coccion":  { "minimo": 6,  "maximo": 10 }
  },
  "resultados_por_n": [
    {
      "n": 1,
      "utilizacion_promedio": 0.2044,
      "piezas_promedio": 12.23,
      "tiempo_horno_ocupado_promedio": 98.11,
      "utilizacion_desvio": 0.0092,
      "piezas_desvio": 0.5
    }
  ],
  "n_optimo": 6,
  "alcanzo_criterio": true,
  "utilizacion_n_optimo": 0.9452,
  "piezas_n_optimo": 56.33,
  "piezas_n_optimo_truncadas": 56,
  "ganancia_n_optimo": 0.0,
  "utilizacion_maxima_rango": 0.946,
  "estadisticas_computo": {
    "tiempo_total_ms": 41.8,
    "tiempo_por_n": [{ "n": 1, "tiempo_ms": 4.2 }],
    "tiempo_promedio_replica_ms": 0.23,
    "memoria_pico_mb": 38.4,
    "cpu_porcentaje": 12.5
  }
}
```

Lo que el frontend debe tener presente:

- **`utilizacion_promedio` es fracción.** Convertir a porcentaje es responsabilidad de la vista, en un único lugar (`utils/formato.ts`).
- **`parametros` incluye los valores fijos del enunciado** (`duracion_jornada`, `tiempo_ensamble`, `tiempo_coccion`). Se muestran desde ahí, **nunca hardcodeados en el frontend**: si algún día cambian en el backend, la pantalla los refleja sola.
- **`parametros.semilla` siempre viene con un valor**, incluso si el usuario no la ingresó (el backend genera una y la devuelve). Hay que mostrarla, porque es lo que permite repetir la corrida.
- **`n_optimo` puede ser `null`.** Ocurre cuando `alcanzo_criterio` es `false`, y el motivo **depende del criterio**: ver §7.1.
- **`piezas_n_optimo_truncadas` es el resultado; `piezas_n_optimo` es el estadístico.** El primero es lo que la fábrica entrega (56 piezas), el segundo el promedio de R jornadas (56,33). La conclusión debe mostrar los dos y explicar la diferencia.
- **`ganancia_n_optimo` puede ser `null` con `n_optimo` no nulo**, si el óptimo es el último N del rango. No asumir que si hay óptimo hay ganancia.
- **`parametros.criterio` decide qué texto mostrar**, no solo qué se calculó: cuál de los dos gráficos "decide", qué línea de referencia dibujar y cómo se justifica el corte en la conclusión.

**Errores**: `422` con `{ "detail": "<mensaje en español>" }` ya redactado para el usuario — se muestra tal cual, sin reescribirlo. `500` para errores inesperados. `GET /api/salud` permite distinguir "backend caído" de "parámetros inválidos".

### 3.2 `POST /api/simulaciones/vector-estado`

Trae la tabla fila-por-evento de **una** jornada simulada (pantalla 4, §8 de este documento).

**Request**

```json
{
  "semilla": 12345,
  "n_minimo": 1,
  "replicas": 30,
  "n": 6,
  "replica": 17
}
```

**Response `200`**

```json
{
  "n": 6,
  "replica": 17,
  "total_replicas": 30,
  "total_piezas": 59,
  "total_filas": 110,
  "filas": [
    {
      "replica": 17,
      "iteracion": 0,
      "evento": "Inicialización",
      "reloj": 0.0,
      "ensambladores": [
        {
          "rnd": 0.2263,
          "tiempo": 27.26,
          "fin_ensamble": 27.26,
          "estado": "Ensamblando"
        }
      ],
      "rnd_coccion": null,
      "tiempo_coccion": null,
      "fin_coccion": null,
      "horno_estado": "Libre",
      "cola": 0,
      "piezas_terminadas": 0,
      "piezas": ["Ensamblándose"]
    }
  ]
}
```

Lo que el frontend debe tener presente:

- **Los cinco campos del request salen de `parametros`**, la respuesta de §3.1 — no los tipea el usuario. El backend reconstruye la jornada desde la semilla, así que pedirla con otros valores devolvería una simulación distinta de la que está en pantalla.
- **Una fila es un evento, no una réplica.** `iteracion` numera las filas dentro de la réplica: la 0 es la inicialización y la última es el corte en 480.
- **`ensambladores` tiene siempre `n` elementos.** `rnd`/`tiempo` son `null` donde ese ensamblador no sorteó nada; `fin_ensamble` y `fin_coccion` son columnas de la lista de eventos futuros, así que persisten fila a fila y valen `null` cuando no hay evento programado. Todos esos `null` se dibujan como `—`, nunca como `0` ni vacío.
- **`piezas` CRECE fila a fila.** En las primeras filas es más corta que `total_piezas`: la tabla dibuja `total_piezas` columnas y rellena las que todavía no existen.
- **Vienen todas las filas de una vez** (unas cien, ~120 KB). Paginar es responsabilidad del frontend, con `usePaginacion`.

**Errores**: los mismos de §3.1, con el mismo formato de `detail`.

`src/types/simulacion.ts` define además `SimulacionRequest`, `VectorEstadoRequest` y todos los tipos anidados. Nada de `any` ni de `as` sobre la respuesta.

---

## 4. Flujo de la aplicación

`App.tsx` mantiene una máquina de estados simple:

```
'configuracion'  →  'simulando'  →  'resultados'  ⇄  'vector-estado'
                          ↓
                       'error'  →  (volver a 'configuracion')
```

A `'vector-estado'` **solo se entra desde `'resultados'`**, nunca directo: necesita una corrida ya ejecutada, porque de `parametros` salen la semilla y el rango que identifican qué réplica reconstruir. Se vuelve con un botón, sin perder los resultados.

**Sin `react-router`.** Es un flujo lineal, sin URLs que compartir ni navegación hacia atrás del browser. Agregar un router sumaría dependencia y ceremonia sin beneficio.

El contenedor central es `max-w-5xl` en las tres primeras pantallas y `max-w-[110rem]` en `'vector-estado'`: esa tabla tiene decenas de columnas y necesita todo el ancho disponible.

El `App` conserva los últimos parámetros enviados, para poder mostrarlos durante la espera y para precargar el formulario al volver.

---

## 5. Pantalla 1 — Configuración

Formulario con los parámetros configurables y un botón **"Iniciar simulación"**.

### 5.1 Campos editables

| Campo | Tipo | Por defecto | Validación en cliente |
|---|---|---|---|
| N mínimo | entero | 1 | `>= 1` |
| N máximo | entero | **8** | `>= N mínimo` |

> **Por qué el default de N máximo es 8 y no 6.** Dos razones. (1) La curva se aplana en N=6: si el rango terminara justo ahí, el gráfico mostraría una curva que sube hasta el último punto y el aplanamiento no se vería — el modo de falla que advierte `Dominio.md` §10.2. (2) El criterio de máxima producción **no puede evaluar el último N del rango**, porque compara cada N con el siguiente: con el rango 1–6 no encontraría óptimo aunque 6 sea la respuesta. Con 8 quedan tres puntos en la meseta y el óptimo se lee de un vistazo.

| Réplicas por N (R) | entero | 30 | `>= 1` |
| Criterio del N óptimo | una de tres opciones | **Máxima producción** | siempre hay una elegida |
| Ganancia mínima | piezas | **1** | `> 0`. Solo visible con el criterio de máxima producción |
| Umbral de utilización | porcentaje | **94 %** | entre 1 y 100. Solo visible con el criterio manual |
| Semilla (opcional) | entero o vacío | vacío | entero si se completa |

El umbral se muestra al usuario **en porcentaje** (94) y se envía al backend **como fracción** (0.94). La conversión ocurre en `api/simulacion.ts`, en un solo lugar.

**El selector de criterio** es el `ui/CampoRadio` genérico alimentado por la lista `CRITERIOS` de `utils/constantesDominio.ts`; no hace falta un componente propio. Presenta las tres opciones de `Dominio.md` §10, cada una con una línea que explica qué significa. El parámetro asociado se muestra **solo** cuando su criterio está activo: no tiene sentido pedir un umbral en una corrida que no lo usa. Los valores de los campos ocultos se conservan y viajan igual en el request.

> **Por qué 94 % y no 95 %.** La utilización de este modelo tiene un techo alcanzable de ~94,8 %: el sistema arranca vacío (`Dominio.md` §4) y el horno queda ocioso ~25 min hasta el primer Fin Ensamble, ocio que ningún N puede eliminar. Con un umbral del 95 % **ningún N calificaría nunca** y la pantalla de resultados mostraría siempre el aviso de ampliar el rango. Con 94 % el N óptimo es 6, que es donde se aplanan ambas curvas. La demostración está en la nota de `Dominio.md` §10.1. **No subir este default sin leerla.**

La validación del cliente es solo para dar respuesta inmediata; la validación real es la del backend, y sus mensajes se muestran si llegan.

#### Validación en vivo con react-hook-form

El formulario usa **`react-hook-form` con `mode: 'onTouched'`**. Sin `zod`: las reglas son cuatro comparaciones y `validate` las expresa directamente, así que un resolver de esquema sería una dependencia más sin beneficio.

`onTouched` significa: no se valida mientras el usuario escribe por primera vez, sí al salir del campo, y a partir de ahí en cada tecla. Es el punto medio entre `onChange` —que muestra "completá este campo" apenas borrás un número para reescribirlo— y `onBlur`, que no limpia el error hasta salir de nuevo del campo.

Dos detalles de implementación que no son obvios:

- **`useWatch`, no `watch`.** `watch()` devuelve una función que el React Compiler no puede memoizar (la regla `react-hooks/incompatible-library` lo marca). `useWatch({ control, name })` devuelve el valor y no tiene ese problema.
- **`N máximo >= N mínimo` es una validación cruzada.** Se declara con `validate` leyendo `getValues('nMinimo')`, y se vuelve a disparar con `trigger('nMaximo')` cuando cambia el mínimo: si no, corregir el mínimo dejaría colgado un error viejo en el máximo.
- **El botón de envío no se deshabilita con `isValid`.** `handleSubmit` ya bloquea el envío de un formulario inválido y marca los campos; deshabilitar el botón agrega el riesgo de dejarlo trabado sin explicación si la validación no llegara a correr.

`CampoNumerico` recibe el `registro` que devuelve `register(...)` y lo esparce sobre el `<input>`: no maneja estado propio, sigue siendo presentacional.

### 5.2 Textos de ayuda (§13.1)

Cada campo lleva su explicación en lenguaje llano, accesible con el componente `Ayuda` (ícono `Info` de lucide + tooltip o texto debajo del campo). El usuario tiene que entender qué está configurando sin haber leído el dominio. Textos:

- **N mínimo / N máximo** — "Rango de cantidades de ensambladores a probar. Si los resultados no se aplanan, ampliá el máximo."
- **Réplicas por N (R)** — "Cuántas jornadas de 8 horas se simulan para cada N. Como los tiempos son al azar, un solo día puede dar un resultado atípico; por eso se promedian R días. Más réplicas = resultado más confiable."
- **Umbral de utilización** — "A partir de qué nivel de uso se considera que el horno está saturado. Por defecto 94 %, que es prácticamente el máximo que este sistema puede alcanzar."
- **Semilla (opcional)** — "Repetir la misma semilla devuelve exactamente los mismos resultados. Útil para volver a mostrar una corrida en la defensa. Si la dejás vacía, se usa una al azar."

### 5.3 Panel de datos fijos

Un bloque de solo lectura, visualmente diferenciado (fondo tenue, sin bordes de input), con los datos del enunciado que **no son configurables**. Tres fichas:

| | Duración de la jornada | Tiempo de ensamble | Tiempo de cocción |
|---|---|---|---|
| Distribución | Constante (8 horas) | `U(25, 35)` minutos | `U(6, 10)` minutos |
| Fórmula | — | `X = 25 + RND × 10` | `X = 6 + RND × 4` |
| Media | — | 30,0 min | 8,0 min |
| Desvío estándar | — | 2,89 min | 1,15 min |
| Semirrango | — | ± 5,0 min | ± 2,0 min |

Las dos fichas de distribución las dibuja `components/configuracion/FichaDistribucion`, y **todos** esos números se derivan del `minimo`/`maximo` que viene en `parametros` mediante `utils/estadistica.ts`. Eso no viola la regla de no hardcodear los datos fijos: no se inventa ningún valor, se deriva uno de otro. Si el enunciado cambiara los rangos, la ficha se ajusta sola.

> **Por qué se muestran el desvío estándar y el semirrango juntos, y etiquetados.** El enunciado escribe "30 ± 5", donde ese 5 es el **semirrango** —la mitad del ancho del intervalo—, no el desvío estándar, que para `U(25, 35)` vale `10/√12 = 2,89`. Los dos números son correctos y describen cosas distintas. Mostrar uno solo invitaría a pensar que el otro está mal.

Debajo, una línea que aclare qué es RND: un número al azar entre 0 y 1, que la fórmula convierte en un tiempo dentro del intervalo.

Con una nota breve que explique **por qué** no se editan: son datos del enunciado, y los 480 minutos en particular son la condición que hace comparables los resultados entre distintos N (§4). Sin esa aclaración, el usuario los lee como campos rotos.

Los valores salen de `parametros` de la última respuesta si existe; si es la primera corrida, de constantes del frontend que replican el enunciado.

---

## 6. Pantalla 2 — Simulando

### 6.1 Comportamiento del progreso

**La barra la anima el frontend, no el backend.** El backend responde en milisegundos, así que un progreso real sería un parpadeo imperceptible. Decisión tomada:

- La barra avanza de **0 a 99 % en 3000 ms** con curva ease-out.
- Al llegar a 99 % **se detiene y espera**.
- Cuando la respuesta de axios llega: si ya transcurrieron los 3 s, la barra salta a 100 % y se pasa a resultados; si no, se espera a completar los 3 s.
- **Nunca se transiciona antes de los 3 segundos**, aunque la respuesta llegue en 40 ms.
- Si el backend tarda más de 3 s, la barra **queda en 99 %** hasta que lleguen los resultados. No vuelve atrás, no se reinicia, no simula avance falso más allá de 99.

Esto vive en `hooks/useProgresoSimulado.ts`, que expone el porcentaje actual y una bandera de "listo para transicionar".

> ⚠️ **Los contadores "N = 4 de 6" y "Réplica 18 / 30" son estimados**, derivados del porcentaje y de los parámetros que ingresó el usuario. **No vienen del backend.** Está documentado acá para que nadie los interprete después como progreso real ni construya lógica sobre ellos. Si en el futuro se quiere progreso real, hay que cambiar el backend a streaming (SSE) — ver la nota en `Claude.md`.

### 6.2 Ilustración

Composición **SVG dibujada a medida**, con estética pixel-art / de bloques:

- Tres piezas cúbicas que **saltan alternadas** (mismo keyframe con `animation-delay` escalonado: 0 ms, 150 ms, 300 ms) y avanzan hacia el horno.
- Un horno de bloques cuya **llama pulsa** con un keyframe propio de opacidad y escala.
- Debajo, la barra de progreso, el porcentaje y los contadores.
- Texto de encabezado que dé contexto de la magnitud: "Simulando 180 jornadas de 8 horas…" (calculado como `(n_maximo − n_minimo + 1) × replicas`).

Restricciones firmes:

- **Sin emojis.** Ni en la ilustración ni en los textos de la interfaz. Los iconos son SVG: `lucide-react` para la interfaz, componentes propios para la ilustración.
- **Sin assets de Minecraft ni de ningún tercero.** Los sprites y texturas de Minecraft son propiedad de Mojang y no pueden incluirse en el trabajo. Se toma la **estética** de bloques —píxeles grandes, bordes duros, paleta acotada, sin degradados— pero todo el arte se dibuja desde cero como `<rect>` en SVG.
- Las animaciones se definen como `keyframes` en `tailwind.config.js`, no como CSS suelto en los componentes.
- **Respetar `prefers-reduced-motion`**: con la preferencia activada, se muestra la ilustración estática y la barra sin transición animada.

### 6.3 Cancelar

Botón "Cancelar" que aborta la petición (`AbortController` de axios) y vuelve a la pantalla 1 con los parámetros intactos.

---

## 7. Pantalla 3 — Resultados

El orden de la pantalla está dictado por §13. **La conclusión va primero**: el usuario no debería tener que buscar el dato importante.

### 7.1 Orden vertical

**1. `TarjetaNOptimo` — la conclusión (§13.3)**

Bloque destacado, en la parte superior. Es una afirmación, no una fila de tabla: tipografía grande, color de acento, separado del resto. Y **explica cada número que muestra** — un promedio de 56,33 piezas no se entiende solo.

> **CONCLUSIÓN**
> # N óptimo: 6 ensambladores
> Con 6 ensambladores por horno se completan **56 piezas** en una jornada de 480 minutos.
>
> - **Producción real: 56 piezas.** Es el promedio 56,33 truncado: la pieza siguiente queda a medio cocinar cuando termina la jornada, y una pieza incompleta no se entrega.
> - **Promedio de las réplicas: 56,33 piezas.** No es lo que se ve un día concreto — ningún día se produce una fracción de pieza. Es el promedio de 30 jornadas simuladas, cada una con tiempos distintos.
> - **Utilización del horno: 94,5 %.** El horno trabaja 453,7 de los 480 minutos. Los 26,3 minutos ociosos son el arranque: el sistema empieza vacío y el horno no tiene nada que cocinar hasta que el primer ensamblador termina su pieza.
> - **Por qué no 5:** con 5 ensambladores se completan 53 piezas, 2,53 menos por jornada.
> - **Por qué no más de 6:** pasar de 5 a 6 suma 2,53 piezas; pasar de 6 a 7 suma 0,00, menos que la ganancia mínima de 1 configurada. A partir de acá el horno es el cuello de botella: los ensambladores de más solo hacen cola.

La última viñeta **cambia según el criterio**: con capacidad del horno explica el techo de 94,8 %; con umbral manual compara contra el umbral configurado.

> **El promedio se muestra con dos decimales, no con uno.** Con un decimal, un promedio de 56,96 se mostraría como "57,0 truncado a 56" y parecería un error de la aplicación.

**Cuando `alcanzo_criterio` es `false`**, en ese mismo lugar va un aviso, no una conclusión falsa. El motivo **no es el mismo en los tres criterios** y el mensaje tiene que decir cuál es, porque la acción a tomar también cambia:

| Criterio | Caso | Mensaje |
|---|---|---|
| Máxima producción | rango 1–6 | *"La producción todavía crece en N = 6. Para saber si N = 6 es el óptimo hace falta simular al menos N = 7: el último N del rango no se puede evaluar, porque este criterio compara cada N con el siguiente y ese no existe todavía."* |
| Capacidad del horno | rango 1–4 | *"Ningún N del rango satura el horno. La utilización más alta es 76,4 %, lejos del techo de 94,8 %."* |
| Umbral manual | umbral 97 % | *"Ese umbral es inalcanzable en este modelo: el techo es 94,8 %, porque el horno arranca vacío. Bajá el umbral por debajo de ese valor."* |

Este caso está previsto en §10.2. Debe verse distinto (color de advertencia, ícono `AlertTriangle`) y ofrecer un atajo para volver al formulario con el N máximo aumentado.

**2. `ResumenParametros` — qué se configuró (§13.1)**

Fila de tags descriptivos, **no números sueltos**:

`Rango explorado: N=1 a N=8` · `Réplicas por N: 30` · `Umbral de saturación: 94%` · `Jornada: 480 min` · `Semilla: 12345`

Cada tag lleva su etiqueta adentro. El usuario tiene que poder identificar de un vistazo qué configuración generó lo que está viendo.

**3. Los dos gráficos (§10.2, §13.2)**

`GraficoProduccion` y `GraficoUtilizacion`, **separados y apilados, en ese orden**. Producción va primero porque es la magnitud que el enunciado pide maximizar (§2).

| | Gráfico 1 | Gráfico 2 |
|---|---|---|
| Título | "Piezas terminadas" | "Utilización del horno" |
| Eje X | `N (ensambladores)` | `N (ensambladores)` |
| Eje Y | `Piezas terminadas (promedio)` | `Utilización del horno (%)`, escala 0-100 |
| Marca | `ReferenceDot` sobre el N óptimo | `ReferenceDot` sobre el N óptimo + `ReferenceLine` horizontal punteada |

**Los subtítulos dependen del criterio**, porque cuál de los dos "decide" cambia:

| Criterio | Subtítulo de Piezas | Subtítulo de Utilización |
|---|---|---|
| Máxima producción | "Es el gráfico que define el N óptimo: se busca dónde la curva deja de subir." | "Explica por qué la producción se aplana: a partir del N óptimo, el horno ya no tiene tiempo libre." |
| Capacidad del horno | "Verificación: la producción debería aplanarse en el mismo N en que se satura el horno." | "Es el gráfico que define el N óptimo: se busca dónde la curva llega al techo del sistema." |
| Umbral manual | ídem anterior | "Es el gráfico que define el N óptimo: se busca dónde la curva se aplana cerca del umbral." |

**La `ReferenceLine` del gráfico de utilización también depende del criterio**: el umbral configurado con el criterio manual, y el techo del sistema (94,8 %) con los otros dos. Dibujar "Umbral 94 %" en una corrida decidida por producción daría a entender que ese número intervino en el resultado, y no fue así.

**Prohibido combinarlos** en un único gráfico con doble eje Y: §13.2 lo desaconseja explícitamente porque dificulta la lectura. Tampoco se agregan series extra que no aporten a la decisión.

Los `ReferenceDot` llevan `label` con el valor, para que ubicar el N óptimo no requiera cruzar con la tabla. El tooltip muestra los valores con unidad. Si `n_optimo` es `null`, se omiten las marcas.

**4. Detalle, plegado por defecto (§13.4)**

Dos `Acordeon` cerrados al cargar la pantalla. La vista principal muestra solo lo necesario para decidir; el resto queda disponible pero fuera del camino.

- **"Ver tabla completa"** → `TablaResultados`: una fila por N con utilización promedio, piezas promedio, tiempo de horno ocupado, y los desvíos. La fila del N óptimo resaltada.
- **"Ver estadísticas del programa"** → `PanelComputo` (ver 7.2).

**5. Botones de cierre**

- **"Ver vector de estado"** → abre la pantalla 4 (§8). Es una pantalla aparte y no un tercer acordeón porque la tabla es mucho más ancha que el resto de la interfaz.
- **"Nueva simulación"** → vuelve a la pantalla 1 **conservando los parámetros de la corrida anterior** precargados, para poder ajustar uno solo y volver a correr.

### 7.2 `PanelComputo` — números traducidos a lenguaje simple

§12 pide registrar el desempeño del programa, pero el usuario final no tiene que leer nombres de campos. El backend devuelve magnitudes crudas y **el frontend arma las frases**. Mapeo:

| Campo de la API | Cómo se muestra |
|---|---|
| `tiempo_total_ms` | "La simulación tardó **0,04 segundos** en total" |
| `tiempo_promedio_replica_ms` | "Cada jornada simulada tardó en promedio **0,23 milisegundos**" |
| `memoria_pico_mb` | "Memoria usada: **38 MB**" |
| `cpu_porcentaje` | "Uso de procesador: **13 %**", vía `formatearUsoProcesador`, **acotado a [0, 100]** |
| `tiempo_por_n[]` | Mini tabla "Cuánto tardó cada configuración": N → tiempo |

> ⚠️ **`cpu_porcentaje` puede venir por encima de 100.** `psutil.Process.cpu_percent()` suma el uso de **todos los núcleos**, así que en una máquina multinúcleo devuelve legítimamente `101.6` o `150`. El número del backend no está mal, pero mostrarlo tal cual se lee como un error del programa. El recorte es de **presentación** y vive solo en `formatearUsoProcesador` (`utils/formato.ts`): el backend sigue informando el valor crudo, que es el correcto. No "arreglar" esto en el backend.

Debajo, una línea de cierre que conecte con el propósito de §12:

> Estas cifras sirven para elegir R: si aumentar las réplicas encarece mucho el tiempo de corrida, hay que balancear precisión estadística contra tiempo disponible.

Regla de formato: si `tiempo_total_ms < 1000`, mostrar en milisegundos; si no, en segundos. Nunca mostrar `41.8` sin unidad ni contexto.

### 7.3 Formato numérico

Todo centralizado en `utils/formato.ts`, con locale `es-AR`: **coma decimal**, utilización a un decimal en porcentaje (`97,1 %`), piezas a un decimal (`58,2`), tiempos según la regla de arriba. Ningún componente formatea números por su cuenta.

---

## 8. Pantalla 4 — Vector de estado

Es lo que se muestra cuando alguien pregunta por una línea puntual de la corrida. Cada fila es **un evento** de la simulación, en orden cronológico, con las columnas de la planilla `Ejercicio 135 Final Planteo.ods`.

### 8.1 Selección de la jornada

Arriba, dos desplegables (`SelectorNyReplica`): **N** (de `n_minimo` a `n_maximo`, con el N óptimo marcado en su etiqueta) y **réplica** (de 1 a `replicas`). Son los dos ejes del experimento: cuál configuración y cuál de sus R jornadas.

N arranca en `n_optimo` si existe — es la configuración de la que probablemente se quiera hablar — y en `n_minimo` si ningún N alcanzó el umbral. La réplica arranca en 1.

Debajo, una línea que aclara que la jornada se reconstruye desde la semilla, para que quede explícito que estas filas son exactamente las que produjeron los promedios de la pantalla anterior.

### 8.2 La tabla

Encabezado de **dos niveles**, como la planilla:

| Nivel 1 | R | Iter. | Evento | Reloj | Fin Ensamble *i* (×N) | Fin Cocción | Horno | Contador | Piezas |
|---|---|---|---|---|---|---|---|---|---|
| Nivel 2 | | | | | RND · tpo · min fin ens. · Estado | RND · tpo · min fin cocc. | Estado · Cola | | 1 · 2 · … · k |

Ancho total: `4 + 4·N + 3 + 2 + 1 + total_piezas` columnas. Con N = 6 y 59 piezas son **93 columnas**, así que la tabla vive dentro de un `overflow-x-auto`. La pantalla usa el contenedor ancho (§4).

Con **N = 1** la tabla queda idéntica a la planilla (28 columnas), y el encabezado dice "Fin Ensamble" sin número.

Detalles de presentación:

- **`R` e `Iter.` van en las dos primeras columnas de cada fila.** El requisito es poder identificar en qué réplica y en qué iteración se está parado sin salir de la fila.
- Los estados de pieza se abrevian (`Ens.`, `Cola`, `Coc.`, `Term.`) con color y con el nombre completo en el `title`, más una **referencia debajo de la tabla**. Con ~60 columnas, escribir "Ensamblándose" en cada celda haría la tabla ilegible.
- Las piezas que todavía no nacieron en esa fila se dibujan con `—` en gris claro, no vacías: la ausencia tiene que verse como un dato.
- `Evento` y los estados van en tipografía normal; los números, en `font-mono tabular-nums` para que las columnas se alineen.

### 8.3 Paginación

**20 filas por página** (`FILAS_POR_PAGINA` en `hooks/usePaginacion.ts`), con botones Anterior / Siguiente y el texto "Filas 21–40 de 110 (página 2 de 6)". Los botones se deshabilitan en los extremos.

La paginación es **en memoria**: el backend devuelve la réplica completa (unas cien filas) en una sola respuesta. Al cambiar N o réplica vuelve sola a la página 1.

### 8.4 Carga y errores

`useVectorEstado` deriva `cargando` comparando la réplica que se está pidiendo contra la que devolvió la última respuesta, en vez de llevar una bandera aparte. Eso hace imposible que una respuesta vieja que llega tarde se muestre como si fuera la de la selección actual. Mientras carga, los selectores quedan deshabilitados y se muestra "Reconstruyendo la jornada…".

---

## 9. Tema visual

Configurado en `tailwind.config.js`, no en CSS suelto.

**Solo modo claro.** No hay selector de tema ni variantes `dark:` — decisión tomada para simplificar y porque el trabajo se proyecta en aula. **No escribir clases `dark:` en ningún componente**: quedarían muertas y darían falsa impresión de que el soporte existe.

Paleta industrial:

```js
colors: {
  horno: { 400: '#fb923c', 500: '#f97316', 600: '#ea580c' },  // acento
  base:  { 50: '#f8fafc', 100: '#f1f5f9', /* … */ 900: '#0f172a' },
  ok:     '#16a34a',
  alerta: '#dc2626',
}
```

- El **naranja horno** es el color de acento: botón principal, la curva de utilización, el `ReferenceDot` del N óptimo, la llama de la ilustración. Usarlo con criterio — si todo es naranja, nada resalta.
- Los **grises `base`** para superficies, bordes y texto.
- `ok` y `alerta` solo para el estado del resultado (umbral alcanzado / no alcanzado).

También en el tema:

- `keyframes` y `animation` propios: salto de pieza (con delays escalonados), pulso de llama, avance de la barra.
- Tipografía: una sans-serif del sistema para la interfaz; opcionalmente una monoespaciada para los números de la tabla, que alinea mejor las columnas.

**Los colores de las series de Recharts salen del tema**, no se hardcodean en los componentes de gráfico. Exportarlos como constantes desde un único archivo para que gráfico e ilustración compartan paleta.

---

## 10. Capa de API y manejo de errores

`api/client.ts` — instancia única de axios:

- `baseURL` desde variable de entorno de Vite (`VITE_API_URL`), con `http://localhost:8000` por defecto.
- `timeout` generoso (60 s): con R alto la corrida puede tardar de verdad.
- Interceptor de respuesta que normaliza el error a una forma única `{ tipo, mensaje }`, distinguiendo:
  - **`'validacion'`** (`422`) → se muestra el `detail` del backend **tal cual**, ya viene redactado en español para el usuario.
  - **`'red'`** (sin respuesta) → "No se pudo conectar con el servidor. Verificá que el backend esté corriendo en el puerto 8000."
  - **`'servidor'`** (`5xx`) → mensaje genérico más sugerencia de reintentar.

`api/simulacion.ts` — funciones tipadas (`ejecutarSimulacion`, `verificarSalud`). Es también donde ocurre la conversión de umbral porcentaje ↔ fracción, para que ningún componente tenga que acordarse.

El estado de error se muestra en la pantalla 1, sobre el formulario, no en una pantalla aparte: el usuario tiene que poder corregir y reintentar sin perder lo que escribió.

---

## 11. Convenciones

- **Idioma**: interfaz, comentarios y nombres de componentes en español (`TarjetaNOptimo`, `GraficoUtilizacion`, `BarraProgreso`). Los campos que vienen de la API conservan su nombre del contrato (`utilizacion_promedio`), sin renombrarlos al mapear.
- **Tildes obligatorias** en todo texto visible: "Simulación", "Réplicas", "Utilización", "óptimo".
- Componentes funcionales con props tipadas mediante `interface`. Sin `any`.
- Un componente por archivo, con el nombre del archivo igual al del componente.
- Accesibilidad mínima: `label` asociado a cada input, `aria-label` en los botones que solo tienen ícono, y `role="progressbar"` con `aria-valuenow` en la barra.
- Nada de estado global (Redux, Zustand): tres pantallas y un objeto de resultado no lo justifican. El estado vive en `App.tsx` y baja por props.

---

## 12. Puesta en marcha

```bash
cd Frontend
npm install
npm install -D tailwindcss@3 postcss autoprefixer
npm install axios recharts lucide-react
npm run dev          # http://localhost:5173
```

Verificación estática antes de dar algo por terminado:

```bash
npm run build        # incluye el chequeo de tipos (tsc -b)
npm run lint         # ESLint
```

Requiere el backend corriendo en `http://localhost:8000` (ver `Backend.md`). El origen de Vite debe estar permitido en el CORS del backend.
