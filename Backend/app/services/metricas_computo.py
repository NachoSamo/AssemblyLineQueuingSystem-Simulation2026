"""Estadísticas del programa como software (no de la simulación).

Qué hace: cronometra bloques de ejecución y mide el consumo de recursos del proceso
(memoria RSS y CPU) con `psutil`.
Corresponde a: `Dominio.md` §12 (estadísticas de cómputo) y `Backend.md` §6.
Qué NO le corresponde: no interpreta ni formatea los números para el usuario — el backend
devuelve magnitudes crudas y el frontend arma las frases legibles. Tampoco sabe nada de la
lógica de eventos ni del diseño experimental.

Unidades: el tiempo real de cómputo va siempre en **milisegundos** (sufijo `_ms`);
la memoria en **megabytes**; la CPU en porcentaje (0 a 100, puede superar 100 en máquinas
con varios núcleos si el proceso usa más de uno).

Nota de método: se usa `time.perf_counter()` porque `time.time()` no tiene la resolución
necesaria — una réplica tarda fracciones de milisegundo (`Backend.md` §6).
"""

from __future__ import annotations

import os
import time
from types import TracebackType

import psutil

#: Factor de conversión de bytes a megabytes.
BYTES_POR_MB: float = 1024.0 * 1024.0


class Cronometro:
    """Context manager que mide cuánto tarda un bloque, en milisegundos.

    Uso::

        with Cronometro() as crono:
            ...
        crono.duracion_ms

    Se usa alrededor de cada réplica y alrededor de cada N, nunca dentro del bucle de
    eventos: la medición no debe distorsionar lo medido (`Backend.md` §6).
    """

    __slots__ = ("_inicio", "duracion_ms")

    def __init__(self) -> None:
        self._inicio: float = 0.0
        #: Duración del bloque medido, en milisegundos. Válida recién al salir del `with`.
        self.duracion_ms: float = 0.0

    def __enter__(self) -> "Cronometro":
        self._inicio = time.perf_counter()
        return self

    def __exit__(
        self,
        tipo_excepcion: type[BaseException] | None,
        excepcion: BaseException | None,
        traza: TracebackType | None,
    ) -> None:
        self.duracion_ms = (time.perf_counter() - self._inicio) * 1000.0


class MedidorRecursos:
    """Mide memoria y CPU del proceso durante la corrida (`Dominio.md` §12).

    Sobre la CPU: `psutil.Process.cpu_percent()` necesita un intervalo de referencia.
    La primera llamada establece la línea de base y devuelve `0.0`; la lectura útil es la
    segunda, al terminar la corrida (`Backend.md` §6). Por eso el flujo es
    `iniciar()` → (corrida) → `finalizar()`.

    Sobre la memoria: se registra el máximo RSS observado. Se muestrea en puntos discretos
    (al inicio, después de cada N y al final) en vez de con un hilo aparte, para no agregar
    concurrencia ni costo a una corrida que dura milisegundos.
    """

    __slots__ = ("_proceso", "_memoria_pico_bytes", "_cpu_porcentaje")

    def __init__(self) -> None:
        self._proceso = psutil.Process(os.getpid())
        self._memoria_pico_bytes: float = 0.0
        self._cpu_porcentaje: float = 0.0

    def iniciar(self) -> None:
        """Establece la línea de base de CPU y toma la primera muestra de memoria."""
        self._proceso.cpu_percent(interval=None)  # línea de base: descarta el 0.0 inicial
        self._memoria_pico_bytes = 0.0
        self.muestrear()

    def muestrear(self) -> None:
        """Registra el RSS actual si supera el máximo observado hasta ahora."""
        rss = float(self._proceso.memory_info().rss)
        if rss > self._memoria_pico_bytes:
            self._memoria_pico_bytes = rss

    def finalizar(self) -> None:
        """Cierra la medición: última muestra de memoria y lectura efectiva de CPU."""
        self.muestrear()
        self._cpu_porcentaje = float(self._proceso.cpu_percent(interval=None))

    @property
    def memoria_pico_mb(self) -> float:
        """Pico de memoria residente del proceso durante la corrida, en megabytes."""
        return self._memoria_pico_bytes / BYTES_POR_MB

    @property
    def cpu_porcentaje(self) -> float:
        """Uso de CPU del proceso durante la corrida, en porcentaje (0 a 100 por núcleo)."""
        return self._cpu_porcentaje
