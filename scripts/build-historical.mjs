#!/usr/bin/env node
// Synthesizes 8 seasons of historical schedule appearances from a compact
// recurrence table. Reads public/data/dataset.json (current season only),
// merges historical weeks into series.weeks, writes back to the same file.
//
// In Phase 2 this script will be replaced by a real scraper that emits the
// same dataset.json shape. The recurrence table here is editable so we can
// tune the seed without touching the dataset structure.

import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const datasetPath = resolve(__dirname, '..', 'public', 'data', 'dataset.json')

// Recurrence rates: number of past 8 seasons (chronological, oldest first)
// in which each track config was used by the series. Pattern strings are
// 8 chars, '1' = used that season, '0' = skipped. Order matches HISTORY_SEASONS.
const HISTORY_SEASONS = [
  '2024-S2', '2024-S3', '2024-S4',
  '2025-S1', '2025-S2', '2025-S3', '2025-S4',
  '2026-S1',
]

const RECURRENCE = {
  ser_gt3_challenge: {
    cfg_spa_gp:            '11111111',
    cfg_watkins_boot:      '11101111',
    cfg_road_america_full: '11011110',
    cfg_nurb_gp:           '10110111',
    cfg_nurb_nords:        '00100101',
    cfg_charlotte_roval:   '01101110',
    cfg_daytona_road:      '11010110',
    cfg_long_beach_full:   '00010111',
    cfg_lime_rock_gp:      '00101010',
    cfg_summit_main:       '00010001',
  },
  ser_lmp2_proto: {
    cfg_spa_gp:            '11111111',
    cfg_watkins_boot:      '11111110',
    cfg_road_america_full: '11110111',
    cfg_daytona_road:      '11111110',
    cfg_nurb_combined:     '01010101',
    cfg_long_beach_full:   '00010111',
    cfg_charlotte_roval:   '11011110',
    cfg_summit_main:       '00000010',
    cfg_lime_rock_gp:      '00000010',
  },
  ser_skip_barber: {
    cfg_lime_rock_gp:      '11111111',
    cfg_lime_rock_classic: '10111011',
    cfg_lime_rock_chicane: '01010101',
    cfg_summit_main:       '11111111',
    cfg_summit_shenandoah: '11011101',
    cfg_watkins_cup:       '11101111',
    cfg_road_america_full: '11011010',
    cfg_long_beach_full:   '00001010',
  },
  ser_mx5: {
    cfg_lime_rock_gp:      '11111111',
    cfg_lime_rock_classic: '10111011',
    cfg_summit_main:       '11111111',
    cfg_summit_shenandoah: '01011110',
    cfg_watkins_cup:       '11111101',
    cfg_road_america_full: '10111010',
    cfg_charlotte_roval:   '01011010',
    cfg_long_beach_full:   '00010111',
  },
  ser_nascar_truck: {
    cfg_daytona_oval:      '11111111',
    cfg_charlotte_oval:    '11111111',
    cfg_bristol_oval:      '11101110',
  },
  ser_arca: {
    cfg_daytona_oval:      '11111110',
    cfg_charlotte_oval:    '11111111',
    cfg_bristol_oval:      '01110111',
  },
  ser_fr35: {
    cfg_spa_gp:            '11111111',
    cfg_nurb_gp:           '11011011',
    cfg_road_america_full: '10110110',
    cfg_watkins_boot:      '11010101',
    cfg_long_beach_full:   '00001011',
    cfg_lime_rock_gp:      '00100100',
    cfg_summit_main:       '00010001',
  },
  ser_dirt_lm: {
    cfg_bristol_dirt_oval: '11111111',
  },
}

const raw = await readFile(datasetPath, 'utf8')
const dataset = JSON.parse(raw)

// Strip any previously-injected historical entries so this script is
// idempotent — keep only weeks for the current season.
const currentSeasonId = dataset.seasons.find((s) => s.current)?.id
if (!currentSeasonId) {
  console.error('No current season flagged in dataset.json')
  process.exit(1)
}

let appended = 0
for (const series of dataset.series) {
  series.weeks = series.weeks.filter((w) => w.seasonId === currentSeasonId)

  const table = RECURRENCE[series.id]
  if (!table) continue

  // Carry the same carIds the series uses in the current season.
  const carIds = series.weeks[0]?.carIds ?? []

  for (let i = 0; i < HISTORY_SEASONS.length; i++) {
    const seasonId = HISTORY_SEASONS[i]
    let week = 1
    for (const [cfgId, pattern] of Object.entries(table)) {
      if (pattern[i] === '1') {
        series.weeks.push({
          seasonId,
          week: week++,
          trackConfigId: cfgId,
          carIds: [...carIds],
        })
        appended++
      }
    }
  }
}

await writeFile(datasetPath, JSON.stringify(dataset, null, 2) + '\n')
console.log(`Injected ${appended} historical week entries across ${Object.keys(RECURRENCE).length} series.`)
