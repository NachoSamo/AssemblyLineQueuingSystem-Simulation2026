import { clienteApi } from './client'
import type { SimulacionRequest, SimulacionResponse } from '../types/simulacion'
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
