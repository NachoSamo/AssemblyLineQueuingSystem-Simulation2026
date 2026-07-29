interface HornoPixelProps {
  reducirMovimiento: boolean
}

/**
 * Horno de bloques dibujado a mano con `<rect>`, estética de bloques pero
 * sin ningún asset ni textura de Minecraft (propiedad de Mojang): todo el
 * arte es propio. La llama pulsa con un keyframe de opacidad/escala.
 */
export default function HornoPixel({ reducirMovimiento }: HornoPixelProps) {
  const claseLlama = reducirMovimiento ? '' : 'animate-pulso-llama origin-bottom'

  return (
    <svg viewBox="0 0 120 120" width={140} height={140} role="img" aria-label="Horno">
      {/* Cuerpo del horno */}
      <rect x="10" y="26" width="100" height="82" fill="#78716c" stroke="#1c1917" strokeWidth="4" />
      <rect x="10" y="26" width="100" height="14" fill="#a8a29e" />
      {/* Chimenea */}
      <rect x="78" y="4" width="18" height="24" fill="#78716c" stroke="#1c1917" strokeWidth="3" />
      {/* Boca del horno */}
      <rect x="34" y="52" width="52" height="46" fill="#1c1917" />
      <rect x="34" y="52" width="52" height="46" fill="none" stroke="#0c0a09" strokeWidth="3" />
      {/* Llama */}
      <rect x="50" y="62" width="20" height="30" fill="#fb923c" className={claseLlama} />
      <rect x="56" y="70" width="8" height="18" fill="#fde68a" className={claseLlama} />
      {/* Base */}
      <rect x="4" y="106" width="112" height="10" fill="#292524" />
    </svg>
  )
}
