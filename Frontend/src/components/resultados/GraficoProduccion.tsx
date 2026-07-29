import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import Tarjeta from '../ui/Tarjeta'
import type { ResultadoPorN } from '../../types/simulacion'
import { COLOR_EJE, COLOR_PRODUCCION, COLOR_REJILLA } from '../../theme/coloresGraficos'

interface GraficoProduccionProps {
  resultadosPorN: ResultadoPorN[]
  nOptimo: number | null
}

interface PuntoProduccion {
  n: number
  piezasPromedio: number
}

/**
 * Gráfico 2 (Dominio.md §10.2): verificación visual. Debería aplanarse en
 * el mismo N que el gráfico de utilización (Dominio.md §10.1). Un único
 * eje Y, separado del gráfico anterior — nunca combinados con doble eje.
 */
export default function GraficoProduccion({ resultadosPorN, nOptimo }: GraficoProduccionProps) {
  const datos: PuntoProduccion[] = resultadosPorN.map((r) => ({
    n: r.n,
    piezasPromedio: r.piezas_promedio,
  }))
  const puntoOptimo = nOptimo !== null ? datos.find((d) => d.n === nOptimo) : undefined

  return (
    <Tarjeta>
      <h3 className="text-lg font-semibold text-base-900">Piezas terminadas</h3>
      <p className="mt-1 text-sm text-base-500">
        Verificación: debería aplanarse en el mismo N que el gráfico anterior.
      </p>
      <div className="mt-4 h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={datos} margin={{ top: 24, right: 36, left: 4, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLOR_REJILLA} />
            <XAxis
              dataKey="n"
              type="number"
              domain={['dataMin', 'dataMax']}
              allowDecimals={false}
              tick={{ fontSize: 12, fill: COLOR_EJE }}
              stroke={COLOR_EJE}
              label={{
                value: 'N (ensambladores)',
                position: 'insideBottom',
                offset: -12,
                fontSize: 12,
                fill: COLOR_EJE,
              }}
            />
            <YAxis
              domain={[0, (max: number) => Math.ceil(max * 1.1)]}
              tick={{ fontSize: 12, fill: COLOR_EJE }}
              stroke={COLOR_EJE}
              label={{
                value: 'Piezas terminadas (promedio)',
                angle: -90,
                position: 'insideLeft',
                fontSize: 12,
                fill: COLOR_EJE,
              }}
            />
            <Tooltip
              formatter={(valor) => [Number(valor).toFixed(1), 'Piezas']}
              labelFormatter={(etiqueta) => `N = ${etiqueta}`}
            />
            <Line
              type="monotone"
              dataKey="piezasPromedio"
              name="Piezas terminadas"
              stroke={COLOR_PRODUCCION}
              strokeWidth={2}
              dot={{ r: 4, fill: COLOR_PRODUCCION, strokeWidth: 0 }}
              activeDot={{ r: 6 }}
              isAnimationActive={false}
            />
            {puntoOptimo && (
              <ReferenceDot
                x={puntoOptimo.n}
                y={puntoOptimo.piezasPromedio}
                r={7}
                fill={COLOR_PRODUCCION}
                stroke="#ffffff"
                strokeWidth={2}
                label={{
                  value: `N óptimo = ${puntoOptimo.n}`,
                  position: 'top',
                  fontSize: 12,
                  fill: COLOR_PRODUCCION,
                  fontWeight: 600,
                }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Tarjeta>
  )
}
