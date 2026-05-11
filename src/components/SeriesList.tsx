import { useMemo, useState } from 'react'
import type { SeriesMatch } from '../lib/series-finder'
import { CATEGORY_LABEL } from '../lib/format'
import { OwnershipFilter, type Ownership } from './OwnershipFilter'

interface Props {
  matches: SeriesMatch[]
  selectedCount: number
}

/** A series counts as "fully base" only if it actually runs this season AND
 *  every upcoming track is base content. A series with no upcoming weeks is
 *  not actionable, so we exclude it from both Base and Paid buckets and
 *  only show it in 'all'. */
function isFullyBase(m: SeriesMatch): boolean {
  return m.upcomingTracks.length > 0 && m.paidUpcomingTracks.length === 0
}
function requiresPaid(m: SeriesMatch): boolean {
  return m.paidUpcomingTracks.length > 0
}
function matches(m: SeriesMatch, o: Ownership): boolean {
  if (o === 'all') return true
  if (o === 'base') return isFullyBase(m)
  return requiresPaid(m)
}

export function SeriesList({ matches: items, selectedCount }: Props) {
  const [ownership, setOwnership] = useState<Ownership>('all')

  const baseCount = useMemo(() => items.filter(isFullyBase).length, [items])
  const paidCount = useMemo(() => items.filter(requiresPaid).length, [items])
  const filtered = useMemo(
    () => items.filter((m) => matches(m, ownership)),
    [items, ownership],
  )

  if (selectedCount === 0) {
    return (
      <section className="rounded-2xl bg-panel border border-edge p-8 text-center text-fg-muted">
        Pick at least one car on the left to see which series race it.
      </section>
    )
  }
  if (items.length === 0) {
    return (
      <section className="rounded-2xl bg-panel border border-edge p-8 text-center text-fg-muted">
        No series in the dataset use your selected car(s).
      </section>
    )
  }

  return (
    <section className="rounded-2xl bg-panel border border-edge p-5">
      <header className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">Series for your cars</h2>
          <p className="text-sm text-fg-muted">
            Each series that schedules at least one of your selected cars, with this
            season's tracks.
          </p>
        </div>
        <div className="text-sm text-fg-muted">
          {filtered.length === items.length
            ? `${items.length} series`
            : `${filtered.length} of ${items.length}`}
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-4 text-xs text-fg-muted">
        <span>Show:</span>
        <OwnershipFilter
          value={ownership}
          onChange={setOwnership}
          labels={{ base: `Base (${baseCount})`, paid: `Paid (${paidCount})` }}
        />
        <span className="text-[11px] text-fg-dim ml-1">
          Base = full schedule on base-content tracks · Paid = at least one paid track
        </span>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-fg-muted py-4 text-center">
          No series match the current filter.
        </p>
      ) : (
      <ol className="space-y-3">
        {filtered.map((m) => (
          <li
            key={m.series.id}
            className="rounded-xl border border-edge bg-ink/60 p-4"
          >
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
              <h3 className="text-base font-semibold text-fg">{m.series.name}</h3>
              <div className="flex items-center gap-2 text-xs">
                <Pill>{m.series.licenseClass}-class</Pill>
                <Pill>{CATEGORY_LABEL[m.series.category]}</Pill>
                {m.upcomingWeekCount > 0 ? (
                  <Pill emphasized>{m.upcomingWeekCount} weeks this season</Pill>
                ) : (
                  <Pill muted>Not running this season</Pill>
                )}
              </div>
            </div>

            <div className="mt-3 text-xs text-fg-muted">
              <span className="text-fg-dim mr-2">Your cars in series:</span>
              {m.matchedCars.map((c, i) => (
                <span key={c.id}>
                  {i > 0 && ', '}
                  <span className="text-accent">{c.name}</span>
                </span>
              ))}
              {m.allCarsInSeries.length > m.matchedCars.length && (
                <span className="text-fg-dim">
                  {' '}
                  · plus {m.allCarsInSeries.length - m.matchedCars.length} other car
                  {m.allCarsInSeries.length - m.matchedCars.length === 1 ? '' : 's'}
                </span>
              )}
            </div>

            {m.upcomingTracks.length > 0 && (
              <div className="mt-3 text-xs text-fg-muted">
                <div className="text-fg-dim mb-1">This season's tracks:</div>
                <div className="flex flex-wrap gap-1.5">
                  {m.upcomingTracks.map((t) => (
                    <span
                      key={t.id}
                      className={
                        'px-2 py-1 rounded border ' +
                        (t.isFree
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-800 dark:text-emerald-200'
                          : 'bg-ink border-edge text-fg')
                      }
                      title={t.isFree ? 'Included in base package' : `${t.name} — paid`}
                    >
                      {t.name}
                    </span>
                  ))}
                </div>
                {m.paidUpcomingTracks.length > 0 && (
                  <div className="mt-2 text-[11px] text-fg-dim">
                    {m.freeUpcomingTracks.length} of {m.upcomingTracks.length} tracks are
                    base content; the other {m.paidUpcomingTracks.length} would need to
                    be purchased to run every week.
                  </div>
                )}
              </div>
            )}
          </li>
        ))}
      </ol>
      )}
    </section>
  )
}

function Pill({
  children,
  emphasized,
  muted,
}: {
  children: React.ReactNode
  emphasized?: boolean
  muted?: boolean
}) {
  const base = 'px-2 py-0.5 rounded border text-[11px] '
  if (emphasized) return <span className={base + 'bg-accent/15 border-accent/40 text-accent'}>{children}</span>
  if (muted) return <span className={base + 'bg-fg-dim/10 border-fg-dim/30 text-fg-muted'}>{children}</span>
  return <span className={base + 'bg-ink border-edge text-fg'}>{children}</span>
}
