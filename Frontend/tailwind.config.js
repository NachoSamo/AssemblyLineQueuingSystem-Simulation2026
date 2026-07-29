/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Naranja horno: color de acento. Usar con criterio (botón principal,
        // curva de utilización, ReferenceDot del N óptimo, llama de la ilustración).
        horno: {
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
        },
        // Grises industriales: superficies, bordes y texto.
        base: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        // Estado del resultado (umbral alcanzado / no alcanzado). Solo para eso.
        ok: '#16a34a',
        alerta: '#dc2626',
      },
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'Consolas',
          'Liberation Mono',
          'monospace',
        ],
      },
      keyframes: {
        // Salto de una pieza rumbo al horno. Se escalona con animation-delay
        // (0ms / 150ms / 300ms) para que las tres piezas no salten juntas.
        saltoPieza: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        // Pulso de la llama del horno: escala y opacidad.
        pulsoLlama: {
          '0%, 100%': { transform: 'scaleY(1)', opacity: '1' },
          '50%': { transform: 'scaleY(1.18)', opacity: '0.7' },
        },
      },
      animation: {
        'salto-pieza': 'saltoPieza 0.6s ease-in-out infinite',
        'pulso-llama': 'pulsoLlama 0.9s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
