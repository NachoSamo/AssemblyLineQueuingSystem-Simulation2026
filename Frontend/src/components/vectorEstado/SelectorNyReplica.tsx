import Selector from '../ui/Selector'
import type { OpcionSelector } from '../ui/Selector'

interface SelectorNyReplicaProps {
  nMinimo: number
  nMaximo: number
  replicas: number
  n: number
  replica: number
  onCambiarN: (valor: number) => void
  onCambiarReplica: (valor: number) => void
  nOptimo: number | null
  disabled?: boolean
}

function rango(desde: number, hasta: number): number[] {
  return Array.from({ length: hasta - desde + 1 }, (_, i) => desde + i)
}

/**
 * Elige qué jornada simulada se está mirando. Son los dos ejes del experimento:
 * N (cuántos ensambladores) y R (cuál de las réplicas de ese N).
 */
export default function SelectorNyReplica({
  nMinimo,
  nMaximo,
  replicas,
  n,
  replica,
  onCambiarN,
  onCambiarReplica,
  nOptimo,
  disabled = false,
}: SelectorNyReplicaProps) {
  const opcionesN: OpcionSelector[] = rango(nMinimo, nMaximo).map((valor) => ({
    valor,
    etiqueta:
      valor === nOptimo
        ? `${valor} ensambladores (N óptimo)`
        : `${valor} ${valor === 1 ? 'ensamblador' : 'ensambladores'}`,
  }))

  const opcionesReplica: OpcionSelector[] = rango(1, replicas).map((valor) => ({
    valor,
    etiqueta: `Réplica ${valor} de ${replicas}`,
  }))

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Selector
        id="vector-n"
        etiqueta="Cantidad de ensambladores (N)"
        valor={n}
        opciones={opcionesN}
        onCambiar={onCambiarN}
        disabled={disabled}
        ayuda="Cada N se simuló por separado. Elegí cuál de las configuraciones querés inspeccionar."
      />
      <Selector
        id="vector-replica"
        etiqueta="Réplica (R)"
        valor={replica}
        opciones={opcionesReplica}
        onCambiar={onCambiarReplica}
        disabled={disabled}
        ayuda="Cada réplica es una jornada completa de 480 minutos simulada de principio a fin. Los resultados que se muestran en la pantalla anterior son el promedio de todas."
      />
    </div>
  )
}
