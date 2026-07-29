import type { ResultadoPorN } from '../../types/simulacion'
import { formatearDecimal, formatearPiezas, formatearPorcentaje } from '../../utils/formato'

interface TablaResultadosProps {
  resultadosPorN: ResultadoPorN[]
  nOptimo: number | null
}

/** Detalle plegado por defecto (Dominio.md §13.4): una fila por N. */
export default function TablaResultados({ resultadosPorN, nOptimo }: TablaResultadosProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-base-200 text-xs uppercase tracking-wide text-base-500">
            <th className="py-2 pr-4 font-medium">N</th>
            <th className="py-2 pr-4 font-medium">Utilización promedio</th>
            <th className="py-2 pr-4 font-medium">Desvío utilización</th>
            <th className="py-2 pr-4 font-medium">Piezas promedio</th>
            <th className="py-2 pr-4 font-medium">Desvío piezas</th>
            <th className="py-2 pr-4 font-medium">Horno ocupado (min)</th>
          </tr>
        </thead>
        <tbody className="font-mono tabular-nums">
          {resultadosPorN.map((fila) => {
            const esOptimo = fila.n === nOptimo
            return (
              <tr
                key={fila.n}
                className={`border-b border-base-100 ${esOptimo ? 'bg-orange-50 font-semibold text-horno-700' : 'text-base-700'}`}
              >
                <td className="py-2 pr-4">{fila.n}</td>
                <td className="py-2 pr-4">{formatearPorcentaje(fila.utilizacion_promedio)}</td>
                <td className="py-2 pr-4">{formatearPorcentaje(fila.utilizacion_desvio)}</td>
                <td className="py-2 pr-4">{formatearPiezas(fila.piezas_promedio)}</td>
                <td className="py-2 pr-4">{formatearDecimal(fila.piezas_desvio)}</td>
                <td className="py-2 pr-4">{formatearDecimal(fila.tiempo_horno_ocupado_promedio)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
