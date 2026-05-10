import { useMemo, useState } from 'react'
import type { Car, Category } from '../types'
import { CATEGORY_LABEL, formatPrice } from '../lib/format'
import { OwnershipFilter, matchesOwnership, type Ownership } from './OwnershipFilter'

interface Props {
  cars: Car[]
  selected: Set<string>
  onToggle: (carId: string) => void
  onClear: () => void
}

const CATEGORIES: Category[] = ['sports_car', 'formula_car', 'oval', 'dirt_oval', 'dirt_road', 'road']

export function CarSelector({ cars, selected, onToggle, onClear }: Props) {
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<Category | 'all'>('all')
  const [ownership, setOwnership] = useState<Ownership>('all')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return cars.filter((c) => {
      if (categoryFilter !== 'all' && c.category !== categoryFilter) return false
      if (!matchesOwnership(c, ownership)) return false
      if (q && !c.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [cars, query, categoryFilter, ownership])

  const baseCount = useMemo(() => cars.filter((c) => c.isFree).length, [cars])

  const grouped = useMemo(() => {
    const m = new Map<Category, Car[]>()
    for (const c of filtered) {
      const list = m.get(c.category) ?? []
      list.push(c)
      m.set(c.category, list)
    }
    return m
  }, [filtered])

  return (
    <section className="rounded-2xl bg-panel border border-edge p-5">
      <header className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold">Pick the cars you race</h2>
          <p className="text-sm text-slate-400">
            Multi-select. We rank tracks by what unlocks the most action for these cars.
          </p>
        </div>
        <div className="text-sm text-slate-400">
          <span className="text-accent font-semibold">{selected.size}</span> selected
          {selected.size > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="ml-3 text-slate-400 hover:text-slate-200 underline-offset-2 hover:underline"
            >
              clear
            </button>
          )}
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search cars..."
          className="flex-1 min-w-[12rem] bg-ink border border-edge rounded-lg px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:border-accent"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as Category | 'all')}
          className="bg-ink border border-edge rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
        >
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2 mb-4 text-xs text-slate-400">
        <span>Show:</span>
        <OwnershipFilter
          value={ownership}
          onChange={setOwnership}
          labels={{ base: `Base (${baseCount})`, paid: `Paid (${cars.length - baseCount})` }}
        />
      </div>

      <div className="space-y-4">
        {[...grouped.entries()].map(([cat, list]) => (
          <div key={cat}>
            <h3 className="text-xs uppercase tracking-wider text-slate-400 mb-2">
              {CATEGORY_LABEL[cat]}
            </h3>
            <div className="flex flex-wrap gap-2">
              {list.map((car) => {
                const isOn = selected.has(car.id)
                const baseClasses = 'text-left px-3 py-2 rounded-lg border text-sm transition '
                const variant = isOn
                  ? 'bg-accent/15 border-accent text-slate-100'
                  : car.isFree
                  ? 'bg-emerald-500/[0.06] border-emerald-500/30 hover:border-emerald-400/60 text-slate-200'
                  : 'bg-ink border-edge hover:border-slate-600 text-slate-300'
                return (
                  <button
                    key={car.id}
                    type="button"
                    onClick={() => onToggle(car.id)}
                    className={baseClasses + variant}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{car.name}</span>
                      {car.isFree && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[9px] uppercase tracking-wider font-semibold">
                          Base
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">
                      {car.licenseClass}-class ·{' '}
                      {car.isFree ? (
                        <span className="text-emerald-300">Free</span>
                      ) : (
                        formatPrice(car.price)
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-slate-400">No cars match your filter.</p>
        )}
      </div>
    </section>
  )
}
