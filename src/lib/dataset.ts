/// <reference types="vite/client" />
import type { Dataset } from '../types'

export async function loadDataset(): Promise<Dataset> {
  const url = `${import.meta.env.BASE_URL}data/dataset.json`
  const res = await fetch(url, { cache: 'no-cache' })
  const contentType = res.headers.get('content-type') ?? ''
  if (!res.ok || !contentType.includes('application/json')) {
    const body = await res.text()
    throw new Error(`Expected JSON from ${url}, got ${res.status}: ${body.substring(0, 300)}`)
  }
  return (await res.json()) as Dataset
}
