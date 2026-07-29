"""Diseño experimental: barrido de N, promedios entre réplicas y N óptimo.

Qué hace: recorre `n_minimo..n_maximo`, ejecuta R réplicas por cada N llamando al motor,
agrega los resultados con NumPy (promedios y desvíos), determina el N óptimo según el
umbral y orquesta la medición de tiempos delegando en `metricas_computo`.
Corresponde a: `Dominio.md` §9 (diseño experimental), §10 (criterio del N óptimo),
§10.1 (relación utilización–producción) y §11 (flujo lógico). También `Backend.md` §5.
Qué NO le corresponde: no implementa la lógica de eventos (eso es del motor), no valida
la entrada (eso es de `models/request.py`) y no sabe nada de HTTP.

Unidades: el tiempo simulado va en minutos; el tiempo real de cómputo, en milisegundos.
Devuelve un diccionario plano que respeta exactamente el contrato de `Backend.md` §3,
para que el controller solo tenga que envolverlo en el modelo Pydantic.
"""

from __future__ import annotations

import time
from typing import Any

import numpy as np

from ..utils import constantes
from ..utils.generadores import crear_semilla_raiz, derivar_flujos_de_replica, resolver_semilla
from .metricas_computo import Cronometro, MedidorRecursos
from .motor_simulacion import ejecutar_replica


def ejecutar_experimento(
    n_minimo: int,
    n_maximo: int,
    replicas: int,
    umbral_utilizacion: float,
    semilla: int | None = None,
) -> dict[str, Any]:
    """Corre el experimento completo y devuelve todos los resultados.

    Implementa el flujo de `Dominio.md` §11::

        Para cada N en [n_minimo .. n_maximo]:
            Para cada réplica en [1 .. R]:
                resultado = motor.ejecutar_replica(N, flujos de esa réplica)
            Utilización(N) = promedio(tiempo_horno_ocupado / 480)
            Producción(N)  = promedio(piezas_terminadas)
        n_optimo = mínimo N con Utilización(N) >= umbral

    :param n_minimo: primer N del barrido (>= 1).
    :param n_maximo: último N del barrido (>= n_minimo).
    :param replicas: R, jornadas simuladas por cada N. **El mismo R para todos los N**:
        es lo que hace comparables las estimaciones entre valores de N (§9).
    :param umbral_utilizacion: fracción (0 a 1) a partir de la cual se considera saturado
        el horno (§10).
    :param semilla: semilla de la corrida, o `None` para generar una.
    :return: diccionario con las claves `parametros`, `resultados_por_n`, `n_optimo`,
        `alcanzo_umbral`, `utilizacion_n_optimo`, `piezas_n_optimo` y
        `estadisticas_computo`, según el contrato de `Backend.md` §3.
    """
    semilla_efectiva = resolver_semilla(semilla)
    raiz = crear_semilla_raiz(semilla_efectiva)

    medidor = MedidorRecursos()
    medidor.iniciar()

    resultados_por_n: list[dict[str, Any]] = []
    tiempo_por_n: list[dict[str, Any]] = []
    tiempo_replicas_ms_total: float = 0.0
    total_replicas: int = 0

    with Cronometro() as crono_total:
        for n in range(n_minimo, n_maximo + 1):
            tiempos_horno = np.empty(replicas, dtype=np.float64)
            piezas = np.empty(replicas, dtype=np.float64)
            acumulado_n_ms: float = 0.0

            for indice in range(replicas):
                # Índice global único por par (N, réplica): así cada réplica tiene su propio
                # subárbol de semillas y el resultado no depende del orden de ejecución (§4.6).
                indice_global = (n - n_minimo) * replicas + indice
                flujo_ensamble, flujo_coccion = derivar_flujos_de_replica(raiz, indice_global)

                # Se cronometra alrededor de la réplica, nunca dentro del bucle de eventos.
                inicio = time.perf_counter()
                resultado = ejecutar_replica(n, flujo_ensamble, flujo_coccion)
                acumulado_n_ms += (time.perf_counter() - inicio) * 1000.0

                tiempos_horno[indice] = resultado.tiempo_horno_ocupado
                piezas[indice] = resultado.piezas_terminadas

            # --- Agregación con NumPy sobre las R réplicas (§9, Backend.md §5) ----------
            utilizaciones = tiempos_horno / constantes.DURACION_JORNADA
            resultados_por_n.append(
                {
                    "n": n,
                    "utilizacion_promedio": float(utilizaciones.mean()),
                    "piezas_promedio": float(piezas.mean()),
                    "tiempo_horno_ocupado_promedio": float(tiempos_horno.mean()),
                    "utilizacion_desvio": _desvio_muestral(utilizaciones),
                    "piezas_desvio": _desvio_muestral(piezas),
                }
            )
            tiempo_por_n.append({"n": n, "tiempo_ms": acumulado_n_ms})
            tiempo_replicas_ms_total += acumulado_n_ms
            total_replicas += replicas
            medidor.muestrear()

    medidor.finalizar()

    n_optimo, utilizacion_n_optimo, piezas_n_optimo = _determinar_n_optimo(
        resultados_por_n, umbral_utilizacion
    )

    return {
        "parametros": {
            "n_minimo": n_minimo,
            "n_maximo": n_maximo,
            "replicas": replicas,
            "umbral_utilizacion": umbral_utilizacion,
            "semilla": semilla_efectiva,
            "duracion_jornada": constantes.DURACION_JORNADA,
            "tiempo_ensamble": {
                "minimo": constantes.ENSAMBLE_MINIMO,
                "maximo": constantes.ENSAMBLE_MAXIMO,
            },
            "tiempo_coccion": {
                "minimo": constantes.COCCION_MINIMO,
                "maximo": constantes.COCCION_MAXIMO,
            },
        },
        "resultados_por_n": resultados_por_n,
        "n_optimo": n_optimo,
        "alcanzo_umbral": n_optimo is not None,
        "utilizacion_n_optimo": utilizacion_n_optimo,
        "piezas_n_optimo": piezas_n_optimo,
        "estadisticas_computo": {
            "tiempo_total_ms": crono_total.duracion_ms,
            "tiempo_por_n": tiempo_por_n,
            "tiempo_promedio_replica_ms": (
                tiempo_replicas_ms_total / total_replicas if total_replicas else 0.0
            ),
            "memoria_pico_mb": medidor.memoria_pico_mb,
            "cpu_porcentaje": medidor.cpu_porcentaje,
        },
    }


def _desvio_muestral(valores: np.ndarray) -> float:
    """Desvío estándar muestral (ddof=1) de las réplicas de un N.

    Se usa el estimador muestral porque las R réplicas son una muestra, no la población:
    es lo que permite justificar si R alcanzó (`Backend.md` §3.1). Con una sola réplica el
    desvío no está definido y se informa 0.0.

    :param valores: arreglo con el valor observado en cada réplica.
    :return: desvío estándar, en la misma unidad que `valores`.
    """
    if valores.size < 2:
        return 0.0
    return float(valores.std(ddof=1))


def _determinar_n_optimo(
    resultados_por_n: list[dict[str, Any]], umbral_utilizacion: float
) -> tuple[int | None, float | None, float | None]:
    """Devuelve el N óptimo y sus valores asociados (`Dominio.md` §10).

    N óptimo es el **mínimo** N cuya utilización promedio alcanza el umbral, no el que la
    maximiza: todos los N grandes rondan el 100 %, y el objetivo del §2 es quedarse con el
    más chico que ya logra la producción máxima. Como `resultados_por_n` viene en orden
    ascendente de N, alcanza con devolver el primero que cruza.

    Si ninguno cruza, se devuelve `(None, None, None)`: el frontend muestra el aviso de
    ampliar el rango (§10.2) en vez de presentar el mejor disponible como si fuera la
    respuesta.

    :param resultados_por_n: resultados agregados, en orden ascendente de N.
    :param umbral_utilizacion: fracción (0 a 1) que define la saturación del horno.
    :return: tupla `(n_optimo, utilizacion_n_optimo, piezas_n_optimo)`.
    """
    for resultado in resultados_por_n:
        if resultado["utilizacion_promedio"] >= umbral_utilizacion:
            return (
                resultado["n"],
                resultado["utilizacion_promedio"],
                resultado["piezas_promedio"],
            )
    return None, None, None
