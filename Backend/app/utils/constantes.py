"""Datos fijos del enunciado del Ejercicio 135.

Qué hace: define los valores del modelo que **no** son configurables por el usuario.
Corresponde a: `Dominio.md` §3 (parámetros del problema) y §4 (supuestos explícitos).
Qué NO le corresponde: no guarda configuración del servicio web (eso vive en `app/config.py`)
ni parámetros de corrida elegidos por el usuario (N, R, umbral, semilla — llegan por request).

Por qué son constantes y no parámetros
--------------------------------------
`Dominio.md` §4 lo indica de forma explícita: la duración de la jornada es un dato fijo
del problema. Todas las simulaciones, para cualquier valor de N, deben cortar exactamente
en el mismo minuto 480, porque es la condición que hace comparables los resultados entre
distintos N. Lo mismo vale para los tiempos del enunciado (ensamble 30 ± 5, cocción 8 ± 2):
si se pudieran editar, la corrida dejaría de resolver el Ejercicio 135.

Estos valores se **muestran** en la interfaz como solo lectura (viajan en
`parametros` dentro de la respuesta de la API), pero no se **editan**.
"""

# --- Jornada -----------------------------------------------------------------

#: Duración de una jornada de trabajo, en minutos (8 horas). Fija (§4).
DURACION_JORNADA: int = 480

# --- Tiempo de ensamble: Uniforme(25, 35), media 30 ± 5 (§3) -----------------

#: Mínimo del tiempo de ensamble, en minutos.
ENSAMBLE_MINIMO: int = 25
#: Máximo del tiempo de ensamble, en minutos.
ENSAMBLE_MAXIMO: int = 35

# --- Tiempo de cocción: Uniforme(6, 10), media 8 ± 2 (§3) --------------------

#: Mínimo del tiempo de cocción, en minutos.
COCCION_MINIMO: int = 6
#: Máximo del tiempo de cocción, en minutos.
COCCION_MAXIMO: int = 10

# --- Derivados de referencia (solo para verificación, §10.1) -----------------

#: Media del tiempo de cocción, en minutos. Determina el techo del sistema.
COCCION_MEDIA: float = (COCCION_MINIMO + COCCION_MAXIMO) / 2

#: Techo teórico de producción: 480 / 8 = 60 piezas por jornada (§10.1).
#: Ningún N puede superarlo; si la simulación devuelve más, hay un error en el motor.
PRODUCCION_TEORICA_MAXIMA: float = DURACION_JORNADA / COCCION_MEDIA

# --- Topes de guardia de la API (Backend.md §3.1) ----------------------------

#: Tope superior de N aceptado, para que una entrada absurda no cuelgue el servidor.
N_MAXIMO_PERMITIDO: int = 100
#: Tope superior de réplicas por N aceptado, por el mismo motivo.
REPLICAS_MAXIMO_PERMITIDO: int = 100_000
