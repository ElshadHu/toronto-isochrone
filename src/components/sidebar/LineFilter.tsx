'use client'

import { useMapStore } from '@/lib/store'
import { LINE_META } from '@/lib/constants'
import { Checkbox } from '@/components/ui/checkbox'
import type { LineId } from '@/server/types/station'

const LINE_IDS = Object.keys(LINE_META) as LineId[]

export function LineFilter(): React.ReactElement {
  const enabledLines = useMapStore((s) => s.enabledLines)
  const toggleLine = useMapStore((s) => s.toggleLine)

  return (
    <div className="hidden md:block">
      <p className="mb-2 text-[11px] font-medium tracking-wide text-zinc-500 uppercase">
        Filter lines
      </p>
      <div className="flex flex-col gap-2">
        {LINE_IDS.map((lineId) => {
          const meta = LINE_META[lineId]
          const isChecked = enabledLines.has(lineId)

          return (
            <label
              key={lineId}
              className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 transition-colors hover:bg-white/5"
            >
              <Checkbox checked={isChecked} onCheckedChange={() => toggleLine(lineId)} />
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: meta.color }}
              />
              <span className="text-xs text-zinc-300">{meta.name}</span>
            </label>
          )
        })}
      </div>
    </div>
  )
}
