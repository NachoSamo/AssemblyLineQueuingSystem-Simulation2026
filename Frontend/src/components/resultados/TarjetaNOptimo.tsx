import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import Tarjeta from '../ui/Tarjeta'
import Boton from '../ui/Boton'
import type { SimulacionResponse } from '../../types/simulacion'
import { formatearPiezas, formatearPorcentaje } from '../../utils/formato'

interface TarjetaNOptimoProps {
  resultado: SimulacionResponse
  onAmpliarRango: () => void
}

/**
 * La conclusión (Dominio.md §13.3): va primero, en lenguaje simple, no como
 * una fila más de una tabla. Cuando `alcanzo_umbral` es false, `n_optimo`
 * viaja en null — acá se corta ese caso antes de leer ningún campo
 * dependiente, para que la interfaz no reviente ni muestre el mejor N
 * disponible como si fuera la respuesta (Dominio.md §10.2).
 */
export default function TarjetaNOptimo({ resultado, onAmpliarRango }: TarjetaNOptimoProps) {
  const { alcanzo_umbral, n_optimo, utilizacion_n_optimo, piezas_n_optimo, parametros } =
    resultado

  if (
    !alcanzo_umbral ||
    n_optimo === null ||
    utilizacion_n_optimo === null ||
    piezas_n_optimo === null
  ) {
    const sugerenciaA = parametros.n_maximo + 2
    const sugerenciaB = parametros.n_maximo + 4

    return (
      <Tarjeta className="border-2 border-alerta/30 bg-red-50">
        <div className="flex items-start gap-4">
          <AlertTriangle className="mt-0.5 shrink-0 text-alerta" size={28} aria-hidden="true" />
          <div>
            <h2 className="text-lg font-bold text-alerta">
              Ningún N del rango alcanzó el umbral de {formatearPorcentaje(parametros.umbral_utilizacion, 0)}
            </h2>
            <p className="mt-1.5 text-base-700">
              La utilización sigue creciendo en N = {parametros.n_maximo}. Ampliá el N
              máximo (probá {sugerenciaA} o {sugerenciaB}) para encontrar dónde se
              satura el horno.
            </p>
            <div className="mt-4">
              <Boton variante="secundario" onClick={onAmpliarRango}>
                Ampliar rango y volver a simular
              </Boton>
            </div>
          </div>
        </div>
      </Tarjeta>
    )
  }

  return (
    <Tarjeta className="border-2 border-horno-400/40 bg-orange-50">
      <div className="flex items-start gap-4">
        <CheckCircle2 className="mt-0.5 shrink-0 text-horno-600" size={28} aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-horno-600">
            Conclusión
          </p>
          <h2 className="mt-1 text-2xl font-bold text-base-900">
            N óptimo encontrado: {n_optimo} ensambladores
          </h2>
          <p className="mt-1.5 text-base-700">
            Utilización del horno: <strong>{formatearPorcentaje(utilizacion_n_optimo)}</strong>{' '}
            · Producción: <strong>{formatearPiezas(piezas_n_optimo)}</strong> piezas por
            jornada
          </p>
        </div>
      </div>
    </Tarjeta>
  )
}
