const SIZE_CLASSES = {
  sm: 'text-base',
  md: 'text-xl',
  lg: 'text-3xl',
} as const

/**
 * FixRevOps logotype — "FIX" + "REVOPS", heavy uppercase, amber accent.
 * Presentational only.
 */
export default function Logo({
  size = 'md',
  theme = 'dark',
  className = '',
}: {
  size?: keyof typeof SIZE_CLASSES
  theme?: 'dark' | 'light'
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-baseline font-black uppercase tracking-tight leading-none select-none ${SIZE_CLASSES[size]} ${className}`}
    >
      <span className={theme === 'dark' ? 'text-white' : 'text-neutral-900'}>
        Fix
      </span>
      <span className="text-[#F5A623]">RevOps</span>
    </span>
  )
}
