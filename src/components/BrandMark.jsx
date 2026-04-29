/**
 * BrandMark — Monograma "MM" Medicina Marketing
 * Círculo com dois "M" estilizados em traços finos elegantes (cor padrão cobre).
 */
export default function BrandMark({ size = 32, color = '#C9A074', strokeWidth = 1.4 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-label="Medicina Marketing">
      <circle cx="50" cy="50" r="44" stroke={color} strokeWidth={strokeWidth * 0.85} />
      {/* M esquerdo */}
      <path
        d="M23 68 L23 34 L34 52 L45 34 L45 68"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="miter"
        strokeLinecap="square"
        fill="none"
      />
      {/* M direito */}
      <path
        d="M55 68 L55 34 L66 52 L77 34 L77 68"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="miter"
        strokeLinecap="square"
        fill="none"
      />
    </svg>
  )
}
