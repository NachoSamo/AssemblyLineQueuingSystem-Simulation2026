interface BarraProgresoProps {
  porcentaje: number
  reducirMovimiento: boolean
}

/** Barra de progreso accesible (role="progressbar" + aria-valuenow). */
export default function BarraProgreso({ porcentaje, reducirMovimiento }: BarraProgresoProps) {
  const porcentajeRedondeado = Math.round(porcentaje)

  return (
    <div className="w-full">
      <div
        role="progressbar"
        aria-valuenow={porcentajeRedondeado}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-4 w-full overflow-hidden rounded-full bg-base-200"
      >
        <div
          className={`h-full rounded-full bg-horno-500 ${
            reducirMovimiento ? '' : 'transition-[width] duration-150 ease-linear'
          }`}
          style={{ width: `${porcentajeRedondeado}%` }}
        />
      </div>
      <p className="mt-2 text-right text-sm font-medium tabular-nums text-base-600">
        {porcentajeRedondeado} %
      </p>
    </div>
  )
}
