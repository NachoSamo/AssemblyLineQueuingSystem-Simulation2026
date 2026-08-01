import Ayuda from './Ayuda'

export interface OpcionSelector {
  valor: number
  etiqueta: string
}

interface SelectorProps {
  id: string
  etiqueta: string
  valor: number
  opciones: OpcionSelector[]
  onCambiar: (valor: number) => void
  ayuda?: string
  disabled?: boolean
}

/**
 * Primitiva de formulario: un desplegable de opciones numéricas. No sabe qué
 * representan los números, igual que CampoNumerico.
 */
export default function Selector({
  id,
  etiqueta,
  valor,
  opciones,
  onCambiar,
  ayuda,
  disabled = false,
}: SelectorProps) {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <label htmlFor={id} className="text-sm font-medium text-base-700">
          {etiqueta}
        </label>
        {ayuda && <Ayuda texto={ayuda} />}
      </div>
      <select
        id={id}
        value={valor}
        disabled={disabled}
        onChange={(evento) => onCambiar(Number(evento.target.value))}
        className="mt-1.5 w-full rounded-md border border-base-300 bg-white px-3 py-2 text-sm text-base-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-horno-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {opciones.map((opcion) => (
          <option key={opcion.valor} value={opcion.valor}>
            {opcion.etiqueta}
          </option>
        ))}
      </select>
    </div>
  )
}
