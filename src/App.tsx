import { useEffect, useMemo, useState } from 'react'
import type { Dataset } from './types'
import { loadDataset } from './lib/dataset'
import { rankTracks, type RankMode } from './lib/recommend'
import { findSeriesForCars } from './lib/series-finder'
import { useTheme } from './lib/theme'
import { CarSelector } from './components/CarSelector'
import { ResultsList } from './components/ResultsList'
import { SeriesList } from './components/SeriesList'

type View = 'tracks' | 'series'

const RANK_MODES: { value: RankMode; label: string; helper: string }[] = [
  {
    value: 'weeks',
    label: 'Most weeks raceable',
    helper: 'Sort by the number of upcoming-season weeks the track unlocks for your selected cars.',
  },
  {
    value: 'popularity',
    label: 'Series popularity weighted',
    helper: 'Weights each upcoming week by how busy the series is (flagship > high > medium > low).',
  },
  {
    value: 'recurrence',
    label: 'Track recurrence (last 8 seasons)',
    helper: 'Surfaces tracks that show up season after season — durable picks vs one-season wonders.',
  },
]

export function App() {
  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [mode, setMode] = useState<RankMode>('weeks')
  const [view, setView] = useState<View>('tracks')
  const { theme, toggle: toggleTheme } = useTheme()

  useEffect(() => {
    let cancelled = false
    loadDataset()
      .then((d) => { if (!cancelled) setDataset(d) })
      .catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)) })
    return () => { cancelled = true }
  }, [])

  const scores = useMemo(() => {
    if (!dataset || view !== 'tracks') return []
    return rankTracks(dataset, [...selected], mode)
  }, [dataset, selected, mode, view])

  const seriesMatches = useMemo(() => {
    if (!dataset || view !== 'series') return []
    return findSeriesForCars(dataset, [...selected])
  }, [dataset, selected, view])

  const toggle = (carId: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(carId)) next.delete(carId)
      else next.add(carId)
      return next
    })
  }

  const clear = () => setSelected(new Set())

  const modeHelper = RANK_MODES.find((m) => m.value === mode)?.helper

  return (
    <div className="min-h-screen">
      <header className="border-b border-edge bg-panel/60 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-baseline gap-3">
            <h1 className="text-xl font-bold tracking-tight">
              <span className="text-accent">Track</span>Guide
            </h1>
            <span className="text-xs text-fg-muted hidden sm:inline">
              iRacing track recommender
            </span>
          </div>
          <div className="flex items-center gap-2">
            {view === 'tracks' && (
              <>
                <label htmlFor="rank-mode" className="text-xs text-fg-muted hidden sm:inline">
                  Rank by:
                </label>
                <select
                  id="rank-mode"
                  value={mode}
                  onChange={(e) => setMode(e.target.value as RankMode)}
                  className="bg-ink border border-edge rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
                >
                  {RANK_MODES.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </>
            )}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="rounded-lg border border-edge bg-ink hover:border-accent/60 text-fg p-2 transition"
            >
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
        </div>
        {view === 'tracks' && modeHelper && (
          <div className="max-w-6xl mx-auto px-5 pb-3 -mt-1 text-xs text-fg-dim">
            {modeHelper}
          </div>
        )}
      </header>

      <main className="max-w-6xl mx-auto px-5 py-6 grid lg:grid-cols-2 gap-5">
        {error && (
          <div className="lg:col-span-2 rounded-xl border border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-200 p-4 text-sm">
            Failed to load data: {error}
          </div>
        )}
        {!dataset && !error && (
          <div className="lg:col-span-2 text-center text-fg-muted py-20">Loading…</div>
        )}
        {dataset && (
          <>
            <CarSelector
              cars={dataset.cars}
              selected={selected}
              onToggle={toggle}
              onClear={clear}
            />
            <div className="flex flex-col gap-3">
              <div
                role="tablist"
                aria-label="Result view"
                className="inline-flex rounded-lg border border-edge bg-panel p-1 self-start"
              >
                <TabButton active={view === 'tracks'} onClick={() => setView('tracks')}>
                  Tracks to buy
                </TabButton>
                <TabButton active={view === 'series'} onClick={() => setView('series')}>
                  Series for my cars
                </TabButton>
              </div>
              {view === 'tracks' ? (
                <ResultsList scores={scores} mode={mode} />
              ) : (
                <SeriesList matches={seriesMatches} selectedCount={selected.size} />
              )}
            </div>
          </>
        )}
      </main>

      <footer className="max-w-6xl mx-auto px-5 py-8 text-xs text-fg-dim space-y-1">
        <p>
          Schedule and catalog data sourced from{' '}
          <a
            href="https://github.com/adrianulima/my-racing-planner"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-fg"
          >
            adrianulima/my-racing-planner
          </a>{' '}
          (MIT). Not affiliated with iRacing or iRacing.com Motorsport Simulations, LLC.
        </p>
        <p>
          Data covers the current season plus four prior seasons. Popularity scores are
          a heuristic, not real participation numbers.
        </p>
      </footer>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={
        'px-3 py-1.5 rounded-md text-sm transition ' +
        (active
          ? 'bg-ink text-accent border border-accent/40'
          : 'text-fg-muted hover:text-fg')
      }
    >
      {children}
    </button>
  )
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}
