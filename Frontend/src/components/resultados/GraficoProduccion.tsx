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
import type { CriterioNOptimo, ResultadoPorN } from '../../types/simulacion'
import { COLOR_EJE, COLOR_PRODUCCION, COLOR_REJILLA } from '../../theme/coloresGraficos'

interface GraficoProduccionProps {
  resultadosPorN: ResultadoPorN[]
  nOptimo: number | null
  criterio: CriterioNOptimo
}

/**
 * El subtítulo dice qué papel juega este gráfico, y eso depende del criterio:
 * con máxima producción es el que decide; con los otros dos, la verificación de
 * que la producción se aplana donde el horno se satura (Dominio.md §10.1).
 */
const SUBTITULO: Record<CriterioNOptimo, string> = {
  maxima_produccion:
    'Es el gráfico que define el N óptimo: se busca dónde la curva deja de subir.',
  capacidad_horno:
    'Verificación: la producción debería aplanarse en el mismo N en que se satura el horno.',
  umbral_manual:
    'Verificación: la producción debería aplanarse en el mismo N en que se satura el horno.',
}

interface PuntoProduccion {
  n: number
  piezasPromedio: number
}

/**
 * Gráfico 1 (Dominio.md §10.2): la producción de piezas, que es la magnitud
 * que el enunciado pide maximizar (§2). Va primero por eso. Un único eje Y,
 * separado del otro gráfico — nunca combinados con doble eje.
 */
export default function GraficoProduccion({
  resultadosPorN,
  nOptimo,
  criterio,
}: GraficoProduccionProps) {
  const datos: PuntoProduccion[] = resultadosPorN.map((r) => ({
    n: r.n,
    piezasPromedio: r.piezas_promedio,
  }))
  const puntoOptimo = nOptimo !== null ? datos.find((d) => d.n === nOptimo) : undefined

  return (
    <Tarjeta>
      <h3 className="text-lg font-semibold text-base-900">Piezas terminadas</h3>
      <p className="mt-1 text-sm text-base-500">{SUBTITULO[criterio]}</p>
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
