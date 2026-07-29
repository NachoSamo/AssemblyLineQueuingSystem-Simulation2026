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
| `controllers/simulacion_controller.py` | Un `APIRouter` con `POST /api/simulaciones` y `GET /api/salud`. Recibe el modelo de request ya validado por Pydantic, llama al servicio, devuelve el modelo de response. Traduce excepciones de dominio a códigos HTTP. | **No contiene una sola línea de lógica de simulación.** Si acá aparece la palabra `reloj`, algo está mal ubicado. |
| `services/motor_simulacion.py` | El corazón del sistema. Ejecuta **una** réplica: una jornada completa de 480 minutos para un N dado. Implementa el reloj, la lista de eventos futuros y los dos eventos de §6. Devuelve el resultado de esa réplica: tiempo de horno ocupado y piezas terminadas. | No sabe qué es FastAPI, ni JSON, ni HTTP. No recorre varios N ni varias réplicas. |
| `services/experimento_service.py` | El diseño experimental de §9-10. Recorre `N_mínimo..N_máximo`, ejecuta R réplicas por cada N llamando al motor, promedia con NumPy, calcula desvíos y determina el N óptimo según el umbral. Orquesta también la medición de tiempos delegando en `metricas_computo`. | No implementa la lógica de eventos (eso es del motor). |
| `services/metricas_computo.py` | Estadísticas del programa como software (§12): cronómetro por réplica, acumulado por N y total de la corrida; pico de memoria y uso de CPU vía `psutil`. Expone un context manager o similar para envolver bloques a medir. | No interpreta ni formatea los números para el usuario — eso lo hace el frontend. |
| `models/request.py` | `SimulacionRequest` con sus validadores de campo y de modelo. Mensajes de error en español, redactados para mostrarse al usuario. | No tiene lógica de simulación. |
| `models/response.py` | `SimulacionResponse` y todos los modelos anidados (`ParametrosCorrida`, `ResultadoPorN`, `EstadisticasComputo`, `RangoTiempo`, `TiempoPorN`). | Ídem. |
| `utils/constantes.py` | Los datos fijos del enunciado: `DURACION_JORNADA = 480`, `ENSAMBLE_MINIMO = 25`, `ENSAMBLE_MAXIMO = 35`, `COCCION_MINIMO = 6`, `COCCION_MAXIMO = 10`. Con un comentario que aclare por qué son constantes y no parámetros (§4). | No se importa desde `models/request.py` como valores editables. |
| `utils/generadores.py` | Generación de variables aleatorias: `uniforme(minimo, maximo, rng)` aplicando `X = a + RND × (b − a)` (§3), y la construcción/derivación de generadores `np.random.Generator` a partir de la semilla. | No conoce el dominio (no sabe qué es "ensamble" ni "cocción"; recibe `minimo` y `maximo`). |

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
  "umbral_utilizacion": 0.94,
  "semilla": 12345
}
```

| Campo | Tipo | Regla | Notas |
|---|---|---|---|
| `n_minimo` | `int` | `>= 1` | Primer N del barrido |
| `n_maximo` | `int` | `>= n_minimo` | Último N del barrido |
| `replicas` | `int` | `>= 1` | R: jornadas simuladas por cada N (§9) |
| `umbral_utilizacion` | `float` | `0 < x <= 1` | Fracción, no porcentaje. `0.94` = 94 % (§10). Sin default del lado del backend: es obligatorio en el request |
| `semilla` | `int \| null` | opcional | `null` → semilla aleatoria del sistema |

Conviene además un tope superior de guardia (`n_maximo <= 100`, `replicas <= 100000`) para que una entrada absurda no cuelgue el servidor. Al superarlo, `422` con un mensaje que indique el máximo permitido.

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

Detalle de los campos:

- `parametros` — eco de lo que envió el usuario **más** los datos fijos del enunciado. Existe para que el frontend pueda mostrar "con qué se corrió esto" (§13.1) sin recordar el request, y para que los valores fijos aparezcan en pantalla sin estar hardcodeados en el frontend.
- `resultados_por_n` — un elemento por cada N del rango, en orden ascendente. `utilizacion_promedio` es fracción (0 a 1); el frontend la convierte a porcentaje al mostrarla. Los desvíos estándar entre réplicas se incluyen para la tabla de detalle: permiten justificar si R fue suficiente.
- `n_optimo` — mínimo N cuya `utilizacion_promedio >= umbral_utilizacion` (§10). Es `null` si ninguno lo alcanza.
- `alcanzo_umbral` — `false` cuando ningún N del rango llegó al umbral. El frontend lo usa para mostrar el aviso de ampliar el rango en vez de una conclusión falsa (§10.2).
- `utilizacion_n_optimo` / `piezas_n_optimo` — valores del N óptimo, para que la tarjeta de conclusión no tenga que buscarlos en el arreglo. `null` si `n_optimo` es `null`.
- `estadisticas_computo` — números crudos de §12. El backend **no** los formatea ni los redondea a texto: devuelve magnitudes con su unidad en el nombre del campo, y el frontend arma las frases legibles.

**Errores**

| Código | Cuándo | Cuerpo |
|---|---|---|
| `422` | Parámetros inválidos | `{ "detail": "<mensaje en español, mostrable al usuario>" }` |
| `500` | Error inesperado | `{ "detail": "Ocurrió un error al ejecutar la simulación." }` |

Los mensajes de validación se escriben pensando en el usuario final, no en el desarrollador: `"El N máximo debe ser mayor o igual que el N mínimo."`, no `"value_error: n_maximo < n_minimo"`.

> ⚠️ **`detail` es un string, y eso requiere trabajo extra.** Ante un error de validación, FastAPI devuelve por defecto `{"detail": [ {...}, {...} ]}` — una **lista de objetos**, no un string. Eso rompería al frontend, que espera texto listo para mostrar. Hace falta un handler propio de `RequestValidationError` que aplane los errores a un único string en español. Es el punto donde una reimplementación ingenua quiebra el contrato sin darse cuenta.

### 3.2 `GET /api/salud`

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

### 4.7 Inicialización

En `t = 0` el sistema arranca vacío: los N ensambladores empiezan a ensamblar simultáneamente y se programan sus N eventos de Fin Ensamble. No hay período de calentamiento — la jornada es un ciclo que se reinicia cada día, y esa es una condición representativa del problema, no un artefacto a descartar (§4, §8).

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
n_optimo = mínimo N con utilizacion_promedio >= umbral
```

Puntos a fijar:

- **El mismo R para todos los N.** Es lo que hace comparables las estimaciones entre valores de N (§9). No se ajusta R por N.
- La agregación se hace con NumPy sobre el arreglo de resultados de las R réplicas, no con bucles de Python.
- El cálculo del N óptimo es un "primer N que cruza el umbral", no un máximo. Si ninguno cruza → `n_optimo = None`, `alcanzo_umbral = False`.
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
