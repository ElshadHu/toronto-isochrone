export const LINE_ID = {
  ONE: '1',
  TWO: '2',
  FOUR: '4',
} as const

export type LineId = (typeof LINE_ID)[keyof typeof LINE_ID]

export type TravelTime = 15 | 30 | 60

export type Station = {
  readonly id: string
  readonly name: string
  readonly lat: number
  readonly lng: number
  readonly lines: readonly LineId[]
}
