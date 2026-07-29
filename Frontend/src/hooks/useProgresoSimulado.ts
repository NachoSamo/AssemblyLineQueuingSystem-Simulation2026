import { useEffect, useRef, useState } from 'react'

/**
 * Progreso ANIMADO de la pantalla 2 (Frontend.md §6.1, Claude.md).
 *
 * El backend responde en milisegundos: un progreso "real" sería un
 * parpadeo imperceptible. Por eso la barra la anima el frontend, con una
 * regla fija:
 *   - Avanza de 0 a 99 % en 3000 ms, con ease-out.
 *   - Al llegar a 99 % se detiene y espera.
 *   - Nunca se transiciona antes de los 3 segundos, aunque `datosListos`
 *     ya sea true (por ejemplo, con una respuesta en 40 ms).
 *   - Si el backend tarda más de 3 s, la barra queda clavada en 99 % hasta
 *     que `datosListos` pasa a true: no vuelve atrás ni reinicia.
 *   - Recién ahí salta a 100 % y `listoParaTransicionar` pasa a true.
 *
 * IMPORTANTE: el porcentaje que devuelve este hook (y los contadores
 * "N = x de y" / "Réplica i / R" que arma `SimulandoPage` a partir de él)
 * son puramente ESTIMADOS en el frontend. No vienen del backend, que no
 * reporta progreso incremental (un único POST síncrono). No construir
 * lógica de negocio sobre estos números: son cosméticos, para que la
 * espera no se sienta un parpadeo. Progreso real requeriría streaming
 * (SSE) del lado del backend — ver la nota correspondiente en Claude.md.
 */

const DURACION_MINIMA_MS = 3000
const TOPE_ESPERA_PORCENTAJE = 99

function easeOutCuadratico(t: number): number {
  return 1 - (1 - t) * (1 - t)
}

export interface ProgresoSimulado {
  /** 0-100. Nunca supera 99 hasta que `datosListos` sea true. */
  porcentaje: number
  /** true una única vez: cuando ya pasaron los 3 s Y los datos están listos. */
  listoParaTransicionar: boolean
}

export function useProgresoSimulado(datosListos: boolean): ProgresoSimulado {
  const [porcentaje, setPorcentaje] = useState(0)
  const [listoParaTransicionar, setListoParaTransicionar] = useState(false)

  // Ref para que el bucle de requestAnimationFrame (que arranca una sola
  // vez, al montar) siempre vea el valor más reciente de `datosListos`
  // sin tener que reiniciarse cuando ese valor cambia.
  const datosListosRef = useRef(datosListos)
  useEffect(() => {
    datosListosRef.current = datosListos
  }, [datosListos])

  useEffect(() => {
    const inicio = performance.now()
    let idFrame: number

    const tick = (ahora: number) => {
      const transcurrido = ahora - inicio
      const t = Math.min(transcurrido / DURACION_MINIMA_MS, 1)

      if (t >= 1) {
        // Ya pasaron los 3 segundos: si los datos llegaron, se transiciona
        // recién ahora (nunca antes). Si no, se queda clavado en 99 %.
        if (datosListosRef.current) {
          setPorcentaje(100)
          setListoParaTransicionar(true)
          return
        }
        setPorcentaje(TOPE_ESPERA_PORCENTAJE)
        idFrame = requestAnimationFrame(tick)
        return
      }

      setPorcentaje(easeOutCuadratico(t) * TOPE_ESPERA_PORCENTAJE)
      idFrame = requestAnimationFrame(tick)
    }

    idFrame = requestAnimationFrame(tick)

    return () => cancelAnimationFrame(idFrame)
    // Se ejecuta una sola vez por montaje de la pantalla de simulación: el
    // "reloj" de los 3 s arranca cuando el usuario entra a la pantalla, no
    // cuando cambia `datosListos` (por eso ese valor se lee de la ref y no
    // hace falta declararlo como dependencia).
  }, [])

  return { porcentaje, listoParaTransicionar }
}
