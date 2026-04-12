// Map config
export const CARTO_DARK_MATTER =
  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json' as const

export const TORONTO_CENTER = [-79.3832, 43.6532] as const // [lng, lat] — GeoJSON order
export const DEFAULT_ZOOM = 11

// TTC line brand colours
export const LINE_COLORS = {
  'line-1': '#FFD700', // Yellow — Yonge-University
  'line-2': '#00A651', // Green  — Bloor-Danforth
  'line-4': '#A2559F', // Purple — Sheppard
} as const

// Isochrone fill + stroke per travel-time bucket
export const ISOCHRONE_COLORS = {
  15: { fill: 'rgba(0, 255, 136, 0.25)', stroke: '#00FF88' },
  30: { fill: 'rgba(255, 170, 0, 0.20)', stroke: '#FFAA00' },
  60: { fill: 'rgba(255, 68, 68, 0.15)', stroke: '#FF4444' },
} as const
