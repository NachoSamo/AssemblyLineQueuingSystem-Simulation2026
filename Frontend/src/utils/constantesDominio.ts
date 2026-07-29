import type { ParametrosSimulacion } from '../types/simulacion'

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
