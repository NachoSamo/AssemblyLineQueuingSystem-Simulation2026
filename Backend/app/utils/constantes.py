"""Datos fijos del enunciado del Ejercicio 135.

Qué hace: define los valores del modelo que **no** son configurables por el usuario.
Qué NO le corresponde: no guarda configuración del servicio web (eso vive en `app/config.py`)
ni parámetros de corrida elegidos por el usuario (N, R, umbral, semilla — llegan por request).
"""

# --- Jornada -----------------------------------------------------------------

#: Duración de una jornada de trabajo, en minutos (8 horas)
DURACION_JORNADA: int = 480

# --- Tiempo de ensamble: Uniforme(25, 35), media 30 ± 5 -----------------

#: Mínimo del tiempo de ensamble, en minutos.
ENSAMBLE_MINIMO: int = 25
#: Máximo del tiempo de ensamble, en minutos.
ENSAMBLE_MAXIMO: int = 35

# --- Tiempo de cocción: Uniforme(6, 10), media 8 ± 2 --------------------

#: Mínimo del tiempo de cocción, en minutos.
COCCION_MINIMO: int = 6
#: Máximo del tiempo de cocción, en minutos.
COCCION_MAXIMO: int = 10

# --- Derivados de referencia -----------------

#: Media del tiempo de cocción, en minutos. Determina el techo del sistema.
COCCION_MEDIA: float = (COCCION_MINIMO + COCCION_MAXIMO) / 2

#: Techo teórico de producción: 480 / 8 = 60 piezas por jornada.
#: Ningún N puede superarlo; si la simulación devuelve más, hay un error en el motor.
PRODUCCION_TEORICA_MAXIMA: float = DURACION_JORNADA / COCCION_MEDIA

# --- Techo real del sistema ------------------------------------------

#: Utilización máxima alcanzable del horno, como fracción.
#: No es 1. El sistema arranca **vacío**, así que el horno queda forzosamente ocioso
#: hasta el primer Fin Ensamble: como mínimo `ENSAMBLE_MINIMO` minutos. Ese arranque es un
#: costo fijo que ningún N puede eliminar, solo reducir (el ocio esperado es
#: `25 + 10/(N+1)`, que tiende a 25 cuando N crece).
#:
#: Se demuestra y lo verifica por simulación: con N grande, el
#: tiempo ocioso total del horno coincide exactamente con el instante en que entra la primera
#: pieza. De acá sale que un umbral del 95 % es inalcanzable en este modelo.
TECHO_UTILIZACION: float = (DURACION_JORNADA - ENSAMBLE_MINIMO) / DURACION_JORNADA

#: Cuánto puede quedar por debajo del techo una utilización para considerarla saturada.
#:
#: Medio punto porcentual. No es configurable a propósito: es una tolerancia de medición
#: contra una constante física del modelo, no una preferencia del usuario. Si fuera un
#: parámetro, el criterio "usar la máxima capacidad del horno" volvería a depender de que
#: alguien acierte un número, que es justamente lo que ese criterio evita.
TOLERANCIA_CAPACIDAD: float = 0.005

# --- Criterios del N óptimo (§10) --------------------------------------------

# Los identificadores viven acá, y no en `services/criterios.py`, para que `models/request.py`
# pueda validarlos sin importar la capa de servicios. La lógica de cada criterio sí vive en
# `services/criterios.py`; acá solo están los nombres.

#: Criterio del enunciado (§2): mínimo N a partir del cual sumar otro ensamblador ya no aporta.
CRITERIO_MAXIMA_PRODUCCION: str = "maxima_produccion"
#: Mínimo N que lleva el horno a su techo físico (§10.1).
CRITERIO_CAPACIDAD_HORNO: str = "capacidad_horno"
#: Mínimo N que supera un umbral de utilización que fija el usuario.
CRITERIO_UMBRAL_MANUAL: str = "umbral_manual"

#: Criterios válidos, con su nombre mostrable. El orden es el que usa la interfaz.
ETIQUETAS_CRITERIOS: dict[str, str] = {
    CRITERIO_MAXIMA_PRODUCCION: "máxima producción",
    CRITERIO_CAPACIDAD_HORNO: "máxima capacidad del horno",
    CRITERIO_UMBRAL_MANUAL: "umbral de utilización manual",
}

# --- Topes de guardia de la API ----------------------------

#: Tope superior de N aceptado, para que una entrada absurda no cuelgue el servidor.
N_MAXIMO_PERMITIDO: int = 100
#: Tope superior de réplicas por N aceptado, por el mismo motivo.
REPLICAS_MAXIMO_PERMITIDO: int = 100_000
