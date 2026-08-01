""" Recorre `n_minimo..n_maximo`, ejecuta R réplicas por cada N llamando al motor,
agrega los resultados con NumPy (promedios y desvíos), arma la conclusión delegando la
decisión en `criterios` y orquesta la medición de tiempos delegando en `metricas_computo`.

Que NO le corresponde: no implementa la lógica de eventos (eso es del motor), no decide
cuál es el N óptimo (eso es de `criterios.py`), no valida la entrada (eso es de
`models/request.py`) y no sabe nada de HTTP. Tampoco pide la traza del vector de estado:
el barrido corre sin trazar.

Unidades: el tiempo simulado va en minutos; el tiempo real de cómputo, en milisegundos.
"""

from __future__ import annotations

import math
import time
from typing import Any

import numpy as np

from ..utils import constantes
from ..utils.generadores import crear_semilla_raiz, derivar_flujos_de_replica, resolver_semilla
from .criterios import MAXIMA_PRODUCCION, determinar_n_optimo, ganancia_del_siguiente
from .metricas_computo import Cronometro, MedidorRecursos
from .motor_simulacion import ejecutar_replica


def ejecutar_experimento(
    n_minimo: int,
    n_maximo: int,
    replicas: int,
    umbral_utilizacion: float,
    semilla: int | None = None,
    criterio: str = MAXIMA_PRODUCCION,
    ganancia_minima: float = 1.0,
) -> dict[str, Any]:
    """Corre el experimento completo y devuelve todos los resultados.

    Implementa el flujo de `Dominio.md` §11::

        Para cada N en [n_minimo .. n_maximo]:
            Para cada réplica en [1 .. R]:
                resultado = motor.ejecutar_replica(N, flujos de esa réplica)
            Utilización(N) = promedio(tiempo_horno_ocupado / 480)
            Producción(N)  = promedio(piezas_terminadas)
        n_optimo = el que decida `criterios.determinar_n_optimo`

    :param n_minimo: primer N del barrido (>= 1).
    :param n_maximo: último N del barrido (>= n_minimo).
    :param replicas: R, jornadas simuladas por cada N. **El mismo R para todos los N**:
        es lo que hace comparables las estimaciones entre valores de N (§9).
    :param umbral_utilizacion: fracción (0 a 1) a partir de la cual se considera saturado
        el horno. Solo se usa con el criterio `umbral_manual` (§10).
    :param semilla: semilla de la corrida, o `None` para generar una.
    :param criterio: cuál de los tres criterios de `criterios.py` decide el N óptimo.
    :param ganancia_minima: piezas que tiene que aportar el N siguiente para que valga la
        pena sumarlo. Solo se usa con el criterio `maxima_produccion`.
    :return: diccionario con las claves `parametros`, `resultados_por_n`, `n_optimo`,
        `alcanzo_criterio`, `utilizacion_n_optimo`, `piezas_n_optimo`,
        `piezas_n_optimo_truncadas`, `ganancia_n_optimo`, `utilizacion_maxima_rango` y
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
            #crea arreglos para guardar los resultados de cada replica de N
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
                #Linea clave ejecuta la simulacion de cada replica de N
                resultado = ejecutar_replica(n, flujo_ensamble, flujo_coccion)
                acumulado_n_ms += (time.perf_counter() - inicio) * 1000.0

                #Recoleccion de datos de cada simulacion dentro de una lista 
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

    # La decisión no vive acá: este servicio corre el experimento, `criterios` lo interpreta.
    n_optimo = determinar_n_optimo(
        resultados_por_n, criterio, umbral_utilizacion, ganancia_minima
    )
    optimo = next((f for f in resultados_por_n if f["n"] == n_optimo), None)

    return {
        "parametros": {
            "n_minimo": n_minimo,
            "n_maximo": n_maximo,
            "replicas": replicas,
            "criterio": criterio,
            "ganancia_minima": ganancia_minima,
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
        "alcanzo_criterio": n_optimo is not None,
        "utilizacion_n_optimo": optimo["utilizacion_promedio"] if optimo else None,
        "piezas_n_optimo": optimo["piezas_promedio"] if optimo else None,
        # La producción REAL: la pieza que quedó a medio cocinar en el minuto 480 no se
        # entrega, así que 56,33 de promedio son 56 piezas completas (§8).
        "piezas_n_optimo_truncadas": (
            int(math.floor(optimo["piezas_promedio"])) if optimo else None
        ),
        # Lo que justifica el corte en la conclusión: "pasar de 6 a 7 suma 0,00 piezas".
        # Es `None` si el N óptimo es el último del rango: no hay sucesor con qué comparar.
        "ganancia_n_optimo": (
            ganancia_del_siguiente(resultados_por_n, n_optimo) if n_optimo is not None else None
        ),
        "utilizacion_maxima_rango": max(
            f["utilizacion_promedio"] for f in resultados_por_n
        ),
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
