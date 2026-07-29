import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface AcordeonProps {
  titulo: string
  children: ReactNode
  abiertoPorDefecto?: boolean
}

/** Sección plegable genérica: no sabe qué contiene (Frontend.md §7.1, detalle). */
export default function Acordeon({
  titulo,
  children,
  abiertoPorDefecto = false,
}: AcordeonProps) {
  const [abierto, setAbierto] = useState(abiertoPorDefecto)
  const idContenido = useId()

  return (
    <div className="overflow-hidden rounded-xl border border-base-200 bg-white">
      <button
        type="button"
        onClick={() => setAbierto((valor) => !valor)}
        aria-expanded={abierto}
        aria-controls={idContenido}
        className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-semibold text-base-800 hover:bg-base-50"
      >
        <span>{titulo}</span>
        {abierto ? (
          <ChevronUp size={18} aria-hidden="true" />
        ) : (
          <ChevronDown size={18} aria-hidden="true" />
        )}
      </button>
      {abierto && (
        <div id={idContenido} className="border-t border-base-200 px-5 py-4">
          {children}
        </div>
      )}
    </div>
  )
}
