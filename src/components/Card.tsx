/**
 * White surface card — subtle border + shadow, 8px radius.
 * Presentational only.
 */
export default function Card({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-lg border border-neutral-200 bg-white shadow-sm ${className}`}
    >
      {children}
    </div>
  )
}
