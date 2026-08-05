const STATUS_STYLES: Record<string, string> = {
  planning: 'bg-neutral-100 text-neutral-600',
  active: 'bg-amber-100 text-amber-700',
  'on-hold': 'bg-orange-100 text-orange-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
  // Task / service-request statuses
  pending: 'bg-neutral-100 text-neutral-600',
  'in-progress': 'bg-amber-100 text-amber-700',
  new: 'bg-neutral-100 text-neutral-600',
  submitted: 'bg-neutral-100 text-neutral-600',
}

/**
 * Rounded-full status pill. Normalizes underscores/hyphens and falls back
 * to a neutral style for unknown statuses. Presentational only.
 */
export default function StatusBadge({
  status,
  className = '',
}: {
  status: string
  className?: string
}) {
  const key = status.toLowerCase().replace(/_/g, '-')
  const style = STATUS_STYLES[key] ?? 'bg-neutral-100 text-neutral-600'
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium capitalize ${style} ${className}`}
    >
      {status.replace(/[_-]/g, ' ')}
    </span>
  )
}
