import type { RangoTiempo } from '../../types/simulacion'
import {
  desvioUniforme,
  formulaGeneracion,
  mediaUniforme,
  notacionUniforme,
  semirrangoUniforme,
} from '../../utils/estadistica'
import { formatearDecimal } from '../../utils/formato'

interface FichaDistribucionProps {
  titulo: string
  rango: RangoTiempo
}

/**
 * La distribución de un tiempo del enunciado, con su fórmula de generación y
 * sus estadísticos (Dominio.md §3). Todo se **deriva** de `rango`, que viene
 * del backend: acá no hay ningún número escrito a mano.
 *
 * Se muestran el desvío estándar y el semirrango por separado y etiquetados a
 * propósito. El enunciado escribe "30 ± 5", donde ese 5 es el semirrango —la
 * mitad del ancho del intervalo—, no el desvío estándar, que para U(25, 35) da
 * 2,89. Mostrar uno solo invitaría a pensar que el otro está mal.
 */
export default function FichaDistribucion({ titulo, rango }: FichaDistribucionProps) {
  return (
    <div className="rounded-lg border border-base-200 bg-white px-4 py-3">
      <p className="text-sm font-semibold text-base-900">{titulo}</p>

      <p className="mt-1 font-mono text-sm text-horno-600">
        {notacionUniforme(rango)} minutos
      </p>
      <p className="mt-0.5 font-mono text-xs text-base-500">
        X = {formulaGeneracion(rango)}
      </p>

      <dl className="mt-3 space-y-1 text-xs text-base-600">
        <div className="flex justify-between gap-2">
          <dt>Media</dt>
          <dd className="font-mono tabular-nums text-base-800">
            {formatearDecimal(mediaUniforme(rango))} min
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Desvío estándar</dt>
          <dd className="font-mono tabular-nums text-base-800">
            {formatearDecimal(desvioUniforme(rango), 2)} min
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Semirrango</dt>
          <dd className="font-mono tabular-nums text-base-800">
            ± {formatearDecimal(semirrangoUniforme(rango))} min
          </dd>
        </div>
      </dl>
    </div>
  )
}
