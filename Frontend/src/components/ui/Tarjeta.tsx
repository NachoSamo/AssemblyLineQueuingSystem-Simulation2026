import type { ReactNode } from 'react'

interface TarjetaProps {
  children: ReactNode
  className?: string
}

/** Primitiva sin conocimiento del dominio: no sabe qué es un horno, recibe children. */
export default function Tarjeta({ children, className = '' }: TarjetaProps) {
  return (
    <div
      className={`rounded-xl border border-base-200 bg-white p-6 shadow-sm ${className}`}
    >
      {children}
    </div>
  )
}
