""" Qué hace: dada la tabla de resultados agregados por N, decide cuál es el N óptimo según el
criterio elegido por el usuario. Una función por criterio, sin estado.
Qué NO le corresponde: no simula nada, no promedia, no sabe qué es un reloj ni un evento, y no
conoce FastAPI ni Pydantic. Recibe una lista de diccionarios ya agregada y devuelve un entero.

Unidades: las utilizaciones son fracciones (0 a 1); las piezas, unidades por jornada.
"""

from __future__ import annotations

from typing import Any

from ..utils.constantes import (
    CRITERIO_CAPACIDAD_HORNO,
    CRITERIO_MAXIMA_PRODUCCION,
    CRITERIO_UMBRAL_MANUAL,
    TECHO_UTILIZACION,
    TOLERANCIA_CAPACIDAD,
)
MAXIMA_PRODUCCION = CRITERIO_MAXIMA_PRODUCCION
CAPACIDAD_HORNO = CRITERIO_CAPACIDAD_HORNO
UMBRAL_MANUAL = CRITERIO_UMBRAL_MANUAL


def determinar_n_optimo(
    resultados_por_n: list[dict[str, Any]],
    criterio: str,
    umbral_utilizacion: float,
    ganancia_minima: float,
) -> int | None:
    if criterio == MAXIMA_PRODUCCION:
        return por_maxima_produccion(resultados_por_n, ganancia_minima)
    if criterio == CAPACIDAD_HORNO:
        return por_capacidad_horno(resultados_por_n)
    if criterio == UMBRAL_MANUAL:
        return por_umbral_utilizacion(resultados_por_n, umbral_utilizacion)
    raise ValueError(f"Criterio desconocido: {criterio!r}")


def por_maxima_produccion(
    resultados_por_n: list[dict[str, Any]], ganancia_minima: float
) -> int | None:
    """Mínimo N a partir del cual sumar un ensamblador más ya no aporta producción.

        Producción(N+1) − Producción(N) < ganancia_minima  →  N es el óptimo

    Dos decisiones que no son obvias:

    1. **Se compara el promedio sin truncar.** Truncar cuantiza la diferencia y borraría la
       distinción entre una ganancia de 0,9 piezas y una de 0,04. El truncado se usa solo
       para *informar* la producción en la conclusión, no para decidir.
    2. **No se busca el máximo de la curva.** Con R chico el máximo cae donde lo ponga el
       azar: con R=30 y semilla 12345 el máximo está en N=8 (56,60 piezas), que no es la
       respuesta correcta — de N=6 en adelante la curva ya está plana y las diferencias son
       ruido. Comparar contra el vecino es estable: da N=6 con todo R y toda semilla probada.

    **El último N del rango no se puede evaluar**, porque no tiene sucesor con qué compararse.
    Con un rango 1..6 esta función devuelve `None` aunque 6 sea la respuesta: falta simular
    N=7 para saberlo. Eso no es una falla, es información que la interfaz debe transmitir.
    """
    for actual, siguiente in zip(resultados_por_n, resultados_por_n[1:]):
        if ganancia_entre(actual, siguiente) < ganancia_minima:
            return int(actual["n"])
    return None


def por_capacidad_horno(resultados_por_n: list[dict[str, Any]]) -> int | None:
    """Mínimo N que lleva el horno a su **techo físico**, no al máximo del rango.

    La definición intuitiva —"el mínimo N que alcanza la utilización más alta observada"—
    está mal: siempre encuentra un N, incluso cuando la curva todavía está subiendo. Con un
    rango 1..4 devolvería N=4, donde el horno está al 76 % y no está saturado ni cerca.

    Por eso se compara contra `TECHO_UTILIZACION` (≈ 0,948), que es la utilización máxima
    que este sistema puede alcanzar arrancando vacío, y no contra un
    máximo relativo al rango que el usuario haya elegido mirar.
    """
    minimo_exigido = TECHO_UTILIZACION - TOLERANCIA_CAPACIDAD
    for resultado in resultados_por_n:
        if resultado["utilizacion_promedio"] >= minimo_exigido:
            return int(resultado["n"])
    return None


def por_umbral_utilizacion(
    resultados_por_n: list[dict[str, Any]], umbral_utilizacion: float
) -> int | None:
    """Mínimo N cuya utilización promedio alcanza el umbral que fijó el usuario.

    Es el criterio histórico del proyecto. Se conserva porque permite explorar a mano dónde
    cae el óptimo con distintas exigencias, pero tiene la desventaja de que la respuesta
    depende de que el usuario acierte un número: con 90 % da N=5 y con 95 % no da ninguno

    N óptimo es el **mínimo** N que cruza, no el que maximiza: todos los N grandes rondan el
    techo, y el objetivo es quedarse con el más chico.
    """
    for resultado in resultados_por_n:
        if resultado["utilizacion_promedio"] >= umbral_utilizacion:
            return int(resultado["n"])
    return None


def ganancia_entre(actual: dict[str, Any], siguiente: dict[str, Any]) -> float:
    """Piezas que aporta pasar de un N al siguiente.

    Puede ser negativa: con R chico, dos N de la zona plana difieren solo por ruido.
    """
    return float(siguiente["piezas_promedio"]) - float(actual["piezas_promedio"])


def ganancia_del_siguiente(
    resultados_por_n: list[dict[str, Any]], n: int
) -> float | None:
    """Piezas que aportaría pasar de `n` al N siguiente del rango.

    Es el número que justifica el corte en la conclusión ("pasar de 6 a 7 suma 0,00 piezas").
    """
    for actual, siguiente in zip(resultados_por_n, resultados_por_n[1:]):
        if actual["n"] == n:
            return ganancia_entre(actual, siguiente)
    return None
