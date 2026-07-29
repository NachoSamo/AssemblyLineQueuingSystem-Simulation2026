"""Esquemas de salida de `POST /api/simulaciones`.

Qué hace: define `SimulacionResponse` y todos sus modelos anidados (`ParametrosCorrida`,
`RangoTiempo`, `ResultadoPorN`, `TiempoPorN`, `EstadisticasComputo`).
Corresponde a: `Backend.md` §3.1 (contrato de la respuesta), `Dominio.md` §9-10
(resultados por N y N óptimo) y §12 (estadísticas de cómputo).
Qué NO le corresponde: no tiene lógica de simulación ni formatea nada para el usuario.
El backend devuelve **números crudos con la unidad en el nombre del campo**; las frases
legibles las arma el frontend.

Convenciones del contrato:
- La utilización viaja siempre como **fracción (0 a 1)**, nunca como porcentaje.
- El tiempo simulado va en **minutos**; el tiempo real de cómputo, en **milisegundos** (`_ms`).
- Los nombres de campo JSON van sin tildes y no deben cambiarse: el frontend está tipado
  contra ellos (`Frontend/src/types/simulacion.ts`).
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class RangoTiempo(BaseModel):
    """Rango de una distribución uniforme del enunciado, en minutos (`Dominio.md` §3)."""

    minimo: int = Field(description="Extremo inferior del intervalo, en minutos.")
    maximo: int = Field(description="Extremo superior del intervalo, en minutos.")


class ParametrosCorrida(BaseModel):
    """Eco de lo que configuró el usuario más los datos fijos del enunciado.

    Existe para que el frontend pueda mostrar "con qué se corrió esto" (`Dominio.md` §13.1)
    sin recordar el request, y para que los valores fijos aparezcan en pantalla sin estar
    hardcodeados del lado del cliente.
    """

    n_minimo: int = Field(description="Primer N del barrido.")
    n_maximo: int = Field(description="Último N del barrido.")
    replicas: int = Field(description="Jornadas simuladas por cada N (R).")
    umbral_utilizacion: float = Field(description="Umbral de saturación, como fracción.")
    semilla: int = Field(
        description=(
            "Semilla efectivamente usada. Siempre viene con valor, incluso si el usuario "
            "no la ingresó: es lo que permite repetir la corrida."
        )
    )
    duracion_jornada: int = Field(
        description="Duración fija de la jornada, en minutos. No es configurable."
    )
    tiempo_ensamble: RangoTiempo = Field(description="Rango del tiempo de ensamble, en minutos.")
    tiempo_coccion: RangoTiempo = Field(description="Rango del tiempo de cocción, en minutos.")


class ResultadoPorN(BaseModel):
    """Resultados agregados de las R réplicas de un valor de N (`Dominio.md` §9)."""

    n: int = Field(description="Cantidad de ensambladores.")
    utilizacion_promedio: float = Field(
        description="Utilización promedio del horno, como fracción entre 0 y 1."
    )
    piezas_promedio: float = Field(
        description="Piezas terminadas promedio por jornada. Techo teórico: 60 (§10.1)."
    )
    tiempo_horno_ocupado_promedio: float = Field(
        description="Minutos promedio que el horno estuvo ocupado en la jornada."
    )
    utilizacion_desvio: float = Field(
        description="Desvío estándar muestral de la utilización entre las R réplicas."
    )
    piezas_desvio: float = Field(
        description="Desvío estándar muestral de las piezas terminadas entre las R réplicas."
    )


class TiempoPorN(BaseModel):
    """Tiempo real de cómputo acumulado por las R réplicas de un N (`Dominio.md` §12)."""

    n: int = Field(description="Cantidad de ensambladores.")
    tiempo_ms: float = Field(description="Tiempo de cómputo acumulado, en milisegundos.")


class EstadisticasComputo(BaseModel):
    """Desempeño del programa como software (`Dominio.md` §12).

    Son estadísticas de cómputo, no de la lógica de simulación: no deben confundirse con
    la utilización del horno ni con las piezas terminadas.
    """

    tiempo_total_ms: float = Field(
        description="Duración de la corrida completa (todo el rango de N), en milisegundos."
    )
    tiempo_por_n: list[TiempoPorN] = Field(
        description="Tiempo de cómputo acumulado por cada N, en orden ascendente."
    )
    tiempo_promedio_replica_ms: float = Field(
        description="Tiempo de cómputo promedio de una réplica individual, en milisegundos."
    )
    memoria_pico_mb: float = Field(
        description="Pico de memoria residente del proceso durante la corrida, en megabytes."
    )
    cpu_porcentaje: float = Field(
        description="Uso de CPU del proceso durante la corrida, en porcentaje."
    )


class SimulacionResponse(BaseModel):
    """Respuesta completa de una corrida (`Backend.md` §3.1)."""

    parametros: ParametrosCorrida = Field(
        description="Parámetros de la corrida más los datos fijos del enunciado."
    )
    resultados_por_n: list[ResultadoPorN] = Field(
        description="Un elemento por cada N del rango, en orden ascendente."
    )
    n_optimo: int | None = Field(
        description=(
            "Mínimo N cuya utilización promedio alcanza el umbral (§10). "
            "Es nulo si ningún N del rango lo alcanza."
        )
    )
    alcanzo_umbral: bool = Field(
        description=(
            "Falso cuando ningún N del rango llegó al umbral; el frontend muestra el aviso "
            "de ampliar el rango en vez de una conclusión falsa (§10.2)."
        )
    )
    utilizacion_n_optimo: float | None = Field(
        description="Utilización del N óptimo, como fracción. Nulo si no hay N óptimo."
    )
    piezas_n_optimo: float | None = Field(
        description="Piezas promedio del N óptimo. Nulo si no hay N óptimo."
    )
    estadisticas_computo: EstadisticasComputo = Field(
        description="Métricas de desempeño del programa (§12)."
    )


class SaludResponse(BaseModel):
    """Respuesta de `GET /api/salud`. El frontend la usa para distinguir
    "el backend está caído" de "los parámetros son inválidos"."""

    estado: str = Field(description='Siempre "ok" cuando el servicio responde.')


class ErrorResponse(BaseModel):
    """Cuerpo de error de la API. `detail` ya viene redactado para el usuario final."""

    detail: str = Field(description="Mensaje en español, mostrable tal cual en la interfaz.")
