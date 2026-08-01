# Backend — consideraciones generales

Lineamientos para implementar el backend de la simulación del Ejercicio 135.
Este documento define **estructura, responsabilidades y contrato de API**. No contiene la implementación.

> **Fuente de verdad**: `Dominio.md` (raíz del repo). Toda referencia con `§` apunta a una sección de ese archivo.
> Ante cualquier conflicto entre este documento y `Dominio.md`, manda `Dominio.md`.

---

## 1. Stack

| Componente | Elección | Para qué |
|---|---|---|
| Lenguaje | Python 3.11+ | Base |
| Framework HTTP | FastAPI | API REST + validación + OpenAPI automático |
| Servidor ASGI | uvicorn | Ejecución |
| Cálculo | NumPy | Generación de RND en lote y agregación estadística |
| Validación / serialización | Pydantic v2 | Request y response tipados |
| Métricas de proceso | psutil | Memoria y CPU (§12) |

`requirements.txt`:

```
fastapi
uvicorn[standard]
numpy
pydantic
psutil
```

**Sin tests por el momento** (decisión explícita del proyecto).

---

## 2. Estructura de carpetas

```
Backend/
├── app/
│   ├── __init__.py
│   ├── main.py                        # Punto de entrada: app FastAPI, CORS, montaje de routers
│   ├── config.py                      # Constantes de configuración del servicio (origen CORS, puerto)
│   │
│   ├── controllers/                   # Capa HTTP. Traduce petición ↔ servicio. Sin lógica de negocio
│   │   ├── __init__.py
│   │   └── simulacion_controller.py
│   │
│   ├── services/                      # Capa de negocio. Toda la lógica de la simulación vive acá
│   │   ├── __init__.py
│   │   ├── motor_simulacion.py
│   │   ├── experimento_service.py
│   │   ├── criterios.py
│   │   ├── vector_estado_service.py
│   │   └── metricas_computo.py
│   │
│   ├── models/                        # Esquemas Pydantic del contrato de API
│   │   ├── __init__.py
│   │   ├── request.py
│   │   └── response.py
│   │
│   └── utils/                         # Auxiliares puros y sin estado
│       ├── __init__.py
│       ├── constantes.py
│       └── generadores.py
└── requirements.txt
```

### 2.1 Responsabilidad de cada archivo

| Archivo | Qué hace | Qué NO hace |
|---|---|---|
| `main.py` | Crea la instancia `FastAPI`, aplica el middleware de CORS hacia el frontend, incluye los routers de `controllers/`, define metadatos de OpenAPI (título, descripción, versión). | No define endpoints ni lógica. |
| `config.py` | Valores de configuración del servicio: origen permitido por CORS, host y puerto por defecto, prefijo de la API (`/api`). Lee variables de entorno con valores por defecto sensatos. | No guarda parámetros del modelo de simulación (esos van en `utils/constantes.py`). |
| `controllers/simulacion_controller.py` | Un `APIRouter` con `POST /api/simulaciones`, `POST /api/simulaciones/vector-estado` y `GET /api/salud`. Recibe el modelo de request ya validado por Pydantic, llama al servicio, devuelve el modelo de response. Traduce excepciones de dominio a códigos HTTP. | **No contiene una sola línea de lógica de simulación.** Si acá aparece la palabra `reloj`, algo está mal ubicado. |
| `services/motor_simulacion.py` | El corazón del sistema. Ejecuta **una** réplica: una jornada completa de 480 minutos para un N dado. Implementa el reloj, la lista de eventos futuros y los dos eventos de §6. Devuelve el resultado de esa réplica: tiempo de horno ocupado y piezas terminadas, y opcionalmente el **vector de estado** fila por fila (§4.8). | No sabe qué es FastAPI, ni JSON, ni HTTP. No recorre varios N ni varias réplicas. No pagina ni formatea el vector de estado: lo entrega crudo, en dataclasses puras. |
| `services/experimento_service.py` | El diseño experimental de §9-10. Recorre `N_mínimo..N_máximo`, ejecuta R réplicas por cada N llamando al motor, promedia con NumPy, calcula desvíos y arma la conclusión. Orquesta también la medición de tiempos delegando en `metricas_computo`. | No implementa la lógica de eventos (eso es del motor). **No decide cuál es el N óptimo** (eso es de `criterios.py`). No pide la traza: el barrido corre sin trazar. |
| `services/criterios.py` | Los tres criterios del N óptimo (§10): máxima producción, capacidad del horno y umbral manual. Una función por criterio, sin estado. Es la parte que se defiende ante la cátedra cuando preguntan "¿por qué decís que el óptimo es 6?". | No simula, no promedia, no conoce FastAPI ni Pydantic. Recibe la tabla ya agregada y devuelve un entero. |
| `services/vector_estado_service.py` | Reconstruye **una** réplica puntual: dado (semilla, `n_minimo`, `replicas`, N, réplica) recalcula esa jornada pidiéndole la traza al motor y la traduce al diccionario del contrato (§3.2). | No barre N, no promedia, no calcula el N óptimo, no pagina (eso es del frontend) y no sabe nada de HTTP. |
| `services/metricas_computo.py` | Estadísticas del programa como software (§12): cronómetro por réplica, acumulado por N y total de la corrida; pico de memoria y uso de CPU vía `psutil`. Expone un context manager o similar para envolver bloques a medir. | No interpreta ni formatea los números para el usuario — eso lo hace el frontend. |
| `models/request.py` | `SimulacionRequest` y `VectorEstadoRequest` con sus validadores de campo y de modelo. Mensajes de error en español, redactados para mostrarse al usuario. | No tiene lógica de simulación. |
| `models/response.py` | `SimulacionResponse` y sus modelos anidados (`ParametrosCorrida`, `ResultadoPorN`, `EstadisticasComputo`, `RangoTiempo`, `TiempoPorN`), más `VectorEstadoResponse` con los suyos (`FilaVectorEstado`, `ColumnaEnsamblador`). | Ídem. |
| `utils/constantes.py` | Los datos fijos del enunciado: `DURACION_JORNADA = 480`, `ENSAMBLE_MINIMO = 25`, `ENSAMBLE_MAXIMO = 35`, `COCCION_MINIMO = 6`, `COCCION_MAXIMO = 10`. También el techo del sistema (`TECHO_UTILIZACION`, §10.1) y los identificadores de los tres criterios. | No se importa desde `models/request.py` como valores editables. |
| `utils/generadores.py` | Generación de variables aleatorias: `uniforme_con_rnd(minimo, maximo, rng)` aplicando `X = a + RND × (b − a)` (§3) y devolviendo **el RND junto con el valor** (lo necesita el vector de estado), `uniforme()` que delega en ella y descarta el RND, y la construcción/derivación de generadores `np.random.Generator` a partir de la semilla. | No conoce el dominio (no sabe qué es "ensamble" ni "cocción"; recibe `minimo` y `maximo`). |

### 2.2 Documentación exigida en el código

Cada archivo `.py` empieza con un **docstring de módulo** que responde tres cosas:

1. Qué hace este archivo.
2. A qué sección de `Dominio.md` corresponde.
3. Qué **no** le corresponde (para evitar que la lógica se filtre entre capas).

Cada carpeta lleva un `__init__.py` con un docstring de una o dos líneas describiendo la capa. Cada función pública lleva docstring con parámetros, retorno y unidades (siempre **minutos** para el tiempo simulado, **milisegundos** para el tiempo real de cómputo).

---

## 3. Contrato de la API

> Este contrato debe ser **idéntico** al declarado en `Frontend.md` y en `Frontend/src/types/simulacion.ts`.
> Si se modifica, se modifican los tres en el mismo cambio.

### 3.1 `POST /api/simulaciones`

Endpoint **síncrono**: ejecuta la corrida completa y devuelve todos los resultados en una sola respuesta. No hay streaming ni polling — la pantalla de progreso del frontend es una animación local (ver `Frontend.md`).

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

| Campo | Tipo | Regla | Notas |
|---|---|---|---|
| `n_minimo` | `int` | `>= 1` | Primer N del barrido |
| `n_maximo` | `int` | `>= n_minimo` | Último N del barrido |
| `replicas` | `int` | `>= 1` | R: jornadas simuladas por cada N (§9) |
| `criterio` | `str` | uno de tres | `"maxima_produccion"` (default), `"capacidad_horno"` o `"umbral_manual"` (§10) |
| `ganancia_minima` | `float` | `> 0` | Piezas. Solo lo usa `maxima_produccion`. Default `1.0` |
| `umbral_utilizacion` | `float` | `0 < x <= 1` | Fracción, no porcentaje. `0.94` = 94 % (§10). Solo lo usa `umbral_manual`. Obligatorio en el request |
| `semilla` | `int \| null` | opcional | `null` → semilla aleatoria del sistema |

`ganancia_minima` y `umbral_utilizacion` viajan **siempre**, aunque el criterio elegido use solo uno de los dos. Es a propósito: si fueran obligatorios de forma condicional, el formulario tendría que borrarlos y reponerlos al cambiar de modo, y una corrida podría fallar por un campo que el usuario ni siquiera tiene a la vista.

Conviene además un tope superior de guardia (`n_maximo <= 100`, `replicas <= 100000`) para que una entrada absurda no cuelgue el servidor. Al superarlo, `422` con un mensaje que indique el máximo permitido.

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

Detalle de los campos:

- `parametros` — eco de lo que envió el usuario **más** los datos fijos del enunciado. Existe para que el frontend pueda mostrar "con qué se corrió esto" (§13.1) sin recordar el request, y para que los valores fijos aparezcan en pantalla sin estar hardcodeados en el frontend.
- `resultados_por_n` — un elemento por cada N del rango, en orden ascendente. `utilizacion_promedio` es fracción (0 a 1); el frontend la convierte a porcentaje al mostrarla. Los desvíos estándar entre réplicas se incluyen para la tabla de detalle: permiten justificar si R fue suficiente.
- `n_optimo` — el N óptimo según el `criterio` elegido (§10). Es `null` si ningún N del rango lo satisface.
- `alcanzo_criterio` — `false` cuando ningún N del rango satisface el criterio. El frontend lo usa para mostrar el aviso correspondiente en vez de una conclusión falsa (§10.2). **El motivo del fallo es distinto según el criterio** y el mensaje tiene que decir cuál es.
- `utilizacion_n_optimo` / `piezas_n_optimo` — valores del N óptimo, para que la tarjeta de conclusión no tenga que buscarlos en el arreglo. `null` si `n_optimo` es `null`.
- `piezas_n_optimo_truncadas` — la producción **real**: el promedio truncado (§10.d). 56,33 de promedio son 56 piezas completas; la 57.ª queda a medio cocinar al cortar la jornada. Se calcula en el backend y no en el frontend porque es una afirmación de dominio, no un formato de presentación.
- `ganancia_n_optimo` — piezas que aportaría pasar del N óptimo al siguiente. Es lo que justifica el corte en la conclusión ("pasar de 6 a 7 suma 0,00 piezas"). `null` si no hay N óptimo **o si este es el último del rango**, porque no hay sucesor con qué compararlo.
- `utilizacion_maxima_rango` — mayor utilización observada en todo el rango. Sirve para explicar cuán lejos quedó el horno de saturarse cuando ningún N alcanza el criterio. Viene siempre, incluso sin N óptimo.
- `estadisticas_computo` — números crudos de §12. El backend **no** los formatea ni los redondea a texto: devuelve magnitudes con su unidad en el nombre del campo, y el frontend arma las frases legibles.

**Errores**

| Código | Cuándo | Cuerpo |
|---|---|---|
| `422` | Parámetros inválidos | `{ "detail": "<mensaje en español, mostrable al usuario>" }` |
| `500` | Error inesperado | `{ "detail": "Ocurrió un error al ejecutar la simulación." }` |

Los mensajes de validación se escriben pensando en el usuario final, no en el desarrollador: `"El N máximo debe ser mayor o igual que el N mínimo."`, no `"value_error: n_maximo < n_minimo"`.

> ⚠️ **`detail` es un string, y eso requiere trabajo extra.** Ante un error de validación, FastAPI devuelve por defecto `{"detail": [ {...}, {...} ]}` — una **lista de objetos**, no un string. Eso rompería al frontend, que espera texto listo para mostrar. Hace falta un handler propio de `RequestValidationError` que aplane los errores a un único string en español. Es el punto donde una reimplementación ingenua quiebra el contrato sin darse cuenta.

### 3.2 `POST /api/simulaciones/vector-estado`

Devuelve la tabla fila-por-evento de **una** jornada simulada, para poder mostrar en pantalla el vector de estado del enunciado (`Dominio.md` §5-7). Es un endpoint aparte, y no un campo más de §3.1, por una razón de tamaño: con N = 1..8 y R = 30 hay 240 réplicas y más de 21.000 filas de ~90 columnas. Mandarlas todas en cada corrida sería inútil, porque el usuario mira una réplica por vez.

**No guarda estado en el servidor.** Reconstruye la jornada a partir de la semilla: como las semillas se derivan de forma determinística por par (N, réplica), con los mismos `semilla`, `n_minimo` y `replicas` el resultado es exactamente la réplica que se promedió en la corrida. Recalcularla cuesta menos de un milisegundo.

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

| Campo | Tipo | Regla | Notas |
|---|---|---|---|
| `semilla` | `int` | **obligatoria** | La de la corrida que se está mirando (`parametros.semilla`). Sin ella no hay forma de reproducir la jornada |
| `n_minimo` | `int` | `>= 1` | El de esa corrida. Hace falta para reconstruir el índice de la réplica |
| `replicas` | `int` | `>= 1` | El R de esa corrida. Ídem |
| `n` | `int` | `>= n_minimo` | Cuál de las configuraciones se inspecciona |
| `replica` | `int` | `1 <= x <= replicas` | Numerada desde 1, como se muestra en pantalla |

Los cinco campos salen de `parametros`, la respuesta de §3.1 — no los tipea el usuario. Si alguno no coincide con la corrida en pantalla, se estaría mostrando otra simulación.

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

Detalle de los campos:

- Una fila es **un evento** del bucle, no una réplica. `iteracion` numera las filas dentro de la réplica: la 0 es la inicialización y la última es el corte en el minuto 480. `evento` vale `"Inicialización"`, `"Fin Ensamble i"`, `"Fin Cocción"` o `"Fin de la jornada"`.
- `ensambladores` tiene siempre `n` elementos, en orden 1..N. `rnd` y `tiempo` son `null` en las filas donde **ese** ensamblador no sorteó nada (en cada evento sortea como mucho uno; en la inicialización, todos). `fin_ensamble` es una columna de la lista de eventos futuros, así que **persiste** fila a fila y vale `null` cuando el ensamblador está esperando. Lo mismo aplica a `fin_coccion` respecto de `rnd_coccion`/`tiempo_coccion`.
- `piezas` es el estado de cada pieza creada **hasta esa fila**, en orden de creación: `"Ensamblándose"`, `"En cola"`, `"En cocción"` o `"Terminada"`. La lista **crece** a lo largo de la jornada, así que en las primeras filas es más corta que `total_piezas`; el frontend rellena las columnas faltantes.
- `total_piezas` es el largo de `piezas` en la última fila, y determina cuántas columnas de pieza dibujar. `total_replicas` viaja para que el frontend arme el selector de réplicas.
- El endpoint devuelve **todas** las filas de la réplica de una sola vez (unas cien, ~120 KB). Paginar es responsabilidad del frontend.

**Errores**: los mismos de §3.1, con el mismo formato de `detail`. Ejemplos: `"La réplica debe estar entre 1 y 30, que es la cantidad de réplicas de esta corrida."`, `"El N pedido no puede ser menor que el N mínimo de la corrida."`

### 3.3 `GET /api/salud`

Devuelve `{ "estado": "ok" }`. El frontend lo usa para distinguir "el backend está caído" de "los parámetros son inválidos".

---

## 4. El motor de simulación

Es la parte que hay que implementar con más cuidado, porque es lo que se defiende ante la cátedra.

### 4.1 Enfoque

**Bucle clásico de siguiente-evento**, fiel al modelo conceptual de §5-8 y a la planilla `Ejercicio 135 Final Planteo.ods`. NumPy se usa para:

- generar los números aleatorios en lote (`rng.random(size=...)`), evitando llamadas de a una;
- promediar y calcular desvíos entre réplicas al final.

**No se vectoriza el avance del reloj.** Se descartó la alternativa de hacer avanzar todas las réplicas en paralelo como arrays: sería más rápida, pero el código dejaría de parecerse al modelo conceptual y no se podría contrastar fila por fila contra el vector de estado de la planilla.

### 4.2 Regla de oro

`motor_simulacion.py` **no importa nada de FastAPI, Pydantic ni HTTP**. Debe poder ejecutarse desde un script suelto de cinco líneas para trazar una réplica y compararla contra la planilla. Si esa comparación deja de ser posible, el diseño se rompió.

### 4.3 Estado de una réplica

Siguiendo §5 y §7:

- `reloj` — minutos transcurridos.
- Horno: estado (libre/ocupado), `cola` (cantidad de piezas esperando, FIFO), `tiempo_horno_ocupado` acumulado.
- Por cada ensamblador: su próximo tiempo de Fin Ensamble (o "sin evento" si está esperando).
- Un único Fin Cocción pendiente como máximo (el horno procesa de a una).
- `piezas_terminadas`.

La cola necesita conservar el **orden de llegada y el dueño de cada pieza**: cuando el horno termina, hay que devolverle el control al ensamblador correcto (`ensamblador_id`, §5.2). Una estructura FIFO de identificadores alcanza.

### 4.4 Los dos eventos

**Fin Ensamble [ensamblador i]** (§6.1): la pieza intenta entrar al horno. Si está libre, entra y se programa su Fin Cocción; si está ocupado, se encola. En **ambos casos** el ensamblador *i* queda esperando — no arranca la pieza siguiente.

**Fin Cocción** (§6.2). El orden importa y debe respetarse exactamente:

1. `piezas_terminadas += 1`
2. Liberar el horno
3. Revisar la cola: si hay alguien, sale el primero (FIFO), el horno vuelve a ocupado y se programa su Fin Cocción; si no, el horno queda libre
4. El ensamblador dueño de la pieza que salió pasa a ensamblar: se genera y programa su nuevo Fin Ensamble

> Alterar este orden cambia los resultados numéricos. En particular, contar la pieza después de atender la cola, o devolver el control al ensamblador antes de liberar el horno, produce corridas distintas.

### 4.5 Corte en 480 — el error más fácil de cometer

Según §8:

- La jornada corta **estrictamente** en el minuto 480. Ese valor es fijo para todo N; es la condición que hace comparables los resultados (§4).
- Las piezas en curso al momento del corte (siendo ensambladas, en cola o siendo horneadas) **no se cuentan** y su evento pendiente no se ejecuta.
- Si el horno estaba **ocupado** al cortar, hay que sumar a `tiempo_horno_ocupado` el tramo parcial transcurrido desde que empezó esa cocción hasta 480 — no la cocción completa, y tampoco cero.

Ese último punto es el que se olvida y produce utilizaciones sistemáticamente bajas.

### 4.6 Aleatoriedad y reproducibilidad

- Un `np.random.Generator` construido con `np.random.default_rng(semilla)`. Si `semilla` es `null`, se genera una y **se devuelve en `parametros.semilla`**, para que la corrida siga siendo reproducible después.
- De la semilla raíz se derivan sub-semillas independientes por cada par (N, réplica) usando `SeedSequence.spawn()`. Así cada réplica es independiente y el resultado es reproducible sin importar el orden de ejecución.
- **Flujos separados** para ensamble y cocción: no deben salir del mismo stream intercalado (§4). Dos generadores derivados, uno por tipo de tiempo.
- Fórmula única en `utils/generadores.py`: `X = minimo + RND × (maximo − minimo)` (§3).

> ⚠️ **El índice global de la réplica está escrito en dos lugares.** `experimento_service` calcula `indice_global = (n - n_minimo) * replicas + indice` para derivar las semillas del barrido, y `vector_estado_service` **repite la misma fórmula** para reconstruir una réplica puntual. Si cambia en un solo lado, el vector de estado deja de corresponder a la corrida que el usuario está mirando **sin dar ningún error**: sigue devolviendo una jornada válida, pero de otra simulación. Cualquier cambio ahí se hace en los dos archivos y se verifica comparando el promedio de piezas reconstruido contra `resultados_por_n`.

### 4.7 Inicialización

En `t = 0` el sistema arranca vacío: los N ensambladores empiezan a ensamblar simultáneamente y se programan sus N eventos de Fin Ensamble. No hay período de calentamiento — la jornada es un ciclo que se reinicia cada día, y esa es una condición representativa del problema, no un artefacto a descartar (§4, §8).

### 4.8 La traza del vector de estado

`ejecutar_replica()` acepta un parámetro opcional `traza: list[FilaVectorEstado] | None`. Si se le pasa una lista, le agrega una fila por cada evento (más la inicialización y el corte); si es `None` — el caso del barrido — no registra nada.

Tres reglas, en orden de importancia:

1. **No duplicar el bucle de eventos.** Nada de un `ejecutar_replica_con_traza()` paralelo: dos copias del bucle divergen con el tiempo y el vector de estado dejaría de describir la simulación que realmente se corrió, que es justamente lo que se muestra para defender el trabajo.
2. **La traza es un observador puro.** No puede alterar el orden ni la cantidad de RND que se consumen. Por eso existe `uniforme_con_rnd()`, que devuelve el RND junto con el valor consumiendo exactamente uno, igual que `uniforme()`. Una réplica trazada tiene que dar **el mismo resultado** que la misma réplica sin trazar.
3. **Las filas son dataclasses puras**, no modelos Pydantic: el motor no conoce el contrato de la API. La traducción al diccionario del contrato vive en `vector_estado_service`.

El seguimiento de piezas (`estados_piezas`, `pieza_de_ensamblador`) sí es información que la lógica de eventos no necesita, pero se lleva siempre: es barata y hace el modelo más fiel a la planilla, donde cada pieza tiene su columna.

**Cómo verificar que la instrumentación no rompió nada**: correr el barrido con la misma semilla antes y después del cambio y comparar `resultados_por_n` campo por campo. Deben salir exactamente los mismos floats. Es el error silencioso más probable de este archivo.

### 4.9 El vector de estado con N > 1

La planilla `Ejercicio 135 Final Planteo.ods` está trazada **con N = 1**, así que sus columnas `Fin Ensamble (RND | tpo | min fin ensamble)` y `Ensamblador 1 de N (Estado)` no definen qué pasa con varios ensambladores.

**Decisión adoptada**: el bloque de fin de ensamble se repite **por ensamblador**. Para cada ensamblador i se emiten `RND`, `tpo`, `min fin ensamble` y `Estado`. Con N = 1 la tabla queda **idéntica a la planilla**; con N > 1, la fila de inicialización muestra los N sorteos (uno por ensamblador) y cada fila posterior muestra el sorteo solo en la columna del ensamblador que acaba de recibir una pieza nueva. El bloque de cocción sigue siendo único, porque el horno es uno solo.

Ancho resultante de la tabla: `4 + 4·N + 3 + 2 + 1 + total_piezas` columnas. Con N = 6 y 59 piezas son 93 columnas — el frontend las desplaza en horizontal.

---

## 4.10 Los tres criterios del N óptimo

Viven en `services/criterios.py`, una función por criterio, sin estado. Están separados de `experimento_service` a propósito: es la parte que se defiende ante la cátedra y tiene que poder leerse sola.

| Criterio | Regla | Parámetro |
|---|---|---|
| `maxima_produccion` | mínimo N con `Producción(N+1) − Producción(N) < ganancia_minima` | `ganancia_minima` (default 1 pieza) |
| `capacidad_horno` | mínimo N con `Utilización(N) >= TECHO_UTILIZACION − 0,005` | ninguno |
| `umbral_manual` | mínimo N con `Utilización(N) >= umbral_utilizacion` | `umbral_utilizacion` (default 0,94) |

Verificado sobre 8 rangos × 2 valores de R × 3 semillas (48 corridas): los tres dan **N = 6** en todo rango que pase de 6, y ninguno da falso positivo en los rangos cortos.

### Tres trampas de este archivo

**1. No buscar el máximo de la curva de producción.** Con R chico el máximo cae donde lo ponga el azar: con R=30 y semilla 12345 está en N=8 (56,60 piezas), que **no** es la respuesta correcta — de N=6 en adelante la curva ya está plana y las diferencias son ruido. Comparar cada N contra su vecino es estable; comparar contra el máximo no lo es.

**2. No comparar la capacidad del horno contra el máximo del rango.** Definido como "el mínimo N que alcanza la utilización más alta observada", el criterio **siempre encuentra un N**, incluso con la curva todavía subiendo:

| Rango | Utilización máxima | "Máximo observado" | Contra `TECHO_UTILIZACION` |
|---|---|---|---|
| 1–4 | 0,7636 | **N=4** ← falso: el horno está al 76 % | ninguno ✔ |
| 1–5 | 0,9029 | **N=5** ← falso | ninguno ✔ |
| 1–6 | 0,9452 | N=6 | N=6 ✔ |

Por eso se compara contra una constante física del modelo (`(480 − 25)/480`, §10.1) y no contra un máximo relativo al rango que el usuario haya elegido mirar.

**3. El último N del rango no se puede evaluar con `maxima_produccion`.** No tiene sucesor con qué compararse, así que con un rango 1–6 el criterio devuelve `None` aunque 6 sea la respuesta. **No es un bug**: es información, y el frontend tiene que decir "hace falta simular al menos N=7", no el genérico "ampliá el rango". Por eso el default de `n_maximo` en el formulario es 8 y no 6.

**Sobre la ganancia mínima**: se compara el promedio **sin truncar**. Truncar cuantiza la diferencia y borraría la distinción entre una ganancia de 0,9 piezas y una de 0,04. El truncado se usa solo para *informar* la producción en la conclusión, nunca para decidir.

---

## 5. El experimento

`experimento_service.py` implementa §9-11:

```
Para cada N en [n_minimo .. n_maximo]:
    Para cada réplica en [1 .. R]:
        resultado = motor.ejecutar_replica(N, generadores_de_esa_replica)
    utilizacion_promedio(N) = mean(tiempo_horno_ocupado / 480)
    piezas_promedio(N)      = mean(piezas_terminadas)
    + desvíos estándar
n_optimo = criterios.determinar_n_optimo(resultados_por_n, criterio, ...)
```

Puntos a fijar:

- **El mismo R para todos los N.** Es lo que hace comparables las estimaciones entre valores de N (§9). No se ajusta R por N.
- La agregación se hace con NumPy sobre el arreglo de resultados de las R réplicas, no con bucles de Python.
- **`experimento_service` no decide el N óptimo**: corre el experimento y delega la interpretación en `criterios.py` (§4.10). Los tres criterios son "el primer N que cumple", nunca "el que maximiza". Si ninguno cumple → `n_optimo = None`, `alcanzo_criterio = False`.
- **Verificación de consistencia** (§10.1): la producción esperada debería aproximarse a `utilizacion × (480 / 8)`, con techo teórico de 60 piezas. Si un N devuelve más de 60 piezas promedio, hay un error en el motor. Vale dejarlo anotado como comprobación mental al implementar.

---

## 6. Estadísticas de cómputo (§12)

Se miden tres niveles de tiempo:

| Campo | Qué mide |
|---|---|
| `tiempo_total_ms` | La corrida completa, todo el rango de N |
| `tiempo_por_n[]` | Acumulado de las R réplicas de cada N |
| `tiempo_promedio_replica_ms` | Promedio de una réplica individual |

Más el consumo de recursos con `psutil`: `memoria_pico_mb` (RSS máximo del proceso durante la corrida) y `cpu_porcentaje` (uso de CPU del proceso).

Consideraciones:

- Usar `time.perf_counter()` para los tiempos; `time.time()` no tiene la resolución necesaria (las réplicas tardan fracciones de milisegundo).
- Medir el porcentaje de CPU con `psutil` requiere un intervalo de referencia: llamar a `cpu_percent()` una vez antes de la corrida para establecer la línea de base y leerlo al terminar. Una llamada única sin línea de base devuelve `0.0`.
- La medición no debe distorsionar lo medido: no cronometrar dentro del bucle de eventos, solo alrededor de cada réplica.
- **El backend devuelve números, no frases.** El frontend es responsable de traducirlos a lenguaje simple (ver `Frontend.md`, sección del `PanelComputo`). Esto mantiene la API limpia y permite cambiar la redacción sin tocar Python.

---

## 7. Convenciones

- **Idioma**: nombres de dominio en español (`ensamblador`, `horno`, `cola`, `piezas_terminadas`, `utilizacion`, `replica`). Los campos JSON van sin tildes para evitar problemas de codificación; los textos mostrables al usuario **sí llevan tildes**.
- **Unidades explícitas**: el tiempo simulado siempre en minutos; el tiempo real de cómputo siempre en milisegundos, con el sufijo `_ms` en el nombre del campo.
- **Utilización como fracción** (0 a 1) en toda la API. La conversión a porcentaje es responsabilidad de la vista.
- Formato de código: `black` con línea de 100 caracteres (opcional pero recomendado para consistencia).
- Sin lógica en `main.py` ni en los controllers. Si algo no entra claramente en `controllers/`, `services/` o `utils/`, probablemente esté mal modelado.

---

## 8. Puesta en marcha

```bash
cd Backend
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Documentación interactiva automática en `http://localhost:8000/docs`, útil para probar la API sin el frontend.

CORS debe permitir el origen del servidor de desarrollo de Vite (`http://localhost:5173`), configurado en `config.py`.
