import * as React from 'react'
import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'flex h-8 w-full min-w-0 rounded-md border border-white/10 bg-zinc-800 px-3 py-1 text-xs text-zinc-200 shadow-sm transition-colors placeholder:text-zinc-500 focus-visible:border-zinc-500 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
}

export { Input }
