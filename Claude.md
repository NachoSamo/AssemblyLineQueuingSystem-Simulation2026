# Claude.md — contexto del proyecto

Documento vivo. **Se actualiza en cada iteración** (ver la bitácora al final).
Su función es que cualquier agente o persona que entre al proyecto entienda de qué se trata y qué ya está decidido, sin volver a discutirlo.

---

## 1. Qué es este proyecto

Trabajo práctico final de la materia **Simulación** (UTN FRC). Resuelve el **Ejercicio 135**: varios ensambladores comparten un único horno con capacidad para una pieza a la vez, y hay que determinar el **número óptimo de ensambladores por horno**.

Es una aplicación web con backend Python (simulación de eventos discretos) y frontend React (configuración, animación de espera y resultados con gráficos).

**Fuente de verdad del dominio: `Dominio.md`**, en la raíz de este repo. Ese archivo contiene el enunciado interpretado, el modelo conceptual, los eventos, el diseño experimental y los criterios de interfaz. Está resuelto y validado contra la planilla `Ejercicio 135 Final Planteo.ods`, que tiene el vector de estado trazado a mano para N=1.

Documentos hermanos:
- **`Backend.md`** — estructura, responsabilidades y contrato del backend.
- **`Frontend.md`** — estructura, componentes y criterios de interfaz del frontend.

Material de origen (fuera del repo, en la carpeta padre): `Ejercicio135.pdf` (enunciado original de la cátedra) y `Ejercicio 135 Final Planteo.ods` (planteo manual con el vector de estado).

---

## 2. Glosario

Vocabulario mínimo para no malinterpretar el problema:

| Término | Qué significa |
|---|---|
| **N** | Cantidad de ensambladores asignados al horno. Es la variable que se está optimizando. |
| **Réplica** | Una simulación de una jornada completa de 480 minutos, de principio a fin, partiendo del sistema vacío. |
| **R** | Cuántas réplicas se corren **por cada valor de N**. Como los tiempos son aleatorios, una sola jornada puede dar un resultado atípico; se promedian R jornadas independientes. Debe ser el mismo R para todos los N que se comparen. |
| **Jornada** | 480 minutos = 8 horas. **Dato fijo del enunciado, no configurable.** Es la condición que hace comparables los resultados entre distintos N. |
| **Utilización del horno** | Fracción del tiempo de la jornada en que el horno estuvo ocupado: `tiempo_horno_ocupado / 480`. Va de 0 a 1. En la API siempre viaja como fracción; se muestra como porcentaje. |
| **Umbral** | Nivel de utilización a partir del cual se considera que el horno está saturado. **Por defecto 94 %**, no 95 %: ver "Techo del sistema" acá abajo. Es configurable, y solo lo usa el criterio manual. |
| **Criterio** | Cómo se elige el N óptimo. Hay **tres** (`Dominio.md` §10): `maxima_produccion` (el del enunciado, **por defecto**), `capacidad_horno` y `umbral_manual`. Con los parámetros del enunciado los tres dan N = 6. |
| **Ganancia mínima** | Piezas que tiene que aportar el ensamblador siguiente para justificar sumarlo. Es el parámetro del criterio de máxima producción. **Por defecto 1 pieza.** |
| **N óptimo** | El **mínimo** N que satisface el criterio elegido. Mínimo, no máximo: agregar ensambladores más allá de ese punto no aumenta la producción, solo agranda la cola. Con los parámetros del enunciado da **N = 6** con los tres criterios. |
| **Producción truncada** | La producción **real**: 56,33 de promedio son **56 piezas** completas. La 57.ª queda a medio cocinar al cortar la jornada, y una pieza incompleta no se entrega (§10.d). El promedio es el estadístico; el truncado es el resultado. |
| **Vector de estado** | La tabla fila-por-evento del `.ods`: reloj, RND generado, tiempos de fin, estados del horno y los ensambladores, cola y contador. Es contra esto que se verifica el motor, y desde 2026-07-29 **también es algo que la aplicación muestra en pantalla** (pantalla 4). |
| **Fila / Iteración** | Una fila del vector de estado es **un evento** del bucle, no una réplica. Se numeran desde 0 (la inicialización) dentro de cada réplica; la última es el corte en 480. Una jornada con N=6 tiene ~110 filas. No confundir con **R**, que cuenta jornadas enteras. |
| **Uso de procesador** | `psutil.Process.cpu_percent()` suma **todos los núcleos**, así que puede pasar de 100 % (se midió 101,6 %). El valor crudo del backend es correcto; el recorte a 100 % es de presentación y vive solo en el frontend. |
| **Techo del sistema** | 60 piezas (`480 / 8`) es la **cota teórica**, inalcanzable. El máximo real es **~56,4 piezas y ~0,948 de utilización**, porque el sistema arranca vacío (§4) y el horno queda ocioso ~25 min hasta el primer Fin Ensamble. Detalle y demostración en la nota de `Dominio.md` §10.1. Si la simulación supera 56,5 piezas o 0,95 de utilización, hay un error. |

---

## 3. Decisiones tomadas

Todas acordadas con el autor del trabajo. **No revisarlas sin consultarlo.**

| Tema | Decisión | Por qué |
|---|---|---|
| **Layout** | Monorepo: `Backend/` y `Frontend/` dentro de este repo | Un solo proyecto, una sola entrega |
| **Motor de simulación** | Bucle clásico de siguiente-evento, fiel a `Dominio.md` §6-8. NumPy solo para generar RND en lote y para promediar entre réplicas | Se descartó vectorizar todas las réplicas en paralelo: sería más rápido, pero el código dejaría de parecerse al modelo conceptual y no se podría contrastar contra la planilla. **El código tiene que poder defenderse ante la cátedra** |
| **Comunicación** | Dos endpoints, ambos síncronos: `POST /api/simulaciones` (la corrida) y `POST /api/simulaciones/vector-estado` (el detalle de una réplica). Sin streaming, sin polling | La corrida tarda milisegundos; la complejidad de SSE no se justifica |
| **Vector de estado** | Endpoint aparte que **recalcula** la réplica pedida, en vez de mandarlo todo en la respuesta de la corrida | Con N=1..8 y R=30 son más de 21.000 filas de ~90 columnas, y el usuario mira una réplica por vez. Como las semillas se derivan por par (N, réplica), reconstruir cualquier jornada cuesta <1 ms y no hace falta guardar nada en el servidor |
| **Vector con N > 1** | Las columnas RND / tpo / min fin ensamble se repiten **por ensamblador** | La planilla está trazada con N=1 y no define el caso general. Con esta forma, N=1 renderiza **idéntico a la planilla** (28 columnas) y N>1 es su extensión natural |
| **Navegación del vector** | Selectores de N y de réplica, y paginado de 20 filas dentro de la réplica elegida | Con paginado continuo sobre las 30 réplicas de un N serían ~165 páginas; llegar a la réplica 17 con solo Anterior/Siguiente sería inusable |
| **Recorte del uso de CPU** | A 100 % como máximo, **solo en el frontend** | `psutil` suma núcleos y devuelve legítimamente más de 100 %. El dato del backend no está mal: lo que está mal es mostrarlo crudo. "Arreglarlo" en el backend sería falsear la medición |
| **Progreso de la pantalla 2** | La barra la **anima el frontend**, no el backend. Mínimo 3 segundos; si el backend tarda más, queda en 99 % hasta que lleguen los resultados. Los contadores "N = x de y" y "Réplica i / R" son **estimados** | Con un backend que responde en 40 ms, un progreso real sería un parpadeo imperceptible. Está documentado como estimado para que nadie construya lógica sobre esos números creyéndolos reales |
| **Ilustración de espera** | SVG dibujado desde cero, estética pixel-art: piezas que saltan hacia un horno con la llama pulsando. **Sin emojis** | Se pidió estilo Minecraft, pero **los sprites y texturas de Minecraft son propiedad de Mojang** y no pueden incluirse en el trabajo. Se toma la estética de bloques (píxeles grandes, bordes duros, paleta acotada) con arte propio |
| **Iconos** | `lucide-react` (licencia MIT) | Librería profesional, tipada, sin problemas de licencia |
| **Parámetros configurables** | `N_mínimo`, `N_máximo`, `R`, umbral de utilización y **semilla opcional** | La semilla permite repetir exactamente una corrida en la defensa |
| **Parámetros NO configurables** | Jornada de 480 min y los tiempos del enunciado (ensamble 30±5, cocción 8±2) | `Dominio.md` §4 lo indica explícitamente: los 480 min son la condición que hace comparables los resultados entre distintos N. Se **muestran** en pantalla como solo lectura, con la explicación de por qué |
| **Gráficos** | Recharts. **Dos gráficos separados y apilados**, nunca combinados con doble eje Y | `Dominio.md` §13.2 lo desaconseja explícitamente: mezclar utilización y producción dificulta la lectura |
| **Métricas de cómputo** | Sí, con `psutil`. El backend devuelve números crudos; **el frontend los traduce a frases en lenguaje simple** | Requisito explícito: "la información debe ser simple de leer, sin muchos tecnicismos". Separarlo mantiene la API limpia |
| **Tema visual** | **Solo modo claro.** Paleta industrial: grises + naranja horno de acento | Simplicidad, y se proyecta en aula |
| **Tailwind** | **v3, no v4.** Instalar con `tailwindcss@3` | La v4 se configura desde el CSS con `@theme` y prescinde de `tailwind.config.js` / `postcss.config.js`, que son requisito explícito del proyecto |
| **Umbral por defecto** | **94 %**, no 95 % | Se descubrió al implementar que la utilización tiene un techo alcanzable de ~0,948, así que con 95 % ningún N calificaba nunca y la app no mostraba conclusión. Con 94 % devuelve N=6, que es donde se aplanan las dos curvas. Verificado de forma independiente y documentado en `Dominio.md` §10.1 |
| **Criterio del N óptimo** | **Tres** criterios elegibles; el default es `maxima_produccion` | El umbral obligaba al usuario a adivinar un número: con 90 % da N=5 y con 95 % no da nada. La respuesta al enunciado no puede depender de eso. Los tres coinciden en N=6, lo que es verificación cruzada |
| **"Maximiza la producción"** | Por **ganancia marginal**: mínimo N donde el siguiente aporta menos de 1 pieza | Buscar el máximo de la curva es inestable: con R=30 el máximo cae en N=8 por ruido, que es una respuesta incorrecta. Comparar contra el vecino da N=6 en 48 corridas (8 rangos × 2 R × 3 semillas) |
| **Capacidad del horno** | Se compara contra el **techo físico** `(480−25)/480`, no contra el máximo del rango | Definido contra el máximo del rango, el criterio siempre encuentra un N: con rango 1–4 devolvería N=4 con el horno al 76 %. Ver la trampa correspondiente |
| **Producción truncada** | El truncado lo calcula el **backend**, no el frontend | "53,9 promedio → 53 piezas reales" es una afirmación de dominio, no un formato de presentación |
| **Orden de los gráficos** | Piezas terminadas primero, utilización después | Producción es la magnitud que el enunciado pide maximizar (§2). Utilización pasa a explicar *por qué* la producción se aplana |
| **Validación del formulario** | `react-hook-form` con `mode: 'onTouched'`, sin `zod` | En vivo, pero sin gritar mientras se escribe por primera vez. Las reglas son cuatro comparaciones: un resolver de esquema sería una dependencia más sin beneficio |
| **Tests** | No, por el momento | Decisión explícita del alcance |

**Entorno verificado**: Python 3.14.4, Node 22.17, npm 11.4. `Frontend/` ya tiene el andamiaje de Vite + React 19 + TypeScript + ESLint creado.

---

## 4. Estado actual

- [x] Dominio resuelto y documentado (`Dominio.md`)
- [x] `Claude.md`, `Backend.md`, `Frontend.md`
- [x] `Backend/` — estructura de carpetas y `requirements.txt`
- [x] `Backend/` — motor de simulación (una réplica)
- [x] `Backend/` — servicio de experimento (barrido de N, promedios, N óptimo)
- [x] `Backend/` — métricas de cómputo con psutil
- [x] `Backend/` — API FastAPI y modelos Pydantic
- [x] Verificación numérica del motor por reimplementación independiente (dos motores escritos por separado coinciden; techo, monotonía, relación §10.1 y determinismo comprobados)
- [x] `Frontend/` — andamiaje Vite + Tailwind + tema
- [x] `Frontend/` — tipos y capa de API
- [x] `Frontend/` — pantalla 1: configuración
- [x] `Frontend/` — pantalla 2: animación
- [x] `Frontend/` — pantalla 3: resultados y gráficos
- [x] `Backend/` — motor instrumentado con la traza del vector de estado, verificado sin regresión numérica (240 réplicas, 21.247 filas; `resultados_por_n` idéntico antes y después)
- [x] `Backend/` — endpoint `POST /api/simulaciones/vector-estado` y su servicio
- [x] `Frontend/` — pantalla 4: vector de estado paginado
- [x] `Frontend/` — recorte del uso de procesador a 100 %
- [x] Estructura del vector de estado verificada: con N=1 son 28 columnas, exactamente las de la planilla; el encabezado de dos niveles cubre las mismas columnas que el cuerpo
- [x] `Backend/` — los tres criterios del N óptimo (`services/criterios.py`), verificados en 48 corridas (8 rangos × 2 valores de R × 3 semillas)
- [x] `Frontend/` — selector de criterio, conclusión explicativa con producción truncada, fichas de distribución con fórmula y estadísticos
- [x] `Frontend/` — validación en vivo con `react-hook-form` (`mode: 'onTouched'`)
- [x] `Frontend/` — gráfico de piezas antes que el de utilización, con subtítulos y línea de referencia según el criterio
- [x] `Dominio.md` §10 reescrito con los tres criterios, §10.2 con el orden nuevo y §11 con el pseudocódigo actualizado
- [ ] Comparación **valor por valor** contra el vector de estado del `.ods` — sigue pendiente: la estructura ya coincide, pero los RND de la planilla salen de otro generador, así que los números no son comparables sin alinear el flujo. Ahora se puede hacer a ojo desde la pantalla 4 con N=1
- [ ] Verificación visual en el navegador de las cuatro pantallas — nunca se pudo hacer: la extensión de Chrome no está conectada. Se verificó el renderizado por otra vía (React SSR: conteo de filas, celdas y `colspan`/`rowspan`), pero **nadie miró la pantalla todavía**

---

## 5. Cómo levantar el proyecto

**Backend** (puerto 8000):

```bash
cd Backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Documentación interactiva de la API en `http://localhost:8000/docs`.

**Frontend** (puerto 5173):

```bash
cd Frontend
npm install
npm run dev
```

Ambos tienen que estar corriendo. El CORS del backend debe permitir `http://localhost:5173`.

---

## 6. Reglas para agentes

1. **No modificar `Dominio.md`.** Es la fuente de verdad y está cerrado.
2. **Ante conflicto** entre estos documentos y `Dominio.md`, **manda `Dominio.md`**. Reportar la discrepancia al usuario en vez de resolverla en silencio eligiendo una de las dos.
3. **El contrato de la API vive en tres lugares**: `Backend.md`, `Frontend.md` y `Frontend/src/types/simulacion.ts`. Si cambia, se actualizan los tres **en el mismo cambio**.
4. **`motor_simulacion.py` no importa FastAPI ni Pydantic.** Tiene que poder ejecutarse desde un script suelto para compararlo contra la planilla. Si esa comparación deja de ser posible, el diseño se rompió. Esto vale también para la traza: `FilaVectorEstado` del motor es un **dataclass puro**; el modelo Pydantic espejo vive en `models/response.py` y la traducción entre ambos, en `vector_estado_service.py`.
5. **Todo en español**: identificadores de dominio, textos de interfaz, comentarios y docstrings. Los campos JSON van sin tildes (por codificación); los textos visibles **sí llevan tildes**.
6. **No escribir clases `dark:`** en el frontend. El proyecto es de modo claro únicamente; quedarían muertas y darían falsa impresión de que el soporte existe.
7. **Sin emojis** en la interfaz ni en la ilustración. Iconos: `lucide-react` o SVG propio.
8. **Sin tests** por ahora. No agregarlos por iniciativa propia.
9. **Actualizar la bitácora** de la sección 7 al terminar cada iteración, y marcar el checklist de la sección 4.

### Trampas conocidas

Errores que este problema induce y que ya costaron aclararse:

- **El corte en 480** (`Dominio.md` §8): si el horno estaba ocupado al cortar, hay que sumar el **tramo parcial** de esa cocción al tiempo acumulado — no la cocción completa, y tampoco cero. Es lo que más se olvida, y produce utilizaciones sistemáticamente bajas.
- **El orden de operaciones en Fin Cocción** (§6.2): contar la pieza → liberar el horno → atender la cola → devolver el control al ensamblador dueño. Alterarlo cambia los resultados numéricos.
- **El ensamblador queda esperando en los dos casos** de Fin Ensamble (§6.1): tanto si su pieza entró directo al horno como si quedó en cola. Si pudiera seguir trabajando, el problema de optimización no existiría.
- **N óptimo es el mínimo que satisface el criterio**, no el que maximiza la utilización. Todos los N grandes rondan el techo; el punto es quedarse con el más chico.
- **No buscar el máximo de la curva de producción.** Con R chico el máximo cae donde lo ponga el azar: con R=30 y semilla 12345 está en N=8 (56,60 piezas), y **no** es la respuesta — de N=6 en adelante la curva ya está plana y las diferencias son ruido. Por eso el criterio compara cada N contra su vecino, que es estable.
- **La "capacidad del horno" NO se mide contra el máximo del rango.** Definido así, el criterio siempre encuentra un N aunque la curva siga subiendo: con rango 1–4 devuelve N=4, con el horno al 76 %. Hay que compararlo contra el techo físico `(480−25)/480` de `Dominio.md` §10.1, que es una constante del modelo y no depende del rango que el usuario haya elegido mirar.
- **El criterio de máxima producción no puede evaluar el último N del rango**, porque no tiene sucesor con qué compararse. Con rango 1–6 devuelve "no alcanzado" aunque 6 sea la respuesta. **No es un bug**: por eso el default de N máximo es 8, y por eso el mensaje dice "hace falta simular al menos N=7" y no el genérico "ampliá el rango".
- **La utilización NO tiende a 1: tiende a ~0,948.** El arranque en vacío deja al horno ocioso ~25 min (el mínimo de N tiempos de ensamble) y ese costo no se puede eliminar. Por eso el umbral por defecto es 94 % y no 95 %. Si alguien "arregla" el motor para que la utilización llegue a 100 %, lo rompió: probablemente descartó el transitorio inicial, que `Dominio.md` §4 y §8 prohíben explícitamente descartar.
- **Si ningún N alcanza el umbral**, `n_optimo` es `null` y hay que avisarle al usuario que amplíe el rango (§10.2) — no devolver el mejor disponible como si fuera la respuesta.
- **Instrumentar el motor no debe cambiar los resultados.** La traza del vector de estado es un observador puro: si después de tocarla `resultados_por_n` da distinto con la misma semilla, se alteró el orden o la cantidad de RND consumidos. Falla en silencio — la corrida sigue siendo válida, pero deja de ser la que estaba documentada. Verificar **siempre** corriendo el barrido con la misma semilla antes y después, y comparando campo por campo.
- **El índice global de la réplica está escrito en dos lugares**: `experimento_service` (para el barrido) y `vector_estado_service` (para reconstruir una réplica puntual). Si cambia en uno solo, la pantalla 4 muestra una jornada de otra simulación **sin dar ningún error**. Se verifica reconstruyendo las R réplicas de un N y comprobando que su promedio de piezas coincide con `resultados_por_n`.

### Si en el futuro se pide progreso real

La animación de la pantalla 2 es local por decisión, no por limitación. Si se quisiera progreso verdadero (tendría sentido con R muy grande, del orden de decenas de miles), habría que: agregar `POST /api/simulaciones` que devuelva un `run_id`, sumar `GET /api/simulaciones/{id}/stream` con Server-Sent Events emitiendo `{ n_actual, replica, pct }`, y reemplazar `useProgresoSimulado` por un consumidor de `EventSource`. El resto de la interfaz no cambia.

---

## 7. Bitácora

| Fecha | Qué se hizo | Archivos |
|---|---|---|
| 2026-07-28 | Relevamiento del dominio (`Dominio.md`, `Ejercicio135.pdf`, planilla `.ods`), definición del stack, del contrato de API y de los criterios de interfaz. Creación de la documentación base del proyecto. | `Claude.md`, `Backend.md`, `Frontend.md` |
| 2026-07-28 | Backend implementado y verificado (motor, experimento, métricas, API). **Hallazgo**: la utilización tiene un techo alcanzable de ~0,948 por el arranque en vacío, así que el umbral del 95 % dejaba al problema sin solución. Se bajó el default a 94 % → N óptimo = 6. Documentado con demostración en `Dominio.md` §10.1. | `Backend/**`, `Dominio.md`, `Claude.md` |
| 2026-07-28 | Frontend implementado: las tres pantallas, los dos gráficos Recharts, el tema Tailwind v3 y la ilustración pixel-art propia. | `Frontend/**` |
| 2026-07-29 | **El sistema pasa a responder la pregunta del enunciado.** Se agregaron tres criterios de N óptimo (`services/criterios.py`): máxima producción por ganancia marginal —el de `Dominio.md` §2 y ahora el default—, máxima capacidad del horno y el umbral manual histórico. **Hallazgo**: definir "capacidad del horno" contra el máximo observado del rango da falsos positivos (con rango 1–4 devuelve N=4 con el horno al 76 %); se corrigió comparando contra el techo físico de §10.1. Verificado en 48 corridas: los tres criterios dan N=6 y ninguno falla en rangos cortos. Además: conclusión explicativa con la producción truncada (56, no 56,33), fórmulas y estadísticos de las distribuciones en el formulario, validación en vivo con `react-hook-form`, y el gráfico de piezas antes que el de utilización. `Dominio.md` §10, §10.2 y §11 reescritos. | `Backend/**`, `Frontend/**`, `Dominio.md`, `Backend.md`, `Frontend.md`, `Claude.md` |
| 2026-07-29 | **Vector de estado en pantalla.** Se instrumentó el motor con una traza opcional (observador puro: `resultados_por_n` quedó idéntico byte a byte, verificado sobre 240 réplicas y 21.247 filas), se agregó el endpoint `POST /api/simulaciones/vector-estado` que reconstruye una réplica desde la semilla, y una cuarta pantalla con selectores de N y réplica y paginado de 20 filas. Además se recortó el uso de procesador a 100 % en el frontend (`psutil` había informado 101,6 %). Sin navegador conectado, así que la pantalla se verificó por renderizado SSR, no visualmente. | `Backend/**`, `Frontend/**`, `Backend.md`, `Frontend.md`, `Claude.md` |
