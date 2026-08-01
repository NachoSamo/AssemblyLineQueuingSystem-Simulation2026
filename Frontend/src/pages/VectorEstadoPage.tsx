import { useState } from 'react'
import { ArrowLeft, Loader2 } from 'lucide-react'
import SelectorNyReplica from '../components/vectorEstado/SelectorNyReplica'
import TablaVectorEstado from '../components/vectorEstado/TablaVectorEstado'
import ControlesPaginacion from '../components/vectorEstado/ControlesPaginacion'
import Boton from '../components/ui/Boton'
import Tarjeta from '../components/ui/Tarjeta'
import { useVectorEstado } from '../hooks/useVectorEstado'
import { usePaginacion, FILAS_POR_PAGINA } from '../hooks/usePaginacion'
import { formatearEntero } from '../utils/formato'
import type { FilaVectorEstado, SimulacionResponse } from '../types/simulacion'

interface VectorEstadoPageProps {
  resultado: SimulacionResponse
  onVolver: () => void
}

/** Evita que `usePaginacion` reciba un arreglo nuevo en cada render cuando no hay datos. */
const SIN_FILAS: FilaVectorEstado[] = []

/**
 * Pantalla 4 (Frontend.md §8). Muestra el vector de estado de UNA jornada
 * simulada, fila por evento, para poder responder preguntas sobre líneas
 * puntuales de la corrida.
 *
 * No se entra directo: se llega desde Resultados, porque hace falta una corrida
 * ya ejecutada (de ahí salen la semilla y el rango que identifican la réplica).
 */
export default function VectorEstadoPage({
  resultado,
  onVolver,
}: VectorEstadoPageProps) {
  const { parametros } = resultado

  // Arranca en el N óptimo, que es la configuración de la que probablemente se
  // quiera hablar; si ningún N alcanzó el umbral, en el primero del rango.
  const [n, setN] = useState(resultado.n_optimo ?? parametros.n_minimo)
  const [replica, setReplica] = useState(1)

  const { vector, cargando, error } = useVectorEstado(parametros, n, replica)
  const paginacion = usePaginacion(vector?.filas ?? SIN_FILAS, FILAS_POR_PAGINA)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-base-900">Vector de estado</h1>
          <p className="mt-1 max-w-2xl text-sm text-base-600">
            Cada fila es un evento de la simulación, en orden cronológico: la
            inicialización, cada Fin Ensamble y cada Fin Cocción, y el corte de la
            jornada en el minuto {formatearEntero(parametros.duracion_jornada)}. Es la
            misma tabla que se traza a mano en la planilla del ejercicio.
          </p>
        </div>
        <Boton
          variante="secundario"
          onClick={onVolver}
          icono={<ArrowLeft size={16} aria-hidden="true" />}
        >
          Volver a los resultados
        </Boton>
      </div>

      <Tarjeta>
        <SelectorNyReplica
          nMinimo={parametros.n_minimo}
          nMaximo={parametros.n_maximo}
          replicas={parametros.replicas}
          n={n}
          replica={replica}
          onCambiarN={setN}
          onCambiarReplica={setReplica}
          nOptimo={resultado.n_optimo}
          disabled={cargando}
        />
        <p className="mt-4 border-t border-base-200 pt-3 text-xs text-base-500">
          La jornada se reconstruye a partir de la semilla{' '}
          <span className="font-mono">{parametros.semilla}</span>, así que estas filas
          son exactamente las que produjeron los promedios de la pantalla anterior.
        </p>
      </Tarjeta>

      {error && (
        <div className="rounded-xl border border-alerta bg-red-50 px-5 py-4 text-sm text-alerta">
          {error.mensaje}
        </div>
      )}

      {cargando && !error && (
        <div className="flex items-center justify-center gap-3 rounded-xl border border-base-200 bg-white py-16 text-sm text-base-500">
          <Loader2 size={18} className="animate-spin" aria-hidden="true" />
          Reconstruyendo la jornada…
        </div>
      )}

      {!cargando && !error && vector && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm text-base-600">
            <span>
              Jornada con <strong>{vector.n}</strong>{' '}
              {vector.n === 1 ? 'ensamblador' : 'ensambladores'}, réplica{' '}
              <strong>{vector.replica}</strong> de {vector.total_replicas}
            </span>
            <span className="text-base-400">
              {formatearEntero(vector.total_filas)} eventos ·{' '}
              {formatearEntero(vector.total_piezas)} piezas creadas
            </span>
          </div>

          <TablaVectorEstado
            filas={paginacion.elementos}
            n={vector.n}
            totalPiezas={vector.total_piezas}
          />

          <ControlesPaginacion
            desde={paginacion.desde}
            hasta={paginacion.hasta}
            total={paginacion.total}
            pagina={paginacion.pagina}
            totalPaginas={paginacion.totalPaginas}
            hayAnterior={paginacion.hayAnterior}
            haySiguiente={paginacion.haySiguiente}
            onAnterior={paginacion.anterior}
            onSiguiente={paginacion.siguiente}
          />
        </div>
      )}
    </div>
  )
}
