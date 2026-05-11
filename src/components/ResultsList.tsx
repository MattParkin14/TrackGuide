import { useMemo, useState } from 'react'
import type { RankMode, TrackScore } from '../lib/recommend'
import { formatPrice } from '../lib/format'
import { OwnershipFilter, matchesOwnership, type Ownership } from './OwnershipFilter'

interface Props {
  scores: TrackScore[]
  mode: RankMode
}

const MODE_LABEL: Record<RankMode, string> = {
  weeks: 'Most weeks raceable',
  popularity: 'Series popularity weighted',
  recurrence: 'Track recurrence (last 8 seasons)',
}

export function ResultsList({ scores, mode }: Props) {
  const [ownership, setOwnership] = useState<Ownership>('all')

  const baseCount = useMemo(() => scores.filter((s) => s.track.isFree).length, [scores])
  const filtered = useMemo(
    () => scores.filter((s) => matchesOwnership(s.track, ownership)),
    [scores, ownership],
  )

  if (scores.length === 0) {
    return (
      <section className="rounded-2xl bg-panel border border-edge p-8 text-center text-fg-muted">
        Pick at least one car on the left to see ranked track recommendations.
      </section>
    )
  }

  return (
    <section className="rounded-2xl bg-panel border border-edge p-5">
      <header className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">Recommended tracks</h2>
          <p className="text-sm text-fg-muted">Sorted by: {MODE_LABEL[mode]}</p>
        </div>
        <div className="text-sm text-fg-muted">
          {filtered.length === scores.length
            ? `${scores.length} tracks`
            : `${filtered.length} of ${scores.length}`}
        </div>
      </header>

      <div className="flex items-center gap-2 mb-4 text-xs text-fg-muted">
        <span>Show:</span>
        <OwnershipFilter
          value={ownership}
          onChange={setOwnership}
          labels={{ base: `Base (${baseCount})`, paid: `Paid (${scores.length - baseCount})` }}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-fg-muted py-4 text-center">
          No tracks match the current filter.
        </p>
      ) : (
      <ol className="space-y-3">
        {filtered.map((s, idx) => (
          <li
            key={s.track.id}
            className={
              'rounded-xl border p-4 ' +
              (s.track.isFree
                ? 'border-emerald-500/30 bg-emerald-500/[0.04]'
                : 'border-edge bg-ink/60')
            }
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-fg-dim text-sm font-mono shrink-0">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <h3 className="text-base font-semibold text-fg truncate">
                  {s.track.name}
                </h3>
              </div>
              <div className="shrink-0">
                {s.track.isFree ? (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-[10px] uppercase tracking-wider font-semibold whitespace-nowrap">
                    Base content
                  </span>
                ) : (
                  <span className="text-sm text-fg font-medium">
                    {formatPrice(s.track.price)}
                  </span>
                )}
              </div>
            </div>

            <dl className="mt-3 grid grid-cols-[5.5rem,1fr] gap-x-3 gap-y-1.5 text-xs">
              {s.matchingConfigs.length > 0 && (
                <>
                  <dt className="text-[10px] uppercase tracking-wider text-fg-dim pt-0.5">
                    Configs
                  </dt>
                  <dd className="text-fg flex flex-wrap gap-1.5">
                    {s.matchingConfigs.map((c) => (
                      <span
                        key={c.id}
                        className={
                          'px-1.5 py-0.5 rounded border text-[11px] ' +
                          (c.isFree && !s.track.isFree
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-800 dark:text-emerald-200'
                            : 'bg-panel border-edge text-fg')
                        }
                      >
                        {c.name}
                      </span>
                    ))}
                  </dd>
                </>
              )}
              {s.upcomingSeriesNames.length > 0 && (
                <>
                  <dt className="text-[10px] uppercase tracking-wider text-fg-dim pt-0.5">
                    Series
                  </dt>
                  <dd className="text-fg flex flex-wrap gap-1.5">
                    {s.upcomingSeriesNames.map((name) => (
                      <span
                        key={name}
                        className="px-1.5 py-0.5 rounded border border-edge bg-panel text-[11px] text-fg"
                      >
                        {name}
                      </span>
                    ))}
                  </dd>
                </>
              )}
            </dl>

            <div className="mt-3 flex flex-wrap gap-2 text-sm border-t border-edge/50 pt-3">
              <Stat
                label="Weeks"
                sub="this season"
                value={s.upcomingWeeks.toString()}
                emphasized={mode === 'weeks'}
              />
              <Stat
                label="Popularity"
                sub="weighted"
                value={s.popularityScore.toString()}
                emphasized={mode === 'popularity'}
              />
              <Stat
                label="Recurrence"
                sub="past seasons"
                value={`${s.pastSeasonAppearances}/${s.totalPastSeasons}`}
                emphasized={mode === 'recurrence'}
              />
            </div>
          </li>
        ))}
      </ol>
      )}
    </section>
  )
}

function Stat({
  label,
  sub,
  value,
  emphasized,
}: {
  label: string
  sub: string
  value: string
  emphasized: boolean
}) {
  return (
    <div
      className={
        'flex-1 min-w-[6rem] rounded-lg px-3 py-2 text-center border ' +
        (emphasized
          ? 'bg-accent/10 border-accent/40'
          : 'bg-panel/60 border-edge')
      }
    >
      <div className={'text-base font-semibold leading-none ' + (emphasized ? 'text-accent' : 'text-fg')}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-fg-muted mt-1.5">
        {label}
      </div>
      <div className="text-[9px] text-fg-dim">{sub}</div>
    </div>
  )
}
