import { useCallback, useState } from 'react'
import ConfiguracionPage from './pages/ConfiguracionPage'
import SimulandoPage from './pages/SimulandoPage'
import ResultadosPage from './pages/ResultadosPage'
import { useSimulacion } from './hooks/useSimulacion'
import type { ParametrosFormulario } from './types/formulario'
import { PARAMETROS_FORMULARIO_POR_DEFECTO } from './types/formulario'

type Pantalla = 'configuracion' | 'simulando' | 'resultados'

/**
 * Máquina de estados de la corrida (Frontend.md §4). Sin react-router: es
 * un flujo lineal de tres pantallas. El estado vive acá y baja por props,
 * sin librería de estado global.
 *
 * configuracion -> simulando -> resultados
 *                      |
 *                      v
 *                  (error) -> configuracion, con el mensaje sobre el formulario
 */
function App() {
  const [pantalla, setPantalla] = useState<Pantalla>('configuracion')
  const [parametros, setParametros] = useState<ParametrosFormulario>(
    PARAMETROS_FORMULARIO_POR_DEFECTO,
  )
  const { resultado, error, ejecutar, cancelar, reiniciar } = useSimulacion()

  const datosListos = resultado !== null || error !== null

  const manejarIniciar = useCallback(
    (nuevosParametros: ParametrosFormulario) => {
      setParametros(nuevosParametros)
      ejecutar(nuevosParametros)
      setPantalla('simulando')
    },
    [ejecutar],
  )

  const manejarListo = useCallback(() => {
    // Si vino un error, se vuelve a la pantalla 1 (ahí se muestra, sobre
    // el formulario, para poder corregir y reintentar sin perder lo
    // escrito). Si no, ya hay resultado y se avanza a la pantalla 3.
    setPantalla((actual) => {
      if (actual !== 'simulando') return actual
      return error ? 'configuracion' : 'resultados'
    })
  }, [error])

  const manejarCancelar = useCallback(() => {
    cancelar()
    setPantalla('configuracion')
  }, [cancelar])

  const manejarNuevaSimulacion = useCallback(() => {
    reiniciar()
    setPantalla('configuracion')
  }, [reiniciar])

  const manejarAmpliarRango = useCallback(() => {
    setParametros((p) => ({ ...p, nMaximo: p.nMaximo + 2 }))
    reiniciar()
    setPantalla('configuracion')
  }, [reiniciar])

  return (
    <div className="min-h-screen bg-base-50">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        {pantalla === 'configuracion' && (
          <ConfiguracionPage
            valoresIniciales={parametros}
            datosFijosPrevios={resultado?.parametros ?? null}
            error={error}
            onIniciar={manejarIniciar}
          />
        )}
        {pantalla === 'simulando' && (
          <SimulandoPage
            parametros={parametros}
            datosListos={datosListos}
            onListo={manejarListo}
            onCancelar={manejarCancelar}
          />
        )}
        {pantalla === 'resultados' && resultado && (
          <ResultadosPage
            resultado={resultado}
            onNuevaSimulacion={manejarNuevaSimulacion}
            onAmpliarRango={manejarAmpliarRango}
          />
        )}
      </div>
    </div>
  )
}

export default App
