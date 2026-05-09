import type { RankMode, TrackScore } from '../lib/recommend'
import { formatPrice } from '../lib/format'

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
  if (scores.length === 0) {
    return (
      <section className="rounded-2xl bg-panel border border-edge p-8 text-center text-slate-400">
        Pick at least one car on the left to see ranked track recommendations.
      </section>
    )
  }

  return (
    <section className="rounded-2xl bg-panel border border-edge p-5">
      <header className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Recommended tracks</h2>
          <p className="text-sm text-slate-400">Sorted by: {MODE_LABEL[mode]}</p>
        </div>
        <div className="text-sm text-slate-400">{scores.length} tracks</div>
      </header>

      <ol className="space-y-3">
        {scores.map((s, idx) => (
          <li
            key={s.track.id}
            className="rounded-xl border border-edge bg-ink/60 p-4 flex flex-col md:flex-row md:items-start md:justify-between gap-3"
          >
            <div className="flex-1">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-slate-500 text-sm font-mono w-6">{idx + 1}.</span>
                <h3 className="text-base font-semibold text-slate-100">{s.track.name}</h3>
                {s.track.isFree ? (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[10px] uppercase tracking-wider font-semibold">
                    Base content
                  </span>
                ) : (
                  <span className="text-xs text-slate-500">{formatPrice(s.track.price)}</span>
                )}
              </div>
              {s.matchingConfigs.length > 0 && (
                <p className="text-xs text-slate-400 mt-1 ml-8">
                  Configs used:{' '}
                  {s.matchingConfigs.map((c, i) => (
                    <span key={c.id}>
                      {i > 0 && ' · '}
                      <span>{c.name}</span>
                      {c.isFree && !s.track.isFree && (
                        <span className="ml-1 text-emerald-400 text-[10px] uppercase tracking-wider">free</span>
                      )}
                    </span>
                  ))}
                </p>
              )}
              {s.upcomingSeriesNames.length > 0 && (
                <p className="text-xs text-slate-400 mt-1 ml-8">
                  Upcoming in: {s.upcomingSeriesNames.join(', ')}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-3 md:gap-4 text-sm md:justify-end">
              <Stat
                label="Weeks (next season)"
                value={s.upcomingWeeks.toString()}
                emphasized={mode === 'weeks'}
              />
              <Stat
                label="Popularity score"
                value={s.popularityScore.toString()}
                emphasized={mode === 'popularity'}
              />
              <Stat
                label="Recurrence"
                value={`${s.pastSeasonAppearances}/${s.totalPastSeasons}`}
                emphasized={mode === 'recurrence'}
              />
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

function Stat({
  label,
  value,
  emphasized,
}: {
  label: string
  value: string
  emphasized: boolean
}) {
  return (
    <div
      className={
        'rounded-lg px-3 py-2 min-w-[7rem] text-center ' +
        (emphasized
          ? 'bg-accent/10 border border-accent/40'
          : 'bg-panel border border-edge')
      }
    >
      <div className={'text-base font-semibold ' + (emphasized ? 'text-accent' : 'text-slate-100')}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-slate-400 mt-0.5">{label}</div>
    </div>
  )
}
