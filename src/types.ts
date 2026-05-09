export type Category =
  | 'oval'
  | 'dirt_oval'
  | 'sports_car'
  | 'formula_car'
  | 'dirt_road'

export type LicenseClass = 'R' | 'D' | 'C' | 'B' | 'A' | 'P'

export interface Car {
  id: string
  name: string
  /** USD list price (0 for free content). */
  price: number
  category: Category
  licenseClass: LicenseClass
  isFree: boolean
}

export interface TrackConfig {
  id: string
  parentTrackId: string
  name: string
  /** Length in km. */
  length: number
  category: Category
  isFree: boolean
}

export interface Track {
  id: string
  name: string
  /** USD list price for the whole track package. 0 if free. */
  price: number
  category: Category
  isFree: boolean
  configs: TrackConfig[]
}

export interface SeriesWeek {
  /** Season id, e.g. "2026-S2". */
  seasonId: string
  /** 1-indexed week within the season. */
  week: number
  /** Track config id used that week. */
  trackConfigId: string
  /** Cars allowed in that series. */
  carIds: string[]
}

export type SeriesPopularity = 'low' | 'medium' | 'high' | 'flagship'

export interface Series {
  id: string
  name: string
  category: Category
  licenseClass: LicenseClass
  /** Coarse popularity tier; proxy for SOF/splits when we don't have live participation data. */
  popularity: SeriesPopularity
  weeks: SeriesWeek[]
}

export interface Season {
  id: string
  year: number
  quarter: 1 | 2 | 3 | 4
  /** True if this is the upcoming/current season; false for historical. */
  current: boolean
}

export interface Dataset {
  cars: Car[]
  tracks: Track[]
  seasons: Season[]
  series: Series[]
}
