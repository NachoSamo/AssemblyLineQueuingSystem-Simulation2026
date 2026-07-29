/**
 * Tipos espejo EXACTOS del contrato de la API (Frontend.md §3 / Backend.md).
 * Si el contrato cambia, este archivo se actualiza en el mismo cambio.
 * Nada de `any` ni de `as` sobre la respuesta del backend.
 */

/** Cuerpo de la petición a POST /api/simulaciones. */
export interface SimulacionRequest {
  n_minimo: number
  n_maximo: number
  replicas: number
  /** Fracción (0.95), no porcentaje. La conversión vive en api/simulacion.ts. */
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
   * Puede ser null: ocurre cuando ningún N del rango alcanzó el umbral
   * (`alcanzo_umbral: false`). Nunca tratarlo como si fuera un N real.
   */
  n_optimo: number | null
  alcanzo_umbral: boolean
  /**
   * Ligados a `n_optimo`: cuando este es null, no hay un N óptimo del cual
   * informar utilización/producción, así que se tratan también como null.
   * El contrato no lo aclara de forma explícita; ver informe del agente.
   */
  utilizacion_n_optimo: number | null
  piezas_n_optimo: number | null
  estadisticas_computo: EstadisticasComputo
}

/** Forma de error normalizada por el interceptor de axios (ver api/client.ts). */
export type TipoErrorApi = 'validacion' | 'red' | 'servidor'

export interface ErrorApi {
  tipo: TipoErrorApi
  mensaje: string
}
