import { useCallback, useRef, useState } from 'react'
import axios from 'axios'
import { ejecutarSimulacion } from '../api/simulacion'
import type { ErrorApi, SimulacionResponse } from '../types/simulacion'
import type { ParametrosFormulario } from '../types/formulario'

function esErrorApi(valor: unknown): valor is ErrorApi {
  return (
    typeof valor === 'object' &&
    valor !== null &&
    'tipo' in valor &&
    'mensaje' in valor
  )
}

export interface UseSimulacionResultado {
  resultado: SimulacionResponse | null
  error: ErrorApi | null
  cargando: boolean
  /** Dispara la petición. No bloquea: el estado se actualiza cuando resuelve. */
  ejecutar: (parametros: ParametrosFormulario) => void
  /** Aborta la petición en curso (botón "Cancelar" de la pantalla 2). */
  cancelar: () => void
  /** Limpia resultado y error, sin tocar `cargando`. */
  reiniciar: () => void
}

/**
 * Único lugar donde se orquesta el flujo asincrónico con el backend
 * (Frontend.md §2.1: "si un componente importa axios, está mal ubicado").
 */
export function useSimulacion(): UseSimulacionResultado {
  const [resultado, setResultado] = useState<SimulacionResponse | null>(null)
  const [error, setError] = useState<ErrorApi | null>(null)
  const [cargando, setCargando] = useState(false)
  const controladorRef = useRef<AbortController | null>(null)

  const ejecutar = useCallback((parametros: ParametrosFormulario) => {
    controladorRef.current?.abort()
    const controlador = new AbortController()
    controladorRef.current = controlador

    setError(null)
    setResultado(null)
    setCargando(true)

    ejecutarSimulacion(parametros, controlador.signal)
      .then((datos) => {
        setResultado(datos)
      })
      .catch((err: unknown) => {
        if (axios.isCancel(err)) {
          return
        }
        if (esErrorApi(err)) {
          setError(err)
        } else {
          setError({
            tipo: 'servidor',
            mensaje: 'Ocurrió un error inesperado. Probá de nuevo.',
          })
        }
      })
      .finally(() => {
        setCargando(false)
      })
  }, [])

  const cancelar = useCallback(() => {
    controladorRef.current?.abort()
    setCargando(false)
  }, [])

  const reiniciar = useCallback(() => {
    setResultado(null)
    setError(null)
  }, [])

  return { resultado, error, cargando, ejecutar, cancelar, reiniciar }
}
