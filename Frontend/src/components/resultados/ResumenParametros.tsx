import Tag from '../ui/Tag'
import type { ParametrosSimulacion } from '../../types/simulacion'
import { NOMBRE_CRITERIO } from '../../utils/constantesDominio'
import { formatearEntero, formatearPiezas, formatearPorcentaje } from '../../utils/formato'

interface ResumenParametrosProps {
  parametros: ParametrosSimulacion
}

/**
 * Qué se configuró (Dominio.md §13.1): tags descriptivos, no números
 * sueltos. El usuario tiene que poder identificar de un vistazo qué
 * configuración generó lo que está viendo.
 */
export default function ResumenParametros({ parametros }: ResumenParametrosProps) {
  return (
    <div className="flex flex-wrap gap-2" aria-label="Parámetros de la corrida">
      <Tag tono="acento">
        Rango explorado: N={parametros.n_minimo} a N={parametros.n_maximo}
      </Tag>
      <Tag>Réplicas por N: {formatearEntero(parametros.replicas)}</Tag>
      <Tag tono="acento">Criterio: {NOMBRE_CRITERIO[parametros.criterio]}</Tag>
      {/* Solo se muestra el parámetro del criterio que efectivamente se usó: los
          otros viajan en la respuesta pero no influyeron en el resultado. */}
      {parametros.criterio === 'maxima_produccion' && (
        <Tag>Ganancia mínima: {formatearPiezas(parametros.ganancia_minima)} pzas</Tag>
      )}
      {parametros.criterio === 'umbral_manual' && (
        <Tag>Umbral de saturación: {formatearPorcentaje(parametros.umbral_utilizacion, 0)}</Tag>
      )}
      <Tag>Jornada: {formatearEntero(parametros.duracion_jornada)} min</Tag>
      <Tag>Semilla: {parametros.semilla}</Tag>
    </div>
  )
}
