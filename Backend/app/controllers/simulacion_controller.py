"""Endpoints HTTP de la simulación.

Qué hace: define el `APIRouter` con `POST /simulaciones` y `GET /salud` (se montan bajo
`/api`), recibe el request ya validado por Pydantic, llama al servicio de experimento y
devuelve el modelo de respuesta. Traduce los errores de validación y los inesperados a los
códigos y cuerpos del contrato.
Corresponde a: `Backend.md` §3 (contrato de la API).
Qué NO le corresponde: **no contiene una sola línea de lógica de simulación**. No sabe qué
es un reloj, un evento ni una réplica; solo sabe llamar a `experimento_service` y devolver
lo que le da.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from ..models.request import SimulacionRequest
from ..models.response import ErrorResponse, SaludResponse, SimulacionResponse
from ..services.experimento_service import ejecutar_experimento

router = APIRouter(tags=["simulación"])

#: Nombres de campo del contrato traducidos a etiquetas mostrables al usuario.
ETIQUETAS_CAMPOS: dict[str, str] = {
    "n_minimo": "N mínimo",
    "n_maximo": "N máximo",
    "replicas": "cantidad de réplicas",
    "umbral_utilizacion": "umbral de utilización",
    "semilla": "semilla",
}

#: Mensaje del error 500 del contrato (`Backend.md` §3.1).
MENSAJE_ERROR_INESPERADO: str = "Ocurrió un error al ejecutar la simulación."


@router.post(
    "/simulaciones",
    response_model=SimulacionResponse,
    summary="Ejecuta la corrida completa",
    description=(
        "Endpoint síncrono: corre las R réplicas de cada N del rango y devuelve todos los "
        "resultados en una sola respuesta. No hay streaming ni polling."
    ),
    responses={
        422: {"model": ErrorResponse, "description": "Parámetros inválidos"},
        500: {"model": ErrorResponse, "description": "Error inesperado"},
    },
)
def crear_simulacion(peticion: SimulacionRequest) -> SimulacionResponse:
    """Corre el experimento con los parámetros recibidos.

    :param peticion: parámetros ya validados por Pydantic.
    :return: resultados completos de la corrida, según el contrato.
    :raises HTTPException: `500` si la simulación falla de forma inesperada.
    """
    try:
        resultado = ejecutar_experimento(
            n_minimo=peticion.n_minimo,
            n_maximo=peticion.n_maximo,
            replicas=peticion.replicas,
            umbral_utilizacion=peticion.umbral_utilizacion,
            semilla=peticion.semilla,
        )
    except Exception as error:  # noqa: BLE001 - se traduce a un 500 del contrato
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=MENSAJE_ERROR_INESPERADO,
        ) from error

    return SimulacionResponse.model_validate(resultado)


@router.get(
    "/salud",
    response_model=SaludResponse,
    summary="Estado del servicio",
    description=(
        "El frontend lo usa para distinguir 'el backend está caído' de "
        "'los parámetros son inválidos'."
    ),
)
def obtener_salud() -> SaludResponse:
    """Indica que el servicio está en pie.

    :return: `{"estado": "ok"}`.
    """
    return SaludResponse(estado="ok")


async def manejar_error_validacion(_: Request, excepcion: RequestValidationError) -> JSONResponse:
    """Traduce los errores de validación al cuerpo `{"detail": "<mensaje en español>"}`.

    FastAPI devuelve por defecto una lista de objetos técnicos; el contrato exige un único
    texto ya redactado para el usuario final, que el frontend muestra tal cual
    (`Backend.md` §3.1). Se registra en `main.py` como manejador de excepciones.

    :param excepcion: error de validación levantado por Pydantic.
    :return: respuesta `422` con un solo mensaje mostrable.
    """
    mensajes: list[str] = []
    for error in excepcion.errors():
        mensaje = _traducir_error(error)
        if mensaje not in mensajes:
            mensajes.append(mensaje)
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": " ".join(mensajes) or "Los parámetros enviados no son válidos."},
    )


def _traducir_error(error: dict) -> str:
    """Convierte un error de Pydantic en una frase en español para el usuario.

    :param error: entrada de `RequestValidationError.errors()`.
    :return: mensaje mostrable.
    """
    tipo = error.get("type", "")
    ubicacion = [str(parte) for parte in error.get("loc", ()) if parte != "body"]
    campo = ubicacion[-1] if ubicacion else ""
    etiqueta = ETIQUETAS_CAMPOS.get(campo, campo)

    if tipo == "value_error":
        # Los validadores propios ya escriben el mensaje en español; Pydantic le antepone
        # "Value error, " al serializarlo.
        return str(error.get("msg", "")).removeprefix("Value error, ")
    if tipo == "missing":
        return f"Falta indicar {etiqueta}." if etiqueta else "Faltan parámetros obligatorios."
    if tipo in {"json_invalid", "model_attributes_type"}:
        return "El cuerpo de la petición no tiene el formato esperado."
    if etiqueta:
        return f"El valor de {etiqueta} no es válido."
    return "Los parámetros enviados no son válidos."
