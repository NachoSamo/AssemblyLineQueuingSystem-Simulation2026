import type { CriterioNOptimo, ParametrosSimulacion } from '../types/simulacion'

/**
 * Réplica en el frontend de los datos fijos del enunciado (Dominio.md §3),
 * solo para tener algo que mostrar en el panel de "datos fijos" de la
 * pantalla 1 ANTES de la primera corrida. En cuanto exista una respuesta
 * del backend, la pantalla debe leer estos mismos valores desde
 * `resultado.parametros`, nunca desde acá: si el enunciado cambiara en el
 * backend, la pantalla tiene que reflejarlo sola.
 */
export const DATOS_FIJOS_POR_DEFECTO: Pick<
  ParametrosSimulacion,
  'duracion_jornada' | 'tiempo_ensamble' | 'tiempo_coccion'
> = {
  duracion_jornada: 480,
  tiempo_ensamble: { minimo: 25, maximo: 35 },
  tiempo_coccion: { minimo: 6, maximo: 10 },
}

/**
 * Techo de utilización alcanzable, como fracción (Dominio.md §10.1).
 *
 * No es 1: el sistema arranca vacío, así que el horno queda ocioso los ~25
 * minutos que tarda el primer ensamble. Se usa solo para redactar textos
 * ("el techo es ~94,8 %"); las decisiones las toma el backend.
 */
export const TECHO_UTILIZACION = (480 - 25) / 480

/** Los tres criterios, en el orden en que se muestran, con su texto de interfaz. */
export const CRITERIOS: {
  valor: CriterioNOptimo
  etiqueta: string
  descripcion: string
}[] = [
  {
    valor: 'maxima_produccion',
    etiqueta: 'Máxima producción de piezas',
    descripcion:
      'El mínimo N a partir del cual sumar otro ensamblador ya no aumenta la producción. Es la definición del enunciado y no depende de ningún umbral.',
  },
  {
    valor: 'capacidad_horno',
    etiqueta: 'Usar la máxima capacidad del horno',
    descripcion:
      'El mínimo N que lleva el horno a su techo físico (~94,8 %). Es lo máximo que puede dar este horno, porque arranca vacío y pierde el primer ensamble.',
  },
  {
    valor: 'umbral_manual',
    etiqueta: 'Umbral de utilización manual',
    descripcion:
      'El mínimo N cuya utilización supera el umbral que indiques. Sirve para explorar a mano qué pasa con distintas exigencias.',
  },
]

/** Nombre corto del criterio, para tags y resúmenes. */
export const NOMBRE_CRITERIO: Record<CriterioNOptimo, string> = {
  maxima_produccion: 'Máxima producción',
  capacidad_horno: 'Máxima capacidad del horno',
  umbral_manual: 'Umbral manual',
}
