"""Esquemas de entrada de los endpoints de simulación.

Qué hace: define `SimulacionRequest` y `VectorEstadoRequest` con sus validadores de campo y
de modelo. Los mensajes de error están redactados **para el usuario final**, en español y con
tildes, y se muestran tal cual en la interfaz.
Corresponde a: `Backend.md` §3.1 y §3.2 (contratos de los requests) y `Dominio.md` §9-10 (qué
significan los parámetros: rango de N, R y umbral de utilización).
Qué NO le corresponde: no contiene lógica de simulación ni valores del modelo. Los datos
fijos del enunciado (480 minutos, 25-35, 6-10) no son campos de este modelo porque no son
configurables (`Dominio.md` §4); viven en `utils/constantes.py`.

Nota: los campos JSON van sin tildes (por codificación); los mensajes visibles, con tildes.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from ..utils.constantes import (
    CRITERIO_MAXIMA_PRODUCCION,
    ETIQUETAS_CRITERIOS,
    N_MAXIMO_PERMITIDO,
    REPLICAS_MAXIMO_PERMITIDO,
)


class SimulacionRequest(BaseModel):
    """Parámetros configurables de una corrida (`Dominio.md` §9-10).

    :param n_minimo: primer N del barrido de ensambladores.
    :param n_maximo: último N del barrido.
    :param replicas: R, jornadas simuladas por cada N. El mismo R para todos los N.
    :param criterio: cuál de los tres criterios de `services/criterios.py` decide el óptimo.
    :param ganancia_minima: piezas que tiene que aportar el N siguiente para que valga la
        pena sumarlo. Solo se usa con el criterio `maxima_produccion`.
    :param umbral_utilizacion: fracción (0 a 1) a partir de la cual se considera saturado
        el horno. `0.95` = 95 %. **No es un porcentaje.** Solo se usa con `umbral_manual`.
    :param semilla: semilla del generador aleatorio; `null` para que la elija el sistema.

    `ganancia_minima` y `umbral_utilizacion` viajan **siempre**, aunque el criterio elegido
    use solo uno de los dos. Es a propósito: si fueran obligatorios de forma condicional, el
    formulario tendría que borrarlos y reponerlos al cambiar de modo, y una corrida podría
    fallar por un campo que el usuario ni siquiera ve.
    """

    # `extra="ignore"` a propósito: si el frontend agrega un campo propio al cuerpo, la
    # corrida no debe fallar por eso. Los campos del contrato sí se validan estrictamente.
    model_config = ConfigDict(
        extra="ignore",
        json_schema_extra={
            "example": {
                "n_minimo": 1,
                "n_maximo": 8,
                "replicas": 30,
                "criterio": "maxima_produccion",
                "ganancia_minima": 1.0,
                "umbral_utilizacion": 0.94,
                "semilla": 12345,
            }
        },
    )

    n_minimo: int = Field(description="Primer N del barrido de ensambladores (mínimo 1).")
    n_maximo: int = Field(description="Último N del barrido; debe ser >= n_minimo.")
    replicas: int = Field(description="Jornadas simuladas por cada N (R).")
    criterio: str = Field(
        default=CRITERIO_MAXIMA_PRODUCCION,
        description=(
            'Criterio del N óptimo: "maxima_produccion", "capacidad_horno" o "umbral_manual".'
        ),
    )
    ganancia_minima: float = Field(
        default=1.0,
        description=(
            "Piezas mínimas que debe aportar el N siguiente para justificar sumarlo. "
            "Solo se usa con el criterio maxima_produccion."
        ),
    )
    umbral_utilizacion: float = Field(
        description=(
            "Umbral de saturación del horno, como fracción entre 0 y 1. "
            "Solo se usa con el criterio umbral_manual."
        )
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

    @field_validator("criterio")
    @classmethod
    def _validar_criterio(cls, valor: str) -> str:
        """Valida que el criterio del N óptimo sea uno de los tres conocidos."""
        if valor not in ETIQUETAS_CRITERIOS:
            opciones = ", ".join(sorted(ETIQUETAS_CRITERIOS.values()))
            raise ValueError(
                f"El criterio '{valor}' no existe. Las opciones son: {opciones}."
            )
        return valor

    @field_validator("ganancia_minima")
    @classmethod
    def _validar_ganancia_minima(cls, valor: float) -> float:
        """Valida la ganancia mínima en piezas del criterio de máxima producción."""
        if valor <= 0:
            raise ValueError(
                "La ganancia mínima debe ser mayor que 0: con 0 piezas, cualquier N "
                "cumpliría el criterio."
            )
        return valor

    @model_validator(mode="after")
    def _validar_rango(self) -> "SimulacionRequest":
        """Valida la coherencia del rango [n_minimo, n_maximo]."""
        if self.n_maximo < self.n_minimo:
            raise ValueError("El N máximo debe ser mayor o igual que el N mínimo.")
        return self


class VectorEstadoRequest(BaseModel):
    """Réplica puntual cuyo vector de estado se quiere inspeccionar (`Backend.md` §3.2).

    Los cinco campos identifican **unívocamente** una jornada simulada: con la misma semilla,
    el mismo `n_minimo` y el mismo `replicas`, el backend reproduce exactamente la réplica que
    ya se promedió en la corrida. El frontend los saca todos de `parametros`, que viene en la
    respuesta de `POST /api/simulaciones`; no son datos que el usuario tipee.

    :param semilla: semilla efectiva de la corrida. **Obligatoria**: sin ella no hay forma de
        reproducir la jornada, y devolver una réplica de otra semilla sería mostrar datos que
        no corresponden a los resultados en pantalla.
    :param n_minimo: primer N del barrido de esa corrida.
    :param replicas: R de esa corrida.
    :param n: cantidad de ensambladores de la réplica a inspeccionar.
    :param replica: número de réplica, empezando en 1.
    """

    model_config = ConfigDict(
        extra="ignore",
        json_schema_extra={
            "example": {
                "semilla": 12345,
                "n_minimo": 1,
                "replicas": 30,
                "n": 6,
                "replica": 17,
            }
        },
    )

    semilla: int = Field(description="Semilla efectiva de la corrida que se está mirando.")
    n_minimo: int = Field(description="Primer N del barrido de esa corrida.")
    replicas: int = Field(description="Cantidad de réplicas por N (R) de esa corrida.")
    n: int = Field(description="Cantidad de ensambladores de la réplica a inspeccionar.")
    replica: int = Field(description="Número de réplica, empezando en 1.")

    @field_validator("n_minimo", "n")
    @classmethod
    def _validar_ensambladores(cls, valor: int) -> int:
        """Valida que la cantidad de ensambladores esté dentro de los topes del servicio."""
        if valor < 1:
            raise ValueError("La cantidad de ensambladores debe ser al menos 1.")
        if valor > N_MAXIMO_PERMITIDO:
            raise ValueError(
                f"La cantidad de ensambladores no puede superar {N_MAXIMO_PERMITIDO}."
            )
        return valor

    @field_validator("replicas")
    @classmethod
    def _validar_replicas(cls, valor: int) -> int:
        """Valida la cantidad de réplicas por N (R) de la corrida original."""
        if valor < 1:
            raise ValueError("La cantidad de réplicas debe ser al menos 1.")
        if valor > REPLICAS_MAXIMO_PERMITIDO:
            raise ValueError(
                f"La cantidad de réplicas no puede superar {REPLICAS_MAXIMO_PERMITIDO:,}."
                .replace(",", ".")
            )
        return valor

    @model_validator(mode="after")
    def _validar_coherencia(self) -> "VectorEstadoRequest":
        """Valida que la réplica pedida exista dentro de la corrida descripta."""
        if self.n < self.n_minimo:
            raise ValueError(
                "El N pedido no puede ser menor que el N mínimo de la corrida."
            )
        if not 1 <= self.replica <= self.replicas:
            raise ValueError(
                f"La réplica debe estar entre 1 y {self.replicas}, "
                "que es la cantidad de réplicas de esta corrida."
            )
        return self
