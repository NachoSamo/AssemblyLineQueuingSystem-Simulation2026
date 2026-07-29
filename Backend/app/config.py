"""Configuración del servicio web.

Qué hace: reúne los valores de configuración del backend como servidor — orígenes
permitidos por CORS, host y puerto por defecto, prefijo de la API y metadatos de OpenAPI.
Lee variables de entorno con valores por defecto sensatos para desarrollo.
Corresponde a: `Backend.md` §2.1 y §8 (puesta en marcha).
Qué NO le corresponde: **no guarda parámetros del modelo de simulación**. La duración de
la jornada y los tiempos del enunciado viven en `utils/constantes.py`; N, R, umbral y
semilla llegan por request.
"""

from __future__ import annotations

import os

# --- Metadatos de la API (OpenAPI) -------------------------------------------

TITULO_API: str = "Simulación — Ejercicio 135"
DESCRIPCION_API: str = (
    "Simulación de eventos discretos de una línea de ensamble con horno compartido. "
    "Determina el número óptimo de ensambladores por horno."
)
VERSION_API: str = "1.0.0"

#: Prefijo bajo el que se montan todos los endpoints.
PREFIJO_API: str = "/api"

# --- Servidor ----------------------------------------------------------------

#: Host de escucha por defecto de uvicorn.
HOST: str = os.getenv("SIMULACION_HOST", "127.0.0.1")

#: Puerto de escucha por defecto de uvicorn.
PUERTO: int = int(os.getenv("SIMULACION_PUERTO", "8000"))

# --- CORS --------------------------------------------------------------------

#: Orígenes permitidos. Por defecto, el servidor de desarrollo de Vite del frontend.
#: Se puede sobrescribir con `SIMULACION_ORIGENES_CORS`, separando con comas.
ORIGENES_CORS: list[str] = [
    origen.strip()
    for origen in os.getenv(
        "SIMULACION_ORIGENES_CORS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:5175,http://127.0.0.1:5175",
    ).split(",")
    if origen.strip()
]
