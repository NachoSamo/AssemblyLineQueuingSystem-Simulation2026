import type { ReactNode } from 'react'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import Tarjeta from '../ui/Tarjeta'
import Boton from '../ui/Boton'
import type { ResultadoPorN, SimulacionResponse } from '../../types/simulacion'
import { TECHO_UTILIZACION } from '../../utils/constantesDominio'
import {
  formatearDecimal,
  formatearEntero,
  formatearPiezas,
  formatearPorcentaje,
} from '../../utils/formato'

interface TarjetaNOptimoProps {
  resultado: SimulacionResponse
  onAmpliarRango: () => void
}

/**
 * La conclusión (Dominio.md §13.3): va primero, en lenguaje simple, y
 * **explica cada número que muestra**. Un promedio de 56,33 piezas no se
 * entiende solo: hay que decir que la producción real son 56, que el 56,33 es
 * el promedio de R jornadas distintas, y por qué el óptimo cae en ese N y no
 * en otro.
 *
 * Cuando `alcanzo_criterio` es false, `n_optimo` y todos sus derivados viajan
 * en null: acá se corta ese caso antes de leer ningún campo dependiente, y el
 * aviso explica el motivo **propio de cada criterio**, que no es el mismo.
 */
export default function TarjetaNOptimo({ resultado, onAmpliarRango }: TarjetaNOptimoProps) {
  const {
    alcanzo_criterio,
    n_optimo,
    utilizacion_n_optimo,
    piezas_n_optimo,
    piezas_n_optimo_truncadas,
    ganancia_n_optimo,
    utilizacion_maxima_rango,
    resultados_por_n,
    parametros,
  } = resultado

  if (
    !alcanzo_criterio ||
    n_optimo === null ||
    utilizacion_n_optimo === null ||
    piezas_n_optimo === null ||
    piezas_n_optimo_truncadas === null
  ) {
    return (
      <AvisoNoAlcanzado
        resultado={resultado}
        utilizacionMaxima={utilizacion_maxima_rango}
        onAmpliarRango={onAmpliarRango}
      />
    )
  }

  const anterior = resultados_por_n.find((f) => f.n === n_optimo - 1)
  const minutosOcupado = utilizacion_n_optimo * parametros.duracion_jornada
  const minutosOcioso = parametros.duracion_jornada - minutosOcupado

  return (
    <Tarjeta className="border-2 border-horno-400/40 bg-orange-50">
      <div className="flex items-start gap-4">
        <CheckCircle2 className="mt-0.5 shrink-0 text-horno-600" size={28} aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-wide text-horno-600">
            Conclusión
          </p>
          <h2 className="mt-1 text-2xl font-bold text-base-900">
            N óptimo: {n_optimo} {n_optimo === 1 ? 'ensamblador' : 'ensambladores'}
          </h2>
          <p className="mt-1.5 text-base-800">
            Con {n_optimo} {n_optimo === 1 ? 'ensamblador' : 'ensambladores'} por horno se
            completan <strong>{formatearEntero(piezas_n_optimo_truncadas)} piezas</strong> en
            una jornada de {formatearEntero(parametros.duracion_jornada)} minutos.
          </p>

          <ul className="mt-4 space-y-2.5 text-sm text-base-700">
            <Dato titulo="Producción real">
              {/* Dos decimales acá, y no uno: con un decimal, un promedio de 56,96
                  se mostraría como "57,0 truncado a 56" y parecería un error. */}
              <strong>{formatearEntero(piezas_n_optimo_truncadas)} piezas.</strong> Es el
              promedio {formatearDecimal(piezas_n_optimo, 2)} truncado: la pieza siguiente
              queda a medio cocinar cuando termina la jornada, y una pieza incompleta no se
              entrega.
            </Dato>

            <Dato titulo="Promedio de las réplicas">
              <strong>{formatearDecimal(piezas_n_optimo, 2)} piezas.</strong> No es lo que se
              ve un día concreto — ningún día se produce una fracción de pieza. Es el promedio
              de {formatearEntero(parametros.replicas)} jornadas simuladas, cada una con
              tiempos de ensamble y cocción distintos.
            </Dato>

            <Dato titulo="Utilización del horno">
              <strong>{formatearPorcentaje(utilizacion_n_optimo)}.</strong> El horno trabaja{' '}
              {formatearDecimal(minutosOcupado)} de los{' '}
              {formatearEntero(parametros.duracion_jornada)} minutos. Los{' '}
              {formatearDecimal(minutosOcioso)} minutos ociosos son el arranque: el sistema
              empieza vacío y el horno no tiene nada que cocinar hasta que el primer ensamblador
              termina su pieza.
            </Dato>

            {anterior && (
              <Dato titulo={`Por qué no ${n_optimo - 1}`}>
                Con {n_optimo - 1} {n_optimo - 1 === 1 ? 'ensamblador' : 'ensambladores'} se
                completan <strong>{formatearEntero(Math.floor(anterior.piezas_promedio))}</strong>{' '}
                piezas, {formatearPiezas(piezas_n_optimo - anterior.piezas_promedio)} menos por
                jornada.
              </Dato>
            )}

            <Dato titulo={`Por qué no más de ${n_optimo}`}>
              <PorQueNoMas
                resultado={resultado}
                nOptimo={n_optimo}
                gananciaSiguiente={ganancia_n_optimo}
                anterior={anterior}
              />
            </Dato>
          </ul>
        </div>
      </div>
    </Tarjeta>
  )
}

/** Una fila de la explicación: título en negrita y el texto a continuación. */
function Dato({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <li>
      <span className="font-semibold text-base-900">{titulo}:</span> {children}
    </li>
  )
}

/**
 * El argumento del corte cambia según el criterio: no es lo mismo "la curva se
 * aplanó" que "el horno llegó a su techo" o que "cruzó el umbral que pediste".
 */
function PorQueNoMas({
  resultado,
  nOptimo,
  gananciaSiguiente,
  anterior,
}: {
  resultado: SimulacionResponse
  nOptimo: number
  gananciaSiguiente: number | null
  anterior: ResultadoPorN | undefined
}) {
  const { parametros, utilizacion_n_optimo } = resultado
  const colaComun = (
    <>
      {' '}
      A partir de acá el horno es el cuello de botella: los ensambladores de más solo hacen
      cola esperando turno.
    </>
  )

  if (parametros.criterio === 'maxima_produccion') {
    return (
      <>
        {anterior && (
          <>
            Pasar de {nOptimo - 1} a {nOptimo} suma{' '}
            <strong>
              {formatearPiezas(
                (resultado.piezas_n_optimo ?? 0) - anterior.piezas_promedio,
              )}{' '}
              piezas
            </strong>
            .{' '}
          </>
        )}
        {gananciaSiguiente !== null ? (
          <>
            Pasar de {nOptimo} a {nOptimo + 1} suma{' '}
            <strong>{formatearPiezas(gananciaSiguiente)} piezas</strong>, menos que la ganancia
            mínima de {formatearPiezas(parametros.ganancia_minima)} que configuraste.
          </>
        ) : (
          <>La producción ya no crece en el resto del rango.</>
        )}
        {colaComun}
      </>
    )
  }

  if (parametros.criterio === 'capacidad_horno') {
    return (
      <>
        Es el mínimo N que lleva el horno a su techo físico de{' '}
        <strong>{formatearPorcentaje(TECHO_UTILIZACION)}</strong>. Ese techo no es el 100 %
        porque el horno arranca vacío y pierde el tiempo del primer ensamble; ningún N puede
        recuperarlo.
        {colaComun}
      </>
    )
  }

  return (
    <>
      Es el mínimo N cuya utilización (
      {utilizacion_n_optimo !== null ? formatearPorcentaje(utilizacion_n_optimo) : '—'}) supera
      el umbral de {formatearPorcentaje(parametros.umbral_utilizacion, 0)} que configuraste.
      {colaComun}
    </>
  )
}

/**
 * Ningún N del rango satisfizo el criterio. El motivo es distinto en cada caso
 * y el mensaje tiene que decir cuál es, porque la acción a tomar también cambia.
 */
function AvisoNoAlcanzado({
  resultado,
  utilizacionMaxima,
  onAmpliarRango,
}: {
  resultado: SimulacionResponse
  utilizacionMaxima: number
  onAmpliarRango: () => void
}) {
  const { parametros } = resultado
  const sugerencia = parametros.n_maximo + 2

  let titulo: string
  let explicacion: ReactNode

  if (parametros.criterio === 'maxima_produccion') {
    titulo = `La producción todavía crece en N = ${parametros.n_maximo}`
    explicacion = (
      <>
        Para saber si N = {parametros.n_maximo} es el óptimo hace falta simular al menos N ={' '}
        {parametros.n_maximo + 1}: <strong>el último N del rango no se puede evaluar</strong>,
        porque este criterio compara cada N con el siguiente y ese no existe todavía. Ampliá el
        N máximo (probá {sugerencia}).
      </>
    )
  } else if (parametros.criterio === 'capacidad_horno') {
    titulo = 'Ningún N del rango satura el horno'
    explicacion = (
      <>
        La utilización más alta del rango es{' '}
        <strong>{formatearPorcentaje(utilizacionMaxima)}</strong>, lejos del techo de{' '}
        {formatearPorcentaje(TECHO_UTILIZACION)}. Con esta cantidad de ensambladores el horno
        pasa tiempo esperando trabajo. Ampliá el N máximo (probá {sugerencia}).
      </>
    )
  } else {
    titulo = `Ningún N del rango alcanzó el umbral de ${formatearPorcentaje(parametros.umbral_utilizacion, 0)}`
    explicacion = (
      <>
        La utilización más alta del rango es{' '}
        <strong>{formatearPorcentaje(utilizacionMaxima)}</strong>.{' '}
        {parametros.umbral_utilizacion > TECHO_UTILIZACION ? (
          <>
            Ese umbral es <strong>inalcanzable</strong> en este modelo: el techo es{' '}
            {formatearPorcentaje(TECHO_UTILIZACION)}, porque el horno arranca vacío. Bajá el
            umbral por debajo de ese valor.
          </>
        ) : (
          <>Ampliá el N máximo (probá {sugerencia}) para encontrar dónde se satura el horno.</>
        )}
      </>
    )
  }

  return (
    <Tarjeta className="border-2 border-alerta/30 bg-red-50">
      <div className="flex items-start gap-4">
        <AlertTriangle className="mt-0.5 shrink-0 text-alerta" size={28} aria-hidden="true" />
        <div>
          <h2 className="text-lg font-bold text-alerta">{titulo}</h2>
          <p className="mt-1.5 text-base-700">{explicacion}</p>
          <div className="mt-4">
            <Boton variante="secundario" onClick={onAmpliarRango}>
              Ampliar rango y volver a simular
            </Boton>
          </div>
        </div>
      </div>
    </Tarjeta>
  )
}
