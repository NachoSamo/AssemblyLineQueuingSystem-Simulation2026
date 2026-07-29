import type { ReactNode } from 'react'

interface BotonProps {
  children: ReactNode
  onClick?: () => void
  tipo?: 'button' | 'submit'
  variante?: 'primario' | 'secundario' | 'peligro'
  disabled?: boolean
  ariaLabel?: string
  icono?: ReactNode
}

const CLASES_BASE =
  'inline-flex items-center justify-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'

const CLASES_POR_VARIANTE: Record<NonNullable<BotonProps['variante']>, string> = {
  primario: 'bg-horno-500 text-white hover:bg-horno-600 focus-visible:ring-horno-500',
  secundario:
    'border border-base-300 bg-white text-base-700 hover:bg-base-100 focus-visible:ring-base-400',
  peligro:
    'border border-alerta bg-white text-alerta hover:bg-red-50 focus-visible:ring-alerta',
}

export default function Boton({
  children,
  onClick,
  tipo = 'button',
  variante = 'primario',
  disabled = false,
  ariaLabel,
  icono,
}: BotonProps) {
  return (
    <button
      type={tipo}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`${CLASES_BASE} ${CLASES_POR_VARIANTE[variante]}`}
    >
      {icono}
      {children}
    </button>
  )
}
