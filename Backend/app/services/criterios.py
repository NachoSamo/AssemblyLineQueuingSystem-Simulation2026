"""Los tres criterios para elegir el N óptimo.

Qué hace: dada la tabla de resultados agregados por N, decide cuál es el N óptimo según el
criterio elegido por el usuario. Una función por criterio, sin estado.
Corresponde a: `Dominio.md` §2 (definición del objetivo), §10 (criterios) y §10.1 (el techo
del sistema, que es lo que fundamenta el criterio de capacidad del horno).
Qué NO le corresponde: no simula nada, no promedia, no sabe qué es un reloj ni un evento, y no
conoce FastAPI ni Pydantic. Recibe una lista de diccionarios ya agregada y devuelve un entero.

Por qué está separado de `experimento_service`
----------------------------------------------
Es la parte que se defiende ante la cátedra: "¿por qué decís que el óptimo es 6?". Tiene que
poder leerse sola, sin el ruido del barrido, las semillas y las métricas de cómputo.

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

# Alias locales: los identificadores viven en `utils/constantes.py` para que
# `models/request.py` pueda validarlos sin importar la capa de servicios.
MAXIMA_PRODUCCION = CRITERIO_MAXIMA_PRODUCCION
CAPACIDAD_HORNO = CRITERIO_CAPACIDAD_HORNO
UMBRAL_MANUAL = CRITERIO_UMBRAL_MANUAL


def determinar_n_optimo(
    resultados_por_n: list[dict[str, Any]],
    criterio: str,
    umbral_utilizacion: float,
    ganancia_minima: float,
) -> int | None:
    """Aplica el criterio elegido y devuelve el N óptimo.

    :param resultados_por_n: resultados agregados, en **orden ascendente de N**.
    :param criterio: uno de `CRITERIOS_VALIDOS`.
    :param umbral_utilizacion: fracción (0 a 1); solo se usa con `UMBRAL_MANUAL`.
    :param ganancia_minima: piezas; solo se usa con `MAXIMA_PRODUCCION`.
    :return: el N óptimo, o `None` si ningún N del rango satisface el criterio.
    :raises ValueError: si el criterio no es uno de los conocidos.
    """
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

    Es la traducción operativa de `Dominio.md` §2: *"el mínimo número de ensambladores que
    maximice la producción de piezas terminadas"*. Se busca dónde la curva de producción se
    aplana, comparando cada N con el siguiente::

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

    :param resultados_por_n: resultados agregados, en orden ascendente de N.
    :param ganancia_minima: cuántas piezas tiene que aportar el siguiente N para que valga la
        pena sumarlo. Por debajo de eso, se considera que la curva se aplanó.
    :return: el N óptimo, o `None` si la producción sigue creciendo en todo el rango.
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
    que este sistema puede alcanzar arrancando vacío (`Dominio.md` §10.1), y no contra un
    máximo relativo al rango que el usuario haya elegido mirar.

    :param resultados_por_n: resultados agregados, en orden ascendente de N.
    :return: el N óptimo, o `None` si ningún N del rango satura el horno.
    """
    minimo_exigido = TECHO_UTILIZACION - TOLERANCIA_CAPACIDAD
    for resultado in resultados_por_n:
        if resultado["utilizacion_promedio"] >= minimo_exigido:
            return int(resultado["n"])
    return None


def por_umbral_utilizacion(
    resultados_por_n: list[dict[str, Any]], umbral_utilizacion: float
) -> int | None:
    """Mínimo N cuya utilización promedio alcanza el umbral que fijó el usuario (§10).

    Es el criterio histórico del proyecto. Se conserva porque permite explorar a mano dónde
    cae el óptimo con distintas exigencias, pero tiene la desventaja de que la respuesta
    depende de que el usuario acierte un número: con 90 % da N=5 y con 95 % no da ninguno
    (ver la nota de §10.1 sobre por qué 95 % es inalcanzable).

    N óptimo es el **mínimo** N que cruza, no el que maximiza: todos los N grandes rondan el
    techo, y el objetivo de §2 es quedarse con el más chico.

    :param resultados_por_n: resultados agregados, en orden ascendente de N.
    :param umbral_utilizacion: fracción (0 a 1) que define la saturación del horno.
    :return: el N óptimo, o `None` si ningún N del rango cruza el umbral.
    """
    for resultado in resultados_por_n:
        if resultado["utilizacion_promedio"] >= umbral_utilizacion:
            return int(resultado["n"])
    return None


def ganancia_entre(actual: dict[str, Any], siguiente: dict[str, Any]) -> float:
    """Piezas que aporta pasar de un N al siguiente.

    Puede ser negativa: con R chico, dos N de la zona plana difieren solo por ruido.

    :param actual: resultado agregado de N.
    :param siguiente: resultado agregado de N+1.
    :return: diferencia de producción promedio, en piezas por jornada.
    """
    return float(siguiente["piezas_promedio"]) - float(actual["piezas_promedio"])


def ganancia_del_siguiente(
    resultados_por_n: list[dict[str, Any]], n: int
) -> float | None:
    """Piezas que aportaría pasar de `n` al N siguiente del rango.

    Es el número que justifica el corte en la conclusión ("pasar de 6 a 7 suma 0,00 piezas").

    :param resultados_por_n: resultados agregados, en orden ascendente de N.
    :param n: el N del que se quiere saber cuánto aporta su sucesor.
    :return: la ganancia en piezas, o `None` si `n` es el último del rango (no hay sucesor).
    """
    for actual, siguiente in zip(resultados_por_n, resultados_por_n[1:]):
        if actual["n"] == n:
            return ganancia_entre(actual, siguiente)
    return None
