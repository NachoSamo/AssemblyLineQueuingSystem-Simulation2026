import { useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { obtenerVectorEstado } from '../api/simulacion'
import type {
  ErrorApi,
  ParametrosSimulacion,
  VectorEstadoResponse,
} from '../types/simulacion'

function esErrorApi(valor: unknown): valor is ErrorApi {
  return (
    typeof valor === 'object' && valor !== null && 'tipo' in valor && 'mensaje' in valor
  )
}

/** Lo que devolvió la última petición que terminó, junto con qué réplica pedía. */
interface RespuestaRecibida {
  clave: string
  vector: VectorEstadoResponse | null
  error: ErrorApi | null
}

export interface UseVectorEstadoResultado {
  vector: VectorEstadoResponse | null
  cargando: boolean
  error: ErrorApi | null
}

/**
 * Trae el vector de estado de la réplica seleccionada y lo vuelve a pedir cada
 * vez que cambia N o la réplica (Frontend.md §2.1: axios no se importa desde un
 * componente).
 *
 * `cargando` no es un estado propio sino algo **derivado**: se compara la
 * réplica que se está pidiendo contra la que devolvió la última respuesta. Así
 * no hace falta prender y apagar una bandera dentro del efecto, y de paso queda
 * imposible que una respuesta vieja que llega tarde se muestre como si fuera la
 * de la selección actual.
 */
export function useVectorEstado(
  parametros: ParametrosSimulacion,
  n: number,
  replica: number,
): UseVectorEstadoResultado {
  const clave = `${parametros.semilla}|${parametros.n_minimo}|${parametros.replicas}|${n}|${replica}`

  const [recibida, setRecibida] = useState<RespuestaRecibida | null>(null)
  const controladorRef = useRef<AbortController | null>(null)

  useEffect(() => {
    controladorRef.current?.abort()
    const controlador = new AbortController()
    controladorRef.current = controlador

    obtenerVectorEstado(parametros, n, replica, controlador.signal)
      .then((datos) => {
        setRecibida({ clave, vector: datos, error: null })
      })
      .catch((err: unknown) => {
        // Una petición abortada no es un error: la reemplazó otra que sigue en
        // curso, así que no se registra nada y `cargando` sigue en true.
        if (axios.isCancel(err)) {
          return
        }
        setRecibida({
          clave,
          vector: null,
          error: esErrorApi(err)
            ? err
            : { tipo: 'servidor', mensaje: 'No se pudo obtener el vector de estado.' },
        })
      })

    return () => {
      controlador.abort()
    }
  }, [clave, parametros, n, replica])

  return useMemo(() => {
    const alDia = recibida !== null && recibida.clave === clave
    return {
      vector: alDia ? recibida.vector : null,
      error: alDia ? recibida.error : null,
      cargando: !alDia,
    }
  }, [recibida, clave])
}
