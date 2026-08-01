import { ChevronLeft, ChevronRight } from 'lucide-react'
import Boton from '../ui/Boton'
import { formatearEntero } from '../../utils/formato'

interface ControlesPaginacionProps {
  desde: number
  hasta: number
  total: number
  pagina: number
  totalPaginas: number
  hayAnterior: boolean
  haySiguiente: boolean
  onAnterior: () => void
  onSiguiente: () => void
}

/**
 * Anterior / Siguiente sobre la tabla del vector de estado. No conoce las filas:
 * recibe solo números, así que sirve para paginar cualquier cosa.
 */
export default function ControlesPaginacion({
  desde,
  hasta,
  total,
  pagina,
  totalPaginas,
  hayAnterior,
  haySiguiente,
  onAnterior,
  onSiguiente,
}: ControlesPaginacionProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Boton
        variante="secundario"
        onClick={onAnterior}
        disabled={!hayAnterior}
        icono={<ChevronLeft size={16} aria-hidden="true" />}
      >
        Anterior
      </Boton>

      <p className="text-sm text-base-600" aria-live="polite">
        Filas <strong>{formatearEntero(desde)}</strong>–
        <strong>{formatearEntero(hasta)}</strong> de{' '}
        <strong>{formatearEntero(total)}</strong>
        <span className="ml-2 text-base-400">
          (página {formatearEntero(pagina)} de {formatearEntero(totalPaginas)})
        </span>
      </p>

      <Boton
        variante="secundario"
        onClick={onSiguiente}
        disabled={!haySiguiente}
        icono={<ChevronRight size={16} aria-hidden="true" />}
      >
        Siguiente
      </Boton>
    </div>
  )
}
