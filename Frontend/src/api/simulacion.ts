import { clienteApi } from './client'
import type {
  ParametrosSimulacion,
  SimulacionRequest,
  SimulacionResponse,
  VectorEstadoRequest,
  VectorEstadoResponse,
} from '../types/simulacion'
import type { ParametrosFormulario } from '../types/formulario'

/**
 * Ejecuta la simulación contra el único endpoint del backend.
 * Acá, y solo acá, se convierte el umbral de porcentaje (como lo ve el
 * usuario) a fracción (como lo espera la API) — Frontend.md §5.1 y §9.
 */
export async function ejecutarSimulacion(
  parametros: ParametrosFormulario,
  signal?: AbortSignal,
): Promise<SimulacionResponse> {
  const cuerpo: SimulacionRequest = {
    n_minimo: parametros.nMinimo,
    n_maximo: parametros.nMaximo,
    replicas: parametros.replicas,
    criterio: parametros.criterio,
    // Los dos parámetros de criterio viajan siempre, aunque el criterio elegido
    // use solo uno: así el backend puede devolver la configuración completa y
    // cambiar de modo no obliga a rearmar el cuerpo.
    ganancia_minima: parametros.gananciaMinima,
    umbral_utilizacion: parametros.umbralUtilizacionPorcentaje / 100,
    semilla: parametros.semilla,
  }

  const { data } = await clienteApi.post<SimulacionResponse>(
    '/api/simulaciones',
    cuerpo,
    { signal },
  )
  return data
}

/**
 * Trae el vector de estado de UNA réplica de la corrida que está en pantalla.
 *
 * Los datos de identificación salen de `parametros`, la respuesta de la corrida,
 * y no del formulario: el backend reconstruye la jornada desde la semilla, así
 * que pedirla con otros valores devolvería una simulación distinta de la que el
 * usuario está mirando (Frontend.md §3).
 */
export async function obtenerVectorEstado(
  parametros: ParametrosSimulacion,
  n: number,
  replica: number,
  signal?: AbortSignal,
): Promise<VectorEstadoResponse> {
  const cuerpo: VectorEstadoRequest = {
    semilla: parametros.semilla,
    n_minimo: parametros.n_minimo,
    replicas: parametros.replicas,
    n,
    replica,
  }

  const { data } = await clienteApi.post<VectorEstadoResponse>(
    '/api/simulaciones/vector-estado',
    cuerpo,
    { signal },
  )
  return data
}

/**
 * GET /api/salud — permite distinguir "backend caído" de "parámetros
 * inválidos" (Frontend.md §3). No se usa para bloquear la pantalla de
 * configuración, es una utilidad disponible para diagnóstico.
 */
export async function verificarSalud(): Promise<boolean> {
  try {
    await clienteApi.get('/api/salud')
    return true
  } catch {
    return false
  }
}
