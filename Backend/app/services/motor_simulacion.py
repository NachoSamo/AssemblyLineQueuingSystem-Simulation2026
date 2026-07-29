"""Motor de simulación de eventos discretos: **una** réplica de una jornada.

Qué hace: ejecuta una jornada completa de 480 minutos para un N dado, con el bucle
clásico de siguiente-evento (reloj + lista de eventos futuros). Devuelve el tiempo de
horno ocupado y las piezas terminadas de esa réplica.
Corresponde a: `Dominio.md` §5 (modelo conceptual), §6 (los dos eventos), §7 (variables
de control), §8 (fin de la simulación) y §11 (flujo lógico).
Qué NO le corresponde: no sabe qué es FastAPI, ni Pydantic, ni JSON, ni HTTP. No recorre
varios N ni varias réplicas (eso es de `experimento_service`), no promedia nada y no mide
tiempos de cómputo.

Regla de oro (`Backend.md` §4.2): este módulo debe poder ejecutarse desde un script suelto
de cinco líneas para trazar una réplica y compararla contra el vector de estado de la
planilla `Ejercicio 135 Final Planteo.ods`. Por eso solo importa NumPy y la biblioteca
estándar.

Unidades: todo el tiempo de este módulo es **tiempo simulado, en minutos**.
"""

from __future__ import annotations

import math
from collections import deque
from dataclasses import dataclass

from ..utils.constantes import (
    COCCION_MAXIMO,
    COCCION_MINIMO,
    DURACION_JORNADA,
    ENSAMBLE_MAXIMO,
    ENSAMBLE_MINIMO,
)
from ..utils.generadores import FlujoAleatorio, uniforme

#: Marca de "sin evento programado" en la lista de eventos futuros.
SIN_EVENTO: float = math.inf


@dataclass(frozen=True, slots=True)
class ResultadoReplica:
    """Lo que deja registrado una réplica (`Dominio.md` §9).

    :param tiempo_horno_ocupado: minutos que el horno estuvo en estado `Ocupado`
        durante la jornada, incluido el tramo parcial de la cocción en curso al corte (§8).
    :param piezas_terminadas: cantidad de piezas que salieron del horno antes del minuto 480.
    """

    tiempo_horno_ocupado: float
    piezas_terminadas: int


def ejecutar_replica(
    n_ensambladores: int,
    flujo_ensamble: FlujoAleatorio,
    flujo_coccion: FlujoAleatorio,
    duracion_jornada: float = DURACION_JORNADA,
) -> ResultadoReplica:
    """Simula una jornada completa para un número fijo de ensambladores.

    Bucle de siguiente-evento fiel a `Dominio.md` §11: se toma el evento futuro de menor
    tiempo, se avanza el reloj hasta él y se aplica la lógica de §6.1 o §6.2 según el tipo.

    :param n_ensambladores: N, cantidad de ensambladores que comparten el horno (>= 1).
    :param flujo_ensamble: flujo de RND del que salen los tiempos de ensamble.
    :param flujo_coccion: flujo de RND del que salen los tiempos de cocción.
        Debe ser **independiente** del anterior (`Dominio.md` §4).
    :param duracion_jornada: minuto de corte. Es un dato fijo del enunciado (480) y está
        acá solo para no repetir la constante dentro del bucle; no es un parámetro de la API.
    :return: `ResultadoReplica` con el tiempo de horno ocupado (minutos) y las piezas terminadas.
    """
    # --- Inicialización (§11, §4.7 de Backend.md): el sistema arranca vacío -------------
    reloj: float = 0.0
    horno_ocupado: bool = False
    cola: deque[int] = deque()  # IDs de ensambladores cuya pieza espera turno (FIFO, §4.3)
    tiempo_horno_ocupado: float = 0.0
    piezas_terminadas: int = 0

    # Lista de eventos futuros (§7): un Fin Ensamble por ensamblador que esté ensamblando...
    fin_ensamble: list[float] = [
        uniforme(ENSAMBLE_MINIMO, ENSAMBLE_MAXIMO, flujo_ensamble)
        for _ in range(n_ensambladores)
    ]
    # ...y como máximo un Fin Cocción, porque el horno procesa de a una pieza (§6).
    fin_coccion: float = SIN_EVENTO
    ensamblador_en_horno: int = -1  # dueño de la pieza que está dentro del horno (§5.2)
    inicio_coccion_actual: float = 0.0  # para poder cerrar el tramo parcial al corte (§8)

    while True:
        # --- Próximo evento: el de menor tiempo ----------------------------------------
        proximo_ensamble = min(fin_ensamble)
        proximo_evento = min(proximo_ensamble, fin_coccion)

        # --- Corte de la jornada (§8) --------------------------------------------------
        # La jornada corta estrictamente en el minuto 480: el evento que caiga en 480 o
        # después no se ejecuta, y la pieza asociada no se cuenta.
        if proximo_evento >= duracion_jornada:
            # Si el horno estaba Ocupado al cortar, se le suma el TRAMO PARCIAL de esa
            # cocción (desde que empezó hasta 480) — no la cocción completa, ni cero.
            # Es el error que produce utilizaciones sistemáticamente bajas.
            if horno_ocupado:
                tiempo_horno_ocupado += duracion_jornada - inicio_coccion_actual
            break

        reloj = proximo_evento

        if fin_coccion <= proximo_ensamble:
            # --- Evento Fin Cocción (§6.2) ---------------------------------------------
            # El orden de estos cuatro pasos es parte del modelo; alterarlo cambia los
            # resultados numéricos (`Backend.md` §4.4).
            ensamblador_duenio = ensamblador_en_horno

            # 1. Contar la pieza terminada.
            piezas_terminadas += 1

            # 2. Liberar el horno y cerrar su tramo de ocupación.
            tiempo_horno_ocupado += reloj - inicio_coccion_actual
            horno_ocupado = False
            fin_coccion = SIN_EVENTO
            ensamblador_en_horno = -1

            # 3. Revisar la cola: si hay alguien esperando, entra el primero (FIFO).
            if cola:
                ensamblador_en_horno = cola.popleft()
                horno_ocupado = True
                inicio_coccion_actual = reloj
                fin_coccion = reloj + uniforme(COCCION_MINIMO, COCCION_MAXIMO, flujo_coccion)

            # 4. El ensamblador dueño de la pieza que salió vuelve a Ensamblando:
            #    se crea una nueva pieza y se programa su Fin Ensamble.
            fin_ensamble[ensamblador_duenio] = reloj + uniforme(
                ENSAMBLE_MINIMO, ENSAMBLE_MAXIMO, flujo_ensamble
            )
        else:
            # --- Evento Fin Ensamble [ensamblador i] (§6.1) ----------------------------
            ensamblador = fin_ensamble.index(proximo_ensamble)

            if not horno_ocupado:
                # El horno está Libre: la pieza entra y se programa su Fin Cocción.
                horno_ocupado = True
                ensamblador_en_horno = ensamblador
                inicio_coccion_actual = reloj
                fin_coccion = reloj + uniforme(COCCION_MINIMO, COCCION_MAXIMO, flujo_coccion)
            else:
                # El horno está Ocupado: la pieza se encola (FIFO, conservando su dueño).
                cola.append(ensamblador)

            # El ensamblador queda Esperando en LOS DOS CASOS: entre directo al horno o
            # haya quedado en cola, no puede empezar la próxima pieza hasta que esta salga.
            fin_ensamble[ensamblador] = SIN_EVENTO

    return ResultadoReplica(
        tiempo_horno_ocupado=tiempo_horno_ocupado,
        piezas_terminadas=piezas_terminadas,
    )
