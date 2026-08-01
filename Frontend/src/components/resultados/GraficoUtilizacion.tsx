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
import type { CriterioNOptimo, ResultadoPorN } from '../../types/simulacion'
import { TECHO_UTILIZACION } from '../../utils/constantesDominio'
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
  criterio: CriterioNOptimo
}

interface PuntoUtilizacion {
  n: number
  utilizacionPorcentaje: number
}

/**
 * Qué papel juega este gráfico según el criterio: con umbral manual es el que
 * decide; con máxima producción explica por qué la producción se aplana.
 */
const SUBTITULO: Record<CriterioNOptimo, string> = {
  maxima_produccion:
    'Explica por qué la producción se aplana: a partir del N óptimo, el horno ya no tiene tiempo libre.',
  capacidad_horno:
    'Es el gráfico que define el N óptimo: se busca dónde la curva llega al techo del sistema.',
  umbral_manual:
    'Es el gráfico que define el N óptimo: se busca dónde la curva se aplana cerca del umbral.',
}

/**
 * Gráfico 2 (Dominio.md §10.2). Va después del de producción, que es la
 * magnitud que el enunciado pide maximizar. Un único eje Y — nunca combinado
 * con el de producción (Dominio.md §13.2 lo desaconseja explícitamente).
 */
export default function GraficoUtilizacion({
  resultadosPorN,
  umbralUtilizacion,
  nOptimo,
  criterio,
}: GraficoUtilizacionProps) {
  const datos: PuntoUtilizacion[] = resultadosPorN.map((r) => ({
    n: r.n,
    utilizacionPorcentaje: r.utilizacion_promedio * 100,
  }))
  const puntoOptimo = nOptimo !== null ? datos.find((d) => d.n === nOptimo) : undefined

  // La línea de referencia tiene que ser la que el criterio realmente usó.
  // Dibujar "Umbral 94 %" en una corrida por máxima producción daría a entender
  // que ese número decidió algo, y no fue así.
  const referencia =
    criterio === 'umbral_manual'
      ? { valor: umbralUtilizacion, etiqueta: `Umbral ${formatearPorcentaje(umbralUtilizacion, 0)}` }
      : { valor: TECHO_UTILIZACION, etiqueta: `Techo del sistema ${formatearPorcentaje(TECHO_UTILIZACION)}` }

  return (
    <Tarjeta>
      <h3 className="text-lg font-semibold text-base-900">Utilización del horno</h3>
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
              y={referencia.valor * 100}
              stroke={COLOR_REFERENCIA}
              strokeDasharray="5 5"
              label={{
                value: referencia.etiqueta,
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
