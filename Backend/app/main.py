"""Punto de entrada de la aplicación FastAPI.

Qué hace: crea la instancia `FastAPI` con los metadatos de OpenAPI, aplica el middleware de
CORS hacia el frontend, registra el manejador de errores de validación y monta los routers
de `controllers/` bajo el prefijo `/api`.
Corresponde a: `Backend.md` §2.1 y §8 (puesta en marcha).
Qué NO le corresponde: no define endpoints ni lógica de ningún tipo. Todo endpoint vive en
`controllers/`; toda la lógica, en `services/`.

Puesta en marcha::

    uvicorn app.main:app --reload --port 8000

Documentación interactiva en http://localhost:8000/docs
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from . import config
from .controllers.simulacion_controller import manejar_error_validacion
from .controllers.simulacion_controller import router as router_simulacion

app = FastAPI(
    title=config.TITULO_API,
    description=config.DESCRIPCION_API,
    version=config.VERSION_API,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ORIGENES_CORS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(RequestValidationError, manejar_error_validacion)

app.include_router(router_simulacion, prefix=config.PREFIJO_API)
