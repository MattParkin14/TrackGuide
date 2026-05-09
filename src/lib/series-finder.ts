import type { Car, Dataset, Series, Track, TrackConfig } from '../types'

export interface SeriesMatch {
  series: Series
  /** Cars the user has selected that are also eligible in this series. */
  matchedCars: Car[]
  /** All cars eligible in this series (for context). */
  allCarsInSeries: Car[]
  /** Number of weeks in the current season. */
  upcomingWeekCount: number
  /** Distinct tracks scheduled this season (sorted by name). */
  upcomingTracks: Track[]
  /** Distinct configs scheduled this season (sorted by parent track + config name). */
  upcomingConfigs: TrackConfig[]
  /** Subset of upcoming tracks that are part of the iRacing base package. */
  freeUpcomingTracks: Track[]
  /** Subset of upcoming tracks the user would need to buy. */
  paidUpcomingTracks: Track[]
}

/** Returns one entry per series that includes at least one selected car, with
 *  upcoming-season scheduling details. Sorted with the most actionable series
 *  (most upcoming weeks for the user) first. */
export function findSeriesForCars(
  dataset: Dataset,
  selectedCarIds: string[],
): SeriesMatch[] {
  if (selectedCarIds.length === 0) return []

  const selected = new Set(selectedCarIds)
  const carById = new Map(dataset.cars.map((c) => [c.id, c]))
  const trackByConfigId = new Map<string, Track>()
  const configById = new Map<string, TrackConfig>()
  for (const t of dataset.tracks) {
    for (const c of t.configs) {
      trackByConfigId.set(c.id, t)
      configById.set(c.id, c)
    }
  }
  const currentSeasonId = dataset.seasons.find((s) => s.current)?.id

  const out: SeriesMatch[] = []

  for (const series of dataset.series) {
    const eligibleCarIdsInSeries = new Set<string>()
    for (const w of series.weeks) for (const id of w.carIds) eligibleCarIdsInSeries.add(id)
    if (![...eligibleCarIdsInSeries].some((id) => selected.has(id))) continue

    const matchedCars = [...eligibleCarIdsInSeries]
      .filter((id) => selected.has(id))
      .map((id) => carById.get(id))
      .filter((c): c is Car => !!c)
      .sort((a, b) => a.name.localeCompare(b.name))

    const allCarsInSeries = [...eligibleCarIdsInSeries]
      .map((id) => carById.get(id))
      .filter((c): c is Car => !!c)
      .sort((a, b) => a.name.localeCompare(b.name))

    const upcomingWeeks = series.weeks.filter((w) => w.seasonId === currentSeasonId)
    const upcomingConfigIds = new Set<string>()
    for (const w of upcomingWeeks) upcomingConfigIds.add(w.trackConfigId)

    const upcomingConfigs = [...upcomingConfigIds]
      .map((id) => configById.get(id))
      .filter((c): c is TrackConfig => !!c)
      .sort((a, b) => {
        const aTrack = trackByConfigId.get(a.id)?.name ?? ''
        const bTrack = trackByConfigId.get(b.id)?.name ?? ''
        return aTrack.localeCompare(bTrack) || a.name.localeCompare(b.name)
      })

    const upcomingTrackIds = new Set<string>()
    const upcomingTracks: Track[] = []
    for (const cfgId of upcomingConfigIds) {
      const t = trackByConfigId.get(cfgId)
      if (t && !upcomingTrackIds.has(t.id)) {
        upcomingTrackIds.add(t.id)
        upcomingTracks.push(t)
      }
    }
    upcomingTracks.sort((a, b) => a.name.localeCompare(b.name))
    const freeUpcomingTracks = upcomingTracks.filter((t) => t.isFree)
    const paidUpcomingTracks = upcomingTracks.filter((t) => !t.isFree)

    out.push({
      series,
      matchedCars,
      allCarsInSeries,
      upcomingWeekCount: upcomingWeeks.length,
      upcomingTracks,
      upcomingConfigs,
      freeUpcomingTracks,
      paidUpcomingTracks,
    })
  }

  out.sort((a, b) => {
    const w = b.upcomingWeekCount - a.upcomingWeekCount
    if (w !== 0) return w
    return a.series.name.localeCompare(b.series.name)
  })

  return out
}
