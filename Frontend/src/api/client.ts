import axios from 'axios'
import type { AxiosError } from 'axios'
import type { ErrorApi } from '../types/simulacion'

/**
 * Instancia única de axios (Frontend.md §10). Timeout generoso porque con R
 * alto la corrida puede tardar de verdad, aunque el caso típico responda
 * en milisegundos.
 */
export const clienteApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
  timeout: 60_000,
})

interface CuerpoErrorBackend {
  detail?: string
}

/**
 * Normaliza cualquier error de la petición a una forma única `ErrorApi`,
 * para que las pantallas no tengan que inspeccionar códigos HTTP.
 */
clienteApi.interceptors.response.use(
  (respuesta) => respuesta,
  (error: AxiosError<CuerpoErrorBackend>) => {
    if (axios.isCancel(error)) {
      return Promise.reject(error)
    }

    if (!error.response) {
      const errorRed: ErrorApi = {
        tipo: 'red',
        mensaje:
          'No se pudo conectar con el servidor. Verificá que el backend esté corriendo en el puerto 8000.',
      }
      return Promise.reject(errorRed)
    }

    if (error.response.status === 422) {
      const errorValidacion: ErrorApi = {
        tipo: 'validacion',
        mensaje:
          error.response.data?.detail ??
          'Los parámetros ingresados no son válidos.',
      }
      return Promise.reject(errorValidacion)
    }

    const errorServidor: ErrorApi = {
      tipo: 'servidor',
      mensaje:
        'Ocurrió un error inesperado en el servidor. Probá de nuevo en unos segundos.',
    }
    return Promise.reject(errorServidor)
  },
)
