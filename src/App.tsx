import { useEffect, useMemo, useState } from 'react'
import type { Dataset } from './types'
import { loadDataset } from './lib/dataset'
import { rankTracks, type RankMode } from './lib/recommend'
import { CarSelector } from './components/CarSelector'
import { ResultsList } from './components/ResultsList'

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

  useEffect(() => {
    let cancelled = false
    loadDataset()
      .then((d) => { if (!cancelled) setDataset(d) })
      .catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)) })
    return () => { cancelled = true }
  }, [])

  const scores = useMemo(() => {
    if (!dataset) return []
    return rankTracks(dataset, [...selected], mode)
  }, [dataset, selected, mode])

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
            <span className="text-xs text-slate-400 hidden sm:inline">
              iRacing track recommender
            </span>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="rank-mode" className="text-xs text-slate-400 hidden sm:inline">
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
          </div>
        </div>
        {modeHelper && (
          <div className="max-w-6xl mx-auto px-5 pb-3 -mt-1 text-xs text-slate-500">
            {modeHelper}
          </div>
        )}
      </header>

      <main className="max-w-6xl mx-auto px-5 py-6 grid lg:grid-cols-2 gap-5">
        {error && (
          <div className="lg:col-span-2 rounded-xl border border-red-500/40 bg-red-500/10 text-red-200 p-4 text-sm">
            Failed to load data: {error}
          </div>
        )}
        {!dataset && !error && (
          <div className="lg:col-span-2 text-center text-slate-400 py-20">Loading…</div>
        )}
        {dataset && (
          <>
            <CarSelector
              cars={dataset.cars}
              selected={selected}
              onToggle={toggle}
              onClear={clear}
            />
            <ResultsList scores={scores} mode={mode} />
          </>
        )}
      </main>

      <footer className="max-w-6xl mx-auto px-5 py-8 text-xs text-slate-500">
        Seed data is hand-curated for prototype purposes. Schedule, prices, and content
        are illustrative — not authoritative iRacing data.
      </footer>
    </div>
  )
}
