import { useEffect, useState } from 'react'
import PiezaPixel from '../components/animacion/PiezaPixel'
import HornoPixel from '../components/animacion/HornoPixel'
import BarraProgreso from '../components/animacion/BarraProgreso'
import Boton from '../components/ui/Boton'
import { useProgresoSimulado } from '../hooks/useProgresoSimulado'
import type { ParametrosFormulario } from '../types/formulario'
import { formatearEntero } from '../utils/formato'

interface SimulandoPageProps {
  parametros: ParametrosFormulario
  /** true cuando la respuesta (resultado o error) del backend ya llegó. */
  datosListos: boolean
  onListo: () => void
  onCancelar: () => void
}

/**
 * Deriva contadores "vistosos" a partir del porcentaje animado. Son
 * puramente ESTIMADOS: no reflejan en qué N o réplica está el backend
 * realmente (el backend no reporta progreso incremental, ver
 * hooks/useProgresoSimulado.ts). Sirven solo para que la espera se sienta
 * concreta, nunca como fuente de verdad.
 */
function calcularContadoresEstimados(
  porcentaje: number,
  nMinimo: number,
  nMaximo: number,
  replicas: number,
) {
  const totalN = nMaximo - nMinimo + 1
  const fraccion = Math.min(porcentaje, 99) / 100
  const indiceN = Math.min(Math.floor(fraccion * totalN), totalN - 1)
  const nActual = nMinimo + indiceN
  const progresoDentroDeN = fraccion * totalN - indiceN
  const replicaActual = Math.min(Math.max(Math.round(progresoDentroDeN * replicas), 1), replicas)
  return { nActual, replicaActual }
}

function usePrefiereReducirMovimiento(): boolean {
  const [reducir, setReducir] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const consulta = window.matchMedia('(prefers-reduced-motion: reduce)')
    const manejar = (evento: MediaQueryListEvent) => setReducir(evento.matches)
    consulta.addEventListener('change', manejar)
    return () => consulta.removeEventListener('change', manejar)
  }, [])
  return reducir
}

/** Pantalla 2: ilustración + barra de progreso (Frontend.md §6). */
export default function SimulandoPage({
  parametros,
  datosListos,
  onListo,
  onCancelar,
}: SimulandoPageProps) {
  const { porcentaje, listoParaTransicionar } = useProgresoSimulado(datosListos)
  const reducirMovimiento = usePrefiereReducirMovimiento()

  useEffect(() => {
    if (listoParaTransicionar) {
      onListo()
    }
  }, [listoParaTransicionar, onListo])

  const cantidadJornadas =
    (parametros.nMaximo - parametros.nMinimo + 1) * parametros.replicas
  const { nActual, replicaActual } = calcularContadoresEstimados(
    porcentaje,
    parametros.nMinimo,
    parametros.nMaximo,
    parametros.replicas,
  )

  return (
    <div className="flex flex-col items-center gap-10 py-16 text-center">
      <div>
        <h1 className="text-xl font-semibold text-base-900">
          Simulando {formatearEntero(cantidadJornadas)} jornadas de 8 horas…
        </h1>
        <p className="mt-1 text-sm text-base-500">
          Recorriendo N = {parametros.nMinimo} a N = {parametros.nMaximo}, con{' '}
          {parametros.replicas} réplicas por cada uno.
        </p>
      </div>

      <div className="flex items-end gap-6" aria-hidden="true">
        <PiezaPixel delayMs={0} reducirMovimiento={reducirMovimiento} />
        <PiezaPixel delayMs={150} reducirMovimiento={reducirMovimiento} />
        <PiezaPixel delayMs={300} reducirMovimiento={reducirMovimiento} />
        <HornoPixel reducirMovimiento={reducirMovimiento} />
      </div>

      <div className="w-full max-w-md">
        <BarraProgreso porcentaje={porcentaje} reducirMovimiento={reducirMovimiento} />
        {/* Estimados a partir del porcentaje animado, no vienen del backend. */}
        <p className="mt-3 text-sm text-base-500">
          N = {nActual} de {parametros.nMaximo} · Réplica {replicaActual} /{' '}
          {parametros.replicas}
        </p>
      </div>

      <Boton variante="secundario" onClick={onCancelar}>
        Cancelar
      </Boton>
    </div>
  )
}
