interface PiezaPixelProps {
  /** Escalona el salto: 0, 150 o 300 ms (Frontend.md §6.2). */
  delayMs: 0 | 150 | 300
  reducirMovimiento: boolean
}

/**
 * Pieza cúbica dibujada a mano con `<rect>`, estética de bloques (píxeles
 * grandes, bordes duros, sin degradados). Sin assets de terceros.
 */
export default function PiezaPixel({ delayMs, reducirMovimiento }: PiezaPixelProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={32}
      height={32}
      aria-hidden="true"
      className={reducirMovimiento ? '' : 'animate-salto-pieza'}
      style={reducirMovimiento ? undefined : { animationDelay: `${delayMs}ms` }}
    >
      <rect x="4" y="4" width="24" height="24" fill="#f97316" stroke="#7c2d12" strokeWidth="2" />
      <rect x="8" y="8" width="7" height="7" fill="#fdba74" />
      <rect x="17" y="17" width="7" height="7" fill="#c2410c" />
    </svg>
  )
}
