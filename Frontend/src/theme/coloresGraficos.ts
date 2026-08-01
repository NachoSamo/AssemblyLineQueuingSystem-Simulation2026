/**
 * Colores compartidos entre los gráficos de Recharts y la ilustración de la
 * pantalla de espera. Replican los tokens de `tailwind.config.js` (paletas
 * "horno" y "base") para que un solo lugar defina la paleta (Frontend.md §9).
 * Recharts no puede leer clases de Tailwind directamente, por eso viven
 * también como constantes hexadecimales acá.
 */

/** Curva de utilización: el gráfico que decide el N óptimo. Acento naranja. */
export const COLOR_UTILIZACION = '#f97316' // horno-500

/** ReferenceDot del N óptimo sobre la curva de utilización. */
export const COLOR_UTILIZACION_MARCA = '#ea580c' // horno-600

/**
 * Curva de piezas terminadas: gráfico de verificación, no de decisión.
 * Se usa un tono neutro a propósito para no competir con el acento naranja.
 */
export const COLOR_PRODUCCION = '#334155' // base-700

/** Línea de umbral (ReferenceLine) y grilla: recesivos, no deben resaltar. */
export const COLOR_REFERENCIA = '#94a3b8' // base-400
export const COLOR_REJILLA = '#e2e8f0' // base-200
export const COLOR_EJE = '#475569' // base-600
