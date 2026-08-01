/**
 * Tipos espejo EXACTOS del contrato de la API (Frontend.md §3 / Backend.md).
 * Si el contrato cambia, este archivo se actualiza en el mismo cambio.
 * Nada de `any` ni de `as` sobre la respuesta del backend.
 */

/**
 * Criterio con el que se elige el N óptimo (Dominio.md §10).
 *
 * - `maxima_produccion` — el del enunciado (§2): el mínimo N a partir del cual
 *   sumar otro ensamblador ya no aporta producción.
 * - `capacidad_horno` — el mínimo N que lleva el horno a su techo físico (~94,8 %).
 * - `umbral_manual` — el mínimo N que supera un umbral que fija el usuario.
 */
export type CriterioNOptimo = 'maxima_produccion' | 'capacidad_horno' | 'umbral_manual'

/** Cuerpo de la petición a POST /api/simulaciones. */
export interface SimulacionRequest {
  n_minimo: number
  n_maximo: number
  replicas: number
  criterio: CriterioNOptimo
  /** Piezas. Solo lo usa el criterio maxima_produccion, pero viaja siempre. */
  ganancia_minima: number
  /** Fracción (0.94), no porcentaje. La conversión vive en api/simulacion.ts. */
  umbral_utilizacion: number
  /** El usuario puede no ingresar semilla; el backend genera una si viaja null. */
  semilla: number | null
}

/** Rango uniforme [minimo, maximo] de un tiempo del modelo (ensamble o cocción). */
export interface RangoTiempo {
  minimo: number
  maximo: number
}

/**
 * Parámetros efectivos de la corrida, tal como los devuelve el backend.
 * Incluye tanto los configurables como los fijos del enunciado
 * (duracion_jornada, tiempo_ensamble, tiempo_coccion): nunca se hardcodean
 * en el frontend, se muestran siempre desde acá.
 */
export interface ParametrosSimulacion {
  n_minimo: number
  n_maximo: number
  replicas: number
  criterio: CriterioNOptimo
  ganancia_minima: number
  umbral_utilizacion: number
  /** Siempre viene con un valor: si el usuario no la ingresó, el backend generó una. */
  semilla: number
  duracion_jornada: number
  tiempo_ensamble: RangoTiempo
  tiempo_coccion: RangoTiempo
}

/** Resultado agregado (promedio de R réplicas) para un valor de N. */
export interface ResultadoPorN {
  n: number
  /** Fracción (0-1). Convertir a porcentaje es responsabilidad de la vista. */
  utilizacion_promedio: number
  piezas_promedio: number
  tiempo_horno_ocupado_promedio: number
  utilizacion_desvio: number
  piezas_desvio: number
}

/** Tiempo de cómputo real (no de simulación) que tomó correr un N completo. */
export interface TiempoPorN {
  n: number
  tiempo_ms: number
}

/** Estadísticas de cómputo del programa (Dominio.md §12), en crudo. */
export interface EstadisticasComputo {
  tiempo_total_ms: number
  tiempo_por_n: TiempoPorN[]
  tiempo_promedio_replica_ms: number
  memoria_pico_mb: number
  cpu_porcentaje: number
}

/** Respuesta 200 de POST /api/simulaciones. */
export interface SimulacionResponse {
  parametros: ParametrosSimulacion
  resultados_por_n: ResultadoPorN[]
  /**
   * Puede ser null: ocurre cuando ningún N del rango satisface el criterio
   * (`alcanzo_criterio: false`). Nunca tratarlo como si fuera un N real.
   */
  n_optimo: number | null
  alcanzo_criterio: boolean
  /**
   * Ligados a `n_optimo`: cuando este es null, todos estos vienen en null.
   */
  utilizacion_n_optimo: number | null
  piezas_n_optimo: number | null
  /**
   * La producción REAL: el promedio truncado. 56,33 de promedio son 56 piezas
   * completas — la 57.ª queda a medio cocinar al terminar la jornada.
   */
  piezas_n_optimo_truncadas: number | null
  /**
   * Piezas que aportaría pasar al N siguiente. Es lo que justifica el corte.
   * También es null si el N óptimo es el último del rango: no hay sucesor.
   */
  ganancia_n_optimo: number | null
  /** Mayor utilización del rango. Siempre viene, incluso sin N óptimo. */
  utilizacion_maxima_rango: number
  estadisticas_computo: EstadisticasComputo
}

/* -------------------------------------------------------------------------- */
/* Vector de estado — POST /api/simulaciones/vector-estado                     */
/* -------------------------------------------------------------------------- */

/**
 * Identifica UNA réplica dentro de una corrida ya ejecutada. Los cinco campos
 * salen de `SimulacionResponse.parametros`, no los tipea el usuario: el backend
 * reconstruye la jornada desde la semilla, así que si alguno no coincide con la
 * corrida en pantalla se estaría mostrando otra simulación.
 */
export interface VectorEstadoRequest {
  semilla: number
  n_minimo: number
  replicas: number
  n: number
  /** Empieza en 1, como se muestra en pantalla (el backend traduce a base 0). */
  replica: number
}

/** Estados posibles de un ensamblador (Dominio.md §5.1). */
export type EstadoEnsamblador = 'Ensamblando' | 'Esperando'

/** Estados posibles del horno (Dominio.md §5.2). */
export type EstadoHorno = 'Libre' | 'Ocupado'

/** Estados posibles de una pieza a lo largo de su vida (Dominio.md §5.3). */
export type EstadoPieza = 'Ensamblándose' | 'En cola' | 'En cocción' | 'Terminada'

/**
 * Las cuatro columnas que la planilla dedica a un ensamblador en una fila.
 * `rnd`/`tiempo` son null donde ese ensamblador no sorteó nada; `fin_ensamble`
 * persiste fila a fila (es la lista de eventos futuros) y es null si espera.
 */
export interface ColumnaEnsamblador {
  rnd: number | null
  tiempo: number | null
  fin_ensamble: number | null
  estado: EstadoEnsamblador
}

/** Una fila del vector de estado: UN evento del bucle, no una réplica. */
export interface FilaVectorEstado {
  replica: number
  /** Número de fila dentro de la réplica. La inicialización es la 0. */
  iteracion: number
  evento: string
  reloj: number
  /** Siempre tiene exactamente `n` elementos, en orden de ensamblador 1..N. */
  ensambladores: ColumnaEnsamblador[]
  rnd_coccion: number | null
  tiempo_coccion: number | null
  fin_coccion: number | null
  horno_estado: EstadoHorno
  cola: number
  piezas_terminadas: number
  /**
   * Estado de cada pieza creada HASTA esta fila: la lista crece a lo largo de
   * la jornada. Es más corta que `total_piezas` en las primeras filas, así que
   * la tabla tiene que rellenar las columnas faltantes.
   */
  piezas: EstadoPieza[]
}

/** Respuesta 200 de POST /api/simulaciones/vector-estado. */
export interface VectorEstadoResponse {
  n: number
  replica: number
  total_replicas: number
  /** Cuántas columnas de pieza dibujar: largo de `piezas` en la última fila. */
  total_piezas: number
  total_filas: number
  filas: FilaVectorEstado[]
}

/** Forma de error normalizada por el interceptor de axios (ver api/client.ts). */
export type TipoErrorApi = 'validacion' | 'red' | 'servidor'

export interface ErrorApi {
  tipo: TipoErrorApi
  mensaje: string
}
