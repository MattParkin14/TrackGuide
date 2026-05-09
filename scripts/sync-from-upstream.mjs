#!/usr/bin/env node
/**
 * Phase 2 data pipeline.
 *
 * Pulls iRacing schedule + catalog data from the upstream community repo
 * adrianulima/my-racing-planner (MIT-licensed; the maintainer fetches official
 * iRacing data each season and commits the result), transforms it into our
 * Dataset shape, and writes public/data/dataset.json.
 *
 * - Catalog (cars, tracks) comes from the most recent commit only.
 * - Per-season schedules come from one pinned commit per season — chosen as
 *   the commit where that season's data was first published, so subsequent
 *   updates within the same season don't drift the historical record.
 *
 * Usage:
 *   node scripts/sync-from-upstream.mjs
 *
 * The script is idempotent. The upstream mirror is kept under .upstream/
 * (gitignored) and only re-fetched when needed.
 *
 * Attribution: see README.md. Data is iRacing's underlying facts; we redistribute
 * only the schedule/catalog facts in derived form, with attribution to the upstream
 * MIT repo.
 */

import { execFile } from 'node:child_process'
import { mkdir, readFile, writeFile, access } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const exec = promisify(execFile)

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const UPSTREAM_DIR = resolve(ROOT, '.upstream', 'my-racing-planner')
const UPSTREAM_URL = 'https://github.com/adrianulima/my-racing-planner.git'
const DATASET_PATH = resolve(ROOT, 'public', 'data', 'dataset.json')

// Pinned commit per season. Each is the commit where that season's data was
// initially published in the upstream repo. Order: oldest -> newest.
// Update this list each quarter when a new season ships.
const SEASONS = [
  { id: '2025-S2', year: 2025, quarter: 2, sha: '87b5abc', current: false },
  { id: '2025-S3', year: 2025, quarter: 3, sha: '5eb9d90', current: false },
  { id: '2025-S4', year: 2025, quarter: 4, sha: 'af28aff', current: false },
  { id: '2026-S1', year: 2026, quarter: 1, sha: 'be61e63', current: false },
  { id: '2026-S2', year: 2026, quarter: 2, sha: '6fd0f1e', current: true  },
]

// =====================================================================
// upstream mirror

async function ensureUpstream() {
  try {
    await access(resolve(UPSTREAM_DIR, '.git'))
    process.stdout.write('upstream mirror exists, fetching... ')
    await exec('git', ['-C', UPSTREAM_DIR, 'fetch', 'origin', '--quiet'])
    console.log('done')
  } catch {
    console.log(`cloning ${UPSTREAM_URL} into .upstream/...`)
    await mkdir(dirname(UPSTREAM_DIR), { recursive: true })
    await exec('git', ['clone', '--quiet', UPSTREAM_URL, UPSTREAM_DIR])
  }
}

async function readUpstreamFile(sha, relPath) {
  const { stdout } = await exec('git', ['-C', UPSTREAM_DIR, 'show', `${sha}:${relPath}`], {
    maxBuffer: 16 * 1024 * 1024,
  })
  return JSON.parse(stdout)
}

// =====================================================================
// transform

/** Adrian's track entries are flat (one row per track-config). Group by
 *  parent track name into our Track { configs[] } shape. */
function transformTracks(adrianTracksObj) {
  const arr = Object.values(adrianTracksObj)
  const groups = new Map() // name -> entries[]
  for (const t of arr) {
    const key = t.name
    const list = groups.get(key) ?? []
    list.push(t)
    groups.set(key, list)
  }

  const tracks = []
  for (const [name, entries] of groups) {
    entries.sort((a, b) => a.id - b.id)
    const parentEntry = entries.find((e) => e.config === undefined || e.config === e.name) ?? entries[0]
    const trackId = `trk_${parentEntry.id}`
    const category = mapTrackCategory(parentEntry.categories?.[0] ?? 'road')

    // The package price applies to the whole track. Use the max across configs
    // (rare cases where a single config is a free promo while others aren't —
    // we want the worst-case the user might pay).
    const priceMax = entries.reduce((m, e) => Math.max(m, e.price ?? 0), 0)
    const allFree = entries.every((e) => e.free)

    const configs = entries.map((e) => ({
      id: `cfg_${e.id}`,
      parentTrackId: trackId,
      name: e.config && e.config !== e.name ? e.config : 'Default',
      length: 0, // upstream doesn't include length; fill in from a future source
      category: mapTrackCategory(e.categories?.[0] ?? 'road'),
      isFree: !!e.free,
    }))

    tracks.push({
      id: trackId,
      name,
      price: priceMax,
      category,
      isFree: allFree,
      configs,
    })
  }
  tracks.sort((a, b) => a.name.localeCompare(b.name))
  return tracks
}

function transformCars(adrianCarsObj) {
  const arr = Object.values(adrianCarsObj)
  return arr
    .map((c) => ({
      id: `car_${c.id}`,
      name: c.name,
      price: c.price ?? 0,
      category: mapCarCategory(c.categories?.[0] ?? 'sports_car'),
      licenseClass: 'D', // upstream doesn't expose per-car license; D is a safe display default
      isFree: !!c.free,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

function mapTrackCategory(c) {
  if (c === 'road') return 'road'
  if (c === 'oval') return 'oval'
  if (c === 'dirt_oval') return 'dirt_oval'
  if (c === 'dirt_road') return 'dirt_road'
  return 'road'
}

function mapCarCategory(c) {
  switch (c) {
    case 'sports_car':
    case 'formula_car':
    case 'oval':
    case 'dirt_oval':
    case 'dirt_road':
      return c
    default:
      return 'sports_car'
  }
}

function mapPopularity(adrianSeries) {
  // Until we have real participation data, derive popularity from the license
  // class (higher classes tend to be smaller fields) and whether the series
  // is fixed-setup (more popular). Crude but defensible.
  const letter = adrianSeries.license?.letter ?? 'D'
  const baseFromLicense =
    letter === 'D' || letter === 'C' ? 3
    : letter === 'B' ? 2
    : letter === 'A' || letter === 'P' ? 1
    : 2
  const popLevels = ['low', 'medium', 'high', 'flagship']
  const idx = Math.min(popLevels.length - 1, baseFromLicense + (adrianSeries.fixed ? 1 : 0))
  return popLevels[idx]
}

function transformSeries(perSeasonSeriesData) {
  // perSeasonSeriesData: array of { seasonId, seriesObj } where seriesObj is
  // Adrian's series object for that season. The same seriesId may appear in
  // multiple seasons; we merge their weeks.
  const merged = new Map() // seriesId -> our Series

  for (const { seasonId, seriesObj } of perSeasonSeriesData) {
    const arr = Object.values(seriesObj)
    for (const s of arr) {
      const ourId = `ser_${s.id}`
      let entry = merged.get(ourId)
      if (!entry) {
        entry = {
          id: ourId,
          name: s.name,
          category: mapCarCategory(s.category),
          licenseClass: s.license?.letter ?? 'D',
          popularity: mapPopularity(s),
          weeks: [],
        }
        merged.set(ourId, entry)
      }
      const carIds = (s.cars ?? []).map((cid) => `car_${cid}`)
      for (const w of s.weeks ?? []) {
        if (!w.track?.id) continue
        entry.weeks.push({
          seasonId,
          week: (w.weekNum ?? 0) + 1,
          trackConfigId: `cfg_${w.track.id}`,
          carIds,
        })
      }
    }
  }

  return [...merged.values()].sort((a, b) => a.name.localeCompare(b.name))
}

// =====================================================================
// main

async function main() {
  await ensureUpstream()

  // Per-season raw data
  const perSeason = []
  for (const s of SEASONS) {
    process.stdout.write(`  reading ${s.id} @ ${s.sha}... `)
    const seriesObj = await readUpstreamFile(s.sha, 'src/ir-data/series.json')
    perSeason.push({ seasonId: s.id, seriesObj })
    console.log(`${Object.keys(seriesObj).length} series`)
  }

  // Catalog from the most recent commit
  const latest = SEASONS.at(-1)
  console.log(`reading catalog (cars, tracks) @ ${latest.sha}...`)
  const carsObj = await readUpstreamFile(latest.sha, 'src/ir-data/cars.json')
  const tracksObj = await readUpstreamFile(latest.sha, 'src/ir-data/tracks.json')

  const cars = transformCars(carsObj)
  const tracks = transformTracks(tracksObj)
  const series = transformSeries(perSeason)
  const seasons = SEASONS.map((s) => ({ id: s.id, year: s.year, quarter: s.quarter, current: s.current }))

  // Drop weeks whose trackConfigId or whose carIds reference unknown ids.
  // Older seasons may reference a track or car that no longer exists in the
  // current catalog (retired content); we don't have catalog snapshots for
  // those quarters, so we simply skip those weeks rather than show a broken row.
  const carIdSet = new Set(cars.map((c) => c.id))
  const cfgIdSet = new Set(tracks.flatMap((t) => t.configs.map((c) => c.id)))
  let dropped = 0
  for (const s of series) {
    const before = s.weeks.length
    s.weeks = s.weeks.filter((w) => {
      if (!cfgIdSet.has(w.trackConfigId)) return false
      const filteredCarIds = w.carIds.filter((id) => carIdSet.has(id))
      if (filteredCarIds.length === 0) return false
      w.carIds = filteredCarIds
      return true
    })
    dropped += before - s.weeks.length
  }
  if (dropped > 0) console.log(`dropped ${dropped} weeks referencing retired content`)

  // Drop series that ended up with no weeks at all.
  const finalSeries = series.filter((s) => s.weeks.length > 0)

  // Drop catalog entries that don't appear anywhere in the 5-season window.
  // The recommender has nothing to say about them, so they only clutter the
  // selector. Anything appearing as either an allowed car OR a scheduled
  // track-config in any week stays.
  const usedCarIds = new Set(finalSeries.flatMap((s) => s.weeks.flatMap((w) => w.carIds)))
  const usedConfigIds = new Set(finalSeries.flatMap((s) => s.weeks.map((w) => w.trackConfigId)))

  const filteredCars = cars.filter((c) => usedCarIds.has(c.id))
  const filteredTracks = tracks
    .map((t) => ({ ...t, configs: t.configs.filter((c) => usedConfigIds.has(c.id)) }))
    .filter((t) => t.configs.length > 0)

  console.log(
    `filtered orphan catalog entries: ` +
      `${cars.length - filteredCars.length} cars, ` +
      `${tracks.length - filteredTracks.length} tracks dropped`,
  )

  const dataset = {
    _meta: {
      version: 2,
      generatedAt: new Date().toISOString().slice(0, 10),
      source: 'adrianulima/my-racing-planner (MIT)',
      seasonsCovered: SEASONS.map((s) => s.id),
    },
    cars: filteredCars,
    tracks: filteredTracks,
    seasons,
    series: finalSeries,
  }

  await writeFile(DATASET_PATH, JSON.stringify(dataset, null, 2) + '\n')
  console.log(
    `wrote ${DATASET_PATH}: ${filteredCars.length} cars, ${filteredTracks.length} tracks ` +
      `(${filteredTracks.reduce((n, t) => n + t.configs.length, 0)} configs), ` +
      `${finalSeries.length} series, ${seasons.length} seasons, ` +
      `${finalSeries.reduce((n, s) => n + s.weeks.length, 0)} total weeks.`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
