import type { SeriesMatch } from '../lib/series-finder'
import { CATEGORY_LABEL } from '../lib/format'

interface Props {
  matches: SeriesMatch[]
  selectedCount: number
}

export function SeriesList({ matches, selectedCount }: Props) {
  if (selectedCount === 0) {
    return (
      <section className="rounded-2xl bg-panel border border-edge p-8 text-center text-slate-400">
        Pick at least one car on the left to see which series race it.
      </section>
    )
  }
  if (matches.length === 0) {
    return (
      <section className="rounded-2xl bg-panel border border-edge p-8 text-center text-slate-400">
        No series in the dataset use your selected car(s).
      </section>
    )
  }

  return (
    <section className="rounded-2xl bg-panel border border-edge p-5">
      <header className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Series for your cars</h2>
          <p className="text-sm text-slate-400">
            Each series that schedules at least one of your selected cars, with this
            season's tracks.
          </p>
        </div>
        <div className="text-sm text-slate-400">{matches.length} series</div>
      </header>

      <ol className="space-y-3">
        {matches.map((m) => (
          <li
            key={m.series.id}
            className="rounded-xl border border-edge bg-ink/60 p-4"
          >
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
              <h3 className="text-base font-semibold text-slate-100">{m.series.name}</h3>
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

            <div className="mt-3 text-xs text-slate-400">
              <span className="text-slate-500 mr-2">Your cars in series:</span>
              {m.matchedCars.map((c, i) => (
                <span key={c.id}>
                  {i > 0 && ', '}
                  <span className="text-accent">{c.name}</span>
                </span>
              ))}
              {m.allCarsInSeries.length > m.matchedCars.length && (
                <span className="text-slate-500">
                  {' '}
                  · plus {m.allCarsInSeries.length - m.matchedCars.length} other car
                  {m.allCarsInSeries.length - m.matchedCars.length === 1 ? '' : 's'}
                </span>
              )}
            </div>

            {m.upcomingTracks.length > 0 && (
              <div className="mt-3 text-xs text-slate-400">
                <div className="text-slate-500 mb-1">This season's tracks:</div>
                <div className="flex flex-wrap gap-1.5">
                  {m.upcomingTracks.map((t) => (
                    <span
                      key={t.id}
                      className={
                        'px-2 py-1 rounded border ' +
                        (t.isFree
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200'
                          : 'bg-ink border-edge text-slate-300')
                      }
                      title={t.isFree ? 'Included in base package' : `${t.name} — paid`}
                    >
                      {t.name}
                    </span>
                  ))}
                </div>
                {m.paidUpcomingTracks.length > 0 && (
                  <div className="mt-2 text-[11px] text-slate-500">
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
  if (muted) return <span className={base + 'bg-slate-700/30 border-slate-600/40 text-slate-400'}>{children}</span>
  return <span className={base + 'bg-ink border-edge text-slate-300'}>{children}</span>
}
