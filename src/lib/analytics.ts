/// <reference types="vite/client" />
// Thin analytics wrapper.
// Page views and geographic location are captured automatically by the
// Cloudflare Web Analytics beacon added to index.html.
// Custom in-app events are forwarded to Cloudflare Zaraz when available,
// and logged to the console in development.

type EventName =
  | 'car_toggled'
  | 'cars_cleared'
  | 'view_changed'
  | 'rank_mode_changed'

type EventProps = Record<string, string | number | boolean>

declare global {
  interface Window {
    zaraz?: { track: (event: string, props?: EventProps) => void }
  }
}

export function track(name: EventName, props?: EventProps): void {
  if (import.meta.env.DEV) {
    console.debug('[analytics]', name, props)
  }
  window.zaraz?.track(name, props)
}
