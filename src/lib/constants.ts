import type { LineId, TravelTime } from '@/server/types/station'

// Map config
export const CARTO_DARK_MATTER =
  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json' as const

export const TORONTO_CENTER = [-79.3832, 43.6532] as const // [lng, lat] — GeoJSON order
export const DEFAULT_ZOOM = 11

// TTC line metadata — keyed by LineId
export const LINE_META: Record<LineId, { readonly name: string; readonly color: string }> = {
  '1': { name: 'Line 1 (Yonge-University)', color: '#D5C82B' },
  '2': { name: 'Line 2 (Bloor-Danforth)', color: '#008000' },
  '4': { name: 'Line 4 (Sheppard)', color: '#B300B3' },
  '5': { name: 'Line 5 (Eglinton)', color: '#FF8000' },
  '6': { name: 'Line 6 (Finch West)', color: '#A8A9AD' },
} as const satisfies Record<LineId, { name: string; color: string }>

// Isochrone fill + stroke per travel-time bucket
export const ISOCHRONE_COLORS: Record<
  TravelTime,
  { readonly fill: string; readonly stroke: string }
> = {
  15: { fill: 'rgba(0, 255, 136, 0.25)', stroke: '#00FF88' },
  30: { fill: 'rgba(255, 170, 0, 0.20)', stroke: '#FFAA00' },
  60: { fill: 'rgba(255, 68, 68, 0.15)', stroke: '#FF4444' },
} as const satisfies Record<TravelTime, { fill: string; stroke: string }>
