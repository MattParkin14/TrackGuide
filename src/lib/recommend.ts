import type {
  Dataset,
  Series,
  SeriesPopularity,
  Track,
  TrackConfig,
} from '../types'

export type RankMode = 'weeks' | 'popularity' | 'recurrence'

export interface TrackScore {
  track: Track
  /** Total upcoming-season weeks unlocked across selected cars. */
  upcomingWeeks: number
  /** Popularity-weighted upcoming weeks (sum of POP_WEIGHT[series.popularity]). */
  popularityScore: number
  /** Fraction (0..1) of past seasons in which this track appeared in any
   *  series that uses one of the selected cars. */
  recurrence: number
  /** Distinct past seasons in which the track appeared (used for display). */
  pastSeasonAppearances: number
  totalPastSeasons: number
  /** Series names that put the user's selected cars on this track upcoming. */
  upcomingSeriesNames: string[]
  /** Configs of this track that the selected cars actually use. */
  matchingConfigs: TrackConfig[]
}

const POP_WEIGHT: Record<SeriesPopularity, number> = {
  flagship: 4,
  high: 3,
  medium: 2,
  low: 1,
}

interface ConfigIndex {
  byId: Map<string, TrackConfig>
  trackByConfigId: Map<string, Track>
}

function indexConfigs(tracks: Track[]): ConfigIndex {
  const byId = new Map<string, TrackConfig>()
  const trackByConfigId = new Map<string, Track>()
  for (const t of tracks) {
    for (const c of t.configs) {
      byId.set(c.id, c)
      trackByConfigId.set(c.id, t)
    }
  }
  return { byId, trackByConfigId }
}

function seriesUsesAnySelectedCar(series: Series, selected: Set<string>): boolean {
  return series.weeks.some((w) => w.carIds.some((id) => selected.has(id)))
}

export function rankTracks(
  dataset: Dataset,
  selectedCarIds: string[],
  mode: RankMode,
): TrackScore[] {
  if (selectedCarIds.length === 0) return []

  const selected = new Set(selectedCarIds)
  const { byId: configById, trackByConfigId } = indexConfigs(dataset.tracks)
  const currentSeasonId = dataset.seasons.find((s) => s.current)?.id
  const pastSeasonIds = dataset.seasons.filter((s) => !s.current).map((s) => s.id)

  type Acc = {
    track: Track
    matchingConfigs: Map<string, TrackConfig>
    upcomingWeeks: number
    popularityScore: number
    pastSeasonsSeen: Set<string>
    upcomingSeriesNames: Set<string>
  }
  const acc = new Map<string, Acc>()
  const ensure = (track: Track): Acc => {
    let a = acc.get(track.id)
    if (!a) {
      a = {
        track,
        matchingConfigs: new Map(),
        upcomingWeeks: 0,
        popularityScore: 0,
        pastSeasonsSeen: new Set(),
        upcomingSeriesNames: new Set(),
      }
      acc.set(track.id, a)
    }
    return a
  }

  for (const series of dataset.series) {
    if (!seriesUsesAnySelectedCar(series, selected)) continue

    for (const week of series.weeks) {
      // Only count this week if at least one of the selected cars is allowed.
      if (!week.carIds.some((id) => selected.has(id))) continue

      const cfg = configById.get(week.trackConfigId)
      const track = trackByConfigId.get(week.trackConfigId)
      if (!cfg || !track) continue

      const a = ensure(track)
      a.matchingConfigs.set(cfg.id, cfg)

      if (week.seasonId === currentSeasonId) {
        a.upcomingWeeks += 1
        a.popularityScore += POP_WEIGHT[series.popularity]
        a.upcomingSeriesNames.add(series.name)
      } else if (pastSeasonIds.includes(week.seasonId)) {
        a.pastSeasonsSeen.add(week.seasonId)
      }
    }
  }

  const totalPastSeasons = pastSeasonIds.length || 1
  const scores: TrackScore[] = [...acc.values()].map((a) => ({
    track: a.track,
    upcomingWeeks: a.upcomingWeeks,
    popularityScore: a.popularityScore,
    recurrence: a.pastSeasonsSeen.size / totalPastSeasons,
    pastSeasonAppearances: a.pastSeasonsSeen.size,
    totalPastSeasons,
    upcomingSeriesNames: [...a.upcomingSeriesNames].sort(),
    matchingConfigs: [...a.matchingConfigs.values()].sort((x, y) =>
      x.name.localeCompare(y.name),
    ),
  }))

  const primary = (s: TrackScore) =>
    mode === 'weeks' ? s.upcomingWeeks
    : mode === 'popularity' ? s.popularityScore
    : s.recurrence

  scores.sort((a, b) => {
    const p = primary(b) - primary(a)
    if (p !== 0) return p
    const priceCmp = a.track.price - b.track.price
    if (priceCmp !== 0) return priceCmp
    const wkCmp = b.upcomingWeeks - a.upcomingWeeks
    if (wkCmp !== 0) return wkCmp
    return a.track.name.localeCompare(b.track.name)
  })
  return scores
}
