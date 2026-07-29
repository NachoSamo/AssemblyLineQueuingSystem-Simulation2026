"""Esquema de entrada de `POST /api/simulaciones`.

Qué hace: define `SimulacionRequest` con sus validadores de campo y de modelo. Los
mensajes de error están redactados **para el usuario final**, en español y con tildes, y se
muestran tal cual en la interfaz.
Corresponde a: `Backend.md` §3.1 (contrato del request) y `Dominio.md` §9-10 (qué
significan los parámetros: rango de N, R y umbral de utilización).
Qué NO le corresponde: no contiene lógica de simulación ni valores del modelo. Los datos
fijos del enunciado (480 minutos, 25-35, 6-10) no son campos de este modelo porque no son
configurables (`Dominio.md` §4); viven en `utils/constantes.py`.

Nota: los campos JSON van sin tildes (por codificación); los mensajes visibles, con tildes.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from ..utils.constantes import N_MAXIMO_PERMITIDO, REPLICAS_MAXIMO_PERMITIDO


class SimulacionRequest(BaseModel):
    """Parámetros configurables de una corrida (`Dominio.md` §9-10).

    :param n_minimo: primer N del barrido de ensambladores.
    :param n_maximo: último N del barrido.
    :param replicas: R, jornadas simuladas por cada N. El mismo R para todos los N.
    :param umbral_utilizacion: fracción (0 a 1) a partir de la cual se considera saturado
        el horno. `0.95` = 95 %. **No es un porcentaje.**
    :param semilla: semilla del generador aleatorio; `null` para que la elija el sistema.
    """

    # `extra="ignore"` a propósito: si el frontend agrega un campo propio al cuerpo, la
    # corrida no debe fallar por eso. Los campos del contrato sí se validan estrictamente.
    model_config = ConfigDict(
        extra="ignore",
        json_schema_extra={
            "example": {
                "n_minimo": 1,
                "n_maximo": 6,
                "replicas": 30,
                "umbral_utilizacion": 0.95,
                "semilla": 12345,
            }
        },
    )

    n_minimo: int = Field(description="Primer N del barrido de ensambladores (mínimo 1).")
    n_maximo: int = Field(description="Último N del barrido; debe ser >= n_minimo.")
    replicas: int = Field(description="Jornadas simuladas por cada N (R).")
    umbral_utilizacion: float = Field(
        description="Umbral de saturación del horno, como fracción entre 0 y 1."
    )
    semilla: int | None = Field(
        default=None,
        description="Semilla para reproducir la corrida. Si es nula, el backend genera una.",
    )

    @field_validator("n_minimo")
    @classmethod
    def _validar_n_minimo(cls, valor: int) -> int:
        """Valida que el N mínimo sea al menos 1 ensamblador."""
        if valor < 1:
            raise ValueError("El N mínimo debe ser al menos 1 ensamblador.")
        if valor > N_MAXIMO_PERMITIDO:
            raise ValueError(
                f"El N mínimo no puede superar {N_MAXIMO_PERMITIDO} ensambladores."
            )
        return valor

    @field_validator("n_maximo")
    @classmethod
    def _validar_n_maximo(cls, valor: int) -> int:
        """Valida que el N máximo esté dentro del tope de guardia del servicio."""
        if valor < 1:
            raise ValueError("El N máximo debe ser al menos 1 ensamblador.")
        if valor > N_MAXIMO_PERMITIDO:
            raise ValueError(
                f"El N máximo no puede superar {N_MAXIMO_PERMITIDO} ensambladores."
            )
        return valor

    @field_validator("replicas")
    @classmethod
    def _validar_replicas(cls, valor: int) -> int:
        """Valida la cantidad de réplicas por N (R)."""
        if valor < 1:
            raise ValueError("La cantidad de réplicas debe ser al menos 1.")
        if valor > REPLICAS_MAXIMO_PERMITIDO:
            raise ValueError(
                f"La cantidad de réplicas no puede superar {REPLICAS_MAXIMO_PERMITIDO:,}."
                .replace(",", ".")
            )
        return valor

    @field_validator("umbral_utilizacion")
    @classmethod
    def _validar_umbral(cls, valor: float) -> float:
        """Valida que el umbral sea una fracción entre 0 y 1, no un porcentaje."""
        if not 0 < valor <= 1:
            raise ValueError(
                "El umbral de utilización debe ser mayor que 0 y menor o igual que 1. "
                "Se expresa como fracción, no como porcentaje: 0,95 equivale al 95 %."
            )
        return valor

    @model_validator(mode="after")
    def _validar_rango(self) -> "SimulacionRequest":
        """Valida la coherencia del rango [n_minimo, n_maximo]."""
        if self.n_maximo < self.n_minimo:
            raise ValueError("El N máximo debe ser mayor o igual que el N mínimo.")
        return self
