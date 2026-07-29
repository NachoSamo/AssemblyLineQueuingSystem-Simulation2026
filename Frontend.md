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
    │   └── simulacion.ts           # Funciones de la API: ejecutarSimulacion(), verificarSalud()
    │
    ├── types/
    │   └── simulacion.ts           # Tipos espejo EXACTOS del contrato de la API
    │
    ├── pages/
    │   ├── ConfiguracionPage.tsx   # Pantalla 1: formulario de parámetros
    │   ├── SimulandoPage.tsx       # Pantalla 2: ilustración + barra de progreso
    │   └── ResultadosPage.tsx      # Pantalla 3: conclusión, gráficos y detalle
    │
    ├── components/
    │   ├── ui/                     # Primitivas reutilizables, sin conocimiento del dominio
    │   │   ├── Boton.tsx
    │   │   ├── CampoNumerico.tsx
    │   │   ├── Tarjeta.tsx
    │   │   ├── Tag.tsx
    │   │   ├── Acordeon.tsx
    │   │   └── Ayuda.tsx
    │   ├── animacion/
    │   │   ├── HornoPixel.tsx
    │   │   ├── PiezaPixel.tsx
    │   │   └── BarraProgreso.tsx
    │   └── resultados/
    │       ├── TarjetaNOptimo.tsx
    │       ├── ResumenParametros.tsx
    │       ├── GraficoUtilizacion.tsx
    │       ├── GraficoProduccion.tsx
    │       ├── TablaResultados.tsx
    │       └── PanelComputo.tsx
    │
    ├── hooks/
    │   ├── useSimulacion.ts        # Dispara la llamada y expone estado / resultado / error
    │   └── useProgresoSimulado.ts  # Progreso animado de la pantalla 2
    │
    ├── utils/
    │   └── formato.ts              # Porcentajes, decimales, duraciones — todo en es-AR
    │
    └── styles/
        └── index.css               # Directivas de Tailwind y estilos base
```

### 2.1 Criterio de división de componentes

- **`components/ui/`** — primitivas sin conocimiento del dominio. `Tarjeta` no sabe qué es un horno; recibe `children`. Son las piezas reutilizables del sistema.
- **`components/animacion/`** y **`components/resultados/`** — componentes de dominio: sí saben qué muestran, pero **no** hacen llamadas HTTP ni manejan estado global. Reciben datos por props.
- **`pages/`** — componen los anteriores y reciben del `App` los datos y los callbacks de navegación. Tampoco llaman a la API directamente: eso lo hace el hook.
- **`hooks/`** — el único lugar donde se orquesta el flujo asincrónico.

Regla práctica: si un componente importa `axios`, está mal ubicado.

---

## 3. Contrato de la API

> Este contrato debe ser **idéntico** al declarado en `Backend.md`.
> `src/types/simulacion.ts` es su traducción literal a TypeScript. Si cambia uno, cambian los tres en el mismo cambio.

Un solo endpoint síncrono: `POST /api/simulaciones`.

**Request**

```json
{
  "n_minimo": 1,
  "n_maximo": 8,
  "replicas": 30,
  "umbral_utilizacion": 0.94,
  "semilla": 12345
}
```

`umbral_utilizacion` viaja como **fracción** (0.94), no como porcentaje. `semilla` puede ser `null`.

**Response `200`**

```json
{
  "parametros": {
    "n_minimo": 1,
    "n_maximo": 8,
    "replicas": 30,
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
  "alcanzo_umbral": true,
  "utilizacion_n_optimo": 0.9452,
  "piezas_n_optimo": 56.33,
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
- **`n_optimo` puede ser `null`.** Ver la sección 6.1 de este documento.

**Errores**: `422` con `{ "detail": "<mensaje en español>" }` ya redactado para el usuario — se muestra tal cual, sin reescribirlo. `500` para errores inesperados. `GET /api/salud` permite distinguir "backend caído" de "parámetros inválidos".

`src/types/simulacion.ts` define además `SimulacionRequest` y todos los tipos anidados. Nada de `any` ni de `as` sobre la respuesta.

---

## 4. Flujo de la aplicación

`App.tsx` mantiene una máquina de estados simple:

```
'configuracion'  →  'simulando'  →  'resultados'
                          ↓
                       'error'  →  (volver a 'configuracion')
```

**Sin `react-router`.** Es un flujo lineal de tres pantallas, sin URLs que compartir ni navegación hacia atrás del browser. Agregar un router sumaría dependencia y ceremonia sin beneficio.

El `App` conserva los últimos parámetros enviados, para poder mostrarlos durante la espera y para precargar el formulario al volver.

---

## 5. Pantalla 1 — Configuración

Formulario con los parámetros configurables y un botón **"Iniciar simulación"**.

### 5.1 Campos editables

| Campo | Tipo | Por defecto | Validación en cliente |
|---|---|---|---|
| N mínimo | entero | 1 | `>= 1` |
| N máximo | entero | **8** | `>= N mínimo` |

> **Por qué el default de N máximo es 8 y no 6.** La curva se aplana en N=6. Si el rango terminara justo ahí, el gráfico mostraría una curva que sube hasta el último punto y el aplanamiento no se vería — que es exactamente el modo de falla que advierte `Dominio.md` §10.2. Con el rango hasta 8 quedan tres puntos en la meseta (N=6, 7 y 8, todos ~0,945) y el óptimo se lee de un vistazo.

| Réplicas por N (R) | entero | 30 | `>= 1` |
| Umbral de utilización | porcentaje | **94 %** | entre 1 y 100 |
| Semilla (opcional) | entero o vacío | vacío | entero si se completa |

El umbral se muestra al usuario **en porcentaje** (94) y se envía al backend **como fracción** (0.94). La conversión ocurre en `api/simulacion.ts`, en un solo lugar.

> **Por qué 94 % y no 95 %.** La utilización de este modelo tiene un techo alcanzable de ~94,8 %: el sistema arranca vacío (`Dominio.md` §4) y el horno queda ocioso ~25 min hasta el primer Fin Ensamble, ocio que ningún N puede eliminar. Con un umbral del 95 % **ningún N calificaría nunca** y la pantalla de resultados mostraría siempre el aviso de ampliar el rango. Con 94 % el N óptimo es 6, que es donde se aplanan ambas curvas. La demostración está en la nota de `Dominio.md` §10.1. **No subir este default sin leerla.**

La validación del cliente es solo para dar respuesta inmediata; la validación real es la del backend, y sus mensajes se muestran si llegan.

### 5.2 Textos de ayuda (§13.1)

Cada campo lleva su explicación en lenguaje llano, accesible con el componente `Ayuda` (ícono `Info` de lucide + tooltip o texto debajo del campo). El usuario tiene que entender qué está configurando sin haber leído el dominio. Textos:

- **N mínimo / N máximo** — "Rango de cantidades de ensambladores a probar. Si los resultados no se aplanan, ampliá el máximo."
- **Réplicas por N (R)** — "Cuántas jornadas de 8 horas se simulan para cada N. Como los tiempos son al azar, un solo día puede dar un resultado atípico; por eso se promedian R días. Más réplicas = resultado más confiable."
- **Umbral de utilización** — "A partir de qué nivel de uso se considera que el horno está saturado. Por defecto 94 %, que es prácticamente el máximo que este sistema puede alcanzar."
- **Semilla (opcional)** — "Repetir la misma semilla devuelve exactamente los mismos resultados. Útil para volver a mostrar una corrida en la defensa. Si la dejás vacía, se usa una al azar."

### 5.3 Panel de datos fijos

Un bloque de solo lectura, visualmente diferenciado (fondo tenue, sin bordes de input), con los datos del enunciado que **no son configurables**:

- Duración de la jornada: 480 minutos (8 horas)
- Tiempo de ensamble: uniforme entre 25 y 35 minutos (30 ± 5)
- Tiempo de cocción: uniforme entre 6 y 10 minutos (8 ± 2)

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

Bloque destacado, en la parte superior, con la conclusión en lenguaje simple:

> **N óptimo encontrado: 4 ensambladores**
> Utilización del horno: 97 % · Producción: 58,2 piezas por jornada

Es una afirmación, no una fila de tabla. Tipografía grande, color de acento, separado del resto.

**Cuando `alcanzo_umbral` es `false`**, en ese mismo lugar va un aviso, no una conclusión falsa:

> **Ningún N del rango alcanzó el umbral de 94 %**
> La utilización sigue creciendo en N = 6. Ampliá el N máximo (probá 8 o 10) para encontrar dónde se satura el horno.

Este caso está previsto explícitamente en §10.2 y es el que ocurre si el usuario corre con un rango corto. Debe verse distinto (color de advertencia, ícono `AlertTriangle`) y ofrecer un atajo para volver al formulario con el N máximo aumentado.

**2. `ResumenParametros` — qué se configuró (§13.1)**

Fila de tags descriptivos, **no números sueltos**:

`Rango explorado: N=1 a N=8` · `Réplicas por N: 30` · `Umbral de saturación: 94%` · `Jornada: 480 min` · `Semilla: 12345`

Cada tag lleva su etiqueta adentro. El usuario tiene que poder identificar de un vistazo qué configuración generó lo que está viendo.

**3. Los dos gráficos (§10.2, §13.2)**

`GraficoUtilizacion` y `GraficoProduccion`, **separados y apilados**. Ambos:

| | Gráfico 1 | Gráfico 2 |
|---|---|---|
| Título | "Utilización del horno" | "Piezas terminadas" |
| Subtítulo | "Es el gráfico que define el N óptimo: se busca dónde la curva se aplana cerca del umbral." | "Verificación: debería aplanarse en el mismo N que el gráfico anterior." |
| Eje X | `N (ensambladores)` | `N (ensambladores)` |
| Eje Y | `Utilización del horno (%)`, escala 0-100 | `Piezas terminadas (promedio)` |
| Marca | `ReferenceDot` sobre el N óptimo + `ReferenceLine` horizontal punteada en el umbral | `ReferenceDot` sobre el N óptimo |

**Prohibido combinarlos** en un único gráfico con doble eje Y: §13.2 lo desaconseja explícitamente porque dificulta la lectura. Tampoco se agregan series extra que no aporten a la decisión.

Los `ReferenceDot` llevan `label` con el valor, para que ubicar el N óptimo no requiera cruzar con la tabla. El tooltip muestra los valores con unidad. Si `n_optimo` es `null`, se omiten las marcas.

**4. Detalle, plegado por defecto (§13.4)**

Dos `Acordeon` cerrados al cargar la pantalla. La vista principal muestra solo lo necesario para decidir; el resto queda disponible pero fuera del camino.

- **"Ver tabla completa"** → `TablaResultados`: una fila por N con utilización promedio, piezas promedio, tiempo de horno ocupado, y los desvíos. La fila del N óptimo resaltada.
- **"Ver estadísticas del programa"** → `PanelComputo` (ver 7.2).

**5. Botón "Nueva simulación"**

Vuelve a la pantalla 1 **conservando los parámetros de la corrida anterior** precargados, para poder ajustar uno solo y volver a correr.

### 7.2 `PanelComputo` — números traducidos a lenguaje simple

§12 pide registrar el desempeño del programa, pero el usuario final no tiene que leer nombres de campos. El backend devuelve magnitudes crudas y **el frontend arma las frases**. Mapeo:

| Campo de la API | Cómo se muestra |
|---|---|
| `tiempo_total_ms` | "La simulación tardó **0,04 segundos** en total" |
| `tiempo_promedio_replica_ms` | "Cada jornada simulada tardó en promedio **0,23 milisegundos**" |
| `memoria_pico_mb` | "Memoria usada: **38 MB**" |
| `cpu_porcentaje` | "Uso de procesador: **13 %**" |
| `tiempo_por_n[]` | Mini tabla "Cuánto tardó cada configuración": N → tiempo |

Debajo, una línea de cierre que conecte con el propósito de §12:

> Estas cifras sirven para elegir R: si aumentar las réplicas encarece mucho el tiempo de corrida, hay que balancear precisión estadística contra tiempo disponible.

Regla de formato: si `tiempo_total_ms < 1000`, mostrar en milisegundos; si no, en segundos. Nunca mostrar `41.8` sin unidad ni contexto.

### 7.3 Formato numérico

Todo centralizado en `utils/formato.ts`, con locale `es-AR`: **coma decimal**, utilización a un decimal en porcentaje (`97,1 %`), piezas a un decimal (`58,2`), tiempos según la regla de arriba. Ningún componente formatea números por su cuenta.

---

## 8. Tema visual

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

## 9. Capa de API y manejo de errores

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

## 10. Convenciones

- **Idioma**: interfaz, comentarios y nombres de componentes en español (`TarjetaNOptimo`, `GraficoUtilizacion`, `BarraProgreso`). Los campos que vienen de la API conservan su nombre del contrato (`utilizacion_promedio`), sin renombrarlos al mapear.
- **Tildes obligatorias** en todo texto visible: "Simulación", "Réplicas", "Utilización", "óptimo".
- Componentes funcionales con props tipadas mediante `interface`. Sin `any`.
- Un componente por archivo, con el nombre del archivo igual al del componente.
- Accesibilidad mínima: `label` asociado a cada input, `aria-label` en los botones que solo tienen ícono, y `role="progressbar"` con `aria-valuenow` en la barra.
- Nada de estado global (Redux, Zustand): tres pantallas y un objeto de resultado no lo justifican. El estado vive en `App.tsx` y baja por props.

---

## 11. Puesta en marcha

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
