import Tag from '../ui/Tag'
import type { ParametrosSimulacion } from '../../types/simulacion'
import { formatearEntero, formatearPorcentaje } from '../../utils/formato'

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
      <Tag>Umbral de saturación: {formatearPorcentaje(parametros.umbral_utilizacion, 0)}</Tag>
      <Tag>Jornada: {formatearEntero(parametros.duracion_jornada)} min</Tag>
      <Tag>Semilla: {parametros.semilla}</Tag>
    </div>
  )
}
