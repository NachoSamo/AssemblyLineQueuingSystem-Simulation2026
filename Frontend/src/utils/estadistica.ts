/**
 * Estadísticos de una distribución uniforme continua U(a, b).
 *
 * Se calculan acá, en el frontend, a partir del `minimo` y `maximo` que devuelve
 * el backend en `parametros`. Eso NO viola la regla de "no hardcodear los datos
 * fijos" (Frontend.md §3): no se está inventando ningún valor, se está derivando
 * uno de otro. Si el enunciado cambiara los rangos, estos números se ajustan solos.
 */

import type { RangoTiempo } from '../types/simulacion'

/** Media de U(a, b): el punto medio del intervalo. */
export function mediaUniforme({ minimo, maximo }: RangoTiempo): number {
  return (minimo + maximo) / 2
}

/**
 * Desvío estándar de U(a, b) = (b − a) / √12.
 *
 * Ojo: NO es el "± 5" del enunciado. Ese 5 es el semirrango (la mitad del ancho
 * del intervalo), que para U(25, 35) da 5, mientras que el desvío estándar da
 * 2,89. Los dos números son correctos y describen cosas distintas, por eso la
 * interfaz muestra ambos etiquetados (Frontend.md §5.3).
 */
export function desvioUniforme({ minimo, maximo }: RangoTiempo): number {
  return (maximo - minimo) / Math.sqrt(12)
}

/** Semirrango de U(a, b): la mitad del ancho. Es el "± 5" con el que el enunciado escribe "30 ± 5". */
export function semirrangoUniforme({ minimo, maximo }: RangoTiempo): number {
  return (maximo - minimo) / 2
}

/**
 * Fórmula de generación del enunciado (Dominio.md §3), ya instanciada:
 * `X = a + RND × (b − a)`. Devuelve por ejemplo "25 + RND × 10".
 */
export function formulaGeneracion({ minimo, maximo }: RangoTiempo): string {
  return `${minimo} + RND × ${maximo - minimo}`
}

/** Notación de la distribución, ej. "U(25, 35)". */
export function notacionUniforme({ minimo, maximo }: RangoTiempo): string {
  return `U(${minimo}, ${maximo})`
}
