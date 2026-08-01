"""Reconstrucción del vector de estado de **una** réplica puntual.

Qué hace: dada la semilla de una corrida ya ejecutada y el par (N, réplica) que el usuario
quiere inspeccionar, vuelve a correr **esa sola** réplica pidiéndole al motor que registre la
traza, y devuelve las filas junto con los totales que el frontend necesita para paginar.
Qué NO le corresponde: no barre N, no promedia, no calcula el N óptimo, no pagina y no sabe nada de HTTP.

Por qué recalcula en vez de guardar?
-----------------------------------
Las semillas se derivan de forma determinística por par (N, réplica) con
`derivar_flujos_de_replica(raiz, indice_global)`. Con la misma semilla, el mismo `n_minimo` y
el mismo `replicas`, esta función reproduce **exactamente** la jornada que ya se promedió en la
corrida: no hace falta guardar nada en el servidor ni mandar 21.000 filas en la respuesta
principal. Recalcular una réplica cuesta menos de un milisegundo.

Contrapartida, y es importante: `indice_global` se calcula acá con la **misma fórmula** que en
`experimento_service.ejecutar_experimento`. Si esa fórmula cambia en un solo lado, el vector de
estado deja de corresponder a la corrida que el usuario está mirando, sin dar ningún error.
"""

from __future__ import annotations

from typing import Any

from ..utils.generadores import crear_semilla_raiz, derivar_flujos_de_replica
from .motor_simulacion import FilaVectorEstado, ejecutar_replica


def obtener_vector_estado(
    semilla: int,
    n_minimo: int,
    replicas: int,
    n: int,
    replica: int,
) -> dict[str, Any]:
    """Devuelve el vector de estado completo de la réplica pedida.

    :param semilla: semilla efectiva de la corrida, tal como vino en `parametros.semilla`.
    :param n_minimo: primer N del barrido de esa corrida. Hace falta para reconstruir el
        índice global de la réplica; no se usa para simular.
    :param replicas: R de esa corrida. Misma razón.
    :param n: cantidad de ensambladores de la réplica a inspeccionar.
    :param replica: número de réplica, **empezando en 1** (como se muestra en pantalla).
    :return: diccionario con `n`, `replica`, `total_replicas`, `total_piezas`, `total_filas`
        y `filas`, según el contrato de `Backend.md` §3.2.
    """
    raiz = crear_semilla_raiz(semilla)

    # Misma fórmula que `experimento_service.ejecutar_experimento`. El `- 1` traduce la
    # numeración de pantalla (1..R) a la interna (0..R-1).
    indice_global = (n - n_minimo) * replicas + (replica - 1)
    flujo_ensamble, flujo_coccion = derivar_flujos_de_replica(raiz, indice_global)

    filas: list[FilaVectorEstado] = []
    ejecutar_replica(n, flujo_ensamble, flujo_coccion, traza=filas)

    return {
        "n": n,
        "replica": replica,
        "total_replicas": replicas,
        # Las columnas de piezas crecen a lo largo de la jornada; la última fila tiene todas.
        "total_piezas": len(filas[-1].piezas) if filas else 0,
        "total_filas": len(filas),
        "filas": [_a_diccionario(fila, replica) for fila in filas],
    }


def _a_diccionario(fila: FilaVectorEstado, replica: int) -> dict[str, Any]:
    """Convierte una fila del motor al diccionario plano del contrato.

    La traducción vive acá, y no en el motor, porque el motor no debe conocer el contrato de
    El motor tampoco sabe qué número de réplica está corriendo 
    es el servicio el que lo agrega, para que cada fila sea autodescriptiva y se pueda mostrar la columna R 
    que pidió el enunciado del TP.

    :param fila: fila tal como la produjo el motor.
    :param replica: número de réplica al que pertenece la fila (base 1).
    :return: diccionario con las claves del contrato.
    """
    return {
        "replica": replica,
        "iteracion": fila.iteracion,
        "evento": fila.evento,
        "reloj": fila.reloj,
        "ensambladores": [
            {
                "rnd": columna.rnd,
                "tiempo": columna.tiempo,
                "fin_ensamble": columna.fin_ensamble,
                "estado": columna.estado,
            }
            for columna in fila.ensambladores
        ],
        "rnd_coccion": fila.rnd_coccion,
        "tiempo_coccion": fila.tiempo_coccion,
        "fin_coccion": fila.fin_coccion,
        "horno_estado": fila.horno_estado,
        "cola": fila.cola,
        "piezas_terminadas": fila.piezas_terminadas,
        "piezas": list(fila.piezas),
    }
