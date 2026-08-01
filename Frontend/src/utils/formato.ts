/**
 * Formato numérico centralizado, locale es-AR (coma decimal). Ningún
 * componente formatea números por su cuenta (Frontend.md §7.3).
 */

const LOCALE = 'es-AR'

function formatearNumero(valor: number, decimales: number): string {
  return valor.toLocaleString(LOCALE, {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  })
}

/** Fracción (0-1) -> porcentaje con unidad, ej. 0.971 -> "97,1 %". */
export function formatearPorcentaje(fraccion: number, decimales = 1): string {
  return `${formatearNumero(fraccion * 100, decimales)} %`
}

/** Un valor que ya está expresado en porcentaje (ej. 12.5 -> "13 %"). */
export function formatearPorcentajeEntero(valorPorcentaje: number): string {
  return `${Math.round(valorPorcentaje)} %`
}

/**
 * Uso de procesador, acotado a [0, 100].
 *
 * `psutil.Process.cpu_percent()` suma el uso de TODOS los núcleos, así que en
 * una máquina multinúcleo devuelve legítimamente 101,6 % o 150 %. El número del
 * backend no está mal, pero mostrarlo tal cual se lee como un error del
 * programa. El recorte es de presentación y vive solo acá: el backend sigue
 * informando el valor crudo (Frontend.md §7.2).
 */
export function formatearUsoProcesador(valorPorcentaje: number): string {
  return formatearPorcentajeEntero(Math.min(100, Math.max(0, valorPorcentaje)))
}

/** RND del vector de estado: siempre 4 decimales, como en la planilla. */
export function formatearRnd(valor: number): string {
  return formatearNumero(valor, 4)
}

/** Reloj y tiempos del vector de estado, en minutos con 2 decimales. */
export function formatearReloj(valor: number): string {
  return formatearNumero(valor, 2)
}

/** Texto de una celda vacía del vector de estado. */
export const CELDA_VACIA = '—'

/** Aplica un formato solo si el valor existe; si es null, devuelve el guion. */
export function formatearOpcional(
  valor: number | null,
  formateador: (valor: number) => string,
): string {
  return valor === null ? CELDA_VACIA : formateador(valor)
}

/** Decimal genérico con coma, ej. piezas promedio: 58.2 -> "58,2". */
export function formatearDecimal(valor: number, decimales = 1): string {
  return formatearNumero(valor, decimales)
}

/** Piezas promedio, siempre a un decimal. */
export function formatearPiezas(valor: number): string {
  return formatearDecimal(valor, 1)
}

/** Entero redondeado con separador de miles, ej. minutos o conteos. */
export function formatearEntero(valor: number): string {
  return Math.round(valor).toLocaleString(LOCALE)
}

/**
 * Tiempos de cómputo (§7.2): si tiempo_total_ms < 1000, en milisegundos;
 * si no, en segundos. Nunca se muestra un número crudo sin unidad.
 */
export function formatearTiempoMs(ms: number): string {
  if (ms < 1000) {
    return `${formatearDecimal(ms, 2)} milisegundos`
  }
  return `${formatearDecimal(ms / 1000, 2)} segundos`
}

/** Memoria pico, redondeada a MB enteros. */
export function formatearMemoriaMb(mb: number): string {
  return `${Math.round(mb)} MB`
}
