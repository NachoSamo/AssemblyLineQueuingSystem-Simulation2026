import { useState } from 'react'
import type { FormEvent } from 'react'
import { AlertCircle, Play } from 'lucide-react'
import Tarjeta from '../components/ui/Tarjeta'
import CampoNumerico from '../components/ui/CampoNumerico'
import Boton from '../components/ui/Boton'
import type { ParametrosFormulario } from '../types/formulario'
import type { ErrorApi, ParametrosSimulacion } from '../types/simulacion'
import { DATOS_FIJOS_POR_DEFECTO } from '../utils/constantesDominio'

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

/** Estado local del formulario: cada número puede estar vacío mientras se edita. */
interface EstadoFormulario {
  nMinimo: number | ''
  nMaximo: number | ''
  replicas: number | ''
  umbralUtilizacionPorcentaje: number | ''
  semilla: number | ''
}

type Errores = Partial<Record<keyof EstadoFormulario, string>>

function aEstadoFormulario(valores: ParametrosFormulario): EstadoFormulario {
  return {
    nMinimo: valores.nMinimo,
    nMaximo: valores.nMaximo,
    replicas: valores.replicas,
    umbralUtilizacionPorcentaje: valores.umbralUtilizacionPorcentaje,
    semilla: valores.semilla ?? '',
  }
}

function validar(form: EstadoFormulario): Errores {
  const errores: Errores = {}

  if (form.nMinimo === '' || form.nMinimo < 1) {
    errores.nMinimo = 'Tiene que ser un entero mayor o igual a 1.'
  }
  if (form.nMaximo === '' || form.nMinimo === '' || form.nMaximo < form.nMinimo) {
    errores.nMaximo = 'Tiene que ser mayor o igual a N mínimo.'
  }
  if (form.replicas === '' || form.replicas < 1) {
    errores.replicas = 'Tiene que ser un entero mayor o igual a 1.'
  }
  if (
    form.umbralUtilizacionPorcentaje === '' ||
    form.umbralUtilizacionPorcentaje < 1 ||
    form.umbralUtilizacionPorcentaje > 100
  ) {
    errores.umbralUtilizacionPorcentaje = 'Tiene que estar entre 1 y 100.'
  }
  if (form.semilla !== '' && !Number.isInteger(form.semilla)) {
    errores.semilla = 'Tiene que ser un número entero.'
  }

  return errores
}

/** Solo se llama cuando `validar` no encontró errores: todos los campos numéricos ya están completos. */
function aParametrosFormulario(form: EstadoFormulario): ParametrosFormulario | null {
  if (
    form.nMinimo === '' ||
    form.nMaximo === '' ||
    form.replicas === '' ||
    form.umbralUtilizacionPorcentaje === ''
  ) {
    return null
  }
  return {
    nMinimo: form.nMinimo,
    nMaximo: form.nMaximo,
    replicas: form.replicas,
    umbralUtilizacionPorcentaje: form.umbralUtilizacionPorcentaje,
    semilla: form.semilla === '' ? null : form.semilla,
  }
}

/**
 * Pantalla 1: formulario de parámetros (Frontend.md §5). La validación de
 * acá es solo para respuesta inmediata; la validación real es la del
 * backend, y sus mensajes se muestran tal cual llegan.
 */
export default function ConfiguracionPage({
  valoresIniciales,
  datosFijosPrevios,
  error,
  onIniciar,
}: ConfiguracionPageProps) {
  const [form, setForm] = useState<EstadoFormulario>(() => aEstadoFormulario(valoresIniciales))
  const [errores, setErrores] = useState<Errores>({})

  const datosFijos = datosFijosPrevios ?? DATOS_FIJOS_POR_DEFECTO

  function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const erroresEncontrados = validar(form)
    setErrores(erroresEncontrados)
    if (Object.keys(erroresEncontrados).length === 0) {
      const parametros = aParametrosFormulario(form)
      if (parametros) {
        onIniciar(parametros)
      }
    }
  }

  return (
    <form onSubmit={manejarEnvio} className="space-y-6">
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
            etiqueta="N mínimo"
            valor={form.nMinimo}
            onCambiar={(valor) => setForm((f) => ({ ...f, nMinimo: valor }))}
            min={1}
            ayuda="Rango de cantidades de ensambladores a probar. Si los resultados no se aplanan, ampliá el máximo."
            error={errores.nMinimo}
          />
          <CampoNumerico
            id="n-maximo"
            etiqueta="N máximo"
            valor={form.nMaximo}
            onCambiar={(valor) => setForm((f) => ({ ...f, nMaximo: valor }))}
            min={form.nMinimo === '' ? 1 : form.nMinimo}
            ayuda="Rango de cantidades de ensambladores a probar. Si los resultados no se aplanan, ampliá el máximo."
            error={errores.nMaximo}
          />
          <CampoNumerico
            id="replicas"
            etiqueta="Réplicas por N (R)"
            valor={form.replicas}
            onCambiar={(valor) => setForm((f) => ({ ...f, replicas: valor }))}
            min={1}
            ayuda="Cuántas jornadas de 8 horas se simulan para cada N. Como los tiempos son al azar, un solo día puede dar un resultado atípico; por eso se promedian R días. Más réplicas = resultado más confiable."
            error={errores.replicas}
          />
          <CampoNumerico
            id="umbral"
            etiqueta="Umbral de utilización"
            valor={form.umbralUtilizacionPorcentaje}
            onCambiar={(valor) => setForm((f) => ({ ...f, umbralUtilizacionPorcentaje: valor }))}
            min={1}
            max={100}
            sufijo="%"
            ayuda="A partir de qué nivel de uso se considera que el horno está saturado. Por defecto 95 %."
            error={errores.umbralUtilizacionPorcentaje}
          />
          <CampoNumerico
            id="semilla"
            etiqueta="Semilla"
            valor={form.semilla}
            onCambiar={(valor) => setForm((f) => ({ ...f, semilla: valor }))}
            opcional
            ayuda="Repetir la misma semilla devuelve exactamente los mismos resultados. Útil para volver a mostrar una corrida en la defensa. Si la dejás vacía, se usa una al azar."
            error={errores.semilla}
          />
        </div>
      </Tarjeta>

      <Tarjeta className="border-dashed bg-base-50">
        <h2 className="text-base font-semibold text-base-900">Datos fijos del enunciado</h2>
        <p className="mt-1 text-sm text-base-500">
          No son configurables: son parte del problema, y en particular los 480 minutos
          de jornada son la condición que hace comparables los resultados entre
          distintos N.
        </p>
        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-base-500">Duración de la jornada</dt>
            <dd className="font-medium text-base-800">{datosFijos.duracion_jornada} minutos</dd>
          </div>
          <div>
            <dt className="text-base-500">Tiempo de ensamble</dt>
            <dd className="font-medium text-base-800">
              {datosFijos.tiempo_ensamble.minimo} a {datosFijos.tiempo_ensamble.maximo} min
              (uniforme)
            </dd>
          </div>
          <div>
            <dt className="text-base-500">Tiempo de cocción</dt>
            <dd className="font-medium text-base-800">
              {datosFijos.tiempo_coccion.minimo} a {datosFijos.tiempo_coccion.maximo} min
              (uniforme)
            </dd>
          </div>
        </dl>
      </Tarjeta>

      <div className="flex justify-end">
        <Boton tipo="submit" icono={<Play size={16} aria-hidden="true" />}>
          Iniciar simulación
        </Boton>
      </div>
    </form>
  )
}
