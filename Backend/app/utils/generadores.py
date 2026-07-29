"""Generación de variables aleatorias y manejo de semillas.

Qué hace: aplica la fórmula única `X = minimo + RND × (maximo − minimo)` y construye /
deriva los generadores `numpy.random.Generator` a partir de la semilla de la corrida.
Corresponde a: `Dominio.md` §3 (fórmula de la uniforme) y `Backend.md` §4.6
(aleatoriedad y reproducibilidad).
Qué NO le corresponde: no conoce el dominio. Acá no existen las palabras "ensamble"
ni "cocción": este módulo recibe un `minimo` y un `maximo` y devuelve un número.
Tampoco decide cuántos valores hacen falta ni en qué orden se consumen (eso es del motor).

Unidades: el módulo es agnóstico. Los valores que devuelve están en la unidad de
`minimo`/`maximo` (en este proyecto, siempre minutos de tiempo simulado).
"""

from __future__ import annotations

import numpy as np

#: Cantidad de números aleatorios que se piden a NumPy por lote.
#: `Backend.md` §4.1 pide generar los RND en lote (`rng.random(size=...)`) en vez de
#: uno por uno. El tamaño del lote es fijo, de modo que la secuencia consumida es
#: idéntica corrida a corrida: la reproducibilidad no depende de cuántos valores se usen.
TAMANIO_LOTE: int = 1024


class FlujoAleatorio:
    """Flujo de números aleatorios U(0,1) servido de a lotes.

    Envuelve un `numpy.random.Generator` y entrega los RND de a uno, pero los pide a
    NumPy en bloques de `TAMANIO_LOTE` para evitar una llamada por número
    (`Backend.md` §4.1). Es intencionalmente compatible con la interfaz de
    `numpy.random.Generator`: expone `random()` y devuelve un valor en [0, 1).

    Un flujo representa **un stream independiente**. El motor usa dos por réplica
    (uno para ensamble y otro para cocción), como exige `Dominio.md` §4.
    """

    __slots__ = ("_generador", "_lote", "_posicion", "_consumidos")

    def __init__(self, generador: np.random.Generator) -> None:
        """
        :param generador: generador de NumPy ya sembrado que alimenta este flujo.
        """
        self._generador = generador
        self._lote: np.ndarray = generador.random(TAMANIO_LOTE)
        self._posicion: int = 0
        self._consumidos: int = 0

    def random(self) -> float:
        """Devuelve el próximo RND ~ U(0,1).

        :return: número aleatorio en [0, 1).
        """
        if self._posicion >= self._lote.shape[0]:
            self._lote = self._generador.random(TAMANIO_LOTE)
            self._posicion = 0
        valor = float(self._lote[self._posicion])
        self._posicion += 1
        self._consumidos += 1
        return valor

    @property
    def consumidos(self) -> int:
        """Cantidad de RND entregados hasta el momento (dato de diagnóstico)."""
        return self._consumidos


def uniforme(minimo: float, maximo: float, rng: np.random.Generator | FlujoAleatorio) -> float:
    """Genera un valor de una distribución uniforme continua en [minimo, maximo].

    Aplica la fórmula general de `Dominio.md` §3::

        X = a + RND × (b − a)

    :param minimo: extremo inferior del intervalo (a).
    :param maximo: extremo superior del intervalo (b).
    :param rng: fuente de aleatoriedad; cualquier objeto con `random() -> float`
        (un `numpy.random.Generator` o un `FlujoAleatorio`).
    :return: valor generado, en la misma unidad que `minimo` y `maximo`.
    """
    return minimo + rng.random() * (maximo - minimo)


def resolver_semilla(semilla: int | None) -> int:
    """Devuelve la semilla efectiva de la corrida.

    Si el usuario no envió semilla, se genera una a partir de la entropía del sistema y
    se devuelve para que viaje en `parametros.semilla`: así la corrida sigue siendo
    reproducible después de haberse ejecutado (`Backend.md` §4.6).

    :param semilla: semilla pedida por el usuario, o `None`.
    :return: semilla efectiva, entero de 32 bits (seguro de representar en JavaScript).
    """
    if semilla is not None:
        return int(semilla)
    return int(np.random.SeedSequence().generate_state(1)[0])


def crear_semilla_raiz(semilla: int) -> np.random.SeedSequence:
    """Construye la `SeedSequence` raíz de la corrida.

    :param semilla: semilla efectiva (ver `resolver_semilla`).
    :return: secuencia de semillas raíz, de la que se derivan las de cada réplica.
    """
    return np.random.SeedSequence(semilla)


def derivar_flujos_de_replica(
    raiz: np.random.SeedSequence, indice_replica: int
) -> tuple[FlujoAleatorio, FlujoAleatorio]:
    """Deriva los dos flujos aleatorios independientes de una réplica.

    Usa `SeedSequence.spawn()` para que cada réplica tenga su propio subárbol de semillas:
    el resultado de una réplica no depende del orden en que se ejecuten las demás
    (`Backend.md` §4.6). Del subárbol de la réplica se derivan dos hijos, uno por tipo de
    tiempo, para que los flujos de ensamble y cocción **no salgan del mismo stream
    intercalado** (`Dominio.md` §4).

    :param raiz: `SeedSequence` raíz de la corrida.
    :param indice_replica: índice global de la réplica dentro de la corrida
        (único por par (N, réplica); ver `experimento_service`).
    :return: tupla `(flujo_ensamble, flujo_coccion)`.
    """
    semilla_replica = np.random.SeedSequence(
        entropy=raiz.entropy, spawn_key=raiz.spawn_key + (indice_replica,)
    )
    semilla_ensamble, semilla_coccion = semilla_replica.spawn(2)
    return (
        FlujoAleatorio(np.random.default_rng(semilla_ensamble)),
        FlujoAleatorio(np.random.default_rng(semilla_coccion)),
    )
