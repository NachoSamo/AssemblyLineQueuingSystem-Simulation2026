import type { EstadoPieza, FilaVectorEstado } from '../../types/simulacion'
import {
  CELDA_VACIA,
  formatearOpcional,
  formatearReloj,
  formatearRnd,
} from '../../utils/formato'

interface TablaVectorEstadoProps {
  filas: FilaVectorEstado[]
  /** Cantidad de ensambladores: define cuántos bloques de columnas se dibujan. */
  n: number
  /** Piezas creadas en toda la jornada: define cuántas columnas de pieza hay. */
  totalPiezas: number
}

/**
 * Abreviaturas de los estados de pieza. Con ~60 columnas de pieza, escribir
 * "Ensamblándose" en cada celda haría la tabla ilegible; el nombre completo
 * queda en el `title` de la celda y en la referencia debajo de la tabla.
 */
const ABREVIATURA_PIEZA: Record<EstadoPieza, string> = {
  'Ensamblándose': 'Ens.',
  'En cola': 'Cola',
  'En cocción': 'Coc.',
  Terminada: 'Term.',
}

const COLOR_PIEZA: Record<EstadoPieza, string> = {
  'Ensamblándose': 'text-base-500',
  'En cola': 'text-amber-600',
  'En cocción': 'text-horno-600',
  Terminada: 'text-ok',
}

const CLASES_GRUPO =
  'border-b border-l border-base-200 px-2 py-1.5 text-center text-xs font-semibold uppercase tracking-wide text-base-600'
const CLASES_COLUMNA =
  'border-b border-base-200 px-2 py-1.5 text-center text-xs font-medium text-base-500'
const CLASES_CELDA = 'whitespace-nowrap px-2 py-1.5 text-right'

/**
 * El vector de estado del enunciado, con el encabezado de dos niveles de la
 * planilla `Ejercicio 135 Final Planteo.ods`.
 *
 * La planilla está trazada con N=1: para N>1 el bloque de ensamble se repite
 * por ensamblador, de modo que con N=1 esta tabla queda idéntica a la planilla.
 * Es ancha a propósito (con N=6 y 60 piezas son más de 90 columnas), así que se
 * desplaza en horizontal dentro de su contenedor.
 */
export default function TablaVectorEstado({
  filas,
  n,
  totalPiezas,
}: TablaVectorEstadoProps) {
  const ensambladores = Array.from({ length: n }, (_, i) => i)
  const piezas = Array.from({ length: totalPiezas }, (_, i) => i)

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-base-200">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-base-50">
            <tr>
              <th rowSpan={2} className={CLASES_GRUPO}>
                R
              </th>
              <th rowSpan={2} className={CLASES_GRUPO}>
                Iter.
              </th>
              <th rowSpan={2} className={`${CLASES_GRUPO} text-left`}>
                Evento
              </th>
              <th rowSpan={2} className={CLASES_GRUPO}>
                Reloj
              </th>
              {ensambladores.map((i) => (
                <th key={i} colSpan={4} className={CLASES_GRUPO}>
                  {/* Con N=1 el encabezado queda igual que en la planilla. */}
                  {n > 1 ? `Fin Ensamble ${i + 1}` : 'Fin Ensamble'}
                </th>
              ))}
              <th colSpan={3} className={CLASES_GRUPO}>
                Fin Cocción
              </th>
              <th colSpan={2} className={CLASES_GRUPO}>
                Horno
              </th>
              <th rowSpan={2} className={CLASES_GRUPO}>
                Contador
              </th>
              {totalPiezas > 0 && (
                <th colSpan={totalPiezas} className={CLASES_GRUPO}>
                  Piezas
                </th>
              )}
            </tr>
            <tr>
              {ensambladores.map((i) => [
                <th key={`rnd-${i}`} className={`${CLASES_COLUMNA} border-l`}>
                  RND
                </th>,
                <th key={`tpo-${i}`} className={CLASES_COLUMNA}>
                  tpo
                </th>,
                <th key={`fin-${i}`} className={CLASES_COLUMNA}>
                  min fin ens.
                </th>,
                <th key={`est-${i}`} className={CLASES_COLUMNA}>
                  Estado
                </th>,
              ])}
              <th className={`${CLASES_COLUMNA} border-l`}>RND</th>
              <th className={CLASES_COLUMNA}>tpo</th>
              <th className={CLASES_COLUMNA}>min fin cocc.</th>
              <th className={`${CLASES_COLUMNA} border-l`}>Estado</th>
              <th className={CLASES_COLUMNA}>Cola</th>
              {piezas.map((i) => (
                <th key={i} className={`${CLASES_COLUMNA} ${i === 0 ? 'border-l' : ''}`}>
                  {i + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="font-mono tabular-nums text-base-700">
            {filas.map((fila) => (
              <tr key={`${fila.replica}-${fila.iteracion}`} className="border-b border-base-100">
                <td className={`${CLASES_CELDA} text-center font-semibold text-base-500`}>
                  {fila.replica}
                </td>
                <td className={`${CLASES_CELDA} text-center text-base-500`}>
                  {fila.iteracion}
                </td>
                <td className={`${CLASES_CELDA} text-left font-sans font-medium text-base-800`}>
                  {fila.evento}
                </td>
                <td className={CLASES_CELDA}>{formatearReloj(fila.reloj)}</td>

                {fila.ensambladores.map((columna, i) => [
                  <td key={`rnd-${i}`} className={`${CLASES_CELDA} border-l border-base-100`}>
                    {formatearOpcional(columna.rnd, formatearRnd)}
                  </td>,
                  <td key={`tpo-${i}`} className={CLASES_CELDA}>
                    {formatearOpcional(columna.tiempo, formatearReloj)}
                  </td>,
                  <td key={`fin-${i}`} className={CLASES_CELDA}>
                    {formatearOpcional(columna.fin_ensamble, formatearReloj)}
                  </td>,
                  <td key={`est-${i}`} className={`${CLASES_CELDA} font-sans text-center`}>
                    {columna.estado}
                  </td>,
                ])}

                <td className={`${CLASES_CELDA} border-l border-base-100`}>
                  {formatearOpcional(fila.rnd_coccion, formatearRnd)}
                </td>
                <td className={CLASES_CELDA}>
                  {formatearOpcional(fila.tiempo_coccion, formatearReloj)}
                </td>
                <td className={CLASES_CELDA}>
                  {formatearOpcional(fila.fin_coccion, formatearReloj)}
                </td>

                <td
                  className={`${CLASES_CELDA} border-l border-base-100 text-center font-sans ${
                    fila.horno_estado === 'Ocupado' ? 'text-horno-600' : 'text-base-500'
                  }`}
                >
                  {fila.horno_estado}
                </td>
                <td className={`${CLASES_CELDA} text-center`}>{fila.cola}</td>

                <td className={`${CLASES_CELDA} text-center font-semibold`}>
                  {fila.piezas_terminadas}
                </td>

                {piezas.map((i) => {
                  const estado = fila.piezas[i]
                  return (
                    <td
                      key={i}
                      title={estado ?? 'La pieza todavía no existe en este momento'}
                      className={`${CLASES_CELDA} text-center font-sans text-xs ${
                        i === 0 ? 'border-l border-base-100' : ''
                      } ${estado ? COLOR_PIEZA[estado] : 'text-base-300'}`}
                    >
                      {estado ? ABREVIATURA_PIEZA[estado] : CELDA_VACIA}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-base-500">
        <span className="font-medium text-base-600">Estado de las piezas:</span>
        <span className={COLOR_PIEZA['Ensamblándose']}>Ens. = Ensamblándose</span>
        <span className={COLOR_PIEZA['En cola']}>Cola = En cola</span>
        <span className={COLOR_PIEZA['En cocción']}>Coc. = En cocción</span>
        <span className={COLOR_PIEZA.Terminada}>Term. = Terminada</span>
        <span className="text-base-300">{CELDA_VACIA} = todavía no existe</span>
      </div>
    </div>
  )
}
