import type { EstadisticasComputo } from '../../types/simulacion'
import {
  formatearDecimal,
  formatearMemoriaMb,
  formatearPorcentajeEntero,
  formatearTiempoMs,
} from '../../utils/formato'

interface PanelComputoProps {
  estadisticas: EstadisticasComputo
}

/**
 * Estadísticas de cómputo del programa (Dominio.md §12) traducidas a
 * lenguaje simple (Frontend.md §7.2). El backend devuelve magnitudes
 * crudas; el frontend arma las frases, siempre acá y no en otro lado.
 */
export default function PanelComputo({ estadisticas }: PanelComputoProps) {
  return (
    <div className="space-y-4">
      <ul className="space-y-2 text-sm text-base-700">
        <li>
          La simulación tardó{' '}
          <strong>{formatearTiempoMs(estadisticas.tiempo_total_ms)}</strong> en total
        </li>
        <li>
          Cada jornada simulada tardó en promedio{' '}
          <strong>{formatearDecimal(estadisticas.tiempo_promedio_replica_ms, 2)} milisegundos</strong>
        </li>
        <li>
          Memoria usada: <strong>{formatearMemoriaMb(estadisticas.memoria_pico_mb)}</strong>
        </li>
        <li>
          Uso de procesador:{' '}
          <strong>{formatearPorcentajeEntero(estadisticas.cpu_porcentaje)}</strong>
        </li>
      </ul>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-base-500">
          Cuánto tardó cada configuración
        </p>
        <div className="mt-2 overflow-x-auto">
          <table className="min-w-[240px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-base-200 text-xs uppercase tracking-wide text-base-500">
                <th className="py-1.5 pr-6 font-medium">N</th>
                <th className="py-1.5 pr-6 font-medium">Tiempo</th>
              </tr>
            </thead>
            <tbody className="font-mono tabular-nums">
              {estadisticas.tiempo_por_n.map((fila) => (
                <tr key={fila.n} className="border-b border-base-100 text-base-700">
                  <td className="py-1.5 pr-6">{fila.n}</td>
                  <td className="py-1.5 pr-6">{formatearTiempoMs(fila.tiempo_ms)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="border-t border-base-200 pt-3 text-xs italic text-base-500">
        Estas cifras sirven para elegir R: si aumentar las réplicas encarece mucho el
        tiempo de corrida, hay que balancear precisión estadística contra tiempo
        disponible.
      </p>
    </div>
  )
}
