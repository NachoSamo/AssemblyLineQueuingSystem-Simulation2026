import type { ReactNode } from 'react'

export interface OpcionRadio<T extends string> {
  valor: T
  etiqueta: string
  descripcion?: string
}

interface CampoRadioProps<T extends string> {
  /** Prefijo de los `id` y `name` del grupo; tiene que ser único en la página. */
  nombre: string
  leyenda: string
  opciones: OpcionRadio<T>[]
  valor: T
  onCambiar: (valor: T) => void
  /** Contenido extra que se dibuja debajo de la opción seleccionada. */
  detalle?: (valor: T) => ReactNode
}

/**
 * Grupo de opciones excluyentes. Primitiva sin conocimiento del dominio: no
 * sabe qué son los criterios, recibe una lista de opciones.
 *
 * Es un `fieldset` con `legend` a propósito: es lo que hace que un lector de
 * pantalla anuncie de qué grupo forma parte cada opción.
 */
export default function CampoRadio<T extends string>({
  nombre,
  leyenda,
  opciones,
  valor,
  onCambiar,
  detalle,
}: CampoRadioProps<T>) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-base-700">{leyenda}</legend>
      <div className="mt-2 space-y-2">
        {opciones.map((opcion) => {
          const seleccionada = opcion.valor === valor
          const id = `${nombre}-${opcion.valor}`
          return (
            <div
              key={opcion.valor}
              className={`rounded-lg border px-4 py-3 transition-colors ${
                seleccionada
                  ? 'border-horno-400 bg-orange-50'
                  : 'border-base-200 bg-white hover:bg-base-50'
              }`}
            >
              <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
                <input
                  id={id}
                  type="radio"
                  name={nombre}
                  value={opcion.valor}
                  checked={seleccionada}
                  onChange={() => onCambiar(opcion.valor)}
                  className="mt-1 h-4 w-4 shrink-0 accent-horno-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-horno-400"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-base-900">
                    {opcion.etiqueta}
                  </span>
                  {opcion.descripcion && (
                    <span className="mt-0.5 block text-sm leading-relaxed text-base-600">
                      {opcion.descripcion}
                    </span>
                  )}
                </span>
              </label>
              {seleccionada && detalle && <div className="mt-3">{detalle(opcion.valor)}</div>}
            </div>
          )
        })}
      </div>
    </fieldset>
  )
}
