import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import Tarjeta from '../ui/Tarjeta'
import type { ResultadoPorN } from '../../types/simulacion'
import { formatearPorcentaje } from '../../utils/formato'
import {
  COLOR_REFERENCIA,
  COLOR_REJILLA,
  COLOR_EJE,
  COLOR_UTILIZACION,
  COLOR_UTILIZACION_MARCA,
} from '../../theme/coloresGraficos'

interface GraficoUtilizacionProps {
  resultadosPorN: ResultadoPorN[]
  umbralUtilizacion: number
  nOptimo: number | null
}

interface PuntoUtilizacion {
  n: number
  utilizacionPorcentaje: number
}

/**
 * Gráfico 1 (Dominio.md §10.2): el que se usa formalmente para decidir el
 * N óptimo. Un único eje Y — nunca combinado con el de producción
 * (Dominio.md §13.2 lo desaconseja explícitamente).
 */
export default function GraficoUtilizacion({
  resultadosPorN,
  umbralUtilizacion,
  nOptimo,
}: GraficoUtilizacionProps) {
  const datos: PuntoUtilizacion[] = resultadosPorN.map((r) => ({
    n: r.n,
    utilizacionPorcentaje: r.utilizacion_promedio * 100,
  }))
  const umbralPorcentaje = umbralUtilizacion * 100
  const puntoOptimo = nOptimo !== null ? datos.find((d) => d.n === nOptimo) : undefined

  return (
    <Tarjeta>
      <h3 className="text-lg font-semibold text-base-900">Utilización del horno</h3>
      <p className="mt-1 text-sm text-base-500">
        Es el gráfico que define el N óptimo: se busca dónde la curva se aplana cerca
        del umbral.
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
              domain={[0, 100]}
              tickFormatter={(valor: number) => `${valor}`}
              tick={{ fontSize: 12, fill: COLOR_EJE }}
              stroke={COLOR_EJE}
              label={{
                value: 'Utilización del horno (%)',
                angle: -90,
                position: 'insideLeft',
                fontSize: 12,
                fill: COLOR_EJE,
              }}
            />
            <Tooltip
              formatter={(valor) => [`${Number(valor).toFixed(1)} %`, 'Utilización']}
              labelFormatter={(etiqueta) => `N = ${etiqueta}`}
            />
            <ReferenceLine
              y={umbralPorcentaje}
              stroke={COLOR_REFERENCIA}
              strokeDasharray="5 5"
              label={{
                value: `Umbral ${formatearPorcentaje(umbralUtilizacion, 0)}`,
                position: 'insideTopRight',
                fontSize: 11,
                fill: COLOR_REFERENCIA,
              }}
            />
            <Line
              type="monotone"
              dataKey="utilizacionPorcentaje"
              name="Utilización"
              stroke={COLOR_UTILIZACION}
              strokeWidth={2}
              dot={{ r: 4, fill: COLOR_UTILIZACION, strokeWidth: 0 }}
              activeDot={{ r: 6 }}
              isAnimationActive={false}
            />
            {puntoOptimo && (
              <ReferenceDot
                x={puntoOptimo.n}
                y={puntoOptimo.utilizacionPorcentaje}
                r={7}
                fill={COLOR_UTILIZACION_MARCA}
                stroke="#ffffff"
                strokeWidth={2}
                label={{
                  value: `N óptimo = ${puntoOptimo.n}`,
                  position: 'top',
                  fontSize: 12,
                  fill: COLOR_UTILIZACION_MARCA,
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
