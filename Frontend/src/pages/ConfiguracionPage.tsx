import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { AlertCircle, Play } from 'lucide-react'
import Tarjeta from '../components/ui/Tarjeta'
import CampoNumerico from '../components/ui/CampoNumerico'
import CampoRadio from '../components/ui/CampoRadio'
import Boton from '../components/ui/Boton'
import FichaDistribucion from '../components/configuracion/FichaDistribucion'
import type { ParametrosFormulario } from '../types/formulario'
import type { CriterioNOptimo, ErrorApi, ParametrosSimulacion } from '../types/simulacion'
import { CRITERIOS, DATOS_FIJOS_POR_DEFECTO } from '../utils/constantesDominio'

interface ConfiguracionPageProps {
  valoresIniciales: ParametrosFormulario
  /** Datos fijos de la última corrida, si existe; si no, constantes propias. */
  datosFijosPrevios: Pick<
    ParametrosSimulacion,
    'duracion_jornada' | 'tiempo_ensamble' | 'tiempo_coccion'
  > | null
  error: ErrorApi | null
  onIniciar: (parametros: ParametrosFormulario) => void
}

/**
 * Estado del formulario. La semilla es `number | null` porque es opcional;
 * el resto son números y react-hook-form los convierte con `valueAsNumber`.
 */
interface CamposFormulario {
  nMinimo: number
  nMaximo: number
  replicas: number
  criterio: CriterioNOptimo
  gananciaMinima: number
  umbralUtilizacionPorcentaje: number
  /** `undefined` cuando está vacío: es opcional y el backend genera una si no viaja. */
  semilla?: number
}

/** Un campo numérico vacío llega como `NaN` con `valueAsNumber`. */
function esNumero(valor: unknown): valor is number {
  return typeof valor === 'number' && !Number.isNaN(valor)
}

function entero(valor: unknown, minimo: number): string | true {
  if (!esNumero(valor)) return 'Completá este campo con un número.'
  if (!Number.isInteger(valor)) return 'Tiene que ser un número entero.'
  if (valor < minimo) return `Tiene que ser mayor o igual a ${minimo}.`
  return true
}

/**
 * Pantalla 1: formulario de parámetros (Frontend.md §5).
 *
 * La validación es en vivo con react-hook-form en modo `onTouched`: no molesta
 * mientras se escribe por primera vez, pero una vez que un campo dio error se
 * revalida en cada tecla, así corregirlo limpia el mensaje al instante.
 *
 * La validación del backend sigue siendo la real: la de acá es solo para dar
 * respuesta inmediata, y los mensajes del servidor se muestran tal cual llegan.
 */
export default function ConfiguracionPage({
  valoresIniciales,
  datosFijosPrevios,
  error,
  onIniciar,
}: ConfiguracionPageProps) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<CamposFormulario>({
    mode: 'onTouched',
    defaultValues: {
      ...valoresIniciales,
      // `null` dejaría el input con el texto "null"; `undefined` lo deja vacío.
      semilla: valoresIniciales.semilla ?? undefined,
    },
  })

  // `useWatch` y no `watch`: devuelve el valor en vez de una función, así el
  // React Compiler puede memoizar el componente (la regla
  // react-hooks/incompatible-library avisa si se usa `watch`).
  const criterio = useWatch({ control, name: 'criterio' })
  const nMinimo = useWatch({ control, name: 'nMinimo' })

  // `nMaximo >= nMinimo` es una validación cruzada: si cambia el mínimo, el
  // error del máximo puede haber quedado obsoleto en cualquiera de los dos
  // sentidos, así que se vuelve a evaluar.
  useEffect(() => {
    if (getValues('nMaximo') !== undefined) {
      void trigger('nMaximo')
    }
  }, [nMinimo, trigger, getValues])

  const datosFijos = datosFijosPrevios ?? DATOS_FIJOS_POR_DEFECTO

  function enviar(campos: CamposFormulario) {
    onIniciar({
      nMinimo: campos.nMinimo,
      nMaximo: campos.nMaximo,
      replicas: campos.replicas,
      criterio: campos.criterio,
      gananciaMinima: campos.gananciaMinima,
      umbralUtilizacionPorcentaje: campos.umbralUtilizacionPorcentaje,
      semilla: esNumero(campos.semilla) ? campos.semilla : null,
    })
  }

  return (
    <form onSubmit={handleSubmit(enviar)} className="space-y-6" noValidate>
      <div>
        <h1 className="text-2xl font-bold text-base-900">
          Simulación: horno compartido por ensambladores
        </h1>
        <p className="mt-1 text-base-500">
          Configurá el rango de ensambladores a explorar y corré la simulación.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-alerta/30 bg-red-50 px-4 py-3 text-sm text-alerta"
        >
          <AlertCircle className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
          <span>{error.mensaje}</span>
        </div>
      )}

      <Tarjeta>
        <h2 className="text-base font-semibold text-base-900">Parámetros de la corrida</h2>
        <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <CampoNumerico
            id="n-minimo"
            etiqueta="N mínimo de ensambladores a simular"
            registro={register('nMinimo', {
              valueAsNumber: true,
              validate: (valor) => entero(valor, 1),
            })}
            min={1}
            ayuda="Cantidad mínima de ensambladores a simular."
            error={errors.nMinimo?.message}
          />
          <CampoNumerico
            id="n-maximo"
            etiqueta="N máximo de ensambladores a simular"
            registro={register('nMaximo', {
              valueAsNumber: true,
              validate: (valor) => {
                const base = entero(valor, 1)
                if (base !== true) return base
                const minimo = getValues('nMinimo')
                if (esNumero(minimo) && valor < minimo) {
                  return 'Tiene que ser mayor o igual a N mínimo.'
                }
                return true
              },
            })}
            min={1}
            ayuda="Cantidad máxima de ensambladores a simular. Conviene que supere al óptimo esperado: el criterio de máxima producción compara cada N con el siguiente, así que el último del rango no se puede evaluar."
            error={errors.nMaximo?.message}
          />
          <CampoNumerico
            id="replicas"
            etiqueta="Cantidad de filas por N (R)"
            registro={register('replicas', {
              valueAsNumber: true,
              validate: (valor) => entero(valor, 1),
            })}
            min={1}
            ayuda="Cuántas filas/jornadas de 8 horas se simulan para cada N. Como los tiempos son al azar, un solo día puede dar un resultado atípico; por eso se promedian R días. Más réplicas = resultado más confiable."
            error={errors.replicas?.message}
          />
          <CampoNumerico
            id="semilla"
            etiqueta="Semilla"
            registro={register('semilla', { valueAsNumber: true })}
            opcional
            ayuda="Repetir la misma semilla devuelve exactamente los mismos resultados. Útil para volver a mostrar una corrida en la defensa. Si la dejás vacía, se usa una al azar."
            error={errors.semilla?.message}
          />
        </div>
      </Tarjeta>

      <Tarjeta>
        <h2 className="text-base font-semibold text-base-900">
          Criterio para elegir el N óptimo
        </h2>
        <div className="mt-4">
          <CampoRadio
            nombre="criterio"
            leyenda="Criterio"
            opciones={CRITERIOS}
            valor={criterio}
            onCambiar={(valor) => setValue('criterio', valor, { shouldValidate: true })}
            detalle={(valor) =>
              valor === 'maxima_produccion' ? (
                <div className="max-w-xs">
                  <CampoNumerico
                    id="ganancia-minima"
                    etiqueta="Ganancia mínima"
                    registro={register('gananciaMinima', {
                      valueAsNumber: true,
                      validate: (v) =>
                        !esNumero(v)
                          ? 'Completá este campo con un número.'
                          : v <= 0
                            ? 'Tiene que ser mayor que 0.'
                            : true,
                    })}
                    min={0.1}
                    paso={0.1}
                    sufijo="pzas"
                    ayuda="Cuántas piezas más por jornada tiene que aportar el ensamblador siguiente para que valga la pena sumarlo. Por debajo de eso se considera que la producción se aplanó."
                    error={errors.gananciaMinima?.message}
                  />
                </div>
              ) : valor === 'umbral_manual' ? (
                <div className="max-w-xs">
                  <CampoNumerico
                    id="umbral"
                    etiqueta="Umbral de utilización"
                    registro={register('umbralUtilizacionPorcentaje', {
                      valueAsNumber: true,
                      validate: (v) =>
                        !esNumero(v)
                          ? 'Completá este campo con un número.'
                          : v < 1 || v > 100
                            ? 'Tiene que estar entre 1 y 100.'
                            : true,
                    })}
                    min={1}
                    max={100}
                    sufijo="%"
                    ayuda="A partir de qué nivel de uso se considera que el horno está saturado. Por defecto 94 %, que es prácticamente el máximo que este sistema puede alcanzar: por encima de 94,8 % ningún N califica nunca."
                    error={errors.umbralUtilizacionPorcentaje?.message}
                  />
                </div>
              ) : null
            }
          />
        </div>
      </Tarjeta>

      <Tarjeta className="border-dashed bg-base-50">
        <h2 className="text-base font-semibold text-base-900">Datos fijos del enunciado</h2>
        <p className="mt-1 text-sm text-base-500">
          No son configurables: son parte del problema, y en particular los{' '}
          {datosFijos.duracion_jornada} minutos de jornada son la condición que hace
          comparables los resultados entre distintos N.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-base-200 bg-white px-4 py-3">
            <p className="text-sm font-semibold text-base-900">Duración de la jornada</p>
            <p className="mt-1 font-mono text-sm text-horno-600">
              {datosFijos.duracion_jornada} minutos
            </p>
            <p className="mt-0.5 font-mono text-xs text-base-500">Constante (8 horas)</p>
            <p className="mt-3 text-xs text-base-600">
              No es aleatoria: todas las jornadas duran exactamente lo mismo, para cualquier N.
            </p>
          </div>
          <FichaDistribucion titulo="Tiempo de ensamble" rango={datosFijos.tiempo_ensamble} />
          <FichaDistribucion titulo="Tiempo de cocción" rango={datosFijos.tiempo_coccion} />
        </div>
        <p className="mt-3 text-xs text-base-500">
          RND es un número al azar entre 0 y 1. La fórmula{' '}
          <span className="font-mono">X = a + RND × (b − a)</span> lo convierte en un tiempo
          dentro del intervalo.
        </p>
      </Tarjeta>

      <div className="flex justify-end">
        {/* No se deshabilita con `isValid`: si por cualquier motivo la validación
            no corriera, el formulario quedaría trabado sin explicación.
            `handleSubmit` ya bloquea el envío y marca los campos con error. */}
        <Boton tipo="submit" icono={<Play size={16} aria-hidden="true" />}>
          Iniciar simulación
        </Boton>
      </div>
    </form>
  )
}
