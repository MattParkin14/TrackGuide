export type Ownership = 'all' | 'base' | 'paid'

const OPTIONS: { value: Ownership; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'base', label: 'Base' },
  { value: 'paid', label: 'Paid' },
]

interface Props {
  value: Ownership
  onChange: (value: Ownership) => void
  /** Customizes the labels — defaults to "All / Base / Paid". */
  labels?: { all?: string; base?: string; paid?: string }
}

export function OwnershipFilter({ value, onChange, labels }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label="Filter by ownership"
      className="inline-flex rounded-lg border border-edge bg-ink/40 p-0.5 text-xs"
    >
      {OPTIONS.map((opt) => {
        const active = value === opt.value
        const display = labels?.[opt.value] ?? opt.label
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={
              'px-2.5 py-1 rounded-md transition ' +
              (active
                ? opt.value === 'base'
                  ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border border-emerald-500/40'
                  : 'bg-accent/15 text-accent border border-accent/40'
                : 'text-fg-muted hover:text-fg border border-transparent')
            }
          >
            {display}
          </button>
        )
      })}
    </div>
  )
}

/** Filter helper — keeps the predicate consistent across the two consumers. */
export function matchesOwnership(item: { isFree: boolean }, ownership: Ownership): boolean {
  if (ownership === 'all') return true
  if (ownership === 'base') return item.isFree
  return !item.isFree
}
