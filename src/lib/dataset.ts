/// <reference types="vite/client" />
import type { Dataset } from '../types'

export async function loadDataset(): Promise<Dataset> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/dataset.json`, { cache: 'no-cache' })
  if (!res.ok) throw new Error(`dataset fetch failed: ${res.status}`)
  return (await res.json()) as Dataset
}
