import { RotateCcw } from 'lucide-react'
import TarjetaNOptimo from '../components/resultados/TarjetaNOptimo'
import ResumenParametros from '../components/resultados/ResumenParametros'
import GraficoUtilizacion from '../components/resultados/GraficoUtilizacion'
import GraficoProduccion from '../components/resultados/GraficoProduccion'
import TablaResultados from '../components/resultados/TablaResultados'
import PanelComputo from '../components/resultados/PanelComputo'
import Acordeon from '../components/ui/Acordeon'
import Boton from '../components/ui/Boton'
import type { SimulacionResponse } from '../types/simulacion'

interface ResultadosPageProps {
  resultado: SimulacionResponse
  onNuevaSimulacion: () => void
  onAmpliarRango: () => void
}

/**
 * Pantalla 3 (Frontend.md §7.1). Orden dictado por Dominio.md §13: la
 * conclusión primero, después qué se configuró, después los dos gráficos,
 * y el detalle (tabla completa + cómputo) plegado por defecto.
 */
export default function ResultadosPage({
  resultado,
  onNuevaSimulacion,
  onAmpliarRango,
}: ResultadosPageProps) {
  return (
    <div className="space-y-8">
      <TarjetaNOptimo resultado={resultado} onAmpliarRango={onAmpliarRango} />

      <ResumenParametros parametros={resultado.parametros} />

      <div className="space-y-6">
        <GraficoUtilizacion
          resultadosPorN={resultado.resultados_por_n}
          umbralUtilizacion={resultado.parametros.umbral_utilizacion}
          nOptimo={resultado.n_optimo}
        />
        <GraficoProduccion
          resultadosPorN={resultado.resultados_por_n}
          nOptimo={resultado.n_optimo}
        />
      </div>

      <div className="space-y-3">
        <Acordeon titulo="Ver tabla completa">
          <TablaResultados
            resultadosPorN={resultado.resultados_por_n}
            nOptimo={resultado.n_optimo}
          />
        </Acordeon>
        <Acordeon titulo="Ver estadísticas del programa">
          <PanelComputo estadisticas={resultado.estadisticas_computo} />
        </Acordeon>
      </div>

      <div className="flex justify-end">
        <Boton
          variante="secundario"
          onClick={onNuevaSimulacion}
          icono={<RotateCcw size={16} aria-hidden="true" />}
        >
          Nueva simulación
        </Boton>
      </div>
    </div>
  )
}
