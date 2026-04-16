export type LineId = '1' | '2' | '4'

export type TravelTime = 15 | 30 | 60

export type Station = {
  readonly id: string
  readonly name: string
  readonly lat: number
  readonly lng: number
  readonly lines: readonly LineId[]
}
