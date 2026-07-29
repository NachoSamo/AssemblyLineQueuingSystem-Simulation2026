import type { ReactNode } from 'react'

interface TagProps {
  children: ReactNode
  tono?: 'neutro' | 'acento' | 'ok' | 'alerta'
}

const CLASES_POR_TONO: Record<NonNullable<TagProps['tono']>, string> = {
  neutro: 'border-base-200 bg-base-100 text-base-700',
  acento: 'border-horno-400/30 bg-orange-50 text-horno-600',
  ok: 'border-green-200 bg-green-50 text-ok',
  alerta: 'border-red-200 bg-red-50 text-alerta',
}

/** Pastilla descriptiva ("Réplicas por N: 30"), no un número suelto. */
export default function Tag({ children, tono = 'neutro' }: TagProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${CLASES_POR_TONO[tono]}`}
    >
      {children}
    </span>
  )
}
