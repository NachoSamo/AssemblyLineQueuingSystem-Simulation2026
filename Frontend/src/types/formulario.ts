import type { CriterioNOptimo } from './simulacion'

/**
 * Estado del formulario de configuración (pantalla 1). No es parte del
 * contrato de la API: es la forma que usa la interfaz antes de traducirla
 * a `SimulacionRequest` (esa conversión, incluida umbral % -> fracción,
 * vive en api/simulacion.ts).
 */
export interface ParametrosFormulario {
  nMinimo: number
  nMaximo: number
  replicas: number
  criterio: CriterioNOptimo
  /** Piezas mínimas que debe aportar el N siguiente. Solo aplica al criterio de producción. */
  gananciaMinima: number
  /** En porcentaje (94), tal como se le muestra al usuario. */
  umbralUtilizacionPorcentaje: number
  semilla: number | null
}

/**
 * Valores de fábrica. Los tres que no son obvios:
 *
 * - **N máximo = 8, no 6.** La curva se aplana en N=6. Si el rango terminara
 *   justo ahí, el gráfico mostraría una curva siempre creciente y el
 *   aplanamiento no se vería (Dominio.md §10.2). Además, el criterio de máxima
 *   producción **no puede evaluar el último N del rango**, porque no tiene con
 *   qué compararlo: con el rango 1-6 no encontraría óptimo aunque 6 sea la
 *   respuesta. Con 8 quedan tres puntos en la meseta.
 * - **Criterio = máxima producción.** Es la definición del enunciado
 *   (Dominio.md §2) y no depende de que el usuario acierte ningún número.
 * - **Umbral = 94 %, no 95 %.** Solo se usa con el criterio manual, pero el
 *   default importa igual: la utilización tiene un techo real de ~94,8 %
 *   (Dominio.md §10.1), así que con 95 % ningún N calificaría nunca.
 */
export const PARAMETROS_FORMULARIO_POR_DEFECTO: ParametrosFormulario = {
  nMinimo: 1,
  nMaximo: 8,
  replicas: 30,
  criterio: 'maxima_produccion',
  gananciaMinima: 1,
  umbralUtilizacionPorcentaje: 94,
  semilla: null,
}
