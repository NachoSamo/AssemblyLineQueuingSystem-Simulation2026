import { Info } from 'lucide-react'

interface AyudaProps {
  texto: string
}

/**
 * Ícono de ayuda con tooltip accesible (Frontend.md §5.2). Se abre con hover
 * y con foco de teclado (el span es tabulable), para no depender del mouse.
 */
export default function Ayuda({ texto }: AyudaProps) {
  return (
    <span
      tabIndex={0}
      className="group relative inline-flex cursor-help items-center focus:outline-none"
    >
      <Info size={15} className="text-base-400" aria-hidden="true" />
      <span className="sr-only">{texto}</span>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-64 -translate-x-1/2 rounded-md bg-base-900 px-3 py-2 text-xs leading-relaxed text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus:opacity-100"
      >
        {texto}
      </span>
    </span>
  )
}
