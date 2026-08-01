import { useCallback, useMemo, useState } from 'react'

/** Filas por página del vector de estado. Requisito del enunciado del TP. */
export const FILAS_POR_PAGINA = 20

export interface UsePaginacionResultado<T> {
  /** Solo los elementos de la página actual. */
  elementos: T[]
  /** Página actual, empezando en 1 (es lo que se muestra). */
  pagina: number
  totalPaginas: number
  hayAnterior: boolean
  haySiguiente: boolean
  anterior: () => void
  siguiente: () => void
  /** Posición del primer y del último elemento visible, en base 1. */
  desde: number
  hasta: number
  total: number
}

/**
 * Paginación genérica en memoria. No sabe qué está paginando: recibe un arreglo
 * y devuelve la rebanada visible más los controles.
 *
 * Vuelve sola a la página 1 cuando cambia el arreglo (por ejemplo, al elegir
 * otra réplica): si no, se quedaría mostrando una página que ya no existe.
 */
export function usePaginacion<T>(
  todos: T[],
  porPagina: number = FILAS_POR_PAGINA,
): UsePaginacionResultado<T> {
  const [pagina, setPagina] = useState(1)
  const [fuente, setFuente] = useState(todos)

  // Volver a la página 1 cuando cambia el arreglo (por ejemplo, al elegir otra
  // réplica): si no, se quedaría mostrando una página que ya no existe. Se
  // ajusta durante el render y no en un efecto, que es lo que recomienda React
  // para "corregir estado cuando cambia una prop": así no hay un render
  // intermedio mostrando la página vieja sobre los datos nuevos.
  if (fuente !== todos) {
    setFuente(todos)
    setPagina(1)
  }

  const total = todos.length
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina))

  // Cota de seguridad para el caso en que `porPagina` cambie sin que cambie el
  // arreglo: `pagina` podría quedar apuntando fuera de rango.
  const paginaValida = Math.min(pagina, totalPaginas)
  const inicio = (paginaValida - 1) * porPagina

  const elementos = useMemo(
    () => todos.slice(inicio, inicio + porPagina),
    [todos, inicio, porPagina],
  )

  const anterior = useCallback(() => {
    setPagina((actual) => Math.max(1, actual - 1))
  }, [])

  const siguiente = useCallback(() => {
    setPagina((actual) => Math.min(totalPaginas, actual + 1))
  }, [totalPaginas])

  return {
    elementos,
    pagina: paginaValida,
    totalPaginas,
    hayAnterior: paginaValida > 1,
    haySiguiente: paginaValida < totalPaginas,
    anterior,
    siguiente,
    desde: total === 0 ? 0 : inicio + 1,
    hasta: Math.min(inicio + porPagina, total),
    total,
  }
}
