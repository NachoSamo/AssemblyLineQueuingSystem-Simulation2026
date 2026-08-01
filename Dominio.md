# Simulación de manufactura: horno compartido por ensambladores — documento de dominio

Este documento describe la lógica, reglas, variables y criterios del problema, independientemente de la herramienta o lenguaje con el que luego se implemente.

## 1. Descripción del problema

La fabricación de un componente requiere dos etapas secuenciales por pieza:

1. **Ensamble**: proceso relativamente largo, realizado por un ensamblador.
2. **Cocción**: proceso corto, realizado en un horno único compartido por todos los ensambladores (capacidad = 1 pieza a la vez).

Cada ensamblador debe esperar a que su pieza salga del horno antes de poder comenzar a ensamblar la siguiente. El horno atiende a las piezas en el orden en que llegan (sin prioridades).

## 2. Objetivo

Determinar el **número óptimo de ensambladores (N)** por horno.

> Se entiende por número óptimo al **mínimo número de ensambladores que maximice la producción de piezas terminadas en un día de trabajo (8 hs)**.

Esta definición fija dos condiciones simultáneas que cualquier solución debe cumplir: (a) maximizar la producción, y (b) entre todos los N que logren ese máximo, quedarse con el más chico.

## 3. Parámetros del problema

| Parámetro | Distribución | Media | Semirrango | Mínimo | Máximo |
|---|---|---|---|---|---|
| Tiempo de ensamble | Uniforme | 30 min | 5 min | 25 min | 35 min |
| Tiempo de cocción | Uniforme | 8 min | 2 min | 6 min | 10 min |
| Duración de la jornada | Fija | — | — | — | 480 min |

**Fórmula general para generar un valor uniforme entre [a, b] a partir de un número aleatorio RND ~ U(0,1):**

```
X = a + RND × (b − a)
```

Aplicada a este problema:

- Tiempo de ensamble = 25 + RND × 10
- Tiempo de cocción = 6 + RND × 4

## 4. Supuestos explícitos (a confirmar o ajustar si la cátedra especifica lo contrario)

- Todos los ensambladores son homogéneos: comparten la misma distribución de tiempo de ensamble.
- Hay un único horno, con capacidad para una pieza a la vez, y una única cola FIFO sin prioridades.
- El sistema arranca **vacío** en el instante 0 de cada réplica: los N ensambladores comienzan a ensamblar su primera pieza simultáneamente en t=0 (no hay período de calentamiento/warm-up, ya que la jornada es un ciclo de producción que se reinicia cada día).
- El tiempo de ensamble y el tiempo de cocción se generan con flujos de números aleatorios independientes entre sí (no correlacionados).
- La jornada se corta estrictamente en el minuto 480: cualquier pieza que en ese instante esté siendo ensamblada, en cola, o siendo horneada, **no se cuenta como terminada** y no se completa su evento pendiente.
- La duración de la jornada (480 minutos) es un **dato fijo del problema, no un parámetro configurable**. A diferencia de R (cantidad de réplicas) o del umbral de utilización, esto no se ajusta por corrida: **todas las simulaciones, para cualquier valor de N, deben cortar exactamente en el mismo minuto 480**, ya que es la condición que hace comparables los resultados entre distintos N.

## 5. Modelo conceptual

### 5.1 Objetos permanentes

Objetos cuya cantidad no varía durante la corrida (no se crean ni se destruyen).

**Horno** (1 instancia)
- Estados: `Libre` / `Ocupado`
- Atributos de control: cantidad de piezas en cola (FIFO), tiempo acumulado en estado Ocupado (para calcular utilización)

**Ensamblador** (N instancias, N fijo por corrida)
- Estados: `Ensamblando` / `Esperando` (este segundo estado cubre tanto el tiempo en cola por el horno como el tiempo en que su pieza está efectivamente dentro del horno — desde la perspectiva del ensamblador, en ambos casos está inactivo)

### 5.2 Entidad temporal

**Pieza**: se crea y se destruye dinámicamente durante la corrida; la cantidad de piezas no es fija.

- Se **crea** en el instante en que un ensamblador libre comienza a ensamblarla.
- Se **destruye** (se cuenta como terminada) en el instante en que sale del horno.
- Estados durante su ciclo de vida: `Siendo Ensamblada (S.E)` → `En cola de horno` → `Siendo Horneada (S.H)` → destruida
- Atributo: `ensamblador_id` — identifica a qué ensamblador pertenece. Es indispensable: cuando el horno termina de hornear, el sistema necesita saber a qué ensamblador específico devolverle el control para que comience su próxima pieza.

## 6. Eventos del sistema

Solo existen dos tipos de eventos. En un instante dado puede haber, como máximo, un evento "Fin Cocción" pendiente (porque el horno solo procesa una pieza a la vez) y hasta N eventos "Fin Ensamble" pendientes (uno por cada ensamblador que esté ensamblando en ese momento).

### 6.1 Fin Ensamble [ensamblador i]

Ocurre cuando el ensamblador *i* completa el tiempo de ensamble de su pieza actual.

Efecto:
1. La pieza de *i* pasa de `S.E` a intentar ingresar al horno.
2. Si el Horno está **Libre**:
   - Horno → `Ocupado`
   - La pieza pasa a `Siendo Horneada (S.H)`
   - Se genera y programa su evento Fin Cocción
3. Si el Horno está **Ocupado**:
   - La pieza pasa a `En cola de horno` (cola++)
4. El ensamblador *i* pasa a estado `Esperando` (sin importar si su pieza entró directo al horno o quedó en cola — de cualquier forma no puede empezar la próxima hasta que esta salga del horno).

### 6.2 Fin Cocción [pieza de ensamblador i]

Ocurre cuando la pieza que está dentro del horno completa su tiempo de cocción.

Efecto (en este orden, en el mismo instante de reloj):
1. Contador de piezas terminadas ++
2. Se libera el horno momentáneamente
3. Se revisa la cola:
   - Si hay al menos una pieza esperando (cola > 0): se retira la primera (FIFO, cola--), pasa de `En cola` a `Siendo Horneada`, el Horno vuelve a `Ocupado`, y se genera y programa su Fin Cocción.
   - Si la cola está vacía (cola = 0): el Horno queda en `Libre`.
4. El ensamblador *i* (dueño de la pieza que acaba de salir) pasa de `Esperando` a `Ensamblando`: se crea una **nueva pieza** (nueva entidad, con `ensamblador_id = i`), y se genera y programa su evento Fin Ensamble.

## 7. Variables de control

- **Reloj**: tiempo de simulación transcurrido.
- **Lista de eventos futuros**: el próximo Fin Ensamble de cada ensamblador que esté ensamblando, y el Fin Cocción de la pieza (si hay alguna) dentro del horno. En cada paso se avanza al evento de menor tiempo.
- **Contador de piezas terminadas**: se incrementa únicamente en el evento Fin Cocción.
- **Cola del horno**: cantidad de piezas esperando turno.
- **Tiempo acumulado de horno ocupado**: se acumula el tiempo transcurrido mientras el Horno está en estado `Ocupado`. Sirve para calcular la utilización del horno (ver sección 10).

## 8. Fin de la simulación

Cada réplica corre desde Reloj = 0 hasta Reloj = 480 minutos. No hay período de calentamiento (el sistema arranca vacío y esa es una condición representativa del problema, no un artefacto a descartar). Al llegar a 480:

- Se detiene la generación de nuevos eventos.
- El contador de piezas terminadas queda tal cual esté en ese instante.
- Cualquier pieza en curso (`S.E`, `En cola`, o `S.H`) en ese momento no se cuenta ni se completa.
- El tiempo acumulado de horno ocupado se cierra en ese instante (si el horno estaba `Ocupado` al cortar, se le suma el tiempo parcial transcurrido desde que empezó esa cocción hasta 480).

## 9. Diseño experimental

- **Rango de N a explorar**: parametrizable mediante dos valores de entrada, `N_mínimo` y `N_máximo` — por ejemplo, correr una vez con N_mínimo=1 y N_máximo=4, y en otra corrida con N_mínimo=1 y N_máximo=6, para comparar el N óptimo encontrado en cada rango. No hay un rango fijo impuesto por el enunciado: el programa debe permitir configurarlo antes de cada ejecución.
- Para cada valor de N, se deben correr **R réplicas independientes** (cada una una jornada completa de 480 minutos, partiendo de cero). R es un parámetro configurable, y debe usarse **el mismo valor de R para todos los N** que se comparen entre sí, para que las estimaciones sean comparables en precisión.
- Por cada réplica se registra como mínimo:
  - Tiempo total de horno ocupado (para la utilización)
  - Piezas terminadas (dato secundario/informativo, no es el criterio de decisión, pero sirve para verificar consistencia: cuando la utilización se acerca a 100%, la producción también debería estabilizarse)
- Para cada N, se calcula la **utilización promedio del horno** entre las R réplicas:

```
Utilización(N) = promedio_R( tiempo_horno_ocupado / 480 )
```

## 10. Criterios de determinación del N óptimo

El objetivo de la sección 2 es **el mínimo N que maximice la producción de piezas terminadas**. El problema práctico es que la producción no tiene un máximo nítido: crece con N hasta que el horno se satura y después se aplana, y dentro de esa meseta las diferencias entre un N y otro son ruido estadístico. Buscar literalmente "el N con más piezas" da respuestas distintas según la semilla y según R — con R=30 el máximo puede caer en N=8 cuando la curva ya está plana desde N=6.

Por eso el programa ofrece **tres criterios**, todos configurables desde la interfaz. Con los parámetros del enunciado los tres coinciden en **N = 6**, lo cual es una verificación cruzada valiosa: tres caminos independientes llegan al mismo resultado.

### 10.a Máxima producción (criterio principal)

Es la traducción operativa de la sección 2, y el criterio **por defecto**.

- **N óptimo = el mínimo N tal que `Producción(N+1) − Producción(N) < ganancia mínima`.**
- La *ganancia mínima* es parametrizable y expresa cuántas piezas por jornada tiene que aportar el ensamblador siguiente para justificar sumarlo. **Valor por defecto: 1 pieza.**
- Se compara con el **promedio sin truncar**. Truncar cuantiza la diferencia y borraría la distinción entre una ganancia de 0,9 piezas y una de 0,04.
- Se compara contra el vecino y no contra el máximo de la curva, porque el máximo es inestable frente al ruido y el vecino no.

**Limitación que hay que conocer**: el último N del rango no tiene sucesor, así que no se puede evaluar. Con un rango 1–6 este criterio no devuelve óptimo aunque 6 sea la respuesta; hace falta simular al menos hasta 7. La interfaz lo informa explícitamente en vez de dar el rango por agotado.

> **Precisión honesta sobre este criterio.** Formalmente responde *"a partir de qué N ya no conviene sumar otro ensamblador"*, que **no es idéntico** a *"qué N maximiza la producción"*. Con los parámetros del enunciado y una ganancia mínima de 1 pieza ambas preguntas tienen la misma respuesta (N = 6), y la producción truncada lo confirma: `floor(Producción(N))` vale 56 para todo N ≥ 6, de modo que 6 es efectivamente el mínimo N que alcanza la producción máxima entregable. Pero la equivalencia depende del modelo, no es una identidad general.

### 10.b Máxima capacidad del horno

Responde a "quiero exprimir el horno al máximo, sin importar cuántos ensambladores haga falta poner".

- **N óptimo = el mínimo N cuya utilización alcanza el techo físico del sistema**, con una tolerancia de 0,5 puntos porcentuales.
- El techo es el de la sección 10.1: `(480 − 25) / 480 ≈ 0,948`. **No** es el máximo observado dentro del rango simulado.

> **Por qué contra el techo y no contra el máximo del rango.** Definido como "el mínimo N que alcanza la utilización más alta observada", este criterio **siempre encuentra un N**, incluso cuando la curva todavía está subiendo: con un rango 1–4 devolvería N = 4, donde el horno está al 76 % y no está saturado ni cerca. Comparar contra una constante física del modelo evita ese falso positivo — con el rango 1–4 el criterio correctamente informa que ningún N satura el horno.

### 10.c Umbral de utilización manual

Es el criterio histórico y se conserva para poder explorar a mano qué pasa con distintas exigencias.

- **N óptimo = el mínimo N tal que `Utilización(N) ≥ umbral`.**
- El umbral es parametrizable. **Valor por defecto: 94 %** — ver la nota de la sección 10.1, que demuestra que la utilización tiene un techo alcanzable de ~0,948 y que un umbral del 95 % dejaría al problema sin solución.
- Su desventaja es justamente que la respuesta depende de que el usuario acierte un número: con 90 % da N = 5 y con 95 % no da ninguno.

En los tres casos, a partir del N óptimo agregar más ensambladores no aumenta la producción real — el excedente simplemente pasa más tiempo en cola esperando turno de horno.

### 10.d La producción real es un entero

La producción promedio es un número con decimales porque promedia R jornadas distintas, pero **una jornada concreta entrega piezas enteras**. Un promedio de 56,33 piezas significa que se completan **56** piezas: la 57.ª queda a medio cocinar cuando la jornada corta en el minuto 480, y una pieza incompleta no se entrega (sección 8). La conclusión debe informar el valor truncado como resultado y el promedio como el estadístico que es.

### 10.1 Relación entre utilización y producción

La utilización del horno y la producción de piezas no son dos criterios independientes, sino la misma información vista desde dos ángulos. Cuando el horno no tiene tiempo muerto, la cantidad de piezas que puede procesar en la jornada depende solo del tiempo medio de cocción:

```
Producción teórica máxima = 480 / E[tiempo de cocción] = 480 / 8 = 60 piezas
```

Y de forma más general, para cualquier N:

```
Producción esperada(N) ≈ Utilización(N) × (480 / 8)
```

Es decir: maximizar la utilización del horno **es equivalente a** maximizar la producción de piezas terminadas — el criterio de la sección 10 no reemplaza el objetivo de la sección 2, es la forma de alcanzarlo a través del recurso que actúa como cuello de botella. 60 piezas es el techo del sistema completo: ningún N, por más grande que sea, puede superarlo.

#### Nota: el techo de 60 piezas es una cota teórica, no un valor alcanzable

Las 60 piezas suponen que el horno está ocupado desde el instante 0. Eso no puede ocurrir en este modelo: como el sistema arranca **vacío** (sección 4), el horno permanece forzosamente ocioso hasta el primer Fin Ensamble. Ese arranque es un costo fijo que ningún N puede eliminar, solo reducir.

El ocio inicial es el mínimo de N tiempos de ensamble, cuya esperanza es:

```
E[mín de N ~ U(25, 35)] = 25 + 10 / (N + 1)
```

que tiende a 25 minutos cuando N crece. De ahí se desprenden los techos reales del sistema:

```
Utilización máxima alcanzable ≈ (480 − 25) / 480 ≈ 0,948
Producción máxima alcanzable  ≈ (480 − 25) / 8   ≈ 56,4 piezas
```

Verificado por simulación (R = 2000 réplicas): la utilización se aplana en 0,945 a partir de N = 6 y converge a 0,948 con N grande, sin superarlo nunca. Para N = 15, 25 y 50, el **tiempo ocioso total del horno coincide exactamente con el instante en que entra la primera pieza** (25,6 / 25,4 / 25,2 minutos): una vez que el horno arranca, ya no vuelve a detenerse. Eso confirma que el transitorio inicial es la única fuente de ocio en régimen saturado.

**Consecuencia práctica para la sección 10**: un umbral de tolerancia del 95 % es inalcanzable en este modelo y haría que ningún N calificara nunca como óptimo. El umbral debe fijarse por debajo de 0,948 — se adopta **94 % por defecto**, valor que identifica N = 6, que es donde ambas curvas se aplanan (de N=5 a N=6 la producción gana 2,2 piezas; de N=6 a N=7, solo 0,04).

Esto no invalida la relación `Producción(N) ≈ Utilización(N) × (480 / 8)`, que se cumple con un error máximo de 0,45 piezas en todo el rango: ambas magnitudes arrastran por igual el mismo transitorio inicial.

### 10.2 Gráficos XY para identificar el punto óptimo

Para poder ver el punto óptimo con claridad (y no solo inferirlo de una tabla de números), el programa debe generar **dos gráficos de línea/dispersión (XY)** en cada corrida (para el rango [N_mínimo, N_máximo] configurado):

1. **Gráfico 1 — Piezas terminadas**: eje X = N, eje Y = Producción promedio de piezas terminadas. Va primero porque es **la magnitud que la sección 2 pide maximizar**, y es el gráfico que decide con el criterio principal (10.a): se busca dónde la curva deja de subir.
2. **Gráfico 2 — Utilización del horno**: eje X = N, eje Y = Utilización promedio del horno. Explica *por qué* la producción se aplana donde se aplana: a partir del N óptimo el horno ya no tiene tiempo libre y pasa a ser el cuello de botella. Con los criterios 10.b y 10.c es este el gráfico que decide.

Por la relación de la sección 10.1 las dos curvas deberían aplanarse en el mismo N (o muy cerca). Si no coincide, es señal de revisar el modelo o de que hacen falta más réplicas.

La línea de referencia horizontal del Gráfico 2 debe ser **la que el criterio realmente usó**: el umbral configurado con el criterio 10.c, y el techo del sistema con los otros dos. Dibujar "Umbral 94 %" en una corrida decidida por producción daría a entender que ese número intervino en el resultado, y no fue así.

Ambos gráficos deben regenerarse cada vez que se cambia el rango [N_mínimo, N_máximo]. Esto importa en la práctica: si se corre, por ejemplo, solo de N=1 a N=4 y el horno recién se satura en N=5, **ninguno de los dos gráficos va a mostrar el aplanamiento todavía** — van a parecer curvas siempre crecientes, y hay que ampliar el rango (a 1-6, 1-8, etc.) hasta ver claramente dónde se estabilizan.

## 11. Resumen del flujo lógico

```
Para cada N en [N_mínimo..N_máximo]:
    Para cada réplica en [1..R]:
        Inicializar: Reloj=0, Horno=Libre, Cola=0, Contador=0, tiempo_horno_ocupado=0
        Los N ensambladores comienzan Ensamblando; se genera y programa
        el Fin Ensamble de cada uno

        Mientras Reloj < 480:
            Tomar el próximo evento (menor tiempo) de la lista de eventos futuros
            Avanzar Reloj a ese tiempo
            Si el evento es "Fin Ensamble [i]" → aplicar lógica de 6.1
            Si el evento es "Fin Cocción" → aplicar lógica de 6.2
            (si el nuevo tiempo de evento generado supera 480, no se cuenta
             ni se completa esa pieza — ver sección 8)

        Registrar de esta réplica: tiempo_horno_ocupado, piezas terminadas

    Calcular Utilización(N) = promedio de tiempo_horno_ocupado/480 entre las R réplicas
    Calcular Producción(N) = promedio de piezas terminadas entre las R réplicas

Graficar N vs Producción(N)       (Gráfico 1, sección 10.2)
Graficar N vs Utilización(N)      (Gráfico 2, sección 10.2)

Según el criterio elegido (sección 10):
    a) Máxima producción     → N óptimo = mínimo N tal que
                                 Producción(N+1) − Producción(N) < ganancia mínima
    b) Capacidad del horno   → N óptimo = mínimo N tal que
                                 Utilización(N) ≥ (480 − 25)/480 − 0,005
    c) Umbral manual         → N óptimo = mínimo N tal que Utilización(N) ≥ umbral

Si ningún N del rango cumple, no hay N óptimo: se informa el motivo y se pide
ampliar el rango (sección 10.2), nunca se devuelve el mejor disponible.

Producción entregable = truncar(Producción(N óptimo))    (sección 10.d)
```

## 12. Estadísticas de cómputo del programa

Además de las métricas del sistema simulado (utilización del horno, piezas terminadas), el programa debe registrar métricas sobre su **propio desempeño como software**. Son estadísticas de cómputo, no de la lógica de simulación, y no deben confundirse con las anteriores:

- **Tiempo de ejecución**: tiempo real que toma correr la simulación. Conviene medirlo en tres niveles: por réplica individual, acumulado por cada N (todas sus R réplicas), y total de la corrida completa (todo el rango [N_mínimo, N_máximo] configurado).
- **Recursos del sistema consumidos**: uso de CPU y memoria durante la ejecución, para poder evaluar cómo escala el programa a medida que crece N, R, o el rango explorado.

Esto sirve, entre otras cosas, para justificar la elección de R (cantidad de réplicas): si el tiempo de cómputo resulta alto, puede ser necesario un compromiso entre precisión estadística (más réplicas) y tiempo disponible para correr el programa.

## 13. Comunicación de resultados en la interfaz de usuario

Más allá de que la simulación esté bien resuelta, el usuario final tiene que poder entender qué configuró, qué le muestran los gráficos, y cuál es la conclusión — sin tener que interpretar tablas crudas ni buscar el dato importante entre el resto de la información.

### 13.1 Parámetros de la corrida

- Mostrar, agrupados y antes o junto a los resultados, los parámetros que el usuario configuró para esa corrida: `N_mínimo`, `N_máximo`, `R` (réplicas por N), umbral de utilización.
- Usar etiquetas (tags) breves y descriptivas junto a cada valor — por ejemplo "Réplicas por N: 30", "Rango explorado: N=1 a N=6", "Umbral de saturación: 95%" — en vez de números sueltos sin contexto. El usuario debe poder identificar de un vistazo qué configuración generó lo que está viendo.

### 13.2 Gráficos

- Los dos gráficos de la sección 10.2 deben tener: título claro sobre qué muestran, ambos ejes etiquetados con unidades ("N (ensambladores)"; "Utilización del horno (%)" / "Piezas terminadas (promedio)"), y una marca (tag/anotación) sobre el punto correspondiente al N óptimo encontrado — para que no haga falta leer una tabla aparte para ubicarlo.
- Evitar sumar series o ejes adicionales a esos mismos gráficos si no aportan a la decisión (por ejemplo, mezclar utilización y producción en un único gráfico con doble eje Y suele dificultar la lectura más de lo que ayuda). Es preferible mantener los dos gráficos simples y bien etiquetados por separado.

### 13.3 Resultado final

- El N óptimo encontrado debe presentarse como una conclusión explícita en lenguaje simple, no solo como una fila más de una tabla — por ejemplo, un tag o bloque destacado del tipo "N óptimo encontrado: 4 ensambladores (utilización del horno: 97%)" — ubicado en un lugar prominente de la pantalla.

### 13.4 Principio general: no sobrecargar la UI

- La vista principal debe mostrar solo lo necesario para tomar la decisión: los parámetros usados, los dos gráficos, y el resultado final.
- Cualquier detalle adicional (tabla completa de N vs. utilización vs. producción, las estadísticas de cómputo de la sección 12, tiempos por réplica, etc.) debe seguir disponible pero no visible por defecto — por ejemplo, en una sección secundaria o expandible — para que la pantalla principal se mantenga simple y legible.
