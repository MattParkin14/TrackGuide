import type { Category } from '../types'

export const CATEGORY_LABEL: Record<Category, string> = {
  oval: 'Oval',
  dirt_oval: 'Dirt Oval',
  sports_car: 'Sports Car',
  formula_car: 'Formula',
  dirt_road: 'Dirt Road',
}

export function formatPrice(usd: number): string {
  if (usd === 0) return 'Free'
  return `$${usd.toFixed(2)}`
}
