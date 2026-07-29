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
  /** En porcentaje (94), tal como se le muestra al usuario. */
  umbralUtilizacionPorcentaje: number
  semilla: number | null
}

/**
 * NOTA: el default de umbral es 94, no 95. Frontend.md §5.1 y su texto de
 * ayuda (§5.2, "Por defecto 95 %") todavía dicen 95, pero Claude.md se
 * actualizó durante esta implementación: con los parámetros del enunciado
 * la utilización tiene un techo real de ~0,948 (el sistema arranca vacío,
 * ver Dominio.md §10.1), así que con 95 % ningún N calificaba nunca y la
 * pantalla de resultados nunca mostraba una conclusión por defecto. Se seteó
 * acá en 94 para que la corrida "de fábrica" sea representativa; el texto de
 * ayuda no se tocó porque la consigna pidió usarlo tal cual. Ver informe.
 */
export const PARAMETROS_FORMULARIO_POR_DEFECTO: ParametrosFormulario = {
  nMinimo: 1,
  nMaximo: 6,
  replicas: 30,
  umbralUtilizacionPorcentaje: 94,
  semilla: null,
}
