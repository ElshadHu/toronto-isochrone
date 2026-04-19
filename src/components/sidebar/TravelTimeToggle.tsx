'use client'

import { useMapStore } from '@/lib/store'
import { ISOCHRONE_COLORS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import type { TravelTime } from '@/server/types/station'

const TIMES = Object.keys(ISOCHRONE_COLORS).map(Number) as TravelTime[]

export function TravelTimeToggle(): React.ReactElement {
  const selectedTime = useMapStore((s) => s.selectedTime)
  const setSelectedTime = useMapStore((s) => s.setSelectedTime)

  function handleClick(t: TravelTime) {
    if (t === selectedTime) {
      // Step down: 60m -> 30m, 30m -> 15m, 15m -> null
      const currentIndex = TIMES.indexOf(t)
      const prev = currentIndex > 0 ? TIMES[currentIndex - 1] : null
      setSelectedTime(prev ?? null)
    } else {
      setSelectedTime(t)
    }
  }

  return (
    <div>
      <p className="mb-2 text-[11px] font-medium tracking-wide text-zinc-400 uppercase">
        Walking time from station
      </p>
      <div className="flex shrink-0 gap-2">
        {TIMES.map((t) => {
          const isActive = t === selectedTime
          const color = ISOCHRONE_COLORS[t].stroke

          return (
            <Button
              key={t}
              variant="outline"
              size="sm"
              className="flex-1 text-xs transition-colors"
              style={
                isActive ? { borderColor: color, color, backgroundColor: `${color}15` } : undefined
              }
              onClick={() => handleClick(t)}
            >
              {t}m
            </Button>
          )
        })}
      </div>
    </div>
  )
}
