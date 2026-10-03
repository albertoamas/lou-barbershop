import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// Teach tailwind-merge the custom radius scale from index.css so that a later
// `rounded-panel` overrides an earlier `rounded-control` instead of both applying.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      radius: ['control', 'panel', 'sheet'],
    },
  },
})

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))
