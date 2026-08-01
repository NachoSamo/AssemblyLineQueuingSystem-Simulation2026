"""Esquemas de salida de los endpoints de simulación.

Qué hace: define `SimulacionResponse` y sus modelos anidados (`ParametrosCorrida`,
`RangoTiempo`, `ResultadoPorN`, `TiempoPorN`, `EstadisticasComputo`), y `VectorEstadoResponse`
con los suyos (`FilaVectorEstado`, `ColumnaEnsamblador`).
Corresponde a: `Backend.md` §3.1 (contrato de la respuesta), §3.2 (vector de estado),
`Dominio.md` §9-10 (resultados por N y N óptimo) y §12 (estadísticas de cómputo).
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
    criterio: str = Field(
        description=(
            'Criterio con el que se eligió el N óptimo: "maxima_produccion", '
            '"capacidad_horno" o "umbral_manual". El frontend lo usa para redactar la '
            "conclusión y para saber cuál de los dos gráficos fue el que decidió."
        )
    )
    ganancia_minima: float = Field(
        description=(
            "Piezas mínimas exigidas al N siguiente. Solo tiene sentido si el criterio "
            "es maxima_produccion; viaja siempre para poder mostrar la configuración completa."
        )
    )
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
            "N óptimo según el criterio elegido (§10). Es nulo si ningún N del rango lo "
            "satisface."
        )
    )
    alcanzo_criterio: bool = Field(
        description=(
            "Falso cuando ningún N del rango satisface el criterio; el frontend muestra el "
            "aviso correspondiente en vez de una conclusión falsa (§10.2)."
        )
    )
    utilizacion_n_optimo: float | None = Field(
        description="Utilización del N óptimo, como fracción. Nulo si no hay N óptimo."
    )
    piezas_n_optimo: float | None = Field(
        description="Piezas promedio del N óptimo. Nulo si no hay N óptimo."
    )
    piezas_n_optimo_truncadas: int | None = Field(
        description=(
            "Producción **real** del N óptimo: el promedio truncado. Una jornada que produce "
            "56,33 piezas en promedio entrega 56 piezas completas — la 57.ª queda a medio "
            "cocinar cuando termina la jornada (§8). Nulo si no hay N óptimo."
        )
    )
    ganancia_n_optimo: float | None = Field(
        description=(
            "Piezas que aportaría pasar del N óptimo al siguiente. Es el número que justifica "
            "el corte en la conclusión. Nulo si no hay N óptimo o si este es el último del "
            "rango (no hay sucesor con qué comparar)."
        )
    )
    utilizacion_maxima_rango: float = Field(
        description=(
            "Mayor utilización observada en todo el rango, como fracción. Sirve para explicar "
            "cuán lejos quedó el horno de saturarse cuando ningún N alcanza el criterio."
        )
    )
    estadisticas_computo: EstadisticasComputo = Field(
        description="Métricas de desempeño del programa (§12)."
    )


class ColumnaEnsamblador(BaseModel):
    """Las cuatro columnas que la planilla dedica a un ensamblador en una fila.

    `rnd` y `tiempo` valen `null` en las filas donde ese ensamblador no sorteó nada.
    `fin_ensamble` es una columna de la lista de eventos futuros: **persiste** fila a fila
    mientras el ensamblador ensambla, y vale `null` cuando está esperando.
    """

    rnd: float | None = Field(description="RND sorteado en esta fila, entre 0 y 1. Nulo si no sorteó.")
    tiempo: float | None = Field(description="Tiempo de ensamble que salió del RND, en minutos.")
    fin_ensamble: float | None = Field(
        description="Minuto en que termina el ensamble en curso. Nulo si el ensamblador espera."
    )
    estado: str = Field(description='"Ensamblando" o "Esperando" (`Dominio.md` §5.1).')


class FilaVectorEstado(BaseModel):
    """Una fila del vector de estado: **un evento** del bucle, no una réplica.

    Reproduce las columnas de `Ejercicio 135 Final Planteo.ods`. La planilla está trazada con
    N=1; para N>1 el bloque de ensamble se repite por ensamblador (`Backend.md` §4.9).
    """

    replica: int = Field(description="Réplica a la que pertenece la fila (R), empezando en 1.")
    iteracion: int = Field(
        description="Número de fila dentro de la réplica. La inicialización es la 0."
    )
    evento: str = Field(
        description='Evento ejecutado: "Inicialización", "Fin Ensamble i", "Fin Cocción" '
        'o "Fin de la jornada".'
    )
    reloj: float = Field(description="Minuto de la jornada en que ocurrió, entre 0 y 480.")
    ensambladores: list[ColumnaEnsamblador] = Field(
        description="Una entrada por ensamblador, en orden 1..N. Siempre tiene N elementos."
    )
    rnd_coccion: float | None = Field(description="RND sorteado para la cocción en esta fila.")
    tiempo_coccion: float | None = Field(
        description="Tiempo de cocción que salió de ese RND, en minutos."
    )
    fin_coccion: float | None = Field(
        description="Minuto en que termina la cocción en curso. Nulo si el horno está libre."
    )
    horno_estado: str = Field(description='"Libre" u "Ocupado" (`Dominio.md` §5.2).')
    cola: int = Field(description="Cantidad de piezas esperando turno de horno.")
    piezas_terminadas: int = Field(description="Contador acumulado de piezas que salieron.")
    piezas: list[str] = Field(
        description=(
            "Estado de cada pieza creada hasta esta fila, en orden de creación. La lista "
            "**crece** a lo largo de la jornada: la pieza k aparece recién cuando nace."
        )
    )


class VectorEstadoResponse(BaseModel):
    """Vector de estado completo de una réplica (`Backend.md` §3.2).

    Se devuelven **todas** las filas de la réplica de una sola vez: son alrededor de cien, y
    paginarlas es responsabilidad del frontend. Lo que no se devuelve nunca es el vector de
    todas las réplicas de todos los N a la vez.
    """

    n: int = Field(description="Cantidad de ensambladores de la réplica inspeccionada.")
    replica: int = Field(description="Número de réplica inspeccionada, empezando en 1.")
    total_replicas: int = Field(
        description="R de la corrida, para que el frontend arme el selector de réplicas."
    )
    total_piezas: int = Field(
        description="Cantidad de piezas creadas en la jornada; es el largo de la columna "
        "`piezas` en la última fila y determina cuántas columnas de pieza dibujar."
    )
    total_filas: int = Field(description="Cantidad de filas del vector de estado.")
    filas: list[FilaVectorEstado] = Field(
        description="Filas en orden cronológico, de la inicialización al corte en 480."
    )


class SaludResponse(BaseModel):
    """Respuesta de `GET /api/salud`. El frontend la usa para distinguir
    "el backend está caído" de "los parámetros son inválidos"."""

    estado: str = Field(description='Siempre "ok" cuando el servicio responde.')


class ErrorResponse(BaseModel):
    """Cuerpo de error de la API. `detail` ya viene redactado para el usuario final."""

    detail: str = Field(description="Mensaje en español, mostrable tal cual en la interfaz.")
