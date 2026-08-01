import type { UseFormRegisterReturn } from 'react-hook-form'
import Ayuda from './Ayuda'

interface CampoNumericoProps {
  id: string
  etiqueta: string
  /** Lo que devuelve `register(...)` de react-hook-form: se esparce sobre el input. */
  registro: UseFormRegisterReturn
  min?: number
  max?: number
  paso?: number
  sufijo?: string
  ayuda?: string
  opcional?: boolean
  error?: string
  placeholder?: string
}

/**
 * Primitiva de formulario: no sabe qué representa el número, solo lo edita.
 *
 * No maneja su propio estado: recibe el `registro` de react-hook-form y lo
 * esparce sobre el `<input>`. Así la validación en vivo (Frontend.md §5.4) vive
 * en un solo lado y este componente sigue siendo presentacional.
 */
export default function CampoNumerico({
  id,
  etiqueta,
  registro,
  min,
  max,
  paso = 1,
  sufijo,
  ayuda,
  opcional = false,
  error,
  placeholder,
}: CampoNumericoProps) {
  const idError = `${id}-error`

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <label htmlFor={id} className="text-sm font-medium text-base-700">
          {etiqueta}
          {opcional && (
            <span className="ml-1 font-normal text-base-400">(opcional)</span>
          )}
        </label>
        {ayuda && <Ayuda texto={ayuda} />}
      </div>
      <div className="relative mt-1.5">
        <input
          {...registro}
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          step={paso}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? idError : undefined}
          className={`w-full rounded-md border px-3 py-2 text-sm text-base-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-horno-400 ${
            error ? 'border-alerta' : 'border-base-300'
          } ${sufijo ? 'pr-10' : ''}`}
        />
        {sufijo && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-base-400">
            {sufijo}
          </span>
        )}
      </div>
      {error && (
        <p id={idError} className="mt-1 text-xs text-alerta">
          {error}
        </p>
      )}
    </div>
  )
}
