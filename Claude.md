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
| **Umbral** | Nivel de utilización a partir del cual se considera que el horno está saturado. **Por defecto 94 %**, no 95 %: ver "Techo del sistema" acá abajo. Es configurable. |
| **N óptimo** | El **mínimo** N cuya utilización promedio alcanza el umbral. Mínimo, no máximo: agregar ensambladores más allá de ese punto no aumenta la producción, solo agranda la cola. Con los parámetros del enunciado da **N = 6**. |
| **Vector de estado** | La tabla fila-por-evento del `.ods`: reloj, RND generado, tiempos de fin, estados del horno y los ensambladores, cola y contador. Es contra esto que se verifica el motor. |
| **Techo del sistema** | 60 piezas (`480 / 8`) es la **cota teórica**, inalcanzable. El máximo real es **~56,4 piezas y ~0,948 de utilización**, porque el sistema arranca vacío (§4) y el horno queda ocioso ~25 min hasta el primer Fin Ensamble. Detalle y demostración en la nota de `Dominio.md` §10.1. Si la simulación supera 56,5 piezas o 0,95 de utilización, hay un error. |

---

## 3. Decisiones tomadas

Todas acordadas con el autor del trabajo. **No revisarlas sin consultarlo.**

| Tema | Decisión | Por qué |
|---|---|---|
| **Layout** | Monorepo: `Backend/` y `Frontend/` dentro de este repo | Un solo proyecto, una sola entrega |
| **Motor de simulación** | Bucle clásico de siguiente-evento, fiel a `Dominio.md` §6-8. NumPy solo para generar RND en lote y para promediar entre réplicas | Se descartó vectorizar todas las réplicas en paralelo: sería más rápido, pero el código dejaría de parecerse al modelo conceptual y no se podría contrastar contra la planilla. **El código tiene que poder defenderse ante la cátedra** |
| **Comunicación** | Un único endpoint síncrono `POST /api/simulaciones`. Sin streaming, sin polling | La corrida tarda milisegundos; la complejidad de SSE no se justifica |
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
- [ ] Comparación fila por fila contra el vector de estado del `.ods` — pendiente, requiere alinear el flujo de RND con el de la planilla
- [ ] `Frontend/` — andamiaje Vite + Tailwind + tema
- [ ] `Frontend/` — tipos y capa de API
- [ ] `Frontend/` — pantalla 1: configuración
- [ ] `Frontend/` — pantalla 2: animación
- [ ] `Frontend/` — pantalla 3: resultados y gráficos

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
4. **`motor_simulacion.py` no importa FastAPI ni Pydantic.** Tiene que poder ejecutarse desde un script suelto para compararlo contra la planilla. Si esa comparación deja de ser posible, el diseño se rompió.
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
- **N óptimo es el mínimo que cruza el umbral**, no el que maximiza la utilización. Todos los N grandes rondan el techo; el punto es quedarse con el más chico.
- **La utilización NO tiende a 1: tiende a ~0,948.** El arranque en vacío deja al horno ocioso ~25 min (el mínimo de N tiempos de ensamble) y ese costo no se puede eliminar. Por eso el umbral por defecto es 94 % y no 95 %. Si alguien "arregla" el motor para que la utilización llegue a 100 %, lo rompió: probablemente descartó el transitorio inicial, que `Dominio.md` §4 y §8 prohíben explícitamente descartar.
- **Si ningún N alcanza el umbral**, `n_optimo` es `null` y hay que avisarle al usuario que amplíe el rango (§10.2) — no devolver el mejor disponible como si fuera la respuesta.

### Si en el futuro se pide progreso real

La animación de la pantalla 2 es local por decisión, no por limitación. Si se quisiera progreso verdadero (tendría sentido con R muy grande, del orden de decenas de miles), habría que: agregar `POST /api/simulaciones` que devuelva un `run_id`, sumar `GET /api/simulaciones/{id}/stream` con Server-Sent Events emitiendo `{ n_actual, replica, pct }`, y reemplazar `useProgresoSimulado` por un consumidor de `EventSource`. El resto de la interfaz no cambia.

---

## 7. Bitácora

| Fecha | Qué se hizo | Archivos |
|---|---|---|
| 2026-07-28 | Relevamiento del dominio (`Dominio.md`, `Ejercicio135.pdf`, planilla `.ods`), definición del stack, del contrato de API y de los criterios de interfaz. Creación de la documentación base del proyecto. | `Claude.md`, `Backend.md`, `Frontend.md` |
| 2026-07-28 | Backend implementado y verificado (motor, experimento, métricas, API). **Hallazgo**: la utilización tiene un techo alcanzable de ~0,948 por el arranque en vacío, así que el umbral del 95 % dejaba al problema sin solución. Se bajó el default a 94 % → N óptimo = 6. Documentado con demostración en `Dominio.md` §10.1. | `Backend/**`, `Dominio.md`, `Claude.md` |
