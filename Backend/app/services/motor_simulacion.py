"""Motor de simulación de eventos discretos: una réplica de una jornada.

Qué hace: ejecuta una jornada completa de 480 minutos para un N dado, con el bucle
clásico de siguiente-evento (reloj + lista de eventos futuros). Devuelve el tiempo de
horno ocupado y las piezas terminadas de esa réplica, y opcionalmente registra el
vector de estado fila por fila.

Qué NO le corresponde: no sabe qué es FastAPI, ni Pydantic, ni JSON, ni HTTP. No recorre
varios N ni varias réplicas (eso es de `experimento_service`), no promedia nada y no mide
tiempos de cómputo. Tampoco pagina ni formatea el vector de estado: lo entrega crudo.

Unidades: todo el tiempo de este módulo es **tiempo simulado, en minutos**.
"""

from __future__ import annotations

import math
from collections import deque
from dataclasses import dataclass

from ..utils.constantes import (
    COCCION_MAXIMO,
    COCCION_MINIMO,
    DURACION_JORNADA,
    ENSAMBLE_MAXIMO,
    ENSAMBLE_MINIMO,
)
from ..utils.generadores import FlujoAleatorio, uniforme_con_rnd

"""Definimos los eventos del sistema"""
#: Marca de "sin evento programado" en la lista de eventos futuros.
SIN_EVENTO: float = math.inf

#: Estados posibles de un ensamblador.
ENSAMBLADOR_ENSAMBLANDO: str = "Ensamblando"
ENSAMBLADOR_ESPERANDO: str = "Esperando"

#: Estados posibles del horno.
HORNO_LIBRE: str = "Libre"
HORNO_OCUPADO: str = "Ocupado"

#: Estados posibles de una pieza a lo largo de su vida.
PIEZA_ENSAMBLANDOSE: str = "Ensamblándose"
PIEZA_EN_COLA: str = "En cola"
PIEZA_EN_COCCION: str = "En cocción"
PIEZA_TERMINADA: str = "Terminada"

#: Nombres de los eventos, tal como aparecen en la columna "Evento" de la planilla.
EVENTO_INICIALIZACION: str = "Inicialización"
EVENTO_FIN_COCCION: str = "Fin Cocción"
EVENTO_FIN_JORNADA: str = "Fin de la jornada"


@dataclass(frozen=True, slots=True)
class ColumnaEnsamblador:
    """Las cuatro columnas que la planilla dedica a un ensamblador en una fila.

    `rnd` y `tiempo` valen `None` en las filas donde **ese** ensamblador no sorteó nada:
    en cada evento sortea como mucho uno (en la inicialización, todos).
    `fin_ensamble` es una columna de la lista de eventos futuros, así que **persiste**
    fila a fila mientras el ensamblador esté ensamblando, y vale `None` cuando espera.

    :param rnd: número aleatorio sorteado en esta fila, o `None`.
    :param tiempo: tiempo de ensamble que salió de ese RND, en minutos, o `None`.
    :param fin_ensamble: minuto en que termina el ensamble en curso, o `None` si espera.
    :param estado: `"Ensamblando"` o `"Esperando"`
    """

    rnd: float | None
    tiempo: float | None
    fin_ensamble: float | None
    estado: str


@dataclass(frozen=True, slots=True)
class FilaVectorEstado:
    """Una fila del vector de estado: **un evento** del bucle, no una réplica.

    Reproduce las columnas de `Ejercicio 135 Final Planteo.ods`. La planilla está trazada
    con N=1; para N>1 el bloque de ensamble se repite por ensamblador (`Backend.md` §4.9),
    de modo que con N=1 la tabla queda idéntica a la planilla.

    :param iteracion: número de fila dentro de la réplica. La inicialización es la 0.
    :param evento: nombre del evento que se acaba de ejecutar.
    :param reloj: minuto de la jornada en que ocurrió, entre 0 y 480.
    :param ensambladores: una entrada por ensamblador, en orden 1..N.
    :param rnd_coccion: RND sorteado para la cocción en esta fila, o `None`.
    :param tiempo_coccion: tiempo de cocción que salió de ese RND, en minutos, o `None`.
    :param fin_coccion: minuto en que termina la cocción en curso, o `None` si el horno
        está libre. Persiste fila a fila, como la columna de la planilla.
    :param horno_estado: `"Libre"` u `"Ocupado"` (§5.2).
    :param cola: cantidad de piezas esperando turno de horno.
    :param piezas_terminadas: contador acumulado de piezas que salieron del horno.
    :param piezas: estado de cada pieza creada hasta esta fila, en orden de creación.
        La lista **crece** a lo largo de la réplica: la pieza k aparece recién cuando nace.
    """

    iteracion: int
    evento: str
    reloj: float
    ensambladores: tuple[ColumnaEnsamblador, ...]
    rnd_coccion: float | None
    tiempo_coccion: float | None
    fin_coccion: float | None
    horno_estado: str
    cola: int
    piezas_terminadas: int
    piezas: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class ResultadoReplica:
    """Lo que deja registrado una réplica (`Dominio.md` §9).

    :param tiempo_horno_ocupado: minutos que el horno estuvo en estado `Ocupado`
        durante la jornada, incluido el tramo parcial de la cocción en curso al corte (§8).
    :param piezas_terminadas: cantidad de piezas que salieron del horno antes del minuto 480.
    """

    tiempo_horno_ocupado: float
    piezas_terminadas: int


def ejecutar_replica(
    n_ensambladores: int,
    flujo_ensamble: FlujoAleatorio,
    flujo_coccion: FlujoAleatorio,
    duracion_jornada: float = DURACION_JORNADA,
    traza: list[FilaVectorEstado] | None = None,
) -> ResultadoReplica:
    """Simula una jornada completa para un número fijo de ensambladores.

    :param n_ensambladores: N, cantidad de ensambladores que comparten el horno (>= 1).
    :param flujo_ensamble: flujo de RND del que salen los tiempos de ensamble.
    :param flujo_coccion: flujo de RND del que salen los tiempos de cocción.
        Debe ser **independiente** del anterior.
    :param duracion_jornada: minuto de corte. Es un dato fijo del enunciado (480) y está
        acá solo para no repetir la constante dentro del bucle; no es un parámetro de la API.
    :param traza: si se pasa una lista, se le agrega una `FilaVectorEstado` por cada evento
        (más la inicialización y el corte). Si es `None`, no se registra nada.
        **La traza es un observador puro**: no altera el orden ni la cantidad de RND que se
        consumen, así que una réplica trazada da exactamente el mismo resultado que la misma
        réplica sin trazar.
    :return: `ResultadoReplica` con el tiempo de horno ocupado (minutos) y las piezas terminadas.
    """
    # --- Inicialización: el sistema arranca vacío -------------
    reloj: float = 0.0
    horno_ocupado: bool = False
    cola: deque[int] = deque() 
    tiempo_horno_ocupado: float = 0.0
    piezas_terminadas: int = 0

    # Seguimiento de las piezas: cada ensamblador tiene una pieza en mano, y cada pieza
    # recorre Ensamblándose -> (En cola) -> En cocción -> Terminada. Es información que la
    # lógica de eventos no necesita, pero que la planilla muestra columna por columna.
    estados_piezas: list[str] = [PIEZA_ENSAMBLANDOSE] * n_ensambladores
    pieza_de_ensamblador: list[int] = list(range(n_ensambladores))

    # Lista de eventos futuros: un Fin Ensamble por ensamblador que esté ensamblando...
    fin_ensamble: list[float] = []
    rnd_ensamble_fila: list[float | None] = []
    tiempo_ensamble_fila: list[float | None] = []
    for _ in range(n_ensambladores):
        rnd, tiempo = uniforme_con_rnd(ENSAMBLE_MINIMO, ENSAMBLE_MAXIMO, flujo_ensamble)
        fin_ensamble.append(tiempo)
        rnd_ensamble_fila.append(rnd)
        tiempo_ensamble_fila.append(tiempo)
    # ...y como máximo un Fin Cocción, porque el horno procesa de a una pieza (§6).
    fin_coccion: float = SIN_EVENTO
    ensamblador_en_horno: int = -1  # dueño de la pieza que está dentro del horno (§5.2)
    inicio_coccion_actual: float = 0.0  # para poder cerrar el tramo parcial al corte (§8)

    rnd_coccion_fila: float | None = None
    tiempo_coccion_fila: float | None = None
    iteracion: int = 0

    def registrar(evento: str, momento: float) -> None:
        """Agrega a la traza la foto del sistema tal como quedó después del evento."""
        traza.append(  # type: ignore[union-attr]  # solo se llama si traza no es None
            FilaVectorEstado(
                iteracion=iteracion,
                evento=evento,
                reloj=momento,
                ensambladores=tuple(
                    ColumnaEnsamblador(
                        rnd=rnd_ensamble_fila[i],
                        tiempo=tiempo_ensamble_fila[i],
                        fin_ensamble=(
                            None if fin_ensamble[i] == SIN_EVENTO else fin_ensamble[i]
                        ),
                        estado=(
                            ENSAMBLADOR_ESPERANDO
                            if fin_ensamble[i] == SIN_EVENTO
                            else ENSAMBLADOR_ENSAMBLANDO
                        ),
                    )
                    for i in range(n_ensambladores)
                ),
                rnd_coccion=rnd_coccion_fila,
                tiempo_coccion=tiempo_coccion_fila,
                fin_coccion=None if fin_coccion == SIN_EVENTO else fin_coccion,
                horno_estado=HORNO_OCUPADO if horno_ocupado else HORNO_LIBRE,
                cola=len(cola),
                piezas_terminadas=piezas_terminadas,
                piezas=tuple(estados_piezas),
            )
        )

    if traza is not None:
        registrar(EVENTO_INICIALIZACION, reloj)

    while True:
        # --- Próximo evento: el de menor tiempo ----------------------------------------
        proximo_ensamble = min(fin_ensamble)
        proximo_evento = min(proximo_ensamble, fin_coccion)

        # --- Corte de la jornada  --------------------------------------------------
        # La jornada corta estrictamente en el minuto 480: el evento que caiga en 480 o
        # después no se ejecuta, y la pieza asociada no se cuenta.
        if proximo_evento >= duracion_jornada:
            # Si el horno estaba Ocupado al cortar, se le suma el TRAMO PARCIAL de esa
            # cocción (desde que empezó hasta 480) — no la cocción completa, ni cero.
            # Es el error que produce utilizaciones sistemáticamente bajas.
            if horno_ocupado:
                tiempo_horno_ocupado += duracion_jornada - inicio_coccion_actual
            if traza is not None:
                iteracion += 1
                rnd_ensamble_fila = [None] * n_ensambladores
                tiempo_ensamble_fila = [None] * n_ensambladores
                rnd_coccion_fila = None
                tiempo_coccion_fila = None
                registrar(EVENTO_FIN_JORNADA, duracion_jornada)
            break

        reloj = proximo_evento
        iteracion += 1
        # Las columnas de RND y tiempo son "lo sorteado en esta fila": se limpian en cada
        # evento y solo se llenan las que efectivamente se sortearon.
        rnd_ensamble_fila = [None] * n_ensambladores
        tiempo_ensamble_fila = [None] * n_ensambladores
        rnd_coccion_fila = None
        tiempo_coccion_fila = None

        if fin_coccion <= proximo_ensamble:
            # --- Evento Fin Cocción (§6.2) ---------------------------------------------
            # El orden de estos cuatro pasos es parte del modelo; alterarlo cambia los
            # resultados numéricos (`Backend.md` §4.4).
            ensamblador_duenio = ensamblador_en_horno

            # 1. Contar la pieza terminada.
            piezas_terminadas += 1
            estados_piezas[pieza_de_ensamblador[ensamblador_duenio]] = PIEZA_TERMINADA

            # 2. Liberar el horno y cerrar su tramo de ocupación.
            tiempo_horno_ocupado += reloj - inicio_coccion_actual
            horno_ocupado = False
            fin_coccion = SIN_EVENTO
            ensamblador_en_horno = -1

            # 3. Revisar la cola: si hay alguien esperando, entra el primero (FIFO).
            if cola:
                ensamblador_en_horno = cola.popleft()
                horno_ocupado = True
                inicio_coccion_actual = reloj
                rnd_coccion_fila, tiempo_coccion_fila = uniforme_con_rnd(
                    COCCION_MINIMO, COCCION_MAXIMO, flujo_coccion
                )
                fin_coccion = reloj + tiempo_coccion_fila
                estados_piezas[pieza_de_ensamblador[ensamblador_en_horno]] = PIEZA_EN_COCCION

            # 4. El ensamblador dueño de la pieza que salió vuelve a Ensamblando:
            #    se crea una nueva pieza y se programa su Fin Ensamble.
            rnd, tiempo = uniforme_con_rnd(ENSAMBLE_MINIMO, ENSAMBLE_MAXIMO, flujo_ensamble)
            fin_ensamble[ensamblador_duenio] = reloj + tiempo
            rnd_ensamble_fila[ensamblador_duenio] = rnd
            tiempo_ensamble_fila[ensamblador_duenio] = tiempo
            estados_piezas.append(PIEZA_ENSAMBLANDOSE)
            pieza_de_ensamblador[ensamblador_duenio] = len(estados_piezas) - 1

            nombre_evento = EVENTO_FIN_COCCION
        else:
            # --- Evento Fin Ensamble [ensamblador i] (§6.1) ----------------------------
            ensamblador = fin_ensamble.index(proximo_ensamble)

            if not horno_ocupado:
                # El horno está Libre: la pieza entra y se programa su Fin Cocción.
                horno_ocupado = True
                ensamblador_en_horno = ensamblador
                inicio_coccion_actual = reloj
                rnd_coccion_fila, tiempo_coccion_fila = uniforme_con_rnd(
                    COCCION_MINIMO, COCCION_MAXIMO, flujo_coccion
                )
                fin_coccion = reloj + tiempo_coccion_fila
                estados_piezas[pieza_de_ensamblador[ensamblador]] = PIEZA_EN_COCCION
            else:
                # El horno está Ocupado: la pieza se encola (FIFO, conservando su dueño).
                cola.append(ensamblador)
                estados_piezas[pieza_de_ensamblador[ensamblador]] = PIEZA_EN_COLA

            # El ensamblador queda Esperando en LOS DOS CASOS: entre directo al horno o
            # haya quedado en cola, no puede empezar la próxima pieza hasta que esta salga.
            fin_ensamble[ensamblador] = SIN_EVENTO

            nombre_evento = f"Fin Ensamble {ensamblador + 1}"

        if traza is not None:
            registrar(nombre_evento, reloj)

    return ResultadoReplica(
        tiempo_horno_ocupado=tiempo_horno_ocupado,
        piezas_terminadas=piezas_terminadas,
    )
